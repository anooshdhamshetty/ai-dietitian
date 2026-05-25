"""
NutriVision — FastAPI Backend
=============================
Entry point for the REST API.
Serves the frontend, handles image analysis, manages food logs,
and provides a complete food analysis pipeline.
"""
import os
import sys
from pathlib import Path

# Load .env from parent directory (where .env file is located)
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

import tempfile
import uuid
import uvicorn

from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel

import os
import tempfile
import uuid
import uvicorn

from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Form, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse

from pydantic import BaseModel

from ai_pipeline import (
    detect_food_items,
    estimate_weight,
    calculate_nutrition,
    AVERAGE_FRUIT_WEIGHTS
)

from groq_integration import (
    get_nutritional_insights,
    get_meal_suggestions,
    check_groq_connection
)

from database import init_db, save_food_log, get_food_logs, delete_food_log, get_today_summary, User
from auth import (
    router as auth_router,
    get_db,
    get_user_by_email,
    get_password_hash,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES,
    UserCreate,
    get_current_user,
)
from sqlalchemy.orm import Session
from datetime import timedelta


app = FastAPI(title="NutriVision API", version="1.0.0")

PROFILE_PICS_DIR = os.path.join(os.path.dirname(__file__), "static", "profile_pics")
os.makedirs(PROFILE_PICS_DIR, exist_ok=True)
app.mount("/static/profile_pics", StaticFiles(directory=PROFILE_PICS_DIR), name="profile_pics")
app.mount("/static", StaticFiles(directory="../frontend"), name="static")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)


@app.on_event("startup")
def on_startup():
    init_db()
    print("[API] ✅ Database initialized")
    print("[API] ✅ YOLO model loaded")
    print("[API] ✅ Food classifier ready")
    print("[API] ✅ NutriVision API ready — http://127.0.0.1:8000")


@app.get("/")
def read_root():
    return FileResponse("../frontend/index.html")


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return FileResponse("../frontend/favicon.png")


# ───────────────────────────────────────────────
# Pydantic Schemas
# ───────────────────────────────────────────────

class FoodItemOut(BaseModel):
    food_name: str
    weight: float
    calories: float
    protein: float
    carbs: float
    fat: float
    bbox: Optional[list] = None

class MealTotals(BaseModel):
    calories: float
    protein: float
    carbs: float
    fat: float

class AnalysisResponse(BaseModel):
    items: List[FoodItemOut]
    totals: MealTotals

class SaveMealRequest(BaseModel):
    items: List[FoodItemOut]
    totals: MealTotals

class LoginRequest(BaseModel):
    email: str
    password: str

class UserIn(BaseModel):
    email: str
    password: str

class GoalRequest(BaseModel):
    calorie_goal: int
    protein_goal: int

class ProfileUpdateRequest(BaseModel):
    name: str = ""
    weight: float = 0.0
    height: float = 0.0
    calorie_goal: int = 2500
    protein_goal: int = 100

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str
# ───────────────────────────────────────────────
# API Routes
# ───────────────────────────────────────────────
@app.post("/signup")
def signup(user: UserIn, db: Session = Depends(get_db)):
    existing = get_user_by_email(db, user.email)
    if existing:
        return {"success": False, "message": "User already exists"}

    new_user = User(
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )

    db.add(new_user)
    db.commit()

    return {"success": True, "message": "User created"}
@app.post("/login")
def login(user: UserIn, db: Session = Depends(get_db)):
    db_user = get_user_by_email(db, user.email)

    if not db_user or not verify_password(user.password, db_user.hashed_password):
        return {"success": False, "message": "Invalid credentials"}

    access_token = create_access_token(
        data={"sub": db_user.email},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return {"success": True, "access_token": access_token}

@app.post("/api/analyze", response_model=AnalysisResponse)
async def analyze(
    file: UploadFile = File(...),
    portion_weight: Optional[int] = Form(None),
):
    """
    Receive an uploaded food image, run the hybrid
    YOLO + Food101 pipeline, and return nutrition.
    """

    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as temp:
            temp.write(await file.read())
            image_path = temp.name

        detections = detect_food_items(image_path)

        try:
            os.unlink(image_path)
        except OSError:
            pass

        fruit_counts = {}
        for det in detections:
            fn = det.get("food_name", "").lower()
            if fn in AVERAGE_FRUIT_WEIGHTS:
                fruit_counts[fn] = fruit_counts.get(fn, 0) + 1

        items = []
        for det in detections:
            food_name = det["food_name"]
            bbox = det.get("bbox")
            fn = food_name.lower()

            if fn in AVERAGE_FRUIT_WEIGHTS:
                weight = float(AVERAGE_FRUIT_WEIGHTS[fn])
            else:
                if portion_weight is not None and int(portion_weight) > 0:
                    weight = float(portion_weight)
                else:
                    weight = float(estimate_weight(det.get("mask_area", 0), food_name))

            nutrition = calculate_nutrition(food_name, weight)

            items.append({
                "food_name": food_name,
                "weight":    round(float(weight), 1),
                "calories":  nutrition["calories"],
                "protein":   nutrition["protein"],
                "carbs":     nutrition["carbs"],
                "fat":       nutrition["fat"],
                "bbox":      bbox,
            })

        totals = {
            "calories": round(float(sum(i["calories"] for i in items)), 1),
            "protein":  round(float(sum(i["protein"]  for i in items)), 1),
            "carbs":    round(float(sum(i["carbs"]    for i in items)), 1),
            "fat":      round(float(sum(i["fat"]      for i in items)), 1),
        }

        return {"items": items, "totals": totals}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/log")
async def log_meal(meal: SaveMealRequest, current_user: User = Depends(get_current_user)):
    """Save detected food items to the database."""
    for item in meal.items:
        save_food_log(item.dict(), user_id=current_user.id)
    return {"status": "saved", "count": len(meal.items)}


@app.get("/api/history")
async def history(current_user: User = Depends(get_current_user)):
    """Return all saved food log entries (most recent first)."""
    return get_food_logs(user_id=current_user.id)

@app.delete("/api/delete/{item_id}")
async def delete_item(item_id: int, current_user: User = Depends(get_current_user)):
    """Delete a specific food log item belonging to the current user."""
    success = delete_food_log(item_id=item_id, user_id=current_user.id)
    if not success:
        raise HTTPException(status_code=404, detail="Item not found or unauthorized")
    return {"success": True}

@app.post("/api/set-goal")
async def set_goal(goal: GoalRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.calorie_goal = goal.calorie_goal
    db_user.protein_goal = goal.protein_goal
    db.commit()
    return {"success": True}

@app.get("/api/get-goal")
async def get_goal(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "calorie_goal": db_user.calorie_goal if db_user.calorie_goal is not None else 2500,
        "protein_goal": db_user.protein_goal if db_user.protein_goal is not None else 100
    }

@app.get("/api/today-summary")
async def today_summary(current_user: User = Depends(get_current_user)):
    """Return the total calories and protein logged by the current user today."""
    return get_today_summary(user_id=current_user.id)

@app.get("/api/feedback")
async def feedback(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return smart nutrition feedback based on today's totals and user's goals."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    calorie_goal = db_user.calorie_goal if db_user.calorie_goal is not None else 2500
    protein_goal = db_user.protein_goal if db_user.protein_goal is not None else 100
    
    today_data = get_today_summary(user_id=current_user.id)
    calories = today_data.get("calories", 0)
    protein = today_data.get("protein", 0)
    
    cal_percentage = (calories / calorie_goal) if calorie_goal > 0 else 0
    pro_percentage = (protein / protein_goal) if protein_goal > 0 else 0
    
    if cal_percentage < 0.70:
        cal_feedback = "Eat more, you're under your calorie goal 💀"
    elif cal_percentage <= 1.00:
        cal_feedback = "Good calorie intake 👍"
    else:
        cal_feedback = "High calorie intake ⚠️"
        
    if pro_percentage < 0.60:
        pro_feedback = "Low protein intake 🥩"
    elif pro_percentage <= 1.00:
        pro_feedback = "Decent protein intake 👍"
    else:
        pro_feedback = "Great protein intake 💪"
        
    return {
        "calorie_feedback": cal_feedback,
        "protein_feedback": pro_feedback
    }

@app.get("/api/profile")
async def get_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Return user profile details."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return {
        "email": db_user.email,
        "name": db_user.name if db_user.name is not None else "",
        "weight": db_user.weight if db_user.weight is not None else 0.0,
        "height": db_user.height if db_user.height is not None else 0.0,
        "calorie_goal": db_user.calorie_goal if db_user.calorie_goal is not None else 2500,
        "protein_goal": db_user.protein_goal if db_user.protein_goal is not None else 100,
        "profile_pic": db_user.profile_pic if db_user.profile_pic else None
    }

@app.post("/api/update-profile")
async def update_profile(profile: ProfileUpdateRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Update user profile fields (name, weight, height, goals)."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    db_user.name = profile.name
    db_user.weight = profile.weight
    db_user.height = profile.height
    db_user.calorie_goal = profile.calorie_goal
    db_user.protein_goal = profile.protein_goal
    db.commit()
    return {"success": True}


@app.post("/api/change-password")
async def change_password(req: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Change the current user's password after verifying old password."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not verify_password(req.old_password, db_user.hashed_password):
        raise HTTPException(status_code=400, detail="Incorrect old password")
    
    if len(req.new_password) < 4:
        raise HTTPException(status_code=400, detail="New password must be at least 4 characters")
    
    db_user.hashed_password = get_password_hash(req.new_password)
    db.commit()
    return {"success": True, "message": "Password changed successfully"}

@app.post("/api/upload-profile-pic")
async def upload_profile_pic(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload a profile picture for the current user."""
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"user_{current_user.id}_{uuid.uuid4().hex[:8]}{ext}"
    filepath = os.path.join(PROFILE_PICS_DIR, filename)

    contents = await file.read()
    with open(filepath, "wb") as f:
        f.write(contents)

    pic_url = f"/static/profile_pics/{filename}"

    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")

    # Delete old profile pic file if it exists
    if db_user.profile_pic:
        # Extract filename from URL
        old_filename = db_user.profile_pic.split("/")[-1]
        old_path = os.path.join(PROFILE_PICS_DIR, old_filename)
        if os.path.exists(old_path):
            try:
                os.unlink(old_path)
            except OSError:
                pass

    db_user.profile_pic = pic_url
    db.commit()

    return {"success": True, "profile_pic": pic_url}


# ───────────────────────────────────────────────
# Groq AI Integration Endpoints
# ───────────────────────────────────────────────

@app.get("/api/groq-insights")
async def get_groq_insights(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get AI-powered nutritional insights from Groq."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today_data = get_today_summary(user_id=current_user.id)
    calories = today_data.get("calories", 0)
    protein = today_data.get("protein", 0)
    calorie_goal = db_user.calorie_goal if db_user.calorie_goal is not None else 2500
    protein_goal = db_user.protein_goal if db_user.protein_goal is not None else 100
    
    food_items = get_food_logs(user_id=current_user.id)
    
    insights = get_nutritional_insights(
        daily_calories=calories,
        daily_protein=protein,
        calorie_goal=calorie_goal,
        protein_goal=protein_goal,
        food_items=food_items,
        user_name=db_user.name if db_user.name else "User"
    )
    
    return {
        "success": True,
        "insights": insights,
        "current_calories": calories,
        "current_protein": protein
    }


@app.get("/api/meal-suggestions")
async def get_meal_suggestions_endpoint(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get AI meal suggestions for remaining calories."""
    db_user = db.query(User).filter(User.id == current_user.id).first()
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    
    today_data = get_today_summary(user_id=current_user.id)
    calories = today_data.get("calories", 0)
    calorie_goal = db_user.calorie_goal if db_user.calorie_goal is not None else 2500
    
    suggestions = get_meal_suggestions(
        current_calories=calories,
        calorie_goal=calorie_goal,
        dietary_restrictions=None  # Can be extended based on user profile
    )
    
    return {
        "success": True,
        "suggestions": suggestions,
        "remaining_calories": max(0, calorie_goal - calories)
    }


@app.get("/api/groq-status")
async def check_groq_status():
    """Check if Groq API is properly configured."""
    is_connected = check_groq_connection()
    
    return {
        "groq_connected": is_connected,
        "status": "✓ Connected" if is_connected else "✗ Not connected (configure GROQ_API_KEY)"
    }


# ───────────────────────────────────────────────
# Run
# ───────────────────────────────────────────────
if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

"""
NutriVision — Database Layer
=============================
PostgreSQL via Supabase & SQLAlchemy.

Table: users
    id, email, hashed_password, calorie_goal, protein_goal, name, weight, height, profile_pic

Table: food_logs
    id, user_id, food_name, weight, calories, protein, carbs, fat, timestamp
"""

import os
from pathlib import Path
from typing import Optional
from datetime import datetime, timedelta, timezone

# Load .env from parent directory
from dotenv import load_dotenv
env_path = Path(__file__).parent.parent.parent / ".env"
load_dotenv(env_path)

from sqlalchemy import create_engine, Column, Integer, Float, String, DateTime, ForeignKey
from sqlalchemy.orm import declarative_base, sessionmaker
from sqlalchemy.pool import NullPool

# ── Config ──
# Use DATABASE_URL from .env (Supabase PostgreSQL)
# Falls back to SQLite only if DATABASE_URL not set
DATABASE_URL = os.environ.get("DATABASE_URL")

if not DATABASE_URL:
    print("⚠️  WARNING: DATABASE_URL not set in .env")
    print("    Using SQLite fallback (development only)")
    DB_PATH = os.path.join(os.path.dirname(__file__), "nutrivision.db")
    DATABASE_URL = f"sqlite:///{DB_PATH}"
    engine = create_engine(DATABASE_URL, echo=False)
else:
    # PostgreSQL (Supabase)
    print("✅ Using Supabase PostgreSQL database")
    # Use NullPool for better connection handling in serverless (Render)
    engine = create_engine(
        DATABASE_URL,
        echo=False,
        poolclass=NullPool,
        connect_args={"connect_timeout": 10}
    )

Session = sessionmaker(bind=engine)
Base    = declarative_base()

IST = timezone(timedelta(hours=5, minutes=30))


# ───────────────────────────────────────────────
# Models
# ───────────────────────────────────────────────

class User(Base):
    """User account."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, autoincrement=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    calorie_goal = Column(Integer, default=2500)
    protein_goal = Column(Integer, default=100)
    name = Column(String, default="")
    weight = Column(Float, default=0.0)
    height = Column(Float, default=0.0)
    profile_pic = Column(String, default="")


class FoodLog(Base):
    """Single food item entry in the log."""
    __tablename__ = "food_logs"

    id        = Column(Integer, primary_key=True, autoincrement=True)
    user_id   = Column(Integer, ForeignKey("users.id"), nullable=True)
    food_name = Column(String,  nullable=False)
    weight    = Column(Float,   default=0)
    calories  = Column(Float,   default=0)
    protein   = Column(Float,   default=0)
    carbs     = Column(Float,   default=0)
    fat       = Column(Float,   default=0)
    timestamp = Column(DateTime, default=lambda: datetime.now(timezone.utc))


# ───────────────────────────────────────────────
# Init
# ───────────────────────────────────────────────

def init_db():
    """Create tables if they do not already exist."""
    Base.metadata.create_all(engine)


# ───────────────────────────────────────────────
# CRUD
# ───────────────────────────────────────────────

def save_food_log(item: dict, user_id: int):
    """
    Save a single food item to the database.
    Expects keys: food_name, weight, calories, protein, carbs, fat
    """
    session = Session()
    try:
        entry = FoodLog(
            user_id   = user_id,
            food_name = item["food_name"],
            weight    = item.get("weight", 0),
            calories  = item.get("calories", 0),
            protein   = item.get("protein", 0),
            carbs     = item.get("carbs", 0),
            fat       = item.get("fat", 0),
        )
        session.add(entry)
        session.commit()
    finally:
        session.close()


def get_food_logs(user_id: int) -> list:
    """Return all food log entries, most recent first."""
    session = Session()
    try:
        query = session.query(FoodLog).filter(FoodLog.user_id == user_id)
        logs = query.order_by(FoodLog.timestamp.desc()).all()
        return [
            {
                "id":        log.id,
                "food_name": log.food_name,
                "weight":    log.weight,
                "calories":  log.calories,
                "protein":   log.protein,
                "carbs":     log.carbs,
                "fat":       log.fat,
                "timestamp": (log.timestamp.isoformat() + "Z" if not log.timestamp.tzinfo else log.timestamp.isoformat()) if log.timestamp else None,
            }
            for log in logs
        ]
    finally:
        session.close()

def delete_food_log(item_id: int, user_id: int) -> bool:
    """Delete a food log entry if it belongs to the specified user."""
    session = Session()
    try:
        log = session.query(FoodLog).filter(FoodLog.id == item_id, FoodLog.user_id == user_id).first()
        if log:
            session.delete(log)
            session.commit()
            return True
        return False
    finally:
        session.close()

def get_today_summary(user_id: int) -> dict:
    """Return the sum of calories and protein for today's logs."""
    session = Session()
    try:
        now_ist = datetime.now(IST)
        start_of_today_ist = now_ist.replace(hour=0, minute=0, second=0, microsecond=0)
        start_of_today = start_of_today_ist.astimezone(timezone.utc).replace(tzinfo=None)
        logs = session.query(FoodLog).filter(
            FoodLog.user_id == user_id,
            FoodLog.timestamp >= start_of_today
        ).all()
        
        cal = sum((log.calories or 0) for log in logs)
        pro = sum((log.protein or 0) for log in logs)
        car = sum((log.carbs or 0) for log in logs)
        fat = sum((log.fat or 0) for log in logs)
        return {
            "calories": round(cal, 1),
            "protein": round(pro, 1),
            "carbs": round(car, 1),
            "fat": round(fat, 1)
        }
    finally:
        session.close()

"""
NutriVision — Groq LLM Integration
====================================
Provides AI-powered nutritional insights and personalized recommendations
using Groq API (fast, open-source LLM).

Groq is a fast inference engine for LLMs. It provides:
✓ Ultra-fast responses (50ms-200ms)
✓ Cost-effective API
✓ Multiple model options
✓ Perfect for real-time applications
"""

import os
from typing import Optional
import json
from groq import Groq

# Initialize Groq client
GROQ_API_KEY = os.environ.get("GROQ_API_KEY")
if not GROQ_API_KEY:
    GROQ_API_KEY = "your-groq-api-key-here"  # Fallback

groq_client = Groq(api_key=GROQ_API_KEY)

# System prompt for nutritional advice
NUTRITIONIST_SYSTEM_PROMPT = """
You are an expert nutritionist AI assistant. Your role is to:
1. Analyze food consumption data and provide personalized feedback
2. Suggest meal improvements based on nutritional goals
3. Provide quick recipes or food swaps for better nutrition
4. Give motivational insights about user's eating habits

Keep responses concise (2-3 sentences), practical, and actionable.
Focus on positive reinforcement and sustainable changes.
"""


def get_nutritional_insights(
    daily_calories: float,
    daily_protein: float,
    calorie_goal: float,
    protein_goal: float,
    food_items: list,
    user_name: str = "User"
) -> str:
    """
    Get AI-powered nutritional insights using Groq LLM.
    
    Args:
        daily_calories: Total calories consumed today
        daily_protein: Total protein consumed (grams)
        calorie_goal: User's daily calorie target
        protein_goal: User's daily protein target (grams)
        food_items: List of food items eaten today
        user_name: User's name for personalization
    
    Returns:
        AI-generated insight string
    """
    
    if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key-here":
        return f"Smart insights will be available once you configure Groq API. Current intake: {daily_calories}kcal, {daily_protein}g protein."
    
    # Calculate percentages
    cal_percentage = (daily_calories / calorie_goal * 100) if calorie_goal > 0 else 0
    protein_percentage = (daily_protein / protein_goal * 100) if protein_goal > 0 else 0
    
    # Format food list
    foods_str = ", ".join([f"{item.get('food_name', 'Unknown')} ({item.get('calories', 0)}kcal)" for item in food_items])
    
    # Create user prompt
    user_prompt = f"""
    {user_name}'s nutrition today:
    - Foods eaten: {foods_str}
    - Calories: {daily_calories:.0f}kcal (Goal: {calorie_goal}kcal, {cal_percentage:.0f}%)
    - Protein: {daily_protein:.0f}g (Goal: {protein_goal}g, {protein_percentage:.0f}%)
    
    Please provide 1-2 actionable nutritional insights or suggestions.
    """
    
    try:
        # Call Groq API
        message = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",  # Fast and powerful model
            messages=[
                {
                    "role": "system",
                    "content": NUTRITIONIST_SYSTEM_PROMPT
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.7,
            max_tokens=150,
        )
        
        return message.choices[0].message.content
    
    except Exception as e:
        # Fallback if API fails
        print(f"[Groq] API Error: {e}")
        return f"Keep up the good work! You're at {cal_percentage:.0f}% of your calorie goal."


def get_meal_suggestions(
    current_calories: float,
    calorie_goal: float,
    dietary_restrictions: Optional[str] = None
) -> str:
    """
    Get AI-powered meal suggestions for remaining daily calories.
    
    Args:
        current_calories: Calories consumed so far
        calorie_goal: Daily calorie target
        dietary_restrictions: Any dietary restrictions (vegan, gluten-free, etc.)
    
    Returns:
        Meal suggestion string
    """
    
    if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key-here":
        remaining = calorie_goal - current_calories
        return f"You have ~{remaining:.0f}kcal remaining. Groq AI suggestions will appear after API configuration."
    
    remaining_calories = calorie_goal - current_calories
    restrictions_text = f"Dietary restrictions: {dietary_restrictions}." if dietary_restrictions else "No specific dietary restrictions."
    
    user_prompt = f"""
    Suggest a healthy meal or snack for ~{remaining_calories:.0f} calories.
    {restrictions_text}
    
    Give 1-2 specific food suggestions with rough calorie counts.
    Keep it brief and practical.
    """
    
    try:
        message = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a helpful nutritionist suggesting healthy meals. Keep responses concise."
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.7,
            max_tokens=120,
        )
        
        return message.choices[0].message.content
    
    except Exception as e:
        print(f"[Groq] API Error: {e}")
        return f"Consider a balanced snack with protein and fiber!"


def analyze_eating_pattern(
    weekly_data: dict
) -> str:
    """
    Analyze user's eating patterns over a week using Groq.
    
    Args:
        weekly_data: Dictionary with days as keys and daily nutrition as values
                    Example: {
                        "Monday": {"calories": 2100, "protein": 100, "foods": [...]},
                        "Tuesday": {"calories": 1900, "protein": 95, "foods": [...]},
                        ...
                    }
    
    Returns:
        AI analysis of eating patterns
    """
    
    if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key-here":
        return "Weekly pattern analysis will be available with Groq API configuration."
    
    # Summarize weekly data
    summary = json.dumps(weekly_data, indent=2)
    
    user_prompt = f"""
    Analyze this week's eating patterns and provide insights:
    
    {summary}
    
    Give 2-3 key observations and 1 recommendation for improvement.
    """
    
    try:
        message = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": "You are a nutrition expert analyzing eating patterns. Provide insightful, non-judgmental feedback."
                },
                {
                    "role": "user",
                    "content": user_prompt
                }
            ],
            temperature=0.7,
            max_tokens=200,
        )
        
        return message.choices[0].message.content
    
    except Exception as e:
        print(f"[Groq] API Error: {e}")
        return "Continue tracking your meals for personalized insights!"


# Health check function
def check_groq_connection() -> bool:
    """Check if Groq API is properly configured."""
    if not GROQ_API_KEY or GROQ_API_KEY == "your-groq-api-key-here":
        return False
    
    try:
        message = groq_client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[{"role": "user", "content": "ping"}],
            max_tokens=5,
        )
        return True
    except Exception:
        return False

"""
NutriVision — Supabase Configuration
====================================
Supabase integration for serverless PostgreSQL with built-in auth and storage.

Supabase provides:
✓ PostgreSQL database (managed)
✓ REST API (automatic)
✓ Real-time subscriptions
✓ File storage (for profile pictures, images)
✓ Vector search (future: food image search)
✓ Free tier with 500MB database

Setup:
1. Go to https://supabase.com
2. Create free account
3. Create new project
4. Get connection URL and anon key
5. Set SUPABASE_URL and SUPABASE_KEY in environment
"""

import os
from typing import Optional
from supabase import create_client, Client

# Supabase Configuration
SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY")

# Initialize Supabase client
supabase_client: Optional[Client] = None

def init_supabase() -> Client:
    """Initialize Supabase client."""
    global supabase_client
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        raise ValueError(
            "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY"
        )
    
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)
    return supabase_client


def get_supabase() -> Client:
    """Get initialized Supabase client."""
    if supabase_client is None:
        return init_supabase()
    return supabase_client


def check_supabase_connection() -> bool:
    """Check if Supabase connection is working."""
    try:
        client = get_supabase()
        # Try a simple query
        response = client.table("users").select("*").limit(1).execute()
        return True
    except Exception as e:
        print(f"[Supabase] Connection error: {e}")
        return False


# Supabase Storage helpers
class SupabaseStorage:
    """Helpers for Supabase file storage."""
    
    PROFILE_PICS_BUCKET = "profile-pics"
    FOOD_IMAGES_BUCKET = "food-images"
    
    @staticmethod
    def upload_profile_pic(user_id: int, file_path: str, file_name: str) -> Optional[str]:
        """Upload profile picture to Supabase storage."""
        try:
            client = get_supabase()
            
            with open(file_path, "rb") as f:
                response = client.storage.from_(
                    SupabaseStorage.PROFILE_PICS_BUCKET
                ).upload(
                    path=f"user_{user_id}/{file_name}",
                    file=f,
                    file_options={"content-type": "image/jpeg"}
                )
            
            # Get public URL
            url = client.storage.from_(
                SupabaseStorage.PROFILE_PICS_BUCKET
            ).get_public_url(f"user_{user_id}/{file_name}")
            
            return url
        
        except Exception as e:
            print(f"[Supabase] Upload error: {e}")
            return None
    
    @staticmethod
    def upload_food_image(user_id: int, file_path: str, file_name: str) -> Optional[str]:
        """Upload food image to Supabase storage."""
        try:
            client = get_supabase()
            
            with open(file_path, "rb") as f:
                response = client.storage.from_(
                    SupabaseStorage.FOOD_IMAGES_BUCKET
                ).upload(
                    path=f"user_{user_id}/{file_name}",
                    file=f,
                    file_options={"content-type": "image/jpeg"}
                )
            
            # Get public URL
            url = client.storage.from_(
                SupabaseStorage.FOOD_IMAGES_BUCKET
            ).get_public_url(f"user_{user_id}/{file_name}")
            
            return url
        
        except Exception as e:
            print(f"[Supabase] Upload error: {e}")
            return None
    
    @staticmethod
    def delete_file(bucket: str, file_path: str) -> bool:
        """Delete file from Supabase storage."""
        try:
            client = get_supabase()
            client.storage.from_(bucket).remove([file_path])
            return True
        except Exception as e:
            print(f"[Supabase] Delete error: {e}")
            return False


# Database schema setup (SQL to run in Supabase)
SUPABASE_SCHEMA_SQL = """
-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Users table
create table if not exists users (
  id bigserial primary key,
  email text unique not null,
  hashed_password text not null,
  name text default '',
  weight float default 0.0,
  height float default 0.0,
  calorie_goal integer default 2500,
  protein_goal integer default 100,
  profile_pic text default '',
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Food logs table
create table if not exists food_logs (
  id bigserial primary key,
  user_id bigint references users(id) on delete cascade,
  food_name text not null,
  weight float default 0,
  calories float default 0,
  protein float default 0,
  carbs float default 0,
  fat float default 0,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create indexes for performance
create index if not exists idx_food_logs_user_id on food_logs(user_id);
create index if not exists idx_food_logs_created_at on food_logs(created_at);

-- Enable RLS (Row Level Security)
alter table users enable row level security;
alter table food_logs enable row level security;

-- RLS Policies (optional - allow all for now, restrict later)
create policy "Users can read own data" on users
  for select using (true);

create policy "Users can update own data" on users
  for update using (true);

create policy "Users can read own food logs" on food_logs
  for select using (true);

create policy "Users can insert own food logs" on food_logs
  for insert with check (true);
"""

print("[Supabase] Configuration module loaded")

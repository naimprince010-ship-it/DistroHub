import os
import hashlib
from supabase import create_client

SUPABASE_URL = "https://llucnnzcslnulnyzourx.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxsdWNubnpjc2xudWxueXpvdXJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxNTgyOTYsImV4cCI6MjA4MjczNDI5Nn0.Mi5fqacAUp6SaqwSgY_mUJWOHiyAnu6OcNv9h_Pwz14"

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def check_and_create_admin():
    client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    email = "admin@distrohub.com"
    password = "admin123"
    
    # Check if user exists
    result = client.table("users").select("*").eq("email", email).execute()
    
    if result.data:
        print(f"User {email} already exists.")
        user = result.data[0]
        # Check if password matches
        current_hash = user.get("password_hash")
        expected_hash = hash_password(password)
        if current_hash == expected_hash:
            print("Password hash matches.")
        else:
            print("Password hash does not match. Updating...")
            client.table("users").update({"password_hash": expected_hash}).eq("email", email).execute()
            print("Password hash updated.")
    else:
        print(f"User {email} not found. Creating...")
        user_data = {
            "email": email,
            "name": "Admin User",
            "role": "admin",
            "phone": "01700000000",
            "password_hash": hash_password(password)
        }
        client.table("users").insert(user_data).execute()
        print("Admin user created successfully.")

if __name__ == "__main__":
    check_and_create_admin()

#!/usr/bin/env python3
"""
Fix User Password Hash Script
This script helps fix password hash for existing users in Supabase
"""

import hashlib
import requests
import json

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def fix_user_password():
    print("=" * 60)
    print("Fix User Password Hash")
    print("=" * 60)
    
    # Correct hash for "admin123"
    password = "admin123"
    correct_hash = hash_password(password)
    
    print(f"\nPassword: {password}")
    print(f"Correct Hash: {correct_hash}")
    print("\n" + "=" * 60)
    print("SOLUTION:")
    print("=" * 60)
    print("\nOption 1: Update via Supabase Dashboard")
    print("1. Go to Supabase Dashboard")
    print("2. Table Editor -> users table")
    print("3. Find admin@distrohub.com")
    print("4. Update password_hash field to:")
    print(f"   {correct_hash}")
    print("\nOption 2: Delete and Re-register")
    print("1. Delete user from Supabase")
    print("2. Use register endpoint to create new user")
    print("\nOption 3: Use Supabase SQL Editor")
    print("Run this SQL:")
    print(f"""
    UPDATE users 
    SET password_hash = '{correct_hash}'
    WHERE email = 'admin@distrohub.com';
    """)
    
    print("\n" + "=" * 60)
    print("Test Login After Fix:")
    print("=" * 60)
    print("""
    curl -X POST https://distrohub-backend.onrender.com/api/auth/login \\
      -H "Content-Type: application/json" \\
      -d '{"email":"admin@distrohub.com","password":"admin123"}'
    """)

if __name__ == "__main__":
    fix_user_password()


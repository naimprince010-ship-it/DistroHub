#!/usr/bin/env python3
"""
Login Diagnostic Script
This script helps diagnose login issues by checking:
1. Database connection
2. User existence
3. Password hashing
"""

import os
import sys
import hashlib
from app.database import get_database

def hash_password(password: str) -> str:
    """Hash password using SHA256"""
    return hashlib.sha256(password.encode()).hexdigest()

def test_login():
    print("=" * 60)
    print("Login Diagnostic Tool")
    print("=" * 60)
    
    # Check environment
    print("\n1. Checking Environment Variables...")
    use_supabase = os.environ.get("USE_SUPABASE", "").lower() == "true"
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    print(f"   USE_SUPABASE: {use_supabase}")
    if use_supabase:
        print(f"   SUPABASE_URL: {'Set' if supabase_url else 'NOT SET'}")
        print(f"   SUPABASE_KEY: {'Set' if supabase_key else 'NOT SET'}")
    else:
        print("   Using In-Memory Database")
    
    # Get database instance
    print("\n2. Connecting to Database...")
    try:
        db = get_database()
        print(f"   ✓ Database connected: {type(db).__name__}")
    except Exception as e:
        print(f"   ✗ Database connection failed: {e}")
        return
    
    # Test user lookup
    print("\n3. Checking for Admin User...")
    test_email = "admin@distrohub.com"
    user = db.get_user_by_email(test_email)
    
    if user:
        print(f"   ✓ User found: {user['email']}")
        print(f"   - Name: {user.get('name', 'N/A')}")
        print(f"   - Role: {user.get('role', 'N/A')}")
        print(f"   - Password Hash: {user.get('password_hash', 'N/A')[:20]}...")
    else:
        print(f"   ✗ User NOT found: {test_email}")
        print("\n   SOLUTION: Create user using register endpoint or manually in database")
        return
    
    # Test password verification
    print("\n4. Testing Password Verification...")
    test_password = "admin123"
    password_hash = user.get("password_hash")
    
    if password_hash:
        expected_hash = hash_password(test_password)
        print(f"   Input password: {test_password}")
        print(f"   Stored hash: {password_hash[:40]}...")
        print(f"   Expected hash: {expected_hash[:40]}...")
        
        is_valid = db.verify_password(test_password, password_hash)
        if is_valid:
            print("   ✓ Password verification: SUCCESS")
        else:
            print("   ✗ Password verification: FAILED")
            print("\n   SOLUTION: Password hash mismatch. Update password hash in database.")
            print(f"   Correct hash for '{test_password}': {expected_hash}")
    else:
        print("   ✗ No password hash found in user record")
    
    # Test with other common passwords
    print("\n5. Testing Common Passwords...")
    common_passwords = ["admin123", "admin", "password", "123456"]
    for pwd in common_passwords:
        if password_hash:
            if db.verify_password(pwd, password_hash):
                print(f"   ✓ Password '{pwd}' matches!")
                break
    
    print("\n" + "=" * 60)
    print("Diagnostic Complete")
    print("=" * 60)

if __name__ == "__main__":
    test_login()


"""Test Supabase connection directly"""
import os
import sys
sys.path.insert(0, 'distrohub-backend')

from app.supabase_db import SupabaseDatabase

print("Testing Supabase connection...")
try:
    db = SupabaseDatabase()
    print(f"Database type: {type(db).__name__}")
    print(f"Supabase client: {db.client is not None}")
    
    # Test insert
    test_data = {
        "name": f"Direct Test {int(__import__('time').time())}",
        "description": "Direct Supabase test",
        "color": "#FF5733"
    }
    print(f"\nInserting: {test_data}")
    result = db.create_category(test_data)
    print(f"\n✅ SUCCESS!")
    print(f"Category created: {json.dumps(result, indent=2, default=str)}")
except Exception as e:
    print(f"\n❌ ERROR: {type(e).__name__}: {str(e)}")
    import traceback
    traceback.print_exc()


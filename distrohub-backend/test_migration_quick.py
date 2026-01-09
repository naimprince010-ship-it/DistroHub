#!/usr/bin/env python3
"""
Quick Migration Test Script
Tests if delivery_status migration is applied correctly
"""

import os
import sys
from supabase import create_client, Client

def main():
    # Get Supabase credentials
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("❌ Error: SUPABASE_URL and SUPABASE_KEY environment variables required")
        print("\nSet them with:")
        print("  export SUPABASE_URL='your_url'")
        print("  export SUPABASE_KEY='your_key'")
        sys.exit(1)
    
    try:
        supabase: Client = create_client(supabase_url, supabase_key)
        
        print("🔍 Testing delivery_status migration...")
        print("=" * 60)
        
        # Test 1: Try to query delivery_status (will fail if column doesn't exist)
        try:
            result = supabase.table("sales").select("id, delivery_status").limit(1).execute()
            print("✅ Test 1: delivery_status column EXISTS")
        except Exception as e:
            if "does not exist" in str(e).lower():
                print("❌ Test 1: delivery_status column MISSING")
                print("   → Run migration: 20260108000000_add_delivery_status_to_sales.sql")
                return False
            else:
                raise
        
        # Test 2: Check delivered_at column
        try:
            result = supabase.table("sales").select("id, delivered_at").limit(1).execute()
            print("✅ Test 2: delivered_at column EXISTS")
        except Exception as e:
            if "does not exist" in str(e).lower():
                print("❌ Test 2: delivered_at column MISSING")
                print("   → Run migration: 20260108000000_add_delivery_status_to_sales.sql")
                return False
            else:
                raise
        
        # Test 3: Check for NULL values
        try:
            result = supabase.table("sales").select("delivery_status").execute()
            null_count = sum(1 for row in result.data if row.get("delivery_status") is None)
            
            if null_count == 0:
                print(f"✅ Test 3: No NULL delivery_status values ({len(result.data)} records checked)")
            else:
                print(f"⚠️  Test 3: Found {null_count} NULL delivery_status values")
                print("   → Run: UPDATE sales SET delivery_status = 'pending' WHERE delivery_status IS NULL;")
        except Exception as e:
            print(f"⚠️  Test 3: Could not check NULL values: {e}")
        
        # Test 4: Check status distribution
        try:
            result = supabase.table("sales").select("delivery_status").execute()
            statuses = {}
            for row in result.data:
                status = row.get("delivery_status") or "NULL"
                statuses[status] = statuses.get(status, 0) + 1
            
            print("\n📊 Delivery Status Distribution:")
            for status, count in sorted(statuses.items(), key=lambda x: x[1], reverse=True):
                print(f"   {status}: {count}")
        except Exception as e:
            print(f"⚠️  Could not get status distribution: {e}")
        
        print("\n" + "=" * 60)
        print("✅ Migration verification complete!")
        return True
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        print("\nTroubleshooting:")
        print("1. Check SUPABASE_URL and SUPABASE_KEY are correct")
        print("2. Check database connection")
        print("3. Check if sales table exists")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)

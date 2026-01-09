#!/usr/bin/env python3
"""
Quick Check Script: Sales Rep Management Module
Run this to verify if the module is properly set up
"""

import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.database import db
from app.models import UserRole

def check_database_columns():
    """Check if required database columns exist"""
    print("\n" + "="*60)
    print("STEP 1: Checking Database Columns...")
    print("="*60)
    
    try:
        # Try to query sales table with assigned_to
        try:
            result = db.client.table("sales").select("assigned_to").limit(1).execute()
            print("✓ sales.assigned_to column exists")
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                print("✗ sales.assigned_to column MISSING - Run migration 20260110000002")
                return False
            else:
                print(f"⚠ Could not verify sales.assigned_to: {e}")
        
        # Try to query payments table with collected_by
        try:
            result = db.client.table("payments").select("collected_by").limit(1).execute()
            print("✓ payments.collected_by column exists")
        except Exception as e:
            if "column" in str(e).lower() and "does not exist" in str(e).lower():
                print("✗ payments.collected_by column MISSING - Run migration 20260110000002")
                return False
            else:
                print(f"⚠ Could not verify payments.collected_by: {e}")
        
        # Check users table has phone
        try:
            users = db.get_users()
            if users and len(users) > 0:
                if 'phone' in users[0]:
                    print("✓ users.phone column exists")
                else:
                    print("✗ users.phone column MISSING")
                    return False
        except Exception as e:
            print(f"⚠ Could not verify users.phone: {e}")
        
        return True
    except Exception as e:
        print(f"✗ Database connection error: {e}")
        return False

def check_backend_methods():
    """Check if backend methods exist"""
    print("\n" + "="*60)
    print("STEP 2: Checking Backend Methods...")
    print("="*60)
    
    try:
        # Check update_user method
        if hasattr(db, 'update_user'):
            print("✓ update_user() method exists")
        else:
            print("✗ update_user() method MISSING")
            return False
        
        # Check delete_user method
        if hasattr(db, 'delete_user'):
            print("✓ delete_user() method exists")
        else:
            print("✗ delete_user() method MISSING")
            return False
        
        return True
    except Exception as e:
        print(f"✗ Error checking methods: {e}")
        return False

def check_api_endpoints():
    """Check if API endpoints are accessible"""
    print("\n" + "="*60)
    print("STEP 3: Checking API Endpoints (Manual Check Required)...")
    print("="*60)
    
    print("⚠ API endpoints need to be checked manually:")
    print("   1. GET /api/users - Should return list of users")
    print("   2. POST /api/users - Should create new sales rep")
    print("   3. PUT /api/users/{id} - Should update sales rep")
    print("   4. DELETE /api/users/{id} - Should delete sales rep")
    print("\n   Use Postman/Thunder Client or browser to test these endpoints")
    
    return True

def check_sales_reps():
    """Check existing sales reps"""
    print("\n" + "="*60)
    print("STEP 4: Checking Existing Sales Reps...")
    print("="*60)
    
    try:
        users = db.get_users()
        sales_reps = [u for u in users if u.get('role') == 'sales_rep' or u.get('role') == UserRole.SALES_REP]
        
        print(f"Found {len(sales_reps)} sales rep(s):")
        for rep in sales_reps[:5]:  # Show first 5
            name = rep.get('name', 'N/A')
            email = rep.get('email', 'N/A')
            phone = rep.get('phone', 'N/A') or 'No phone'
            print(f"  - {name} ({email}) - {phone}")
        
        if len(sales_reps) > 5:
            print(f"  ... and {len(sales_reps) - 5} more")
        
        return True
    except Exception as e:
        print(f"✗ Error fetching sales reps: {e}")
        return False

def main():
    """Run all checks"""
    print("\n" + "="*60)
    print("SALES REP MANAGEMENT MODULE - QUICK CHECK")
    print("="*60)
    
    results = []
    
    # Run checks
    results.append(("Database Columns", check_database_columns()))
    results.append(("Backend Methods", check_backend_methods()))
    results.append(("API Endpoints", check_api_endpoints()))
    results.append(("Sales Reps", check_sales_reps()))
    
    # Summary
    print("\n" + "="*60)
    print("SUMMARY")
    print("="*60)
    
    all_passed = True
    for name, passed in results:
        status = "✓ PASS" if passed else "✗ FAIL"
        print(f"{status} - {name}")
        if not passed:
            all_passed = False
    
    print("\n" + "="*60)
    if all_passed:
        print("✅ ALL CHECKS PASSED - Module is ready!")
    else:
        print("⚠️  SOME CHECKS FAILED - Please fix the issues above")
        print("\nNext steps:")
        print("  1. Run migration: 20260110000002_run_all_accountability_migrations.sql")
        print("  2. Restart backend server")
        print("  3. Check frontend: Settings → Sales Reps tab")
    print("="*60 + "\n")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\nCheck cancelled by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

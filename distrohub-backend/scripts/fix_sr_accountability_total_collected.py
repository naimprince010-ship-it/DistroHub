#!/usr/bin/env python3
"""
One-Time Fix Script: Fix SR Accountability Total Collected = 0 Issue

This script:
1. Backfills payment.route_id from sales.route_id
2. Verifies payments are linked to routes
3. Tests SR Accountability API to confirm fix

Usage:
    python fix_sr_accountability_total_collected.py [--sr-id SR_ID] [--dry-run]
"""

import sys
import os
import argparse
from pathlib import Path

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.supabase_db import SupabaseDatabase

def main():
    parser = argparse.ArgumentParser(description='Fix SR Accountability Total Collected = 0')
    parser.add_argument('--sr-id', help='Specific SR ID to test (optional)')
    parser.add_argument('--dry-run', action='store_true', help='Dry run mode (no changes)')
    args = parser.parse_args()
    
    db = SupabaseDatabase()
    
    print("=" * 60)
    print("SR Accountability Total Collected Fix Script")
    print("=" * 60)
    print()
    
    # Step 1: Check payment route_id status
    print("Step 1: Checking payment route_id status...")
    try:
        # This would require a direct SQL query, but we can use the backfill function
        backfill_result = db.backfill_payment_route_id(dry_run=True)
        print(f"  - Payments needing backfill: {backfill_result.get('payments_still_missing', 0)}")
        print(f"  - Payments that would be updated: {backfill_result.get('payments_updated', 0)}")
    except Exception as e:
        print(f"  ⚠️  Error checking status: {e}")
        backfill_result = {}
    
    # Step 2: Run backfill if needed
    if not args.dry_run and backfill_result.get('payments_still_missing', 0) > 0:
        print()
        print("Step 2: Running payment route_id backfill...")
        try:
            backfill_result = db.backfill_payment_route_id(dry_run=False)
            print(f"  ✅ Payments updated: {backfill_result.get('payments_updated', 0)}")
            print(f"  ⚠️  Payments still missing: {backfill_result.get('payments_still_missing', 0)}")
        except Exception as e:
            print(f"  ❌ Error running backfill: {e}")
            return 1
    elif args.dry_run:
        print()
        print("Step 2: Skipped (dry-run mode)")
    else:
        print()
        print("Step 2: No backfill needed (all payments have route_id)")
    
    # Step 3: Test SR Accountability
    print()
    print("Step 3: Testing SR Accountability API...")
    
    if args.sr_id:
        sr_ids = [args.sr_id]
    else:
        # Get all SR users
        users = db.get_users()
        sr_ids = [u["id"] for u in users if u.get("role") == "sales_rep"]
    
    if not sr_ids:
        print("  ❌ No SR users found")
        return 1
    
    for sr_id in sr_ids:
        print(f"\n  Testing SR: {sr_id}")
        try:
            accountability = db.get_sr_accountability(sr_id)
            if accountability:
                print(f"    ✅ API Response received")
                print(f"    - total_collected: {accountability.get('total_collected', 'MISSING')}")
                print(f"    - total_returns: {accountability.get('total_returns', 'MISSING')}")
                print(f"    - current_outstanding: {accountability.get('current_outstanding', 'MISSING')}")
                print(f"    - total_expected_cash: {accountability.get('total_expected_cash', 'MISSING')}")
                
                if accountability.get('total_collected') is None:
                    print(f"    ❌ total_collected field MISSING - Backend not deployed!")
                elif accountability.get('total_collected') == 0:
                    print(f"    ⚠️  total_collected is 0 - Check payment route_id values")
                else:
                    print(f"    ✅ total_collected has value: {accountability.get('total_collected')}")
            else:
                print(f"    ❌ No accountability data returned")
        except Exception as e:
            print(f"    ❌ Error: {e}")
            import traceback
            traceback.print_exc()
    
    print()
    print("=" * 60)
    print("Fix script completed")
    print("=" * 60)
    
    return 0

if __name__ == "__main__":
    sys.exit(main())

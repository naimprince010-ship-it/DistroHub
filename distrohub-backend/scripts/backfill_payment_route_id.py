#!/usr/bin/env python3
"""
ONE-TIME CLI Script: Backfill payments.route_id from sales.route_id

This script fixes historical payments created before 2026-01-13 that have route_id = NULL.
New payments already have route_id set correctly via create_payment().

Usage:
    python backfill_payment_route_id.py [--execute]
    
    --execute: Actually perform the update (default: dry-run preview only)

Example:
    # Preview what will be updated
    python backfill_payment_route_id.py
    
    # Actually perform the backfill
    python backfill_payment_route_id.py --execute
"""

import sys
import os
from pathlib import Path

# Add parent directory to path to import app modules
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.supabase_db import SupabaseDatabase
from app.database import get_supabase_client

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Backfill payments.route_id from sales.route_id")
    parser.add_argument(
        "--execute",
        action="store_true",
        help="Actually perform the update (default: dry-run preview only)"
    )
    args = parser.parse_args()
    
    dry_run = not args.execute
    
    print("=" * 60)
    print("Payment Route ID Backfill Script")
    print("=" * 60)
    print(f"Mode: {'DRY-RUN (preview only)' if dry_run else 'EXECUTE (will update database)'}")
    print()
    
    # Initialize database
    client = get_supabase_client()
    if not client:
        print("❌ Error: Failed to initialize Supabase client")
        print("Make sure SUPABASE_URL and SUPABASE_KEY environment variables are set")
        sys.exit(1)
    
    db = SupabaseDatabase()
    db.client = client
    
    # Run backfill
    print("Running backfill...")
    result = db.backfill_payment_route_id(dry_run=dry_run)
    
    # Print results
    print()
    print("=" * 60)
    print("Backfill Results")
    print("=" * 60)
    print(f"Status: {result.get('status', 'unknown')}")
    print(f"Dry Run: {result.get('dry_run', False)}")
    print(f"Payments Found: {result.get('payments_found', 0)}")
    print(f"Payments Needing Backfill: {result.get('payments_needing_backfill', 0)}")
    print(f"Payments Updated: {result.get('payments_updated', 0)}")
    print(f"Mismatches Found: {result.get('mismatches_found', 0)}")
    print(f"Message: {result.get('message', 'N/A')}")
    
    if result.get("mismatches"):
        print()
        print("⚠️  Mismatches Found:")
        for mismatch in result["mismatches"][:5]:  # Show first 5
            print(f"  - Payment {mismatch['payment_id']}: payment.route_id={mismatch['payment_route_id']}, sale.route_id={mismatch['sale_route_id']}")
        if len(result["mismatches"]) > 5:
            print(f"  ... and {len(result['mismatches']) - 5} more")
    
    if result.get("error"):
        print()
        print(f"❌ Error: {result.get('error')}")
        sys.exit(1)
    
    if dry_run:
        print()
        print("ℹ️  This was a dry-run. To actually perform the update, run:")
        print("   python backfill_payment_route_id.py --execute")
    else:
        print()
        print("✅ Backfill completed successfully!")
    
    print("=" * 60)

if __name__ == "__main__":
    main()

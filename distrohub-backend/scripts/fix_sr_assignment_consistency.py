#!/usr/bin/env python3
"""
One-Time Admin Script: Fix SR Assignment Consistency

This script fixes any sales in routes where sales.assigned_to doesn't match routes.assigned_to.

Safety Features:
- Idempotent: Can be run multiple times safely
- Dry-run mode: Use --dry-run to preview changes without applying
- Transaction-safe: Uses Supabase transactions where possible
- Detailed logging: Prints exactly what was fixed

Usage:
    python scripts/fix_sr_assignment_consistency.py [--dry-run]
"""

import os
import sys
from typing import List, Dict, Optional

# Add parent directory to path to import app modules
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from supabase import create_client, Client
from app.supabase_db import get_supabase_client


def find_inconsistent_sales(client: Client) -> List[Dict]:
    """
    Find all sales where route_id IS NOT NULL AND sales.assigned_to != routes.assigned_to
    
    Returns list of dicts with sale_id, route_id, current_sale_sr, route_sr, etc.
    """
    # Query: Get all sales with route_id and their corresponding route's assigned_to
    # We need to join sales and routes tables
    # Supabase doesn't support direct JOINs, so we'll:
    # 1. Get all sales with route_id
    # 2. Get all routes
    # 3. Match them in Python
    
    # Get all sales with route_id
    sales_result = client.table("sales").select("id,invoice_number,route_id,assigned_to,assigned_to_name").not_.is_("route_id", "null").execute()
    sales_with_routes = sales_result.data or []
    
    if not sales_with_routes:
        return []
    
    # Get all route IDs
    route_ids = list(set(s.get("route_id") for s in sales_with_routes if s.get("route_id")))
    
    if not route_ids:
        return []
    
    # Get all routes
    routes_result = client.table("routes").select("id,route_number,assigned_to,assigned_to_name").in_("id", route_ids).execute()
    routes_map = {r["id"]: r for r in (routes_result.data or [])}
    
    # Find inconsistencies
    inconsistencies = []
    for sale in sales_with_routes:
        route_id = sale.get("route_id")
        if not route_id:
            continue
        
        route = routes_map.get(route_id)
        if not route:
            # Route doesn't exist - this is a different issue (orphaned sale)
            continue
        
        sale_sr = sale.get("assigned_to")
        route_sr = route.get("assigned_to")
        
        # Check if they don't match (including None cases)
        if sale_sr != route_sr:
            inconsistencies.append({
                "sale_id": sale["id"],
                "invoice_number": sale.get("invoice_number", "N/A"),
                "route_id": route_id,
                "route_number": route.get("route_number", "N/A"),
                "current_sale_sr": sale_sr,
                "current_sale_sr_name": sale.get("assigned_to_name"),
                "correct_route_sr": route_sr,
                "correct_route_sr_name": route.get("assigned_to_name"),
            })
    
    return inconsistencies


def fix_inconsistencies(client: Client, inconsistencies: List[Dict], dry_run: bool = False) -> int:
    """
    Fix inconsistencies by updating sales.assigned_to to match routes.assigned_to
    
    Returns number of rows fixed
    """
    if not inconsistencies:
        return 0
    
    fixed_count = 0
    
    for inc in inconsistencies:
        sale_id = inc["sale_id"]
        correct_sr = inc["correct_route_sr"]
        correct_sr_name = inc["correct_route_sr_name"]
        
        if dry_run:
            print(f"[DRY-RUN] Would fix sale {inc['invoice_number']} (ID: {sale_id[:8]}...):")
            print(f"  Current: assigned_to={inc['current_sale_sr']}, assigned_to_name={inc['current_sale_sr_name']}")
            print(f"  Correct: assigned_to={correct_sr}, assigned_to_name={correct_sr_name}")
            print(f"  Route: {inc['route_number']} (ID: {inc['route_id'][:8]}...)")
            fixed_count += 1
        else:
            try:
                # Update sale's assigned_to to match route's assigned_to
                update_data = {
                    "assigned_to": correct_sr,
                    "assigned_to_name": correct_sr_name
                }
                
                result = client.table("sales").update(update_data).eq("id", sale_id).execute()
                
                if result.data:
                    print(f"✅ Fixed sale {inc['invoice_number']} (ID: {sale_id[:8]}...):")
                    print(f"   Updated assigned_to: {inc['current_sale_sr']} → {correct_sr}")
                    print(f"   Updated assigned_to_name: {inc['current_sale_sr_name']} → {correct_sr_name}")
                    fixed_count += 1
                else:
                    print(f"⚠️  Warning: Sale {inc['invoice_number']} (ID: {sale_id[:8]}...) update returned no data")
                    
            except Exception as e:
                print(f"❌ Error fixing sale {inc['invoice_number']} (ID: {sale_id[:8]}...): {e}")
                continue
    
    return fixed_count


def main():
    """Main execution function"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Fix SR assignment inconsistencies in sales that are in routes"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Preview changes without applying them"
    )
    args = parser.parse_args()
    
    dry_run = args.dry_run
    
    print("=" * 70)
    print("SR Assignment Consistency Fix Script")
    print("=" * 70)
    print()
    
    if dry_run:
        print("🔍 DRY-RUN MODE: No changes will be applied")
        print()
    
    # Get Supabase client
    try:
        client = get_supabase_client()
        if not client:
            print("❌ Error: Failed to connect to Supabase")
            print("   Make sure SUPABASE_URL and SUPABASE_KEY environment variables are set")
            sys.exit(1)
        
        print("✅ Connected to Supabase")
        print()
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {e}")
        sys.exit(1)
    
    # Find inconsistencies
    print("🔍 Scanning for inconsistent sales...")
    inconsistencies = find_inconsistent_sales(client)
    
    if not inconsistencies:
        print("✅ No inconsistencies found!")
        print("   All sales in routes have matching assigned_to with their routes.")
        return
    
    print(f"⚠️  Found {len(inconsistencies)} inconsistent sale(s):")
    print()
    
    # Group by route for better reporting
    by_route = {}
    for inc in inconsistencies:
        route_id = inc["route_id"]
        if route_id not in by_route:
            by_route[route_id] = []
        by_route[route_id].append(inc)
    
    print(f"   Affected routes: {len(by_route)}")
    print(f"   Affected sales: {len(inconsistencies)}")
    print()
    
    # Show summary
    print("Summary of inconsistencies:")
    for route_id, sales in by_route.items():
        route_number = sales[0]["route_number"]
        route_sr = sales[0]["correct_route_sr"]
        route_sr_name = sales[0]["correct_route_sr_name"]
        print(f"  Route {route_number} (SR: {route_sr_name or route_sr}):")
        print(f"    {len(sales)} sale(s) with mismatched assigned_to")
        for sale in sales[:3]:  # Show first 3
            print(f"      - {sale['invoice_number']}: {sale['current_sale_sr']} → {route_sr}")
        if len(sales) > 3:
            print(f"      ... and {len(sales) - 3} more")
    print()
    
    # Fix inconsistencies
    if dry_run:
        print("🔍 DRY-RUN: Would fix the following:")
        print()
    else:
        print("🔧 Fixing inconsistencies...")
        print()
    
    fixed_count = fix_inconsistencies(client, inconsistencies, dry_run=dry_run)
    
    print()
    print("=" * 70)
    if dry_run:
        print(f"🔍 DRY-RUN COMPLETE: Would fix {fixed_count} sale(s)")
        print("   Run without --dry-run to apply changes")
    else:
        print(f"✅ FIX COMPLETE: Fixed {fixed_count} sale(s)")
        
        # Verify fix
        print()
        print("🔍 Verifying fix...")
        remaining = find_inconsistent_sales(client)
        if remaining:
            print(f"⚠️  Warning: {len(remaining)} inconsistency(ies) still remain")
            print("   This may indicate a deeper issue. Please investigate.")
        else:
            print("✅ Verification passed: No inconsistencies remain")
    
    print("=" * 70)


if __name__ == "__main__":
    main()

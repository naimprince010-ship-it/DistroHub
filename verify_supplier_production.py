"""
Production Verification Script for Supplier Persistence Fix
Run this against production backend to verify the fix is working.

Usage:
    python verify_supplier_production.py --api-url https://your-render-backend.onrender.com
"""
import requests
import json
import sys
import argparse
from datetime import datetime
import time

def test_supplier_persistence(api_url: str, email: str = None, password: str = None, token: str = None):
    print("=" * 80)
    print("SUPPLIER PERSISTENCE - PRODUCTION VERIFICATION")
    print("=" * 80)
    print(f"API URL: {api_url}")
    print(f"Timestamp: {datetime.now().isoformat()}")
    print("=" * 80)
    
    results = {
        "timestamp": datetime.now().isoformat(),
        "api_url": api_url,
        "steps": {}
    }
    
    # Step 1: Check if backend is running
    print("\n[1] Checking if backend server is running...")
    try:
        health_url = f"{api_url}/healthz" if not api_url.endswith("/") else f"{api_url}healthz"
        response = requests.get(health_url, timeout=5)
        if response.status_code == 200:
            print("✓ Backend server is running")
            results["steps"]["backend_health"] = {"status": "PASS", "status_code": 200}
        else:
            print(f"✗ Backend returned status {response.status_code}")
            results["steps"]["backend_health"] = {"status": "FAIL", "status_code": response.status_code}
            return False, results
    except requests.exceptions.ConnectionError:
        print("✗ Backend server is NOT reachable!")
        results["steps"]["backend_health"] = {"status": "FAIL", "error": "Connection refused"}
        return False, results
    except Exception as e:
        print(f"✗ Error connecting to backend: {e}")
        results["steps"]["backend_health"] = {"status": "FAIL", "error": str(e)}
        return False, results
    
    # Step 2: Authenticate (login or use provided token)
    print("\n[2] Authenticating...")
    if token:
        # Use provided token
        print("  Using provided token")
        if not token or len(token) < 10:
            print("✗ Invalid token provided")
            results["steps"]["authentication"] = {"status": "FAIL", "error": "Invalid token"}
            return False, results
        print("✓ Token provided")
        print(f"  Token: {token[:20]}...")
        results["steps"]["authentication"] = {"status": "PASS", "method": "token", "token_length": len(token)}
    else:
        # Login with email/password
        if not email or not password:
            print("✗ Either --token or --email/--password must be provided")
            results["steps"]["authentication"] = {"status": "FAIL", "error": "Missing credentials"}
            return False, results
        login_url = f"{api_url}/api/auth/login" if not api_url.endswith("/") else f"{api_url}api/auth/login"
        try:
            login_data = {"email": email, "password": password}
            response = requests.post(login_url, json=login_data, timeout=10)
            if response.status_code != 200:
                print(f"✗ Login failed: {response.status_code}")
                print(f"  Response: {response.text}")
                results["steps"]["authentication"] = {"status": "FAIL", "status_code": response.status_code, "response": response.text}
                return False, results
            
            token = response.json().get("access_token")
            if not token:
                print("✗ No token in response")
                results["steps"]["authentication"] = {"status": "FAIL", "error": "No access_token in response"}
                return False, results
            print("✓ Authentication successful")
            print(f"  Token: {token[:20]}...")
            results["steps"]["authentication"] = {"status": "PASS", "method": "login", "token_length": len(token)}
        except Exception as e:
            print(f"✗ Login error: {e}")
            results["steps"]["authentication"] = {"status": "FAIL", "error": str(e)}
            return False, results
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 3: Get existing suppliers (baseline)
    print("\n[3] Fetching existing suppliers (baseline)...")
    suppliers_url = f"{api_url}/api/suppliers" if not api_url.endswith("/") else f"{api_url}api/suppliers"
    try:
        response = requests.get(suppliers_url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"✗ Failed to fetch suppliers: {response.status_code}")
            print(f"  Response: {response.text}")
            results["steps"]["get_baseline"] = {"status": "FAIL", "status_code": response.status_code, "response": response.text}
            return False, results
        
        suppliers_before = response.json()
        print(f"✓ Found {len(suppliers_before)} existing suppliers")
        results["steps"]["get_baseline"] = {
            "status": "PASS",
            "status_code": 200,
            "count": len(suppliers_before),
            "sample_ids": [s.get("id") for s in suppliers_before[:3]]
        }
    except Exception as e:
        print(f"✗ Error fetching suppliers: {e}")
        results["steps"]["get_baseline"] = {"status": "FAIL", "error": str(e)}
        return False, results
    
    # Step 4: Create a test supplier
    print("\n[4] Creating a test supplier...")
    timestamp = datetime.now().strftime("%Y-%m-%d-%H%M%S")
    test_supplier = {
        "name": f"QA Supplier {timestamp}",
        "phone": f"017{timestamp[-9:]}",
        "contact_person": f"Test Contact {timestamp}",
        "address": f"Test Address {timestamp}",
        "email": None
    }
    try:
        response = requests.post(
            suppliers_url,
            headers=headers,
            json=test_supplier,
            timeout=10
        )
        
        print(f"  Request URL: {suppliers_url}")
        print(f"  Status Code: {response.status_code}")
        print(f"  Request Headers: Authorization: Bearer {token[:20]}...")
        
        if response.status_code not in [200, 201]:
            print(f"✗ Failed to create supplier: {response.status_code}")
            print(f"  Response: {response.text}")
            results["steps"]["create_supplier"] = {
                "status": "FAIL",
                "status_code": response.status_code,
                "request_url": suppliers_url,
                "request_body": test_supplier,
                "response": response.text
            }
            return False, results
        
        created = response.json()
        supplier_id = created.get("id")
        supplier_name = created.get("name")
        created_at = created.get("created_at")
        
        if not supplier_id:
            print("✗ No ID in response!")
            print(f"  Response: {json.dumps(created, indent=2)}")
            results["steps"]["create_supplier"] = {
                "status": "FAIL",
                "error": "No id in response",
                "response": created
            }
            return False, results
        
        if not created_at:
            print("⚠ No created_at in response (warning)")
        
        print(f"✓ Supplier created successfully!")
        print(f"  ID: {supplier_id}")
        print(f"  Name: {supplier_name}")
        print(f"  Created At: {created_at}")
        print(f"  Full Response: {json.dumps(created, indent=2)}")
        
        results["steps"]["create_supplier"] = {
            "status": "PASS",
            "status_code": response.status_code,
            "request_url": suppliers_url,
            "request_body": test_supplier,
            "response": created,
            "supplier_id": supplier_id,
            "supplier_name": supplier_name,
            "created_at": created_at
        }
    except Exception as e:
        print(f"✗ Error creating supplier: {e}")
        import traceback
        traceback.print_exc()
        results["steps"]["create_supplier"] = {"status": "FAIL", "error": str(e)}
        return False, results
    
    # Step 5: Wait a moment for DB propagation
    print("\n[5] Waiting 2 seconds for database propagation...")
    time.sleep(2)
    
    # Step 6: Verify persistence - fetch again
    print("\n[6] Verifying persistence (fetching all suppliers again)...")
    try:
        response = requests.get(suppliers_url, headers=headers, timeout=10)
        if response.status_code != 200:
            print(f"✗ Failed to fetch suppliers: {response.status_code}")
            results["steps"]["verify_persistence"] = {"status": "FAIL", "status_code": response.status_code}
            return False, results
        
        suppliers_after = response.json()
        print(f"✓ Retrieved {len(suppliers_after)} suppliers")
        
        found = next((s for s in suppliers_after if s.get("id") == supplier_id), None)
        if found:
            print(f"✓ Supplier persists in database!")
            print(f"  Found: {found.get('name')}")
            print(f"  ID matches: {found.get('id') == supplier_id}")
            print(f"  Total suppliers: {len(suppliers_after)} (was {len(suppliers_before)})")
            results["steps"]["verify_persistence"] = {
                "status": "PASS",
                "status_code": 200,
                "count_before": len(suppliers_before),
                "count_after": len(suppliers_after),
                "supplier_found": True,
                "supplier_id": supplier_id,
                "supplier_data": found
            }
        else:
            print(f"✗ Supplier NOT found in database!")
            print(f"  Looking for ID: {supplier_id}")
            print(f"  Total suppliers: {len(suppliers_after)} (was {len(suppliers_before)})")
            print(f"  Available IDs: {[s.get('id') for s in suppliers_after[:5]]}")
            results["steps"]["verify_persistence"] = {
                "status": "FAIL",
                "status_code": 200,
                "count_before": len(suppliers_before),
                "count_after": len(suppliers_after),
                "supplier_found": False,
                "supplier_id": supplier_id,
                "available_ids": [s.get("id") for s in suppliers_after[:10]]
            }
            return False, results
    except Exception as e:
        print(f"✗ Error verifying persistence: {e}")
        results["steps"]["verify_persistence"] = {"status": "FAIL", "error": str(e)}
        return False, results
    
    # Step 7: Clean up - delete test supplier
    print("\n[7] Cleaning up test supplier...")
    delete_url = f"{suppliers_url}/{supplier_id}"
    try:
        response = requests.delete(delete_url, headers=headers, timeout=10)
        if response.status_code in [200, 204]:
            print("✓ Test supplier deleted")
            results["steps"]["cleanup"] = {"status": "PASS", "status_code": response.status_code}
        else:
            print(f"⚠ Could not delete test supplier: {response.status_code}")
            results["steps"]["cleanup"] = {"status": "WARNING", "status_code": response.status_code}
    except Exception as e:
        print(f"⚠ Error deleting test supplier: {e}")
        results["steps"]["cleanup"] = {"status": "WARNING", "error": str(e)}
    
    print("\n" + "=" * 80)
    print("✓ ALL TESTS PASSED - Supplier persistence is working!")
    print("=" * 80)
    results["overall_status"] = "PASS"
    return True, results

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Verify supplier persistence in production")
    parser.add_argument("--api-url", required=True, help="Production API URL (e.g., https://your-app.onrender.com)")
    parser.add_argument("--token", help="Auth token from localStorage (alternative to email/password)")
    parser.add_argument("--email", help="Login email (required if --token not provided)")
    parser.add_argument("--password", help="Login password (required if --token not provided)")
    parser.add_argument("--output", help="Output JSON file for results")
    
    args = parser.parse_args()
    
    if not args.token and (not args.email or not args.password):
        parser.error("Either --token or both --email and --password must be provided")
    
    success, results = test_supplier_persistence(
        args.api_url, 
        email=args.email, 
        password=args.password, 
        token=args.token
    )
    
    if args.output:
        with open(args.output, "w") as f:
            json.dump(results, f, indent=2)
        print(f"\nResults saved to: {args.output}")
    
    sys.exit(0 if success else 1)


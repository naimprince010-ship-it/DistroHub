"""
Quick verification script to test category API endpoints
"""
import requests
import json
import sys

API_URL = "http://localhost:8000"
LOGIN_URL = f"{API_URL}/api/auth/login"

def test_backend():
    print("=" * 60)
    print("VERIFYING CATEGORY PERSISTENCE FIX")
    print("=" * 60)
    
    # Step 1: Check if backend is running
    print("\n[1] Checking if backend server is running...")
    try:
        response = requests.get(f"{API_URL}/healthz", timeout=2)
        if response.status_code == 200:
            print("✓ Backend server is running")
        else:
            print(f"✗ Backend returned status {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("✗ Backend server is NOT running!")
        print("  Please start the backend server:")
        print("  cd distrohub-backend")
        print("  uvicorn app.main:app --reload --port 8000")
        return False
    except Exception as e:
        print(f"✗ Error connecting to backend: {e}")
        return False
    
    # Step 2: Login
    print("\n[2] Authenticating...")
    try:
        login_data = {
            "email": "admin@distrohub.com",
            "password": "admin123"
        }
        response = requests.post(LOGIN_URL, json=login_data, timeout=5)
        if response.status_code != 200:
            print(f"✗ Login failed: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
        
        token = response.json().get("access_token")
        if not token:
            print("✗ No token in response")
            return False
        print("✓ Authentication successful")
    except Exception as e:
        print(f"✗ Login error: {e}")
        return False
    
    # Step 3: Get existing categories
    print("\n[3] Fetching existing categories...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        response = requests.get(f"{API_URL}/api/categories", headers=headers, timeout=5)
        if response.status_code != 200:
            print(f"✗ Failed to fetch categories: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
        
        categories = response.json()
        print(f"✓ Found {len(categories)} existing categories")
        if categories:
            print("  Sample category:", categories[0].get("name"))
    except Exception as e:
        print(f"✗ Error fetching categories: {e}")
        return False
    
    # Step 4: Create a test category
    print("\n[4] Creating a test category...")
    test_category = {
        "name": f"Test Category Verification",
        "description": "This is a test category to verify persistence",
        "color": "#10B981"
    }
    try:
        response = requests.post(
            f"{API_URL}/api/categories",
            headers={**headers, "Content-Type": "application/json"},
            json=test_category,
            timeout=5
        )
        if response.status_code != 200:
            print(f"✗ Failed to create category: {response.status_code}")
            print(f"  Response: {response.text}")
            return False
        
        created = response.json()
        category_id = created.get("id")
        print(f"✓ Category created successfully!")
        print(f"  ID: {category_id}")
        print(f"  Name: {created.get('name')}")
    except Exception as e:
        print(f"✗ Error creating category: {e}")
        return False
    
    # Step 5: Verify persistence - fetch again
    print("\n[5] Verifying persistence (fetching all categories again)...")
    try:
        response = requests.get(f"{API_URL}/api/categories", headers=headers, timeout=5)
        if response.status_code != 200:
            print(f"✗ Failed to fetch categories: {response.status_code}")
            return False
        
        all_categories = response.json()
        found = next((c for c in all_categories if c.get("id") == category_id), None)
        if found:
            print(f"✓ Category persists in database!")
            print(f"  Found: {found.get('name')}")
            print(f"  Total categories: {len(all_categories)}")
        else:
            print(f"✗ Category NOT found in database!")
            print(f"  Total categories: {len(all_categories)}")
            return False
    except Exception as e:
        print(f"✗ Error verifying persistence: {e}")
        return False
    
    # Step 6: Clean up - delete test category
    print("\n[6] Cleaning up test category...")
    try:
        response = requests.delete(
            f"{API_URL}/api/categories/{category_id}",
            headers=headers,
            timeout=5
        )
        if response.status_code == 200:
            print("✓ Test category deleted")
        else:
            print(f"⚠ Could not delete test category: {response.status_code}")
    except Exception as e:
        print(f"⚠ Error deleting test category: {e}")
    
    print("\n" + "=" * 60)
    print("✓ ALL TESTS PASSED - Category persistence is working!")
    print("=" * 60)
    return True

if __name__ == "__main__":
    success = test_backend()
    sys.exit(0 if success else 1)


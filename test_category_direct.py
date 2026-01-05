"""
Direct test of category creation to identify exact error.
"""
import requests
import json
import time

BASE_URL = "https://distrohub-backend.onrender.com"

print("=== Category Creation Debug Test ===\n")

# 1. Login
print("1. Logging in...")
login_resp = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": "admin@distrohub.com", "password": "admin123"},
    timeout=10
)
print(f"   Login Status: {login_resp.status_code}")
if login_resp.status_code != 200:
    print(f"   Error: {login_resp.text}")
    exit(1)

token = login_resp.json().get("access_token")
print(f"   Token: {token[:30]}...\n")

# 2. Test OPTIONS (CORS preflight)
print("2. Testing OPTIONS (CORS preflight)...")
opt_resp = requests.options(
    f"{BASE_URL}/api/categories",
    headers={
        "Origin": "https://distrohub-frontend.vercel.app",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type,Authorization"
    },
    timeout=10
)
print(f"   OPTIONS Status: {opt_resp.status_code}")
cors_headers = {k: v for k, v in opt_resp.headers.items() if 'access-control' in k.lower()}
print(f"   CORS Headers: {json.dumps(cors_headers, indent=2)}\n")

# 3. Test POST
print("3. Testing POST /api/categories...")
category_name = f"Test Category {int(time.time())}"
payload = {
    "name": category_name,
    "description": "Direct API test",
    "color": "#FF5733"
}

print(f"   Payload: {json.dumps(payload, indent=2)}")
print(f"   Request URL: {BASE_URL}/api/categories")
print(f"   Headers: Authorization=Bearer {token[:20]}..., Content-Type=application/json")

start_time = time.time()
try:
    post_resp = requests.post(
        f"{BASE_URL}/api/categories",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "Origin": "https://distrohub-frontend.vercel.app"
        },
        json=payload,
        timeout=30
    )
    elapsed = time.time() - start_time
    
    print(f"\n   POST completed in {elapsed:.2f}s")
    print(f"   Status: {post_resp.status_code}")
    print(f"   Response Headers: {dict(post_resp.headers)}")
    
    if post_resp.status_code == 201 or post_resp.status_code == 200:
        print(f"\n   SUCCESS!")
        print(f"   Response: {json.dumps(post_resp.json(), indent=2, default=str)}")
    else:
        print(f"\n   ERROR")
        try:
            error_data = post_resp.json()
            print(f"   Error Response: {json.dumps(error_data, indent=2)}")
        except:
            print(f"   Error Text: {post_resp.text[:500]}")
            
except requests.exceptions.Timeout:
    elapsed = time.time() - start_time
    print(f"\n   ❌ TIMEOUT after {elapsed:.2f}s")
except Exception as e:
    elapsed = time.time() - start_time
    print(f"\n   ❌ EXCEPTION after {elapsed:.2f}s: {type(e).__name__}: {str(e)}")

print("\n=== Test Complete ===")


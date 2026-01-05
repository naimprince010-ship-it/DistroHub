import requests
import json
import time

BASE_URL = "https://distrohub-backend.onrender.com"

print("=== Final Category Creation Test ===\n")

# Login
print("1. Logging in...")
login = requests.post(
    f"{BASE_URL}/api/auth/login",
    json={"email": "admin@distrohub.com", "password": "admin123"},
    timeout=10
)
token = login.json().get("access_token")
print(f"   Login Status: {login.status_code}\n")

# Test POST
print("2. Testing POST /api/categories...")
category_name = f"Final Test {int(time.time())}"
payload = {
    "name": category_name,
    "description": "Final test",
    "color": "#00FF00"
}

post = requests.post(
    f"{BASE_URL}/api/categories",
    headers={
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    },
    json=payload,
    timeout=15
)

print(f"   Status: {post.status_code}")
print(f"   Content-Type: {post.headers.get('Content-Type')}")

if post.status_code == 201:
    resp = post.json()
    print(f"\n   ✅ SUCCESS!")
    print(f"   Response: {json.dumps(resp, indent=2, default=str)}")
    print(f"\n   ✅ Has id: {resp.get('id')}")
    print(f"   ✅ Has name: {resp.get('name')}")
    print(f"   ✅ Has created_at: {resp.get('created_at')}")
else:
    resp = post.json() if post.headers.get('Content-Type', '').startswith('application/json') else post.text[:300]
    print(f"\n   ERROR")
    print(f"   Response: {json.dumps(resp, indent=2) if isinstance(resp, dict) else resp}")

print("\n=== Test Complete ===")


import requests
import json

# Test login
print("=== LOGIN TEST ===")
login_response = requests.post(
    'https://distrohub-backend.onrender.com/api/auth/login',
    json={'email': 'admin@distrohub.com', 'password': 'admin123'},
    timeout=10
)
print(f"Login Status: {login_response.status_code}")
if login_response.status_code == 200:
    token = login_response.json().get('access_token')
    print(f"Token received: {bool(token)}")
    print()
    
    # Test category creation
    print("=== CREATE CATEGORY TEST ===")
    category_response = requests.post(
        'https://distrohub-backend.onrender.com/api/categories',
        headers={
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        },
        json={
            'name': 'TestCategoryDebug123',
            'description': 'Testing 500 error',
            'color': '#4F46E5'
        },
        timeout=10
    )
    print(f"Category Status: {category_response.status_code}")
    print(f"Response: {category_response.text}")
else:
    print(f"Login failed: {login_response.text}")

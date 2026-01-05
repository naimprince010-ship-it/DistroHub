"""
Integration test for POST /api/categories endpoint.

Tests:
- Successful category creation
- Input validation (name length, description length, color format)
- Duplicate category name (409)
- Authentication requirement (401)
- Error handling and status codes
"""
import pytest
import requests
import os
from datetime import datetime

# Configuration
BASE_URL = os.environ.get("API_URL", "https://distrohub-backend.onrender.com")
ADMIN_EMAIL = "admin@distrohub.com"
ADMIN_PASSWORD = "admin123"


def get_auth_token(email: str, password: str) -> str:
    """Get authentication token."""
    response = requests.post(
        f"{BASE_URL}/api/auth/login",
        json={"email": email, "password": password},
        timeout=10
    )
    assert response.status_code == 200, f"Login failed: {response.text}"
    return response.json()["access_token"]


class TestCategoryCreation:
    """Integration tests for category creation."""
    
    @pytest.fixture(scope="class")
    def auth_token(self):
        """Get auth token for test class."""
        return get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    def test_create_category_success(self, auth_token):
        """Test successful category creation."""
        category_data = {
            "name": f"Test Category {datetime.now().timestamp()}",
            "description": "A test category for integration testing",
            "color": "#FF5733"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        
        # Verify response structure
        assert "id" in data, "Response should include id"
        assert "name" in data, "Response should include name"
        assert "description" in data, "Response should include description"
        assert "color" in data, "Response should include color"
        assert "created_at" in data, "Response should include created_at"
        assert "product_count" in data, "Response should include product_count"
        
        # Verify values
        assert data["name"] == category_data["name"]
        assert data["description"] == category_data["description"]
        assert data["color"] == category_data["color"].upper()  # Should be uppercase
        assert data["product_count"] == 0
        assert data["id"] is not None and data["id"] != ""
        assert data["created_at"] is not None
        
        print(f"✓ Category created successfully: {data['id']}")
    
    def test_create_category_minimal(self, auth_token):
        """Test category creation with minimal required fields."""
        category_data = {
            "name": f"Minimal {datetime.now().timestamp()}"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == category_data["name"]
        assert data["color"] == "#4F46E5"  # Default color
        assert data["description"] is None or data["description"] == ""
        print(f"✓ Minimal category created: {data['id']}")
    
    def test_create_category_duplicate_name(self, auth_token):
        """Test that duplicate category names return 409."""
        category_name = f"Duplicate Test {datetime.now().timestamp()}"
        category_data = {
            "name": category_name,
            "description": "First category"
        }
        
        # Create first category
        response1 = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        assert response1.status_code == 200, "First category should be created"
        
        # Try to create duplicate
        response2 = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response2.status_code == 409, f"Expected 409 for duplicate, got {response2.status_code}: {response2.text}"
        assert "already exists" in response2.json()["detail"].lower() or "duplicate" in response2.json()["detail"].lower()
        print("✓ Duplicate category correctly returns 409")
    
    def test_create_category_validation_name_too_short(self, auth_token):
        """Test validation: name too short."""
        category_data = {
            "name": "A",  # Too short (min 2 chars)
            "description": "Test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}: {response.text}"
        print("✓ Name too short correctly returns 422")
    
    def test_create_category_validation_name_too_long(self, auth_token):
        """Test validation: name too long."""
        category_data = {
            "name": "A" * 101,  # Too long (max 100 chars)
            "description": "Test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}: {response.text}"
        print("✓ Name too long correctly returns 422")
    
    def test_create_category_validation_invalid_color(self, auth_token):
        """Test validation: invalid color format."""
        category_data = {
            "name": f"Invalid Color {datetime.now().timestamp()}",
            "color": "not-a-hex-color"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}: {response.text}"
        print("✓ Invalid color format correctly returns 422")
    
    def test_create_category_validation_description_too_long(self, auth_token):
        """Test validation: description too long."""
        category_data = {
            "name": f"Long Desc {datetime.now().timestamp()}",
            "description": "A" * 501  # Too long (max 500 chars)
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 422, f"Expected 422 for validation error, got {response.status_code}: {response.text}"
        print("✓ Description too long correctly returns 422")
    
    def test_create_category_unauthorized(self):
        """Test that unauthenticated requests return 401."""
        category_data = {
            "name": f"Unauthorized Test {datetime.now().timestamp()}",
            "description": "Should fail"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={"Content-Type": "application/json"},
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 401, f"Expected 401 for unauthorized, got {response.status_code}: {response.text}"
        print("✓ Unauthenticated request correctly returns 401")
    
    def test_create_category_name_trimming(self, auth_token):
        """Test that name is trimmed of whitespace."""
        category_data = {
            "name": "  Trimmed Category  ",  # Should be trimmed
            "description": "Test"
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["name"] == "Trimmed Category", f"Name should be trimmed, got: '{data['name']}'"
        print("✓ Name trimming works correctly")
    
    def test_create_category_description_trimming(self, auth_token):
        """Test that description is trimmed and empty becomes None."""
        category_data = {
            "name": f"Desc Trim {datetime.now().timestamp()}",
            "description": "   "  # Should become None
        }
        
        response = requests.post(
            f"{BASE_URL}/api/categories",
            headers={
                "Authorization": f"Bearer {auth_token}",
                "Content-Type": "application/json"
            },
            json=category_data,
            timeout=10
        )
        
        assert response.status_code == 200, f"Expected 200, got {response.status_code}: {response.text}"
        data = response.json()
        assert data["description"] is None or data["description"] == "", "Empty description should be None or empty"
        print("✓ Description trimming works correctly")


if __name__ == "__main__":
    # Run tests without pytest
    test = TestCategoryCreation()
    auth_token = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)
    
    print("\n=== Running Category Creation Integration Tests ===\n")
    
    try:
        test.test_create_category_success(auth_token)
        test.test_create_category_minimal(auth_token)
        test.test_create_category_duplicate_name(auth_token)
        test.test_create_category_validation_name_too_short(auth_token)
        test.test_create_category_validation_name_too_long(auth_token)
        test.test_create_category_validation_invalid_color(auth_token)
        test.test_create_category_validation_description_too_long(auth_token)
        test.test_create_category_unauthorized()
        test.test_create_category_name_trimming(auth_token)
        test.test_create_category_description_trimming(auth_token)
        
        print("\n✓ All tests passed!")
    except AssertionError as e:
        print(f"\n✗ Test failed: {e}")
        raise
    except Exception as e:
        print(f"\n✗ Unexpected error: {e}")
        raise


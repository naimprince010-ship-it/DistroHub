#!/usr/bin/env python3
"""
DistroHub API Smoke Test
Tests core endpoints to verify API functionality.

Usage:
    python tests/test_smoke_api.py

Environment Variables:
    API_URL: Backend API URL (default: http://localhost:8000)
    TEST_EMAIL: Test user email (default: admin@distrohub.com)
    TEST_PASSWORD: Test user password (default: admin123)
"""

import os
import sys
import requests
import json
from typing import Optional, Dict, Any

# Configuration
API_URL = os.getenv("API_URL", "https://distrohub-backend.onrender.com")
TEST_EMAIL = os.getenv("TEST_EMAIL", "admin@distrohub.com")
TEST_PASSWORD = os.getenv("TEST_PASSWORD", "admin123")

# Logging prefixes
PREFIX_API = "[API]"
PREFIX_TEST = "[TEST]"
PREFIX_PASS = "[PASS]"
PREFIX_FAIL = "[FAIL]"

class Colors:
    GREEN = '\033[92m'
    RED = '\033[91m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    RESET = '\033[0m'

def log(message: str, prefix: str = PREFIX_TEST, color: str = ""):
    """Print colored log message"""
    if color:
        print(f"{color}{prefix} {message}{Colors.RESET}")
    else:
        print(f"{prefix} {message}")

def test_endpoint(
    method: str,
    path: str,
    token: Optional[str] = None,
    data: Optional[Dict[str, Any]] = None,
    expected_status: int = 200
) -> tuple[bool, Optional[Dict[str, Any]], int]:
    """
    Test an API endpoint.
    
    Returns:
        (success, response_data, status_code)
    """
    url = f"{API_URL}{path}"
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    try:
        if method.upper() == "GET":
            response = requests.get(url, headers=headers, timeout=10)
        elif method.upper() == "POST":
            response = requests.post(url, headers=headers, json=data, timeout=10)
        elif method.upper() == "PUT":
            response = requests.put(url, headers=headers, json=data, timeout=10)
        elif method.upper() == "DELETE":
            response = requests.delete(url, headers=headers, timeout=10)
        else:
            log(f"Unsupported method: {method}", PREFIX_FAIL, Colors.RED)
            return False, None, 0
        
        status_code = response.status_code
        success = status_code == expected_status
        
        try:
            response_data = response.json() if response.content else None
        except:
            response_data = {"raw": response.text[:200]}
        
        return success, response_data, status_code
    except requests.exceptions.RequestException as e:
        log(f"Request failed: {e}", PREFIX_FAIL, Colors.RED)
        return False, None, 0

def test_login() -> Optional[str]:
    """Test login and return token"""
    log("Testing login...", PREFIX_TEST, Colors.BLUE)
    
    success, data, status = test_endpoint(
        "POST",
        "/api/auth/login",
        data={"email": TEST_EMAIL, "password": TEST_PASSWORD},
        expected_status=200
    )
    
    if success and data and "access_token" in data:
        token = data["access_token"]
        log(f"Login successful: {data.get('user', {}).get('email', 'unknown')}", PREFIX_PASS, Colors.GREEN)
        return token
    else:
        log(f"Login failed: status={status}, data={data}", PREFIX_FAIL, Colors.RED)
        return None

def test_categories(token: str) -> bool:
    """Test categories endpoints"""
    log("Testing categories...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/categories
    success, data, status = test_endpoint("GET", "/api/categories", token)
    if not success:
        log(f"GET /api/categories failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    categories = data if isinstance(data, list) else []
    log(f"GET /api/categories: {len(categories)} categories", PREFIX_PASS, Colors.GREEN)
    
    # POST /api/categories (create test category)
    test_category = {
        "name": f"Test Category {os.getpid()}",
        "description": "Smoke test category",
        "color": "#FF5733"
    }
    success, data, status = test_endpoint("POST", "/api/categories", token, test_category, 201)
    if success:
        log(f"POST /api/categories: Created category '{data.get('name', 'unknown')}'", PREFIX_PASS, Colors.GREEN)
        return True
    else:
        log(f"POST /api/categories failed: status={status}, data={data}", PREFIX_FAIL, Colors.RED)
        return False

def test_products(token: str) -> bool:
    """Test products endpoints"""
    log("Testing products...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/products
    success, data, status = test_endpoint("GET", "/api/products", token)
    if not success:
        log(f"GET /api/products failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    products = data if isinstance(data, list) else []
    log(f"GET /api/products: {len(products)} products", PREFIX_PASS, Colors.GREEN)
    
    return True

def test_inventory(token: str) -> bool:
    """Test inventory endpoint"""
    log("Testing inventory...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/inventory
    success, data, status = test_endpoint("GET", "/api/inventory", token)
    if not success:
        log(f"GET /api/inventory failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    inventory = data if isinstance(data, list) else []
    log(f"GET /api/inventory: {len(inventory)} items", PREFIX_PASS, Colors.GREEN)
    
    return True

def test_purchases(token: str) -> bool:
    """Test purchases endpoints"""
    log("Testing purchases...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/purchases
    success, data, status = test_endpoint("GET", "/api/purchases", token)
    if not success:
        log(f"GET /api/purchases failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    purchases = data if isinstance(data, list) else []
    log(f"GET /api/purchases: {len(purchases)} purchases", PREFIX_PASS, Colors.GREEN)
    
    return True

def test_suppliers(token: str) -> bool:
    """Test suppliers endpoints"""
    log("Testing suppliers...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/suppliers
    success, data, status = test_endpoint("GET", "/api/suppliers", token)
    if not success:
        log(f"GET /api/suppliers failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    suppliers = data if isinstance(data, list) else []
    log(f"GET /api/suppliers: {len(suppliers)} suppliers", PREFIX_PASS, Colors.GREEN)
    
    return True

def test_retailers(token: str) -> bool:
    """Test retailers endpoints"""
    log("Testing retailers...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/retailers
    success, data, status = test_endpoint("GET", "/api/retailers", token)
    if not success:
        log(f"GET /api/retailers failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    retailers = data if isinstance(data, list) else []
    log(f"GET /api/retailers: {len(retailers)} retailers", PREFIX_PASS, Colors.GREEN)
    
    # POST /api/retailers (create test retailer)
    test_retailer = {
        "name": f"Test Retailer {os.getpid()}",
        "shop_name": f"Test Shop {os.getpid()}",
        "phone": f"017{os.getpid() % 10000000:08d}",
        "address": "Test Address",
        "area": "Test Area",
        "district": "Test District",
        "credit_limit": 50000
    }
    success, data, status = test_endpoint("POST", "/api/retailers", token, test_retailer, 200)
    if success:
        log(f"POST /api/retailers: Created retailer '{data.get('shop_name', 'unknown')}'", PREFIX_PASS, Colors.GREEN)
        return True
    else:
        log(f"POST /api/retailers failed: status={status}, data={data}", PREFIX_FAIL, Colors.RED)
        return False

def test_sales(token: str) -> bool:
    """Test sales endpoints"""
    log("Testing sales...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/sales
    success, data, status = test_endpoint("GET", "/api/sales", token)
    if not success:
        log(f"GET /api/sales failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    sales = data if isinstance(data, list) else []
    log(f"GET /api/sales: {len(sales)} sales", PREFIX_PASS, Colors.GREEN)
    
    return True

def test_dashboard(token: str) -> bool:
    """Test dashboard stats endpoint"""
    log("Testing dashboard...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/dashboard/stats
    success, data, status = test_endpoint("GET", "/api/dashboard/stats", token)
    if not success:
        log(f"GET /api/dashboard/stats failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    # Verify all required KPIs are present
    required_fields = [
        "total_sales", "total_due", "total_products", "total_categories",
        "total_purchases", "active_retailers", "low_stock_count",
        "expiring_soon_count", "payable_to_supplier", "receivable_from_customers",
        "sales_this_month", "collections_this_month"
    ]
    
    missing_fields = [f for f in required_fields if f not in data]
    if missing_fields:
        log(f"GET /api/dashboard/stats: Missing fields {missing_fields}", PREFIX_FAIL, Colors.RED)
        return False
    
    log(f"GET /api/dashboard/stats: All {len(required_fields)} KPIs present", PREFIX_PASS, Colors.GREEN)
    return True

def test_expiry_alerts(token: str) -> bool:
    """Test expiry alerts endpoint"""
    log("Testing expiry alerts...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/expiry-alerts
    success, data, status = test_endpoint("GET", "/api/expiry-alerts", token)
    if not success:
        log(f"GET /api/expiry-alerts failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    alerts = data if isinstance(data, list) else []
    log(f"GET /api/expiry-alerts: {len(alerts)} alerts", PREFIX_PASS, Colors.GREEN)
    return True

def test_receivables(token: str) -> bool:
    """Test receivables endpoint"""
    log("Testing receivables...", PREFIX_TEST, Colors.BLUE)
    
    # GET /api/receivables
    success, data, status = test_endpoint("GET", "/api/receivables", token)
    if not success:
        log(f"GET /api/receivables failed: status={status}", PREFIX_FAIL, Colors.RED)
        return False
    
    receivables = data if isinstance(data, list) else []
    log(f"GET /api/receivables: {len(receivables)} receivables", PREFIX_PASS, Colors.GREEN)
    return True

def main():
    """Run smoke tests"""
    log("=" * 60, PREFIX_TEST, Colors.BLUE)
    log("DistroHub API Smoke Test (QA Enhanced)", PREFIX_TEST, Colors.BLUE)
    log("=" * 60, PREFIX_TEST, Colors.BLUE)
    log(f"API URL: {API_URL}", PREFIX_TEST)
    log(f"Test Email: {TEST_EMAIL}", PREFIX_TEST)
    log("", PREFIX_TEST)
    
    # Test login
    token = test_login()
    if not token:
        log("Cannot proceed without authentication token", PREFIX_FAIL, Colors.RED)
        sys.exit(1)
    
    log("", PREFIX_TEST)
    
    # Test core endpoints
    results = {
        "Categories": test_categories(token),
        "Products": test_products(token),
        "Inventory": test_inventory(token),
        "Purchases": test_purchases(token),
        "Suppliers": test_suppliers(token),
        "Retailers": test_retailers(token),  # Includes GET + POST
        "Sales": test_sales(token),
        "Dashboard": test_dashboard(token),
        "Expiry Alerts": test_expiry_alerts(token),
        "Receivables": test_receivables(token),
        # Reports endpoints are covered by Sales, Purchases, Inventory tests above
    }
    
    # Summary
    log("", PREFIX_TEST)
    log("=" * 60, PREFIX_TEST, Colors.BLUE)
    log("Test Summary", PREFIX_TEST, Colors.BLUE)
    log("=" * 60, PREFIX_TEST, Colors.BLUE)
    
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for name, result in results.items():
        status = PREFIX_PASS if result else PREFIX_FAIL
        color = Colors.GREEN if result else Colors.RED
        log(f"{name}: {'PASS' if result else 'FAIL'}", status, color)
    
    log("", PREFIX_TEST)
    log(f"Total: {passed}/{total} tests passed", PREFIX_TEST, Colors.GREEN if passed == total else Colors.YELLOW)
    
    if passed == total:
        log("All tests passed!", PREFIX_PASS, Colors.GREEN)
        sys.exit(0)
    else:
        log("Some tests failed!", PREFIX_FAIL, Colors.RED)
        sys.exit(1)

if __name__ == "__main__":
    main()


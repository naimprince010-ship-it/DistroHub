"""
Test: SR Accountability Frontend Mapping
Verifies that frontend correctly displays total_collected and current_outstanding from API response.
"""

import pytest
from app.models import SrAccountability
from app.supabase_db import SupabaseDatabase

def test_sr_accountability_response_includes_total_collected():
    """Test that get_sr_accountability returns total_collected in response"""
    db = SupabaseDatabase()
    
    # Get a test SR user_id (assuming at least one SR exists)
    users = db.get_users()
    sr_users = [u for u in users if u.get("role") == "sales_rep"]
    
    if not sr_users:
        pytest.skip("No SR users found in database")
    
    sr_id = sr_users[0]["id"]
    
    # Call get_sr_accountability
    result = db.get_sr_accountability(sr_id)
    
    # Verify response structure
    assert result is not None, "get_sr_accountability should return a result"
    assert "total_collected" in result, "Response must include total_collected field"
    assert "total_returns" in result, "Response must include total_returns field"
    assert "current_outstanding" in result, "Response must include current_outstanding field"
    
    # Verify types
    assert isinstance(result["total_collected"], (int, float)), "total_collected must be numeric"
    assert isinstance(result["total_returns"], (int, float)), "total_returns must be numeric"
    assert isinstance(result["current_outstanding"], (int, float)), "current_outstanding must be numeric"
    
    # Verify calculation: current_outstanding = total_expected - total_collected - total_returns
    expected_outstanding = result["total_expected_cash"] - result["total_collected"] - result["total_returns"]
    assert abs(result["current_outstanding"] - expected_outstanding) < 0.01, \
        f"current_outstanding should equal total_expected - total_collected - total_returns. " \
        f"Got: {result['current_outstanding']}, Expected: {expected_outstanding}"


def test_sr_accountability_with_payments_shows_total_collected():
    """Test that when payments exist, total_collected reflects them"""
    db = SupabaseDatabase()
    
    # Get a test SR user_id
    users = db.get_users()
    sr_users = [u for u in users if u.get("role") == "sales_rep"]
    
    if not sr_users:
        pytest.skip("No SR users found in database")
    
    sr_id = sr_users[0]["id"]
    
    # Get accountability
    result = db.get_sr_accountability(sr_id)
    
    if result is None:
        pytest.skip("No accountability data for this SR")
    
    # If there are routes, total_collected should be >= 0
    if result.get("total_expected_cash", 0) > 0:
        assert result["total_collected"] >= 0, "total_collected should be non-negative"
        assert result["current_outstanding"] >= (result["total_expected_cash"] - result["total_collected"] - result["total_returns"]), \
            "current_outstanding should account for collected payments"
    
    print(f"[TEST] SR Accountability for {result.get('user_name')}:")
    print(f"  - Total Expected: {result.get('total_expected_cash', 0)}")
    print(f"  - Total Collected: {result.get('total_collected', 0)}")
    print(f"  - Total Returns: {result.get('total_returns', 0)}")
    print(f"  - Current Outstanding: {result.get('current_outstanding', 0)}")


def test_sr_accountability_model_validation():
    """Test that SrAccountability Pydantic model accepts total_collected and total_returns"""
    from app.models import SrAccountability
    
    # Create a valid SrAccountability instance
    test_data = {
        "user_id": "test-user-id",
        "user_name": "Test SR",
        "current_cash_holding": 1000.0,
        "current_outstanding": 5000.0,
        "active_routes_count": 2,
        "pending_reconciliation_count": 1,
        "total_expected_cash": 20000.0,
        "total_collected": 15000.0,  # NEW FIELD
        "total_returns": 0.0,  # NEW FIELD
        "routes": [],
        "reconciliations": []
    }
    
    # Should not raise validation error
    accountability = SrAccountability(**test_data)
    
    assert accountability.total_collected == 15000.0
    assert accountability.total_returns == 0.0
    assert accountability.current_outstanding == 5000.0
    
    # Verify calculation
    expected_outstanding = accountability.total_expected_cash - accountability.total_collected - accountability.total_returns
    assert abs(accountability.current_outstanding - expected_outstanding) < 0.01


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

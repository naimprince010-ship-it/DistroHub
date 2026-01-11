"""
Regression Tests for Route SR Override Policy

Tests that Route SR overrides Sales SR when sales are added to routes.
"""

import pytest
from unittest.mock import Mock, patch
from distrohub_backend.app.supabase_db import SupabaseDatabase


class TestRouteSROverride:
    """Test Route SR override functionality"""
    
    @pytest.fixture
    def mock_db(self):
        """Create a mock SupabaseDatabase instance"""
        with patch('distrohub_backend.app.supabase_db.get_supabase_client') as mock_client:
            db = SupabaseDatabase()
            db.client = Mock()
            return db
    
    def test_create_route_overrides_sales_assigned_to(self, mock_db):
        """Test that create_route() overrides sales.assigned_to to match route's SR"""
        # Setup
        route_sr_id = "sr-route-123"
        route_sr_name = "Route SR"
        sale_id_1 = "sale-1"
        sale_id_2 = "sale-2"
        
        # Mock user lookup
        mock_db.get_user_by_id = Mock(return_value={"id": route_sr_id, "name": route_sr_name})
        
        # Mock sale lookups
        mock_db.get_sale = Mock(side_effect=[
            {"id": sale_id_1, "retailer_id": "retailer-1", "total_amount": 1000, "due_amount": 500},
            {"id": sale_id_2, "retailer_id": "retailer-2", "total_amount": 2000, "due_amount": 1000},
        ])
        
        # Mock previous due calculation
        mock_db.calculate_previous_due = Mock(return_value=0.0)
        
        # Mock route creation
        mock_db.client.table.return_value.insert.return_value.execute.return_value.data = [{
            "id": "route-123",
            "route_number": "RT-20260112-ABCD",
            "assigned_to": route_sr_id,
            "assigned_to_name": route_sr_name
        }]
        
        # Mock route_sales insertions
        mock_db.client.table.return_value.insert.return_value.execute.return_value.data = [{}]
        
        # Mock sales updates
        mock_update = Mock()
        mock_update.eq.return_value.execute.return_value.data = [{}]
        mock_db.client.table.return_value.update.return_value = mock_update
        
        # Mock get_route
        mock_db.get_route = Mock(return_value={
            "id": "route-123",
            "assigned_to": route_sr_id,
            "assigned_to_name": route_sr_name,
            "sales": []
        })
        
        # Execute
        route_data = {
            "assigned_to": route_sr_id,
            "route_date": "2026-01-12",
            "notes": "Test route"
        }
        sale_ids = [sale_id_1, sale_id_2]
        
        result = mock_db.create_route(route_data, sale_ids)
        
        # Verify: sales.assigned_to should be updated to route's SR
        update_calls = [call for call in mock_db.client.table.return_value.update.call_args_list 
                       if 'sales' in str(call)]
        
        assert len(update_calls) >= 2, "Should update sales.assigned_to for each sale"
        
        # Check that assigned_to was set to route's SR
        for call in update_calls:
            update_data = call[0][0] if call[0] else {}
            if "assigned_to" in update_data:
                assert update_data["assigned_to"] == route_sr_id, "sales.assigned_to should match route's SR"
                assert update_data["assigned_to_name"] == route_sr_name, "sales.assigned_to_name should match route's SR name"
    
    def test_add_sales_to_route_overrides_assigned_to(self, mock_db):
        """Test that add_sales_to_route() overrides sales.assigned_to to match route's SR"""
        # Setup
        route_id = "route-123"
        route_sr_id = "sr-route-123"
        route_sr_name = "Route SR"
        sale_id = "sale-new"
        
        # Mock route
        mock_db.get_route = Mock(return_value={
            "id": route_id,
            "assigned_to": route_sr_id,
            "assigned_to_name": route_sr_name,
            "status": "pending",
            "sales": []
        })
        
        # Mock sale
        mock_db.get_sale = Mock(return_value={
            "id": sale_id,
            "retailer_id": "retailer-1",
            "total_amount": 1000,
            "due_amount": 500
        })
        
        # Mock previous due
        mock_db.calculate_previous_due = Mock(return_value=0.0)
        
        # Mock route_sales check (sale not in route)
        mock_db.client.table.return_value.select.return_value.eq.return_value.eq.return_value.execute.return_value.data = []
        
        # Mock route_sales insert
        mock_db.client.table.return_value.insert.return_value.execute.return_value.data = [{}]
        
        # Mock sales update
        mock_update = Mock()
        mock_update.eq.return_value.execute.return_value.data = [{}]
        mock_db.client.table.return_value.update.return_value = mock_update
        
        # Execute
        result = mock_db.add_sales_to_route(route_id, [sale_id])
        
        # Verify: sales.assigned_to should be updated
        update_calls = [call for call in mock_db.client.table.return_value.update.call_args_list 
                       if 'sales' in str(call)]
        
        assert len(update_calls) > 0, "Should update sales.assigned_to"
        
        # Check that assigned_to was set to route's SR
        for call in update_calls:
            update_data = call[0][0] if call[0] else {}
            if "assigned_to" in update_data:
                assert update_data["assigned_to"] == route_sr_id, "sales.assigned_to should match route's SR"
                assert update_data["assigned_to_name"] == route_sr_name, "sales.assigned_to_name should match route's SR name"
    
    def test_add_sales_to_completed_route_fails(self, mock_db):
        """Test that adding sales to completed route fails"""
        route_id = "route-123"
        
        # Mock completed route
        mock_db.get_route = Mock(return_value={
            "id": route_id,
            "assigned_to": "sr-123",
            "status": "completed"
        })
        
        # Execute and expect error
        with pytest.raises(ValueError, match="Cannot add sales to route with status 'completed'"):
            mock_db.add_sales_to_route(route_id, ["sale-1"])
    
    def test_add_sales_to_reconciled_route_fails(self, mock_db):
        """Test that adding sales to reconciled route fails"""
        route_id = "route-123"
        
        # Mock reconciled route
        mock_db.get_route = Mock(return_value={
            "id": route_id,
            "assigned_to": "sr-123",
            "status": "reconciled"
        })
        
        # Execute and expect error
        with pytest.raises(ValueError, match="Cannot add sales to route with status 'reconciled'"):
            mock_db.add_sales_to_route(route_id, ["sale-1"])
    
    def test_remove_sale_from_completed_route_fails(self, mock_db):
        """Test that removing sales from completed route fails"""
        route_id = "route-123"
        sale_id = "sale-1"
        
        # Mock completed route
        mock_db.get_route = Mock(return_value={
            "id": route_id,
            "assigned_to": "sr-123",
            "status": "completed"
        })
        
        # Execute and expect error
        with pytest.raises(ValueError, match="Cannot remove sales from route with status 'completed'"):
            mock_db.remove_sale_from_route(route_id, sale_id)
    
    def test_remove_sale_from_reconciled_route_fails(self, mock_db):
        """Test that removing sales from reconciled route fails"""
        route_id = "route-123"
        sale_id = "sale-1"
        
        # Mock reconciled route
        mock_db.get_route = Mock(return_value={
            "id": route_id,
            "assigned_to": "sr-123",
            "status": "reconciled"
        })
        
        # Execute and expect error
        with pytest.raises(ValueError, match="Cannot remove sales from route with status 'reconciled'"):
            mock_db.remove_sale_from_route(route_id, sale_id)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

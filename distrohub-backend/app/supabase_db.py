import os
import hashlib
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
from supabase import create_client, Client
from app.models import (
    UserRole, PaymentStatus, OrderStatus, ExpiryStatus,
    ProductBatch, InventoryItem, ExpiryAlert, DashboardStats,
    RefundType
)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_KEY = os.environ.get("SUPABASE_KEY")

def get_supabase_client() -> Optional[Client]:
    if SUPABASE_URL and SUPABASE_KEY:
        return create_client(SUPABASE_URL, SUPABASE_KEY)
    return None

class SupabaseDatabase:
    def __init__(self):
        self.client = get_supabase_client()
        if not self.client:
            raise ValueError("Supabase credentials not configured")
    
    def hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.hash_password(plain_password) == hashed_password
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        result = self.client.table("users").select("*").eq("email", email).execute()
        if result.data:
            user = result.data[0]
            user["role"] = UserRole(user["role"]) if user.get("role") else UserRole.SALES_REP
            return user
        return None
    
    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Get user by ID"""
        result = self.client.table("users").select("*").eq("id", user_id).execute()
        if result.data:
            user = result.data[0]
            user["role"] = UserRole(user["role"]) if user.get("role") else UserRole.SALES_REP
            return user
        return None
    
    def get_users(self) -> List[dict]:
        """Get all users"""
        result = self.client.table("users").select("*").order("created_at", desc=True).execute()
        users = result.data or []
        for user in users:
            user["role"] = UserRole(user["role"]) if user.get("role") else UserRole.SALES_REP
        return users
    
    def create_user(self, email: str, name: str, password: str, role: UserRole, phone: str = None) -> dict:
        user_data = {
            "email": email,
            "name": name,
            "role": role.value if isinstance(role, UserRole) else role,
            "phone": phone,
            "password_hash": self.hash_password(password)
        }
        result = self.client.table("users").insert(user_data).execute()
        return result.data[0] if result.data else user_data
    
    def update_user(self, user_id: str, data: dict) -> Optional[dict]:
        """Update user information"""
        try:
            update_data = {}
            
            if "name" in data and data["name"] is not None:
                update_data["name"] = data["name"]
            
            if "email" in data and data["email"] is not None:
                update_data["email"] = data["email"]
            
            if "phone" in data:
                update_data["phone"] = data["phone"] if data["phone"] else None
            
            if "password" in data and data["password"]:
                update_data["password_hash"] = self.hash_password(data["password"])
            
            if not update_data:
                return None
            
            result = self.client.table("users").update(update_data).eq("id", user_id).execute()
            return result.data[0] if result.data else None
        except Exception as e:
            print(f"[DB] Error updating user {user_id}: {e}")
            raise
    
    def delete_user(self, user_id: str) -> bool:
        """Delete a user and clear assigned_to references in sales"""
        try:
            # Step 1: Clear assigned_to references in sales table
            self.client.table("sales").update({
                "assigned_to": None,
                "assigned_to_name": None
            }).eq("assigned_to", user_id).execute()
            
            # Step 2: Clear collected_by references in payments table
            self.client.table("payments").update({
                "collected_by": None,
                "collected_by_name": None
            }).eq("collected_by", user_id).execute()
            
            # Step 3: Delete the user
            result = self.client.table("users").delete().eq("id", user_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"[DB] Error deleting user {user_id}: {e}")
            raise
    
    def get_products(self) -> List[dict]:
        result = self.client.table("products").select("*").execute()
        return result.data or []
    
    def get_product(self, product_id: str) -> Optional[dict]:
        result = self.client.table("products").select("*").eq("id", product_id).execute()
        return result.data[0] if result.data else None
    
    def create_product(self, data: dict) -> dict:
        """
        Create a product in Supabase.
        
        Raises:
            ValueError: For validation errors (400)
            Exception: For unexpected errors (500)
        """
        if not self.client:
            raise ValueError("Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_KEY environment variables.")
        
        try:
            print(f"[Supabase] Inserting product data: {data}")
            
            # Execute Supabase insert
            result = self.client.table("products").insert(data).execute()
            
            # Check for Supabase errors in response
            if hasattr(result, 'error') and result.error:
                error_msg = str(result.error)
                print(f"[Supabase] Response has error attribute: {error_msg}")
                raise ValueError(f"Supabase error: {error_msg}")
            
            # Check if result has data attribute
            if not hasattr(result, 'data'):
                print(f"[Supabase] Result object: {type(result)}")
                raise ValueError(f"Supabase response missing 'data' attribute. Response type: {type(result)}")
            
            if not result.data:
                print(f"[Supabase] result.data is empty: {result.data}")
                raise ValueError("No data returned from Supabase after insert")
            
            if not isinstance(result.data, list) or len(result.data) == 0:
                print(f"[Supabase] result.data is not a list or is empty: {result.data}")
                raise ValueError(f"Invalid data format from Supabase: expected list, got {type(result.data)}")
            
            product = result.data[0]
            print(f"[Supabase] Product inserted: id={product.get('id')}, name={product.get('name')}")
            return product
        except ValueError:
            raise
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"[Supabase] create_product unexpected error ({error_type}): {error_msg}")
            print(f"[Supabase] Data being inserted: {data}")
            import traceback
            traceback.print_exc()
            raise Exception(f"Unexpected error creating product: {error_msg}")
    
    def update_product(self, product_id: str, data: dict) -> Optional[dict]:
        result = self.client.table("products").update(data).eq("id", product_id).execute()
        return result.data[0] if result.data else None
    
    def delete_product(self, product_id: str) -> bool:
        """Delete a product and its associated batches"""
        try:
            # First, delete all batches for this product
            self.client.table("product_batches").delete().eq("product_id", product_id).execute()
            
            # Then delete the product
            result = self.client.table("products").delete().eq("id", product_id).execute()
            
            # Check if product was actually deleted
            if result.data and len(result.data) > 0:
                return True
            return False
        except Exception as e:
            print(f"[DB] Error deleting product {product_id}: {e}")
            raise
    
    def get_batches_by_product(self, product_id: str) -> List[dict]:
        result = self.client.table("product_batches").select("*").eq("product_id", product_id).execute()
        return result.data or []
    
    def get_batch(self, batch_id: str) -> Optional[dict]:
        result = self.client.table("product_batches").select("*").eq("id", batch_id).execute()
        return result.data[0] if result.data else None
    
    def create_batch(self, data: dict) -> dict:
        if "expiry_date" in data and isinstance(data["expiry_date"], date):
            data["expiry_date"] = data["expiry_date"].isoformat()
        # Ensure warehouse_id is set (use default if not provided)
        if not data.get("warehouse_id"):
            default_warehouse = self.client.table("warehouses").select("*").eq("name", "Main Warehouse").limit(1).execute()
            if default_warehouse.data:
                data["warehouse_id"] = default_warehouse.data[0]["id"]
        result = self.client.table("product_batches").insert(data).execute()
        return result.data[0] if result.data else data
    
    def update_batch_quantity(self, batch_id: str, quantity_change: int) -> Optional[dict]:
        batch = self.get_batch(batch_id)
        if batch:
            new_quantity = batch["quantity"] + quantity_change
            result = self.client.table("product_batches").update({"quantity": new_quantity}).eq("id", batch_id).execute()
            return result.data[0] if result.data else None
        return None
    
    def get_retailers(self) -> List[dict]:
        result = self.client.table("retailers").select("*").execute()
        return result.data or []
    
    def get_retailer(self, retailer_id: str) -> Optional[dict]:
        result = self.client.table("retailers").select("*").eq("id", retailer_id).execute()
        return result.data[0] if result.data else None
    
    def create_retailer(self, data: dict) -> dict:
        data["total_due"] = data.get("total_due", 0)
        result = self.client.table("retailers").insert(data).execute()
        return result.data[0] if result.data else data
    
    def update_retailer(self, retailer_id: str, data: dict) -> Optional[dict]:
        result = self.client.table("retailers").update(data).eq("id", retailer_id).execute()
        return result.data[0] if result.data else None
    
    def update_retailer_due(self, retailer_id: str, amount_change: float) -> Optional[dict]:
        retailer = self.get_retailer(retailer_id)
        if retailer:
            new_due = retailer["total_due"] + amount_change
            result = self.client.table("retailers").update({"total_due": new_due}).eq("id", retailer_id).execute()
            return result.data[0] if result.data else None
        return None
    
    def delete_retailer(self, retailer_id: str) -> bool:
        self.client.table("retailers").delete().eq("id", retailer_id).execute()
        return True
    
    # Warehouse methods
    def get_warehouses(self) -> List[dict]:
        """Get all warehouses"""
        result = self.client.table("warehouses").select("*").order("name").execute()
        return result.data or []
    
    def get_warehouse(self, warehouse_id: str) -> Optional[dict]:
        """Get single warehouse by ID"""
        result = self.client.table("warehouses").select("*").eq("id", warehouse_id).execute()
        return result.data[0] if result.data else None
    
    def create_warehouse(self, data: dict) -> dict:
        """Create new warehouse"""
        result = self.client.table("warehouses").insert(data).execute()
        return result.data[0] if result.data else data
    
    def update_warehouse(self, warehouse_id: str, data: dict) -> Optional[dict]:
        """Update warehouse"""
        result = self.client.table("warehouses").update(data).eq("id", warehouse_id).execute()
        return result.data[0] if result.data else None
    
    def get_warehouse_stock_count(self, warehouse_id: str) -> int:
        """Get total stock count in warehouse (sum of all batches)"""
        result = self.client.table("product_batches").select("quantity").eq("warehouse_id", warehouse_id).execute()
        batches = result.data or []
        return sum(int(batch.get("quantity", 0)) for batch in batches)
    
    def get_warehouse_stock_summary(self, warehouse_id: str) -> List[dict]:
        """Get stock summary per product for a warehouse"""
        # Get warehouse name
        warehouse = self.get_warehouse(warehouse_id)
        if not warehouse:
            return []
        
        # Get all batches for this warehouse
        batches_result = self.client.table("product_batches").select("*").eq("warehouse_id", warehouse_id).execute()
        batches = batches_result.data or []
        
        # Aggregate by product
        product_stock = {}
        for batch in batches:
            product_id = batch.get("product_id")
            if not product_id:
                continue
            
            if product_id not in product_stock:
                product = self.get_product(product_id)
                product_stock[product_id] = {
                    "warehouse_id": warehouse_id,
                    "warehouse_name": warehouse.get("name", ""),
                    "product_id": product_id,
                    "product_name": product.get("name", "") if product else "Unknown",
                    "total_quantity": 0
                }
            product_stock[product_id]["total_quantity"] += int(batch.get("quantity", 0))
        
        return list(product_stock.values())
    
    def update_warehouse_stock(self, warehouse_id: str, product_id: str, quantity_change: int) -> Optional[dict]:
        """Update warehouse_stock summary table"""
        # Get current stock
        result = self.client.table("warehouse_stock").select("*").eq("warehouse_id", warehouse_id).eq("product_id", product_id).execute()
        existing = result.data[0] if result.data else None
        
        if existing:
            new_quantity = max(0, existing.get("total_quantity", 0) + quantity_change)
            if new_quantity == 0:
                # Delete if quantity becomes 0
                self.client.table("warehouse_stock").delete().eq("warehouse_id", warehouse_id).eq("product_id", product_id).execute()
                return None
            else:
                # Update
                update_result = self.client.table("warehouse_stock").update({
                    "total_quantity": new_quantity,
                    "last_updated": datetime.now().isoformat()
                }).eq("warehouse_id", warehouse_id).eq("product_id", product_id).execute()
                return update_result.data[0] if update_result.data else None
        else:
            # Create new entry if quantity > 0
            if quantity_change > 0:
                warehouse = self.get_warehouse(warehouse_id)
                product = self.get_product(product_id)
                insert_result = self.client.table("warehouse_stock").insert({
                    "warehouse_id": warehouse_id,
                    "product_id": product_id,
                    "total_quantity": quantity_change,
                    "last_updated": datetime.now().isoformat()
                }).execute()
                return insert_result.data[0] if insert_result.data else None
        return None
    
    def delete_warehouse(self, warehouse_id: str) -> bool:
        """Delete warehouse with stock check"""
        stock_count = self.get_warehouse_stock_count(warehouse_id)
        if stock_count > 0:
            raise ValueError(f"Cannot delete warehouse. It contains {stock_count} items. Please transfer or remove stock first.")
        self.client.table("warehouses").delete().eq("id", warehouse_id).execute()
        return True
    
    def get_purchases(self) -> List[dict]:
        # Order by created_at descending to show latest first
        result = self.client.table("purchases").select("*").order("created_at", desc=True).execute()
        purchases = result.data or []
        for purchase in purchases:
            items_result = self.client.table("purchase_items").select("*").eq("purchase_id", purchase["id"]).execute()
            purchase["items"] = items_result.data or []
        return purchases
    
    def create_purchase(self, data: dict, items: List[dict]) -> dict:
        from datetime import datetime
        import uuid
        import time
        
        print(f"[Supabase] create_purchase start: supplier={data.get('supplier_name')}, items={len(items)}")
        start_time = time.time()
        
        purchase_id = str(uuid.uuid4())
        total_amount = sum(item["quantity"] * item["unit_price"] for item in items)
        
        # Get warehouse info if provided
        warehouse_id = data.get("warehouse_id")
        warehouse_name = None
        if warehouse_id:
            warehouse = self.get_warehouse(warehouse_id)
            if warehouse:
                warehouse_name = warehouse.get("name")
            else:
                # Fallback to default if warehouse not found
                default_warehouse = self.client.table("warehouses").select("*").eq("name", "Main Warehouse").limit(1).execute()
                if default_warehouse.data:
                    warehouse_id = default_warehouse.data[0]["id"]
                    warehouse_name = "Main Warehouse"
        
        # Create purchase record
        purchase_data = {
            "id": purchase_id,
            "supplier_name": data["supplier_name"],
            "invoice_number": data["invoice_number"],
            "warehouse_id": warehouse_id,
            "warehouse_name": warehouse_name or "Main Warehouse",
            "total_amount": total_amount,
            "notes": data.get("notes"),
            "created_at": datetime.now().isoformat()
        }
        print(f"[Supabase] Inserting purchase: {purchase_data}")
        purchase_result = self.client.table("purchases").insert(purchase_data).execute()
        purchase = purchase_result.data[0] if purchase_result.data else purchase_data
        elapsed = time.time() - start_time
        print(f"[Supabase] Purchase inserted in {elapsed:.2f}s: id={purchase.get('id')}")
        
        # Create batches and purchase items
        purchase_items = []
        for item in items:
            product = self.get_product(item["product_id"])
            if not product:
                continue
            
            # Create batch with warehouse_id
            batch_data = {
                "product_id": item["product_id"],
                "batch_number": item["batch_number"],
                "expiry_date": item["expiry_date"] if isinstance(item["expiry_date"], str) else item["expiry_date"].isoformat(),
                "quantity": item["quantity"],
                "purchase_price": item["unit_price"],
                "warehouse_id": warehouse_id  # Link batch to warehouse
            }
            batch = self.create_batch(batch_data)
            
            # Update warehouse_stock summary
            if warehouse_id and batch:
                self.update_warehouse_stock(warehouse_id, item["product_id"], item["quantity"])
            
            # Create purchase item
            item_total = item["quantity"] * item["unit_price"]
            purchase_item_data = {
                "id": str(uuid.uuid4()),
                "purchase_id": purchase_id,
                "product_id": item["product_id"],
                "product_name": product["name"],
                "batch_number": item["batch_number"],
                "expiry_date": batch_data["expiry_date"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "total": item_total
            }
            item_result = self.client.table("purchase_items").insert(purchase_item_data).execute()
            purchase_items.append(item_result.data[0] if item_result.data else purchase_item_data)
        
        purchase["items"] = purchase_items
        total_elapsed = time.time() - start_time
        print(f"[Supabase] create_purchase completed in {total_elapsed:.2f}s: purchase_id={purchase.get('id')}, items={len(purchase_items)}")
        return purchase
    
    def get_sales(self) -> List[dict]:
        result = self.client.table("sales").select("*").order("created_at", desc=True).execute()
        sales = result.data or []
        for sale in sales:
            sale["payment_status"] = PaymentStatus(sale["payment_status"]) if sale.get("payment_status") else PaymentStatus.DUE
            sale["status"] = OrderStatus(sale["status"]) if sale.get("status") else OrderStatus.PENDING
            items_result = self.client.table("sale_items").select("*").eq("sale_id", sale["id"]).execute()
            sale["items"] = items_result.data or []
        return sales
    
    def create_sale(self, data: dict, items: List[dict]) -> dict:
        from datetime import datetime
        import uuid
        
        sale_id = str(uuid.uuid4())
        retailer = self.get_retailer(data["retailer_id"])
        if not retailer:
            raise ValueError("Retailer not found")
        
        # First pass: calculate totals and validate items (without inserting)
        subtotal = 0
        total_discount = 0
        validated_items = []  # Store validated item data for later insertion
        
        for item in items:
            product = self.get_product(item["product_id"])
            batch = self.get_batch(item["batch_id"])
            if not product or not batch:
                continue
            
            item_subtotal = item["quantity"] * item["unit_price"]
            item_discount = item.get("discount", 0)
            item_total = item_subtotal - item_discount
            
            subtotal += item_subtotal
            total_discount += item_discount
            
            # Store validated item data for later insertion (after sale is created)
            validated_items.append({
                "item": item,
                "product": product,
                "batch": batch,
                "item_subtotal": item_subtotal,
                "item_discount": item_discount,
                "item_total": item_total
            })
        
        # Validate that we have at least one valid item
        if not validated_items:
            raise ValueError("No valid items found. All items must have valid product_id and batch_id.")
        
        total_amount = subtotal - total_discount
        paid_amount = data.get("paid_amount", 0)
        due_amount = total_amount - paid_amount
        
        if due_amount <= 0:
            payment_status = PaymentStatus.PAID.value
        elif paid_amount > 0:
            payment_status = PaymentStatus.PARTIAL.value
        else:
            payment_status = PaymentStatus.DUE.value
        
        if due_amount > 0:
            self.update_retailer_due(data["retailer_id"], due_amount)
        
        # Generate invoice number
        invoice_number = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        
        # Get assigned_to user name if assigned_to is provided
        assigned_to_name = None
        if data.get("assigned_to"):
            assigned_user = self.get_user_by_id(data["assigned_to"])
            if assigned_user:
                assigned_to_name = assigned_user.get("name")
        
        sale_data = {
            "id": sale_id,
            "invoice_number": invoice_number,
            "retailer_id": data["retailer_id"],
            "retailer_name": retailer["name"],
            "subtotal": subtotal,
            "discount": total_discount,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "due_amount": due_amount,
            "payment_status": payment_status,
            "status": OrderStatus.CONFIRMED.value,
            "notes": data.get("notes"),
            "assigned_to": data.get("assigned_to"),
            "assigned_to_name": assigned_to_name,
            "created_at": datetime.now().isoformat()
        }
        
        # Initialize variables before try block to ensure they're in scope
        actual_sale_id = None
        sale = None
        
        # CRITICAL: Insert sale record FIRST before inserting sale_items
        try:
            sale_result = self.client.table("sales").insert(sale_data).execute()
            
            # CRITICAL: Verify the sale was actually created in the database
            if not sale_result.data or len(sale_result.data) == 0:
                error_detail = f"Sale insert returned no data. sale_id={sale_id}, invoice={invoice_number}"
                print(f"[Supabase] ERROR: {error_detail}")
                raise ValueError(f"Failed to create sale: {error_detail}")
            
            sale = sale_result.data[0]
            # Use the actual sale_id from the database response
            actual_sale_id = sale.get("id")
            
            if not actual_sale_id:
                error_detail = f"Sale insert returned data but no id field. sale_id={sale_id}"
                print(f"[Supabase] ERROR: {error_detail}")
                raise ValueError(f"Failed to create sale: {error_detail}")
            
            # Double-check: Verify the sale exists in the database before inserting sale_items
            verify_result = self.client.table("sales").select("id").eq("id", actual_sale_id).execute()
            if not verify_result.data or len(verify_result.data) == 0:
                error_detail = f"Sale not found in database after insert. sale_id={actual_sale_id}"
                print(f"[Supabase] ERROR: {error_detail}")
                raise ValueError(f"Failed to create sale: {error_detail}")
            
            print(f"[Supabase] Sale created successfully: sale_id={actual_sale_id}, invoice={invoice_number}")
        except ValueError:
            raise
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"[Supabase] ERROR creating sale ({error_type}): {error_msg}, sale_id={sale_id}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Failed to create sale record: {error_type}: {error_msg}")
        
        # Verify variables are set before proceeding
        if not actual_sale_id or not sale:
            raise ValueError(f"Sale creation failed: sale_id or sale object not set. actual_sale_id={actual_sale_id}")
        
        # Now insert sale_items using the verified actual_sale_id from database
        sale_items = []
        for validated in validated_items:
            item = validated["item"]
            product = validated["product"]
            batch = validated["batch"]
            
            # Update batch quantity
            self.update_batch_quantity(item["batch_id"], -item["quantity"])
            
            # Create sale item
            sale_item_data = {
                "id": str(uuid.uuid4()),
                "sale_id": actual_sale_id,  # Use the verified sale_id from database
                "product_id": item["product_id"],
                "product_name": product["name"],
                "batch_number": batch["batch_number"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "discount": validated["item_discount"],
                "total": validated["item_total"]
            }
            try:
                item_result = self.client.table("sale_items").insert(sale_item_data).execute()
                if not item_result.data or len(item_result.data) == 0:
                    error_detail = f"Sale item insert returned no data. sale_id={actual_sale_id}, product_id={item['product_id']}"
                    print(f"[Supabase] ERROR: {error_detail}")
                    raise ValueError(f"Failed to create sale_item: {error_detail}")
                sale_items.append(item_result.data[0])
            except Exception as e:
                error_msg = str(e)
                error_type = type(e).__name__
                print(f"[Supabase] ERROR creating sale_item ({error_type}): {error_msg}, sale_id={actual_sale_id}, product_id={item['product_id']}")
                import traceback
                traceback.print_exc()
                # If sale_items insertion fails, raise error to prevent partial data
                raise ValueError(f"Failed to create sale_item for product {item['product_id']}: {error_type}: {error_msg}")
        
        sale["items"] = sale_items
        return sale
    
    def get_sale(self, sale_id: str) -> Optional[dict]:
        result = self.client.table("sales").select("*").eq("id", sale_id).execute()
        if result.data:
            sale = result.data[0]
            sale["payment_status"] = PaymentStatus(sale["payment_status"]) if sale.get("payment_status") else PaymentStatus.DUE
            sale["status"] = OrderStatus(sale["status"]) if sale.get("status") else OrderStatus.PENDING
            items_result = self.client.table("sale_items").select("*").eq("sale_id", sale_id).execute()
            sale["items"] = items_result.data or []
            return sale
        return None
    
    def delete_sale(self, sale_id: str) -> bool:
        """Delete a sale and its related data (returns, return items, sale items, sale)"""
        try:
            # Step 1: Get all sale_items for this sale
            sale_items_result = self.client.table("sale_items").select("id").eq("sale_id", sale_id).execute()
            sale_item_ids = [item["id"] for item in sale_items_result.data] if sale_items_result.data else []
            
            # Step 2: Delete sales_return_items that reference these sale_items
            if sale_item_ids:
                for sale_item_id in sale_item_ids:
                    # Delete return items that reference this sale_item
                    self.client.table("sales_return_items").delete().eq("sale_item_id", sale_item_id).execute()
            
            # Step 3: Delete sales_returns for this sale (if any remain)
            self.client.table("sales_returns").delete().eq("sale_id", sale_id).execute()
            
            # Step 4: Delete sale_items
            self.client.table("sale_items").delete().eq("sale_id", sale_id).execute()
            
            # Step 5: Delete payments for this sale
            self.client.table("payments").delete().eq("sale_id", sale_id).execute()
            
            # Step 6: Finally delete the sale
            result = self.client.table("sales").delete().eq("id", sale_id).execute()
            return len(result.data) > 0
        except Exception as e:
            print(f"[DB] Error deleting sale {sale_id}: {e}")
            raise

    def update_sale(self, sale_id: str, data: dict) -> Optional[dict]:
        """
        Update sale invoice manually (admin only).
        Handles payment amount updates, delivery status, and automatic calculations.
        
        Args:
            sale_id: Sale ID to update
            data: Update data containing:
                - delivery_status: Optional delivery status
                - paid_amount: Optional paid amount (will auto-calculate due_amount)
                - due_amount: Optional due amount (if not provided, calculated from paid_amount)
                - payment_status: Optional payment status (if not provided, auto-calculated)
                - delivered_at: Optional delivery timestamp
                - notes: Optional notes
        
        Returns:
            Updated sale record or None if not found
        """
        from datetime import datetime
        
        # Fetch current sale data
        current_sale = self.get_sale(sale_id)
        if not current_sale:
            return None
        
        total_amount = float(current_sale.get("total_amount", 0))
        current_paid = float(current_sale.get("paid_amount", 0))
        current_due = float(current_sale.get("due_amount", 0))
        retailer_id = current_sale.get("retailer_id")
        
        # Prepare update data
        update_data = {}
        paid_amount_changed = False
        old_paid = current_paid
        
        # Handle paid_amount update (auto-calculate due_amount and payment_status)
        if "paid_amount" in data and data["paid_amount"] is not None:
            new_paid = float(data["paid_amount"])
            if new_paid != current_paid:
                paid_amount_changed = True
                update_data["paid_amount"] = new_paid
                
                # Auto-calculate due_amount
                new_due = max(0, total_amount - new_paid)  # Ensure non-negative
                update_data["due_amount"] = new_due
                
                # Auto-calculate payment_status
                if new_due <= 0:
                    update_data["payment_status"] = PaymentStatus.PAID.value
                elif new_paid > 0:
                    update_data["payment_status"] = PaymentStatus.PARTIAL.value
                else:
                    update_data["payment_status"] = PaymentStatus.DUE.value
        
        # Handle due_amount update (if provided explicitly, override auto-calculation)
        if "due_amount" in data and data["due_amount"] is not None:
            new_due = max(0, float(data["due_amount"]))  # Ensure non-negative
            update_data["due_amount"] = new_due
            
            # Recalculate payment_status based on due_amount
            current_paid_for_status = update_data.get("paid_amount", current_paid)
            if new_due <= 0:
                update_data["payment_status"] = PaymentStatus.PAID.value
            elif current_paid_for_status > 0:
                update_data["payment_status"] = PaymentStatus.PARTIAL.value
            else:
                update_data["payment_status"] = PaymentStatus.DUE.value
        
        # Handle payment_status (if provided explicitly, override auto-calculation)
        if "payment_status" in data and data["payment_status"] is not None:
            if isinstance(data["payment_status"], PaymentStatus):
                update_data["payment_status"] = data["payment_status"].value
            else:
                update_data["payment_status"] = data["payment_status"]
        
        # Handle delivery_status
        if "delivery_status" in data and data["delivery_status"] is not None:
            update_data["delivery_status"] = data["delivery_status"]
            
            # Auto-set delivered_at if delivery_status is "delivered" and delivered_at not provided
            if data["delivery_status"] == "delivered" and "delivered_at" not in data:
                if not current_sale.get("delivered_at"):
                    update_data["delivered_at"] = datetime.now().isoformat()
        
        # Handle delivered_at
        if "delivered_at" in data and data["delivered_at"] is not None:
            if isinstance(data["delivered_at"], datetime):
                update_data["delivered_at"] = data["delivered_at"].isoformat()
            else:
                update_data["delivered_at"] = data["delivered_at"]
        
        # Handle notes
        if "notes" in data:
            update_data["notes"] = data["notes"]
        
        # Handle assigned_to update
        if "assigned_to" in data:
            assigned_to = data["assigned_to"]
            update_data["assigned_to"] = assigned_to
            # Get assigned user name
            assigned_to_name = None
            if assigned_to:
                assigned_user = self.get_user_by_id(assigned_to)
                if assigned_user:
                    assigned_to_name = assigned_user.get("name")
            update_data["assigned_to_name"] = assigned_to_name
        
        # Update retailer due amount if paid_amount changed
        if paid_amount_changed and retailer_id:
            paid_difference = update_data["paid_amount"] - old_paid
            # If paid amount increased, reduce retailer due
            # If paid amount decreased, increase retailer due
            self.update_retailer_due(retailer_id, -paid_difference)
        
        # Update sale in database
        if update_data:
            result = self.client.table("sales").update(update_data).eq("id", sale_id).execute()
            if result.data:
                updated_sale = result.data[0]
                # Convert payment_status to enum if needed
                if "payment_status" in updated_sale:
                    updated_sale["payment_status"] = PaymentStatus(updated_sale["payment_status"])
                return updated_sale
        
        return current_sale
    
    def get_sale_returns(self, sale_id: str) -> List[dict]:
        """Get all returns for a specific sale"""
        result = self.client.table("sales_returns").select("*").eq("sale_id", sale_id).order("created_at", desc=True).execute()
        returns = result.data or []
        for return_record in returns:
            items_result = self.client.table("sales_return_items").select("*").eq("return_id", return_record["id"]).execute()
            return_record["items"] = items_result.data or []
        return returns
    
    def get_sales_report(self, from_date: Optional[str] = None, to_date: Optional[str] = None) -> tuple[List[dict], dict]:
        """
        Get sales report with return aggregation.
        Returns (sales_with_returns, summary_totals)
        """
        # Build date filter for sales
        sales_query = self.client.table("sales").select("*")
        if from_date:
            sales_query = sales_query.gte("created_at", from_date)
        if to_date:
            # Add one day to include the end date
            end_datetime = datetime.fromisoformat(to_date.replace('Z', '+00:00')) + timedelta(days=1)
            sales_query = sales_query.lt("created_at", end_datetime.isoformat())
        
        sales_query = sales_query.order("created_at", desc=True)
        sales_result = sales_query.execute()
        sales = sales_result.data or []
        
        # Get all sale IDs for return aggregation
        sale_ids = [sale["id"] for sale in sales] if sales else []
        
        # Get all returns for these sales in one query
        returns_by_sale = {}
        total_returns = 0.0
        sales_with_returns_count = 0
        all_returns = []  # Define outside if block for later use
        
        if sale_ids:
            # Supabase doesn't support IN with list, so we'll need to query returns differently
            # Get all returns where sale_id is in our list
            # Since Supabase Python client doesn't support array filters easily, we'll fetch all returns
            # and filter in Python (for small datasets this is fine)
            returns_result = self.client.table("sales_returns").select("*").execute()
            all_returns = returns_result.data or []
            
            # Filter returns for our sales and aggregate
            for ret in all_returns:
                ret_sale_id = ret.get("sale_id")
                if ret_sale_id in sale_ids:
                    if ret_sale_id not in returns_by_sale:
                        returns_by_sale[ret_sale_id] = []
                    returns_by_sale[ret_sale_id].append(ret)
                    total_returns += float(ret.get("total_return_amount", 0))
            
            sales_with_returns_count = len(returns_by_sale)
        
        # Get all return items for these sales to calculate returned quantities
        return_items_by_sale = {}
        if sale_ids and all_returns:
            # Get all return items
            return_items_result = self.client.table("sales_return_items").select("*").execute()
            all_return_items = return_items_result.data or []
            
            # Create a mapping of return_id -> sale_id for quick lookup
            return_to_sale_map = {ret["id"]: ret.get("sale_id") for ret in all_returns if ret.get("sale_id") in sale_ids}
            
            # Group return items by sale_id
            for ret_item in all_return_items:
                return_id = ret_item.get("return_id")
                sale_id = return_to_sale_map.get(return_id)
                if sale_id:
                    if sale_id not in return_items_by_sale:
                        return_items_by_sale[sale_id] = []
                    return_items_by_sale[sale_id].append(ret_item)
        
        # Build sales report with return data
        # For sales in routes, use route's SR (Route SR overrides Sales SR)
        # Get route info for sales that have route_id (PERFORMANCE: Fetch all routes in ONE query)
        route_ids = set(sale.get("route_id") for sale in sales if sale.get("route_id"))
        routes_map = {}
        if route_ids:
            # Fetch all routes in a single query instead of N queries (N+1 problem fix)
            route_ids_list = list(route_ids)
            routes_result = self.client.table("routes").select("id,assigned_to,assigned_to_name").in_("id", route_ids_list).execute()
            for route in (routes_result.data or []):
                routes_map[route["id"]] = {
                    "assigned_to": route.get("assigned_to"),
                    "assigned_to_name": route.get("assigned_to_name")
                }
        
        sales_report = []
        total_gross = 0.0
        total_returned_items = 0
        
        for sale in sales:
            sale_id = sale["id"]
            sale["payment_status"] = PaymentStatus(sale["payment_status"]) if sale.get("payment_status") else PaymentStatus.DUE
            sale["status"] = OrderStatus(sale["status"]) if sale.get("status") else OrderStatus.PENDING
            
            # If sale is in a route, use route's SR for reporting (Route SR overrides Sales SR)
            route_id = sale.get("route_id")
            if route_id and route_id in routes_map:
                route_info = routes_map[route_id]
                sale["effective_assigned_to"] = route_info["assigned_to"]  # Route's SR
                sale["effective_assigned_to_name"] = route_info["assigned_to_name"]
            else:
                # Sale not in route, use sale's SR
                sale["effective_assigned_to"] = sale.get("assigned_to")
                sale["effective_assigned_to_name"] = sale.get("assigned_to_name")
            
            # Get sale items
            items_result = self.client.table("sale_items").select("*").eq("sale_id", sale_id).execute()
            sale["items"] = items_result.data or []
            
            # Calculate total items quantity
            total_items_qty = sum(int(item.get("quantity", 0)) for item in sale["items"])
            
            # Calculate return totals for this sale
            sale_returns = returns_by_sale.get(sale_id, [])
            returned_total = sum(float(r.get("total_return_amount", 0)) for r in sale_returns)
            
            # Calculate returned items quantity
            sale_return_items = return_items_by_sale.get(sale_id, [])
            returned_qty = sum(int(item.get("quantity_returned", 0)) for item in sale_return_items)
            
            # Calculate net items (total - returned)
            net_items_qty = max(0, total_items_qty - returned_qty)
            
            gross_total = float(sale.get("total_amount", 0))
            net_total = gross_total - returned_total
            
            # Calculate adjusted due amount (net_total - paid_amount)
            # Original due_amount is gross_total - paid_amount, but after returns it should be net_total - paid_amount
            paid_amount = float(sale.get("paid_amount", 0))
            adjusted_due_amount = max(0, net_total - paid_amount)
            
            # Add report fields
            sale["gross_total"] = gross_total
            sale["returned_total"] = returned_total
            sale["net_total"] = net_total
            sale["has_returns"] = len(sale_returns) > 0
            sale["return_count"] = len(sale_returns)
            sale["total_items"] = total_items_qty
            sale["returned_qty"] = returned_qty
            sale["net_items"] = net_items_qty
            # Update due_amount to reflect returns
            sale["due_amount"] = adjusted_due_amount
            
            total_gross += gross_total
            total_returned_items += returned_qty
            sales_report.append(sale)
        
        # Calculate summary totals
        total_net = total_gross - total_returns
        return_rate = (total_returns / total_gross * 100) if total_gross > 0 else 0.0
        total_items = sum(s.get("total_items", 0) for s in sales_report)
        
        summary = {
            "total_gross": total_gross,
            "total_returns": total_returns,
            "total_net": total_net,
            "return_rate": return_rate,
            "total_sales": len(sales_report),
            "sales_with_returns": sales_with_returns_count,
            "total_items": total_items,
            "total_returned_items": total_returned_items,
            "total_net_items": total_items - total_returned_items
        }
        
        return sales_report, summary
    
    def get_sales_returns_report(self, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[dict]:
        """Get sales returns report with sale invoice info"""
        # Build date filter
        returns_query = self.client.table("sales_returns").select("*")
        if from_date:
            returns_query = returns_query.gte("created_at", from_date)
        if to_date:
            # Add one day to include the end date
            end_datetime = datetime.fromisoformat(to_date.replace('Z', '+00:00')) + timedelta(days=1)
            returns_query = returns_query.lt("created_at", end_datetime.isoformat())
        
        returns_query = returns_query.order("created_at", desc=True)
        returns_result = returns_query.execute()
        returns = returns_result.data or []
        
        # Get sale invoice numbers for each return
        sale_ids = list(set([r.get("sale_id") for r in returns if r.get("sale_id")]))
        sales_map = {}
        
        if sale_ids:
            # Fetch sales to get invoice numbers
            # Since Supabase doesn't support IN easily, fetch in batches or all at once
            for sale_id in sale_ids:
                sale_result = self.client.table("sales").select("id,invoice_number").eq("id", sale_id).execute()
                if sale_result.data:
                    sale_data = sale_result.data[0]
                    sales_map[sale_id] = sale_data.get("invoice_number", "")
        
        # Build return report with invoice numbers
        returns_report = []
        for ret in returns:
            sale_id = ret.get("sale_id")
            ret["invoice_number"] = sales_map.get(sale_id, "")
            returns_report.append(ret)
        
        return returns_report
    
    def get_collection_report(self, user_id: Optional[str] = None, from_date: Optional[str] = None, to_date: Optional[str] = None) -> List[dict]:
        """
        Get collection report for SRs/delivery men.
        
        Args:
            user_id: Optional user ID to filter by specific SR. If None, returns report for all SRs.
            from_date: Optional start date filter
            to_date: Optional end date filter
        
        Returns:
            List of collection reports, one per SR
        """
        from datetime import datetime, timedelta
        
        # Get all users with role 'sales_rep' if user_id not specified
        if user_id:
            users_query = self.client.table("users").select("*").eq("id", user_id).eq("role", "sales_rep")
        else:
            users_query = self.client.table("users").select("*").eq("role", "sales_rep")
        
        users_result = users_query.execute()
        users = users_result.data or []
        
        if not users:
            return []
        
        reports = []
        
        for user in users:
            sr_id = user["id"]
            sr_name = user["name"]
            
            # Get all sales assigned to this SR
            # After Route SR override implementation, sales.assigned_to should already match route SR
            # But we also check routes to ensure completeness (handles edge cases)
            sales_query = self.client.table("sales").select("*").eq("assigned_to", sr_id)
            if from_date:
                sales_query = sales_query.gte("created_at", from_date)
            if to_date:
                end_datetime = datetime.fromisoformat(to_date.replace('Z', '+00:00')) + timedelta(days=1)
                sales_query = sales_query.lt("created_at", end_datetime.isoformat())
            
            sales_result = sales_query.execute()
            assigned_sales = sales_result.data or []
            
            # Also include sales from routes assigned to this SR (Route SR is source of truth)
            # This ensures we catch all sales that belong to this SR's routes, even if sales.assigned_to wasn't updated
            # PERFORMANCE: Batch fetch routes, route_sales, and sales instead of nested loops
            routes_result = self.client.table("routes").select("id").eq("assigned_to", sr_id).execute()
            route_ids = [r["id"] for r in (routes_result.data or [])]
            
            if route_ids:
                # Fetch all route_sales for these routes in ONE query (instead of N queries)
                route_sales_result = self.client.table("route_sales").select("sale_id").in_("route_id", route_ids).execute()
                route_sale_ids = [rs["sale_id"] for rs in (route_sales_result.data or [])]
                
                if route_sale_ids:
                    # Fetch all sales in ONE query (instead of M queries)
                    # Note: Supabase doesn't support IN with large lists directly, so we fetch all and filter
                    # For better performance with large datasets, consider pagination or chunking
                    all_sales_result = self.client.table("sales").select("*").in_("id", route_sale_ids).execute()
                    route_sales = all_sales_result.data or []
                    
                    # Filter by date and add to assigned_sales if not already included
                    for sale in route_sales:
                        sale_id = sale.get("id")
                        if not any(s.get("id") == sale_id for s in assigned_sales):
                            # Apply date filters
                            sale_date = sale.get("created_at", "")
                            if from_date and sale_date < from_date:
                                continue
                            if to_date:
                                end_datetime = datetime.fromisoformat(to_date.replace('Z', '+00:00')) + timedelta(days=1)
                                if sale_date >= end_datetime.isoformat():
                                    continue
                            assigned_sales.append(sale)
            
            # Calculate totals
            total_orders_assigned = len(assigned_sales)
            total_sales_amount = sum(float(sale.get("total_amount", 0)) for sale in assigned_sales)
            
            # Get all payments collected by this SR
            payments_query = self.client.table("payments").select("*").eq("collected_by", sr_id)
            if from_date:
                payments_query = payments_query.gte("created_at", from_date)
            if to_date:
                end_datetime = datetime.fromisoformat(to_date.replace('Z', '+00:00')) + timedelta(days=1)
                payments_query = payments_query.lt("created_at", end_datetime.isoformat())
            
            payments_result = payments_query.execute()
            payments = payments_result.data or []
            total_collected_amount = sum(float(payment.get("amount", 0)) for payment in payments)
            
            # Get returns for sales assigned to this SR
            sale_ids = [sale["id"] for sale in assigned_sales]
            total_returns = 0.0
            if sale_ids:
                # Get all returns for these sales
                for sale_id in sale_ids:
                    returns_result = self.client.table("sales_returns").select("*").eq("sale_id", sale_id).execute()
                    returns = returns_result.data or []
                    for ret in returns:
                        total_returns += float(ret.get("total_return_amount", 0))
            
            # Calculate current pending amount (sum of due_amount for assigned sales)
            current_pending_amount = sum(float(sale.get("due_amount", 0)) for sale in assigned_sales)
            
            # Calculate collection rate
            net_sales = total_sales_amount - total_returns
            if net_sales > 0:
                collection_rate = (total_collected_amount / net_sales) * 100
            else:
                collection_rate = 0.0
            
            # Format payment history
            payment_history = []
            for payment in payments:
                payment_history.append({
                    "id": payment.get("id"),
                    "sale_id": payment.get("sale_id"),
                    "amount": float(payment.get("amount", 0)),
                    "payment_method": payment.get("payment_method"),
                    "collected_by_name": payment.get("collected_by_name"),
                    "created_at": payment.get("created_at"),
                    "notes": payment.get("notes")
                })
            
            reports.append({
                "user_id": sr_id,
                "user_name": sr_name,
                "total_orders_assigned": total_orders_assigned,
                "total_sales_amount": total_sales_amount,
                "total_collected_amount": total_collected_amount,
                "total_returns": total_returns,
                "current_pending_amount": current_pending_amount,
                "collection_rate": round(collection_rate, 2),
                "payment_history": payment_history
            })
        
        return reports
    
    def create_sale_return(self, sale_id: str, data: dict, items: List[dict], user_id: Optional[str] = None) -> dict:
        """
        Create a sales return transaction.
        
        Business Rules:
        1. Validates return quantity <= (original - already returned)
        2. Increments inventory batch quantities
        3. Reduces retailer due amount (if adjust_due)
        4. Creates immutable return records (audit trail)
        
        Args:
            sale_id: Original sale ID
            data: Return metadata (reason, refund_type)
            items: List of items being returned
            user_id: Optional user ID creating the return
        
        Returns:
            Created return record with items
        """
        from datetime import datetime
        import uuid
        
        # Fetch original sale
        sale = self.get_sale(sale_id)
        if not sale:
            raise ValueError(f"Sale not found: {sale_id}")
        
        # Fetch all sale items for validation
        sale_items_map = {item["id"]: item for item in sale.get("items", [])}
        if not sale_items_map:
            raise ValueError(f"Sale has no items: {sale_id}")
        
        # Calculate already returned quantities per sale_item
        existing_returns = self.get_sale_returns(sale_id)
        already_returned = {}
        for ret in existing_returns:
            for ret_item in ret.get("items", []):
                sale_item_id = ret_item.get("sale_item_id")
                if sale_item_id:
                    already_returned[sale_item_id] = already_returned.get(sale_item_id, 0) + ret_item.get("quantity_returned", 0)
        
        # Validation and preparation phase
        validated_items = []
        total_return_amount = 0
        
        for item in items:
            sale_item_id = item.get("sale_item_id")
            quantity_returned = item.get("quantity_returned", 0)
            
            if not sale_item_id:
                raise ValueError("sale_item_id is required for each return item")
            
            if quantity_returned <= 0:
                raise ValueError(f"quantity_returned must be > 0 for sale_item_id: {sale_item_id}")
            
            # Get original sale item
            original_item = sale_items_map.get(sale_item_id)
            if not original_item:
                raise ValueError(f"Sale item not found: {sale_item_id}")
            
            # Calculate already returned for this item
            already_returned_qty = already_returned.get(sale_item_id, 0)
            original_qty = original_item.get("quantity", 0)
            
            # Validate return quantity
            if quantity_returned > (original_qty - already_returned_qty):
                raise ValueError(
                    f"Cannot return {quantity_returned} items. "
                    f"Original: {original_qty}, Already returned: {already_returned_qty}, "
                    f"Max allowed: {original_qty - already_returned_qty}"
                )
            
            # Get product and batch information
            product = self.get_product(original_item.get("product_id"))
            if not product:
                raise ValueError(f"Product not found: {original_item.get('product_id')}")
            
            # Find or use batch_id
            batch_id = item.get("batch_id")
            if not batch_id:
                # Try to find batch by batch_number
                batch_number = original_item.get("batch_number")
                if batch_number:
                    batches = self.get_batches_by_product(original_item.get("product_id"))
                    matching_batch = next((b for b in batches if b.get("batch_number") == batch_number), None)
                    if matching_batch:
                        batch_id = matching_batch.get("id")
            
            if not batch_id:
                raise ValueError(f"Batch not found for product {product.get('name')}. Please specify batch_id.")
            
            batch = self.get_batch(batch_id)
            if not batch:
                raise ValueError(f"Batch not found: {batch_id}")
            
            # Calculate return amount (proportional to original)
            unit_price = original_item.get("unit_price", 0)
            discount = original_item.get("discount", 0)
            original_total = original_item.get("total", 0)
            
            # Calculate proportional return amount
            if original_qty > 0:
                unit_return_value = original_total / original_qty
                item_return_amount = quantity_returned * unit_return_value
            else:
                item_return_amount = 0
            
            total_return_amount += item_return_amount
            
            validated_items.append({
                "sale_item_id": sale_item_id,
                "product": product,
                "batch": batch,
                "batch_id": batch_id,
                "quantity_returned": quantity_returned,
                "unit_price": unit_price,
                "discount": discount,
                "item_return_amount": item_return_amount,
                "original_item": original_item
            })
        
        if not validated_items:
            raise ValueError("No valid items to return")
        
        # Generate return number
        return_number = f"RET-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        
        # Create return record
        refund_type = data.get("refund_type", "adjust_due")
        return_data = {
            "id": str(uuid.uuid4()),
            "return_number": return_number,
            "sale_id": sale_id,
            "retailer_id": sale.get("retailer_id"),
            "retailer_name": sale.get("retailer_name"),
            "total_return_amount": total_return_amount,
            "reason": data.get("reason"),
            "refund_type": refund_type,
            "status": "completed",
            "created_by": user_id,
            "created_at": datetime.now().isoformat()
        }
        
        # CRITICAL: Transaction-like behavior (all-or-nothing)
        try:
            # Insert return record
            return_result = self.client.table("sales_returns").insert(return_data).execute()
            if not return_result.data or len(return_result.data) == 0:
                raise ValueError(f"Failed to create return record. return_number={return_number}")
            
            return_record = return_result.data[0]
            return_id = return_record.get("id")
            
            # Insert return items and update inventory
            return_items = []
            for validated in validated_items:
                # Increment batch quantity (restore inventory)
                self.update_batch_quantity(validated["batch_id"], validated["quantity_returned"])
                
                # Create return item record
                return_item_data = {
                    "id": str(uuid.uuid4()),
                    "return_id": return_id,
                    "sale_item_id": validated["sale_item_id"],
                    "product_id": validated["product"].get("id"),
                    "product_name": validated["product"].get("name"),
                    "batch_number": validated["batch"].get("batch_number"),
                    "batch_id": validated["batch_id"],
                    "quantity_returned": validated["quantity_returned"],
                    "unit_price": validated["unit_price"],
                    "discount": validated["discount"],
                    "total_returned": validated["item_return_amount"],
                    "created_at": datetime.now().isoformat()
                }
                
                item_result = self.client.table("sales_return_items").insert(return_item_data).execute()
                if not item_result.data or len(item_result.data) == 0:
                    raise ValueError(f"Failed to create return item. return_id={return_id}")
                
                return_items.append(item_result.data[0])
            
            # Reduce retailer due (if adjust_due)
            if refund_type == "adjust_due":
                retailer_id = sale.get("retailer_id")
                self.update_retailer_due(retailer_id, -total_return_amount)
            
            # CRITICAL: Recalculate original sale payment status after return
            # This ensures invoice reflects actual delivered amount and payment status
            original_total = float(sale.get("total_amount", 0))
            original_paid = float(sale.get("paid_amount", 0))
            
            # Calculate new totals after return
            new_total_amount = original_total - total_return_amount
            new_due_amount = new_total_amount - original_paid
            
            # Recalculate payment status based on new amounts
            if new_due_amount <= 0:
                new_payment_status = PaymentStatus.PAID.value
            elif original_paid > 0:
                new_payment_status = PaymentStatus.PARTIAL.value
            else:
                new_payment_status = PaymentStatus.DUE.value
            
            # Update original sale with recalculated amounts
            self.client.table("sales").update({
                "total_amount": new_total_amount,
                "due_amount": max(0, new_due_amount),  # Ensure non-negative
                "payment_status": new_payment_status
            }).eq("id", sale_id).execute()
            
            print(f"[Supabase] Updated original sale payment status: sale_id={sale_id}, "
                  f"original_total={original_total}, return_amount={total_return_amount}, "
                  f"new_total={new_total_amount}, new_due={new_due_amount}, "
                  f"new_payment_status={new_payment_status}")
            
            return_record["items"] = return_items
            
            print(f"[Supabase] Sale return created: return_id={return_id}, return_number={return_number}, amount={total_return_amount}")
            return return_record
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"[Supabase] ERROR creating sale return ({error_type}): {error_msg}, sale_id={sale_id}")
            import traceback
            traceback.print_exc()
            raise ValueError(f"Failed to create sale return: {error_type}: {error_msg}")
    
    def get_payments(self) -> List[dict]:
        result = self.client.table("payments").select("*").order("created_at", desc=True).execute()
        return result.data or []
    
    def create_payment(self, data: dict) -> dict:
        retailer = self.get_retailer(data["retailer_id"])
        if not retailer:
            raise ValueError("Retailer not found")
        
        self.update_retailer_due(data["retailer_id"], -data["amount"])
        
        # DATA ATTACHMENT FIX: Get route_id from sale if sale is in a route
        # Note: Payments created before 2026-01-13 may have route_id = NULL and need backfill
        # See: 20260113000001_backfill_payment_route_id.sql
        route_id = None
        if data.get("sale_id"):
            # #region agent log
            log_data = {
                "location": "supabase_db.py:create_payment:fetching_sale",
                "message": "Fetching sale to get route_id",
                "data": {"sale_id": data.get("sale_id")},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            sale = self.get_sale(data["sale_id"])
            if sale:
                # Get route_id from sale (if sale is in a route)
                route_id = sale.get("route_id")
                
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:create_payment:sale_route_id",
                    "message": "Sale route_id retrieved",
                    "data": {
                        "sale_id": data.get("sale_id"),
                        "sale_route_id": route_id,
                        "sale_assigned_to": sale.get("assigned_to")
                    },
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                
                # Get current values as floats to ensure proper calculation
                current_paid = float(sale.get("paid_amount", 0))
                current_due = float(sale.get("due_amount", 0))
                payment_amount = float(data["amount"])
                
                new_paid = current_paid + payment_amount
                new_due = max(0, current_due - payment_amount)  # Ensure non-negative
                payment_status = "paid" if new_due <= 0.01 else "partial"  # Use small threshold for float comparison
                
                # Update payment amounts only (delivery_status will be updated manually by admin)
                update_data = {
                    "paid_amount": new_paid,
                    "due_amount": new_due,
                    "payment_status": payment_status
                }
                
                print(f"[DB] Updating sale {data['sale_id']}: paid={current_paid} -> {new_paid}, due={current_due} -> {new_due}, status={payment_status}")
                if route_id:
                    print(f"[DB] Payment is for sale in route: {route_id}")
                
                # DO NOT update delivery_status automatically - admin will update manually
                result = self.client.table("sales").update(update_data).eq("id", data["sale_id"]).execute()
                if not result.data:
                    print(f"[DB] Warning: Sale update returned no data for sale_id={data['sale_id']}")
                else:
                    print(f"[DB] Sale updated successfully: {result.data[0].get('invoice_number')}")
        
        # Get collected_by user name if collected_by is provided
        collected_by_name = None
        if data.get("collected_by"):
            collected_user = self.get_user_by_id(data["collected_by"])
            if collected_user:
                collected_by_name = collected_user.get("name")
                # IMPORTANT: Cash holding is updated during reconciliation, NOT during individual payments
                # Individual payments are just records. Reconciliation is the source of truth for SR cash holdings.
                # DO NOT call update_sr_cash_holding() here - it should only be called during reconciliation.
        
        # #region agent log
        import json
        log_data = {
            "location": "supabase_db.py:create_payment:before_insert",
            "message": "Creating payment with route_id",
            "data": {
                "sale_id": data.get("sale_id"),
                "route_id": route_id,
                "collected_by": data.get("collected_by"),
                "amount": data.get("amount")
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        payment_data = {
            "retailer_id": data["retailer_id"],
            "retailer_name": retailer["name"],
            "sale_id": data.get("sale_id"),
            "route_id": route_id,  # DATA ATTACHMENT FIX: Set route_id from sale.route_id
            "amount": data["amount"],
            "payment_method": data["payment_method"],
            "notes": data.get("notes"),
            "collected_by": data.get("collected_by"),
            "collected_by_name": collected_by_name
        }
        result = self.client.table("payments").insert(payment_data).execute()
        
        # #region agent log
        inserted_payment = result.data[0] if result.data else payment_data
        log_data = {
            "location": "supabase_db.py:create_payment:after_insert",
            "message": "Payment created",
            "data": {
                "payment_id": inserted_payment.get("id"),
                "sale_id": inserted_payment.get("sale_id"),
                "route_id": inserted_payment.get("route_id"),
                "collected_by": inserted_payment.get("collected_by"),
                "amount": inserted_payment.get("amount")
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        return inserted_payment
    
    def get_inventory(self) -> List[InventoryItem]:
        inventory = []
        products = self.get_products()
        for product in products:
            batches = self.get_batches_by_product(product["id"])
            total_stock = sum(b["quantity"] for b in batches)
            batch_objects = []
            for b in batches:
                if isinstance(b.get("expiry_date"), str):
                    b["expiry_date"] = date.fromisoformat(b["expiry_date"])
                batch_objects.append(ProductBatch(**b))
            inventory.append(InventoryItem(
                product_id=product["id"],
                product_name=product["name"],
                sku=product["sku"],
                category=product["category"],
                total_stock=total_stock,
                batches=batch_objects
            ))
        return inventory
    
    def get_expiry_alerts(self) -> List[ExpiryAlert]:
        alerts = []
        today = date.today()
        products = self.get_products()
        
        for product in products:
            batches = self.get_batches_by_product(product["id"])
            for batch in batches:
                if batch["quantity"] <= 0:
                    continue
                
                expiry_date = batch["expiry_date"]
                if isinstance(expiry_date, str):
                    expiry_date = date.fromisoformat(expiry_date)
                
                days_until_expiry = (expiry_date - today).days
                
                if days_until_expiry < 0:
                    status = ExpiryStatus.EXPIRED
                elif days_until_expiry <= 30:
                    status = ExpiryStatus.CRITICAL
                elif days_until_expiry <= 60:
                    status = ExpiryStatus.WARNING
                else:
                    status = ExpiryStatus.SAFE
                
                if status != ExpiryStatus.SAFE:
                    alerts.append(ExpiryAlert(
                        id=batch["id"],
                        product_id=batch["product_id"],
                        product_name=product["name"],
                        sku=product.get("sku", ""),
                        batch_number=batch["batch_number"],
                        expiry_date=expiry_date,
                        quantity=batch["quantity"],
                        days_until_expiry=days_until_expiry,
                        status=status
                    ))
        
        return sorted(alerts, key=lambda x: x.days_until_expiry)
    
    def get_dashboard_stats(self) -> DashboardStats:
        """
        Calculate dashboard statistics by aggregating data from multiple tables.
        
        Returns:
            DashboardStats: Aggregated statistics including:
            - total_products, total_categories, total_purchases
            - total_sales, receivable_from_customers, payable_to_supplier
            - low_stock_count, expiring_soon_count
            - active_retailers, sales_this_month, collections_this_month
        """
        print("[Supabase] get_dashboard_stats: Starting aggregation...")
        
        # Fetch all required data
        sales = self.get_sales()
        retailers = self.get_retailers()
        products = self.get_products()
        categories = self.get_categories()
        purchases = self.get_purchases()
        suppliers = self.get_suppliers()
        payments = self.get_payments()
        inventory = self.get_inventory()
        expiry_alerts = self.get_expiry_alerts()
        
        # Basic counts
        total_products = len(products)
        total_categories = len(categories)
        total_purchases = len(purchases)
        active_retailers = len(retailers)
        
        # Financial metrics
        total_sales = sum(float(s.get("total_amount", 0)) for s in sales)
        receivable_from_customers = sum(float(r.get("total_due", 0)) for r in retailers)
        
        # Payable to suppliers (sum of supplier dues if they have a due field)
        # If suppliers don't have a due field, calculate from purchases
        payable_to_supplier = 0.0
        for supplier in suppliers:
            # Check if supplier has a due/payable field
            supplier_due = supplier.get("total_due") or supplier.get("payable") or supplier.get("due_amount") or 0
            payable_to_supplier += float(supplier_due)
        
        # If no supplier due field, calculate from unpaid purchases
        if payable_to_supplier == 0:
            for purchase in purchases:
                # Check if purchase is unpaid (simplified: assume all purchases are payable)
                # In production, you'd check payment_status
                purchase_total = float(purchase.get("total_amount", 0))
                paid_amount = float(purchase.get("paid_amount", 0))
                payable_to_supplier += max(0, purchase_total - paid_amount)
        
        # Stock metrics
        low_stock_count = 0
        for inv_item in inventory:
            # Consider low stock if total_stock < 50 (threshold can be configurable)
            if inv_item.total_stock < 50:
                low_stock_count += 1
        
        # Expiring soon count (within 30 days)
        expiring_soon_count = 0
        today = date.today()
        for alert in expiry_alerts:
            if alert.status == ExpiryStatus.CRITICAL and alert.days_until_expiry >= 0:
                expiring_soon_count += 1
        
        # Monthly metrics
        this_month = datetime.now().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        sales_this_month = 0
        for s in sales:
            created_at = s.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if created_at and created_at.replace(tzinfo=None) >= this_month:
                sales_this_month += float(s.get("total_amount", 0))
        
        collections_this_month = 0
        for p in payments:
            created_at = p.get("created_at")
            if isinstance(created_at, str):
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            if created_at and created_at.replace(tzinfo=None) >= this_month:
                collections_this_month += float(p.get("amount", 0))
        
        # Legacy field for backward compatibility
        total_due = receivable_from_customers
        
        print(f"[Supabase] get_dashboard_stats: Calculated stats - "
              f"products={total_products}, categories={total_categories}, "
              f"purchases={total_purchases}, sales={total_sales:.2f}, "
              f"low_stock={low_stock_count}, expiring={expiring_soon_count}")
        
        return DashboardStats(
            total_sales=total_sales,
            total_due=total_due,  # Legacy field
            total_products=total_products,
            total_categories=total_categories,
            total_purchases=total_purchases,
            active_retailers=active_retailers,
            low_stock_count=low_stock_count,
            expiring_soon_count=expiring_soon_count,
            payable_to_supplier=payable_to_supplier,
            receivable_from_customers=receivable_from_customers,
            sales_this_month=sales_this_month,
            collections_this_month=collections_this_month
        )
    
    def get_receivables(self) -> List[dict]:
        receivables = []
        retailers = self.get_retailers()
        payments = self.get_payments()
        
        for retailer in retailers:
            if float(retailer.get("total_due", 0)) > 0:
                last_payment = None
                for payment in payments:
                    if payment["retailer_id"] == retailer["id"]:
                        payment_date = payment.get("created_at")
                        if isinstance(payment_date, str):
                            payment_date = datetime.fromisoformat(payment_date.replace("Z", "+00:00"))
                        if last_payment is None or (payment_date and payment_date > last_payment):
                            last_payment = payment_date
                
                receivables.append({
                    "retailer_id": retailer["id"],
                    "retailer_name": retailer["name"],
                    "shop_name": retailer["shop_name"],
                    "phone": retailer["phone"],
                    "area": retailer["area"],
                    "total_due": retailer["total_due"],
                    "credit_limit": retailer["credit_limit"],
                    "last_payment_date": last_payment
                })
        
        return sorted(receivables, key=lambda x: x["total_due"], reverse=True)
    
    # Category methods
    def get_categories(self) -> List[dict]:
        try:
            result = self.client.table("categories").select("*").execute()
            categories = result.data or []
            # Calculate product_count for each category
            products = self.get_products()
            for category in categories:
                category["product_count"] = sum(1 for p in products if p.get("category") == category.get("name"))
                # Convert created_at string to datetime if needed
                created_at = category.get("created_at")
                if created_at is None:
                    category["created_at"] = datetime.now()
                elif isinstance(created_at, str):
                    try:
                        if "T" in created_at:
                            category["created_at"] = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        else:
                            category["created_at"] = datetime.now()
                    except:
                        category["created_at"] = datetime.now()
                elif not isinstance(created_at, datetime):
                    category["created_at"] = datetime.now()
            return categories
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"[Supabase] get_categories error ({error_type}): {error_msg}")
            # Check if it's a table not found error
            if "does not exist" in error_msg.lower() or "relation" in error_msg.lower():
                raise ValueError(f"Categories table does not exist in Supabase. Please run the migration SQL.")
            import traceback
            traceback.print_exc()
            raise
    
    def get_category(self, category_id: str) -> Optional[dict]:
        result = self.client.table("categories").select("*").eq("id", category_id).execute()
        if result.data:
            category = result.data[0]
            # Calculate product_count
            products = self.get_products()
            category["product_count"] = sum(1 for p in products if p.get("category") == category.get("name"))
            # Convert created_at string to datetime if needed
            if isinstance(category.get("created_at"), str):
                try:
                    category["created_at"] = datetime.fromisoformat(category["created_at"].replace("Z", "+00:00"))
                except:
                    pass
            return category
        return None
    
    def create_category(self, data: dict) -> dict:
        """
        Create a category in Supabase.
        
        Raises:
            ValueError: For validation errors (400)
            PermissionError: For RLS/permission errors (403)
            KeyError: For duplicate key errors (409)
            Exception: For unexpected errors (500)
        """
        if not self.client:
            raise ValueError("Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_KEY environment variables.")
        
        try:
            # Ensure color is set if not provided
            if "color" not in data or not data["color"]:
                data["color"] = "#4F46E5"
            
            # Remove None values and ensure created_at is NOT sent (DB generates it)
            data = {k: v for k, v in data.items() if v is not None and k != "created_at"}
            
            # Only send: name, description, color (id and created_at are DB-generated)
            insert_data = {
                "name": data.get("name"),
                "description": data.get("description"),
                "color": data.get("color", "#4F46E5")
            }
            
            print(f"[Supabase] Inserting category data: {insert_data}")
            
            # Execute Supabase insert with timing and error handling
            import time
            start_time = time.time()
            
            try:
                result = self.client.table("categories").insert(insert_data).execute()
                elapsed = time.time() - start_time
                print(f"[Supabase] Insert completed in {elapsed:.2f}s")
            except Exception as insert_error:
                elapsed = time.time() - start_time
                error_type = type(insert_error).__name__
                error_msg = str(insert_error)
                print(f"[Supabase] Insert failed after {elapsed:.2f}s ({error_type}): {error_msg}")
                import traceback
                traceback.print_exc()
                raise
            
            # Check for Supabase errors in response
            # Supabase Python client returns PostgrestResponse which has .data and potentially .error
            if hasattr(result, 'error') and result.error:
                error_msg = str(result.error)
                print(f"[Supabase] Response has error attribute: {error_msg}")
                # Check for duplicate key error (unique constraint violation)
                if "duplicate" in error_msg.lower() or "unique" in error_msg.lower() or "violates unique constraint" in error_msg.lower():
                    raise KeyError(f"Category with name '{insert_data.get('name')}' already exists")
                # Check for RLS/permission errors
                if "permission" in error_msg.lower() or "row-level security" in error_msg.lower() or "policy" in error_msg.lower():
                    raise PermissionError(f"Permission denied: {error_msg}")
                # Other Supabase errors
                raise ValueError(f"Supabase error: {error_msg}")
            
            # Check if result has data attribute
            if not hasattr(result, 'data'):
                print(f"[Supabase] Result object: {type(result)}")
                print(f"[Supabase] Result attributes: {dir(result)}")
                raise ValueError(f"Supabase response missing 'data' attribute. Response type: {type(result)}")
            
            if not result.data:
                print(f"[Supabase] result.data is empty: {result.data}")
                raise ValueError("No data returned from Supabase after insert")
            
            if not isinstance(result.data, list) or len(result.data) == 0:
                print(f"[Supabase] result.data is not a list or is empty: {result.data}")
                raise ValueError(f"Invalid data format from Supabase: expected list, got {type(result.data)}")
            
            category = result.data[0]
            print(f"[Supabase] Category inserted: {category}")
            print(f"[Supabase] Category keys: {list(category.keys()) if isinstance(category, dict) else 'not a dict'}")
            
            # Ensure all required fields are present
            category["product_count"] = 0
            
            # Handle created_at - DB should have generated it, convert to datetime
            created_at = category.get("created_at")
            if created_at is None:
                # Fallback if DB didn't generate it (shouldn't happen)
                print("[Supabase] WARNING: created_at is None, using current time")
                category["created_at"] = datetime.now()
            elif isinstance(created_at, str):
                try:
                    # Parse ISO format from Supabase
                    if "T" in created_at:
                        # Handle timezone-aware and naive formats
                        if created_at.endswith("Z"):
                            category["created_at"] = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                        elif "+" in created_at or created_at.count("-") > 2:
                            category["created_at"] = datetime.fromisoformat(created_at)
                        else:
                            category["created_at"] = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                    else:
                        category["created_at"] = datetime.now()
                except Exception as parse_error:
                    print(f"[Supabase] Failed to parse created_at '{created_at}': {parse_error}")
                    import traceback
                    traceback.print_exc()
                    category["created_at"] = datetime.now()
            elif not isinstance(created_at, datetime):
                print(f"[Supabase] created_at is not datetime: {type(created_at)}")
                category["created_at"] = datetime.now()
            
            # Ensure id is present (Supabase should return it)
            if "id" not in category:
                print(f"[Supabase] WARNING: No 'id' in category response. Keys: {list(category.keys())}")
                raise ValueError("Category created but no ID returned from Supabase")
            
            # Ensure id is a string (UUID might be returned as UUID object)
            if not isinstance(category["id"], str):
                category["id"] = str(category["id"])
            
            print(f"[Supabase] Final category data: id={category.get('id')}, name={category.get('name')}, created_at={category.get('created_at')}")
            
            # Ensure we ALWAYS return a dict - never exit silently
            if not isinstance(category, dict):
                raise ValueError(f"Category is not a dict: {type(category)}")
            if "id" not in category:
                raise ValueError("Category missing required 'id' field")
            if "name" not in category:
                raise ValueError("Category missing required 'name' field")
            if "created_at" not in category:
                raise ValueError("Category missing required 'created_at' field")
            
            print(f"[Supabase] Returning category with id={category['id']}")
            return category
        except (ValueError, KeyError, PermissionError, TimeoutError):
            # Re-raise validation/duplicate/permission/timeout errors as-is
            # These will be caught by API layer and converted to HTTP responses
            raise
        except Exception as e:
            # Catch ALL other exceptions - never exit silently
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"[Supabase] create_category unexpected error ({error_type}): {error_msg}")
            print(f"[Supabase] Data being inserted: {data}")
            import traceback
            traceback.print_exc()
            # Always raise - never return None or exit silently
            raise Exception(f"Unexpected error creating category: {error_type}: {error_msg}")
    
    def update_category(self, category_id: str, data: dict) -> Optional[dict]:
        result = self.client.table("categories").update(data).eq("id", category_id).execute()
        if result.data:
            category = result.data[0]
            # Calculate product_count
            products = self.get_products()
            category["product_count"] = sum(1 for p in products if p.get("category") == category.get("name"))
            # Convert created_at string to datetime if needed
            if isinstance(category.get("created_at"), str):
                try:
                    category["created_at"] = datetime.fromisoformat(category["created_at"].replace("Z", "+00:00"))
                except:
                    pass
            return category
        return None
    
    def delete_category(self, category_id: str) -> bool:
        self.client.table("categories").delete().eq("id", category_id).execute()
        return True
    
    # Supplier methods
    def get_suppliers(self) -> List[dict]:
        try:
            print(f"[Supabase] get_suppliers: Fetching all suppliers...")
            result = self.client.table("suppliers").select("*").execute()
            suppliers = result.data or []
            print(f"[Supabase] get_suppliers: Retrieved {len(suppliers)} suppliers")
            if suppliers:
                print(f"[Supabase] get_suppliers: First supplier: id={suppliers[0].get('id', 'no-id')}, name={suppliers[0].get('name', 'no-name')}")
            return suppliers
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"[Supabase] get_suppliers: Error ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            raise
    
    def get_supplier(self, supplier_id: str) -> Optional[dict]:
        result = self.client.table("suppliers").select("*").eq("id", supplier_id).execute()
        return result.data[0] if result.data else None
    
    def create_supplier(self, data: dict) -> dict:
        """
        Create a supplier in Supabase.
        
        Raises:
            ValueError: For validation errors (400)
            PermissionError: For RLS/permission errors (403)
            KeyError: For duplicate key errors (409)
            Exception: For unexpected errors (500)
        """
        if not self.client:
            raise ValueError("Supabase client is not initialized. Check SUPABASE_URL and SUPABASE_KEY environment variables.")
        
        try:
            # Remove None values and ensure created_at is NOT sent (DB generates it)
            data = {k: v for k, v in data.items() if v is not None and k != "created_at"}
            
            # Only send: name, contact_person, phone, email, address (id and created_at are DB-generated)
            insert_data = {
                "name": data.get("name"),
                "contact_person": data.get("contact_person"),
                "phone": data.get("phone"),
                "email": data.get("email"),
                "address": data.get("address")
            }
            
            print(f"[Supabase] create_supplier: Inserting supplier data: {insert_data}")
            
            # Execute Supabase insert with timing and error handling
            import time
            start_time = time.time()
            
            try:
                result = self.client.table("suppliers").insert(insert_data).execute()
                elapsed = time.time() - start_time
                print(f"[Supabase] create_supplier: Insert completed in {elapsed:.2f}s")
            except Exception as insert_error:
                elapsed = time.time() - start_time
                error_type = type(insert_error).__name__
                error_msg = str(insert_error)
                print(f"[Supabase] create_supplier: Insert failed after {elapsed:.2f}s ({error_type}): {error_msg}")
                import traceback
                traceback.print_exc()
                raise
            
            # Check for Supabase errors in response
            if hasattr(result, 'error') and result.error:
                error_msg = str(result.error)
                print(f"[Supabase] create_supplier: Response has error attribute: {error_msg}")
                # Check for duplicate key error (unique constraint violation)
                if "duplicate" in error_msg.lower() or "unique" in error_msg.lower() or "violates unique constraint" in error_msg.lower():
                    raise KeyError(f"Supplier with name '{insert_data.get('name')}' already exists")
                # Check for RLS/permission errors
                if "permission" in error_msg.lower() or "row-level security" in error_msg.lower() or "policy" in error_msg.lower():
                    raise PermissionError(f"Permission denied: {error_msg}")
                # Other Supabase errors
                raise ValueError(f"Supabase error: {error_msg}")
            
            # Check if result has data attribute
            if not hasattr(result, 'data'):
                print(f"[Supabase] create_supplier: Result object: {type(result)}")
                print(f"[Supabase] create_supplier: Result attributes: {dir(result)}")
                raise ValueError(f"Supabase response missing 'data' attribute. Response type: {type(result)}")
            
            if not result.data:
                print(f"[Supabase] create_supplier: result.data is empty: {result.data}")
                raise ValueError("No data returned from Supabase after insert")
            
            if not isinstance(result.data, list) or len(result.data) == 0:
                print(f"[Supabase] create_supplier: result.data is not a list or is empty: {result.data}")
                raise ValueError(f"Invalid data format from Supabase: expected list, got {type(result.data)}")
            
            supplier = result.data[0]
            print(f"[Supabase] create_supplier: Supplier created successfully with id: {supplier.get('id', 'no-id')}")
            print(f"[Supabase] create_supplier: Supplier name: {supplier.get('name', 'no-name')}")
            return supplier
            
        except (ValueError, PermissionError, KeyError) as e:
            # Re-raise known errors
            raise
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e)
            print(f"[Supabase] create_supplier: Unexpected error ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            raise
    
    def update_supplier(self, supplier_id: str, data: dict) -> Optional[dict]:
        result = self.client.table("suppliers").update(data).eq("id", supplier_id).execute()
        return result.data[0] if result.data else None
    
    def delete_supplier(self, supplier_id: str) -> bool:
        self.client.table("suppliers").delete().eq("id", supplier_id).execute()
        return True
    
    # Unit methods
    def get_units(self) -> List[dict]:
        result = self.client.table("units").select("*").execute()
        return result.data or []
    
    def get_unit(self, unit_id: str) -> Optional[dict]:
        result = self.client.table("units").select("*").eq("id", unit_id).execute()
        return result.data[0] if result.data else None
    
    def create_unit(self, data: dict) -> dict:
        result = self.client.table("units").insert(data).execute()
        return result.data[0] if result.data else data
    
    def update_unit(self, unit_id: str, data: dict) -> Optional[dict]:
        result = self.client.table("units").update(data).eq("id", unit_id).execute()
        return result.data[0] if result.data else None
    
    def delete_unit(self, unit_id: str) -> bool:
        self.client.table("units").delete().eq("id", unit_id).execute()
        return True
    
    # SMS Settings methods
    def get_sms_settings(self, user_id: Optional[str] = None, role: Optional[str] = None) -> List[dict]:
        """Get SMS settings for a user or role"""
        try:
            query = self.client.table("sms_settings").select("*")
            if user_id:
                query = query.eq("user_id", user_id)
            if role:
                query = query.eq("role", role)
            result = query.execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Supabase error: {result.error}")
            return result.data or []
        except Exception as e:
            raise
    
    def create_sms_settings(self, data: dict) -> dict:
        """Create SMS settings"""
        try:
            result = self.client.table("sms_settings").insert(data).execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Supabase error: {result.error}")
            return result.data[0] if result.data else data
        except Exception as e:
            raise
    
    def update_sms_settings(self, settings_id: str, data: dict) -> Optional[dict]:
        """Update SMS settings"""
        data["updated_at"] = datetime.now().isoformat()
        try:
            result = self.client.table("sms_settings").update(data).eq("id", settings_id).execute()
            if hasattr(result, 'error') and result.error:
                raise Exception(f"Supabase error: {result.error}")
            return result.data[0] if result.data else None
        except Exception as e:
            raise
    
    def get_sms_settings_by_user_and_event(self, user_id: str, event_type: str) -> Optional[dict]:
        """Get SMS settings for a specific user and event type"""
        result = self.client.table("sms_settings").select("*").eq("user_id", user_id).eq("event_type", event_type).execute()
        return result.data[0] if result.data else None
    
    def get_sms_settings_by_role_and_event(self, role: str, event_type: str) -> Optional[dict]:
        """Get SMS settings for a specific role and event type"""
        result = self.client.table("sms_settings").select("*").eq("role", role).eq("event_type", event_type).execute()
        return result.data[0] if result.data else None
    
    # SMS Templates methods
    def get_sms_templates(self) -> List[dict]:
        """Get all SMS templates"""
        result = self.client.table("sms_templates").select("*").execute()
        return result.data or []
    
    def get_sms_template(self, template_id: str) -> Optional[dict]:
        """Get SMS template by ID"""
        result = self.client.table("sms_templates").select("*").eq("id", template_id).execute()
        return result.data[0] if result.data else None
    
    def get_sms_template_by_event_type(self, event_type: str) -> Optional[dict]:
        """Get SMS template by event type"""
        result = self.client.table("sms_templates").select("*").eq("event_type", event_type).execute()
        return result.data[0] if result.data else None
    
    def create_sms_template(self, data: dict) -> dict:
        """Create SMS template"""
        result = self.client.table("sms_templates").insert(data).execute()
        return result.data[0] if result.data else data
    
    def update_sms_template(self, template_id: str, data: dict) -> Optional[dict]:
        """Update SMS template"""
        data["updated_at"] = datetime.now().isoformat()
        result = self.client.table("sms_templates").update(data).eq("id", template_id).execute()
        return result.data[0] if result.data else None
    
    # SMS Queue methods
    def add_to_sms_queue(self, recipient_phone: str, message: str, event_type: str, scheduled_at: datetime) -> str:
        """Add SMS to queue"""
        queue_data = {
            "recipient_phone": recipient_phone,
            "message": message,
            "event_type": event_type,
            "status": "pending",
            "scheduled_at": scheduled_at.isoformat()
        }
        result = self.client.table("sms_queue").insert(queue_data).execute()
        return result.data[0]["id"] if result.data else ""
    
    def get_pending_sms_queue(self, limit: int = 50) -> List[dict]:
        """Get pending SMS items from queue"""
        result = self.client.table("sms_queue").select("*").eq("status", "pending").order("scheduled_at").limit(limit).execute()
        return result.data or []
    
    def update_sms_queue_status(self, queue_id: str, status: str, error_message: Optional[str] = None):
        """Update SMS queue item status"""
        update_data = {
            "status": status,
            "processed_at": datetime.now().isoformat() if status in ["sent", "failed"] else None
        }
        if error_message:
            update_data["error_message"] = error_message
        if status == "failed":
            # Increment retry count
            queue_item = self.client.table("sms_queue").select("retry_count").eq("id", queue_id).execute()
            if queue_item.data:
                retry_count = queue_item.data[0].get("retry_count", 0) + 1
                update_data["retry_count"] = retry_count
        
        self.client.table("sms_queue").update(update_data).eq("id", queue_id).execute()
    
    # SMS Logs methods
    def create_sms_log(self, data: dict) -> dict:
        """Create SMS log entry"""
        log_data = {
            "recipient_phone": data.get("recipient_phone"),
            "message": data.get("message"),
            "event_type": data.get("event_type"),
            "status": data.get("status", "sent"),
            "trxn_id": data.get("trxn_id"),
            "delivery_status": data.get("delivery_status"),
            "error_message": data.get("error_message")
        }
        result = self.client.table("sms_logs").insert(log_data).execute()
        return result.data[0] if result.data else log_data
    
    def get_sms_logs(self, limit: int = 100, event_type: Optional[str] = None, recipient_phone: Optional[str] = None) -> List[dict]:
        """Get SMS logs with optional filters"""
        query = self.client.table("sms_logs").select("*").order("sent_at", desc=True).limit(limit)
        if event_type:
            query = query.eq("event_type", event_type)
        if recipient_phone:
            query = query.eq("recipient_phone", recipient_phone)
        result = query.execute()
        return result.data or []
    
    # ============================================
    # Route/Batch System Methods
    # ============================================
    
    def calculate_previous_due(self, retailer_id: str, exclude_route_id: Optional[str] = None) -> float:
        """
        Calculate previous due for a retailer (sum of unpaid/partial orders not in any route).
        Excludes orders already in routes (unless exclude_route_id is specified, then excludes only that route).
        """
        # Get all sales for this retailer
        query = self.client.table("sales").select("due_amount, route_id, payment_status")
        query = query.eq("retailer_id", retailer_id)
        query = query.neq("payment_status", "paid")  # Only unpaid/partial orders
        
        result = query.execute()
        sales = result.data or []
        
        # Filter in Python (Supabase Python client doesn't support complex OR queries easily)
        if exclude_route_id:
            # Exclude orders in the specified route (for editing routes)
            filtered_sales = [s for s in sales if not s.get("route_id") or s.get("route_id") != exclude_route_id]
        else:
            # Exclude orders already in any route
            filtered_sales = [s for s in sales if not s.get("route_id")]
        
        previous_due = sum(float(s.get("due_amount", 0)) for s in filtered_sales)
        return previous_due
    
    def create_route(self, data: dict, sale_ids: List[str]) -> dict:
        """Create a new route/batch with sales orders and calculate previous due snapshots"""
        from datetime import datetime
        import uuid
        
        # Validate assigned_to user
        assigned_user = self.get_user_by_id(data["assigned_to"])
        if not assigned_user:
            raise ValueError("Assigned user not found")
        
        # Generate route number
        route_number = f"RT-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:4].upper()}"
        
        # Calculate previous due for each retailer and create route_sales records
        route_sales_data = []
        retailer_previous_due = {}  # Cache previous due per retailer
        
        # First pass: collect all retailer IDs and calculate their previous due
        retailer_ids = set()
        for sale_id in sale_ids:
            sale = self.get_sale(sale_id)
            if sale and sale.get("retailer_id"):
                retailer_ids.add(sale.get("retailer_id"))
        
        # Calculate previous due for each retailer (excluding sales being added to route)
        for retailer_id in retailer_ids:
            # Get all sales for this retailer that are being added to route
            route_sale_ids_for_retailer = [
                sale_id for sale_id in sale_ids
                if (sale := self.get_sale(sale_id)) and sale.get("retailer_id") == retailer_id
            ]
            
            # Calculate total due for these sales
            route_sales_due = 0.0
            for sid in route_sale_ids_for_retailer:
                sale = self.get_sale(sid)
                if sale:
                    route_sales_due += float(sale.get("due_amount", 0))
            
            # Calculate all previous due for retailer
            all_previous_due = self.calculate_previous_due(retailer_id)
            
            # Previous due snapshot = all previous due - due from sales being added to route
            retailer_previous_due[retailer_id] = max(0, all_previous_due - route_sales_due)
        
        # Second pass: create route_sales records with previous due snapshots
        for sale_id in sale_ids:
            sale = self.get_sale(sale_id)
            if not sale:
                continue
            
            retailer_id = sale.get("retailer_id")
            if not retailer_id:
                continue
            
            previous_due_snapshot = retailer_previous_due.get(retailer_id, 0)
            
            route_sales_data.append({
                "sale_id": sale_id,
                "previous_due": previous_due_snapshot
            })
        
        if not route_sales_data:
            raise ValueError("No valid sales found to add to route")
        
        # Calculate route totals
        total_orders = len(route_sales_data)
        total_amount = sum(float(self.get_sale(rs["sale_id"]).get("total_amount", 0)) for rs in route_sales_data)
        
        # Create route record
        route_data = {
            "route_number": route_number,
            "assigned_to": data["assigned_to"],
            "assigned_to_name": assigned_user.get("name"),
            "route_date": data["route_date"].isoformat() if isinstance(data["route_date"], date) else data["route_date"],
            "status": "pending",
            "total_orders": total_orders,
            "total_amount": total_amount,
            "notes": data.get("notes")
        }
        
        route_result = self.client.table("routes").insert(route_data).execute()
        if not route_result.data:
            raise ValueError("Failed to create route")
        
        route = route_result.data[0]
        route_id = route["id"]
        
        # Create route_sales records with previous_due snapshots
        for rs_data in route_sales_data:
            route_sale_data = {
                "route_id": route_id,
                "sale_id": rs_data["sale_id"],
                "previous_due": rs_data["previous_due"]
            }
            self.client.table("route_sales").insert(route_sale_data).execute()
            
            # Update sale.route_id AND override sales.assigned_to to match route (Route SR overrides Sales SR)
            self.client.table("sales").update({
                "route_id": route_id,
                "assigned_to": data["assigned_to"],  # Route's SR
                "assigned_to_name": assigned_user.get("name")  # Route's SR name
            }).eq("id", rs_data["sale_id"]).execute()
        
        # Fetch complete route with sales
        return self.get_route(route_id)
    
    def get_routes(self, assigned_to: Optional[str] = None, status: Optional[str] = None, route_date: Optional[str] = None) -> List[dict]:
        """Get all routes with optional filters"""
        query = self.client.table("routes").select("*").order("created_at", desc=True)
        
        if assigned_to:
            query = query.eq("assigned_to", assigned_to)
        if status:
            query = query.eq("status", status)
        if route_date:
            query = query.eq("route_date", route_date)
        
        result = query.execute()
        return result.data or []
    
    def get_route(self, route_id: str) -> Optional[dict]:
        """Get route with all associated sales and previous due snapshots"""
        route_result = self.client.table("routes").select("*").eq("id", route_id).execute()
        if not route_result.data:
            return None
        
        route = route_result.data[0]
        
        # Get route_sales (previous due snapshots)
        route_sales_result = self.client.table("route_sales").select("*").eq("route_id", route_id).execute()
        route_sales = route_sales_result.data or []
        
        # Get sales for this route
        sale_ids = [rs["sale_id"] for rs in route_sales]
        sales = []
        for sale_id in sale_ids:
            sale = self.get_sale(sale_id)
            if sale:
                # Find corresponding previous_due from route_sales
                route_sale = next((rs for rs in route_sales if rs["sale_id"] == sale_id), None)
                if route_sale:
                    sale["previous_due"] = float(route_sale.get("previous_due", 0))
                sales.append(sale)
        
        route["sales"] = sales
        route["route_sales"] = route_sales
        
        return route
    
    def _check_route_not_reconciled(self, route: dict) -> None:
        """Raise ValueError if route is reconciled (immutable)"""
        if route.get("status") == "reconciled":
            raise ValueError("Cannot modify reconciled route")
    
    def _validate_route_status_transition(self, current_status: str, new_status: str) -> None:
        """
        Validate route status transition follows correct flow:
        pending → in_progress → completed → reconciled
        
        Allows direct transition from pending → completed for convenience.
        
        Raises ValueError if transition is invalid.
        """
        valid_transitions = {
            "pending": ["in_progress", "completed"],  # Allow direct pending → completed
            "in_progress": ["completed"],
            "completed": ["reconciled"],
            "reconciled": []  # No transitions allowed from reconciled (immutable)
        }
        
        # #region agent log
        import json
        log_data = {
            "location": "supabase_db.py:_validate_route_status_transition:entry",
            "message": "Validating route status transition",
            "data": {
                "current_status": current_status,
                "new_status": new_status,
                "allowed_transitions": valid_transitions.get(current_status, [])
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        if current_status not in valid_transitions:
            # #region agent log
            log_data = {
                "location": "supabase_db.py:_validate_route_status_transition:error",
                "message": "Invalid current status",
                "data": {"current_status": current_status},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            raise ValueError(f"Invalid current route status: {current_status}")
        
        if new_status not in valid_transitions:
            # #region agent log
            log_data = {
                "location": "supabase_db.py:_validate_route_status_transition:error",
                "message": "Invalid new status",
                "data": {"new_status": new_status},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            raise ValueError(f"Invalid route status: {new_status}")
        
        allowed_next_statuses = valid_transitions[current_status]
        if new_status not in allowed_next_statuses:
            # #region agent log
            log_data = {
                "location": "supabase_db.py:_validate_route_status_transition:error",
                "message": "Transition not allowed",
                "data": {
                    "current_status": current_status,
                    "new_status": new_status,
                    "allowed_next_statuses": allowed_next_statuses
                },
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            raise ValueError(
                f"Cannot transition route from '{current_status}' to '{new_status}'. "
                f"Valid next statuses: {', '.join(allowed_next_statuses) if allowed_next_statuses else 'none (route is reconciled)'}"
            )
        
        # #region agent log
        log_data = {
            "location": "supabase_db.py:_validate_route_status_transition:success",
            "message": "Transition validated successfully",
            "data": {
                "current_status": current_status,
                "new_status": new_status
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "A"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
    
    def update_route(self, route_id: str, data: dict) -> Optional[dict]:
        """Update route (status, notes, etc.)"""
        # #region agent log
        import json
        log_data = {
            "location": "supabase_db.py:update_route:entry",
            "message": "Updating route",
            "data": {
                "route_id": route_id,
                "update_data": data
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "B"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        # Check if route is reconciled (immutable)
        route = self.get_route(route_id)
        if not route:
            # #region agent log
            log_data = {
                "location": "supabase_db.py:update_route:route_not_found",
                "message": "Route not found",
                "data": {"route_id": route_id},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "B"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            return None
        
        self._check_route_not_reconciled(route)
        
        update_data = {}
        
        if "status" in data:
            current_status = route.get("status", "pending")
            new_status = data["status"]
            
            # #region agent log
            log_data = {
                "location": "supabase_db.py:update_route:status_change",
                "message": "Status change requested",
                "data": {
                    "current_status": current_status,
                    "new_status": new_status
                },
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "B"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            # Validate status transition
            if current_status != new_status:
                self._validate_route_status_transition(current_status, new_status)
            
            update_data["status"] = new_status
            if new_status == "completed":
                update_data["completed_at"] = datetime.now().isoformat()
            elif new_status == "reconciled":
                # Note: reconciled status should be set by reconciliation, not manually
                # But we allow it here for flexibility
                update_data["reconciled_at"] = datetime.now().isoformat()
        
        if "notes" in data:
            update_data["notes"] = data["notes"]
        
        if not update_data:
            # #region agent log
            log_data = {
                "location": "supabase_db.py:update_route:no_updates",
                "message": "No updates to apply",
                "data": {},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "B"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            return None
        
        # #region agent log
        log_data = {
            "location": "supabase_db.py:update_route:before_db_update",
            "message": "Updating route in database",
            "data": {"update_data": update_data},
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "B"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        result = self.client.table("routes").update(update_data).eq("id", route_id).execute()
        
        # #region agent log
        log_data = {
            "location": "supabase_db.py:update_route:after_db_update",
            "message": "Route updated in database",
            "data": {
                "success": result.data is not None and len(result.data) > 0,
                "updated_route": result.data[0] if result.data else None
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "B"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        return result.data[0] if result.data else None
    
    def add_sales_to_route(self, route_id: str, sale_ids: List[str]) -> dict:
        """Add sales orders to an existing route"""
        route = self.get_route(route_id)
        if not route:
            raise ValueError("Route not found")
        
        # Check if route is immutable (completed or reconciled)
        route_status = route.get("status")
        if route_status in ["completed", "reconciled"]:
            raise ValueError(f"Cannot add sales to route with status '{route_status}'. Route is immutable.")
        
        self._check_route_not_reconciled(route)
        
        # Get route's SR info for override
        route_sr_id = route.get("assigned_to")
        route_sr_name = route.get("assigned_to_name")
        
        # Calculate previous due for new sales
        route_sales_data = []
        retailer_previous_due = {}
        
        for sale_id in sale_ids:
            # Check if sale already in route
            existing = self.client.table("route_sales").select("*").eq("route_id", route_id).eq("sale_id", sale_id).execute()
            if existing.data:
                continue  # Already in route
            
            sale = self.get_sale(sale_id)
            if not sale:
                continue
            
            retailer_id = sale.get("retailer_id")
            if not retailer_id:
                continue
            
            # Calculate previous due (excluding current route)
            if retailer_id not in retailer_previous_due:
                retailer_previous_due[retailer_id] = self.calculate_previous_due(retailer_id, exclude_route_id=route_id)
            
            previous_due = retailer_previous_due[retailer_id]
            current_sale_due = float(sale.get("due_amount", 0))
            previous_due_snapshot = max(0, previous_due - current_sale_due)
            
            route_sales_data.append({
                "sale_id": sale_id,
                "previous_due": previous_due_snapshot
            })
        
        if not route_sales_data:
            raise ValueError("No new valid sales to add")
        
        # Add route_sales records
        for rs_data in route_sales_data:
            route_sale_data = {
                "route_id": route_id,
                "sale_id": rs_data["sale_id"],
                "previous_due": rs_data["previous_due"]
            }
            self.client.table("route_sales").insert(route_sale_data).execute()
            
            # Update sale.route_id AND override sales.assigned_to to match route (Route SR overrides Sales SR)
            update_data = {"route_id": route_id}
            if route_sr_id:
                update_data["assigned_to"] = route_sr_id
                update_data["assigned_to_name"] = route_sr_name
            
            self.client.table("sales").update(update_data).eq("id", rs_data["sale_id"]).execute()
        
        # Update route totals
        route = self.get_route(route_id)
        total_orders = len(route.get("sales", []))
        total_amount = sum(float(s.get("total_amount", 0)) for s in route.get("sales", []))
        
        self.client.table("routes").update({
            "total_orders": total_orders,
            "total_amount": total_amount
        }).eq("id", route_id).execute()
        
        return self.get_route(route_id)
    
    def remove_sale_from_route(self, route_id: str, sale_id: str) -> dict:
        """Remove a sale from route"""
        route = self.get_route(route_id)
        if not route:
            raise ValueError("Route not found")
        
        # Sales can only be removed when route status is 'pending'
        # Once route moves to 'in_progress', it becomes immutable
        route_status = route.get("status")
        if route_status != "pending":
            raise ValueError(
                f"Cannot remove sales from route with status '{route_status}'. "
                f"Sales can only be removed when route status is 'pending'."
            )
        
        self._check_route_not_reconciled(route)
        
        # Remove from route_sales
        self.client.table("route_sales").delete().eq("route_id", route_id).eq("sale_id", sale_id).execute()
        
        # Clear sale.route_id
        self.client.table("sales").update({"route_id": None}).eq("id", sale_id).execute()
        
        # Update route totals
        route = self.get_route(route_id)
        if route:
            total_orders = len(route.get("sales", []))
            total_amount = sum(float(s.get("total_amount", 0)) for s in route.get("sales", []))
            
            self.client.table("routes").update({
                "total_orders": total_orders,
                "total_amount": total_amount
            }).eq("id", route_id).execute()
        
        return self.get_route(route_id)
    
    def delete_route(self, route_id: str) -> bool:
        """Delete a route (cascades to route_sales, clears sales.route_id)"""
        try:
            # Check if route is reconciled (immutable)
            route = self.get_route(route_id)
            if route:
                self._check_route_not_reconciled(route)
            
            # Clear sales.route_id for all sales in this route
            self.client.table("sales").update({"route_id": None}).eq("route_id", route_id).execute()
            
            # Delete route (cascades to route_sales)
            result = self.client.table("routes").delete().eq("id", route_id).execute()
            return len(result.data) > 0 if result.data else False
        except Exception as e:
            print(f"[DB] Error deleting route {route_id}: {e}")
            raise
    
    def create_route_reconciliation(self, route_id: str, data: dict, user_id: Optional[str] = None) -> dict:
        """Create reconciliation record for a route"""
        route = self.get_route(route_id)
        if not route:
            raise ValueError("Route not found")
        
        # Calculate total expected cash (sum of all Total Outstanding)
        total_expected = 0.0
        for sale in route.get("sales", []):
            previous_due = float(sale.get("previous_due", 0))
            current_bill = float(sale.get("total_amount", 0))
            total_outstanding = previous_due + current_bill
            total_expected += total_outstanding
        
        total_collected = float(data.get("total_collected_cash", 0))
        total_returns = float(data.get("total_returns_amount", 0))
        discrepancy = total_expected - total_collected - total_returns
        
        # Create reconciliation record
        reconciliation_data = {
            "route_id": route_id,
            "reconciled_by": user_id,
            "total_expected_cash": total_expected,
            "total_collected_cash": total_collected,
            "total_returns_amount": total_returns,
            "discrepancy": discrepancy,
            "notes": data.get("notes")
        }
        
        reconciliation_result = self.client.table("route_reconciliations").insert(reconciliation_data).execute()
        if not reconciliation_result.data:
            raise ValueError("Failed to create reconciliation")
        
        reconciliation = reconciliation_result.data[0]
        reconciliation_id = reconciliation["id"]
        
        # Create reconciliation items (returns)
        reconciliation_items = data.get("reconciliation_items", [])
        for item_data in reconciliation_items:
            item_record = {
                "reconciliation_id": reconciliation_id,
                "sale_id": item_data["sale_id"],
                "sale_item_id": item_data["sale_item_id"],
                "quantity_returned": item_data.get("quantity_returned", 0),
                "return_reason": item_data.get("return_reason")
            }
            self.client.table("route_reconciliation_items").insert(item_record).execute()
        
        # Update SR cash holding (ONLY place where cash holding is updated)
        # This ensures payments during delivery do NOT update cash holding
        if route.get("assigned_to"):
            # Add discrepancy note if there's a discrepancy
            notes_with_discrepancy = data.get("notes") or ""
            if abs(discrepancy) > 0.01:  # If there's a significant discrepancy
                discrepancy_note = f"Discrepancy: ৳{discrepancy:.2f} (Expected: ৳{total_expected:.2f}, Collected: ৳{total_collected:.2f}, Returns: ৳{total_returns:.2f})"
                notes_with_discrepancy = f"{notes_with_discrepancy}\n{discrepancy_note}".strip()
            
            self.update_sr_cash_holding(
                route["assigned_to"], 
                total_collected,  # Amount added to SR's cash holding
                "reconciliation", 
                reconciliation_id,
                notes=notes_with_discrepancy or f"Route reconciliation: Collected ৳{total_collected:.2f}"
            )
        
        # Update route status
        self.client.table("routes").update({
            "status": "reconciled",
            "reconciled_at": datetime.now().isoformat()
        }).eq("id", route_id).execute()
        
        return self.get_route_reconciliation(reconciliation_id)
    
    def get_route_reconciliation(self, reconciliation_id: str) -> Optional[dict]:
        """Get reconciliation with items"""
        result = self.client.table("route_reconciliations").select("*").eq("id", reconciliation_id).execute()
        if not result.data:
            return None
        
        reconciliation = result.data[0]
        
        # Get reconciliation items
        items_result = self.client.table("route_reconciliation_items").select("*").eq("reconciliation_id", reconciliation_id).execute()
        reconciliation["items"] = items_result.data or []
        
        return reconciliation
    
    def get_route_reconciliations(self, route_id: Optional[str] = None) -> List[dict]:
        """Get all reconciliations"""
        query = self.client.table("route_reconciliations").select("*").order("reconciled_at", desc=True)
        if route_id:
            query = query.eq("route_id", route_id)
        
        result = query.execute()
        reconciliations = result.data or []
        
        # Add items for each reconciliation
        for rec in reconciliations:
            items_result = self.client.table("route_reconciliation_items").select("*").eq("reconciliation_id", rec["id"]).execute()
            rec["items"] = items_result.data or []
        
        return reconciliations
    
    def update_sr_cash_holding(self, user_id: str, amount: float, source: str, reference_id: Optional[str] = None, notes: Optional[str] = None) -> dict:
        """
        Update SR cash holding (add to historical and update current)
        
        This function should ONLY be called during reconciliation.
        Individual payments during delivery do NOT update cash holdings.
        """
        # Get current holding (before update)
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError("User not found")
        
        before_balance = float(user.get("current_cash_holding", 0))
        after_balance = before_balance + amount
        
        # Update users.current_cash_holding
        self.client.table("users").update({"current_cash_holding": after_balance}).eq("id", user_id).execute()
        
        # Create historical audit trail record with before/after balance
        holding_record = {
            "user_id": user_id,
            "amount": amount,  # Change amount (positive = added, negative = deducted)
            "before_balance": before_balance,  # Balance before this transaction
            "after_balance": after_balance,  # Balance after this transaction
            "source": source,  # 'reconciliation', 'manual_adjustment', 'initial'
            "reference_id": reference_id,  # route_reconciliation_id or NULL
            "notes": notes or f"Cash holding updated from {source}"
        }
        
        result = self.client.table("sr_cash_holdings").insert(holding_record).execute()
        return result.data[0] if result.data else holding_record
    
    def get_sr_accountability(self, user_id: str) -> Optional[dict]:
        """Get SR accountability report"""
        user = self.get_user_by_id(user_id)
        if not user:
            return None
        
        # Get all routes for this SR (including reconciled ones)
        all_routes = self.get_routes(assigned_to=user_id)
        
        # Separate routes by status
        active_routes = [r for r in all_routes if r.get("status") in ["pending", "in_progress", "completed"]]
        reconciled_routes = [r for r in all_routes if r.get("status") == "reconciled"]
        
        # Get pending reconciliations (completed routes not yet reconciled)
        pending_routes = [r for r in active_routes if r.get("status") == "completed"]
        
        # PERFORMANCE FIX: Batch fetch all data instead of N+1 queries
        route_ids = [r["id"] for r in all_routes]
        total_expected = 0.0
        route_sale_ids = set()
        
        if route_ids:
            # Fetch all route_sales in ONE query (instead of N queries per route)
            route_sales_result = self.client.table("route_sales").select("route_id,sale_id,previous_due").in_("route_id", route_ids).execute()
            route_sales_data = route_sales_result.data or []
            
            # Build map: (route_id, sale_id) -> previous_due
            route_sales_map = {(rs["route_id"], rs["sale_id"]): float(rs.get("previous_due", 0)) for rs in route_sales_data}
            
            # Get all unique sale IDs
            sale_ids = list(set(rs["sale_id"] for rs in route_sales_data))
            route_sale_ids = set(sale_ids)  # For payments lookup
            
            if sale_ids:
                # Fetch all sales in ONE query (instead of M queries per sale)
                sales_result = self.client.table("sales").select("id,total_amount").in_("id", sale_ids).execute()
                sales_map = {s["id"]: float(s.get("total_amount", 0)) for s in (sales_result.data or [])}
                
                # Calculate total_expected using route_sales map
                for (route_id, sale_id), previous_due in route_sales_map.items():
                    current_bill = sales_map.get(sale_id, 0)
                    total_expected += previous_due + current_bill
        
        # Get all reconciliations for this SR's routes
        # PERFORMANCE FIX: Batch fetch reconciliations instead of N+1 queries
        reconciliations = []
        
        if route_ids:
            # Fetch all reconciliations in ONE query (instead of N queries per route)
            reconciliations_result = self.client.table("route_reconciliations").select("*").in_("route_id", route_ids).order("reconciled_at", desc=True).execute()
            reconciliations = reconciliations_result.data or []
            
            # Fetch all reconciliation items in ONE query (instead of N queries per reconciliation)
            reconciliation_ids = [r["id"] for r in reconciliations]
            if reconciliation_ids:
                items_result = self.client.table("route_reconciliation_items").select("*").in_("reconciliation_id", reconciliation_ids).execute()
                items_map = {}
                for item in (items_result.data or []):
                    rec_id = item["reconciliation_id"]
                    if rec_id not in items_map:
                        items_map[rec_id] = []
                    items_map[rec_id].append(item)
                
                # Attach items to reconciliations
                for rec in reconciliations:
                    rec["items"] = items_map.get(rec["id"], [])
        
        # Get all payments collected by this SR (for sales in their routes)
        # DOUBLE-COUNT SAFEGUARD: Group payments by route to detect which routes have payments
        # FALLBACK: If payment.route_id is NULL, resolve via sale.route_id (for legacy payments)
        payments_collected = []
        payments_by_route = {}  # route_id -> list of payments
        if route_sale_ids:
            try:
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:get_sr_accountability:before_payment_fetch",
                    "message": "Fetching payments for SR",
                    "data": {
                        "user_id": user_id,
                        "route_sale_ids_count": len(route_sale_ids),
                        "route_sale_ids_sample": list(route_sale_ids)[:5] if len(route_sale_ids) > 5 else list(route_sale_ids)
                    },
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                
                # Get payments collected by this SR
                payments_result = self.client.table("payments").select("*").eq("collected_by", user_id).execute()
                all_payments = payments_result.data or []
                
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:get_sr_accountability:after_payment_fetch",
                    "message": "Payments fetched",
                    "data": {
                        "total_payments_fetched": len(all_payments),
                        "payments_sample": [
                            {
                                "id": p.get("id"),
                                "sale_id": p.get("sale_id"),
                                "route_id": p.get("route_id"),
                                "collected_by": p.get("collected_by"),
                                "amount": p.get("amount")
                            } for p in all_payments[:3]
                        ]
                    },
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                
                # Filter payments for sales in this SR's routes
                payments_collected = [p for p in all_payments if p.get("sale_id") and p.get("sale_id") in route_sale_ids]
                
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:get_sr_accountability:after_filter",
                    "message": "Payments filtered for route sales",
                    "data": {
                        "payments_collected_count": len(payments_collected),
                        "payments_collected": [
                            {
                                "id": p.get("id"),
                                "sale_id": p.get("sale_id"),
                                "route_id": p.get("route_id"),
                                "amount": p.get("amount")
                            } for p in payments_collected[:5]
                        ]
                    },
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "B"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                
                # Build map: route_id -> list of payments for that route
                # Use route_sales_map to get route_id for each sale (already fetched above)
                if payments_collected and route_sales_map:
                    # Build sale_id -> route_id map from route_sales_map
                    sale_to_route_map = {}
                    for (route_id, sale_id), _ in route_sales_map.items():
                        if sale_id not in sale_to_route_map:
                            sale_to_route_map[sale_id] = route_id
                        # Note: If a sale is in multiple routes (shouldn't happen), last route wins
                    
                    # Group payments by route
                    # FALLBACK: If payment.route_id is NULL, use sale.route_id from map
                    for payment in payments_collected:
                        sale_id = payment.get("sale_id")
                        # Primary: Use payment.route_id if set
                        # Fallback: Use sale.route_id from route_sales_map (for legacy payments)
                        route_id = payment.get("route_id") or sale_to_route_map.get(sale_id)
                        
                        # #region agent log
                        log_data = {
                            "location": "supabase_db.py:get_sr_accountability:grouping_payment",
                            "message": "Grouping payment by route",
                            "data": {
                                "payment_id": payment.get("id"),
                                "sale_id": sale_id,
                                "payment_route_id": payment.get("route_id"),
                                "resolved_route_id": route_id,
                                "sale_in_map": sale_id in sale_to_route_map,
                                "used_fallback": not payment.get("route_id") and sale_id in sale_to_route_map
                            },
                            "timestamp": int(datetime.now().timestamp() * 1000),
                            "sessionId": "debug-session",
                            "runId": "run1",
                            "hypothesisId": "C"
                        }
                        try:
                            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                                f.write(json.dumps(log_data) + "\n")
                        except: pass
                        # #endregion
                        
                        if route_id:
                            # If payment.route_id was NULL but we resolved it, log for backfill
                            if not payment.get("route_id") and sale_id in sale_to_route_map:
                                print(f"[DB] FALLBACK: Payment {payment.get('id')} had NULL route_id, resolved via sale.route_id = {route_id}")
                            
                            if route_id not in payments_by_route:
                                payments_by_route[route_id] = []
                            payments_by_route[route_id].append(payment)
                
                print(f"[DB] get_sr_accountability: SR {user_id}")
                print(f"[DB]   - Route sale IDs: {list(route_sale_ids)[:5]}..." if len(route_sale_ids) > 5 else f"[DB]   - Route sale IDs: {list(route_sale_ids)}")
                print(f"[DB]   - Total payments collected by SR: {len(all_payments)}")
                print(f"[DB]   - Payments for route sales: {len(payments_collected)}")
                print(f"[DB]   - Routes with payments: {list(payments_by_route.keys())}")
                if all_payments:
                    for p in all_payments[:3]:  # Show first 3 payments for debugging
                        print(f"[DB]     Payment: sale_id={p.get('sale_id')}, amount={p.get('amount')}, collected_by={p.get('collected_by')}, in_route={p.get('sale_id') in route_sale_ids if p.get('sale_id') else False}")
            except Exception as e:
                print(f"[DB] Error fetching payments for SR accountability: {e}")
                import traceback
                traceback.print_exc()
                payments_collected = []
                payments_by_route = {}
        
        # Calculate totals from reconciliations AND individual payments
        # 
        # DOUBLE-COUNT SAFEGUARD: If a route has payment records, exclude reconciliation.total_collected_cash for that route
        # Logic:
        # - If route has payments: Use payments only (payments are source of truth for actual collection)
        # - If route has no payments but has reconciliation: Use reconciliation.total_collected_cash (manual entry)
        # - This prevents double-counting when reconciliation includes payments that are already recorded
        #
        total_collected_from_recons = 0.0
        for rec in reconciliations:
            route_id = rec.get("route_id")
            # Only count reconciliation total if route has NO payments
            if route_id not in payments_by_route:
                total_collected_from_recons += float(rec.get("total_collected_cash", 0))
            else:
                # Route has payments - exclude reconciliation total to prevent double-counting
                print(f"[DB] DOUBLE-COUNT SAFEGUARD: Route {route_id} has {len(payments_by_route[route_id])} payments - excluding reconciliation.total_collected_cash={rec.get('total_collected_cash', 0)}")
        
        total_collected_from_payments = sum(float(p.get("amount", 0)) for p in payments_collected)
        total_collected = total_collected_from_recons + total_collected_from_payments
        total_returns = sum(float(r.get("total_returns_amount", 0)) for r in reconciliations)
        
        # LOGIC FIX: Calculate actual current outstanding (not cash holding)
        # Current Outstanding = Total Expected - Total Collected - Total Returns
        current_outstanding = total_expected - total_collected - total_returns
        
        # #region agent log
        log_data = {
            "location": "supabase_db.py:get_sr_accountability:final_calculation",
            "message": "Final SR Accountability calculation",
            "data": {
                "user_id": user_id,
                "total_expected": total_expected,
                "total_collected_from_recons": total_collected_from_recons,
                "total_collected_from_payments": total_collected_from_payments,
                "total_collected": total_collected,
                "total_returns": total_returns,
                "current_outstanding": current_outstanding,
                "payments_collected_count": len(payments_collected),
                "routes_with_payments": list(payments_by_route.keys())
            },
            "timestamp": int(datetime.now().timestamp() * 1000),
            "sessionId": "debug-session",
            "runId": "run1",
            "hypothesisId": "D"
        }
        try:
            with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                f.write(json.dumps(log_data) + "\n")
        except: pass
        # #endregion
        
        print(f"[DB] get_sr_accountability: SR {user_id} - Total collected from recons (after safeguard): {total_collected_from_recons}, from payments: {total_collected_from_payments}, total: {total_collected}")
        print(f"[DB] get_sr_accountability: SR {user_id} - Total expected: {total_expected}, Total collected: {total_collected}, Total returns: {total_returns}, Current outstanding: {current_outstanding}")
        if payments_by_route:
            print(f"[DB] DOUBLE-COUNT SAFEGUARD: {len(payments_by_route)} routes have payments - reconciliation totals excluded for those routes")
        
        return {
            "user_id": user_id,
            "user_name": user.get("name"),
            "current_cash_holding": float(user.get("current_cash_holding", 0)),
            "current_outstanding": current_outstanding,  # LOGIC FIX: Actual outstanding amount
            "active_routes_count": len(active_routes),
            "pending_reconciliation_count": len(pending_routes),
            "total_expected_cash": total_expected,
            "routes": all_routes,  # Include all routes (active + reconciled)
            "reconciliations": reconciliations
        }
    
    def backfill_payment_route_id(self, dry_run: bool = True) -> dict:
        """
        ONE-TIME BACKFILL: Update payments.route_id from sales.route_id for historical payments.
        
        Uses a SINGLE batch SQL UPDATE statement (no loops) via PostgreSQL function.
        This fixes payments created before 2026-01-13 that have route_id = NULL.
        New payments already have route_id set correctly via create_payment().
        
        Args:
            dry_run: If True, only returns preview without updating (default: True for safety)
        
        Returns:
            dict with statistics about the backfill operation
        """
        try:
            # #region agent log
            import json
            log_data = {
                "location": "supabase_db.py:backfill_payment_route_id:entry",
                "message": "Backfill function called",
                "data": {"dry_run": dry_run},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            # Step 1: Preview - Count payments that need backfill
            # #region agent log
            log_data = {
                "location": "supabase_db.py:backfill_payment_route_id:before_preview",
                "message": "Counting payments needing backfill",
                "data": {},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            preview_result = self.client.table("payments").select("id", count="exact").is_("route_id", "null").execute()
            payments_with_null_route_id = preview_result.count or 0
            
            # Count payments that need backfill: NULL route_id AND sale has route_id
            # Use efficient query to get exact count
            payments_to_fix_result = self.client.table("payments").select("id,sale_id").is_("route_id", "null").execute()
            payments_to_fix = payments_to_fix_result.data or []
            
            if not payments_to_fix:
                result = {
                    "status": "success",
                    "dry_run": dry_run,
                    "payments_found": 0,
                    "payments_updated": 0,
                    "payments_still_missing": 0,
                    "message": "No payments need backfill (all payments already have route_id or sales not in routes)"
                }
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:backfill_payment_route_id:no_payments",
                    "message": "No payments need backfill",
                    "data": result,
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                return result
            
            # Get sale_ids to check if they have route_id
            sale_ids = list(set([p["sale_id"] for p in payments_to_fix if p.get("sale_id")]))
            if not sale_ids:
                result = {
                    "status": "success",
                    "dry_run": dry_run,
                    "payments_found": len(payments_to_fix),
                    "payments_updated": 0,
                    "payments_still_missing": 0,
                    "message": "No payments with sale_id found"
                }
                return result
            
            # Batch fetch sales to check route_id (in chunks if needed)
            sales_with_route = []
            chunk_size = 1000
            for i in range(0, len(sale_ids), chunk_size):
                chunk = sale_ids[i:i + chunk_size]
                sales_result = self.client.table("sales").select("id,route_id").in_("id", chunk).execute()
                sales_with_route.extend([s for s in (sales_result.data or []) if s.get("route_id")])
            
            sales_map = {s["id"]: s.get("route_id") for s in sales_with_route}
            payments_needing_backfill = len([p for p in payments_to_fix if p.get("sale_id") in sales_map])
            
            # #region agent log
            log_data = {
                "location": "supabase_db.py:backfill_payment_route_id:preview_count",
                "message": "Preview count calculated",
                "data": {
                    "payments_with_null_route_id": payments_with_null_route_id,
                    "payments_needing_backfill": payments_needing_backfill,
                    "sample_size": len(payments_to_fix)
                },
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            if dry_run:
                # Dry-run: Return preview only
                result = {
                    "status": "success",
                    "dry_run": True,
                    "payments_found": payments_with_null_route_id,
                    "payments_needing_backfill": payments_needing_backfill,
                    "payments_updated": 0,
                    "payments_still_missing": payments_needing_backfill,
                    "message": f"Preview: {payments_needing_backfill} payments would be updated"
                }
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:backfill_payment_route_id:dry_run_result",
                    "message": "Dry-run result",
                    "data": result,
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                return result
            
            # Step 2: Execute SINGLE batch SQL UPDATE via PostgreSQL function
            # #region agent log
            log_data = {
                "location": "supabase_db.py:backfill_payment_route_id:before_execute",
                "message": "Executing batch SQL update",
                "data": {},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            # Call PostgreSQL function via RPC (single batch UPDATE)
            # This executes: UPDATE payments SET route_id = sales.route_id WHERE ...
            try:
                rpc_result = self.client.rpc("backfill_payment_route_id").execute()
                
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:backfill_payment_route_id:rpc_success",
                    "message": "RPC call succeeded",
                    "data": {"rpc_result": str(rpc_result.data) if rpc_result.data else "None"},
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                
                if rpc_result.data and len(rpc_result.data) > 0:
                    payments_updated = rpc_result.data[0].get("payments_updated", 0)
                    payments_still_missing = rpc_result.data[0].get("payments_still_missing", 0)
                else:
                    payments_updated = 0
                    payments_still_missing = payments_needing_backfill
                    print("[DB] WARNING: RPC returned empty result")
            except Exception as rpc_error:
                # Fallback: If RPC function doesn't exist, use direct batch update via Supabase client
                # This is a workaround if migration hasn't been run yet
                print(f"[DB] RPC function not available ({rpc_error}), using direct batch update")
                
                # #region agent log
                log_data = {
                    "location": "supabase_db.py:backfill_payment_route_id:rpc_failed",
                    "message": "RPC failed, using fallback",
                    "data": {"error": str(rpc_error)},
                    "timestamp": int(datetime.now().timestamp() * 1000),
                    "sessionId": "debug-session",
                    "runId": "run1",
                    "hypothesisId": "A"
                }
                try:
                    with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                        f.write(json.dumps(log_data) + "\n")
                except: pass
                # #endregion
                
                # Fallback: If RPC function doesn't exist, we cannot do single batch SQL
                # In this case, return error asking to run migration first
                payments_updated = 0
                payments_still_missing = payments_needing_backfill
                raise ValueError(
                    f"backfill_payment_route_id() PostgreSQL function not found. "
                    f"Please run migration: 20260113000002_create_backfill_payment_route_id_function.sql"
                )
            
            # #region agent log
            log_data = {
                "location": "supabase_db.py:backfill_payment_route_id:result",
                "message": "Backfill execution result",
                "data": {
                    "payments_updated": payments_updated,
                    "payments_still_missing": payments_still_missing
                },
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            result = {
                "status": "success",
                "dry_run": False,
                "payments_found": payments_with_null_route_id,
                "payments_needing_backfill": payments_needing_backfill,
                "payments_updated": payments_updated,
                "payments_still_missing": payments_still_missing,
                "message": f"Updated {payments_updated} payments via single batch SQL UPDATE" + 
                          (f", {payments_still_missing} still missing route_id" if payments_still_missing > 0 else "")
            }
            
            print(f"[DB] backfill_payment_route_id: {result['message']}")
            return result
            
        except Exception as e:
            error_msg = str(e)
            error_type = type(e).__name__
            print(f"[DB] Error in backfill_payment_route_id: {error_type}: {error_msg}")
            import traceback
            traceback.print_exc()
            
            # #region agent log
            log_data = {
                "location": "supabase_db.py:backfill_payment_route_id:error",
                "message": "Backfill error",
                "data": {"error": error_msg, "error_type": error_type},
                "timestamp": int(datetime.now().timestamp() * 1000),
                "sessionId": "debug-session",
                "runId": "run1",
                "hypothesisId": "A"
            }
            try:
                with open("c:\\Users\\User\\DistroHub\\.cursor\\debug.log", "a") as f:
                    f.write(json.dumps(log_data) + "\n")
            except: pass
            # #endregion
            
            return {
                "status": "error",
                "dry_run": dry_run,
                "error": error_msg,
                "error_type": error_type
            }
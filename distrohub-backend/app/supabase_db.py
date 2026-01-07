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
        self.client.table("products").delete().eq("id", product_id).execute()
        return True
    
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
        sales_report = []
        total_gross = 0.0
        total_returned_items = 0
        
        for sale in sales:
            sale_id = sale["id"]
            sale["payment_status"] = PaymentStatus(sale["payment_status"]) if sale.get("payment_status") else PaymentStatus.DUE
            sale["status"] = OrderStatus(sale["status"]) if sale.get("status") else OrderStatus.PENDING
            
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
        
        if data.get("sale_id"):
            sale = self.get_sale(data["sale_id"])
            if sale:
                new_paid = sale["paid_amount"] + data["amount"]
                new_due = sale["due_amount"] - data["amount"]
                payment_status = "paid" if new_due <= 0 else "partial"
                self.client.table("sales").update({
                    "paid_amount": new_paid,
                    "due_amount": new_due,
                    "payment_status": payment_status
                }).eq("id", data["sale_id"]).execute()
        
        payment_data = {
            "retailer_id": data["retailer_id"],
            "retailer_name": retailer["name"],
            "sale_id": data.get("sale_id"),
            "amount": data["amount"],
            "payment_method": data["payment_method"],
            "notes": data.get("notes")
        }
        result = self.client.table("payments").insert(payment_data).execute()
        return result.data[0] if result.data else payment_data
    
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
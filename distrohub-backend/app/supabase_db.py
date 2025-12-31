import os
import hashlib
from datetime import datetime, date
from typing import Dict, List, Optional
from supabase import create_client, Client
from app.models import (
    UserRole, PaymentStatus, OrderStatus, ExpiryStatus,
    ProductBatch, InventoryItem, ExpiryAlert, DashboardStats
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
        result = self.client.table("products").insert(data).execute()
        return result.data[0] if result.data else data
    
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
    
    def get_purchases(self) -> List[dict]:
        result = self.client.table("purchases").select("*").execute()
        return result.data or []
    
    def get_sales(self) -> List[dict]:
        result = self.client.table("sales").select("*").order("created_at", desc=True).execute()
        sales = result.data or []
        for sale in sales:
            sale["payment_status"] = PaymentStatus(sale["payment_status"]) if sale.get("payment_status") else PaymentStatus.DUE
            sale["status"] = OrderStatus(sale["status"]) if sale.get("status") else OrderStatus.PENDING
            items_result = self.client.table("sale_items").select("*").eq("sale_id", sale["id"]).execute()
            sale["items"] = items_result.data or []
        return sales
    
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
                        batch_number=batch["batch_number"],
                        expiry_date=expiry_date,
                        quantity=batch["quantity"],
                        days_until_expiry=days_until_expiry,
                        status=status
                    ))
        
        return sorted(alerts, key=lambda x: x.days_until_expiry)
    
    def get_dashboard_stats(self) -> DashboardStats:
        sales = self.get_sales()
        retailers = self.get_retailers()
        products = self.get_products()
        payments = self.get_payments()
        
        total_sales = sum(float(s.get("total_amount", 0)) for s in sales)
        total_due = sum(float(r.get("total_due", 0)) for r in retailers)
        total_products = len(products)
        active_retailers = len(retailers)
        
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
        
        return DashboardStats(
            total_sales=total_sales,
            total_due=total_due,
            total_products=total_products,
            active_retailers=active_retailers,
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

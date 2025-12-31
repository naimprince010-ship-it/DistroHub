from datetime import datetime, date, timedelta
from typing import Dict, List, Optional
import uuid
import hashlib
from app.models import (
    User, UserRole, Product, ProductBatch, Retailer, Purchase, PurchaseItem,
    Sale, SaleItem, Payment, PaymentStatus, OrderStatus, ExpiryStatus,
    InventoryItem, ExpiryAlert, DashboardStats
)

def generate_id() -> str:
    return str(uuid.uuid4())[:8]

def generate_invoice_number() -> str:
    return f"INV-{datetime.now().strftime('%Y%m%d')}-{generate_id()[:4].upper()}"

class InMemoryDatabase:
    def __init__(self):
        self.users: Dict[str, dict] = {}
        self.products: Dict[str, dict] = {}
        self.batches: Dict[str, dict] = {}
        self.retailers: Dict[str, dict] = {}
        self.purchases: Dict[str, dict] = {}
        self.sales: Dict[str, dict] = {}
        self.payments: Dict[str, dict] = {}
        self._seed_data()
    
    def _seed_data(self):
        admin_id = generate_id()
        self.users[admin_id] = {
            "id": admin_id,
            "email": "admin@distrohub.com",
            "name": "Admin User",
            "role": UserRole.ADMIN,
            "phone": "01700000000",
            "password_hash": hashlib.sha256("admin123".encode()).hexdigest(),
            "created_at": datetime.now()
        }
        
        sales_id = generate_id()
        self.users[sales_id] = {
            "id": sales_id,
            "email": "sales@distrohub.com",
            "name": "Sales Rep",
            "role": UserRole.SALES_REP,
            "phone": "01711111111",
            "password_hash": hashlib.sha256("sales123".encode()).hexdigest(),
            "created_at": datetime.now()
        }
        
        products_data = [
            {"name": "Akij Flour 1kg", "sku": "AKJ-FLR-1KG", "category": "Flour", "unit": "kg", "pack_size": 12, "purchase_price": 55, "selling_price": 62},
            {"name": "Akij Flour 2kg", "sku": "AKJ-FLR-2KG", "category": "Flour", "unit": "kg", "pack_size": 6, "purchase_price": 105, "selling_price": 120},
            {"name": "Fresh Powder Milk 500g", "sku": "FRS-PWD-500G", "category": "Dairy", "unit": "g", "pack_size": 24, "purchase_price": 320, "selling_price": 350},
            {"name": "Fresh Powder Milk 1kg", "sku": "FRS-PWD-1KG", "category": "Dairy", "unit": "kg", "pack_size": 12, "purchase_price": 620, "selling_price": 680},
            {"name": "Akij Rice 5kg", "sku": "AKJ-RIC-5KG", "category": "Rice", "unit": "kg", "pack_size": 4, "purchase_price": 280, "selling_price": 320},
            {"name": "Akij Rice 25kg", "sku": "AKJ-RIC-25KG", "category": "Rice", "unit": "kg", "pack_size": 1, "purchase_price": 1350, "selling_price": 1500},
            {"name": "Speed Energy Drink 250ml", "sku": "SPD-ENR-250ML", "category": "Beverages", "unit": "ml", "pack_size": 24, "purchase_price": 35, "selling_price": 40},
            {"name": "Mojo Cola 250ml", "sku": "MOJ-COL-250ML", "category": "Beverages", "unit": "ml", "pack_size": 24, "purchase_price": 18, "selling_price": 22},
        ]
        
        for p in products_data:
            pid = generate_id()
            self.products[pid] = {
                "id": pid,
                **p,
                "created_at": datetime.now()
            }
            
            bid = generate_id()
            self.batches[bid] = {
                "id": bid,
                "product_id": pid,
                "batch_number": f"B{datetime.now().strftime('%Y%m')}-{generate_id()[:4].upper()}",
                "expiry_date": date.today() + timedelta(days=180),
                "quantity": 100,
                "purchase_price": p["purchase_price"],
                "created_at": datetime.now()
            }
        
        retailers_data = [
            {"name": "Karim Mia", "shop_name": "Karim Store", "phone": "01812345678", "address": "123 Main Road", "area": "Mirpur", "credit_limit": 50000},
            {"name": "Rahim Uddin", "shop_name": "Rahim Grocery", "phone": "01912345678", "address": "45 Market Street", "area": "Uttara", "credit_limit": 30000},
            {"name": "Jamal Hossain", "shop_name": "Jamal Mart", "phone": "01712345678", "address": "78 Station Road", "area": "Dhanmondi", "credit_limit": 75000},
            {"name": "Salim Ahmed", "shop_name": "Salim Store", "phone": "01612345678", "address": "12 College Road", "area": "Gulshan", "credit_limit": 100000},
        ]
        
        for r in retailers_data:
            rid = generate_id()
            self.retailers[rid] = {
                "id": rid,
                **r,
                "total_due": 0,
                "created_at": datetime.now()
            }
    
    def hash_password(self, password: str) -> str:
        return hashlib.sha256(password.encode()).hexdigest()
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return self.hash_password(plain_password) == hashed_password
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        for user in self.users.values():
            if user["email"] == email:
                return user
        return None
    
    def create_user(self, email: str, name: str, password: str, role: UserRole, phone: str = None) -> dict:
        user_id = generate_id()
        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "phone": phone,
            "password_hash": self.hash_password(password),
            "created_at": datetime.now()
        }
        self.users[user_id] = user
        return user
    
    def get_products(self) -> List[dict]:
        return list(self.products.values())
    
    def get_product(self, product_id: str) -> Optional[dict]:
        return self.products.get(product_id)
    
    def create_product(self, data: dict) -> dict:
        product_id = generate_id()
        product = {
            "id": product_id,
            **data,
            "created_at": datetime.now()
        }
        self.products[product_id] = product
        return product
    
    def update_product(self, product_id: str, data: dict) -> Optional[dict]:
        if product_id in self.products:
            self.products[product_id].update(data)
            return self.products[product_id]
        return None
    
    def delete_product(self, product_id: str) -> bool:
        if product_id in self.products:
            del self.products[product_id]
            return True
        return False
    
    def get_batches_by_product(self, product_id: str) -> List[dict]:
        return [b for b in self.batches.values() if b["product_id"] == product_id]
    
    def get_batch(self, batch_id: str) -> Optional[dict]:
        return self.batches.get(batch_id)
    
    def create_batch(self, data: dict) -> dict:
        batch_id = generate_id()
        batch = {
            "id": batch_id,
            **data,
            "created_at": datetime.now()
        }
        self.batches[batch_id] = batch
        return batch
    
    def update_batch_quantity(self, batch_id: str, quantity_change: int) -> Optional[dict]:
        if batch_id in self.batches:
            self.batches[batch_id]["quantity"] += quantity_change
            return self.batches[batch_id]
        return None
    
    def get_retailers(self) -> List[dict]:
        return list(self.retailers.values())
    
    def get_retailer(self, retailer_id: str) -> Optional[dict]:
        return self.retailers.get(retailer_id)
    
    def create_retailer(self, data: dict) -> dict:
        retailer_id = generate_id()
        retailer = {
            "id": retailer_id,
            **data,
            "total_due": 0,
            "created_at": datetime.now()
        }
        self.retailers[retailer_id] = retailer
        return retailer
    
    def update_retailer(self, retailer_id: str, data: dict) -> Optional[dict]:
        if retailer_id in self.retailers:
            self.retailers[retailer_id].update(data)
            return self.retailers[retailer_id]
        return None
    
    def update_retailer_due(self, retailer_id: str, amount_change: float) -> Optional[dict]:
        if retailer_id in self.retailers:
            self.retailers[retailer_id]["total_due"] += amount_change
            return self.retailers[retailer_id]
        return None
    
    def delete_retailer(self, retailer_id: str) -> bool:
        if retailer_id in self.retailers:
            del self.retailers[retailer_id]
            return True
        return False
    
    def get_purchases(self) -> List[dict]:
        return list(self.purchases.values())
    
    def create_purchase(self, data: dict, items: List[dict]) -> dict:
        purchase_id = generate_id()
        total_amount = 0
        purchase_items = []
        
        for item in items:
            product = self.get_product(item["product_id"])
            if not product:
                continue
            
            item_total = item["quantity"] * item["unit_price"]
            total_amount += item_total
            
            batch = self.create_batch({
                "product_id": item["product_id"],
                "batch_number": item["batch_number"],
                "expiry_date": item["expiry_date"],
                "quantity": item["quantity"],
                "purchase_price": item["unit_price"]
            })
            
            purchase_items.append({
                "id": generate_id(),
                "purchase_id": purchase_id,
                "product_id": item["product_id"],
                "product_name": product["name"],
                "batch_number": item["batch_number"],
                "expiry_date": item["expiry_date"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "total": item_total
            })
        
        purchase = {
            "id": purchase_id,
            "supplier_name": data["supplier_name"],
            "invoice_number": data["invoice_number"],
            "items": purchase_items,
            "total_amount": total_amount,
            "notes": data.get("notes"),
            "created_at": datetime.now()
        }
        self.purchases[purchase_id] = purchase
        return purchase
    
    def get_sales(self) -> List[dict]:
        return list(self.sales.values())
    
    def get_sale(self, sale_id: str) -> Optional[dict]:
        return self.sales.get(sale_id)
    
    def create_sale(self, data: dict, items: List[dict]) -> dict:
        sale_id = generate_id()
        retailer = self.get_retailer(data["retailer_id"])
        if not retailer:
            raise ValueError("Retailer not found")
        
        subtotal = 0
        total_discount = 0
        sale_items = []
        
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
            
            self.update_batch_quantity(item["batch_id"], -item["quantity"])
            
            sale_items.append({
                "id": generate_id(),
                "sale_id": sale_id,
                "product_id": item["product_id"],
                "product_name": product["name"],
                "batch_number": batch["batch_number"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "discount": item_discount,
                "total": item_total
            })
        
        total_amount = subtotal - total_discount
        paid_amount = data.get("paid_amount", 0)
        due_amount = total_amount - paid_amount
        
        if due_amount <= 0:
            payment_status = PaymentStatus.PAID
        elif paid_amount > 0:
            payment_status = PaymentStatus.PARTIAL
        else:
            payment_status = PaymentStatus.DUE
        
        if due_amount > 0:
            self.update_retailer_due(data["retailer_id"], due_amount)
        
        sale = {
            "id": sale_id,
            "invoice_number": generate_invoice_number(),
            "retailer_id": data["retailer_id"],
            "retailer_name": retailer["name"],
            "items": sale_items,
            "subtotal": subtotal,
            "discount": total_discount,
            "total_amount": total_amount,
            "paid_amount": paid_amount,
            "due_amount": due_amount,
            "payment_status": payment_status,
            "status": OrderStatus.CONFIRMED,
            "notes": data.get("notes"),
            "created_at": datetime.now()
        }
        self.sales[sale_id] = sale
        return sale
    
    def get_payments(self) -> List[dict]:
        return list(self.payments.values())
    
    def create_payment(self, data: dict) -> dict:
        payment_id = generate_id()
        retailer = self.get_retailer(data["retailer_id"])
        if not retailer:
            raise ValueError("Retailer not found")
        
        self.update_retailer_due(data["retailer_id"], -data["amount"])
        
        if data.get("sale_id"):
            sale = self.get_sale(data["sale_id"])
            if sale:
                sale["paid_amount"] += data["amount"]
                sale["due_amount"] -= data["amount"]
                if sale["due_amount"] <= 0:
                    sale["payment_status"] = PaymentStatus.PAID
                else:
                    sale["payment_status"] = PaymentStatus.PARTIAL
        
        payment = {
            "id": payment_id,
            "retailer_id": data["retailer_id"],
            "retailer_name": retailer["name"],
            "sale_id": data.get("sale_id"),
            "amount": data["amount"],
            "payment_method": data["payment_method"],
            "notes": data.get("notes"),
            "created_at": datetime.now()
        }
        self.payments[payment_id] = payment
        return payment
    
    def get_inventory(self) -> List[InventoryItem]:
        inventory = []
        for product in self.products.values():
            batches = self.get_batches_by_product(product["id"])
            total_stock = sum(b["quantity"] for b in batches)
            inventory.append(InventoryItem(
                product_id=product["id"],
                product_name=product["name"],
                sku=product["sku"],
                category=product["category"],
                total_stock=total_stock,
                batches=[ProductBatch(**b) for b in batches]
            ))
        return inventory
    
    def get_expiry_alerts(self) -> List[ExpiryAlert]:
        alerts = []
        today = date.today()
        
        for batch in self.batches.values():
            if batch["quantity"] <= 0:
                continue
            
            product = self.get_product(batch["product_id"])
            if not product:
                continue
            
            days_until_expiry = (batch["expiry_date"] - today).days
            
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
                    expiry_date=batch["expiry_date"],
                    quantity=batch["quantity"],
                    days_until_expiry=days_until_expiry,
                    status=status
                ))
        
        return sorted(alerts, key=lambda x: x.days_until_expiry)
    
    def get_dashboard_stats(self) -> DashboardStats:
        total_sales = sum(s["total_amount"] for s in self.sales.values())
        total_due = sum(r["total_due"] for r in self.retailers.values())
        total_products = len(self.products)
        active_retailers = len(self.retailers)
        
        this_month = datetime.now().replace(day=1)
        sales_this_month = sum(
            s["total_amount"] for s in self.sales.values()
            if s["created_at"] >= this_month
        )
        collections_this_month = sum(
            p["amount"] for p in self.payments.values()
            if p["created_at"] >= this_month
        )
        
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
        for retailer in self.retailers.values():
            if retailer["total_due"] > 0:
                last_payment = None
                for payment in self.payments.values():
                    if payment["retailer_id"] == retailer["id"]:
                        if last_payment is None or payment["created_at"] > last_payment:
                            last_payment = payment["created_at"]
                
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

import os

def get_database():
    use_supabase = os.environ.get("USE_SUPABASE", "").lower() == "true"
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if use_supabase and supabase_url and supabase_key:
        try:
            from app.supabase_db import SupabaseDatabase
            return SupabaseDatabase()
        except Exception as e:
            print(f"Failed to connect to Supabase: {e}, falling back to in-memory database")
    
    return InMemoryDatabase()

db = get_database()

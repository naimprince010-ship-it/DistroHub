from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Tuple
import uuid
import hashlib
import bcrypt as _bcrypt_lib
from app.models import (
    User, UserRole, normalize_user_role, Product, ProductBatch, Retailer, Purchase, PurchaseItem,
    Sale, SaleItem, Payment, PaymentStatus, OrderStatus, ExpiryStatus,
    InventoryItem, ExpiryAlert, DashboardStats, Category, Supplier, Unit,
    Warehouse
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
        self.market_routes: Dict[str, dict] = {}
        self.purchases: Dict[str, dict] = {}
        self.sales: Dict[str, dict] = {}
        self.payments: Dict[str, dict] = {}
        self.categories: Dict[str, dict] = {}
        self.suppliers: Dict[str, dict] = {}
        self.units: Dict[str, dict] = {}
        self.warehouses: Dict[str, dict] = {}
        self.product_templates: Dict[str, dict] = {}
        self.product_variants: Dict[str, dict] = {}
        self.uom_conversions: Dict[str, dict] = {}
        self.price_lists: Dict[str, dict] = {}
        self.price_list_items: Dict[str, dict] = {}
        self.retailer_price_list_assignments: Dict[str, dict] = {}
        self.reorder_policies: Dict[str, dict] = {}
        self.reorder_suggestions: Dict[str, dict] = {}
        self.receivable_ledger: List[dict] = []
        self.credit_policies: Dict[str, dict] = {}
        self.credit_overrides: Dict[str, dict] = {}
        self.sale_item_cost_snapshots: Dict[str, dict] = {}
        self.sms_queue: Dict[str, dict] = {}
        self.sms_logs: List[dict] = []
        self.audit_logs: List[dict] = []
        self.stock_ledger: List[dict] = []
        self.sr_risk_adjustments: Dict[str, dict] = {}
        self._seed_data()
    
    def _seed_data(self):
        # ⚠️ FIXED IDs — do NOT change these. They must stay constant across
        # server restarts so that JWT tokens remain valid.
        admin_id = "admin-distrohub-0001"
        self.users[admin_id] = {
            "id": admin_id,
            "email": "admin@distrohub.com",
            "name": "Admin User",
            "role": UserRole.ADMIN,
            "phone": "01700000000",
            "password_hash": _bcrypt_lib.hashpw(b"admin123", _bcrypt_lib.gensalt()).decode(),
            "sr_guarantee_limit": 0.0,
            "sr_guarantee_enforcement": "off",
            "created_at": datetime.now()
        }

        dsr_id = "sales-distrohub-0001"
        self.users[dsr_id] = {
            "id": dsr_id,
            "email": "sales@distrohub.com",
            "name": "DSR User",
            "role": UserRole.DSR,
            "phone": "01711111111",
            "password_hash": _bcrypt_lib.hashpw(b"sales123", _bcrypt_lib.gensalt()).decode(),
            "sr_guarantee_limit": 0.0,
            "sr_guarantee_enforcement": "off",
            "created_at": datetime.now()
        }
        sr_id = "sr-distrohub-0001"
        self.users[sr_id] = {
            "id": sr_id,
            "email": "sr@distrohub.com",
            "name": "SR User",
            "role": UserRole.SR,
            "phone": "01722222222",
            "password_hash": _bcrypt_lib.hashpw(b"sruser123", _bcrypt_lib.gensalt()).decode(),
            "sr_guarantee_limit": 50000.0,
            "sr_guarantee_enforcement": "block",
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
        
        # Seed categories
        categories_data = [
            {"name": "Flour", "description": "All types of flour products", "color": "#EF4444"},
            {"name": "Dairy", "description": "Milk, butter, cheese products", "color": "#F59E0B"},
            {"name": "Beverages", "description": "Soft drinks, juices, water", "color": "#10B981"},
            {"name": "Snacks", "description": "Chips, biscuits, cookies", "color": "#6366F1"},
            {"name": "Oil", "description": "Cooking oils and ghee", "color": "#8B5CF6"},
            {"name": "Rice", "description": "All varieties of rice", "color": "#EC4899"},
            {"name": "Spices", "description": "Spices and seasonings", "color": "#F97316"},
        ]
        
        for c in categories_data:
            cid = generate_id()
            self.categories[cid] = {
                "id": cid,
                **c,
                "created_at": datetime.now()
            }
        
        # Seed suppliers
        suppliers_data = [
            {"name": "Akij Food & Beverage Ltd", "contact_person": "Mr. Rahman", "phone": "01711111111", "email": "sales@akij.com", "address": "Dhaka, Bangladesh"},
            {"name": "Fresh Dairy Products", "contact_person": "Mr. Karim", "phone": "01722222222", "email": "info@freshdairy.com", "address": "Chittagong, Bangladesh"},
            {"name": "Bengal Spices Co.", "contact_person": "Ms. Fatima", "phone": "01733333333", "email": "orders@bengalspices.com", "address": "Sylhet, Bangladesh"},
        ]
        
        for s in suppliers_data:
            sid = generate_id()
            self.suppliers[sid] = {
                "id": sid,
                **s,
                "created_at": datetime.now()
            }
        
        # Seed units
        units_data = [
            {"name": "Kilogram", "abbreviation": "kg", "description": "Weight measurement"},
            {"name": "Gram", "abbreviation": "g", "description": "Weight measurement"},
            {"name": "Liter", "abbreviation": "L", "description": "Volume measurement"},
            {"name": "Milliliter", "abbreviation": "ml", "description": "Volume measurement"},
            {"name": "Piece", "abbreviation": "pcs", "description": "Count measurement"},
            {"name": "Pack", "abbreviation": "pack", "description": "Package unit"},
            {"name": "Box", "abbreviation": "box", "description": "Box container"},
            {"name": "Dozen", "abbreviation": "dz", "description": "12 pieces"},
        ]
        
        for u in units_data:
            uid = generate_id()
            self.units[uid] = {
                "id": uid,
                **u,
                "created_at": datetime.now()
            }
        
        # Seed warehouses
        wid = generate_id()
        self.warehouses[wid] = {
            "id": wid,
            "name": "Main Warehouse",
            "address": "Dhaka",
            "created_at": datetime.now()
        }
    
    def hash_password(self, password: str) -> str:
        """Hash password using bcrypt."""
        pwd_bytes = password.encode("utf-8")[:72]
        salt = _bcrypt_lib.gensalt(rounds=12)
        return _bcrypt_lib.hashpw(pwd_bytes, salt).decode("utf-8")

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify password. Supports both bcrypt (new) and SHA-256 (legacy) hashes."""
        if not hashed_password:
            return False
        if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
            try:
                return _bcrypt_lib.checkpw(
                    plain_password.encode("utf-8")[:72],
                    hashed_password.encode("utf-8")
                )
            except Exception:
                return False
        else:
            # Legacy SHA-256 fallback
            return hashlib.sha256(plain_password.encode()).hexdigest() == hashed_password

    def log_audit_event(
        self,
        actor_id: Optional[str],
        action: str,
        entity_type: Optional[str],
        entity_id: Optional[str],
        metadata: dict,
        ip_address: str,
        user_agent: str,
    ) -> dict:
        log_entry = {
            "id": generate_id(),
            "actor_id": actor_id,
            "action": action,
            "entity_type": entity_type,
            "entity_id": entity_id,
            "metadata": metadata,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "created_at": datetime.now(),
        }
        self.audit_logs.append(log_entry)
        return log_entry
    
    def get_user_by_email(self, email: str) -> Optional[dict]:
        for user in self.users.values():
            if user["email"] == email:
                return user
        return None

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        return self.users.get(user_id)

    def get_users(self) -> List[dict]:
        return sorted(self.users.values(), key=lambda user: user.get("created_at", datetime.min), reverse=True)
    
    def create_user(self, email: str, name: str, password: str, role: UserRole, phone: str = None) -> dict:
        user_id = generate_id()
        user = {
            "id": user_id,
            "email": email,
            "name": name,
            "role": role,
            "phone": phone,
            "password_hash": self.hash_password(password),
            "sr_guarantee_limit": 0.0,
            "sr_guarantee_enforcement": "off",
            "created_at": datetime.now()
        }
        self.users[user_id] = user
        return user

    def update_user(self, user_id: str, data: dict) -> Optional[dict]:
        user = self.users.get(user_id)
        if not user:
            return None
        if "name" in data and data["name"] is not None:
            user["name"] = data["name"]
        if "email" in data and data["email"] is not None:
            user["email"] = data["email"]
        if "phone" in data:
            user["phone"] = data["phone"] if data["phone"] else None
        if "password" in data and data.get("password"):
            user["password_hash"] = self.hash_password(data["password"])
        if "role" in data and data["role"] is not None:
            r = data["role"]
            user["role"] = r if isinstance(r, UserRole) else normalize_user_role(r)
        if "sr_guarantee_limit" in data and data["sr_guarantee_limit"] is not None:
            user["sr_guarantee_limit"] = float(data["sr_guarantee_limit"])
        if "sr_guarantee_enforcement" in data and data["sr_guarantee_enforcement"] is not None:
            e = data["sr_guarantee_enforcement"]
            user["sr_guarantee_enforcement"] = e.value if hasattr(e, "value") else str(e)
        return user

    def delete_user(self, user_id: str) -> bool:
        if user_id not in self.users:
            return False
        del self.users[user_id]

        for sale in self.sales.values():
            if sale.get("assigned_to") == user_id:
                sale["assigned_to"] = None
                sale["assigned_to_name"] = None

        for payment in self.payments.values():
            if payment.get("collected_by") == user_id:
                payment["collected_by"] = None
                payment["collected_by_name"] = None

        return True
    
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

    def update_product_stock(self, product_id: str, quantity_change: int) -> Optional[dict]:
        if product_id not in self.products:
            return None
        current_qty = int(self.products[product_id].get("stock_quantity", 0) or 0)
        new_qty = current_qty + int(quantity_change)
        if new_qty < 0:
            new_qty = 0
        self.products[product_id]["stock_quantity"] = new_qty
        return self.products[product_id]
    
    def delete_product(self, product_id: str) -> bool:
        if product_id in self.products:
            del self.products[product_id]
            return True
        return False
    
    def get_batches_by_product(self, product_id: str, warehouse_id: Optional[str] = None) -> List[dict]:
        batches = [b for b in self.batches.values() if b["product_id"] == product_id]
        if warehouse_id:
            batches = [b for b in batches if b.get("warehouse_id") == warehouse_id]
        return batches
    
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

    def get_market_routes(self) -> List[dict]:
        return list(self.market_routes.values())

    def get_market_route(self, route_id: str) -> Optional[dict]:
        return self.market_routes.get(route_id)

    def create_market_route(self, data: dict) -> dict:
        route_id = generate_id()
        route = {
            "id": route_id,
            **data,
            "created_at": datetime.now()
        }
        self.market_routes[route_id] = route
        return route

    def update_market_route(self, route_id: str, data: dict) -> Optional[dict]:
        if route_id in self.market_routes:
            self.market_routes[route_id].update(data)
            return self.market_routes[route_id]
        return None

    def delete_market_route(self, route_id: str) -> bool:
        if route_id in self.market_routes:
            del self.market_routes[route_id]
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

            self.update_product_stock(item["product_id"], item["quantity"])
            
            purchase_items.append({
                "id": generate_id(),
                "purchase_id": purchase_id,
                "product_id": item["product_id"],
                "product_name": product["name"],
                "batch_id": batch["id"],
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
            "paid_amount": float(data.get("paid_amount", 0)),
            "due_amount": max(0, total_amount - float(data.get("paid_amount", 0))),
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
            self.update_product_stock(item["product_id"], -item["quantity"])
            
            sale_items.append({
                "id": generate_id(),
                "sale_id": sale_id,
                "product_id": item["product_id"],
                "product_name": product["name"],
                "batch_id": item["batch_id"],
                "batch_number": batch["batch_number"],
                "quantity": item["quantity"],
                "unit_price": item["unit_price"],
                "discount": item_discount,
                "total": item_total,
                "variant_id": item.get("variant_id"),
                "uom": item.get("uom"),
                "uom_quantity": item.get("uom_quantity"),
                "price_list_id": item.get("price_list_id"),
                "base_price": item.get("base_price", item.get("unit_price")),
                "resolved_price": item.get("resolved_price", item.get("unit_price")),
                "price_source": item.get("price_source", "manual")
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

        assigned_to = data.get("assigned_to")
        assigned_to_name = None
        if assigned_to:
            au = self.get_user_by_id(assigned_to)
            if au:
                assigned_to_name = au.get("name")
        created_by = data.get("created_by")
        created_by_name = None
        if created_by:
            cu = self.get_user_by_id(created_by)
            if cu:
                created_by_name = cu.get("name")
        
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
            "assigned_to": assigned_to,
            "assigned_to_name": assigned_to_name,
            "created_by": created_by,
            "created_by_name": created_by_name,
            "terms_days": int(data.get("terms_days", 0) or 0),
            "due_date": data.get("due_date"),
            "credit_status": "open" if due_amount > 0 else "settled",
            "credit_risk_bearer": data.get("credit_risk_bearer") or "company",
            "sr_liable_user_id": data.get("sr_liable_user_id"),
            "created_at": datetime.now()
        }
        self.sales[sale_id] = sale
        if due_amount > 0:
            self.add_receivable_ledger_entry({
                "retailer_id": data["retailer_id"],
                "sale_id": sale_id,
                "entry_type": "sale",
                "amount": due_amount,
                "reference_type": "sale",
                "reference_id": sale_id,
                "remarks": "sale_due_created",
            })
        for line in sale_items:
            quantity = int(line.get("quantity", 0) or 0)
            cogs_unit = float(self.get_product(line.get("product_id") or "").get("purchase_price", 0) if self.get_product(line.get("product_id") or "") else 0)
            net_sales = float(line.get("total", 0) or 0)
            cogs_total = cogs_unit * quantity
            margin_amount = net_sales - cogs_total
            margin_percent = (margin_amount / net_sales * 100) if net_sales > 0 else 0
            self.record_sale_item_cost_snapshot({
                "sale_id": sale_id,
                "sale_item_id": line.get("id"),
                "product_id": line.get("product_id"),
                "product_name": line.get("product_name"),
                "batch_id": line.get("batch_id"),
                "quantity": quantity,
                "cost_method": "moving_avg",
                "cogs_unit": cogs_unit,
                "cogs_total": cogs_total,
                "net_sales": net_sales,
                "margin_amount": margin_amount,
                "margin_percent": margin_percent,
            })
        return sale

    def update_sale(self, sale_id: str, data: dict) -> Optional[dict]:
        """Mirror supabase sale update for InMemory (admin + DSR delivery paths in API)."""
        current_sale = self.get_sale(sale_id)
        if not current_sale:
            return None
        total_amount = float(current_sale.get("total_amount", 0))
        current_paid = float(current_sale.get("paid_amount", 0))
        retailer_id = current_sale.get("retailer_id")
        update_data: Dict = {}
        paid_amount_changed = False
        old_paid = current_paid
        if "paid_amount" in data and data["paid_amount"] is not None:
            new_paid = float(data["paid_amount"])
            if new_paid != current_paid:
                paid_amount_changed = True
                update_data["paid_amount"] = new_paid
                new_due = max(0, total_amount - new_paid)
                update_data["due_amount"] = new_due
                if new_due <= 0:
                    update_data["payment_status"] = PaymentStatus.PAID
                elif new_paid > 0:
                    update_data["payment_status"] = PaymentStatus.PARTIAL
                else:
                    update_data["payment_status"] = PaymentStatus.DUE
        if "due_amount" in data and data["due_amount"] is not None:
            new_due = max(0, float(data["due_amount"]))
            update_data["due_amount"] = new_due
            current_paid_for_status = update_data.get("paid_amount", current_paid)
            if new_due <= 0:
                update_data["payment_status"] = PaymentStatus.PAID
            elif current_paid_for_status > 0:
                update_data["payment_status"] = PaymentStatus.PARTIAL
            else:
                update_data["payment_status"] = PaymentStatus.DUE
        if "payment_status" in data and data["payment_status"] is not None:
            ps = data["payment_status"]
            update_data["payment_status"] = ps if isinstance(ps, PaymentStatus) else PaymentStatus(ps)
        if "delivery_status" in data and data["delivery_status"] is not None:
            update_data["delivery_status"] = data["delivery_status"]
            if data["delivery_status"] == "delivered" and "delivered_at" not in data and not current_sale.get("delivered_at"):
                update_data["delivered_at"] = datetime.now().isoformat()
        if "delivered_at" in data and data["delivered_at"] is not None:
            dv = data["delivered_at"]
            update_data["delivered_at"] = dv.isoformat() if isinstance(dv, datetime) else dv
        if "notes" in data:
            update_data["notes"] = data["notes"]
        if "assigned_to" in data:
            at = data["assigned_to"]
            update_data["assigned_to"] = at
            an = None
            if at:
                u = self.get_user_by_id(at)
                if u:
                    an = u.get("name")
            update_data["assigned_to_name"] = an
        if paid_amount_changed and retailer_id:
            paid_difference = float(update_data["paid_amount"]) - old_paid
            self.update_retailer_due(retailer_id, -paid_difference)
        if update_data:
            self.sales[sale_id].update(update_data)
        return self.get_sale(sale_id)
    
    def get_payments(
        self,
        sale_id: Optional[str] = None,
        user_id: Optional[str] = None,
        route_id: Optional[str] = None,
        from_date: Optional[str] = None,
        to_date: Optional[str] = None,
        approval_status: Optional[str] = None,
    ) -> List[dict]:
        """Get payments with optional filters (for InMemoryDatabase compatibility)"""
        payments = list(self.payments.values())
        
        if sale_id:
            payments = [p for p in payments if p.get("sale_id") == sale_id]
        if user_id:
            payments = [p for p in payments if p.get("collected_by") == user_id]
        if route_id:
            payments = [p for p in payments if p.get("route_id") == route_id]
        if approval_status:
            payments = [p for p in payments if (p.get("approval_status") or "approved") == approval_status]
        if from_date:
            from_dt = datetime.fromisoformat(from_date.replace('Z', '+00:00'))
            payments = [p for p in payments if datetime.fromisoformat(p.get("created_at", "").replace('Z', '+00:00')) >= from_dt]
        if to_date:
            to_dt = datetime.fromisoformat(to_date.replace('Z', '+00:00'))
            payments = [p for p in payments if datetime.fromisoformat(p.get("created_at", "").replace('Z', '+00:00')) <= to_dt]
        
        return payments
    
    def create_payment(self, data: dict) -> dict:
        payment_id = generate_id()
        retailer = self.get_retailer(data["retailer_id"])
        if not retailer:
            raise ValueError("Retailer not found")
        sale = self.get_sale(data["sale_id"])
        if not sale:
            raise ValueError("Sale not found")
        if sale.get("retailer_id") != data["retailer_id"]:
            raise ValueError("Sale does not belong to retailer")
        collected_user = self.get_user_by_id(data.get("collected_by"))
        if not collected_user:
            raise ValueError("Collector user not found")

        raw_ap = data.get("approval_status")
        if raw_ap is None or raw_ap == "":
            approval = "approved"
        elif hasattr(raw_ap, "value"):
            approval = raw_ap.value
        else:
            approval = str(raw_ap)
        if approval not in ("pending_approval", "approved", "rejected"):
            approval = "approved"

        if approval == "pending_approval":
            payment = {
                "id": payment_id,
                "retailer_id": data["retailer_id"],
                "retailer_name": retailer["name"],
                "sale_id": data["sale_id"],
                "amount": data["amount"],
                "payment_method": data["payment_method"],
                "route_id": sale.get("route_id"),
                "collected_by": data["collected_by"],
                "collected_by_name": collected_user.get("name"),
                "notes": data.get("notes"),
                "approval_status": "pending_approval",
                "rejection_reason": None,
                "approved_by": None,
                "approved_at": None,
                "created_at": datetime.now()
            }
            self.payments[payment_id] = payment
            return payment

        self.update_retailer_due(data["retailer_id"], -data["amount"])

        sale["paid_amount"] = float(sale.get("paid_amount", 0)) + float(data["amount"])
        sale["due_amount"] = float(sale.get("due_amount", 0)) - float(data["amount"])
        if sale["due_amount"] <= 0:
            sale["payment_status"] = PaymentStatus.PAID
        else:
            sale["payment_status"] = PaymentStatus.PARTIAL

        payment = {
            "id": payment_id,
            "retailer_id": data["retailer_id"],
            "retailer_name": retailer["name"],
            "sale_id": data["sale_id"],
            "amount": data["amount"],
            "payment_method": data["payment_method"],
            "route_id": sale.get("route_id"),
            "collected_by": data["collected_by"],
            "collected_by_name": collected_user.get("name"),
            "notes": data.get("notes"),
            "approval_status": "approved",
            "rejection_reason": None,
            "approved_by": None,
            "approved_at": None,
            "created_at": datetime.now()
        }
        self.payments[payment_id] = payment
        self.add_receivable_ledger_entry({
            "retailer_id": data["retailer_id"],
            "sale_id": data.get("sale_id"),
            "payment_id": payment_id,
            "entry_type": "payment",
            "amount": -float(data.get("amount", 0) or 0),
            "reference_type": "payment",
            "reference_id": payment_id,
            "remarks": "payment_collected",
        })
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

    def add_stock_ledger_entry(self, data: dict) -> dict:
        created_at = data.get("created_at")
        if created_at is None:
            created_at = datetime.now()
        elif isinstance(created_at, str):
            try:
                created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
            except ValueError:
                created_at = datetime.now()
        elif not isinstance(created_at, datetime):
            created_at = datetime.now()
        entry = {
            "id": generate_id(),
            "product_id": data["product_id"],
            "product_name": data.get("product_name"),
            "batch_id": data.get("batch_id"),
            "batch_number": data.get("batch_number"),
            "warehouse_id": data.get("warehouse_id"),
            "warehouse_name": data.get("warehouse_name"),
            "voucher_type": data["voucher_type"],
            "voucher_id": data.get("voucher_id"),
            "quantity_change": int(data.get("quantity_change", 0)),
            "quantity_after": data.get("quantity_after"),
            "unit_cost": data.get("unit_cost"),
            "remarks": data.get("remarks"),
            "created_by": data.get("created_by"),
            "created_at": created_at,
        }
        self.stock_ledger.append(entry)
        return entry

    def get_stock_ledger(self, product_id: Optional[str] = None, limit: int = 200) -> List[dict]:
        records = self.stock_ledger
        if product_id:
            records = [row for row in records if row.get("product_id") == product_id]
        records = sorted(records, key=lambda row: row.get("created_at", datetime.min), reverse=True)
        return records[:limit]

    def get_stock_ledger_backfill_keys(self) -> set[str]:
        keys: set[str] = set()
        for row in self.stock_ledger:
            r = row.get("remarks")
            if r and str(r).startswith("backfill:"):
                keys.add(str(r))
        return keys

    def get_stock_ledger_voucher_keys(self) -> set[tuple[str, str]]:
        keys: set[tuple[str, str]] = set()
        for row in self.stock_ledger:
            vt = row.get("voucher_type")
            vid = row.get("voucher_id")
            if vt is not None and vid is not None:
                keys.add((str(vt), str(vid)))
        return keys

    def add_stock_ledger_entries_bulk(self, rows: List[dict]) -> int:
        inserted = 0
        for row in rows:
            self.add_stock_ledger_entry(row)
            inserted += 1
        return inserted

    def get_stock_ledger_aggregates_by_product(self) -> Tuple[Dict[str, int], Dict[str, int], int]:
        """Sum quantity_change and row counts per product_id over the full ledger."""
        net: Dict[str, int] = {}
        cnt: Dict[str, int] = {}
        for row in self.stock_ledger:
            pid = row.get("product_id")
            if not pid:
                continue
            pid = str(pid)
            q = int(row.get("quantity_change") or 0)
            net[pid] = net.get(pid, 0) + q
            cnt[pid] = cnt.get(pid, 0) + 1
        return net, cnt, len(self.stock_ledger)
    
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
                    sku=product.get("sku", ""),
                    batch_number=batch["batch_number"],
                    expiry_date=batch["expiry_date"],
                    quantity=batch["quantity"],
                    days_until_expiry=days_until_expiry,
                    status=status
                ))
        
        return sorted(alerts, key=lambda x: x.days_until_expiry)
    
    def get_dashboard_stats(self) -> DashboardStats:
        from datetime import date
        
        total_sales = sum(s["total_amount"] for s in self.sales.values())
        total_due = sum(r["total_due"] for r in self.retailers.values())
        total_products = len(self.products)
        total_categories = len(self.categories)
        total_purchases = len(self.purchases)
        active_retailers = len(self.retailers)
        
        # Low stock count (products with stock < 50)
        low_stock_count = 0
        for product_id, product in self.products.items():
            batches = [b for b in self.batches.values() if b["product_id"] == product_id]
            total_stock = sum(b["quantity"] for b in batches)
            if total_stock < 50:
                low_stock_count += 1
        
        # Expiring soon count (within 30 days)
        expiring_soon_count = 0
        today = date.today()
        for batch in self.batches.values():
            expiry_date = batch.get("expiry_date")
            if expiry_date:
                if isinstance(expiry_date, str):
                    expiry_date = date.fromisoformat(expiry_date)
                days_until = (expiry_date - today).days
                if 0 <= days_until <= 30:
                    expiring_soon_count += 1
        
        # Payable to suppliers (sum of supplier dues)
        payable_to_supplier = sum(s.get("total_due", 0) for s in self.suppliers.values())
        # If no supplier due field, calculate from unpaid purchases
        if payable_to_supplier == 0:
            for purchase in self.purchases.values():
                purchase_total = purchase.get("total_amount", 0)
                paid_amount = purchase.get("paid_amount", 0)
                payable_to_supplier += max(0, purchase_total - paid_amount)
        
        receivable_from_customers = total_due
        
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
    
    # Category methods
    def get_categories(self) -> List[dict]:
        categories = []
        for cat in self.categories.values():
            product_count = sum(1 for p in self.products.values() if p.get("category") == cat["name"])
            categories.append({
                **cat,
                "product_count": product_count
            })
        return categories
    
    def get_category(self, category_id: str) -> Optional[dict]:
        cat = self.categories.get(category_id)
        if cat:
            product_count = sum(1 for p in self.products.values() if p.get("category") == cat["name"])
            return {**cat, "product_count": product_count}
        return None
    
    def create_category(self, data: dict) -> dict:
        category_id = generate_id()
        category = {
            "id": category_id,
            **data,
            "created_at": datetime.now()
        }
        self.categories[category_id] = category
        return {**category, "product_count": 0}
    
    def update_category(self, category_id: str, data: dict) -> Optional[dict]:
        if category_id in self.categories:
            old_name = self.categories[category_id]["name"]
            self.categories[category_id].update(data)
            # Update products with old category name to new name
            if data.get("name") and data["name"] != old_name:
                for product in self.products.values():
                    if product.get("category") == old_name:
                        product["category"] = data["name"]
            return self.get_category(category_id)
        return None
    
    def delete_category(self, category_id: str) -> bool:
        if category_id in self.categories:
            del self.categories[category_id]
            return True
        return False
    
    # Supplier methods
    def get_suppliers(self) -> List[dict]:
        return list(self.suppliers.values())
    
    def get_supplier(self, supplier_id: str) -> Optional[dict]:
        return self.suppliers.get(supplier_id)
    
    def create_supplier(self, data: dict) -> dict:
        supplier_id = generate_id()
        supplier = {
            "id": supplier_id,
            **data,
            "created_at": datetime.now()
        }
        self.suppliers[supplier_id] = supplier
        return supplier
    
    def update_supplier(self, supplier_id: str, data: dict) -> Optional[dict]:
        if supplier_id in self.suppliers:
            self.suppliers[supplier_id].update(data)
            return self.suppliers[supplier_id]
        return None
    
    def delete_supplier(self, supplier_id: str) -> bool:
        if supplier_id in self.suppliers:
            del self.suppliers[supplier_id]
            return True
        return False
    
    # Unit methods
    def get_units(self) -> List[dict]:
        return list(self.units.values())
    
    def get_unit(self, unit_id: str) -> Optional[dict]:
        return self.units.get(unit_id)
    
    def create_unit(self, data: dict) -> dict:
        unit_id = generate_id()
        unit = {
            "id": unit_id,
            **data,
            "created_at": datetime.now()
        }
        self.units[unit_id] = unit
        return unit
    
    def update_unit(self, unit_id: str, data: dict) -> Optional[dict]:
        if unit_id in self.units:
            self.units[unit_id].update(data)
            return self.units[unit_id]
        return None
    
    def delete_unit(self, unit_id: str) -> bool:
        if unit_id in self.units:
            del self.units[unit_id]
            return True
        return False
    
    # Warehouse methods
    def get_warehouses(self) -> List[dict]:
        return list(self.warehouses.values())
    
    def get_warehouse(self, warehouse_id: str) -> Optional[dict]:
        return self.warehouses.get(warehouse_id)
    
    def create_warehouse(self, data: dict) -> dict:
        wid = generate_id()
        w = {"id": wid, **data, "created_at": datetime.now()}
        self.warehouses[wid] = w
        return w
    
    def update_warehouse(self, warehouse_id: str, data: dict) -> Optional[dict]:
        if warehouse_id in self.warehouses:
            self.warehouses[warehouse_id].update(data)
            return self.warehouses[warehouse_id]
        return None
    
    def delete_warehouse(self, warehouse_id: str) -> bool:
        if warehouse_id in self.warehouses:
            del self.warehouses[warehouse_id]
            return True
        return False
    
    def get_warehouse_stock_count(self, warehouse_id: str) -> int:
        return sum(b["quantity"] for b in self.batches.values() if b.get("warehouse_id") == warehouse_id)
    
    def get_warehouse_stock_summary(self, warehouse_id: str) -> List[dict]:
        summary = []
        for pid, product in self.products.items():
            qty = sum(b["quantity"] for b in self.batches.values() if b.get("warehouse_id") == warehouse_id and b["product_id"] == pid)
            if qty > 0:
                summary.append({"product_id": pid, "product_name": product["name"], "total_quantity": qty})
        return summary

    # ERP upgrade: variants + UOM
    def get_product_templates(self) -> List[dict]:
        return list(self.product_templates.values())

    def create_product_template(self, data: dict) -> dict:
        template_id = generate_id()
        row = {"id": template_id, **data, "created_at": datetime.now()}
        self.product_templates[template_id] = row
        return row

    def get_product_variants(self, template_id: Optional[str] = None, product_id: Optional[str] = None) -> List[dict]:
        variants = list(self.product_variants.values())
        if template_id:
            variants = [v for v in variants if v.get("template_id") == template_id]
        if product_id:
            variants = [v for v in variants if v.get("product_id") == product_id]
        return variants

    def create_product_variant(self, data: dict) -> dict:
        variant_id = generate_id()
        row = {"id": variant_id, **data, "created_at": datetime.now()}
        self.product_variants[variant_id] = row
        return row

    def get_uom_conversions(self, product_id: Optional[str] = None) -> List[dict]:
        rows = list(self.uom_conversions.values())
        if product_id:
            rows = [r for r in rows if r.get("product_id") == product_id]
        return rows

    def upsert_uom_conversion(self, data: dict) -> dict:
        existing = next(
            (
                row for row in self.uom_conversions.values()
                if row.get("product_id") == data.get("product_id")
                and row.get("from_uom") == data.get("from_uom")
                and row.get("to_uom") == data.get("to_uom")
            ),
            None,
        )
        if existing:
            existing.update(data)
            return existing
        conversion_id = generate_id()
        row = {"id": conversion_id, **data, "created_at": datetime.now()}
        self.uom_conversions[conversion_id] = row
        return row

    # ERP upgrade: price list
    def get_price_lists(self) -> List[dict]:
        return list(self.price_lists.values())

    def create_price_list(self, data: dict) -> dict:
        price_list_id = generate_id()
        row = {"id": price_list_id, **data, "created_at": datetime.now()}
        self.price_lists[price_list_id] = row
        return row

    def get_price_list_items(self, price_list_id: Optional[str] = None) -> List[dict]:
        rows = list(self.price_list_items.values())
        if price_list_id:
            rows = [r for r in rows if r.get("price_list_id") == price_list_id]
        return rows

    def upsert_price_list_item(self, data: dict) -> dict:
        for item in self.price_list_items.values():
            if (
                item.get("price_list_id") == data.get("price_list_id")
                and item.get("product_id") == data.get("product_id")
                and item.get("variant_id") == data.get("variant_id")
                and item.get("uom") == data.get("uom")
            ):
                item.update(data)
                return item
        item_id = generate_id()
        row = {"id": item_id, **data, "created_at": datetime.now()}
        self.price_list_items[item_id] = row
        return row

    def assign_price_list_to_retailer(self, retailer_id: str, price_list_id: str) -> dict:
        for assignment in self.retailer_price_list_assignments.values():
            if assignment.get("retailer_id") == retailer_id and assignment.get("price_list_id") == price_list_id:
                return assignment
        assignment_id = generate_id()
        row = {
            "id": assignment_id,
            "retailer_id": retailer_id,
            "price_list_id": price_list_id,
            "created_at": datetime.now(),
        }
        self.retailer_price_list_assignments[assignment_id] = row
        return row

    def resolve_price(self, retailer_id: str, product_id: str, variant_id: Optional[str], quantity: float, uom: Optional[str]) -> dict:
        assignments = [
            a for a in self.retailer_price_list_assignments.values()
            if a.get("retailer_id") == retailer_id
        ]
        price_lists = [self.price_lists.get(a.get("price_list_id")) for a in assignments]
        price_lists = [pl for pl in price_lists if pl and pl.get("is_active", True)]
        price_lists = sorted(price_lists, key=lambda pl: pl.get("priority", 100))
        for pl in price_lists:
            items = [
                i for i in self.price_list_items.values()
                if i.get("price_list_id") == pl.get("id")
                and i.get("product_id") == product_id
                and (not i.get("variant_id") or i.get("variant_id") == variant_id)
                and (not i.get("uom") or i.get("uom") == uom)
                and float(quantity) >= float(i.get("min_qty", 0) or 0)
            ]
            if items:
                item = sorted(items, key=lambda i: float(i.get("min_qty", 0) or 0), reverse=True)[0]
                base_price = float(item.get("unit_price", 0) or 0)
                discount_percent = float(item.get("discount_percent", 0) or 0)
                resolved_price = base_price * (1 - (discount_percent / 100))
                return {
                    "price_list_id": pl.get("id"),
                    "price_source": "price_list",
                    "base_price": base_price,
                    "resolved_price": round(resolved_price, 2),
                    "discount_percent": discount_percent,
                }
        product = self.get_product(product_id) or {}
        fallback = float(product.get("selling_price", 0) or 0)
        return {
            "price_list_id": None,
            "price_source": "product_default",
            "base_price": fallback,
            "resolved_price": fallback,
            "discount_percent": 0,
        }

    # ERP upgrade: reorder
    def upsert_reorder_policy(self, data: dict) -> dict:
        product_id = data.get("product_id")
        existing = next((p for p in self.reorder_policies.values() if p.get("product_id") == product_id), None)
        if existing:
            existing.update(data)
            existing["updated_at"] = datetime.now()
            return existing
        policy_id = generate_id()
        row = {"id": policy_id, **data, "created_at": datetime.now(), "updated_at": datetime.now()}
        self.reorder_policies[policy_id] = row
        return row

    def get_reorder_policies(self) -> List[dict]:
        return list(self.reorder_policies.values())

    def generate_reorder_suggestions(self) -> List[dict]:
        self.reorder_suggestions = {}
        now = datetime.now()
        for product in self.get_products():
            stock = int(product.get("stock_quantity", 0) or 0)
            reorder_level = int(product.get("reorder_level", 0) or 0)
            policy = next((p for p in self.reorder_policies.values() if p.get("product_id") == product.get("id")), None) or {}
            min_qty = int(policy.get("min_qty", reorder_level) or reorder_level)
            if stock >= min_qty:
                continue
            suggested = max(min_qty - stock, int(policy.get("moq", 1) or 1))
            rid = generate_id()
            self.reorder_suggestions[rid] = {
                "id": rid,
                "product_id": product.get("id"),
                "product_name": product.get("name"),
                "suggested_qty": suggested,
                "trigger_reason": "below_min_qty",
                "stock_on_hand": stock,
                "reorder_level": reorder_level,
                "avg_daily_sales": 0,
                "coverage_days": 0,
                "created_at": now,
            }
        return list(self.reorder_suggestions.values())

    def get_reorder_suggestions(self) -> List[dict]:
        return list(self.reorder_suggestions.values())

    # ERP upgrade: AR aging + credit
    def add_receivable_ledger_entry(self, data: dict) -> dict:
        row = {"id": generate_id(), **data, "created_at": data.get("created_at") or datetime.now()}
        self.receivable_ledger.append(row)
        return row

    def get_receivable_aging(self) -> List[dict]:
        now = datetime.now()
        rows = []
        for retailer in self.retailers.values():
            dues = [s for s in self.sales.values() if s.get("retailer_id") == retailer.get("id") and float(s.get("due_amount", 0) or 0) > 0]
            bucket = {"current": 0.0, "bucket_8_15": 0.0, "bucket_16_30": 0.0, "bucket_31_60": 0.0, "bucket_60_plus": 0.0}
            for sale in dues:
                due = float(sale.get("due_amount", 0) or 0)
                due_date = sale.get("due_date")
                if isinstance(due_date, str):
                    try:
                        due_date = datetime.fromisoformat(due_date).date()
                    except Exception:
                        due_date = None
                days = 0
                if due_date:
                    days = (now.date() - due_date).days
                if days <= 7:
                    bucket["current"] += due
                elif days <= 15:
                    bucket["bucket_8_15"] += due
                elif days <= 30:
                    bucket["bucket_16_30"] += due
                elif days <= 60:
                    bucket["bucket_31_60"] += due
                else:
                    bucket["bucket_60_plus"] += due
            total_due = sum(bucket.values())
            rows.append({
                "retailer_id": retailer.get("id"),
                "retailer_name": retailer.get("shop_name") or retailer.get("name"),
                "total_due": total_due,
                **bucket,
            })
        return rows

    def check_credit_limit(self, retailer_id: str, new_order_amount: float) -> dict:
        retailer = self.get_retailer(retailer_id)
        if not retailer:
            raise ValueError("Retailer not found")
        credit_limit = float(retailer.get("credit_limit", 0) or 0)
        current_due = float(retailer.get("total_due", 0) or 0)
        projected_due = current_due + float(new_order_amount or 0)
        over_limit = max(0.0, projected_due - credit_limit)
        can_submit = credit_limit <= 0 or projected_due <= credit_limit
        return {
            "retailer_id": retailer_id,
            "retailer_name": retailer.get("shop_name") or retailer.get("name"),
            "credit_limit": credit_limit,
            "current_due": current_due,
            "new_order_amount": float(new_order_amount or 0),
            "projected_due": projected_due,
            "over_limit_amount": over_limit,
            "enforcement_mode": "warn",
            "can_submit": can_submit,
            "reason": None if can_submit else "Projected due exceeds credit limit",
        }

    def get_sr_open_liability(self, sr_user_id: str) -> float:
        total = 0.0
        for sale in self.sales.values():
            if (sale.get("credit_risk_bearer") or "company") != "sr":
                continue
            liable = sale.get("sr_liable_user_id") or sale.get("created_by")
            if str(liable) != str(sr_user_id):
                continue
            total += max(0.0, float(sale.get("due_amount", 0) or 0))
        return total

    def get_sr_adjustments_total(self, sr_user_id: str) -> float:
        s = 0.0
        for r in self.sr_risk_adjustments.values():
            if r.get("sr_user_id") == sr_user_id:
                s += float(r.get("amount", 0) or 0)
        return s

    def add_sr_risk_adjustment(
        self,
        sr_user_id: str,
        amount: float,
        adjustment_type: str,
        reference_sale_id: Optional[str],
        notes: Optional[str],
        created_by: Optional[str],
    ) -> dict:
        row_id = generate_id()
        row = {
            "id": row_id,
            "sr_user_id": sr_user_id,
            "amount": float(amount),
            "adjustment_type": adjustment_type,
            "reference_sale_id": reference_sale_id,
            "notes": notes,
            "created_by": created_by,
            "created_at": datetime.now(),
        }
        self.sr_risk_adjustments[row_id] = row
        return row

    def list_sr_risk_adjustments(self, sr_user_id: Optional[str] = None) -> List[dict]:
        rows = list(self.sr_risk_adjustments.values())
        if not sr_user_id:
            return rows
        return [r for r in rows if r.get("sr_user_id") == sr_user_id]

    def approve_or_reject_payment(
        self,
        payment_id: str,
        action: str,
        approver_id: str,
        rejection_reason: Optional[str] = None,
    ) -> Optional[dict]:
        p = self.payments.get(payment_id)
        if not p or p.get("approval_status", "approved") != "pending_approval":
            return None
        if action == "reject":
            p["approval_status"] = "rejected"
            p["rejection_reason"] = rejection_reason
            p["approved_by"] = approver_id
            p["approved_at"] = datetime.now()
            return p
        if action != "approve":
            return None
        # Apply financial effects
        self.update_retailer_due(p["retailer_id"], -p["amount"])
        sale = self.get_sale(p["sale_id"])
        if sale:
            sale["paid_amount"] = float(sale.get("paid_amount", 0)) + float(p["amount"])
            sale["due_amount"] = max(0, float(sale.get("due_amount", 0)) - float(p["amount"]))
            if sale["due_amount"] <= 0:
                sale["payment_status"] = PaymentStatus.PAID
            else:
                sale["payment_status"] = PaymentStatus.PARTIAL
        p["approval_status"] = "approved"
        p["approved_by"] = approver_id
        p["approved_at"] = datetime.now()
        self.add_receivable_ledger_entry({
            "retailer_id": p["retailer_id"],
            "sale_id": p.get("sale_id"),
            "payment_id": p["id"],
            "entry_type": "payment",
            "amount": -float(p.get("amount", 0) or 0),
            "reference_type": "payment",
            "reference_id": p["id"],
            "remarks": "payment_collected_approved",
        })
        return p

    def get_payment_by_id(self, payment_id: str) -> Optional[dict]:
        return self.payments.get(payment_id)

    def approve_pending_payment(self, payment_id: str, approver_id: str) -> Optional[dict]:
        return self.approve_or_reject_payment(payment_id, "approve", approver_id)

    def reject_pending_payment(self, payment_id: str, approver_id: str, reason: Optional[str] = None) -> Optional[dict]:
        return self.approve_or_reject_payment(payment_id, "reject", approver_id, reason)

    # ERP upgrade: margin analytics
    def record_sale_item_cost_snapshot(self, data: dict) -> dict:
        row_id = generate_id()
        row = {"id": row_id, **data, "created_at": datetime.now()}
        self.sale_item_cost_snapshots[row_id] = row
        return row

    def get_margin_report(self, from_date: Optional[str] = None, to_date: Optional[str] = None) -> dict:
        rows = []
        total_net_sales = 0.0
        total_cogs = 0.0
        for sale in self.sales.values():
            created_at = sale.get("created_at")
            if from_date and isinstance(created_at, datetime) and created_at.isoformat() < from_date:
                continue
            if to_date and isinstance(created_at, datetime) and created_at.isoformat() > to_date:
                continue
            for item in [si for si in self.sale_item_cost_snapshots.values() if si.get("sale_id") == sale.get("id")]:
                net_sales = float(item.get("net_sales", 0) or 0)
                cogs_total = float(item.get("cogs_total", 0) or 0)
                margin_amount = net_sales - cogs_total
                margin_percent = (margin_amount / net_sales * 100) if net_sales > 0 else 0
                rows.append({
                    "sale_id": sale.get("id"),
                    "invoice_number": sale.get("invoice_number"),
                    "product_id": item.get("product_id"),
                    "product_name": item.get("product_name"),
                    "quantity": int(item.get("quantity", 0) or 0),
                    "net_sales": net_sales,
                    "cogs_total": cogs_total,
                    "margin_amount": margin_amount,
                    "margin_percent": margin_percent,
                    "created_at": sale.get("created_at") or datetime.now(),
                })
                total_net_sales += net_sales
                total_cogs += cogs_total
        total_margin = total_net_sales - total_cogs
        return {
            "total_net_sales": total_net_sales,
            "total_cogs": total_cogs,
            "total_margin": total_margin,
            "margin_percent": (total_margin / total_net_sales * 100) if total_net_sales > 0 else 0,
            "rows": rows,
        }
    
    # SMS methods
    def add_to_sms_queue(self, recipient_phone: str, message: str, event_type: str, scheduled_at: datetime) -> str:
        queue_id = generate_id()
        self.sms_queue[queue_id] = {
            "id": queue_id,
            "recipient_phone": recipient_phone,
            "message": message,
            "event_type": event_type,
            "status": "pending",
            "scheduled_at": scheduled_at,
            "retry_count": 0,
            "created_at": datetime.now()
        }
        return queue_id
    
    def get_pending_sms_queue(self, limit: int = 10) -> List[dict]:
        pending = [
            item for item in self.sms_queue.values() 
            if item["status"] == "pending" and item["scheduled_at"] <= datetime.now()
        ]
        return sorted(pending, key=lambda x: x["scheduled_at"])[:limit]
    
    def update_sms_queue_status(self, queue_id: str, status: str, error_message: Optional[str] = None):
        if queue_id in self.sms_queue:
            self.sms_queue[queue_id]["status"] = status
            if error_message:
                self.sms_queue[queue_id]["error_message"] = error_message
            if status == "pending": # It's a retry
                self.sms_queue[queue_id]["retry_count"] += 1
    
    def create_sms_log(self, data: dict) -> dict:
        log_entry = {
            "id": generate_id(),
            **data,
            "created_at": datetime.now()
        }
        self.sms_logs.append(log_entry)
        return log_entry

import os

def get_database():
    use_supabase = os.environ.get("USE_SUPABASE", "").lower() == "true"
    supabase_url = os.environ.get("SUPABASE_URL")
    supabase_key = os.environ.get("SUPABASE_KEY")
    
    if use_supabase and supabase_url and supabase_key:
        try:
            from app.supabase_db import SupabaseDatabase
            print(f"[DB] Initializing SupabaseDatabase (URL: {supabase_url[:15]}...)")
            return SupabaseDatabase()
        except Exception as e:
            print(f"[DB] Failed to connect to Supabase: {e}")
            import traceback
            traceback.print_exc()
            print("[DB] Falling back to in-memory database")
    
    print("[DB] Using InMemoryDatabase (Local/Dev Mode)")
    return InMemoryDatabase()

db = get_database()

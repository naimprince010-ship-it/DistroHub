from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime, date
from enum import Enum

class UserRole(str, Enum):
    ADMIN = "admin"
    SALES_REP = "sales_rep"

class PaymentStatus(str, Enum):
    PAID = "paid"
    PARTIAL = "partial"
    DUE = "due"

class OrderStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class ExpiryStatus(str, Enum):
    SAFE = "safe"
    WARNING = "warning"
    CRITICAL = "critical"
    EXPIRED = "expired"

class UserBase(BaseModel):
    email: str
    name: str
    role: UserRole = UserRole.SALES_REP
    phone: Optional[str] = None

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: str
    created_at: datetime

class UserLogin(BaseModel):
    email: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: User

class ProductBase(BaseModel):
    name: str
    sku: str
    category: str
    unit: str
    pack_size: int = 1
    purchase_price: float
    selling_price: float

class ProductCreate(ProductBase):
    pass

class Product(ProductBase):
    id: str
    created_at: datetime

class ProductBatch(BaseModel):
    id: str
    product_id: str
    batch_number: str
    expiry_date: date
    quantity: int
    purchase_price: float
    created_at: datetime

class ProductBatchCreate(BaseModel):
    product_id: str
    batch_number: str
    expiry_date: date
    quantity: int
    purchase_price: float

class RetailerBase(BaseModel):
    name: str
    shop_name: str
    phone: str
    address: str
    area: str
    credit_limit: float = 0

class RetailerCreate(RetailerBase):
    pass

class Retailer(RetailerBase):
    id: str
    total_due: float = 0
    created_at: datetime

class PurchaseItemCreate(BaseModel):
    product_id: str
    batch_number: str
    expiry_date: date
    quantity: int
    unit_price: float

class PurchaseCreate(BaseModel):
    supplier_name: str
    invoice_number: str
    items: List[PurchaseItemCreate]
    notes: Optional[str] = None

class PurchaseItem(BaseModel):
    id: str
    purchase_id: str
    product_id: str
    product_name: str
    batch_number: str
    expiry_date: date
    quantity: int
    unit_price: float
    total: float

class Purchase(BaseModel):
    id: str
    supplier_name: str
    invoice_number: str
    items: List[PurchaseItem]
    total_amount: float
    notes: Optional[str] = None
    created_at: datetime

class SaleItemCreate(BaseModel):
    product_id: str
    batch_id: str
    quantity: int
    unit_price: float
    discount: float = 0

class SaleCreate(BaseModel):
    retailer_id: str
    items: List[SaleItemCreate]
    payment_type: str
    paid_amount: float = 0
    notes: Optional[str] = None

class SaleItem(BaseModel):
    id: str
    sale_id: str
    product_id: str
    product_name: str
    batch_number: str
    quantity: int
    unit_price: float
    discount: float
    total: float

class Sale(BaseModel):
    id: str
    invoice_number: str
    retailer_id: str
    retailer_name: str
    items: List[SaleItem]
    subtotal: float
    discount: float
    total_amount: float
    paid_amount: float
    due_amount: float
    payment_status: PaymentStatus
    status: OrderStatus
    notes: Optional[str] = None
    created_at: datetime

class PaymentCreate(BaseModel):
    retailer_id: str
    sale_id: Optional[str] = None
    amount: float
    payment_method: str
    notes: Optional[str] = None

class Payment(BaseModel):
    id: str
    retailer_id: str
    retailer_name: str
    sale_id: Optional[str] = None
    amount: float
    payment_method: str
    notes: Optional[str] = None
    created_at: datetime

class InventoryItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    category: str
    total_stock: int
    batches: List[ProductBatch]

class ExpiryAlert(BaseModel):
    id: str
    product_id: str
    product_name: str
    batch_number: str
    expiry_date: date
    quantity: int
    days_until_expiry: int
    status: ExpiryStatus

class DashboardStats(BaseModel):
    total_sales: float
    total_due: float
    total_products: int
    active_retailers: int
    sales_this_month: float
    collections_this_month: float

class SalesReport(BaseModel):
    date: str
    total_sales: float
    total_orders: int
    total_items: int

class DueReport(BaseModel):
    retailer_id: str
    retailer_name: str
    shop_name: str
    total_due: float
    last_payment_date: Optional[datetime] = None

from pydantic import BaseModel, Field, field_validator, model_validator
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

class UserUpdate(BaseModel):
  name: Optional[str] = None
  email: Optional[str] = None
  phone: Optional[str] = None
  password: Optional[str] = None

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
    warehouse_id: Optional[str] = None
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
    batch_id: Optional[str] = None
    batch_number: str
    expiry_date: date
    quantity: int
    unit_price: float

class PurchaseCreate(BaseModel):
    supplier_name: str
    invoice_number: str
    warehouse_id: Optional[str] = None  # Warehouse where stock will be added
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
    assigned_to: Optional[str] = None  # User ID of SR/delivery man assigned to collect payment

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
    assigned_to: Optional[str] = None  # User ID of SR/delivery man assigned to collect payment
    assigned_to_name: Optional[str] = None  # Name of assigned SR/delivery man
    created_at: datetime

class SaleUpdate(BaseModel):
    """Update sale invoice manually (admin only)"""
    delivery_status: Optional[str] = None
    paid_amount: Optional[float] = None
    due_amount: Optional[float] = None
    payment_status: Optional[PaymentStatus] = None
    delivered_at: Optional[datetime] = None
    notes: Optional[str] = None
    assigned_to: Optional[str] = None  # Update assigned SR/delivery man

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
    collected_by: Optional[str] = None  # User ID of SR/delivery man who collected this payment
    collected_by_name: Optional[str] = None  # Name of SR/delivery man who collected this payment
    route_id: Optional[str] = None  # Route ID if payment is for a sale in a route
    route_number: Optional[str] = None  # Route number (enriched from route)
    invoice_number: Optional[str] = None  # Invoice number (enriched from sale)
    created_at: datetime

class RefundType(str, Enum):
    ADJUST_DUE = "adjust_due"
    REFUND_CASH = "refund_cash"
    CREDIT_NOTE = "credit_note"

class SaleReturnItemCreate(BaseModel):
    sale_item_id: str
    quantity_returned: int = Field(gt=0, description="Quantity being returned, must be > 0")
    batch_id: Optional[str] = None  # Optional: for specific batch tracking

class SaleReturnCreate(BaseModel):
    items: List[SaleReturnItemCreate]
    reason: Optional[str] = None
    refund_type: RefundType = RefundType.ADJUST_DUE

class SaleReturnItem(BaseModel):
    id: str
    return_id: str
    sale_item_id: str
    product_id: str
    product_name: str
    batch_number: str
    batch_id: Optional[str] = None
    quantity_returned: int
    unit_price: float
    discount: float
    total_returned: float
    created_at: datetime

class SaleReturn(BaseModel):
    id: str
    return_number: str
    sale_id: str
    retailer_id: str
    retailer_name: str
    total_return_amount: float
    reason: Optional[str] = None
    refund_type: RefundType
    status: str
    created_by: Optional[str] = None
    items: List[SaleReturnItem]
    created_at: datetime

class SaleReport(Sale):
    """Sale with return aggregation for reports"""
    gross_total: float  # original total_amount
    returned_total: float  # sum of returns
    net_total: float  # gross - returned
    has_returns: bool
    return_count: int
    total_items: int  # total quantity of items sold
    returned_qty: int  # total quantity of items returned
    net_items: int  # total_items - returned_qty

class SaleReturnReport(BaseModel):
    """Simplified return view for reports"""
    id: str
    return_number: str
    sale_id: str
    invoice_number: str  # from related sale
    retailer_id: str
    retailer_name: str
    total_return_amount: float
    reason: Optional[str] = None
    refund_type: RefundType
    status: str
    created_at: datetime

class SalesReportSummary(BaseModel):
    """Summary totals for sales report"""
    total_gross: float
    total_returns: float
    total_net: float
    return_rate: float  # (total_returns / total_gross) * 100
    total_sales: int
    sales_with_returns: int
    total_items: int  # total quantity of all items sold
    total_returned_items: int  # total quantity of all items returned
    total_net_items: int  # total_items - total_returned_items

class InventoryItem(BaseModel):
    product_id: str
    product_name: str
    sku: str
    category: str
    total_stock: int
    batches: List[ProductBatch]

class WarehouseCreate(BaseModel):
    """Create warehouse request"""
    name: str
    address: Optional[str] = None
    is_active: bool = True

class Warehouse(BaseModel):
    """Warehouse model"""
    id: str
    name: str
    address: Optional[str] = None
    is_active: bool
    created_at: datetime

class WarehouseStockSummary(BaseModel):
    """Stock summary per product per warehouse"""
    warehouse_id: str
    warehouse_name: str
    product_id: str
    product_name: str
    total_quantity: int

class ExpiryAlert(BaseModel):
    id: str
    product_id: str
    product_name: str
    sku: str
    batch_number: str
    expiry_date: date
    quantity: int
    days_until_expiry: int
    status: ExpiryStatus

class DashboardStats(BaseModel):
    total_sales: float
    total_due: float
    total_products: int
    total_categories: int
    total_purchases: int
    active_retailers: int
    low_stock_count: int
    expiring_soon_count: int
    payable_to_supplier: float
    receivable_from_customers: float
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

class CollectionReport(BaseModel):
    """Collection report for a specific SR/delivery man"""
    user_id: str
    user_name: str
    total_orders_assigned: int
    total_sales_amount: float
    total_collected_amount: float
    total_returns: float
    current_pending_amount: float
    collection_rate: float  # Percentage: (collected / (sales - returns)) * 100
    payment_history: List[Payment] = []  # List of payments collected by this SR

class CollectionReportSummary(BaseModel):
    """Summary of all SRs collection reports"""
    total_srs: int
    total_pending: float
    reports: List[CollectionReport]

class CategoryBase(BaseModel):
    name: str
    description: Optional[str] = None
    color: str = "#4F46E5"

class CategoryCreate(CategoryBase):
    @field_validator('name')
    @classmethod
    def validate_name(cls, v: str) -> str:
        """Validate and sanitize category name."""
        if not v:
            raise ValueError("Category name is required")
        v = v.strip()
        if not v:
            raise ValueError("Category name cannot be empty")
        if len(v) < 2:
            raise ValueError("Category name must be at least 2 characters")
        if len(v) > 100:
            raise ValueError("Category name must be at most 100 characters")
        return v
    
    @field_validator('description')
    @classmethod
    def validate_description(cls, v: Optional[str]) -> Optional[str]:
        """Validate and sanitize category description."""
        if v is None:
            return None
        if not isinstance(v, str):
            return None
        v = v.strip()
        if v == "":
            return None
        if len(v) > 500:
            raise ValueError("Category description must be at most 500 characters")
        return v
    
    @field_validator('color')
    @classmethod
    def validate_color(cls, v: str) -> str:
        """Validate color hex code."""
        if not v:
            return "#4F46E5"
        v = v.strip()
        # Validate hex color format
        if not v.startswith("#") or len(v) != 7:
            raise ValueError("Color must be a valid hex code (e.g., #4F46E5)")
        try:
            int(v[1:], 16)
        except ValueError:
            raise ValueError("Color must be a valid hex code (e.g., #4F46E5)")
        return v.upper()

class Category(CategoryBase):
    id: str
    product_count: int = 0
    created_at: datetime

class SupplierBase(BaseModel):
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None

class SupplierCreate(SupplierBase):
    pass

class Supplier(SupplierBase):
    id: str
    created_at: datetime

class UnitBase(BaseModel):
    name: str
    abbreviation: str
    description: Optional[str] = None

class UnitCreate(UnitBase):
    pass

class Unit(UnitBase):
    id: str
    created_at: datetime

# SMS Notification Models
class SmsEventType(str, Enum):
    LOW_STOCK = "low_stock"
    EXPIRY_ALERT = "expiry_alert"
    PAYMENT_DUE = "payment_due"
    NEW_ORDER = "new_order"

class SmsDeliveryMode(str, Enum):
    IMMEDIATE = "immediate"
    QUEUED = "queued"

class SmsStatus(str, Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    SENT = "sent"
    FAILED = "failed"
    DELIVERED = "delivered"
    UNDELIVERED = "undelivered"

class SmsSettingsBase(BaseModel):
    role: Optional[str] = None
    event_type: SmsEventType
    enabled: bool = True
    delivery_mode: SmsDeliveryMode = SmsDeliveryMode.IMMEDIATE
    recipients: List[str] = []  # ['admins', 'retailers', 'suppliers']

class SmsSettingsCreate(SmsSettingsBase):
    user_id: Optional[str] = None

class SmsSettingsUpdate(BaseModel):
    enabled: Optional[bool] = None
    delivery_mode: Optional[SmsDeliveryMode] = None
    recipients: Optional[List[str]] = None

class SmsSettings(SmsSettingsBase):
    id: str
    user_id: Optional[str] = None
    created_at: datetime
    updated_at: datetime

class SmsTemplateBase(BaseModel):
    event_type: SmsEventType
    template_text: str
    variables: List[str] = []
    is_default: bool = True

class SmsTemplateCreate(SmsTemplateBase):
    pass

class SmsTemplateUpdate(BaseModel):
    template_text: Optional[str] = None
    variables: Optional[List[str]] = None
    is_default: Optional[bool] = None

class SmsTemplate(SmsTemplateBase):
    id: str
    created_at: datetime
    updated_at: datetime

class SmsQueueItem(BaseModel):
    id: str
    recipient_phone: str
    message: str
    event_type: SmsEventType
    status: SmsStatus
    scheduled_at: datetime
    processed_at: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    error_message: Optional[str] = None
    created_at: datetime

class SmsLog(BaseModel):
    id: str
    recipient_phone: str
    message: str
    event_type: SmsEventType
    status: SmsStatus
    trxn_id: Optional[str] = None
    delivery_status: Optional[str] = None
    sent_at: datetime
    delivered_at: Optional[datetime] = None
    error_message: Optional[str] = None

class SmsSendRequest(BaseModel):
    recipient_phone: str
    message: str
    event_type: Optional[SmsEventType] = None

class SmsBulkSendRequest(BaseModel):
    recipient_phones: List[str]
    message: str
    event_type: Optional[SmsEventType] = None

# Route/Batch System Models
class RouteStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    RECONCILED = "reconciled"

class RouteBase(BaseModel):
    assigned_to: str  # User ID of SR/delivery man
    route_date: date
    notes: Optional[str] = None

class RouteCreate(RouteBase):
    sale_ids: List[str]  # List of sale IDs to add to route

class Route(RouteBase):
    id: str
    route_number: str
    assigned_to_name: str
    status: RouteStatus
    total_orders: int
    total_amount: float
    created_at: datetime
    completed_at: Optional[datetime] = None
    reconciled_at: Optional[datetime] = None

class RouteUpdate(BaseModel):
    status: Optional[RouteStatus] = None
    notes: Optional[str] = None

class RouteSale(BaseModel):
    """Sale order within a route with previous due snapshot"""
    id: str
    route_id: str
    sale_id: str
    previous_due: float  # Snapshot at route creation time
    created_at: datetime

class RouteWithSales(Route):
    """Route with its associated sales and previous due information"""
    sales: List[Sale] = []
    route_sales: List[RouteSale] = []  # Previous due snapshots

class RouteReconciliationCreate(BaseModel):
    """Create reconciliation record for a route"""
    total_collected_cash: float
    total_returns_amount: float = 0
    notes: Optional[str] = None
    reconciliation_items: List[dict] = []  # List of {sale_id, sale_item_id, quantity_returned, return_reason}

class RouteReconciliationItem(BaseModel):
    """Returned item during reconciliation"""
    id: str
    reconciliation_id: str
    sale_id: str
    sale_item_id: str
    quantity_returned: int
    return_reason: Optional[str] = None
    created_at: datetime

class RouteReconciliation(BaseModel):
    """Reconciliation record for a route"""
    id: str
    route_id: str
    reconciled_by: Optional[str] = None
    total_expected_cash: float
    total_collected_cash: float
    total_returns_amount: float
    discrepancy: float
    notes: Optional[str] = None
    reconciled_at: datetime
    items: List[RouteReconciliationItem] = []

class RouteReconciliationUpdate(BaseModel):
    """Update reconciliation record"""
    total_collected_cash: Optional[float] = None
    total_returns_amount: Optional[float] = None
    notes: Optional[str] = None

class SrCashHolding(BaseModel):
    """SR cash holding record"""
    id: str
    user_id: str
    amount: float
    source: str  # 'reconciliation', 'manual_adjustment', 'initial'
    reference_id: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime

class SrAccountability(BaseModel):
    """SR accountability report"""
    user_id: str
    user_name: str
    current_cash_holding: float
    current_outstanding: float  # LOGIC FIX: Actual outstanding = total_expected - total_collected - total_returns
    active_routes_count: int
    pending_reconciliation_count: int
    total_expected_cash: float  # Sum of all outstanding in active routes
    total_collected: float  # FRONTEND FIX: Total collected (payments + reconciliations with double-count safeguard)
    total_returns: float  # FRONTEND FIX: Total returns from all reconciliations
    routes: List[Route] = []
    reconciliations: List[RouteReconciliation] = []
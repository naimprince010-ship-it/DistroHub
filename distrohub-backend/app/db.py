import os
from sqlalchemy import create_engine, Column, String, Float, Integer, DateTime, Date, Enum, ForeignKey, Text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from datetime import datetime
import enum

DATABASE_URL = os.environ.get("DATABASE_URL")
if not DATABASE_URL:
    raise ValueError("DATABASE_URL environment variable is required")

engine = create_engine(DATABASE_URL.replace("postgresql://", "postgresql+psycopg://"))
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class UserRoleEnum(str, enum.Enum):
    admin = "admin"
    sales_rep = "sales_rep"

class PaymentStatusEnum(str, enum.Enum):
    paid = "paid"
    partial = "partial"
    due = "due"

class OrderStatusEnum(str, enum.Enum):
    pending = "pending"
    confirmed = "confirmed"
    delivered = "delivered"
    cancelled = "cancelled"

class User(Base):
    __tablename__ = "users"
    
    id = Column(String, primary_key=True)
    email = Column(String, unique=True, nullable=False)
    name = Column(String, nullable=False)
    role = Column(String, default="sales_rep")
    phone = Column(String)
    password_hash = Column(String, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class Product(Base):
    __tablename__ = "products"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    sku = Column(String, unique=True, nullable=False)
    category = Column(String, nullable=False)
    unit = Column(String, nullable=False)
    pack_size = Column(Integer, default=1)
    purchase_price = Column(Float, nullable=False)
    selling_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    batches = relationship("ProductBatch", back_populates="product")

class ProductBatch(Base):
    __tablename__ = "product_batches"
    
    id = Column(String, primary_key=True)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    batch_number = Column(String, nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    product = relationship("Product", back_populates="batches")

class Retailer(Base):
    __tablename__ = "retailers"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    shop_name = Column(String, nullable=False)
    phone = Column(String, nullable=False)
    address = Column(String, nullable=False)
    area = Column(String, nullable=False)
    credit_limit = Column(Float, default=0)
    total_due = Column(Float, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

class Purchase(Base):
    __tablename__ = "purchases"
    
    id = Column(String, primary_key=True)
    supplier_name = Column(String, nullable=False)
    invoice_number = Column(String, nullable=False)
    total_amount = Column(Float, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("PurchaseItem", back_populates="purchase")

class PurchaseItem(Base):
    __tablename__ = "purchase_items"
    
    id = Column(String, primary_key=True)
    purchase_id = Column(String, ForeignKey("purchases.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    product_name = Column(String, nullable=False)
    batch_number = Column(String, nullable=False)
    expiry_date = Column(Date, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total = Column(Float, nullable=False)
    
    purchase = relationship("Purchase", back_populates="items")

class Sale(Base):
    __tablename__ = "sales"
    
    id = Column(String, primary_key=True)
    invoice_number = Column(String, nullable=False)
    retailer_id = Column(String, ForeignKey("retailers.id"), nullable=False)
    retailer_name = Column(String, nullable=False)
    subtotal = Column(Float, nullable=False)
    discount = Column(Float, default=0)
    total_amount = Column(Float, nullable=False)
    paid_amount = Column(Float, default=0)
    due_amount = Column(Float, default=0)
    payment_status = Column(String, default="due")
    status = Column(String, default="pending")
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    items = relationship("SaleItem", back_populates="sale")

class SaleItem(Base):
    __tablename__ = "sale_items"
    
    id = Column(String, primary_key=True)
    sale_id = Column(String, ForeignKey("sales.id"), nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=False)
    product_name = Column(String, nullable=False)
    batch_number = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    discount = Column(Float, default=0)
    total = Column(Float, nullable=False)
    
    sale = relationship("Sale", back_populates="items")

class Payment(Base):
    __tablename__ = "payments"
    
    id = Column(String, primary_key=True)
    retailer_id = Column(String, ForeignKey("retailers.id"), nullable=False)
    retailer_name = Column(String, nullable=False)
    sale_id = Column(String, ForeignKey("sales.id"))
    amount = Column(Float, nullable=False)
    payment_method = Column(String, nullable=False)
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    Base.metadata.create_all(bind=engine)

from fastapi import FastAPI, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from app.models import (
    UserCreate, User, UserLogin, Token, UserRole,
    ProductCreate, Product, ProductBatchCreate, ProductBatch,
    RetailerCreate, Retailer,
    PurchaseCreate, Purchase,
    SaleCreate, Sale,
    PaymentCreate, Payment,
    InventoryItem, ExpiryAlert, DashboardStats
)
from app.database import db
from app.auth import create_access_token, get_current_user

app = FastAPI(
    title="DistroHub API",
    description="Grocery Dealership Management System API",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin):
    user = db.get_user_by_email(credentials.email)
    if not user or not db.verify_password(credentials.password, user["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": user["id"]})
    return Token(
        access_token=access_token,
        user=User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            phone=user.get("phone"),
            created_at=user["created_at"]
        )
    )

@app.post("/api/auth/register", response_model=Token)
async def register(user_data: UserCreate):
    existing = db.get_user_by_email(user_data.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    user = db.create_user(
        email=user_data.email,
        name=user_data.name,
        password=user_data.password,
        role=user_data.role,
        phone=user_data.phone
    )
    
    access_token = create_access_token(data={"sub": user["id"]})
    return Token(
        access_token=access_token,
        user=User(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            phone=user.get("phone"),
            created_at=user["created_at"]
        )
    )

@app.get("/api/auth/me", response_model=User)
async def get_me(current_user: dict = Depends(get_current_user)):
    return User(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        phone=current_user.get("phone"),
        created_at=current_user["created_at"]
    )

@app.get("/api/products", response_model=List[Product])
async def get_products(current_user: dict = Depends(get_current_user)):
    products = db.get_products()
    return [Product(**p) for p in products]

@app.get("/api/products/{product_id}", response_model=Product)
async def get_product(product_id: str, current_user: dict = Depends(get_current_user)):
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@app.post("/api/products", response_model=Product)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    product = db.create_product(product_data.model_dump())
    return Product(**product)

@app.put("/api/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    product = db.update_product(product_id, product_data.model_dump())
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**product)

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    if not db.delete_product(product_id):
        raise HTTPException(status_code=404, detail="Product not found")
    return {"message": "Product deleted"}

@app.get("/api/products/{product_id}/batches", response_model=List[ProductBatch])
async def get_product_batches(product_id: str, current_user: dict = Depends(get_current_user)):
    batches = db.get_batches_by_product(product_id)
    return [ProductBatch(**b) for b in batches]

@app.post("/api/products/{product_id}/batches", response_model=ProductBatch)
async def create_product_batch(product_id: str, batch_data: ProductBatchCreate, current_user: dict = Depends(get_current_user)):
    product = db.get_product(product_id)
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    batch = db.create_batch({
        "product_id": product_id,
        "batch_number": batch_data.batch_number,
        "expiry_date": batch_data.expiry_date,
        "quantity": batch_data.quantity,
        "purchase_price": batch_data.purchase_price
    })
    return ProductBatch(**batch)

@app.get("/api/retailers", response_model=List[Retailer])
async def get_retailers(current_user: dict = Depends(get_current_user)):
    retailers = db.get_retailers()
    return [Retailer(**r) for r in retailers]

@app.get("/api/retailers/{retailer_id}", response_model=Retailer)
async def get_retailer(retailer_id: str, current_user: dict = Depends(get_current_user)):
    retailer = db.get_retailer(retailer_id)
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")
    return Retailer(**retailer)

@app.post("/api/retailers", response_model=Retailer)
async def create_retailer(retailer_data: RetailerCreate, current_user: dict = Depends(get_current_user)):
    retailer = db.create_retailer(retailer_data.model_dump())
    return Retailer(**retailer)

@app.put("/api/retailers/{retailer_id}", response_model=Retailer)
async def update_retailer(retailer_id: str, retailer_data: RetailerCreate, current_user: dict = Depends(get_current_user)):
    retailer = db.update_retailer(retailer_id, retailer_data.model_dump())
    if not retailer:
        raise HTTPException(status_code=404, detail="Retailer not found")
    return Retailer(**retailer)

@app.delete("/api/retailers/{retailer_id}")
async def delete_retailer(retailer_id: str, current_user: dict = Depends(get_current_user)):
    if not db.delete_retailer(retailer_id):
        raise HTTPException(status_code=404, detail="Retailer not found")
    return {"message": "Retailer deleted"}

@app.get("/api/purchases", response_model=List[Purchase])
async def get_purchases(current_user: dict = Depends(get_current_user)):
    purchases = db.get_purchases()
    return [Purchase(**p) for p in purchases]

@app.post("/api/purchases", response_model=Purchase)
async def create_purchase(purchase_data: PurchaseCreate, current_user: dict = Depends(get_current_user)):
    items = [item.model_dump() for item in purchase_data.items]
    purchase = db.create_purchase(
        {"supplier_name": purchase_data.supplier_name, "invoice_number": purchase_data.invoice_number, "notes": purchase_data.notes},
        items
    )
    return Purchase(**purchase)

@app.get("/api/sales", response_model=List[Sale])
async def get_sales(current_user: dict = Depends(get_current_user)):
    sales = db.get_sales()
    return [Sale(**s) for s in sales]

@app.get("/api/sales/{sale_id}", response_model=Sale)
async def get_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    sale = db.get_sale(sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="Sale not found")
    return Sale(**sale)

@app.post("/api/sales", response_model=Sale)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    try:
        items = [item.model_dump() for item in sale_data.items]
        sale = db.create_sale(
            {
                "retailer_id": sale_data.retailer_id,
                "payment_type": sale_data.payment_type,
                "paid_amount": sale_data.paid_amount,
                "notes": sale_data.notes
            },
            items
        )
        return Sale(**sale)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/payments", response_model=List[Payment])
async def get_payments(current_user: dict = Depends(get_current_user)):
    payments = db.get_payments()
    return [Payment(**p) for p in payments]

@app.post("/api/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    try:
        payment = db.create_payment(payment_data.model_dump())
        return Payment(**payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/inventory", response_model=List[InventoryItem])
async def get_inventory(current_user: dict = Depends(get_current_user)):
    return db.get_inventory()

@app.get("/api/expiry-alerts", response_model=List[ExpiryAlert])
async def get_expiry_alerts(current_user: dict = Depends(get_current_user)):
    return db.get_expiry_alerts()

@app.get("/api/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: dict = Depends(get_current_user)):
    return db.get_dashboard_stats()

@app.get("/api/receivables")
async def get_receivables(current_user: dict = Depends(get_current_user)):
    return db.get_receivables()

@app.post("/api/products/import")
async def import_products(products: List[ProductCreate], current_user: dict = Depends(get_current_user)):
    imported = []
    for product_data in products:
        product = db.create_product(product_data.model_dump())
        imported.append(Product(**product))
    return {"imported": len(imported), "products": imported}

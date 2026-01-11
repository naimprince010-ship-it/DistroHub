from fastapi import FastAPI, HTTPException, Depends, status, Request
from contextlib import asynccontextmanager
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Optional, Dict, Any
from enum import Enum
import asyncio
import logging
import os
import re
from datetime import datetime

logger = logging.getLogger(__name__)

from app.models import (
    UserCreate, UserUpdate, User, UserLogin, Token, UserRole,
    ProductCreate, Product, ProductBatchCreate, ProductBatch,
    RetailerCreate, Retailer,
    PurchaseCreate, Purchase,
    SaleCreate, Sale,
    PaymentCreate, Payment,
    InventoryItem, ExpiryAlert, DashboardStats,
    CategoryCreate, Category,
    SupplierCreate, Supplier,
    UnitCreate, Unit,
    SmsSettings, SmsSettingsCreate, SmsSettingsUpdate,
    SmsTemplate, SmsTemplateCreate, SmsTemplateUpdate,
    SmsLog, SmsSendRequest, SmsBulkSendRequest,
    SmsEventType, SmsDeliveryMode, SmsStatus,
    SaleReturnCreate, SaleReturn, RefundType,
    SaleReport, SaleReturnReport, SalesReportSummary,
    WarehouseCreate, Warehouse, WarehouseStockSummary,
    SaleUpdate, CollectionReport, CollectionReportSummary,
    RouteCreate, Route, RouteUpdate, RouteWithSales, RouteStatus,
    RouteReconciliationCreate, RouteReconciliation, RouteReconciliationUpdate,
    SrAccountability
)
from app.database import db
from app.auth import create_access_token, get_current_user
from app.sms_service import SmsService, SmsTemplateRenderer, SmsQueueManager
from app.sms_worker import start_sms_worker
from fastapi.responses import JSONResponse

app = FastAPI(
    title="DistroHub API",
    description="Grocery Dealership Management System API",
    version="1.0.0"
)

# Global exception handler to ensure JSON responses (must be before middleware)
from fastapi.exceptions import RequestValidationError
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    # Don't handle HTTPException - let it pass through
    if isinstance(exc, HTTPException):
        raise exc
    import traceback
    error_type = type(exc).__name__
    error_msg = str(exc)
    print(f"[GLOBAL] Unhandled exception: {error_type}: {error_msg}")
    traceback.print_exc()
    return JSONResponse(
        status_code=500,
        content={
            "detail": f"Internal server error: {error_type}: {error_msg}",
            "error_type": error_type
        }
    )

# CORS configuration - allow frontend from any device
# Get additional allowed origins from environment variable (comma-separated)
# #region agent log
try:
    import json
    with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"D","location":"main.py:63","message":"Parsing ALLOWED_ORIGINS env var","data":{"raw_value":os.environ.get("ALLOWED_ORIGINS", "")},"timestamp":int(datetime.now().timestamp() * 1000)}
        f.write(json.dumps(log_data) + '\n')
except: pass
# #endregion
additional_origins = os.environ.get("ALLOWED_ORIGINS", "").split(",")
additional_origins = [origin.strip() for origin in additional_origins if origin.strip()]

# Base allowed origins
allowed_origins = [
    "https://distrohub-frontend.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:12001",
]

# Add additional origins from environment
allowed_origins.extend(additional_origins)

# #region agent log
try:
    import json
    with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:75","message":"CORS config before middleware","data":{"allowed_origins_count":len(allowed_origins),"additional_origins_count":len(additional_origins)},"timestamp":int(datetime.now().timestamp() * 1000)}
        f.write(json.dumps(log_data) + '\n')
except: pass
# #endregion

# #region agent log
try:
    import json
    with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:95","message":"Adding CORS middleware","data":{"allowed_origins_count":len(allowed_origins),"has_regex":True},"timestamp":int(datetime.now().timestamp() * 1000)}
        f.write(json.dumps(log_data) + '\n')
except Exception as e:
    # Log to console if file logging fails
    print(f"[DEBUG] Failed to write log: {e}")
# #endregion

# FastAPI/Starlette CORSMiddleware: when both allow_origins and allow_origin_regex are provided,
# it checks if origin matches EITHER the explicit list OR the regex pattern
# This configuration ensures:
# 1. Main production origin (https://distrohub-frontend.vercel.app) is explicitly allowed
# 2. All Vercel preview URLs are allowed via regex
# 3. All localhost URLs are allowed for development
# #region agent log
try:
    import json
    with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:107","message":"Configuring CORS middleware","data":{"explicit_origins":allowed_origins,"has_regex":True},"timestamp":int(datetime.now().timestamp() * 1000)}
        f.write(json.dumps(log_data) + '\n')
except Exception as e:
    print(f"[DEBUG] Failed to write CORS config log: {e}")
# #endregion
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,  # Explicit origins - main production URL is here
    allow_origin_regex=r"https://.*\.vercel\.app|http://localhost:\d+|http://127\.0\.0\.1:\d+",  # Regex for Vercel preview URLs and localhost
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "Accept", "X-Requested-With"],
    expose_headers=["*"],
    max_age=600,  # Cache preflight for 10 minutes
)
# #region agent log
try:
    import json
    with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:120","message":"CORS middleware configured successfully","data":{},"timestamp":int(datetime.now().timestamp() * 1000)}
        f.write(json.dumps(log_data) + '\n')
except Exception as e:
    print(f"[DEBUG] Failed to write CORS success log: {e}")
# #endregion
# #region agent log
try:
    import json
    with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
        log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:115","message":"CORS middleware added successfully","data":{},"timestamp":int(datetime.now().timestamp() * 1000)}
        f.write(json.dumps(log_data) + '\n')
except: pass
# #endregion

@app.on_event("startup")
async def startup_event():
    """Start background tasks on application startup"""
    # #region agent log
    try:
        import json
        with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
            log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:143","message":"Backend startup event triggered","data":{},"timestamp":int(datetime.now().timestamp() * 1000)}
            f.write(json.dumps(log_data) + '\n')
    except Exception as e:
        print(f"[DEBUG] Failed to write startup log: {e}")
    # #endregion
    # Start SMS worker
    try:
        await start_sms_worker(db)
        logger.info("SMS worker started successfully")
        # #region agent log
        try:
            import json
            with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
                log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:151","message":"SMS worker started successfully","data":{},"timestamp":int(datetime.now().timestamp() * 1000)}
                f.write(json.dumps(log_data) + '\n')
        except: pass
        # #endregion
    except Exception as e:
        logger.error(f"Failed to start SMS worker: {e}")
        # #region agent log
        try:
            import json
            with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
                log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"A","location":"main.py:156","message":"SMS worker failed","data":{"error":str(e)[:100]},"timestamp":int(datetime.now().timestamp() * 1000)}
                f.write(json.dumps(log_data) + '\n')
        except: pass
        # #endregion

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

@app.post("/api/auth/login", response_model=Token)
async def login(credentials: UserLogin, request: Request):
    # #region agent log
    try:
        import json
        with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
            log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"main.py:109","message":"Login endpoint called","data":{"email":credentials.email[:10] + "..."},"timestamp":int(datetime.now().timestamp() * 1000)}
            f.write(json.dumps(log_data) + '\n')
    except: pass
    # #endregion
    try:
        # Log request details for debugging device-specific issues
        # #region agent log
        try:
            import json
            with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
                log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"main.py:112","message":"Request object check","data":{"has_request":request is not None,"has_headers":hasattr(request, "headers")},"timestamp":int(datetime.now().timestamp() * 1000)}
                f.write(json.dumps(log_data) + '\n')
        except Exception as e:
            import json
            with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
                log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"main.py:112","message":"Request check error","data":{"error":str(e)[:50]},"timestamp":int(datetime.now().timestamp() * 1000)}
                f.write(json.dumps(log_data) + '\n')
        # #endregion
        origin = request.headers.get("origin", "unknown")
        user_agent = request.headers.get("user-agent", "unknown")
        client_host = request.client.host if request.client else "unknown"
        print(f"[LOGIN] Attempt from origin: {origin}, IP: {client_host}, User-Agent: {user_agent[:50]}")
        # #region agent log
        try:
            import json
            with open(r'c:\Users\User\DistroHub\.cursor\debug.log', 'a', encoding='utf-8') as f:
                log_data = {"sessionId":"debug-session","runId":"run1","hypothesisId":"B","location":"main.py:118","message":"Request headers extracted","data":{"origin":origin[:30],"has_client":request.client is not None},"timestamp":int(datetime.now().timestamp() * 1000)}
                f.write(json.dumps(log_data) + '\n')
        except: pass
        # #endregion
        
        user = db.get_user_by_email(credentials.email)
        if not user:
            print(f"[LOGIN] Failed: User not found for email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        password_valid = db.verify_password(credentials.password, user["password_hash"])
        if not password_valid:
            print(f"[LOGIN] Failed: Invalid password for email: {credentials.email}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid email or password"
            )
        
        access_token = create_access_token(data={"sub": user["id"]})
        print(f"[LOGIN] Success: User {user['email']} logged in from origin: {origin}")
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
    except HTTPException:
        raise
    except Exception as e:
        print(f"[LOGIN] Error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
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

@app.get("/api/users", response_model=List[User])
async def get_users(current_user: dict = Depends(get_current_user)):
    """Get all users (admin only or for SR selection)"""
    try:
        users = db.get_users()
        return [User(**user) for user in users]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get users: {str(e)}"
        )

@app.post("/api/users", response_model=User, status_code=status.HTTP_201_CREATED)
async def create_user(user_data: UserCreate, current_user: dict = Depends(get_current_user)):
    """Create a new user (sales rep)"""
    try:
        # Check if email already exists
        existing_users = db.get_users()
        if any(u.get("email") == user_data.email for u in existing_users):
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="User with this email already exists"
            )
        
        # Create user with sales_rep role
        user = db.create_user(
            email=user_data.email,
            name=user_data.name,
            password=user_data.password,
            role=UserRole.SALES_REP,
            phone=user_data.phone
        )
        return User(**user)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error creating user: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create user: {error_msg}"
        )

@app.put("/api/users/{user_id}", response_model=User)
async def update_user(
    user_id: str,
    user_data: UserUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update user information"""
    try:
        # Verify user exists
        existing_user = db.get_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Check if email is being changed and if it conflicts
        if user_data.email and user_data.email != existing_user.get("email"):
            existing_users = db.get_users()
            if any(u.get("email") == user_data.email and u.get("id") != user_id for u in existing_users):
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="User with this email already exists"
                )
        
        # Prepare update data
        update_data = {}
        if user_data.name is not None:
            update_data["name"] = user_data.name
        if user_data.email is not None:
            update_data["email"] = user_data.email
        if user_data.phone is not None:
            update_data["phone"] = user_data.phone
        if user_data.password is not None:
            update_data["password"] = user_data.password
        
        # Update user
        updated_user = db.update_user(user_id, update_data)
        if not updated_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return User(**updated_user)
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error updating user: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update user: {error_msg}"
        )

@app.delete("/api/users/{user_id}")
async def delete_user(user_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a user (sales rep)"""
    try:
        # Verify user exists
        existing_user = db.get_user_by_id(user_id)
        if not existing_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Prevent deleting admin users
        if existing_user.get("role") == "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cannot delete admin users"
            )
        
        # Delete user (will automatically clear assigned_to references)
        db.delete_user(user_id)
        
        return {
            "message": "User deleted successfully"
        }
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error deleting user: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete user: {error_msg}"
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

@app.post("/api/products", response_model=Product, status_code=status.HTTP_201_CREATED)
async def create_product(product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new product.
    
    Returns:
        Product: The created product with DB-generated id and created_at
        
    Raises:
        400: Validation error (invalid input)
        401: Authentication error (handled by get_current_user)
        500: Unexpected server error
    """
    try:
        data = product_data.model_dump()
        print(f"[API] Creating product with data: {data}")
        print(f"[API] User: {current_user.get('email', 'unknown')}")
        
        product = db.create_product(data)
        print(f"[API] Product created in DB: {product.get('id', 'no-id')}")
        
        # Check for low stock and trigger SMS if needed
        stock_quantity = product.get("stock_quantity", 0)
        reorder_level = product.get("reorder_level", 10)
        if stock_quantity < reorder_level:
            # Trigger low stock SMS notification
            asyncio.create_task(trigger_sms_notification(
                event_type=SmsEventType.LOW_STOCK,
                data={
                    "product_name": product.get("name", ""),
                    "current_stock": str(stock_quantity),
                    "reorder_level": str(reorder_level)
                }
            ))
        
        # Validate the response matches Product model
        try:
            product_model = Product(**product)
            print(f"[API] Product model validated successfully, returning response")
            return product_model
        except Exception as validation_error:
            print(f"[API] Product model validation failed: {validation_error}")
            print(f"[API] Product data: {product}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Product created but validation failed: {str(validation_error)}"
            )
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        print(f"[API] Validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Unexpected error creating product: {error_type}: {error_msg}")
        print(f"[API] Product data: {product_data.model_dump()}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create product: {error_type}: {error_msg}"
        )

@app.put("/api/products/{product_id}", response_model=Product)
async def update_product(product_id: str, product_data: ProductCreate, current_user: dict = Depends(get_current_user)):
    """
    Update an existing product.
    
    Returns:
        Product: The updated product
        
    Raises:
        400: Validation error (invalid input)
        401: Authentication error (handled by get_current_user)
        404: Product not found
        500: Unexpected server error
    """
    try:
        data = product_data.model_dump()
        print(f"[API] Updating product {product_id} with data: {data}")
        print(f"[API] User: {current_user.get('email', 'unknown')}")
        
        product = db.update_product(product_id, data)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Check for low stock and trigger SMS if needed
        stock_quantity = product.get("stock_quantity", 0)
        reorder_level = product.get("reorder_level", 10)
        if stock_quantity < reorder_level:
            # Trigger low stock SMS notification
            asyncio.create_task(trigger_sms_notification(
                event_type=SmsEventType.LOW_STOCK,
                data={
                    "product_name": product.get("name", ""),
                    "current_stock": str(stock_quantity),
                    "reorder_level": str(reorder_level)
                }
            ))
        
        print(f"[API] Product updated successfully: {product.get('id', 'no-id')}")
        return Product(**product)
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        print(f"[API] Validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Unexpected error updating product: {error_type}: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update product: {error_type}: {error_msg}"
        )

@app.delete("/api/products/{product_id}")
async def delete_product(product_id: str, current_user: dict = Depends(get_current_user)):
    try:
        # Check if product exists first
        product = db.get_product(product_id)
        if not product:
            raise HTTPException(status_code=404, detail="Product not found")
        
        # Delete the product
        success = db.delete_product(product_id)
        if not success:
            raise HTTPException(status_code=500, detail="Failed to delete product")
        
        return {"message": "Product deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[API] Error deleting product {product_id}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to delete product: {str(e)}")

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

# Warehouse endpoints
@app.get("/api/warehouses", response_model=List[Warehouse])
async def get_warehouses(current_user: dict = Depends(get_current_user)):
    warehouses = db.get_warehouses()
    return [Warehouse(**w) for w in warehouses]

@app.get("/api/warehouses/{warehouse_id}", response_model=Warehouse)
async def get_warehouse(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    warehouse = db.get_warehouse(warehouse_id)
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return Warehouse(**warehouse)

@app.post("/api/warehouses", response_model=Warehouse)
async def create_warehouse(warehouse_data: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    warehouse = db.create_warehouse(warehouse_data.model_dump())
    return Warehouse(**warehouse)

@app.put("/api/warehouses/{warehouse_id}", response_model=Warehouse)
async def update_warehouse(warehouse_id: str, warehouse_data: WarehouseCreate, current_user: dict = Depends(get_current_user)):
    warehouse = db.update_warehouse(warehouse_id, warehouse_data.model_dump())
    if not warehouse:
        raise HTTPException(status_code=404, detail="Warehouse not found")
    return Warehouse(**warehouse)

@app.delete("/api/warehouses/{warehouse_id}")
async def delete_warehouse(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    try:
        db.delete_warehouse(warehouse_id)
        return {"message": "Warehouse deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=404, detail="Warehouse not found")

@app.get("/api/warehouses/{warehouse_id}/stock", response_model=List[WarehouseStockSummary])
async def get_warehouse_stock(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    stock_summary = db.get_warehouse_stock_summary(warehouse_id)
    return [WarehouseStockSummary(**s) for s in stock_summary]

@app.get("/api/warehouses/{warehouse_id}/stock-count")
async def get_warehouse_stock_count(warehouse_id: str, current_user: dict = Depends(get_current_user)):
    count = db.get_warehouse_stock_count(warehouse_id)
    return {"warehouse_id": warehouse_id, "total_stock": count}

@app.delete("/api/retailers/{retailer_id}")
async def delete_retailer(retailer_id: str, current_user: dict = Depends(get_current_user)):
    if not db.delete_retailer(retailer_id):
        raise HTTPException(status_code=404, detail="Retailer not found")
    return {"message": "Retailer deleted"}

@app.get("/api/purchases", response_model=List[Purchase])
async def get_purchases(current_user: dict = Depends(get_current_user)):
    purchases = db.get_purchases()
    return [Purchase(**p) for p in purchases]

@app.post("/api/purchases", response_model=Purchase, status_code=status.HTTP_201_CREATED)
async def create_purchase(purchase_data: PurchaseCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new purchase.
    
    Returns:
        Purchase: The created purchase with DB-generated id and created_at
        
    Raises:
        400: Validation error (invalid input)
        401: Authentication error (handled by get_current_user)
        500: Unexpected server error
    """
    try:
        print(f"[API] create_purchase start: supplier={purchase_data.supplier_name}, invoice={purchase_data.invoice_number}, items={len(purchase_data.items)}")
        print(f"[API] User: {current_user.get('email', 'unknown')}")
        
        items = [item.model_dump() for item in purchase_data.items]
        purchase = db.create_purchase(
            {"supplier_name": purchase_data.supplier_name, "invoice_number": purchase_data.invoice_number, "notes": purchase_data.notes},
            items
        )
        print(f"[API] Purchase created in DB: {purchase.get('id', 'no-id')}")
        
        # Check for expiry alerts in purchase items
        from datetime import date, timedelta
        today = date.today()
        thirty_days_later = today + timedelta(days=30)
        
        for item in purchase.get("items", []):
            expiry_date_str = item.get("expiry_date")
            if expiry_date_str:
                try:
                    if isinstance(expiry_date_str, str):
                        expiry_date = datetime.fromisoformat(expiry_date_str.replace("Z", "+00:00")).date()
                    else:
                        expiry_date = expiry_date_str
                    
                    if expiry_date <= thirty_days_later:
                        days_remaining = (expiry_date - today).days
                        # Trigger expiry alert SMS
                        product = db.get_product(item.get("product_id"))
                        if product:
                            asyncio.create_task(trigger_sms_notification(
                                event_type=SmsEventType.EXPIRY_ALERT,
                                data={
                                    "product_name": product.get("name", ""),
                                    "batch_number": item.get("batch_number", ""),
                                    "expiry_date": expiry_date.isoformat(),
                                    "days_remaining": str(days_remaining)
                                }
                            ))
                except Exception as e:
                    logger.error(f"Error checking expiry date: {e}")
        
        # Validate the response matches Purchase model
        try:
            purchase_model = Purchase(**purchase)
            print(f"[API] Purchase model validated successfully, returning response")
            return purchase_model
        except Exception as validation_error:
            print(f"[API] Purchase model validation failed: {validation_error}")
            print(f"[API] Purchase data: {purchase}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Purchase created but validation failed: {str(validation_error)}"
            )
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        print(f"[API] Validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Unexpected error creating purchase: {error_type}: {error_msg}")
        print(f"[API] Purchase data: {purchase_data.model_dump()}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create purchase: {error_type}: {error_msg}"
        )

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

@app.put("/api/sales/{sale_id}", response_model=Sale)
async def update_sale(
    sale_id: str, 
    sale_update: SaleUpdate, 
    current_user: dict = Depends(get_current_user)
):
    """
    Update sale invoice manually (admin only).
    
    Allows updating:
    - delivery_status: Delivery status (pending, delivered, partially_delivered, returned)
    - paid_amount: Paid amount (will auto-calculate due_amount and payment_status)
    - due_amount: Due amount (optional, if not provided, calculated from paid_amount)
    - payment_status: Payment status (optional, if not provided, auto-calculated)
    - delivered_at: Delivery timestamp (optional)
    - notes: Additional notes (optional)
    
    Auto-calculation logic:
    - If paid_amount is provided: due_amount = total_amount - paid_amount
    - Payment status: "paid" if due_amount <= 0, "partial" if paid_amount > 0, "due" otherwise
    - If delivery_status = "delivered" and delivered_at not provided: auto-set current timestamp
    
    Returns:
        Sale: Updated sale record
        
    Raises:
        404: Sale not found
        400: Validation error
        500: Server error
    """
    try:
        # Verify sale exists
        existing_sale = db.get_sale(sale_id)
        if not existing_sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        
        # Prepare update data (exclude None values)
        update_data = sale_update.model_dump(exclude_unset=True, exclude_none=True)
        
        # Convert datetime if needed
        if "delivered_at" in update_data and isinstance(update_data["delivered_at"], datetime):
            update_data["delivered_at"] = update_data["delivered_at"].isoformat()
        
        # Update sale
        updated_sale = db.update_sale(sale_id, update_data)
        if not updated_sale:
            raise HTTPException(status_code=404, detail="Sale not found after update")
        
        # Fetch complete sale with items
        complete_sale = db.get_sale(sale_id)
        if not complete_sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        
        return Sale(**complete_sale)
        
    except HTTPException:
        raise
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error updating sale: {error_type}: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update sale: {error_type}: {error_msg}"
        )

@app.post("/api/sales", response_model=Sale, status_code=status.HTTP_201_CREATED)
async def create_sale(sale_data: SaleCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new sale.
    
    Returns:
        Sale: The created sale with DB-generated id and created_at
        
    Raises:
        400: Validation error (invalid input)
        401: Authentication error (handled by get_current_user)
        500: Unexpected server error
    """
    try:
        print(f"[API] create_sale start: retailer_id={sale_data.retailer_id}, items={len(sale_data.items)}")
        print(f"[API] User: {current_user.get('email', 'unknown')}")
        
        items = [item.model_dump() for item in sale_data.items]
        sale = db.create_sale(
            {
                "retailer_id": sale_data.retailer_id,
                "payment_type": sale_data.payment_type,
                "paid_amount": sale_data.paid_amount,
                "notes": sale_data.notes,
                "assigned_to": sale_data.assigned_to
            },
            items
        )
        print(f"[API] Sale created in DB: {sale.get('id', 'no-id')}")
        
        # Trigger new order SMS notification
        retailer = db.get_retailer(sale_data.retailer_id)
        if retailer:
            asyncio.create_task(trigger_sms_notification(
                event_type=SmsEventType.NEW_ORDER,
                data={
                    "order_number": sale.get("invoice_number", ""),
                    "retailer_name": retailer.get("name", ""),
                    "total_amount": str(sale.get("total_amount", 0))
                }
            ))
        
        # Validate the response matches Sale model
        try:
            sale_model = Sale(**sale)
            print(f"[API] Sale model validated successfully, returning response")
            return sale_model
        except Exception as validation_error:
            print(f"[API] Sale model validation failed: {validation_error}")
            print(f"[API] Sale data: {sale}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Sale created but validation failed: {str(validation_error)}"
            )
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        print(f"[API] Validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Unexpected error creating sale: {error_type}: {error_msg}")
        print(f"[API] Sale data: {sale_data.model_dump()}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sale: {error_type}: {error_msg}"
        )

@app.post("/api/sales/{sale_id}/return", response_model=SaleReturn, status_code=status.HTTP_201_CREATED)
async def create_sale_return(
    sale_id: str,
    return_data: SaleReturnCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a sales return/credit note for a specific sale.
    
    This endpoint handles partial or full returns:
    - Validates return quantities
    - Increases inventory for returned items
    - Reduces retailer due amount (if adjust_due)
    - Creates immutable return records for audit
    
    Returns:
        SaleReturn: The created return record with items
        
    Raises:
        400: Validation error (invalid quantities, sale not found)
        404: Sale not found
        500: Unexpected server error
    """
    try:
        print(f"[API] create_sale_return start: sale_id={sale_id}, items={len(return_data.items)}")
        print(f"[API] User: {current_user.get('email', 'unknown')}")
        
        items = [item.model_dump() for item in return_data.items]
        return_record = db.create_sale_return(
            sale_id=sale_id,
            data=return_data.model_dump(),
            items=items,
            user_id=current_user.get("id")
        )
        
        print(f"[API] Sale return created: return_id={return_record.get('id')}, return_number={return_record.get('return_number')}")
        
        # Validate response matches SaleReturn model
        try:
            return_model = SaleReturn(**return_record)
            print(f"[API] Sale return model validated successfully, returning response")
            return return_model
        except Exception as validation_error:
            print(f"[API] Sale return model validation failed: {validation_error}")
            print(f"[API] Return data: {return_record}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Return created but validation failed: {str(validation_error)}"
            )
    except HTTPException:
        raise
    except ValueError as e:
        error_msg = str(e)
        print(f"[API] Validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Unexpected error creating sale return: {error_type}: {error_msg}")
        print(f"[API] Return data: {return_data.model_dump()}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create sale return: {error_type}: {error_msg}"
        )

@app.delete("/api/sales/{sale_id}")
async def delete_sale(sale_id: str, current_user: dict = Depends(get_current_user)):
    """
    Delete a sale order.
    
    Returns:
        dict: Success message
        
    Raises:
        401: Authentication error
        404: Sale not found
        500: Server error
    """
    try:
        # Verify sale exists
        sale = db.get_sale(sale_id)
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        
        # Delete the sale
        db.delete_sale(sale_id)
        return {"message": "Sale deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error deleting sale: {error_type}: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete sale: {error_msg}"
        )

@app.get("/api/sales/{sale_id}/returns", response_model=List[SaleReturn])
async def get_sale_returns(sale_id: str, current_user: dict = Depends(get_current_user)):
    """
    Get all returns for a specific sale.
    
    Returns:
        List[SaleReturn]: List of all return records for the sale
        
    Raises:
        401: Authentication error
        404: Sale not found
    """
    try:
        # Verify sale exists
        sale = db.get_sale(sale_id)
        if not sale:
            raise HTTPException(status_code=404, detail="Sale not found")
        
        returns = db.get_sale_returns(sale_id)
        return [SaleReturn(**ret) for ret in returns]
    except HTTPException:
        raise
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error getting sale returns: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sale returns: {error_type}: {error_msg}"
        )

@app.get("/api/payments", response_model=List[Payment])
async def get_payments(
    sale_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    payments = db.get_payments()
    if sale_id:
        payments = [p for p in payments if p.get("sale_id") == sale_id]
    return [Payment(**p) for p in payments]

@app.post("/api/payments", response_model=Payment)
async def create_payment(payment_data: PaymentCreate, current_user: dict = Depends(get_current_user)):
    try:
        payment = db.create_payment(payment_data.model_dump())
        return Payment(**payment)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[API] Error creating payment: {e}")
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        error_type = type(e).__name__
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create payment: {error_type}: {error_msg}"
        )

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

@app.get("/api/reports/sales")
async def get_sales_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get sales report with return aggregation.
    
    Query params:
    - from_date: Start date (YYYY-MM-DD)
    - to_date: End date (YYYY-MM-DD)
    
    Returns:
    - sales: List of sales with return totals (gross_total, returned_total, net_total)
    - summary: Aggregate totals (total_gross, total_returns, total_net, return_rate)
    """
    try:
        sales_report, summary = db.get_sales_report(from_date, to_date)
        return {
            "sales": [SaleReport(**sale) for sale in sales_report],
            "summary": SalesReportSummary(**summary)
        }
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error getting sales report: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sales report: {error_type}: {error_msg}"
        )

@app.get("/api/reports/sales-returns")
async def get_sales_returns_report(
    from_date: Optional[str] = None,
    to_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """
    Get sales returns report.
    
    Query params:
    - from_date: Start date (YYYY-MM-DD)
    - to_date: End date (YYYY-MM-DD)
    
    Returns:
    - List of return records with retailer, reason, refund_type, total_return_amount
    """
    try:
        returns_report = db.get_sales_returns_report(from_date, to_date)
        return [SaleReturnReport(**ret) for ret in returns_report]
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error getting sales returns report: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get sales returns report: {error_type}: {error_msg}"
        )

@app.post("/api/products/import")
async def import_products(products: List[ProductCreate], current_user: dict = Depends(get_current_user)):
    imported = []
    for product_data in products:
        product = db.create_product(product_data.model_dump())
        imported.append(Product(**product))
    return {"imported": len(imported), "products": imported}

# Category endpoints
@app.get("/api/categories", response_model=List[Category])
async def get_categories(current_user: dict = Depends(get_current_user)):
    try:
        print(f"[DEBUG] Getting categories, database type: {type(db).__name__}")
        categories = db.get_categories()
        print(f"[DEBUG] Retrieved {len(categories)} categories")
        return [Category(**c) for c in categories]
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[ERROR] Error getting categories: {error_type}: {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get categories: {error_type}: {error_msg}"
        )

@app.get("/api/categories/{category_id}", response_model=Category)
async def get_category(category_id: str, current_user: dict = Depends(get_current_user)):
    category = db.get_category(category_id)
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**category)

@app.post("/api/categories", status_code=status.HTTP_201_CREATED, response_model=Category)
async def create_category(category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new category.
    
    Returns:
        Category: The created category with DB-generated id and created_at
        
    Raises:
        400: Validation error (invalid input)
        401: Authentication error (handled by get_current_user)
        403: Permission error (RLS policy violation)
        409: Duplicate category name
        500: Unexpected server error
    """
    # Wrap entire function to ensure JSON error responses
    try:
        # Pydantic validation happens automatically, but ensure created_at is not sent
        data = category_data.model_dump(exclude_unset=True, exclude={"created_at"})
        print(f"[API] Creating category with data: {data}")
        print(f"[API] Database type: {type(db).__name__}")
        print(f"[API] User: {current_user.get('email', 'unknown')}")
        
        # Create category in database (created_at will be generated by DB)
        # Run in executor with HARD 10s timeout to prevent hanging
        loop = asyncio.get_running_loop()
        
        try:
            # Run database operation in thread pool with HARD timeout
            category = await asyncio.wait_for(
                loop.run_in_executor(None, db.create_category, data),
                timeout=10.0  # HARD 10 second timeout - prevents hanging
            )
            print(f"[API] Category created in DB: {category.get('id', 'no-id')}")
        except asyncio.TimeoutError:
            # Timeout occurred - ensure we ALWAYS return a response
            error_msg = "Database operation timed out after 10 seconds"
            print(f"[API] Database timeout: {error_msg}")
            raise HTTPException(
                status_code=status.HTTP_504_GATEWAY_TIMEOUT,
                detail=error_msg
            )
        except Exception as db_error:
            # Any database error - ensure we ALWAYS return a response
            error_type = type(db_error).__name__
            error_msg = str(db_error)
            print(f"[API] Database error ({error_type}): {error_msg}")
            import traceback
            traceback.print_exc()
            # Re-raise to be caught by outer handlers - ensures response
            raise
        
        # Validate the response matches Category model
        try:
            category_model = Category(**category)
            print(f"[API] Category model validated successfully, returning response")
            return category_model
        except Exception as validation_error:
            print(f"[API] Category model validation failed: {validation_error}")
            print(f"[API] Category data: {category}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Category created but validation failed: {str(validation_error)}"
            )
    except HTTPException:
        # Re-raise HTTP exceptions (already have correct status codes)
        raise
    except ValueError as e:
        # Validation errors from database layer
        error_msg = str(e)
        print(f"[API] Validation error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_msg
        )
    except KeyError as e:
        # Duplicate key error (409 Conflict)
        error_msg = str(e)
        print(f"[API] Duplicate category error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=error_msg
        )
    except PermissionError as e:
        # RLS/permission error (403 Forbidden)
        error_msg = str(e)
        print(f"[API] Permission error: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=error_msg
        )
    except Exception as e:
        # Unexpected errors (500) - ensure we always return a response
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Unexpected error creating category: {error_type}: {error_msg}")
        print(f"[API] Category data: {category_data.model_dump()}")
        import traceback
        traceback.print_exc()
        # Always return a proper HTTP response, never hang
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create category: {error_type}: {error_msg}"
        )

@app.put("/api/categories/{category_id}", response_model=Category)
async def update_category(category_id: str, category_data: CategoryCreate, current_user: dict = Depends(get_current_user)):
    category = db.update_category(category_id, category_data.model_dump())
    if not category:
        raise HTTPException(status_code=404, detail="Category not found")
    return Category(**category)

@app.delete("/api/categories/{category_id}")
async def delete_category(category_id: str, current_user: dict = Depends(get_current_user)):
    if not db.delete_category(category_id):
        raise HTTPException(status_code=404, detail="Category not found")
    return {"message": "Category deleted"}

# Supplier endpoints
@app.get("/api/suppliers", response_model=List[Supplier])
async def get_suppliers(current_user: dict = Depends(get_current_user)):
    print(f"[API] get_suppliers: User: {current_user.get('email', 'unknown')}")
    suppliers = db.get_suppliers()
    print(f"[API] get_suppliers: Retrieved {len(suppliers)} suppliers")
    if suppliers:
        print(f"[API] get_suppliers: First supplier: id={suppliers[0].get('id', 'no-id')}, name={suppliers[0].get('name', 'no-name')}")
    return [Supplier(**s) for s in suppliers]

@app.get("/api/suppliers/{supplier_id}", response_model=Supplier)
async def get_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    supplier = db.get_supplier(supplier_id)
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return Supplier(**supplier)

@app.post("/api/suppliers", response_model=Supplier)
async def create_supplier(supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    """
    Create a new supplier.
    
    Returns:
        Supplier: The created supplier with DB-generated id and created_at
        
    Raises:
        400: Validation error (invalid input)
        401: Authentication error (handled by get_current_user)
        500: Unexpected server error
    """
    try:
        print(f"[API] create_supplier: Start - name={supplier_data.name}, phone={supplier_data.phone}")
        print(f"[API] create_supplier: User: {current_user.get('email', 'unknown')}")
        print(f"[API] create_supplier: Payload: {supplier_data.model_dump()}")
        
        supplier = db.create_supplier(supplier_data.model_dump())
        print(f"[API] create_supplier: Supplier created in DB: id={supplier.get('id', 'no-id')}, name={supplier.get('name', 'no-name')}")
        
        # Validate the response matches Supplier model
        try:
            supplier_model = Supplier(**supplier)
            print(f"[API] create_supplier: Supplier model validated successfully, returning response")
            return supplier_model
        except Exception as validation_error:
            print(f"[API] create_supplier: Supplier model validation failed: {validation_error}")
            print(f"[API] create_supplier: Supplier data: {supplier}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Supplier created but response validation failed: {str(validation_error)}"
            )
    except (ValueError, PermissionError, KeyError) as e:
        print(f"[API] create_supplier: Known error: {type(e).__name__}: {str(e)}")
        if isinstance(e, KeyError):
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(e))
        elif isinstance(e, PermissionError):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=str(e))
        else:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        error_type = type(e).__name__
        error_msg = str(e)
        print(f"[API] create_supplier: Unexpected error ({error_type}): {error_msg}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create supplier: {error_msg}"
        )

@app.put("/api/suppliers/{supplier_id}", response_model=Supplier)
async def update_supplier(supplier_id: str, supplier_data: SupplierCreate, current_user: dict = Depends(get_current_user)):
    supplier = db.update_supplier(supplier_id, supplier_data.model_dump())
    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found")
    return Supplier(**supplier)

@app.delete("/api/suppliers/{supplier_id}")
async def delete_supplier(supplier_id: str, current_user: dict = Depends(get_current_user)):
    if not db.delete_supplier(supplier_id):
        raise HTTPException(status_code=404, detail="Supplier not found")
    return {"message": "Supplier deleted"}

# Unit endpoints
@app.get("/api/units", response_model=List[Unit])
async def get_units(current_user: dict = Depends(get_current_user)):
    units = db.get_units()
    return [Unit(**u) for u in units]

@app.get("/api/units/{unit_id}", response_model=Unit)
async def get_unit(unit_id: str, current_user: dict = Depends(get_current_user)):
    unit = db.get_unit(unit_id)
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return Unit(**unit)

@app.post("/api/units", response_model=Unit)
async def create_unit(unit_data: UnitCreate, current_user: dict = Depends(get_current_user)):
    unit = db.create_unit(unit_data.model_dump())
    return Unit(**unit)

@app.put("/api/units/{unit_id}", response_model=Unit)
async def update_unit(unit_id: str, unit_data: UnitCreate, current_user: dict = Depends(get_current_user)):
    unit = db.update_unit(unit_id, unit_data.model_dump())
    if not unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return Unit(**unit)

@app.delete("/api/units/{unit_id}")
async def delete_unit(unit_id: str, current_user: dict = Depends(get_current_user)):
    if not db.delete_unit(unit_id):
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted"}

# SMS Notification endpoints
sms_service = SmsService()
sms_template_renderer = SmsTemplateRenderer()
sms_queue_manager = SmsQueueManager(db)

# Helper function to trigger SMS notifications
async def trigger_sms_notification(
    event_type: SmsEventType,
    data: Dict[str, Any],
    recipients: Optional[List[str]] = None
):
    """
    Trigger SMS notification for an event
    
    Args:
        event_type: Type of event (low_stock, expiry_alert, payment_due, new_order)
        data: Event data containing variables for template rendering
        recipients: Optional list of recipient phone numbers (if None, will get from settings)
    """
    try:
        # Check if SMS is enabled
        if not sms_service.enabled:
            return
        
        # Get template for this event type
        template = db.get_sms_template_by_event_type(event_type.value)
        if not template:
            logger.warning(f"No SMS template found for event type: {event_type.value}")
            return
        
        # Get SMS settings for this event type (check role-based settings)
        settings = db.get_sms_settings(role="admin")  # Default to admin role
        event_settings = [s for s in settings if s.get("event_type") == event_type.value]
        
        if not event_settings or not any(s.get("enabled", False) for s in event_settings):
            # SMS not enabled for this event type
            return
        
        # Use first enabled setting
        setting = next((s for s in event_settings if s.get("enabled", False)), None)
        if not setting:
            return
        
        # Render template with data
        message = sms_template_renderer.render(template["template_text"], data)
        
        # Get recipient phone numbers
        recipient_phones = recipients or []
        
        if not recipient_phones:
            # Get recipients based on setting
            recipient_types = setting.get("recipients", [])
            
            if "admins" in recipient_types:
                # Get admin users' phone numbers
                # Note: We'll need to implement get_users method or query users table directly
                # For now, skip admin phone collection if method doesn't exist
                if hasattr(db, 'get_users'):
                    users = db.get_users()
                    admin_phones = [u.get("phone") for u in users if u.get("role") == "admin" and u.get("phone")]
                    recipient_phones.extend(admin_phones)
            
            if "retailers" in recipient_types and event_type == SmsEventType.PAYMENT_DUE:
                # For payment due, get retailer phone from data
                if "retailer_phone" in data:
                    recipient_phones.append(data["retailer_phone"])
            
            if "suppliers" in recipient_types:
                # Get supplier phone numbers
                suppliers = db.get_suppliers()
                supplier_phones = [s.get("phone") for s in suppliers if s.get("phone")]
                recipient_phones.extend(supplier_phones)
        
        # Remove duplicates and None values
        recipient_phones = list(set([p for p in recipient_phones if p]))
        
        if not recipient_phones:
            logger.warning(f"No recipient phones found for event type: {event_type.value}")
            return
        
        # Send SMS based on delivery mode
        delivery_mode = setting.get("delivery_mode", "immediate")
        
        if delivery_mode == "immediate":
            # Send immediately
            for phone in recipient_phones:
                result = await sms_service.send_sms(phone, message)
                # Log the SMS
                log_data = {
                    "recipient_phone": phone,
                    "message": message,
                    "event_type": event_type.value,
                    "status": "sent" if result.get("status") == "Success" else "failed",
                    "trxn_id": result.get("trxnId"),
                    "error_message": result.get("responseResult") if result.get("status") != "Success" else None
                }
                db.create_sms_log(log_data)
        else:
            # Add to queue
            for phone in recipient_phones:
                await sms_queue_manager.add_to_queue(
                    recipient_phone=phone,
                    message=message,
                    event_type=event_type.value,
                    scheduled_at=datetime.now()
                )
    
    except Exception as e:
        # Don't let SMS errors break the main flow
        logger.error(f"Error triggering SMS notification: {e}")
        import traceback
        traceback.print_exc()

@app.get("/api/sms/settings", response_model=List[SmsSettings])
async def get_sms_settings(
    user_id: Optional[str] = None,
    role: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS settings for current user or role"""
    try:
        user_role = current_user.get("role", "sales_rep")
        user_id_param = current_user.get("id") if not user_id else user_id
        role_param = user_role if not role else role
        
        settings = db.get_sms_settings(user_id=user_id_param, role=role_param)
        result = [SmsSettings(**s) for s in settings]
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get SMS settings: {str(e)}"
        )

@app.put("/api/sms/settings", response_model=SmsSettings)
async def update_sms_settings(
    settings_data: SmsSettingsCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create or update SMS settings"""
    try:
        user_id = current_user.get("id")
        user_role = current_user.get("role", "sales_rep")
        
        # Pydantic converts string to Enum, so we can safely access .value
        event_type_str = settings_data.event_type.value
        delivery_mode_str = settings_data.delivery_mode.value if settings_data.delivery_mode else SmsDeliveryMode.IMMEDIATE.value
        
        # Check if settings already exist (check both user_id and role)
        existing = db.get_sms_settings_by_user_and_event(user_id, event_type_str)
        existing_by_role = None
        if not existing:
            # Also check by role (due to UNIQUE(role, event_type) constraint)
            existing_by_role = db.get_sms_settings_by_role_and_event(user_role, event_type_str)
        
        # Use existing_by_role if found (due to UNIQUE constraint)
        if existing_by_role and not existing:
            existing = existing_by_role
        
        # Prepare settings dict for database
        settings_dict = {
            "user_id": user_id,
            "role": user_role,
            "event_type": event_type_str,
            "enabled": settings_data.enabled,
            "delivery_mode": delivery_mode_str,
            "recipients": settings_data.recipients or []
        }
        
        if existing:
            updated = db.update_sms_settings(existing["id"], settings_dict)
            if not updated:
                raise HTTPException(status_code=404, detail="SMS settings not found")
            result = SmsSettings(**updated)
            return result
        else:
            try:
                created = db.create_sms_settings(settings_dict)
                result = SmsSettings(**created)
                return result
            except Exception as db_error:
                # Check if it's a unique constraint violation (user_id + event_type or role + event_type)
                error_str = str(db_error).lower()
                if "unique" in error_str or "duplicate" in error_str:
                    # Try to update instead if unique constraint violation
                    existing_by_role = db.get_sms_settings_by_role_and_event(user_role, event_type_str)
                    if existing_by_role:
                        updated = db.update_sms_settings(existing_by_role["id"], settings_dict)
                        if updated:
                            result = SmsSettings(**updated)
                            return result
                raise
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating SMS settings: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update SMS settings: {str(e)}"
        )

@app.get("/api/sms/templates", response_model=List[SmsTemplate])
async def get_sms_templates(current_user: dict = Depends(get_current_user)):
    """Get all SMS templates"""
    templates = db.get_sms_templates()
    return [SmsTemplate(**t) for t in templates]

@app.get("/api/sms/templates/{event_type}", response_model=SmsTemplate)
async def get_sms_template_by_event(
    event_type: str,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS template by event type"""
    template = db.get_sms_template_by_event_type(event_type)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return SmsTemplate(**template)

@app.post("/api/sms/templates", response_model=SmsTemplate)
async def create_sms_template(
    template_data: SmsTemplateCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create SMS template (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can create templates")
    
    template_dict = template_data.model_dump()
    template_dict["event_type"] = template_data.event_type.value
    template = db.create_sms_template(template_dict)
    return SmsTemplate(**template)

@app.put("/api/sms/templates/{template_id}", response_model=SmsTemplate)
async def update_sms_template(
    template_id: str,
    template_data: SmsTemplateUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update SMS template (admin only)"""
    if current_user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update templates")
    
    update_dict = template_data.model_dump(exclude_unset=True)
    updated = db.update_sms_template(template_id, update_dict)
    if not updated:
        raise HTTPException(status_code=404, detail="Template not found")
    return SmsTemplate(**updated)

@app.get("/api/sms/logs", response_model=List[SmsLog])
async def get_sms_logs(
    limit: int = 100,
    event_type: Optional[str] = None,
    recipient_phone: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get SMS logs"""
    logs = db.get_sms_logs(limit=limit, event_type=event_type, recipient_phone=recipient_phone)
    return [SmsLog(**log) for log in logs]

@app.get("/api/sms/balance")
async def get_sms_balance(current_user: dict = Depends(get_current_user)):
    """Check mimsms.com account balance"""
    balance = await sms_service.check_balance()
    return balance

@app.post("/api/sms/test")
async def send_test_sms(
    request: SmsSendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send test SMS"""
    result = await sms_service.send_sms(
        recipient_phone=request.recipient_phone,
        message=request.message
    )
    
    # Log the SMS
    log_data = {
        "recipient_phone": request.recipient_phone,
        "message": request.message,
        "event_type": request.event_type.value if request.event_type else "test",
        "status": "sent" if result.get("status") == "Success" else "failed",
        "trxn_id": result.get("trxnId"),
        "error_message": result.get("responseResult") if result.get("status") != "Success" else None
    }
    db.create_sms_log(log_data)
    
    return result

@app.post("/api/sms/send")
async def send_sms(
    request: SmsSendRequest,
    current_user: dict = Depends(get_current_user)
):
    """Send SMS immediately"""
    result = await sms_service.send_sms(
        recipient_phone=request.recipient_phone,
        message=request.message
    )
    
    # Log the SMS
    log_data = {
        "recipient_phone": request.recipient_phone,
        "message": request.message,
        "event_type": request.event_type.value if request.event_type else "manual",
        "status": "sent" if result.get("status") == "Success" else "failed",
        "trxn_id": result.get("trxnId"),
        "error_message": result.get("responseResult") if result.get("status") != "Success" else None
    }
    db.create_sms_log(log_data)
    
    return result

# ============================================
# Route/Batch System Endpoints
# ============================================

@app.post("/api/routes", response_model=RouteWithSales, status_code=status.HTTP_201_CREATED)
async def create_route(route_data: RouteCreate, current_user: dict = Depends(get_current_user)):
    """Create a new route/batch with sales orders"""
    try:
        route = db.create_route(route_data.model_dump(), route_data.sale_ids)
        return RouteWithSales(**route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[API] Error creating route: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create route: {str(e)}")

@app.get("/api/routes", response_model=List[Route])
async def get_routes(
    assigned_to: Optional[str] = None,
    status: Optional[str] = None,
    route_date: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all routes with optional filters"""
    routes = db.get_routes(assigned_to=assigned_to, status=status, route_date=route_date)
    return [Route(**r) for r in routes]

@app.get("/api/routes/{route_id}", response_model=RouteWithSales)
async def get_route(route_id: str, current_user: dict = Depends(get_current_user)):
    """Get route details with all sales and previous due information"""
    route = db.get_route(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    return RouteWithSales(**route)

@app.put("/api/routes/{route_id}", response_model=Route)
async def update_route(
    route_id: str,
    route_update: RouteUpdate,
    current_user: dict = Depends(get_current_user)
):
    """Update route (status, notes, etc.)"""
    try:
        # #region agent log
        import json
        from datetime import datetime
        log_data = {
            "location": "main.py:update_route:entry",
            "message": "Route update endpoint called",
            "data": {
                "route_id": route_id,
                "update_data": route_update.model_dump(exclude_unset=True)
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
        
        route = db.update_route(route_id, route_update.model_dump(exclude_unset=True))
        
        # #region agent log
        log_data = {
            "location": "main.py:update_route:after_db_update",
            "message": "Route updated in database",
            "data": {
                "route_id": route_id,
                "route_found": route is not None,
                "route_status": route.get("status") if route else None
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
        
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")
        return Route(**route)
    except ValueError as e:
        # #region agent log
        log_data = {
            "location": "main.py:update_route:value_error",
            "message": "ValueError in route update",
            "data": {
                "route_id": route_id,
                "error": str(e)
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
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # #region agent log
        log_data = {
            "location": "main.py:update_route:exception",
            "message": "Unexpected error in route update",
            "data": {
                "route_id": route_id,
                "error": str(e),
                "error_type": type(e).__name__
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
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to update route: {str(e)}")

@app.post("/api/routes/{route_id}/sales", response_model=RouteWithSales)
async def add_sales_to_route(
    route_id: str,
    sale_ids: List[str],
    current_user: dict = Depends(get_current_user)
):
    """Add sales orders to an existing route"""
    try:
        route = db.add_sales_to_route(route_id, sale_ids)
        return RouteWithSales(**route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add sales to route: {str(e)}")

@app.delete("/api/routes/{route_id}/sales/{sale_id}", response_model=RouteWithSales)
async def remove_sale_from_route(
    route_id: str,
    sale_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Remove a sale from route"""
    try:
        route = db.remove_sale_from_route(route_id, sale_id)
        if not route:
            raise HTTPException(status_code=404, detail="Route not found")
        return RouteWithSales(**route)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.delete("/api/routes/{route_id}")
async def delete_route(route_id: str, current_user: dict = Depends(get_current_user)):
    """Delete a route"""
    try:
        success = db.delete_route(route_id)
        if not success:
            raise HTTPException(status_code=404, detail="Route not found")
        return {"message": "Route deleted successfully"}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/retailers/{retailer_id}/previous-due")
async def get_retailer_previous_due(
    retailer_id: str,
    exclude_route_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get current previous due for a retailer (for new routes)"""
    previous_due = db.calculate_previous_due(retailer_id, exclude_route_id=exclude_route_id)
    return {"retailer_id": retailer_id, "previous_due": previous_due}

@app.get("/api/routes/{route_id}/previous-due")
async def get_route_previous_due(
    route_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get previous due calculation for all retailers in route"""
    route = db.get_route(route_id)
    if not route:
        raise HTTPException(status_code=404, detail="Route not found")
    
    # Return previous due snapshots from route_sales
    previous_due_map = {}
    for route_sale in route.get("route_sales", []):
        sale_id = route_sale["sale_id"]
        sale = next((s for s in route.get("sales", []) if s["id"] == sale_id), None)
        if sale:
            retailer_id = sale.get("retailer_id")
            if retailer_id not in previous_due_map:
                previous_due_map[retailer_id] = {
                    "retailer_id": retailer_id,
                    "retailer_name": sale.get("retailer_name"),
                    "previous_due": float(route_sale.get("previous_due", 0))
                }
    
    return {"route_id": route_id, "previous_due_by_retailer": list(previous_due_map.values())}

@app.post("/api/routes/{route_id}/reconcile", response_model=RouteReconciliation, status_code=status.HTTP_201_CREATED)
async def create_route_reconciliation(
    route_id: str,
    reconciliation_data: RouteReconciliationCreate,
    current_user: dict = Depends(get_current_user)
):
    """Create reconciliation record for a route"""
    try:
        reconciliation = db.create_route_reconciliation(
            route_id,
            reconciliation_data.model_dump(),
            user_id=current_user.get("id")
        )
        return RouteReconciliation(**reconciliation)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[API] Error creating reconciliation: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create reconciliation: {str(e)}")

@app.get("/api/reconciliations", response_model=List[RouteReconciliation])
async def get_reconciliations(
    route_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    """Get all reconciliations"""
    reconciliations = db.get_route_reconciliations(route_id=route_id)
    return [RouteReconciliation(**r) for r in reconciliations]

@app.get("/api/reconciliations/{reconciliation_id}", response_model=RouteReconciliation)
async def get_reconciliation(
    reconciliation_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get reconciliation details"""
    reconciliation = db.get_route_reconciliation(reconciliation_id)
    if not reconciliation:
        raise HTTPException(status_code=404, detail="Reconciliation not found")
    return RouteReconciliation(**reconciliation)

@app.get("/api/users/{user_id}/cash-holding")
async def get_sr_cash_holding(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get current cash holding for an SR"""
    user = db.get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    return {
        "user_id": user_id,
        "user_name": user.get("name"),
        "current_cash_holding": float(user.get("current_cash_holding", 0))
    }

@app.get("/api/users/{user_id}/accountability", response_model=SrAccountability)
async def get_sr_accountability(
    user_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get full accountability report for an SR"""
    accountability = db.get_sr_accountability(user_id)
    if not accountability:
        raise HTTPException(status_code=404, detail="User not found or not an SR")
    return SrAccountability(**accountability)

@app.post("/api/admin/backfill-payment-route-id")
async def backfill_payment_route_id(
    dry_run: bool = True,
    current_user: dict = Depends(get_current_user)
):
    """
    ONE-TIME ADMIN ENDPOINT: Backfill payments.route_id from sales.route_id
    
    This fixes historical payments created before 2026-01-13 that have route_id = NULL.
    New payments already have route_id set correctly via create_payment().
    
    Args:
        dry_run: If True, only previews changes without updating (default: True for safety)
    
    Returns:
        dict with backfill statistics
    """
    # Check if user is admin
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    
    try:
        result = db.backfill_payment_route_id(dry_run=dry_run)
        return result
    except Exception as e:
        error_msg = str(e)
        error_type = type(e).__name__
        print(f"[API] Error in backfill_payment_route_id: {error_type}: {error_msg}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backfill failed: {error_msg}"
        )

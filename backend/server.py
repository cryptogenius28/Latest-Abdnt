"""Abundant Merchandise — FastAPI backend.

Routes:
- /api/auth/*       JWT auth (cookie-based)
- /api/products     Catalog (list, detail, categories)
- /api/admin/*      Admin product CRUD
"""
import logging
import math
import os
import re
from pathlib import Path
from typing import Optional, List

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Query, Response, status
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

from auth_utils import (  # noqa: E402
    ACCESS_COOKIE,
    REFRESH_COOKIE,
    clear_auth_cookies,
    create_access_token,
    create_refresh_token,
    decode_token,
    get_current_user_payload,
    hash_password,
    require_admin,
    set_auth_cookies,
    verify_password,
)
from models import (  # noqa: E402
    Category,
    PasswordChange,
    ProductCreate,
    ProductListResponse,
    ProductUpdate,
    Product,
    ProfileUpdate,
    UserCreate,
    UserLogin,
    UserPublic,
)
from commerce_routes import router as commerce_router  # noqa: E402
from ai_routes import router as ai_router  # noqa: E402

# ----------------------------- App / DB -----------------------------
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

app = FastAPI(title="Abundant Merchandise API")
app.state.db = db  # expose db for routers
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger("abundant")

CATEGORIES = [
    {"slug": "home-garden", "name": "Home & Garden", "image": "https://images.unsplash.com/photo-1724582586529-62622e50c0b3"},
    {"slug": "electronics", "name": "Electronics", "image": "https://images.pexels.com/photos/705164/computer-laptop-work-place-camera-705164.jpeg"},
    {"slug": "fashion", "name": "Fashion", "image": "https://images.pexels.com/photos/13158675/pexels-photo-13158675.jpeg"},
    {"slug": "beauty", "name": "Beauty", "image": "https://images.pexels.com/photos/7256102/pexels-photo-7256102.jpeg"},
    {"slug": "sports", "name": "Sports & Outdoors", "image": "https://images.pexels.com/photos/6740821/pexels-photo-6740821.jpeg"},
    {"slug": "tools", "name": "Tools & Hardware", "image": "https://images.pexels.com/photos/220639/pexels-photo-220639.jpeg"},
    {"slug": "toys", "name": "Toys & Kids", "image": "https://images.pexels.com/photos/3661193/pexels-photo-3661193.jpeg"},
    {"slug": "office", "name": "Office & Stationery", "image": "https://images.pexels.com/photos/5872176/pexels-photo-5872176.jpeg"},
    {"slug": "automotive", "name": "Automotive", "image": "https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg"},
]


# ----------------------------- Helpers -----------------------------
def strip_mongo(doc: dict) -> dict:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


# ----------------------------- Health -----------------------------
@api.get("/")
async def root():
    return {"message": "Abundant Merchandise API", "status": "ok"}


# ----------------------------- Auth -----------------------------
@api.post("/auth/register", response_model=UserPublic)
async def register(payload: UserCreate, response: Response):
    existing = await db.users.find_one({"email": payload.email.lower()})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    user = {
        "id": __import__("uuid").uuid4().hex,
        "email": payload.email.lower(),
        "name": payload.name.strip(),
        "password_hash": hash_password(payload.password),
        "role": "customer",
        "created_at": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
    }
    await db.users.insert_one(user)
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return UserPublic(**user, access_token=access)


@api.post("/auth/login", response_model=UserPublic)
async def login(payload: UserLogin, response: Response):
    user = await db.users.find_one({"email": payload.email.lower()})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    access = create_access_token(user["id"], user["email"], user["role"])
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return UserPublic(**strip_mongo(user), access_token=access)


@api.post("/auth/logout")
async def logout(response: Response):
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me", response_model=UserPublic)
async def me(payload: dict = Depends(get_current_user_payload)):
    user = await db.users.find_one({"id": payload["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return UserPublic(**strip_mongo(user))


@api.post("/auth/refresh", response_model=UserPublic)
async def refresh_token_endpoint(response: Response, request_refresh: Optional[str] = None):
    # Reads refresh cookie via Request; handled by extracting from cookies header
    from fastapi import Request as _Req  # noqa
    raise HTTPException(status_code=501, detail="Refresh endpoint not used in this build")


@api.patch("/auth/profile", response_model=UserPublic)
async def update_profile(payload: ProfileUpdate, current: dict = Depends(get_current_user_payload)):
    user = await db.users.find_one({"id": current["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    new_name = payload.name.strip()
    if not new_name:
        raise HTTPException(status_code=400, detail="Name cannot be empty")
    await db.users.update_one({"id": user["id"]}, {"$set": {"name": new_name}})
    user["name"] = new_name
    return UserPublic(**strip_mongo(user))


@api.post("/auth/change-password")
async def change_password(payload: PasswordChange, current: dict = Depends(get_current_user_payload)):
    user = await db.users.find_one({"id": current["sub"]})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if not verify_password(payload.current_password, user.get("password_hash", "")):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must be different from current password")
    await db.users.update_one({"id": user["id"]}, {"$set": {"password_hash": hash_password(payload.new_password)}})
    return {"ok": True}


# ----------------------------- Categories -----------------------------
@api.get("/categories", response_model=List[Category])
async def list_categories():
    out: List[Category] = []
    for c in CATEGORIES:
        count = await db.products.count_documents({"category": c["slug"]})
        out.append(Category(slug=c["slug"], name=c["name"], image=c["image"], count=count))
    return out


# ----------------------------- Search Trending -----------------------------
@api.get("/search/trending")
async def trending_searches(limit: int = Query(8, ge=1, le=20)):
    """Return curated trending search terms derived from top brands + popular tags."""
    brand_pipeline = [
        {"$match": {"brand": {"$ne": ""}}},
        {"$group": {"_id": "$brand", "score": {"$sum": {"$add": ["$review_count", {"$multiply": ["$rating", 5]}]}}}},
        {"$sort": {"score": -1}},
        {"$limit": 5},
    ]
    tag_pipeline = [
        {"$unwind": "$tags"},
        {"$group": {"_id": "$tags", "score": {"$sum": {"$add": ["$review_count", 1]}}}},
        {"$sort": {"score": -1}},
        {"$limit": 8},
    ]
    brands = [doc["_id"] async for doc in db.products.aggregate(brand_pipeline) if doc.get("_id")]
    tags = [doc["_id"] async for doc in db.products.aggregate(tag_pipeline) if doc.get("_id")]
    seen, terms = set(), []
    for t in tags + brands:
        key = t.strip().lower()
        if key and key not in seen:
            seen.add(key)
            terms.append(t.strip())
        if len(terms) >= limit:
            break
    return {"terms": terms}


# ----------------------------- Restock Alerts -----------------------------
class RestockAlertRequest(__import__("pydantic").BaseModel):
    product_id: str
    email: str


@api.post("/restock-alerts", status_code=201)
async def subscribe_restock_alert(payload: RestockAlertRequest):
    """Public — subscribe to be notified when a warehouse product is back in stock."""
    email = payload.email.strip().lower()
    if "@" not in email or "." not in email.split("@")[-1]:
        raise HTTPException(status_code=400, detail="Invalid email address")
    product = await db.products.find_one(
        {"id": payload.product_id},
        {"_id": 0, "id": 1, "title": 1, "fulfillment_type": 1, "stock_quantity": 1},
    )
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.get("fulfillment_type") != "warehouse":
        raise HTTPException(status_code=400, detail="Restock alerts are only available for warehouse products.")
    from datetime import datetime as _dt, timezone as _tz
    doc = {
        "product_id": payload.product_id,
        "product_title": product.get("title") or "",
        "email": email,
        "created_at": _dt.now(_tz.utc).isoformat(),
        "notified_at": None,
    }
    try:
        await db.restock_alerts.update_one(
            {"product_id": payload.product_id, "email": email},
            {"$setOnInsert": doc},
            upsert=True,
        )
    except Exception as exc:  # noqa: BLE001
        logger.exception("Failed to record restock alert: %s", exc)
        raise HTTPException(status_code=500, detail="Could not save alert") from exc
    return {"ok": True, "message": "We'll email you the moment it's back."}


@api.get("/admin/restock-alerts")
async def admin_restock_alerts(_: dict = Depends(require_admin)):
    """Admin — pending restock alerts grouped by product."""
    pipeline = [
        {"$match": {"notified_at": None}},
        {"$group": {
            "_id": "$product_id",
            "product_title": {"$first": "$product_title"},
            "count": {"$sum": 1},
            "latest": {"$max": "$created_at"},
        }},
        {"$sort": {"count": -1, "latest": -1}},
        {"$limit": 50},
    ]
    grouped = await db.restock_alerts.aggregate(pipeline).to_list(50)
    items = []
    for g in grouped:
        items.append({
            "product_id": g["_id"],
            "product_title": g.get("product_title") or "(unknown)",
            "subscribers": g["count"],
            "latest_subscription": g.get("latest"),
        })
    total_pending = await db.restock_alerts.count_documents({"notified_at": None})
    return {"items": items, "total_pending": total_pending}


async def _dispatch_restock_emails() -> dict:
    """Find pending restock alerts whose product is back in stock, send emails,
    and mark them notified. Returns counts."""
    from email_service import send_restock_alert as _send_restock
    from datetime import datetime as _dt, timezone as _tz

    pending_ids = await db.restock_alerts.distinct("product_id", {"notified_at": None})
    if not pending_ids:
        return {"checked": 0, "ready": 0, "sent": 0, "failed": 0}
    ready_products = {}
    async for p in db.products.find(
        {
            "id": {"$in": pending_ids},
            "fulfillment_type": "warehouse",
            "stock_quantity": {"$gt": 0},
        },
        {"_id": 0, "id": 1, "title": 1, "price": 1, "sale_price": 1, "images": 1, "stock_quantity": 1, "reorder_point": 1},
    ):
        ready_products[p["id"]] = p

    if not ready_products:
        return {"checked": len(pending_ids), "ready": 0, "sent": 0, "failed": 0}

    store_url = (os.environ.get("APP_URL") or os.environ.get("PUBLIC_APP_URL") or "").rstrip("/")
    sent = failed = 0
    cursor = db.restock_alerts.find(
        {"notified_at": None, "product_id": {"$in": list(ready_products.keys())}},
        {"_id": 1, "product_id": 1, "email": 1},
    )
    now_iso = _dt.now(_tz.utc).isoformat()
    async for alert in cursor:
        product = ready_products.get(alert["product_id"])
        if not product:
            continue
        ok = await _send_restock(alert["email"], product, store_url=store_url)
        # Always mark notified to avoid retry storms; record failure on the doc.
        await db.restock_alerts.update_one(
            {"_id": alert["_id"]},
            {"$set": {"notified_at": now_iso, "delivery_status": "sent" if ok else "skipped"}},
        )
        if ok:
            sent += 1
        else:
            failed += 1
    return {"checked": len(pending_ids), "ready": len(ready_products), "sent": sent, "failed": failed}


@api.post("/admin/restock-alerts/run")
async def admin_dispatch_restock(_: dict = Depends(require_admin)):
    """Manual trigger — admin can immediately try to dispatch pending restock emails."""
    result = await _dispatch_restock_emails()
    return {"ok": True, **result}


# ----------------------------- Products -----------------------------
@api.get("/products", response_model=ProductListResponse)
async def list_products(
    q: Optional[str] = Query(None, description="Search query"),
    category: Optional[str] = None,
    brand: Optional[str] = None,
    min_price: Optional[float] = None,
    max_price: Optional[float] = None,
    on_sale: Optional[bool] = None,
    featured: Optional[bool] = None,
    color: Optional[str] = Query(None, description="Filter by variant color (case-insensitive)"),
    size: Optional[str] = Query(None, description="Filter by variant size"),
    min_rating: Optional[float] = Query(None, ge=0, le=5),
    fulfillment_type: Optional[str] = None,
    sort: str = Query("newest", description="newest|price_asc|price_desc|rating|popular"),
    page: int = Query(1, ge=1),
    page_size: int = Query(24, ge=1, le=96),
):
    query: dict = {}
    if category:
        query["category"] = category
    if brand:
        query["brand"] = brand
    if featured is not None:
        query["featured"] = featured
    if on_sale:
        query["sale_price"] = {"$ne": None, "$gt": 0}
    if fulfillment_type:
        query["fulfillment_type"] = fulfillment_type
    if min_rating is not None:
        query["rating"] = {"$gte": float(min_rating)}
    if color:
        query["variants"] = {"$elemMatch": {
            "name": {"$regex": "^color$", "$options": "i"},
            "options": {"$elemMatch": {"$regex": f"^{re.escape(color)}$", "$options": "i"}},
        }}
    if size:
        # color and size may both apply — combine with $all if both
        size_clause = {"$elemMatch": {
            "name": {"$regex": "^size$", "$options": "i"},
            "options": {"$elemMatch": {"$regex": f"^{re.escape(size)}$", "$options": "i"}},
        }}
        if "variants" in query:
            existing = query.pop("variants")
            query["$and"] = query.get("$and", []) + [{"variants": existing}, {"variants": size_clause}]
        else:
            query["variants"] = size_clause
    if min_price is not None or max_price is not None:
        price_q = {}
        if min_price is not None:
            price_q["$gte"] = min_price
        if max_price is not None:
            price_q["$lte"] = max_price
        query["price"] = price_q
    if q:
        regex = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [
            {"title": regex},
            {"description": regex},
            {"brand": regex},
            {"tags": regex},
        ]

    sort_map = {
        "newest": [("created_at", -1)],
        "price_asc": [("price", 1)],
        "price_desc": [("price", -1)],
        "rating": [("rating", -1), ("review_count", -1)],
        "popular": [("review_count", -1)],
    }
    sort_spec = sort_map.get(sort, sort_map["newest"])

    total = await db.products.count_documents(query)
    cursor = db.products.find(query, {"_id": 0}).sort(sort_spec).skip((page - 1) * page_size).limit(page_size)
    items = [Product(**doc) async for doc in cursor]
    pages = max(1, math.ceil(total / page_size))
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@api.get("/products/facets")
async def product_facets(category: Optional[str] = None):
    """Returns distinct colors, sizes, brands available in the catalog (optionally filtered by category)."""
    match: dict = {}
    if category:
        match["category"] = category
    colors: set = set()
    sizes: set = set()
    cursor = db.products.find(match, {"_id": 0, "variants": 1}).limit(1000)
    async for doc in cursor:
        for v in doc.get("variants") or []:
            name = (v.get("name") or "").lower()
            opts = v.get("options") or []
            if name == "color":
                colors.update(opts)
            elif name == "size":
                sizes.update(opts)
    brands = sorted([b for b in await db.products.distinct("brand", match) if b])
    return {
        "colors": sorted(colors),
        "sizes": sorted(sizes, key=lambda s: ["XS","S","M","L","XL","XXL","XXXL"].index(s) if s in ["XS","S","M","L","XL","XXL","XXXL"] else 99),
        "brands": brands,
    }


@api.get("/products/by-ids", response_model=List[Product])
async def products_by_ids(ids: str = Query(..., description="Comma-separated product IDs")):
    """Batch fetch products by IDs, preserving the input order. Used by 'Recently viewed' rail."""
    id_list = [i for i in (ids or "").split(",") if i.strip()]
    if not id_list:
        return []
    docs = {d["id"]: d async for d in db.products.find({"id": {"$in": id_list}}, {"_id": 0})}
    return [Product(**docs[i]) for i in id_list if i in docs]


@api.get("/products/{product_id}", response_model=Product)
async def get_product(product_id: str):
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Product not found")
    return Product(**doc)


@api.get("/brands", response_model=List[str])
async def list_brands(category: Optional[str] = None):
    match = {"category": category} if category else {}
    brands = await db.products.distinct("brand", match)
    return sorted([b for b in brands if b])


# ----------------------------- Admin -----------------------------
@api.get("/admin/products", response_model=ProductListResponse)
async def admin_list_products(
    q: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=200),
    _: dict = Depends(require_admin),
):
    query: dict = {}
    if q:
        regex = {"$regex": re.escape(q), "$options": "i"}
        query["$or"] = [{"title": regex}, {"sku": regex}, {"brand": regex}]
    total = await db.products.count_documents(query)
    cursor = db.products.find(query, {"_id": 0}).sort([("created_at", -1)]).skip((page - 1) * page_size).limit(page_size)
    items = [Product(**doc) async for doc in cursor]
    pages = max(1, math.ceil(total / page_size))
    return ProductListResponse(items=items, total=total, page=page, page_size=page_size, pages=pages)


@api.post("/admin/products", response_model=Product)
async def admin_create_product(payload: ProductCreate, _: dict = Depends(require_admin)):
    product = Product(**payload.model_dump())
    await db.products.insert_one(product.model_dump())
    return product


@api.put("/admin/products/{product_id}", response_model=Product)
async def admin_update_product(product_id: str, payload: ProductUpdate, _: dict = Depends(require_admin)):
    update = {k: v for k, v in payload.model_dump(exclude_unset=True).items() if v is not None}
    if not update:
        raise HTTPException(status_code=400, detail="No fields to update")
    update["updated_at"] = __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()
    result = await db.products.update_one({"id": product_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    doc = await db.products.find_one({"id": product_id}, {"_id": 0})
    return Product(**doc)


@api.delete("/admin/products/{product_id}")
async def admin_delete_product(product_id: str, _: dict = Depends(require_admin)):
    result = await db.products.delete_one({"id": product_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"ok": True}


@api.get("/admin/stats")
async def admin_stats(_: dict = Depends(require_admin)):
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({})
    out_of_stock = await db.products.count_documents({"stock_quantity": {"$lte": 0}})
    on_sale = await db.products.count_documents({"sale_price": {"$ne": None, "$gt": 0}})
    total_orders = await db.orders.count_documents({})
    revenue_pipeline = [
        {"$match": {"payment_status": "paid"}},
        {"$group": {"_id": None, "sum": {"$sum": "$total"}}},
    ]
    rev_result = await db.orders.aggregate(revenue_pipeline).to_list(1)
    total_revenue = float(rev_result[0]["sum"]) if rev_result else 0.0
    total_subscribers = await db.newsletter_subscribers.count_documents({})
    return {
        "products": total_products,
        "users": total_users,
        "out_of_stock": out_of_stock,
        "on_sale": on_sale,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_subscribers": total_subscribers,
    }


# ----------------------------- Admin · Inventory -----------------------------
@api.get("/admin/inventory/low-stock")
async def admin_low_stock(_: dict = Depends(require_admin)):
    """Phase 5C — list warehouse products whose stock is at or below reorder_point.

    Returns a compact payload: { count, items: [{id, sku, title, brand, category,
    stock_quantity, reorder_point}], threshold_default }.
    Sorted by stock ascending (worst-first).
    """
    cursor = db.products.find(
        {
            "fulfillment_type": "warehouse",
            "$expr": {"$lte": ["$stock_quantity", {"$ifNull": ["$reorder_point", 10]}]},
        },
        {"_id": 0, "id": 1, "sku": 1, "title": 1, "brand": 1, "category": 1,
         "stock_quantity": 1, "reorder_point": 1, "images": 1},
    ).sort([("stock_quantity", 1)])
    items = [doc async for doc in cursor]
    for it in items:
        it.setdefault("reorder_point", 10)
        it["image"] = (it.pop("images", None) or [""])[0]
    return {"count": len(items), "items": items, "threshold_default": 10}


# ----------------------------- Mount -----------------------------
api.include_router(commerce_router)
api.include_router(ai_router)
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_origin_regex=os.environ.get("CORS_ORIGIN_REGEX", r"https?://.*\.emergentagent\.com|http://localhost:\d+"),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup():
    # Indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index("category")
    await db.products.create_index("sku")
    await db.orders.create_index("id", unique=True)
    await db.orders.create_index("order_number", unique=True)
    await db.orders.create_index("user_id")
    await db.orders.create_index("stripe_session_id")
    await db.payment_transactions.create_index("session_id", unique=True)
    await db.reviews.create_index([("product_id", 1), ("user_id", 1)], unique=True)
    await db.reviews.create_index("product_id")
    await db.newsletter_subscribers.create_index("email", unique=True)
    await db.contact_messages.create_index("created_at")
    await db.addresses.create_index("user_id")
    await db.addresses.create_index([("user_id", 1), ("is_default", -1)])
    await db.payment_methods.create_index("user_id")
    await db.restock_alerts.create_index([("product_id", 1), ("email", 1)], unique=True)
    await db.restock_alerts.create_index("notified_at")
    # Seed admin if missing
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if admin_email and admin_password:
        existing = await db.users.find_one({"email": admin_email})
        if not existing:
            from datetime import datetime as _dt, timezone as _tz
            import uuid as _u
            await db.users.insert_one(
                {
                    "id": _u.uuid4().hex,
                    "email": admin_email,
                    "name": "Admin",
                    "password_hash": hash_password(admin_password),
                    "role": "admin",
                    "created_at": _dt.now(_tz.utc).isoformat(),
                }
            )
            logger.info("Seeded admin user %s", admin_email)

    # ----- Start daily digest scheduler -----
    try:
        from apscheduler.schedulers.asyncio import AsyncIOScheduler  # noqa: WPS433
        scheduler = AsyncIOScheduler(timezone="UTC")

        async def _digest_tick():
            """Runs every 10 minutes; sends the digest when the configured hour is reached
            and we haven't already sent today's edition."""
            try:
                from datetime import datetime as _dt, timezone as _tz
                doc = await db.admin_settings.find_one({"key": "digest"}, {"_id": 0}) or {}
                if not doc.get("enabled"):
                    return
                now = _dt.now(_tz.utc)
                if now.hour != int(doc.get("hour_utc", 13)):
                    return
                today_iso = now.date().isoformat()
                if doc.get("last_sent_date") == today_iso:
                    return
                from commerce_routes import build_digest_summary  # local to avoid cycles
                from email_service import send_admin_digest
                recipients = [r for r in doc.get("recipients", []) if r]
                if not recipients:
                    async for u in db.users.find({"role": "admin"}, {"email": 1, "_id": 0}):
                        if u.get("email"):
                            recipients.append(u["email"])
                if not recipients:
                    return
                summary = await build_digest_summary(db, days_back=1)
                ok = await send_admin_digest(recipients, summary)
                if ok:
                    await db.admin_settings.update_one(
                        {"key": "digest"},
                        {"$set": {"last_sent_date": today_iso, "last_sent_at": now.isoformat()}},
                        upsert=True,
                    )
                    logger.info("Daily digest sent to %s", recipients)
            except Exception as e:  # noqa: BLE001
                logger.warning("digest tick failed: %s", e)

        scheduler.add_job(_digest_tick, "interval", minutes=10, id="digest_tick", replace_existing=True)

        async def _cart_recovery_tick():
            """Hourly: send abandoned-cart recovery emails per admin settings."""
            try:
                doc = await db.admin_settings.find_one({"key": "cart_recovery"}, {"_id": 0}) or {}
                if not doc.get("enabled"):
                    return
                from commerce_routes import _find_abandoned_carts, _send_cart_recovery_for
                delay = int(doc.get("delay_hours", 24))
                cooldown = int(doc.get("cooldown_days", 7))
                promo = doc.get("promo_code")
                candidates = await _find_abandoned_carts(
                    db, delay_hours=delay, cooldown_days=cooldown,
                )
                if not candidates:
                    return
                store_url = (os.environ.get("APP_URL") or "").rstrip("/")
                sent = 0
                for c in candidates:
                    ok = await _send_cart_recovery_for(db, c, promo_code=promo, store_url=store_url)
                    if ok:
                        sent += 1
                logger.info("Cart recovery tick: %d sent / %d candidates", sent, len(candidates))
            except Exception as e:  # noqa: BLE001
                logger.warning("cart recovery tick failed: %s", e)

        scheduler.add_job(_cart_recovery_tick, "interval", minutes=60, id="cart_recovery_tick", replace_existing=True)

        # ----- Restock alert dispatcher (every 5 min) -----
        async def _restock_tick():
            try:
                result = await _dispatch_restock_emails()
                if result.get("sent") or result.get("failed"):
                    logger.info("Restock tick: %s", result)
            except Exception as e:  # noqa: BLE001
                logger.warning("restock tick failed: %s", e)

        scheduler.add_job(_restock_tick, "interval", minutes=5, id="restock_tick", replace_existing=True)

        scheduler.start()
        app.state.scheduler = scheduler
        logger.info("Digest scheduler started (10-minute heartbeat)")
    except Exception as e:  # noqa: BLE001
        logger.warning("Failed to start digest scheduler: %s", e)


@app.on_event("shutdown")
async def on_shutdown():
    sch = getattr(app.state, "scheduler", None)
    if sch:
        try:
            sch.shutdown(wait=False)
        except Exception:  # noqa: BLE001
            pass
    client.close()

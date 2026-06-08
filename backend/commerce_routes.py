"""Commerce routes: orders, payments, reviews, newsletter, contact.

Mounted under /api by including this router in server.py.
"""
import logging
import os
import random
import string
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, Request, UploadFile
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, EmailStr, Field

from auth_utils import get_current_user_payload
from commerce_models import (
    CheckoutRequest, CheckoutResponse, PaymentStatusResponse, Order, OrderLineItem,
    ReviewCreate, Review, ReviewListResponse,
    NewsletterSubscribe, NewsletterSubscriber,
    ContactMessageCreate, ContactMessage,
    PaymentTransaction,
    Address, AddressCreate,
    OrderStatusEvent, OrderStatusUpdate, TrackingResponse, TrackingTimelineStep,
    ALLOWED_ORDER_STATUSES, STATUS_TO_STEP,
)
from email_service import send_order_receipt, send_contact_acknowledgement

logger = logging.getLogger("abundant.commerce")

router = APIRouter()

FREE_SHIP_THRESHOLD = 49.0
STD_SHIPPING = 5.99
EXPRESS_SHIPPING = 12.99
TAX_RATE = 0.08


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _gen_order_number() -> str:
    suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
    return f"AM-{suffix}"


async def _optional_user(request: Request) -> Optional[dict]:
    """Returns the JWT payload if a valid access cookie is present, else None."""
    try:
        from auth_utils import ACCESS_COOKIE, decode_token
        token = request.cookies.get(ACCESS_COOKIE)
        if not token:
            return None
        return decode_token(token)
    except Exception:
        return None


def get_db(request: Request) -> AsyncIOMotorDatabase:
    return request.app.state.db  # type: ignore[attr-defined]


# ============================ ORDERS / CHECKOUT ============================
@router.post("/checkout/session", response_model=CheckoutResponse)
async def create_checkout_session(payload: CheckoutRequest, request: Request):
    """Server-side priced checkout: looks up authoritative product prices, creates
    an order document + Stripe Checkout Session. Returns the URL to redirect."""
    db = get_db(request)

    # 1. Validate items + recompute totals from DB (NEVER trust frontend amounts)
    product_ids = [i.product_id for i in payload.items]
    products = {p["id"]: p async for p in db.products.find({"id": {"$in": product_ids}}, {"_id": 0})}
    if len(products) != len(set(product_ids)):
        raise HTTPException(400, "Some products in the cart are no longer available")

    line_items: List[OrderLineItem] = []
    subtotal = 0.0
    for itm in payload.items:
        p = products[itm.product_id]
        unit_price = float(p["sale_price"]) if (p.get("sale_price") and p["sale_price"] > 0) else float(p["price"])
        subtotal += unit_price * itm.qty
        line_items.append(OrderLineItem(
            product_id=p["id"],
            title=p["title"],
            image=(p.get("images") or [""])[0],
            unit_price=round(unit_price, 2),
            qty=itm.qty,
            variants=itm.variants or {},
            fulfillment_type=p.get("fulfillment_type", "warehouse"),
        ))

    if payload.shipping_method == "express":
        shipping_cost = EXPRESS_SHIPPING
    else:
        shipping_cost = 0.0 if subtotal >= FREE_SHIP_THRESHOLD else STD_SHIPPING
    tax = round(subtotal * TAX_RATE, 2)
    total = round(subtotal + shipping_cost + tax, 2)

    # 2. Resolve user (optional — guest checkout supported)
    user_payload = await _optional_user(request)
    user_id = user_payload.get("sub") if user_payload else None

    # 3. Create the order doc (status pending) with initial status_history entry
    # Validate recovery_id if provided (must exist in cart_recovery_log)
    recovered_from = None
    if payload.recovery_id:
        rec = await db.cart_recovery_log.find_one(
            {"id": payload.recovery_id}, {"_id": 0, "id": 1},
        )
        if rec:
            recovered_from = payload.recovery_id

    order = Order(
        order_number=_gen_order_number(),
        user_id=user_id,
        email=payload.shipping_address.email,
        items=line_items,
        subtotal=round(subtotal, 2),
        shipping_cost=round(shipping_cost, 2),
        tax=tax,
        total=total,
        shipping_method=payload.shipping_method,
        shipping_address=payload.shipping_address,
        recovered_from=recovered_from,
        has_warehouse=any(li.fulfillment_type == "warehouse" for li in line_items),
        has_dropship=any(li.fulfillment_type == "dropship" for li in line_items),
        status_history=[OrderStatusEvent(status="pending", note="Order placed — awaiting payment")],
    )
    await db.orders.insert_one(order.model_dump())

    # 4. Create Stripe checkout session
    from emergentintegrations.payments.stripe.checkout import (
        StripeCheckout, CheckoutSessionRequest,
    )
    api_key = os.environ.get("STRIPE_API_KEY")
    if not api_key:
        raise HTTPException(500, "Stripe is not configured")

    origin = payload.origin_url.rstrip("/")
    success_url = f"{origin}/order-confirmation?session_id={{CHECKOUT_SESSION_ID}}"
    cancel_url = f"{origin}/checkout?cancelled=1"
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"

    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    session_req = CheckoutSessionRequest(
        amount=float(total),
        currency="usd",
        success_url=success_url,
        cancel_url=cancel_url,
        metadata={
            "order_id": order.id,
            "order_number": order.order_number,
            "email": str(order.email),
            "user_id": user_id or "guest",
        },
    )
    session = await stripe.create_checkout_session(session_req)

    # 5. Persist payment_transactions entry + update order with session id
    txn = PaymentTransaction(
        session_id=session.session_id,
        order_id=order.id,
        user_email=str(order.email),
        amount=total,
        currency="usd",
        metadata={"order_number": order.order_number},
    )
    await db.payment_transactions.insert_one(txn.model_dump())
    await db.orders.update_one(
        {"id": order.id},
        {"$set": {"stripe_session_id": session.session_id, "updated_at": _now_iso()}},
    )

    return CheckoutResponse(
        url=session.url,
        session_id=session.session_id,
        order_id=order.id,
        order_number=order.order_number,
    )


@router.get("/checkout/status/{session_id}", response_model=PaymentStatusResponse)
async def get_checkout_status(session_id: str, request: Request):
    """Polled by the confirmation page until payment_status==paid (or expired)."""
    db = get_db(request)
    txn = await db.payment_transactions.find_one({"session_id": session_id}, {"_id": 0})
    if not txn:
        raise HTTPException(404, "Payment session not found")

    # If already final, just return current state — never reprocess
    if txn["payment_status"] in {"paid", "failed", "expired"}:
        order = await db.orders.find_one({"id": txn["order_id"]}, {"_id": 0})
        return PaymentStatusResponse(
            payment_status=txn["payment_status"],
            status=txn["payment_status"],
            order=Order(**order) if order else None,
        )

    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    status = await stripe.get_checkout_status(session_id)

    new_payment_status = status.payment_status  # "paid" | "unpaid" | ...
    new_status = status.status  # "complete" | "expired" | ...

    update = {"payment_status": new_payment_status, "updated_at": _now_iso()}
    await db.payment_transactions.update_one({"session_id": session_id}, {"$set": update})

    order_update = {"updated_at": _now_iso()}
    push_event = None
    if new_payment_status == "paid":
        order_update["status"] = "paid"
        order_update["payment_status"] = "paid"
        push_event = OrderStatusEvent(status="paid", note="Payment received — preparing your order").model_dump()
    elif new_status == "expired":
        order_update["status"] = "cancelled"
        order_update["payment_status"] = "expired"
        push_event = OrderStatusEvent(status="cancelled", note="Checkout session expired").model_dump()
    mongo_update = {"$set": order_update}
    if push_event:
        # Only append if we haven't already recorded this transition (idempotent)
        existing = await db.orders.find_one(
            {"id": txn["order_id"], "status_history.status": push_event["status"]},
            {"_id": 1},
        )
        if not existing:
            mongo_update["$push"] = {"status_history": push_event}
    await db.orders.update_one({"id": txn["order_id"]}, mongo_update)

    order = await db.orders.find_one({"id": txn["order_id"]}, {"_id": 0})

    # Send email receipt the first time the order transitions to paid
    if (
        order
        and new_payment_status == "paid"
        and not order.get("receipt_sent")
    ):
        try:
            sent = await send_order_receipt(str(order["email"]), order)
            if sent:
                await db.orders.update_one({"id": order["id"]}, {"$set": {"receipt_sent": True}})
        except Exception as e:  # noqa: BLE001
            logger.warning("Receipt email failed: %s", e)

    # Attribute conversion if this order came from a recovery email
    if order and new_payment_status == "paid" and order.get("recovered_from"):
        await _mark_recovery_converted(db, order)

    return PaymentStatusResponse(
        payment_status=new_payment_status,
        status=new_status,
        order=Order(**order) if order else None,
    )


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    """Stripe webhook — updates orders if not already finalised via polling."""
    db = get_db(request)
    from emergentintegrations.payments.stripe.checkout import StripeCheckout
    api_key = os.environ.get("STRIPE_API_KEY")
    webhook_url = f"{str(request.base_url).rstrip('/')}/api/webhook/stripe"
    stripe = StripeCheckout(api_key=api_key, webhook_url=webhook_url)
    body = await request.body()
    sig = request.headers.get("Stripe-Signature", "")
    try:
        evt = await stripe.handle_webhook(body, sig)
    except Exception as e:
        logger.warning("Stripe webhook failed: %s", e)
        raise HTTPException(400, "Invalid webhook")

    session_id = getattr(evt, "session_id", None)
    if not session_id:
        return {"ok": True}
    txn = await db.payment_transactions.find_one({"session_id": session_id})
    if not txn:
        return {"ok": True}
    # Idempotent: only update if not already paid
    if txn.get("payment_status") != "paid" and getattr(evt, "payment_status", None) == "paid":
        await db.payment_transactions.update_one(
            {"session_id": session_id},
            {"$set": {"payment_status": "paid", "updated_at": _now_iso()}},
        )
        existing_evt = await db.orders.find_one(
            {"id": txn["order_id"], "status_history.status": "paid"},
            {"_id": 1},
        )
        update_doc = {"$set": {"status": "paid", "payment_status": "paid", "updated_at": _now_iso()}}
        if not existing_evt:
            update_doc["$push"] = {"status_history": OrderStatusEvent(
                status="paid", note="Payment received — preparing your order"
            ).model_dump()}
        await db.orders.update_one({"id": txn["order_id"]}, update_doc)
        # Attribute conversion if this order came from a recovery email
        order_doc = await db.orders.find_one({"id": txn["order_id"]}, {"_id": 0})
        if order_doc and order_doc.get("recovered_from"):
            await _mark_recovery_converted(db, order_doc)
    return {"ok": True}


# ============================ MY ORDERS ============================
@router.get("/orders/mine", response_model=List[Order])
async def my_orders(request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    cursor = db.orders.find({"user_id": user["sub"]}, {"_id": 0}).sort([("created_at", -1)]).limit(100)
    return [Order(**doc) async for doc in cursor]


# ============================ TRACKING (public) ============================
TIMELINE_BLUEPRINT = [
    {"step": 1, "label": "Order Placed", "sub": "We got your order", "status": "pending"},
    {"step": 2, "label": "Processing", "sub": "Picking & packing", "status": "paid"},
    {"step": 3, "label": "Shipped", "sub": "On the way", "status": "shipped"},
    {"step": 4, "label": "Out for Delivery", "sub": "Arriving today", "status": "out_for_delivery"},
    {"step": 5, "label": "Delivered", "sub": "Enjoy your order!", "status": "delivered"},
]


def _build_timeline(order: dict) -> List[TrackingTimelineStep]:
    current_step = STATUS_TO_STEP.get(order.get("status", "pending"), 1)
    if order.get("status") == "cancelled":
        current_step = 0
    history = order.get("status_history") or []
    # Map status → first ISO time we saw that status
    status_at = {}
    for ev in history:
        if ev["status"] not in status_at:
            status_at[ev["status"]] = ev.get("at")
    steps: List[TrackingTimelineStep] = []
    for s in TIMELINE_BLUEPRINT:
        steps.append(TrackingTimelineStep(
            step=s["step"],
            label=s["label"],
            sub=s["sub"],
            reached=s["step"] <= current_step,
            at=status_at.get(s["status"]),
        ))
    return steps


@router.get("/orders/track", response_model=TrackingResponse)
async def track_order(request: Request, order_number: str = Query(..., min_length=3, max_length=32), email: str = Query(..., min_length=3, max_length=200)):
    """Public order tracking — match order_number (case-insensitive) + email."""
    db = get_db(request)
    on = order_number.strip().upper()
    em = email.strip().lower()
    order = await db.orders.find_one(
        {"order_number": on, "email": {"$regex": f"^{em}$", "$options": "i"}},
        {"_id": 0},
    )
    if not order:
        raise HTTPException(404, "We couldn't find an order matching that number and email")

    current_step = STATUS_TO_STEP.get(order.get("status", "pending"), 1)
    history_models = [OrderStatusEvent(**ev) for ev in (order.get("status_history") or [])]
    latest_note = history_models[-1].note if history_models else ""

    return TrackingResponse(
        order_number=order["order_number"],
        email=order["email"],
        placed_at=order["created_at"],
        status=order.get("status", "pending"),
        current_step=current_step,
        eta=order.get("eta"),
        tracking_carrier=order.get("tracking_carrier"),
        tracking_code=order.get("tracking_code"),
        shipping_method=order.get("shipping_method", "standard"),
        total=order.get("total", 0),
        items=[OrderLineItem(**it) for it in order.get("items", [])],
        timeline=_build_timeline(order),
        history=history_models,
        latest_note=latest_note,
    )


# ============================ REVIEWS ============================
@router.get("/products/{product_id}/reviews", response_model=ReviewListResponse)
async def list_reviews(product_id: str, request: Request, page: int = Query(1, ge=1), page_size: int = Query(10, ge=1, le=50)):
    db = get_db(request)
    query = {"product_id": product_id}
    total = await db.reviews.count_documents(query)
    cursor = db.reviews.find(query, {"_id": 0}).sort([("created_at", -1)]).skip((page - 1) * page_size).limit(page_size)
    items = [Review(**doc) async for doc in cursor]
    # Aggregate distribution + avg
    dist = {str(i): 0 for i in range(1, 6)}
    avg = 0.0
    if total > 0:
        pipeline = [
            {"$match": query},
            {"$group": {"_id": "$rating", "count": {"$sum": 1}}},
        ]
        async for row in db.reviews.aggregate(pipeline):
            dist[str(row["_id"])] = row["count"]
        # Re-fetch all ratings to compute mean (cheaper than another aggregation for small N)
        sum_r = sum(int(k) * v for k, v in dist.items())
        avg = round(sum_r / total, 2)
    return ReviewListResponse(items=items, total=total, avg_rating=avg, distribution=dist)


@router.post("/products/{product_id}/reviews", response_model=Review)
async def create_review(product_id: str, payload: ReviewCreate, request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    product = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not product:
        raise HTTPException(404, "Product not found")
    # Prevent duplicate review per user/product (update if exists)
    existing = await db.reviews.find_one({"product_id": product_id, "user_id": user["sub"]})
    if existing:
        await db.reviews.update_one(
            {"id": existing["id"]},
            {"$set": {
                "rating": payload.rating,
                "title": payload.title,
                "body": payload.body,
                "created_at": _now_iso(),
            }},
        )
        updated = await db.reviews.find_one({"id": existing["id"]}, {"_id": 0})
        await _recompute_product_rating(db, product_id)
        return Review(**updated)
    # Fetch reviewer name
    u = await db.users.find_one({"id": user["sub"]}, {"_id": 0, "name": 1})
    review = Review(
        product_id=product_id,
        user_id=user["sub"],
        user_name=(u or {}).get("name", "Customer"),
        rating=payload.rating,
        title=payload.title,
        body=payload.body,
    )
    await db.reviews.insert_one(review.model_dump())
    await _recompute_product_rating(db, product_id)
    return review


async def _recompute_product_rating(db, product_id: str):
    pipeline = [
        {"$match": {"product_id": product_id}},
        {"$group": {"_id": None, "avg": {"$avg": "$rating"}, "count": {"$sum": 1}}},
    ]
    async for row in db.reviews.aggregate(pipeline):
        await db.products.update_one(
            {"id": product_id},
            {"$set": {
                "rating": round(float(row.get("avg") or 0), 2),
                "review_count": int(row.get("count") or 0),
                "updated_at": _now_iso(),
            }},
        )
        return


# ============================ NEWSLETTER ============================
@router.post("/newsletter/subscribe", response_model=NewsletterSubscriber)
async def newsletter_subscribe(payload: NewsletterSubscribe, request: Request):
    db = get_db(request)
    existing = await db.newsletter_subscribers.find_one({"email": str(payload.email).lower()})
    if existing:
        return NewsletterSubscriber(**{**existing, "id": existing.get("id"), "_id": None})  # noqa: E501
    sub = NewsletterSubscriber(email=str(payload.email).lower(), source=payload.source)
    await db.newsletter_subscribers.insert_one(sub.model_dump())
    return sub


# ============================ CONTACT ============================
@router.post("/contact", response_model=ContactMessage)
async def contact_send(payload: ContactMessageCreate, request: Request):
    db = get_db(request)
    msg = ContactMessage(**payload.model_dump())
    await db.contact_messages.insert_one(msg.model_dump())
    # Fire-and-forget ack email (no-op if RESEND_API_KEY missing)
    try:
        await send_contact_acknowledgement(str(msg.email), msg.name)
    except Exception:  # noqa: BLE001
        pass
    return msg


# ============================ ADDRESS BOOK ============================
@router.get("/account/addresses", response_model=List[Address])
async def list_addresses(request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    cursor = db.addresses.find({"user_id": user["sub"]}, {"_id": 0}).sort([("is_default", -1), ("created_at", -1)])
    return [Address(**doc) async for doc in cursor]


@router.post("/account/addresses", response_model=Address)
async def create_address(payload: AddressCreate, request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    # If first address or marked default, set default and unset others
    count = await db.addresses.count_documents({"user_id": user["sub"]})
    is_default = payload.is_default or count == 0
    if is_default:
        await db.addresses.update_many({"user_id": user["sub"]}, {"$set": {"is_default": False}})
    payload_dict = payload.model_dump()
    payload_dict["is_default"] = is_default
    addr = Address(**payload_dict, user_id=user["sub"])
    await db.addresses.insert_one(addr.model_dump())
    return addr


@router.put("/account/addresses/{address_id}", response_model=Address)
async def update_address(address_id: str, payload: AddressCreate, request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    existing = await db.addresses.find_one({"id": address_id, "user_id": user["sub"]}, {"_id": 0})
    if not existing:
        raise HTTPException(404, "Address not found")
    if payload.is_default and not existing.get("is_default"):
        await db.addresses.update_many({"user_id": user["sub"]}, {"$set": {"is_default": False}})
    updated = {**existing, **payload.model_dump(), "is_default": payload.is_default or existing.get("is_default", False)}
    await db.addresses.update_one({"id": address_id, "user_id": user["sub"]}, {"$set": updated})
    fresh = await db.addresses.find_one({"id": address_id}, {"_id": 0})
    return Address(**fresh)


@router.delete("/account/addresses/{address_id}")
async def delete_address(address_id: str, request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    result = await db.addresses.delete_one({"id": address_id, "user_id": user["sub"]})
    if result.deleted_count == 0:
        raise HTTPException(404, "Address not found")
    return {"ok": True}


# ============================ PAYMENT METHODS (Stripe SetupIntent stub) ============================
@router.get("/account/payment-methods")
async def list_payment_methods(request: Request, user: dict = Depends(get_current_user_payload)):
    db = get_db(request)
    cursor = db.payment_methods.find({"user_id": user["sub"]}, {"_id": 0}).sort([("is_default", -1), ("created_at", -1)])
    return [doc async for doc in cursor]


@router.post("/account/payment-methods/setup")
async def create_setup_session(request: Request, user: dict = Depends(get_current_user_payload)):
    """Creates a Stripe Checkout in setup mode to securely capture & store a card.

    NOTE: stub returns a placeholder URL — full integration requires Stripe Customer + SetupIntent,
    which would be wired here once the live keys are available. For now this lets the UI flow.
    """
    body = await request.json() if request.headers.get("content-length") else {}
    origin = (body or {}).get("origin_url", "").rstrip("/") or "https://example.com"
    return {
        "url": f"{origin}/account/payment?setup=pending",
        "status": "stub",
        "message": "Stripe SetupIntent flow will be enabled once production keys are configured.",
    }


# ============================ ADMIN: subscribers & messages ============================
def _require_admin(user: dict):
    if user.get("role") != "admin":
        raise HTTPException(403, "Admin only")


@router.get("/admin/newsletter-subscribers", response_model=List[NewsletterSubscriber])
async def admin_list_subscribers(request: Request, user: dict = Depends(get_current_user_payload)):
    _require_admin(user)
    db = get_db(request)
    cursor = db.newsletter_subscribers.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(500)
    return [NewsletterSubscriber(**doc) async for doc in cursor]


@router.get("/admin/contact-messages", response_model=List[ContactMessage])
async def admin_list_contact_messages(request: Request, user: dict = Depends(get_current_user_payload)):
    _require_admin(user)
    db = get_db(request)
    cursor = db.contact_messages.find({}, {"_id": 0}).sort([("created_at", -1)]).limit(500)
    return [ContactMessage(**doc) async for doc in cursor]


@router.get("/admin/orders")
async def admin_list_orders(
    request: Request,
    user: dict = Depends(get_current_user_payload),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    _require_admin(user)
    db = get_db(request)
    import math
    total = await db.orders.count_documents({})
    cursor = (
        db.orders.find({}, {"_id": 0})
        .sort([("created_at", -1)])
        .skip((page - 1) * page_size)
        .limit(page_size)
    )
    items = []
    async for doc in cursor:
        # Backfill has_warehouse / has_dropship for legacy orders (Phase 5D)
        if "has_warehouse" not in doc or "has_dropship" not in doc:
            order_items = doc.get("items") or []
            doc["has_warehouse"] = any(
                (it.get("fulfillment_type") or "warehouse") == "warehouse" for it in order_items
            )
            doc["has_dropship"] = any(
                (it.get("fulfillment_type") or "") == "dropship" for it in order_items
            )
        items.append(Order(**doc))
    pages = math.ceil(total / page_size) if total > 0 else 1
    return {"items": items, "total": total, "page": page, "pages": pages}


@router.patch("/admin/orders/{order_id}/status", response_model=Order)
async def admin_update_order_status(order_id: str, payload: OrderStatusUpdate, request: Request, user: dict = Depends(get_current_user_payload)):
    """Advance an order through its lifecycle. Appends to status_history,
    auto-sets shipped_at / delivered_at, optionally stores tracking info."""
    _require_admin(user)
    if payload.status not in ALLOWED_ORDER_STATUSES:
        raise HTTPException(400, f"Invalid status. Allowed: {', '.join(ALLOWED_ORDER_STATUSES)}")
    db = get_db(request)
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(404, "Order not found")

    now = _now_iso()
    set_fields = {"status": payload.status, "updated_at": now}
    if payload.tracking_carrier is not None:
        set_fields["tracking_carrier"] = payload.tracking_carrier
    if payload.tracking_code is not None:
        set_fields["tracking_code"] = payload.tracking_code
    if payload.eta is not None:
        set_fields["eta"] = payload.eta
    if payload.status == "shipped" and not order.get("shipped_at"):
        set_fields["shipped_at"] = now
    if payload.status == "delivered" and not order.get("delivered_at"):
        set_fields["delivered_at"] = now
    if payload.status == "cancelled":
        set_fields["payment_status"] = order.get("payment_status", "initiated")

    note = (payload.note or "").strip() or _default_status_note(payload.status)
    event = OrderStatusEvent(status=payload.status, note=note, at=now).model_dump()
    await db.orders.update_one(
        {"id": order_id},
        {"$set": set_fields, "$push": {"status_history": event}},
    )
    fresh = await db.orders.find_one({"id": order_id}, {"_id": 0})
    return Order(**fresh)


def _default_status_note(status: str) -> str:
    return {
        "pending": "Order placed — awaiting payment",
        "paid": "Payment received — preparing your order",
        "shipped": "Your order has shipped",
        "out_for_delivery": "Out for delivery — arriving today",
        "delivered": "Delivered. Thank you!",
        "cancelled": "Order cancelled",
    }.get(status, status)


# ============================ PROMO CODES ============================
PROMO_CODES = {
    "WELCOME10": {"type": "percent", "amount": 10,
                  "description": "10% off your order"},
    "FREESHIP":  {"type": "free_shipping", "amount": 0,
                  "description": "Free shipping on this order"},
    "SAVE20":    {"type": "flat", "amount": 20,
                  "description": "$20 off orders over $100", "min_order": 100},
}


class PromoValidateRequest(BaseModel):
    code: str
    subtotal: float = 0.0


class PromoValidateResponse(BaseModel):
    valid: bool
    type: Optional[str] = None
    amount: Optional[float] = None
    description: Optional[str] = None
    message: Optional[str] = None


@router.post("/promo/validate", response_model=PromoValidateResponse)
async def validate_promo(payload: PromoValidateRequest):
    code = payload.code.strip().upper()
    promo = PROMO_CODES.get(code)
    if not promo:
        return PromoValidateResponse(valid=False, message="Invalid or expired promo code")
    if promo.get("min_order") and payload.subtotal < promo["min_order"]:
        return PromoValidateResponse(
            valid=False,
            message=f"This code requires a minimum order of ${promo['min_order']:.0f}",
        )
    return PromoValidateResponse(
        valid=True,
        type=promo.get("type"),
        amount=promo.get("amount"),
        description=promo.get("description"),
    )



# ============================ ADMIN: bulk CSV import ============================
import csv as _csv
import io as _io
from import_csv import (  # noqa: E402
    parse_shopify_csv_rows, parse_woocommerce_csv_rows, to_product_doc,
)


class BulkImportPreview(BaseModel):
    format: str
    total_rows: int
    new_count: int
    updated_count: int
    skipped_count: int
    samples: List[dict]
    dry_run: bool


def _detect_format(headers: list) -> str:
    cols = {h.strip() for h in headers}
    if "Handle" in cols and "Variant Price" in cols:
        return "shopify"
    if "Slug" in cols or "Product categories" in cols:
        return "woocommerce"
    return "unknown"


@router.post("/admin/products/bulk-import", response_model=BulkImportPreview)
async def admin_bulk_import_products(
    request: Request,
    file: UploadFile = File(...),
    dry_run: bool = Form(True),
    user: dict = Depends(get_current_user_payload),
):
    """Upload a Shopify or WooCommerce CSV. Returns a preview (dry_run=true) or commits.

    Match key: `sku`. Existing SKUs are updated; new SKUs are inserted. Rows with no
    parseable title are skipped. Imported docs are tagged with sku prefix `IMP-` so the
    pre-existing CLI script and this UI stay compatible.
    """
    _require_admin(user)
    if not (file.filename or "").lower().endswith(".csv"):
        raise HTTPException(400, "Only .csv files are supported")

    raw = await file.read()
    try:
        text = raw.decode("utf-8-sig")
    except UnicodeDecodeError:
        text = raw.decode("latin-1")

    reader = _csv.DictReader(_io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(400, "CSV is empty")

    fmt = _detect_format(reader.fieldnames or [])
    if fmt == "shopify":
        parsed = parse_shopify_csv_rows(rows)
    elif fmt == "woocommerce":
        parsed = parse_woocommerce_csv_rows(rows)
    else:
        raise HTTPException(
            400,
            "Unrecognized CSV format. Expected Shopify (with 'Handle' column) "
            "or WooCommerce (with 'Slug' column).",
        )

    db = get_db(request)
    sku_prefix = "SHP" if fmt == "shopify" else "WOO"
    docs = [to_product_doc(p, i + 1, prefix=sku_prefix) for i, p in enumerate(parsed)]

    # Determine new vs updated by SKU lookup
    skus = [d["sku"] for d in docs if d.get("sku")]
    existing_skus = set()
    if skus:
        async for doc in db.products.find({"sku": {"$in": skus}}, {"sku": 1, "_id": 0}):
            existing_skus.add(doc["sku"])

    new_count = sum(1 for d in docs if d["sku"] not in existing_skus)
    updated_count = sum(1 for d in docs if d["sku"] in existing_skus)
    skipped_count = len(rows) - len(docs)

    samples = [
        {
            "sku": d["sku"],
            "title": d["title"],
            "price": d["price"],
            "brand": d["brand"],
            "is_new": d["sku"] not in existing_skus,
        }
        for d in docs[:8]
    ]

    if not dry_run and docs:
        # Upsert by sku: preserves stable product `id` for existing items
        for d in docs:
            if d["sku"] in existing_skus:
                d_update = {k: v for k, v in d.items() if k not in ("id", "created_at")}
                await db.products.update_one({"sku": d["sku"]}, {"$set": d_update})
            else:
                await db.products.insert_one(d)

    return BulkImportPreview(
        format=fmt,
        total_rows=len(rows),
        new_count=new_count,
        updated_count=updated_count,
        skipped_count=skipped_count,
        samples=samples,
        dry_run=dry_run,
    )

# ============================ ADMIN: bulk image (zip) import ============================
import io as _io2
import re as _re2
import uuid as _uuid2
import zipfile as _zipfile
from collections import defaultdict as _defaultdict

_IMG_EXTS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
_CT_MAP = {
    ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
    ".webp": "image/webp", ".gif": "image/gif",
}


def _ext(name: str) -> str:
    i = name.rfind(".")
    return name[i:].lower() if i >= 0 else ""


def _normalize_sku(s: str) -> str:
    return (s or "").strip().upper()


def _match_sku_in_zip(name: str, sku_set: set) -> Optional[str]:
    """Return matching SKU for a zip entry path, or None."""
    if not name or name.endswith("/"):
        return None
    parts = [p for p in name.replace("\\", "/").split("/") if p and not p.startswith(".")]
    if not parts:
        return None
    # 1. Folder name matches a SKU (e.g. "SHP-001/main.jpg")
    folder = _normalize_sku(parts[0])
    if folder in sku_set:
        return folder
    # 2. Filename (without ext) starts with SKU, optionally followed by _N or -N
    base = parts[-1]
    stem = base[: base.rfind(".")] if "." in base else base
    norm = _normalize_sku(stem)
    if norm in sku_set:
        return norm
    m = _re2.match(r"^([A-Z0-9][A-Z0-9\-]+?)(?:[_\-]\d+)?$", norm)
    if m and m.group(1) in sku_set:
        return m.group(1)
    return None


class BulkImageImportResult(BaseModel):
    total_files: int
    image_files: int
    matched_skus: int
    matched_files: int
    skipped_files: int
    missed_files: List[str]
    samples: List[dict]
    dry_run: bool
    mode: str  # "append" | "replace"


@router.get("/product-images/{image_id}")
async def get_product_image(image_id: str, request: Request):
    """Stream a product image stored in the `product_images` collection.

    Sends long-lived Cache-Control so the browser caches the image — images are
    keyed by uuid so they're immutable once uploaded.
    """
    db = get_db(request)
    doc = await db.product_images.find_one({"id": image_id}, {"_id": 0})
    if not doc:
        raise HTTPException(404, "Image not found")
    return Response(
        content=bytes(doc["data"]),
        media_type=doc.get("content_type", "application/octet-stream"),
        headers={"Cache-Control": "public, max-age=31536000, immutable"},
    )


@router.post("/admin/products/bulk-import-images", response_model=BulkImageImportResult)
async def admin_bulk_import_images(
    request: Request,
    file: UploadFile = File(...),
    dry_run: bool = Form(True),
    mode: str = Form("append"),  # "append" or "replace"
    user: dict = Depends(get_current_user_payload),
):
    """Upload a .zip of product images. Files inside the zip are matched to
    existing products by SKU (filename without ext == SKU, or top-level folder
    name == SKU). Image bytes are stored in MongoDB and exposed via
    /api/product-images/{id}. The product's `images` array is then either
    appended to or fully replaced based on `mode`.
    """
    _require_admin(user)
    if mode not in ("append", "replace"):
        raise HTTPException(400, "mode must be 'append' or 'replace'")
    if not (file.filename or "").lower().endswith(".zip"):
        raise HTTPException(400, "Only .zip files are supported")

    raw = await file.read()
    try:
        zf = _zipfile.ZipFile(_io2.BytesIO(raw))
    except _zipfile.BadZipFile:
        raise HTTPException(400, "Uploaded file is not a valid .zip")

    db = get_db(request)
    # Build SKU set from current catalog (upper-cased)
    sku_set: set = set()
    async for doc in db.products.find({}, {"sku": 1, "_id": 0}):
        if doc.get("sku"):
            sku_set.add(_normalize_sku(doc["sku"]))

    by_sku: dict = _defaultdict(list)  # sku -> [(name, ext, bytes)]
    image_files = 0
    skipped_files = 0
    missed_files: List[str] = []
    all_entries = zf.namelist()

    for name in all_entries:
        if name.endswith("/"):
            continue
        ext = _ext(name)
        if ext not in _IMG_EXTS:
            skipped_files += 1
            continue
        image_files += 1
        sku = _match_sku_in_zip(name, sku_set)
        if not sku:
            if len(missed_files) < 12:
                missed_files.append(name)
            skipped_files += 1
            continue
        try:
            data = zf.read(name)
        except Exception:
            skipped_files += 1
            continue
        if len(data) > 5 * 1024 * 1024:  # 5MB per image safety cap
            skipped_files += 1
            continue
        by_sku[sku].append((name, ext, data))

    matched_files = sum(len(v) for v in by_sku.values())

    # Build absolute base URL from the incoming request, honoring proxy headers
    # so we emit https://<external-host> instead of the internal cluster URL.
    fwd_proto = request.headers.get("x-forwarded-proto", "").split(",")[0].strip()
    fwd_host = request.headers.get("x-forwarded-host", "").split(",")[0].strip()
    if fwd_proto and fwd_host:
        base = f"{fwd_proto}://{fwd_host}"
    else:
        base = str(request.base_url).rstrip("/")

    samples: List[dict] = []
    for sku in list(by_sku.keys())[:8]:
        samples.append({
            "sku": sku,
            "file_count": len(by_sku[sku]),
            "files": [n for n, _e, _d in by_sku[sku][:4]],
        })

    if not dry_run and by_sku:
        now = _now_iso()
        for sku, files in by_sku.items():
            new_urls: List[str] = []
            for fname, ext, data in files:
                img_id = _uuid2.uuid4().hex
                ct = _CT_MAP.get(ext, "application/octet-stream")
                await db.product_images.insert_one({
                    "id": img_id,
                    "sku": sku,
                    "filename": fname.split("/")[-1],
                    "content_type": ct,
                    "data": data,
                    "size": len(data),
                    "created_at": now,
                })
                new_urls.append(f"{base}/api/product-images/{img_id}")
            if mode == "replace":
                await db.products.update_one(
                    {"sku": {"$regex": f"^{_re2.escape(sku)}", "$options": "i"}},
                    {"$set": {"images": new_urls, "updated_at": now}},
                )
            else:
                await db.products.update_one(
                    {"sku": {"$regex": f"^{_re2.escape(sku)}", "$options": "i"}},
                    {"$push": {"images": {"$each": new_urls}}, "$set": {"updated_at": now}},
                )

    return BulkImageImportResult(
        total_files=len(all_entries),
        image_files=image_files,
        matched_skus=len(by_sku),
        matched_files=matched_files,
        skipped_files=skipped_files,
        missed_files=missed_files,
        samples=samples,
        dry_run=dry_run,
        mode=mode,
    )


# ============================ PRODUCT ANALYTICS ============================
from datetime import timedelta as _timedelta  # noqa: E402


class TrackEventPayload(BaseModel):
    type: str  # "view" | "cart_add"
    session_id: Optional[str] = None


@router.post("/products/{product_id}/track")
async def track_product_event(
    product_id: str, payload: TrackEventPayload, request: Request,
):
    """Public, fire-and-forget product analytics event. Records to
    `product_events` and increments a denormalized counter on the product doc."""
    if payload.type not in ("view", "cart_add"):
        raise HTTPException(400, "type must be 'view' or 'cart_add'")
    db = get_db(request)
    prod = await db.products.find_one({"id": product_id}, {"id": 1, "_id": 0})
    if not prod:
        raise HTTPException(404, "Product not found")
    user = await _optional_user(request)
    now = datetime.now(timezone.utc)
    await db.product_events.insert_one({
        "id": str(_uuid2.uuid4()),
        "product_id": product_id,
        "type": payload.type,
        "user_id": user.get("sub") if user else None,
        "session_id": payload.session_id or "",
        "created_at": now.isoformat(),
        "ts": now,
    })
    counter_field = "view_count" if payload.type == "view" else "cart_add_count"
    await db.products.update_one(
        {"id": product_id}, {"$inc": {counter_field: 1}},
    )
    return {"ok": True}


@router.get("/products/{product_id}/viewing-now")
async def viewing_now(product_id: str, request: Request):
    """Public — count distinct sessions/users who viewed this product in the last 15 minutes.
    Used by the product page to display a soft urgency badge.
    The current caller is excluded by ignoring their own session_id via header."""
    db = get_db(request)
    since = datetime.now(timezone.utc) - _timedelta(minutes=15)
    # Identity key: prefer user_id; else session_id
    pipeline = [
        {"$match": {
            "product_id": product_id, "type": "view", "ts": {"$gte": since},
        }},
        {"$group": {
            "_id": {"$ifNull": ["$user_id", "$session_id"]},
        }},
        {"$count": "n"},
    ]
    count = 0
    async for row in db.product_events.aggregate(pipeline):
        count = row["n"]
    return {"count": count, "window_minutes": 15}



def _window_since(window: str) -> Optional[datetime]:
    if window == "30d":
        return datetime.now(timezone.utc) - _timedelta(days=30)
    return None


async def _aggregate_product_metrics(
    db: AsyncIOMotorDatabase, window: str,
) -> dict:
    """Return {product_id: {views, cart_adds, units_sold}}."""
    since = _window_since(window)
    metrics: dict = {}

    pipeline: list = []
    if since is not None:
        pipeline.append({"$match": {"ts": {"$gte": since}}})
    pipeline.append({"$group": {
        "_id": {"product_id": "$product_id", "type": "$type"},
        "count": {"$sum": 1},
    }})
    async for row in db.product_events.aggregate(pipeline):
        pid = row["_id"]["product_id"]
        t = row["_id"]["type"]
        m = metrics.setdefault(pid, {"views": 0, "cart_adds": 0, "units_sold": 0})
        if t == "view":
            m["views"] = row["count"]
        elif t == "cart_add":
            m["cart_adds"] = row["count"]

    order_match: dict = {"payment_status": "paid"}
    if since is not None:
        order_match["created_at"] = {"$gte": since.isoformat()}
    order_pipeline = [
        {"$match": order_match},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "qty": {"$sum": "$items.qty"}}},
    ]
    async for row in db.orders.aggregate(order_pipeline):
        pid = row["_id"]
        m = metrics.setdefault(pid, {"views": 0, "cart_adds": 0, "units_sold": 0})
        m["units_sold"] = row["qty"]
    return metrics


async def _daily_series(
    db: AsyncIOMotorDatabase, product_ids: Optional[List[str]], days: int, event_type: str = "view",
) -> dict:
    """Return {product_id: [int x days]} of daily event counts ending today."""
    now = datetime.now(timezone.utc)
    start = (now - _timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    match: dict = {"type": event_type, "ts": {"$gte": start}}
    if product_ids:
        match["product_id"] = {"$in": product_ids}
    pipeline = [
        {"$match": match},
        {"$group": {
            "_id": {
                "product_id": "$product_id",
                "d": {"$dateToString": {"format": "%Y-%m-%d", "date": "$ts"}},
            },
            "count": {"$sum": 1},
        }},
    ]
    buckets: dict = {}
    async for row in db.product_events.aggregate(pipeline):
        pid = row["_id"]["product_id"]
        d = row["_id"]["d"]
        buckets.setdefault(pid, {})[d] = row["count"]
    day_keys = [(start + _timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]
    series: dict = {}
    for pid in (product_ids or list(buckets.keys())):
        series[pid] = [buckets.get(pid, {}).get(d, 0) for d in day_keys]
    return series


class ProductAnalyticsRow(BaseModel):
    id: str
    title: str
    sku: str
    brand: str = ""
    price: float
    stock_quantity: int
    images: List[str] = []
    views: int
    cart_adds: int
    units_sold: int
    conversion_rate: float
    sell_through: float
    sparkline: List[int]


class ProductAnalyticsResponse(BaseModel):
    items: List[ProductAnalyticsRow]
    total: int
    page: int
    pages: int
    window: str


@router.get("/admin/analytics/products", response_model=ProductAnalyticsResponse)
async def admin_analytics_products(
    request: Request,
    user: dict = Depends(get_current_user_payload),
    window: str = Query("all", pattern="^(all|30d)$"),
    sort: str = Query("views", pattern="^(views|cart_adds|sold|conversion|sell_through|title)$"),
    page: int = Query(1, ge=1),
    page_size: int = Query(25, ge=1, le=100),
    q: Optional[str] = None,
):
    _require_admin(user)
    db = get_db(request)
    filt: dict = {}
    if q and q.strip():
        rx = _re2.escape(q.strip())
        filt["$or"] = [
            {"title": {"$regex": rx, "$options": "i"}},
            {"sku": {"$regex": rx, "$options": "i"}},
            {"brand": {"$regex": rx, "$options": "i"}},
        ]
    total = await db.products.count_documents(filt)
    all_products: List[dict] = []
    async for p in db.products.find(filt, {"_id": 0}):
        all_products.append(p)

    metrics = await _aggregate_product_metrics(db, window)

    rows: List[dict] = []
    for p in all_products:
        m = metrics.get(p["id"], {"views": 0, "cart_adds": 0, "units_sold": 0})
        views, cart_adds, sold = m["views"], m["cart_adds"], m["units_sold"]
        stock = int(p.get("stock_quantity") or 0)
        rows.append({
            "id": p["id"], "title": p.get("title", ""), "sku": p.get("sku", ""),
            "brand": p.get("brand", ""), "price": float(p.get("price") or 0),
            "stock_quantity": stock, "images": (p.get("images") or [])[:1],
            "views": views, "cart_adds": cart_adds, "units_sold": sold,
            "conversion_rate": round((cart_adds / views) if views > 0 else 0.0, 4),
            "sell_through": round((sold / (sold + stock)) if (sold + stock) > 0 else 0.0, 4),
        })

    key_map = {
        "views": lambda r: -r["views"],
        "cart_adds": lambda r: -r["cart_adds"],
        "sold": lambda r: -r["units_sold"],
        "conversion": lambda r: -r["conversion_rate"],
        "sell_through": lambda r: -r["sell_through"],
        "title": lambda r: r["title"].lower(),
    }
    rows.sort(key=key_map[sort])

    start_idx = (page - 1) * page_size
    page_rows = rows[start_idx:start_idx + page_size]
    page_ids = [r["id"] for r in page_rows]
    sparks = await _daily_series(db, page_ids, days=14, event_type="view")
    for r in page_rows:
        r["sparkline"] = sparks.get(r["id"], [0] * 14)

    import math
    pages = math.ceil(total / page_size) if total > 0 else 1
    return ProductAnalyticsResponse(
        items=[ProductAnalyticsRow(**r) for r in page_rows],
        total=total, page=page, pages=pages, window=window,
    )


class AnalyticsOverviewResponse(BaseModel):
    window: str
    totals: dict
    winners: List[ProductAnalyticsRow]
    underperformers: List[ProductAnalyticsRow]


@router.get("/admin/analytics/overview", response_model=AnalyticsOverviewResponse)
async def admin_analytics_overview(
    request: Request,
    user: dict = Depends(get_current_user_payload),
    window: str = Query("all", pattern="^(all|30d)$"),
):
    _require_admin(user)
    db = get_db(request)
    metrics = await _aggregate_product_metrics(db, window)
    products_by_id = {}
    async for p in db.products.find({}, {"_id": 0}):
        products_by_id[p["id"]] = p

    totals = {
        "views": sum(m["views"] for m in metrics.values()),
        "cart_adds": sum(m["cart_adds"] for m in metrics.values()),
        "units_sold": sum(m["units_sold"] for m in metrics.values()),
        "products_with_traffic": sum(1 for m in metrics.values() if m["views"] > 0),
    }

    def row_for(pid: str) -> Optional[dict]:
        p = products_by_id.get(pid)
        if not p:
            return None
        m = metrics.get(pid, {"views": 0, "cart_adds": 0, "units_sold": 0})
        stock = int(p.get("stock_quantity") or 0)
        views, cart_adds, sold = m["views"], m["cart_adds"], m["units_sold"]
        return {
            "id": pid, "title": p.get("title", ""), "sku": p.get("sku", ""),
            "brand": p.get("brand", ""), "price": float(p.get("price") or 0),
            "stock_quantity": stock, "images": (p.get("images") or [])[:1],
            "views": views, "cart_adds": cart_adds, "units_sold": sold,
            "conversion_rate": round((cart_adds / views) if views > 0 else 0.0, 4),
            "sell_through": round((sold / (sold + stock)) if (sold + stock) > 0 else 0.0, 4),
            "sparkline": [],
        }

    # Winners: most units sold (then cart_adds, then views). Real conversions matter.
    winner_ids = sorted(
        metrics.keys(),
        key=lambda pid: (
            -metrics[pid]["units_sold"],
            -metrics[pid]["cart_adds"],
            -metrics[pid]["views"],
        ),
    )[:5]
    # Underperformers: have meaningful views but zero conversions (cart_adds == 0).
    under_ids = sorted(
        [
            pid for pid, m in metrics.items()
            if m["views"] >= 5 and m["cart_adds"] == 0 and m["units_sold"] == 0
        ],
        key=lambda pid: -metrics[pid]["views"],
    )[:5]

    winners = [r for r in (row_for(pid) for pid in winner_ids) if r]
    underperformers = [r for r in (row_for(pid) for pid in under_ids) if r]

    pids = [r["id"] for r in (winners + underperformers)]
    sparks = await _daily_series(db, pids, days=14, event_type="view")
    for r in winners + underperformers:
        r["sparkline"] = sparks.get(r["id"], [0] * 14)

    return AnalyticsOverviewResponse(
        window=window, totals=totals,
        winners=[ProductAnalyticsRow(**r) for r in winners],
        underperformers=[ProductAnalyticsRow(**r) for r in underperformers],
    )


class ProductAnalyticsDetail(BaseModel):
    product: dict
    metrics: dict
    daily_views: List[int]
    daily_cart_adds: List[int]
    daily_dates: List[str]
    window: str


@router.get("/admin/analytics/products/{product_id}", response_model=ProductAnalyticsDetail)
async def admin_analytics_product_detail(
    product_id: str, request: Request,
    user: dict = Depends(get_current_user_payload),
    window: str = Query("all", pattern="^(all|30d)$"),
):
    _require_admin(user)
    db = get_db(request)
    p = await db.products.find_one({"id": product_id}, {"_id": 0})
    if not p:
        raise HTTPException(404, "Product not found")
    metrics = await _aggregate_product_metrics(db, window)
    m = metrics.get(product_id, {"views": 0, "cart_adds": 0, "units_sold": 0})
    stock = int(p.get("stock_quantity") or 0)
    views, cart_adds, sold = m["views"], m["cart_adds"], m["units_sold"]

    days = 30
    view_series = (await _daily_series(db, [product_id], days, "view")).get(product_id, [0] * days)
    cart_series = (await _daily_series(db, [product_id], days, "cart_add")).get(product_id, [0] * days)
    now = datetime.now(timezone.utc)
    start = (now - _timedelta(days=days - 1)).replace(hour=0, minute=0, second=0, microsecond=0)
    dates = [(start + _timedelta(days=i)).strftime("%Y-%m-%d") for i in range(days)]

    return ProductAnalyticsDetail(
        product={
            "id": p["id"], "title": p.get("title", ""), "sku": p.get("sku", ""),
            "brand": p.get("brand", ""), "price": float(p.get("price") or 0),
            "stock_quantity": stock, "images": (p.get("images") or [])[:1],
        },
        metrics={
            "views": views, "cart_adds": cart_adds, "units_sold": sold,
            "conversion_rate": round((cart_adds / views) if views > 0 else 0.0, 4),
            "sell_through": round((sold / (sold + stock)) if (sold + stock) > 0 else 0.0, 4),
        },
        daily_views=view_series,
        daily_cart_adds=cart_series,
        daily_dates=dates,
        window=window,
    )


# ============================ ADMIN: daily email digest ============================
from email_service import send_admin_digest  # noqa: E402


async def build_digest_summary(db: AsyncIOMotorDatabase, *, days_back: int = 1) -> dict:
    """Build a single-day summary of metrics for the digest email.

    `days_back=1` means the calendar day immediately before today UTC.
    """
    now = datetime.now(timezone.utc)
    end_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)  # today 00:00 UTC
    start_of_day = end_of_day - _timedelta(days=days_back)

    # Events in window
    events_count = {"view": 0, "cart_add": 0}
    pipeline = [
        {"$match": {"ts": {"$gte": start_of_day, "$lt": end_of_day}}},
        {"$group": {"_id": "$type", "count": {"$sum": 1}}},
    ]
    async for row in db.product_events.aggregate(pipeline):
        events_count[row["_id"]] = row["count"]

    # Orders in window (paid)
    order_pipeline = [
        {"$match": {
            "payment_status": "paid",
            "created_at": {"$gte": start_of_day.isoformat(), "$lt": end_of_day.isoformat()},
        }},
        {"$group": {"_id": None, "orders": {"$sum": 1}, "revenue": {"$sum": "$total"}}},
    ]
    orders, revenue = 0, 0.0
    async for row in db.orders.aggregate(order_pipeline):
        orders = row["orders"]
        revenue = float(row.get("revenue") or 0)

    # Per-product event counts for the window
    pp_pipeline = [
        {"$match": {"ts": {"$gte": start_of_day, "$lt": end_of_day}}},
        {"$group": {
            "_id": {"product_id": "$product_id", "type": "$type"},
            "count": {"$sum": 1},
        }},
    ]
    per_product: dict = {}
    async for row in db.product_events.aggregate(pp_pipeline):
        pid = row["_id"]["product_id"]
        t = row["_id"]["type"]
        m = per_product.setdefault(pid, {"views": 0, "cart_adds": 0, "units_sold": 0})
        if t == "view":
            m["views"] = row["count"]
        elif t == "cart_add":
            m["cart_adds"] = row["count"]

    # Sold counts for the window
    sold_pipeline = [
        {"$match": {
            "payment_status": "paid",
            "created_at": {"$gte": start_of_day.isoformat(), "$lt": end_of_day.isoformat()},
        }},
        {"$unwind": "$items"},
        {"$group": {"_id": "$items.product_id", "qty": {"$sum": "$items.qty"}}},
    ]
    async for row in db.orders.aggregate(sold_pipeline):
        m = per_product.setdefault(row["_id"], {"views": 0, "cart_adds": 0, "units_sold": 0})
        m["units_sold"] = row["qty"]

    # Resolve titles for top entries
    candidate_ids = list(per_product.keys())
    titles: dict = {}
    if candidate_ids:
        async for p in db.products.find(
            {"id": {"$in": candidate_ids}}, {"id": 1, "title": 1, "_id": 0},
        ):
            titles[p["id"]] = p.get("title", "")

    def row_for(pid: str) -> dict:
        m = per_product[pid]
        return {
            "id": pid,
            "title": titles.get(pid, "(deleted)"),
            "views": m["views"],
            "cart_adds": m["cart_adds"],
            "units_sold": m["units_sold"],
        }

    winners = [row_for(pid) for pid in sorted(
        candidate_ids,
        key=lambda x: (-per_product[x]["units_sold"], -per_product[x]["cart_adds"], -per_product[x]["views"]),
    )[:3]]
    underperformers = [row_for(pid) for pid in sorted(
        [pid for pid in candidate_ids
         if per_product[pid]["views"] >= 3 and per_product[pid]["cart_adds"] == 0],
        key=lambda x: -per_product[x]["views"],
    )[:3]]

    return {
        "date_label": start_of_day.strftime("%A, %B %-d, %Y"),
        "date_iso": start_of_day.date().isoformat(),
        "views": events_count.get("view", 0),
        "cart_adds": events_count.get("cart_add", 0),
        "orders": orders,
        "revenue": round(revenue, 2),
        "winners": winners,
        "underperformers": underperformers,
    }


class DigestSettings(BaseModel):
    enabled: bool = False
    hour_utc: int = 13  # default 1pm UTC (~6am PT / 9am ET)
    recipients: List[EmailStr] = []
    last_sent_date: Optional[str] = None  # ISO YYYY-MM-DD, to dedupe


@router.get("/admin/analytics/digest/settings", response_model=DigestSettings)
async def get_digest_settings(request: Request, user: dict = Depends(get_current_user_payload)):
    _require_admin(user)
    db = get_db(request)
    doc = await db.admin_settings.find_one({"key": "digest"}, {"_id": 0})
    if not doc:
        return DigestSettings(enabled=False, hour_utc=13, recipients=[])
    return DigestSettings(
        enabled=bool(doc.get("enabled", False)),
        hour_utc=int(doc.get("hour_utc", 13)),
        recipients=list(doc.get("recipients", [])),
        last_sent_date=doc.get("last_sent_date"),
    )


class DigestSettingsUpdate(BaseModel):
    enabled: bool
    hour_utc: int = Field(ge=0, le=23)
    recipients: List[EmailStr] = []


@router.put("/admin/analytics/digest/settings", response_model=DigestSettings)
async def update_digest_settings(
    payload: DigestSettingsUpdate, request: Request,
    user: dict = Depends(get_current_user_payload),
):
    _require_admin(user)
    db = get_db(request)
    await db.admin_settings.update_one(
        {"key": "digest"},
        {"$set": {
            "enabled": payload.enabled,
            "hour_utc": payload.hour_utc,
            "recipients": [str(r) for r in payload.recipients],
            "updated_at": _now_iso(),
        }},
        upsert=True,
    )
    doc = await db.admin_settings.find_one({"key": "digest"}, {"_id": 0})
    return DigestSettings(
        enabled=bool(doc.get("enabled", False)),
        hour_utc=int(doc.get("hour_utc", 13)),
        recipients=list(doc.get("recipients", [])),
        last_sent_date=doc.get("last_sent_date"),
    )


class DigestSendResponse(BaseModel):
    sent: bool
    skipped_reason: Optional[str] = None
    recipients: List[str] = []
    summary: dict


@router.post("/admin/analytics/digest/send", response_model=DigestSendResponse)
async def send_digest_now(
    request: Request,
    user: dict = Depends(get_current_user_payload),
    test: bool = Query(False, description="If true, bypass last_sent_date dedupe"),
):
    """Trigger the digest email immediately. Used by admin UI 'Send now' button
    and by the scheduler. Falls back to the admin's own email if recipients empty."""
    _require_admin(user)
    db = get_db(request)
    doc = await db.admin_settings.find_one({"key": "digest"}, {"_id": 0}) or {}
    recipients = [r for r in doc.get("recipients", []) if r]
    if not recipients:
        # Fall back to all admin user emails
        async for u in db.users.find({"role": "admin"}, {"email": 1, "_id": 0}):
            if u.get("email"):
                recipients.append(u["email"])
    if not recipients:
        return DigestSendResponse(sent=False, skipped_reason="no_recipients", summary={})

    summary = await build_digest_summary(db, days_back=1)

    # Idempotency: skip if we already sent for this date today (unless test=true)
    if not test and doc.get("last_sent_date") == summary["date_iso"]:
        return DigestSendResponse(
            sent=False, skipped_reason="already_sent_today",
            recipients=recipients, summary=summary,
        )

    ok = await send_admin_digest(recipients, summary)
    if ok and not test:
        await db.admin_settings.update_one(
            {"key": "digest"},
            {"$set": {"last_sent_date": summary["date_iso"], "last_sent_at": _now_iso()}},
            upsert=True,
        )
    return DigestSendResponse(
        sent=ok,
        skipped_reason=None if ok else "send_failed_or_no_api_key",
        recipients=recipients,
        summary=summary,
    )


@router.get("/admin/analytics/digest/preview")
async def digest_preview(request: Request, user: dict = Depends(get_current_user_payload)):
    """Returns the digest summary JSON without sending the email — for UI preview."""
    _require_admin(user)
    db = get_db(request)
    return await build_digest_summary(db, days_back=1)


# ============================ ABANDONED CART RECOVERY ============================
from email_service import send_cart_recovery  # noqa: E402


class CartRecoverySettings(BaseModel):
    enabled: bool = False
    delay_hours: int = Field(default=24, ge=1, le=72)
    cooldown_days: int = Field(default=7, ge=1, le=30)
    promo_code: Optional[str] = None  # one of PROMO_CODES keys or null


class CartRecoverySettingsUpdate(BaseModel):
    enabled: bool
    delay_hours: int = Field(ge=1, le=72)
    cooldown_days: int = Field(ge=1, le=30)
    promo_code: Optional[str] = None


@router.get("/admin/cart-recovery/settings", response_model=CartRecoverySettings)
async def get_cart_recovery_settings(request: Request, user: dict = Depends(get_current_user_payload)):
    _require_admin(user)
    db = get_db(request)
    doc = await db.admin_settings.find_one({"key": "cart_recovery"}, {"_id": 0}) or {}
    return CartRecoverySettings(
        enabled=bool(doc.get("enabled", False)),
        delay_hours=int(doc.get("delay_hours", 24)),
        cooldown_days=int(doc.get("cooldown_days", 7)),
        promo_code=doc.get("promo_code"),
    )


@router.put("/admin/cart-recovery/settings", response_model=CartRecoverySettings)
async def update_cart_recovery_settings(
    payload: CartRecoverySettingsUpdate, request: Request,
    user: dict = Depends(get_current_user_payload),
):
    _require_admin(user)
    promo = (payload.promo_code or "").strip().upper() or None
    if promo and promo not in PROMO_CODES:
        raise HTTPException(400, f"Unknown promo code '{promo}'. Available: {list(PROMO_CODES.keys())}")
    db = get_db(request)
    await db.admin_settings.update_one(
        {"key": "cart_recovery"},
        {"$set": {
            "enabled": payload.enabled,
            "delay_hours": payload.delay_hours,
            "cooldown_days": payload.cooldown_days,
            "promo_code": promo,
            "updated_at": _now_iso(),
        }},
        upsert=True,
    )
    return CartRecoverySettings(
        enabled=payload.enabled, delay_hours=payload.delay_hours,
        cooldown_days=payload.cooldown_days, promo_code=promo,
    )


async def _find_abandoned_carts(db: AsyncIOMotorDatabase, *, delay_hours: int, cooldown_days: int):
    """Return list of {user_id, email, name, last_cart_at, product_ids[]} for users whose
    most-recent cart_add is between [now - delay_hours - 1h, now - delay_hours], who
    have NOT placed a paid order since, and were NOT emailed within `cooldown_days`."""
    now = datetime.now(timezone.utc)
    window_end = now - _timedelta(hours=delay_hours)
    window_start = window_end - _timedelta(hours=1)
    cooldown_cutoff = now - _timedelta(days=cooldown_days)

    # 1. Group cart_add events from authenticated users with most-recent ts in window
    pipeline = [
        {"$match": {
            "type": "cart_add",
            "user_id": {"$ne": None},
            "ts": {"$gte": now - _timedelta(hours=48)},
        }},
        {"$sort": {"ts": -1}},
        {"$group": {
            "_id": "$user_id",
            "last_cart_at": {"$first": "$ts"},
            "product_ids": {"$addToSet": "$product_id"},
        }},
        {"$match": {
            "last_cart_at": {"$gte": window_start, "$lte": window_end},
        }},
    ]
    candidates: list = []
    async for row in db.product_events.aggregate(pipeline):
        candidates.append(row)
    if not candidates:
        return []

    out = []
    for cand in candidates:
        uid = cand["_id"]
        # Skip if emailed recently
        last_log = await db.cart_recovery_log.find_one(
            {"user_id": uid, "sent_at": {"$gte": cooldown_cutoff.isoformat()}},
            {"_id": 0},
        )
        if last_log:
            continue
        # Skip if user placed a paid order since cart_add
        last_cart_iso = cand["last_cart_at"].isoformat()
        paid = await db.orders.find_one(
            {"user_id": uid, "payment_status": "paid", "created_at": {"$gte": last_cart_iso}},
            {"_id": 0, "id": 1},
        )
        if paid:
            continue
        # Resolve user
        u = await db.users.find_one({"id": uid}, {"email": 1, "name": 1, "_id": 0})
        if not u or not u.get("email"):
            continue
        out.append({
            "user_id": uid,
            "email": u["email"],
            "name": u.get("name") or "",
            "last_cart_at": cand["last_cart_at"],
            "product_ids": cand["product_ids"],
        })
    return out


async def _send_cart_recovery_for(
    db: AsyncIOMotorDatabase, candidate: dict, *, promo_code: Optional[str], store_url: str,
) -> bool:
    """Build the items list, send email, log to cart_recovery_log."""
    pids = candidate["product_ids"]
    items = []
    async for p in db.products.find({"id": {"$in": pids}}, {"_id": 0}):
        items.append({
            "title": p.get("title", ""),
            "price": (p.get("sale_price") if (p.get("sale_price") and p["sale_price"] > 0)
                      else p.get("price")) or 0,
            "image": (p.get("images") or [""])[0],
            "sku": p.get("sku", ""),
        })
    if not items:
        return False
    promo = None
    if promo_code and promo_code in PROMO_CODES:
        promo = {"code": promo_code, **PROMO_CODES[promo_code]}
    recovery_id = str(_uuid2.uuid4())
    ok = await send_cart_recovery(
        candidate["email"],
        user_name=candidate["name"],
        items=items, promo=promo, store_url=store_url,
        recovery_id=recovery_id,
    )
    if ok:
        await db.cart_recovery_log.insert_one({
            "id": recovery_id,
            "user_id": candidate["user_id"],
            "email": candidate["email"],
            "product_ids": pids,
            "promo_code": promo_code,
            "sent_at": _now_iso(),
            "clicked_at": None,
            "click_count": 0,
            "converted_at": None,
            "order_id": None,
            "revenue": 0.0,
        })
    return ok


async def _mark_recovery_converted(db: AsyncIOMotorDatabase, order: dict) -> None:
    """Stamp the cart_recovery_log doc as converted. Idempotent."""
    rid = order.get("recovered_from")
    if not rid:
        return
    log = await db.cart_recovery_log.find_one({"id": rid}, {"_id": 0, "converted_at": 1})
    if not log or log.get("converted_at"):
        return  # already attributed
    await db.cart_recovery_log.update_one(
        {"id": rid},
        {"$set": {
            "converted_at": _now_iso(),
            "order_id": order.get("id"),
            "revenue": float(order.get("total") or 0),
        }},
    )


class CartRecoveryRunResponse(BaseModel):
    dry_run: bool
    sent: int
    candidates: int
    cooldown_skipped: int  # informational
    candidates_preview: List[dict]


@router.post("/admin/cart-recovery/run-now", response_model=CartRecoveryRunResponse)
async def run_cart_recovery_now(
    request: Request,
    user: dict = Depends(get_current_user_payload),
    dry_run: bool = Query(False),
):
    """Manually run the abandoned-cart job. With `dry_run=true`, returns the list
    of users who would receive an email without actually sending."""
    _require_admin(user)
    db = get_db(request)
    doc = await db.admin_settings.find_one({"key": "cart_recovery"}, {"_id": 0}) or {}
    delay = int(doc.get("delay_hours", 24))
    cooldown = int(doc.get("cooldown_days", 7))
    promo = doc.get("promo_code")
    candidates = await _find_abandoned_carts(db, delay_hours=delay, cooldown_days=cooldown)
    preview = [
        {
            "email": c["email"], "name": c["name"],
            "products": len(c["product_ids"]),
            "last_cart_at": c["last_cart_at"].isoformat(),
        }
        for c in candidates[:10]
    ]
    sent = 0
    if not dry_run:
        store_url = (os.environ.get("APP_URL") or "").rstrip("/")
        for c in candidates:
            ok = await _send_cart_recovery_for(db, c, promo_code=promo, store_url=store_url)
            if ok:
                sent += 1
    return CartRecoveryRunResponse(
        dry_run=dry_run, sent=sent, candidates=len(candidates),
        cooldown_skipped=0, candidates_preview=preview,
    )



# ============================ Recovery click + attribution ============================
@router.post("/cart-recovery/click")
async def cart_recovery_click(request: Request, rcv: str = Query(..., min_length=1)):
    """Public — record a click on a recovery-email link. The frontend fires this
    on page mount when ?rcv=<id> is present. Idempotent for repeat clicks (counter)."""
    db = get_db(request)
    log = await db.cart_recovery_log.find_one({"id": rcv}, {"_id": 0, "id": 1})
    if not log:
        return {"ok": False}  # silently no-op so we never break the cart page
    now = _now_iso()
    await db.cart_recovery_log.update_one(
        {"id": rcv},
        {"$set": {"clicked_at": now}, "$inc": {"click_count": 1}},
    )
    return {"ok": True}


class RecoveryMetricsResponse(BaseModel):
    window: str
    sent: int
    clicked: int
    converted: int
    revenue: float
    click_rate: float
    conversion_rate: float
    recent: List[dict]


@router.get("/admin/analytics/recovery", response_model=RecoveryMetricsResponse)
async def admin_analytics_recovery(
    request: Request,
    user: dict = Depends(get_current_user_payload),
    window: str = Query("all", pattern="^(all|30d)$"),
):
    """Aggregate recovery email performance: sent/clicked/converted/revenue."""
    _require_admin(user)
    db = get_db(request)
    since = _window_since(window)
    match: dict = {}
    if since is not None:
        match["sent_at"] = {"$gte": since.isoformat()}
    sent, clicked, converted, revenue = 0, 0, 0, 0.0
    recent: List[dict] = []
    cursor = db.cart_recovery_log.find(match, {"_id": 0}).sort([("sent_at", -1)])
    async for doc in cursor:
        sent += 1
        if doc.get("clicked_at"):
            clicked += 1
        if doc.get("converted_at"):
            converted += 1
            revenue += float(doc.get("revenue") or 0)
        if len(recent) < 10:
            recent.append({
                "id": doc.get("id"),
                "email": doc.get("email"),
                "sent_at": doc.get("sent_at"),
                "clicked_at": doc.get("clicked_at"),
                "converted_at": doc.get("converted_at"),
                "revenue": float(doc.get("revenue") or 0),
                "promo_code": doc.get("promo_code"),
                "items": len(doc.get("product_ids") or []),
            })
    click_rate = (clicked / sent) if sent else 0.0
    conv_rate = (converted / sent) if sent else 0.0
    return RecoveryMetricsResponse(
        window=window, sent=sent, clicked=clicked, converted=converted,
        revenue=round(revenue, 2),
        click_rate=round(click_rate, 4),
        conversion_rate=round(conv_rate, 4),
        recent=recent,
    )


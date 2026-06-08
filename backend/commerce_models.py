"""Pydantic models for orders, reviews, payments, newsletter, contact."""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field, EmailStr, ConfigDict


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


# ----------------------------- Cart & Orders -----------------------------
class CartItemIn(BaseModel):
    product_id: str
    qty: int = Field(ge=1, le=99)
    variants: Optional[Dict[str, str]] = None


class CheckoutAddress(BaseModel):
    email: EmailStr
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    address1: str = Field(min_length=1, max_length=200)
    address2: Optional[str] = ""
    city: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=1, max_length=80)
    zip: str = Field(min_length=1, max_length=20)
    country: str = "United States"


class CheckoutRequest(BaseModel):
    items: List[CartItemIn] = Field(min_length=1, max_length=50)
    shipping_address: CheckoutAddress
    shipping_method: str = Field(default="standard", pattern="^(standard|express)$")
    origin_url: str  # window.location.origin from frontend
    recovery_id: Optional[str] = None  # set when checkout originates from a recovery email


class OrderLineItem(BaseModel):
    product_id: str
    title: str
    image: str = ""
    unit_price: float
    qty: int
    variants: Dict[str, str] = {}
    fulfillment_type: str = "warehouse"


class OrderStatusEvent(BaseModel):
    """Single entry in an order's status_history audit trail."""
    status: str  # pending | paid | shipped | out_for_delivery | delivered | cancelled
    note: str = ""
    at: str = Field(default_factory=_now_iso)


# Allowed order lifecycle states
ALLOWED_ORDER_STATUSES = (
    "pending", "paid", "shipped", "out_for_delivery", "delivered", "cancelled",
)

# Maps order status → tracking timeline step (1..5). cancelled returns 0.
STATUS_TO_STEP = {
    "pending": 1,
    "paid": 2,
    "shipped": 3,
    "out_for_delivery": 4,
    "delivered": 5,
    "cancelled": 0,
}


class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    order_number: str  # AM-XXXXXX
    user_id: Optional[str] = None  # null for guest
    email: EmailStr
    items: List[OrderLineItem]
    subtotal: float
    shipping_cost: float
    tax: float
    total: float
    shipping_method: str
    shipping_address: CheckoutAddress
    status: str = "pending"  # see ALLOWED_ORDER_STATUSES
    payment_status: str = "initiated"  # initiated | paid | failed | expired
    stripe_session_id: Optional[str] = None
    # Fulfillment routing (Phase 5D)
    has_warehouse: bool = False
    has_dropship: bool = False
    # Tracking
    tracking_carrier: Optional[str] = None
    tracking_code: Optional[str] = None
    eta: Optional[str] = None  # ISO date string
    shipped_at: Optional[str] = None
    delivered_at: Optional[str] = None
    recovered_from: Optional[str] = None  # cart_recovery_log.id if this order originated from a recovery email
    status_history: List[OrderStatusEvent] = []
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class OrderStatusUpdate(BaseModel):
    """Admin payload to advance an order through its lifecycle."""
    status: str
    note: Optional[str] = ""
    tracking_carrier: Optional[str] = None
    tracking_code: Optional[str] = None
    eta: Optional[str] = None  # ISO date


class TrackingTimelineStep(BaseModel):
    step: int
    label: str
    sub: str
    reached: bool
    at: Optional[str] = None  # ISO timestamp when reached, if available


class TrackingResponse(BaseModel):
    order_number: str
    email: EmailStr
    placed_at: str
    status: str
    current_step: int
    eta: Optional[str] = None
    tracking_carrier: Optional[str] = None
    tracking_code: Optional[str] = None
    shipping_method: str
    total: float
    items: List[OrderLineItem]
    timeline: List[TrackingTimelineStep]
    history: List[OrderStatusEvent]
    latest_note: str = ""


class CheckoutResponse(BaseModel):
    url: str
    session_id: str
    order_id: str
    order_number: str


class PaymentStatusResponse(BaseModel):
    payment_status: str  # paid | unpaid | initiated | failed | expired
    status: str
    order: Optional[Order] = None


# ----------------------------- Reviews -----------------------------
class ReviewCreate(BaseModel):
    rating: int = Field(ge=1, le=5)
    title: str = Field(min_length=1, max_length=120)
    body: str = Field(min_length=1, max_length=2000)


class Review(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    product_id: str
    user_id: str
    user_name: str
    rating: int
    title: str
    body: str
    created_at: str = Field(default_factory=_now_iso)


class ReviewListResponse(BaseModel):
    items: List[Review]
    total: int
    avg_rating: float
    distribution: Dict[str, int]  # "1".."5" -> count


# ----------------------------- Newsletter & Contact -----------------------------
class NewsletterSubscribe(BaseModel):
    email: EmailStr
    source: str = "homepage"


class NewsletterSubscriber(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    email: EmailStr
    source: str
    created_at: str = Field(default_factory=_now_iso)


class ContactMessageCreate(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    email: EmailStr
    subject: str = ""
    message: str = Field(min_length=1, max_length=5000)


class ContactMessage(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    name: str
    email: EmailStr
    subject: str
    message: str
    created_at: str = Field(default_factory=_now_iso)


class Address(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    user_id: str
    label: str = Field(default="Home", max_length=40)
    first_name: str
    last_name: str
    address1: str
    address2: Optional[str] = ""
    city: str
    state: str
    zip: str
    country: str = "United States"
    phone: Optional[str] = ""
    is_default: bool = False
    created_at: str = Field(default_factory=_now_iso)


class AddressCreate(BaseModel):
    label: str = Field(default="Home", max_length=40)
    first_name: str = Field(min_length=1, max_length=80)
    last_name: str = Field(min_length=1, max_length=80)
    address1: str = Field(min_length=1, max_length=200)
    address2: Optional[str] = ""
    city: str = Field(min_length=1, max_length=80)
    state: str = Field(min_length=1, max_length=80)
    zip: str = Field(min_length=1, max_length=20)
    country: str = "United States"
    phone: Optional[str] = ""
    is_default: bool = False


class SavedPaymentMethod(BaseModel):
    """Stub representation — full card details live in Stripe; we only mirror brand/last4."""
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    user_id: str
    stripe_payment_method_id: str = ""
    brand: str = ""
    last4: str = ""
    exp_month: int = 0
    exp_year: int = 0
    is_default: bool = False
    created_at: str = Field(default_factory=_now_iso)


# ----------------------------- Payment Transactions -----------------------------
class PaymentTransaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    session_id: str
    order_id: str
    user_email: str
    amount: float
    currency: str = "usd"
    payment_status: str = "initiated"  # initiated | paid | failed | expired
    metadata: Dict[str, Any] = {}
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)

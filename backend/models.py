"""Pydantic models for users, products, and shared schemas."""
import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional
from pydantic import BaseModel, Field, EmailStr, ConfigDict


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _new_id() -> str:
    return str(uuid.uuid4())


# ----------------------------- User -----------------------------
class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: EmailStr
    name: str
    role: str = "customer"
    created_at: str
    access_token: Optional[str] = None  # populated on login/register only


class UserCreate(BaseModel):
    email: EmailStr
    name: str = Field(min_length=1, max_length=80)
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: str = Field(min_length=1, max_length=80)


class PasswordChange(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=8, max_length=128)


# ----------------------------- Product -----------------------------
class ProductVariant(BaseModel):
    name: str  # e.g., "Color", "Size"
    options: List[str]


class ProductBase(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str = ""
    price: float = Field(ge=0)
    sale_price: Optional[float] = Field(default=None, ge=0)
    sku: str
    brand: str = ""
    category: str
    subcategory: Optional[str] = None
    tags: List[str] = []
    fulfillment_type: str = "warehouse"  # warehouse | dropship | digital
    stock_quantity: int = 0
    reorder_point: int = 10  # low-stock alert threshold (warehouse only)
    download_url: Optional[str] = ""  # set when fulfillment_type == "digital"
    images: List[str] = []
    variants: List[ProductVariant] = []
    specs: Dict[str, str] = {}
    rating: float = 0.0
    review_count: int = 0
    featured: bool = False


class ProductCreate(ProductBase):
    pass


class ProductUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    sale_price: Optional[float] = None
    sku: Optional[str] = None
    brand: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    fulfillment_type: Optional[str] = None
    stock_quantity: Optional[int] = None
    reorder_point: Optional[int] = None
    download_url: Optional[str] = None
    images: Optional[List[str]] = None
    variants: Optional[List[ProductVariant]] = None
    specs: Optional[Dict[str, str]] = None
    subcategory: Optional[str] = None
    featured: Optional[bool] = None


class Product(ProductBase):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=_new_id)
    created_at: str = Field(default_factory=_now_iso)
    updated_at: str = Field(default_factory=_now_iso)


class ProductListResponse(BaseModel):
    items: List[Product]
    total: int
    page: int
    page_size: int
    pages: int


class Category(BaseModel):
    slug: str
    name: str
    image: str = ""
    count: int = 0

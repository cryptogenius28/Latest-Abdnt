"""Seed MongoDB with 88 products + demo customer.

Idempotent: deletes existing seeded products (by sku prefix) before re-inserting.
Run:
    cd /app/backend && python seed_db.py
"""
import asyncio
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402

from auth_utils import hash_password  # noqa: E402
from seed_data import PRODUCTS_SEED  # noqa: E402
from extra_seed import EXTRA_PRODUCTS  # noqa: E402


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", text).strip().lower()
    return re.sub(r"[\s_-]+", "-", text)[:60]


def transform(seed: dict, idx: int) -> dict:
    title = seed["title"]
    # Remap 'auto' category to 'tools' (automotive falls under tools/hardware)
    category = seed["category"]
    subcategory = seed.get("subcategory")
    if category == "auto":
        category = "tools"
        subcategory = "automotive"
    elif category == "tools" and subcategory == "tools-auto":
        subcategory = "automotive"
    compare_at = float(seed.get("compare_at") or 0)
    price = float(seed["price"])
    # If compare_at > price, then compare_at is original and price is the sale price
    if compare_at and compare_at > price:
        regular_price = compare_at
        sale_price = price
    else:
        regular_price = price
        sale_price = None
    sku = f"AM-{category[:3].upper()}-{idx:03d}-{slugify(title)[:20].upper()}"
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": uuid.uuid4().hex,
        "title": title,
        "description": seed.get("description", ""),
        "price": round(regular_price, 2),
        "sale_price": round(sale_price, 2) if sale_price else None,
        "sku": sku,
        "brand": seed.get("brand", ""),
        "category": category,
        "subcategory": subcategory,
        "tags": [category, subcategory or "", seed.get("brand", "").lower()],
        "fulfillment_type": seed.get("fulfillment", "warehouse"),
        "stock_quantity": int(seed.get("stock", 0)) if seed.get("fulfillment") == "warehouse" else 50,
        "images": seed.get("images", []),
        "variants": seed.get("variants", []),
        "specs": seed.get("specs", {}),
        "rating": float(seed.get("rating", 0)),
        "review_count": int(seed.get("review_count", 0)),
        "featured": False,
        "created_at": now,
        "updated_at": now,
    }


async def main() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Ensure indexes
    await db.users.create_index("email", unique=True)
    await db.products.create_index("id", unique=True)
    await db.products.create_index("category")

    # Wipe products seeded by us (prefix AM-)
    deleted = await db.products.delete_many({"sku": {"$regex": "^AM-"}})
    print(f"Removed {deleted.deleted_count} existing seeded products")

    docs = [transform(p, i) for i, p in enumerate(PRODUCTS_SEED + EXTRA_PRODUCTS, start=1)]
    # Mark top 18 by rating as featured
    sorted_docs = sorted(docs, key=lambda d: (d["rating"], d["review_count"]), reverse=True)
    featured_ids = {d["id"] for d in sorted_docs[:18]}
    for d in docs:
        if d["id"] in featured_ids:
            d["featured"] = True

    if docs:
        await db.products.insert_many(docs)
    print(f"Inserted {len(docs)} products ({sum(1 for d in docs if d['featured'])} featured)")

    # Seed demo customer (idempotent)
    demo_email = "user@demo.com"
    demo_password = "User@123"
    existing = await db.users.find_one({"email": demo_email})
    if not existing:
        await db.users.insert_one(
            {
                "id": uuid.uuid4().hex,
                "email": demo_email,
                "name": "Demo Customer",
                "password_hash": hash_password(demo_password),
                "role": "customer",
                "created_at": datetime.now(timezone.utc).isoformat(),
            }
        )
        print(f"Seeded demo user {demo_email}")
    else:
        print(f"Demo user {demo_email} already exists")

    # Ensure admin exists (startup hook seeds it, but do it here too for safety)
    admin_email = os.environ.get("ADMIN_EMAIL", "").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "")
    if admin_email and admin_password:
        existing_admin = await db.users.find_one({"email": admin_email})
        if not existing_admin:
            await db.users.insert_one(
                {
                    "id": uuid.uuid4().hex,
                    "email": admin_email,
                    "name": "Admin",
                    "password_hash": hash_password(admin_password),
                    "role": "admin",
                    "created_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            print(f"Seeded admin user {admin_email}")
        else:
            print(f"Admin user {admin_email} already exists")

    counts_by_cat = {}
    for d in docs:
        counts_by_cat[d["category"]] = counts_by_cat.get(d["category"], 0) + 1
    print("Products per category:", counts_by_cat)

    client.close()


if __name__ == "__main__":
    asyncio.run(main())

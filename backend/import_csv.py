"""Import products from two external CSV exports (Shopify + WooCommerce).

Idempotent: removes existing IMP- prefixed products before re-inserting.

Usage:
    cd /app/backend && python import_csv.py [csv1_path] [csv2_path]

Defaults to /tmp/p1.csv and /tmp/p2.csv when run without args.
"""
from __future__ import annotations

import asyncio
import csv
import os
import re
import sys
import uuid
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")
sys.path.insert(0, str(ROOT))

from motor.motor_asyncio import AsyncIOMotorClient  # noqa: E402


# ----- Placeholder images for CSV2 (WooCommerce) products lacking image URLs -----
PLACEHOLDER_IMAGES = {
    "shoes": [
        "https://images.unsplash.com/photo-1518002171953-a080ee817e1f?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1543508282-6319a3e2621f?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1587563871167-1ee9c731aefb?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1608231387042-66d1773070a5?crop=entropy&cs=srgb&fm=jpg&q=85",
    ],
    "streetwear": [
        "https://images.unsplash.com/photo-1635650804263-1a1941e14df5?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1557130680-0f816eef4743?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1635650804483-2a77a8c9e728?crop=entropy&cs=srgb&fm=jpg&q=85",
    ],
    "apparel": [
        "https://images.unsplash.com/photo-1638604587609-fbb8469f4234?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1665501434820-50e45aeebfac?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1537274942065-eda9d00a6293?crop=entropy&cs=srgb&fm=jpg&q=85",
        "https://images.unsplash.com/photo-1566070143588-2f788cb17d6c?crop=entropy&cs=srgb&fm=jpg&q=85",
    ],
}


def slugify(text: str) -> str:
    text = re.sub(r"[^a-zA-Z0-9\s-]", "", text or "").strip().lower()
    return re.sub(r"[\s_-]+", "-", text)[:60]


def strip_html(html: str) -> str:
    if not html:
        return ""
    txt = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    txt = re.sub(r"</p>", "\n\n", txt, flags=re.I)
    txt = re.sub(r"<[^>]+>", "", txt)
    txt = unescape(txt)
    txt = re.sub(r"\n{3,}", "\n\n", txt).strip()
    return txt[:2000]


def title_from_slug(slug: str) -> str:
    parts = re.split(r"[-_]+", slug.strip())
    # Drop trailing meta like "in-size-14-womens-dresses-at-anthropologie"
    drop_after = {"in", "at", "by"}
    cleaned: list[str] = []
    for p in parts:
        if not p:
            continue
        if p.lower() in drop_after and cleaned:
            break
        cleaned.append(p)
    return " ".join(w.capitalize() for w in cleaned[:6])


def pick_subcategory(category_path: str, title: str) -> str | None:
    text = f"{category_path} {title}".lower()
    if "sneaker" in text or "shoe" in text:
        return "shoes"
    if "men" in text and "women" not in text:
        return "mens"
    if "women" in text:
        return "womens"
    if "accessor" in text or "belt" in text or "hat" in text or "sunglass" in text:
        return "accessories"
    return None


def pick_placeholder(subcategory: str | None, idx: int) -> list[str]:
    if subcategory == "shoes":
        bucket = PLACEHOLDER_IMAGES["shoes"]
    elif idx % 2 == 0:
        bucket = PLACEHOLDER_IMAGES["streetwear"]
    else:
        bucket = PLACEHOLDER_IMAGES["apparel"]
    # Return 2 deterministic images per product
    n = len(bucket)
    return [bucket[idx % n], bucket[(idx + 1) % n]]


# -------------------------- CSV1: Shopify --------------------------

def parse_shopify_csv(path: Path) -> list[dict[str, Any]]:
    """Group Shopify CSV rows by Handle into product dicts."""
    with path.open() as f:
        rows = list(csv.DictReader(f))
    return parse_shopify_csv_rows(rows)


def parse_shopify_csv_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:
    """Same as parse_shopify_csv but takes already-parsed rows (for in-memory upload)."""

    by_handle: dict[str, list[dict[str, str]]] = {}
    for r in rows:
        h = (r.get("Handle") or "").strip()
        if not h:
            continue
        by_handle.setdefault(h, []).append(r)

    products: list[dict[str, Any]] = []
    for handle, group in by_handle.items():
        first = group[0]
        title = (first.get("Title") or "").strip() or title_from_slug(handle)
        description = strip_html(first.get("Body (HTML)") or "")
        brand = (first.get("Vendor") or "").strip()
        tags = [t.strip().lower() for t in (first.get("Tags") or "").split(",") if t.strip()]

        # Variant rows (rows with a Variant Price)
        variant_rows = [r for r in group if (r.get("Variant Price") or "").strip()]
        if not variant_rows:
            variant_rows = group[:1]

        first_variant = variant_rows[0]
        try:
            price = float(first_variant.get("Variant Price") or 0)
        except ValueError:
            price = 0.0
        try:
            compare_at = float(first_variant.get("Variant Compare At Price") or 0)
        except ValueError:
            compare_at = 0.0
        if compare_at and compare_at > price:
            regular_price, sale_price = compare_at, price
        else:
            regular_price, sale_price = price, None

        # Build variants from Option1/2/3
        option_values: dict[str, set[str]] = {}
        for vr in variant_rows:
            for n in ("1", "2", "3"):
                name = (vr.get(f"Option{n} Name") or "").strip()
                value = (vr.get(f"Option{n} Value") or "").strip()
                if name and name.lower() != "title" and value and value.lower() != "default title":
                    option_values.setdefault(name, set()).add(value)
        variants = [
            {"name": k, "options": sorted(v)} for k, v in option_values.items() if v
        ]

        # Images: collect unique Image Src from all rows
        seen, images = set(), []
        for r in group:
            src = (r.get("Image Src") or "").strip()
            if src and src not in seen:
                seen.add(src)
                images.append(src)

        # Stock: sum across variants
        stock = 0
        for vr in variant_rows:
            try:
                stock += int(vr.get("Variant Inventory Qty") or 0)
            except ValueError:
                pass
        if stock == 0:
            stock = 25  # safe default for unmanaged stock

        product_category = (first.get("Product Category") or "").lower()
        prod_type = (first.get("Type") or "").lower()
        subcategory = pick_subcategory(product_category + " " + prod_type, title)

        products.append({
            "title": title,
            "description": description,
            "price": round(regular_price, 2),
            "sale_price": round(sale_price, 2) if sale_price else None,
            "brand": brand,
            "category": "fashion",
            "subcategory": subcategory,
            "tags": list({*tags, "fashion", brand.lower()} - {""}),
            "stock_quantity": stock,
            "images": images,
            "variants": variants,
            "specs": {},
            "source": "shopify",
            "slug": handle,
            "sku": (first_variant.get("Variant SKU") or "").strip(),
        })
    return products


# -------------------------- CSV2: WooCommerce --------------------------

def parse_woocommerce_csv(path: Path) -> list[dict[str, Any]]:
    with path.open() as f:
        rows = list(csv.DictReader(f))
    return parse_woocommerce_csv_rows(rows)


def parse_woocommerce_csv_rows(rows: list[dict[str, str]]) -> list[dict[str, Any]]:

    products: list[dict[str, Any]] = []
    for r in rows:
        slug = (r.get("Slug") or "").strip()
        if not slug:
            continue  # not a real product row

        title = title_from_slug(slug)
        description = strip_html(r.get("Content") or r.get("Short Description") or "")
        try:
            regular = float((r.get("Regular Price") or r.get("Price") or "0").strip() or 0)
        except ValueError:
            regular = 0.0
        try:
            sale = float((r.get("Sale Price") or "").strip() or 0)
        except ValueError:
            sale = 0.0
        price = regular if regular else (sale or 0.0)
        sale_price = sale if sale and regular and sale < regular else None

        brand = (r.get("Categories Brand") or "").strip()
        category_path = (r.get("Product categories") or "").replace("|", " ")
        subcategory = pick_subcategory(category_path, title)
        tags = [
            t.strip().lower()
            for t in (r.get("Product tags") or "").replace("|", ",").split(",")
            if t.strip()
        ]

        # Build variants from attribute columns
        option_values: dict[str, set[str]] = {}
        for col in r.keys():
            m = re.match(r"^Attribute Name \((.+)\)$", col)
            if not m:
                continue
            key = m.group(1)
            name = (r.get(col) or "").strip()
            value_col = f"Attribute Value ({key})"
            in_var = (r.get(f"Attribute In Variations ({key})") or "").strip().lower()
            value = (r.get(value_col) or "").strip()
            if name and value and in_var == "yes":
                opts = {v.strip() for v in value.split("|") if v.strip()}
                if opts:
                    option_values.setdefault(name, set()).update(opts)
        variants = [
            {"name": k, "options": sorted(v)} for k, v in option_values.items()
        ]

        stock_qty = 0
        try:
            stock_qty = int((r.get("Stock") or "").strip() or 0)
        except ValueError:
            stock_qty = 0
        if stock_qty == 0:
            stock_qty = 20 if (r.get("Stock Status") or "instock").lower() == "instock" else 0

        products.append({
            "title": title,
            "description": description or f"{title} — imported from legacy catalog.",
            "price": round(price, 2),
            "sale_price": round(sale_price, 2) if sale_price else None,
            "brand": brand,
            "category": "fashion",
            "subcategory": subcategory,
            "tags": list({*tags, "fashion", brand.lower()} - {""}),
            "stock_quantity": stock_qty,
            "images": [],  # filled below with placeholder
            "variants": variants,
            "specs": {},
            "source": "woocommerce",
            "slug": slug,
            "sku": (r.get("Sku") or "").strip(),
        })
    return products


# -------------------------- Build Product docs --------------------------

def to_product_doc(p: dict[str, Any], idx: int, prefix: str = "IMP") -> dict[str, Any]:
    if not p["images"]:
        p["images"] = pick_placeholder(p.get("subcategory"), idx)
    sku = p.get("sku") or ""
    if not sku:
        sku = f"{prefix}-{idx:03d}"
    elif not sku.upper().startswith(f"{prefix}-"):
        sku = f"{prefix}-{idx:03d}-{sku}"
    now = datetime.now(timezone.utc).isoformat()
    return {
        "id": uuid.uuid4().hex,
        "title": p["title"][:200] or f"Imported Product {idx}",
        "description": p["description"],
        "price": p["price"] if p["price"] > 0 else 19.99,
        "sale_price": p["sale_price"],
        "sku": sku[:80],
        "brand": p["brand"][:80],
        "category": p["category"],
        "subcategory": p["subcategory"],
        "tags": [t for t in p["tags"] if t][:8],
        "fulfillment_type": "warehouse",
        "stock_quantity": p["stock_quantity"],
        "images": p["images"],
        "variants": p["variants"],
        "specs": p["specs"],
        "rating": 0.0,
        "review_count": 0,
        "featured": idx % 7 == 0,  # ~3 featured out of 20
        "created_at": now,
        "updated_at": now,
    }


async def main() -> None:
    csv1 = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("/tmp/p1.csv")
    csv2 = Path(sys.argv[2]) if len(sys.argv) > 2 else Path("/tmp/p2.csv")

    print(f"Parsing Shopify CSV: {csv1}")
    shopify = parse_shopify_csv(csv1)
    print(f"  -> {len(shopify)} products")

    print(f"Parsing WooCommerce CSV: {csv2}")
    woo = parse_woocommerce_csv(csv2)
    print(f"  -> {len(woo)} products")

    all_products = shopify + woo
    docs = [to_product_doc(p, i + 1) for i, p in enumerate(all_products)]

    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Idempotent: clear previous import
    res = await db.products.delete_many({"sku": {"$regex": "^IMP-"}})
    print(f"Removed {res.deleted_count} previously imported products")

    if docs:
        await db.products.insert_many(docs)
    total = await db.products.count_documents({})
    imported_now = await db.products.count_documents({"sku": {"$regex": "^IMP-"}})
    print(f"Inserted {len(docs)} new products. "
          f"Imported total: {imported_now}. Catalog total: {total}.")

    # Quick sample
    print("\nSample of imported titles:")
    for d in docs[:10]:
        flag = " *FEAT" if d["featured"] else ""
        sale = f" (was ${d['sku']})" if d['sale_price'] else ""  # noqa: not displayed
        print(f"  - {d['title']:50s}  ${d['price']:>7.2f}  [{d['brand'] or 'no brand'}]{flag}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())

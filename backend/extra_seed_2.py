"""Extra seed batch 2 — adds 5 automotive products and other category fillers.

Idempotent: inserts only if SKU does not already exist (so it's safe to run
multiple times without dupes).

Each product here is its own SKU and is inserted directly into the products
collection (not transformed by seed_db.transform). That allows us to:
- Add the brand-new 'automotive' category cleanly.
- Avoid re-keying existing AM-* SKUs.

Run:
    cd /app/backend && python extra_seed_2.py
"""
import asyncio
import os
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")


PRODUCTS = [
    {
        "title": "Armor All Original Protectant 16oz",
        "category": "automotive",
        "brand": "Armor All",
        "price": 8.99,
        "sale_price": None,
        "sku": "AA-PROT-16",
        "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"],
        "fulfillment_type": "dropship",
        "stock_quantity": 0,
        "featured": False,
        "description": "UV-blocking protectant for dashboards, tires, and trim.",
        "specs": {"Volume": "16 fl oz", "Application": "Interior & Exterior"},
        "rating": 4.5,
        "review_count": 218,
    },
    {
        "title": "NOCO Boost Plus GB40 1000A Jump Starter",
        "category": "automotive",
        "brand": "NOCO",
        "price": 99.95,
        "sale_price": 79.95,
        "sku": "NOCO-GB40",
        "images": ["https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?w=600"],
        "fulfillment_type": "dropship",
        "stock_quantity": 0,
        "featured": True,
        "description": "Compact 1000-amp lithium jump starter for up to 6L gas engines.",
        "specs": {"Peak Amps": "1000A", "USB": "Yes", "Weight": "2.4 lbs"},
        "rating": 4.8,
        "review_count": 1247,
    },
    {
        "title": "Chemical Guys Wash & Wax Kit 5-Piece",
        "category": "automotive",
        "brand": "Chemical Guys",
        "price": 49.99,
        "sale_price": 39.99,
        "sku": "CG-WASH-5P",
        "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"],
        "fulfillment_type": "dropship",
        "stock_quantity": 0,
        "featured": False,
        "description": "5-piece car wash and wax starter kit for a showroom shine.",
        "specs": {"Pieces": "5", "Safe for": "All paint types"},
        "rating": 4.6,
        "review_count": 412,
    },
    {
        "title": "Michelin 12V Digital Tire Inflator",
        "category": "automotive",
        "brand": "Michelin",
        "price": 34.99,
        "sale_price": None,
        "sku": "MCH-INFL-12V",
        "images": ["https://images.pexels.com/photos/3806288/pexels-photo-3806288.jpeg?w=600"],
        "fulfillment_type": "dropship",
        "stock_quantity": 0,
        "featured": False,
        "description": "Portable 12V air compressor with digital gauge and auto-shutoff.",
        "specs": {"Voltage": "12V", "Max PSI": "120", "Cord Length": "10 ft"},
        "rating": 4.4,
        "review_count": 286,
    },
    {
        "title": "Weathertech Front FloorLiner Set",
        "category": "automotive",
        "brand": "WeatherTech",
        "price": 79.95,
        "sale_price": None,
        "sku": "WT-FLOOR-F",
        "images": ["https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=600"],
        "fulfillment_type": "dropship",
        "stock_quantity": 0,
        "featured": False,
        "description": "Custom-fit front floor liners in heavy-duty thermoplastic.",
        "specs": {"Material": "Thermoplastic", "Fit": "Custom", "Color": "Black"},
        "rating": 4.7,
        "review_count": 533,
    },
    # Cross-category fillers to push catalog past 100 products
    {
        "title": "Premium Cast Iron Skillet 12-inch",
        "category": "home-garden",
        "brand": "Hearthline",
        "price": 44.95,
        "sale_price": 34.95,
        "sku": "HL-CAST-12",
        "images": ["https://images.pexels.com/photos/4226119/pexels-photo-4226119.jpeg?w=600"],
        "fulfillment_type": "warehouse",
        "stock_quantity": 120,
        "featured": False,
        "description": "Pre-seasoned cast iron skillet — built to last generations.",
        "specs": {"Diameter": "12 in", "Material": "Cast iron", "Care": "Hand wash"},
        "rating": 4.8,
        "review_count": 1844,
    },
    {
        "title": "Smart LED Light Strip 16ft",
        "category": "electronics",
        "brand": "Voltura",
        "price": 24.99,
        "sale_price": 19.99,
        "sku": "VL-LED-16",
        "images": ["https://images.pexels.com/photos/1029757/pexels-photo-1029757.jpeg?w=600"],
        "fulfillment_type": "dropship",
        "stock_quantity": 0,
        "featured": False,
        "description": "WiFi + Bluetooth smart LED strip with app control and 16M colors.",
        "specs": {"Length": "16 ft", "Voltage": "12V", "App": "Yes (iOS/Android)"},
        "rating": 4.3,
        "review_count": 622,
    },
    {
        "title": "Yoga Mat — Eco TPE 6mm",
        "category": "sports",
        "brand": "Northcross",
        "price": 39.00,
        "sale_price": None,
        "sku": "NC-YOGA-6",
        "images": ["https://images.pexels.com/photos/3490348/pexels-photo-3490348.jpeg?w=600"],
        "fulfillment_type": "warehouse",
        "stock_quantity": 95,
        "featured": False,
        "description": "Eco-friendly TPE yoga mat with double-sided non-slip texture.",
        "specs": {"Thickness": "6 mm", "Material": "TPE", "Length": "72 in"},
        "rating": 4.6,
        "review_count": 318,
    },
    {
        "title": "Stainless Steel Insulated Water Bottle 32oz",
        "category": "sports",
        "brand": "Northcross",
        "price": 22.00,
        "sale_price": 18.00,
        "sku": "NC-BOTTLE-32",
        "images": ["https://images.pexels.com/photos/1556909114-f6e7ad7d3136?w=600"],
        "fulfillment_type": "warehouse",
        "stock_quantity": 240,
        "featured": False,
        "description": "Double-wall vacuum-insulated bottle. Cold 24h, hot 12h.",
        "specs": {"Capacity": "32 oz", "Material": "Stainless steel", "BPA-free": "Yes"},
        "rating": 4.7,
        "review_count": 902,
    },
    {
        "title": "Bluetooth Portable Speaker — Mini",
        "category": "electronics",
        "brand": "Voltura",
        "price": 29.99,
        "sale_price": None,
        "sku": "VL-SPK-MINI",
        "images": ["https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?w=600"],
        "fulfillment_type": "warehouse",
        "stock_quantity": 180,
        "featured": False,
        "description": "12-hour battery, IPX7 waterproof, with built-in mic for calls.",
        "specs": {"Battery": "12h", "Waterproof": "IPX7", "Bluetooth": "5.0"},
        "rating": 4.4,
        "review_count": 488,
    },
]


async def main() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    now = datetime.now(timezone.utc).isoformat()
    inserted = 0
    skipped = 0
    for p in PRODUCTS:
        existing = await db.products.find_one({"sku": p["sku"]}, {"_id": 1})
        if existing:
            skipped += 1
            continue
        doc = {
            "id": uuid.uuid4().hex,
            "title": p["title"],
            "description": p.get("description", ""),
            "price": float(p["price"]),
            "sale_price": float(p["sale_price"]) if p.get("sale_price") else None,
            "sku": p["sku"],
            "brand": p.get("brand", ""),
            "category": p["category"],
            "subcategory": p.get("subcategory"),
            "tags": [p["category"], p.get("brand", "").lower()],
            "fulfillment_type": p.get("fulfillment_type", "warehouse"),
            "stock_quantity": int(p.get("stock_quantity", 0)),
            "images": p.get("images", []),
            "variants": p.get("variants", []),
            "specs": p.get("specs", {}),
            "rating": float(p.get("rating", 0)),
            "review_count": int(p.get("review_count", 0)),
            "featured": bool(p.get("featured", False)),
            "created_at": now,
            "updated_at": now,
        }
        await db.products.insert_one(doc)
        inserted += 1

    print(f"Inserted {inserted} new products, skipped {skipped} (already exist).")

    # Confirm counts
    automotive_count = await db.products.count_documents({"category": "automotive"})
    total = await db.products.count_documents({})
    print(f"Automotive category: {automotive_count} products")
    print(f"Total products in catalog: {total}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())

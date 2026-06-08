"""Seed a curated set of digital products + restore Adjustable Dumbbells to warehouse.

Run:
    cd /app/backend && python seed_digital_products.py
Idempotent: upserts by SKU. Safe to re-run.
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

NOW = datetime.now(timezone.utc).isoformat()

DIGITAL_PRODUCTS = [
    {
        "sku": "AM-DIG-001-LIGHTROOM-CINEMATIC",
        "title": "Cinematic Lightroom Preset Pack",
        "description": "30 hand-crafted Lightroom presets for moody, cinematic photography. Works on desktop, mobile, and Lightroom Classic. Delivered as .xmp + .dng files in a zip.",
        "price": 39.00,
        "sale_price": 24.00,
        "brand": "AbundantStudio",
        "category": "electronics",
        "subcategory": "digital",
        "tags": ["digital", "presets", "lightroom", "photography"],
        "fulfillment_type": "digital",
        "stock_quantity": 0,
        "reorder_point": 10,
        "download_url": "https://files.abundant.example/AM-DIG-001-cinematic-presets.zip",
        "images": [
            "https://images.unsplash.com/photo-1542038784456-1ea8e935640e?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1500051638674-ff996a0ec29e?auto=format&fit=crop&w=900&q=80",
        ],
        "specs": {"Files": "30 .xmp + 30 .dng", "Compatible": "Lightroom CC, Classic, Mobile", "License": "Personal use"},
        "rating": 4.9,
        "review_count": 412,
        "featured": True,
    },
    {
        "sku": "AM-DIG-002-PRODUCTIVITY-EBOOK",
        "title": "Deep Work Field Notes — eBook + Workbook",
        "description": "A 180-page workbook on building a deep-work practice, with templates, daily prompts, and a Notion companion. Delivered as PDF + Notion duplicate link.",
        "price": 29.00,
        "sale_price": 19.00,
        "brand": "AbundantPress",
        "category": "office",
        "subcategory": "digital",
        "tags": ["digital", "ebook", "productivity"],
        "fulfillment_type": "digital",
        "stock_quantity": 0,
        "reorder_point": 10,
        "download_url": "https://files.abundant.example/AM-DIG-002-deepwork.pdf",
        "images": [
            "https://images.unsplash.com/photo-1553729784-e91953dec042?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1499951360447-b19be8fe80f5?auto=format&fit=crop&w=900&q=80",
        ],
        "specs": {"Format": "PDF + Notion duplicate", "Pages": "180", "License": "Personal use"},
        "rating": 4.8,
        "review_count": 267,
        "featured": True,
    },
    {
        "sku": "AM-DIG-003-FONT-DUO-MONARCH",
        "title": "Monarch — Display + Mono Font Duo",
        "description": "A two-weight display serif paired with a clean grotesque mono. Perfect for portfolios, editorials, and modern UI. OTF + WOFF2 included.",
        "price": 79.00,
        "sale_price": None,
        "brand": "Forgewood",
        "category": "office",
        "subcategory": "digital",
        "tags": ["digital", "fonts", "typography", "design"],
        "fulfillment_type": "digital",
        "stock_quantity": 0,
        "reorder_point": 10,
        "download_url": "https://files.abundant.example/AM-DIG-003-monarch.zip",
        "images": [
            "https://images.unsplash.com/photo-1561070791-2526d30994b8?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1626785774573-4b799315345d?auto=format&fit=crop&w=900&q=80",
        ],
        "specs": {"Files": "OTF, WOFF2", "Weights": "2 display + 1 mono", "License": "1-seat desktop + web"},
        "rating": 4.7,
        "review_count": 158,
        "featured": False,
    },
    {
        "sku": "AM-DIG-004-LOFI-AMBIENT-PACK",
        "title": "Lo-Fi Ambient Sample Pack — Vol. 2",
        "description": "240 royalty-free loops, one-shots, and stems for lo-fi, ambient, and downtempo producers. 24-bit WAV + Ableton drum rack included.",
        "price": 49.00,
        "sale_price": 34.00,
        "brand": "Voltura",
        "category": "electronics",
        "subcategory": "digital",
        "tags": ["digital", "music", "sample-pack", "lofi"],
        "fulfillment_type": "digital",
        "stock_quantity": 0,
        "reorder_point": 10,
        "download_url": "https://files.abundant.example/AM-DIG-004-lofi-pack.zip",
        "images": [
            "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?auto=format&fit=crop&w=900&q=80",
        ],
        "specs": {"Files": "240 × 24-bit WAV", "BPM": "60-90", "License": "Royalty-free, commercial"},
        "rating": 4.9,
        "review_count": 89,
        "featured": False,
    },
    {
        "sku": "AM-DIG-005-NOTION-TEMPLATE",
        "title": "Founder OS — Notion Template",
        "description": "The Notion workspace early-stage founders use to plan quarterly OKRs, run weekly reviews, and keep investor updates tidy. One-click duplicate link.",
        "price": 59.00,
        "sale_price": 39.00,
        "brand": "AbundantStudio",
        "category": "office",
        "subcategory": "digital",
        "tags": ["digital", "notion", "templates", "productivity"],
        "fulfillment_type": "digital",
        "stock_quantity": 0,
        "reorder_point": 10,
        "download_url": "https://files.abundant.example/AM-DIG-005-founderos.txt",
        "images": [
            "https://images.unsplash.com/photo-1481487196290-c152efe083f5?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=900&q=80",
        ],
        "specs": {"Format": "Notion duplicate link", "Pages": "40+ pre-built", "License": "Personal use"},
        "rating": 4.8,
        "review_count": 312,
        "featured": True,
    },
]


async def main() -> None:
    client = AsyncIOMotorClient(os.environ["MONGO_URL"])
    db = client[os.environ["DB_NAME"]]

    # Restore Adjustable Dumbbells to warehouse (it was demo-converted to digital earlier)
    res = await db.products.update_one(
        {"sku": "AM-SPO-091-ADJUSTABLE-DUMBBELLS"},
        {"$set": {"fulfillment_type": "warehouse", "stock_quantity": 35, "download_url": ""}},
    )
    print(f"Reverted Adjustable Dumbbells: matched={res.matched_count}")

    upserts = 0
    for p in DIGITAL_PRODUCTS:
        existing = await db.products.find_one({"sku": p["sku"]}, {"_id": 0, "id": 1})
        doc = {**p, "updated_at": NOW}
        if existing:
            doc["id"] = existing["id"]
            await db.products.update_one({"sku": p["sku"]}, {"$set": doc})
        else:
            doc["id"] = str(uuid.uuid4())
            doc["created_at"] = NOW
            await db.products.insert_one(doc)
        upserts += 1
    print(f"Upserted {upserts} digital products")

    digital_count = await db.products.count_documents({"fulfillment_type": "digital"})
    print(f"Total digital products now: {digital_count}")
    client.close()


if __name__ == "__main__":
    asyncio.run(main())

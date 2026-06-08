"""Phase 5A — Fulfillment migration.

Ensures every product has a non-null `fulfillment_type` and assigns the catalog
into a random ~50/50 split between `warehouse` and `dropship` (per user choice
for this iteration). Also seeds `reorder_point` on warehouse products.

Idempotent: re-running re-randomises the split. Use with care in production.

Run:
    cd /app/backend && python migrate_fulfillment.py
"""
import asyncio
import os
import random
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT = Path(__file__).parent
load_dotenv(ROOT / ".env")


async def main() -> None:
    mongo_url = os.environ["MONGO_URL"]
    db_name = os.environ["DB_NAME"]
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]

    # Step 1 — backfill any null/missing fulfillment_type → "warehouse"
    backfill = await db.products.update_many(
        {"$or": [{"fulfillment_type": None}, {"fulfillment_type": {"$exists": False}}]},
        {"$set": {"fulfillment_type": "warehouse"}},
    )
    print(f"Backfilled fulfillment_type on {backfill.modified_count} products")

    # Step 2 — random 50/50 split across the entire (non-digital) catalog
    ids = [d["id"] async for d in db.products.find(
        {"fulfillment_type": {"$ne": "digital"}}, {"_id": 0, "id": 1}
    )]
    random.shuffle(ids)
    half = len(ids) // 2
    warehouse_ids = ids[:half]
    dropship_ids = ids[half:]

    if warehouse_ids:
        await db.products.update_many(
            {"id": {"$in": warehouse_ids}},
            {"$set": {"fulfillment_type": "warehouse"}},
        )
    if dropship_ids:
        await db.products.update_many(
            {"id": {"$in": dropship_ids}},
            {"$set": {"fulfillment_type": "dropship"}},
        )

    # Step 3 — ensure reorder_point exists on every product (default 10)
    seed_reorder = await db.products.update_many(
        {"reorder_point": {"$exists": False}},
        {"$set": {"reorder_point": 10}},
    )
    print(f"Seeded reorder_point on {seed_reorder.modified_count} products")

    # Step 4 — dropship products carry supplier-managed stock. We zero out their
    # `stock_quantity` so the storefront UI reflects the real source of truth.
    if dropship_ids:
        await db.products.update_many(
            {"id": {"$in": dropship_ids}},
            {"$set": {"stock_quantity": 0}},
        )

    # Step 5 — warehouse products that ended up with 0 stock get a sensible
    # starting quantity so the low-stock alert demo is meaningful.
    if warehouse_ids:
        async for p in db.products.find(
            {"id": {"$in": warehouse_ids}, "stock_quantity": {"$lte": 0}},
            {"_id": 0, "id": 1},
        ):
            await db.products.update_one(
                {"id": p["id"]},
                {"$set": {"stock_quantity": random.randint(3, 80)}},
            )

    # Report
    w = await db.products.count_documents({"fulfillment_type": "warehouse"})
    d = await db.products.count_documents({"fulfillment_type": "dropship"})
    g = await db.products.count_documents({"fulfillment_type": "digital"})
    print(f"Result — warehouse: {w}, dropship: {d}, digital: {g}")

    client.close()


if __name__ == "__main__":
    asyncio.run(main())

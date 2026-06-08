"""Phase 5 — Fulfillment Architecture backend tests."""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/") if os.environ.get("REACT_APP_BACKEND_URL") else None
# Fall back to reading frontend .env
if not BASE_URL:
    fe_env = Path(__file__).parent.parent.parent / "frontend" / ".env"
    for line in fe_env.read_text().splitlines():
        if line.startswith("REACT_APP_BACKEND_URL="):
            BASE_URL = line.split("=", 1)[1].strip().rstrip("/")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]

ADMIN_EMAIL = "admin@abundant.com"
ADMIN_PASSWORD = "Admin@2026"
USER_EMAIL = "user@demo.com"
USER_PASSWORD = "User@123"


# ----------------------------- Fixtures -----------------------------
@pytest.fixture(scope="session")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    tok = r.json().get("access_token")
    assert tok
    return tok


@pytest.fixture(scope="session")
def user_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": USER_EMAIL, "password": USER_PASSWORD})
    if r.status_code != 200:
        pytest.skip("demo user login failed")
    return r.json().get("access_token")


@pytest.fixture(scope="session")
def admin_headers(admin_token):
    return {"Authorization": f"Bearer {admin_token}"}


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


# ----------------------------- Phase 5A — Migration durability -----------------------------
class TestMigration:
    def test_all_products_have_fulfillment_type(self, mongo_db):
        missing = mongo_db.products.count_documents(
            {"$or": [{"fulfillment_type": None}, {"fulfillment_type": {"$exists": False}}]}
        )
        assert missing == 0, f"{missing} products missing fulfillment_type"

    def test_all_products_have_reorder_point(self, mongo_db):
        missing = mongo_db.products.count_documents({"reorder_point": {"$exists": False}})
        assert missing == 0, f"{missing} products missing reorder_point"

    def test_split_close_to_50_50(self, mongo_db):
        w = mongo_db.products.count_documents({"fulfillment_type": "warehouse"})
        d = mongo_db.products.count_documents({"fulfillment_type": "dropship"})
        total = w + d
        assert total > 0
        ratio = w / total
        assert 0.30 <= ratio <= 0.70, f"warehouse ratio {ratio} not near 50/50 ({w}/{d})"
        print(f"warehouse={w}, dropship={d}")

    def test_dropship_stock_is_zero(self, mongo_db):
        nonzero = mongo_db.products.count_documents(
            {"fulfillment_type": "dropship", "stock_quantity": {"$gt": 0}}
        )
        assert nonzero == 0, f"{nonzero} dropship products have non-zero stock"

    def test_products_endpoint_reachable(self):
        r = requests.get(f"{BASE_URL}/api/products?page_size=1")
        assert r.status_code == 200
        assert "total" in r.json()


# ----------------------------- Phase 5B — ProductUpdate accepts new fields -----------------------------
class TestProductUpdate:
    @pytest.fixture(scope="class")
    def warehouse_product_id(self, mongo_db):
        p = mongo_db.products.find_one({"fulfillment_type": "warehouse"}, {"_id": 0, "id": 1})
        assert p
        return p["id"]

    def test_update_reorder_point(self, admin_headers, warehouse_product_id):
        r = requests.put(
            f"{BASE_URL}/api/admin/products/{warehouse_product_id}",
            json={"reorder_point": 25},
            headers=admin_headers,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("reorder_point") == 25
        # GET-verify persistence
        g = requests.get(f"{BASE_URL}/api/products/{warehouse_product_id}")
        assert g.status_code == 200
        assert g.json().get("reorder_point") == 25

    def test_update_digital_with_download_url(self, admin_headers, warehouse_product_id, mongo_db):
        url = "https://example.com/dl"
        r = requests.put(
            f"{BASE_URL}/api/admin/products/{warehouse_product_id}",
            json={"fulfillment_type": "digital", "download_url": url},
            headers=admin_headers,
        )
        assert r.status_code == 200, r.text
        body = r.json()
        assert body.get("fulfillment_type") == "digital"
        assert body.get("download_url") == url
        # Reset back to warehouse to not pollute other tests
        requests.put(
            f"{BASE_URL}/api/admin/products/{warehouse_product_id}",
            json={"fulfillment_type": "warehouse", "download_url": ""},
            headers=admin_headers,
        )


# ----------------------------- Phase 5C — Low stock endpoint -----------------------------
class TestLowStock:
    def test_requires_auth(self):
        r = requests.get(f"{BASE_URL}/api/admin/inventory/low-stock")
        assert r.status_code in (401, 403)

    def test_forbidden_for_customer(self, user_token):
        r = requests.get(
            f"{BASE_URL}/api/admin/inventory/low-stock",
            headers={"Authorization": f"Bearer {user_token}"},
        )
        assert r.status_code in (401, 403)

    def test_low_stock_shape_and_force_inclusion(self, admin_headers, mongo_db):
        # Pick a warehouse product and force it into low-stock state
        p = mongo_db.products.find_one({"fulfillment_type": "warehouse"}, {"_id": 0, "id": 1})
        assert p
        pid = p["id"]
        r = requests.put(
            f"{BASE_URL}/api/admin/products/{pid}",
            json={"stock_quantity": 2, "reorder_point": 10, "fulfillment_type": "warehouse"},
            headers=admin_headers,
        )
        assert r.status_code == 200, r.text

        ls = requests.get(f"{BASE_URL}/api/admin/inventory/low-stock", headers=admin_headers)
        assert ls.status_code == 200, ls.text
        data = ls.json()
        assert set(["count", "items", "threshold_default"]).issubset(data.keys())
        assert data["threshold_default"] == 10
        assert isinstance(data["items"], list)
        assert data["count"] == len(data["items"])
        ids = [it["id"] for it in data["items"]]
        assert pid in ids, "forced low-stock product missing from results"
        # Validate item fields
        item = next(it for it in data["items"] if it["id"] == pid)
        for key in ("id", "sku", "title", "brand", "category",
                    "stock_quantity", "reorder_point", "image"):
            assert key in item, f"missing key {key}"
        assert item["stock_quantity"] == 2
        # Verify ascending sort
        stocks = [it["stock_quantity"] for it in data["items"]]
        assert stocks == sorted(stocks), "items not sorted ascending"


# ----------------------------- Phase 5D — Order has_warehouse / has_dropship -----------------------------
class TestOrderFlags:
    def test_synthetic_legacy_order_backfill(self, admin_headers, mongo_db):
        """Insert legacy-style order (no flags) and verify admin list backfills them."""
        order_num = f"AM-TEST-{uuid.uuid4().hex[:6].upper()}"
        legacy_doc = {
            "id": str(uuid.uuid4()),
            "order_number": order_num,
            "user_id": None,
            "email": "legacy@test.com",
            "items": [
                {"product_id": "p1", "title": "Wh Item", "image": "", "unit_price": 10.0,
                 "qty": 1, "variants": {}, "fulfillment_type": "warehouse"},
                {"product_id": "p2", "title": "Ds Item", "image": "", "unit_price": 5.0,
                 "qty": 2, "variants": {}, "fulfillment_type": "dropship"},
            ],
            "subtotal": 20.0, "shipping_cost": 0.0, "tax": 0.0, "total": 20.0,
            "shipping_method": "standard",
            "shipping_address": {
                "email": "legacy@test.com", "first_name": "L", "last_name": "T",
                "address1": "1 St", "city": "Town", "state": "CA", "zip": "00000",
                "country": "United States",
            },
            "status": "paid", "payment_status": "paid",
            "stripe_session_id": None,
            "status_history": [],
            "created_at": "2024-01-01T00:00:00+00:00",
            "updated_at": "2024-01-01T00:00:00+00:00",
        }
        mongo_db.orders.insert_one(dict(legacy_doc))
        try:
            r = requests.get(f"{BASE_URL}/api/admin/orders?page_size=100", headers=admin_headers)
            assert r.status_code == 200, r.text
            body = r.json()
            items = body.get("items", body) if isinstance(body, dict) else body
            target = next((o for o in items if o.get("order_number") == order_num), None)
            assert target is not None, f"legacy order {order_num} not found in admin list"
            assert target.get("has_warehouse") is True
            assert target.get("has_dropship") is True
        finally:
            mongo_db.orders.delete_one({"order_number": order_num})

    def test_synthetic_all_warehouse_order_flags(self, admin_headers, mongo_db):
        order_num = f"AM-TEST-{uuid.uuid4().hex[:6].upper()}"
        doc = {
            "id": str(uuid.uuid4()),
            "order_number": order_num,
            "user_id": None,
            "email": "wh@test.com",
            "items": [
                {"product_id": "p1", "title": "Wh A", "image": "", "unit_price": 10.0,
                 "qty": 1, "variants": {}, "fulfillment_type": "warehouse"},
                {"product_id": "p2", "title": "Wh B", "image": "", "unit_price": 5.0,
                 "qty": 1, "variants": {}, "fulfillment_type": "warehouse"},
            ],
            "subtotal": 15.0, "shipping_cost": 0.0, "tax": 0.0, "total": 15.0,
            "shipping_method": "standard",
            "shipping_address": {
                "email": "wh@test.com", "first_name": "W", "last_name": "T",
                "address1": "1 St", "city": "Town", "state": "CA", "zip": "00000",
                "country": "United States",
            },
            "status": "paid", "payment_status": "paid",
            "stripe_session_id": None,
            "status_history": [],
            "created_at": "2024-01-01T00:00:00+00:00",
            "updated_at": "2024-01-01T00:00:00+00:00",
        }
        mongo_db.orders.insert_one(dict(doc))
        try:
            r = requests.get(f"{BASE_URL}/api/admin/orders?page_size=100", headers=admin_headers)
            assert r.status_code == 200
            items = r.json().get("items", []) if isinstance(r.json(), dict) else r.json()
            target = next((o for o in items if o.get("order_number") == order_num), None)
            assert target is not None
            assert target.get("has_warehouse") is True
            assert target.get("has_dropship") is False
        finally:
            mongo_db.orders.delete_one({"order_number": order_num})

    def test_checkout_session_sets_flags(self, admin_headers, mongo_db):
        """Phase 5D — checkout creates an order with flags set from item fulfillment_type.
        If Stripe is unavailable, allow skip but ensure failure isn't silent."""
        wh = mongo_db.products.find_one({"fulfillment_type": "warehouse"}, {"_id": 0, "id": 1})
        ds = mongo_db.products.find_one({"fulfillment_type": "dropship"}, {"_id": 0, "id": 1})
        if not (wh and ds):
            pytest.skip("need at least one warehouse + one dropship product")
        payload = {
            "items": [
                {"product_id": wh["id"], "qty": 1},
                {"product_id": ds["id"], "qty": 1},
            ],
            "shipping_address": {
                "email": "buyer@test.com", "first_name": "B", "last_name": "Y",
                "address1": "1 St", "city": "Town", "state": "CA", "zip": "00000",
                "country": "United States",
            },
            "shipping_method": "standard",
            "origin_url": "https://example.com",
        }
        r = requests.post(f"{BASE_URL}/api/checkout/session", json=payload)
        if r.status_code >= 500:
            pytest.skip(f"checkout 500 (likely missing STRIPE_API_KEY): {r.text[:200]}")
        assert r.status_code == 200, r.text
        order_id = r.json().get("order_id")
        assert order_id
        doc = mongo_db.orders.find_one({"id": order_id}, {"_id": 0})
        assert doc is not None
        assert doc.get("has_warehouse") is True
        assert doc.get("has_dropship") is True
        mongo_db.orders.delete_one({"id": order_id})

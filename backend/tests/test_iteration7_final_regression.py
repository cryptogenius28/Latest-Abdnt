"""Iteration 7 — Final pre-deployment regression suite for Abundant Merchandise.

Covers:
 - Catalog count (106) and fulfillment_type mix
 - Reorder point persistence (already covered by phase5 suite — light check)
 - Admin low-stock endpoint shape + auth
 - Admin orders backfill (light check)
 - Restock alerts: POST /api/restock-alerts (public, idempotent, validation)
 - GET /api/admin/restock-alerts (admin)
 - POST /api/admin/restock-alerts/run (admin)
 - fulfillment_type filter + sort=rating, sort=popular
"""
import os
import uuid
import pytest
import requests
from pymongo import MongoClient
from dotenv import load_dotenv
from pathlib import Path

load_dotenv(Path(__file__).parent.parent / ".env")

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
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

# Known OOS warehouse product
OOS_WAREHOUSE_PRODUCT_ID = "a1564e0609184308b975fa7b1427f449"


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
def user_headers(user_token):
    return {"Authorization": f"Bearer {user_token}"}


@pytest.fixture(scope="session")
def mongo_db():
    client = MongoClient(MONGO_URL)
    yield client[DB_NAME]
    client.close()


# ----------------------------- Catalog -----------------------------
class TestCatalog:
    def test_total_count_is_106(self):
        # Use a single page; rely on `total` field of ProductListResponse
        r = requests.get(f"{BASE_URL}/api/products", params={"page_size": 1})
        assert r.status_code == 200
        data = r.json()
        assert "total" in data
        assert data["total"] == 106, f"expected 106 products, got {data['total']}"

    def test_fulfillment_mix(self, mongo_db):
        counts = {}
        for ft in ("warehouse", "dropship", "digital"):
            counts[ft] = mongo_db.products.count_documents({"fulfillment_type": ft})
        # 50 warehouse + 51 dropship + 5 digital per task context
        assert counts["warehouse"] == 50, f"warehouse mix off: {counts}"
        assert counts["dropship"] == 51, f"dropship mix off: {counts}"
        assert counts["digital"] == 5, f"digital mix off: {counts}"

    def test_every_product_has_fulfillment_and_reorder_point(self, mongo_db):
        bad = list(mongo_db.products.find(
            {"$or": [
                {"fulfillment_type": {"$nin": ["warehouse", "dropship", "digital"]}},
                {"reorder_point": {"$exists": False}},
            ]},
            {"_id": 0, "id": 1, "title": 1, "fulfillment_type": 1, "reorder_point": 1},
        ).limit(5))
        assert not bad, f"products missing fulfillment_type or reorder_point: {bad}"

    def test_fulfillment_filter_and_sort_rating(self):
        r = requests.get(f"{BASE_URL}/api/products",
                         params={"fulfillment_type": "warehouse", "sort": "rating", "page_size": 8})
        assert r.status_code == 200
        items = r.json().get("items", [])
        assert len(items) == 8
        # All warehouse
        assert all(i.get("fulfillment_type") == "warehouse" for i in items)
        # Sorted by rating desc
        ratings = [i.get("rating") or 0 for i in items]
        assert ratings == sorted(ratings, reverse=True), f"not sorted by rating desc: {ratings}"

    def test_sort_popular(self):
        r = requests.get(f"{BASE_URL}/api/products",
                         params={"sort": "popular", "page_size": 8})
        assert r.status_code == 200
        assert len(r.json().get("items", [])) == 8

    def test_digital_filter_returns_five(self):
        r = requests.get(f"{BASE_URL}/api/products",
                         params={"fulfillment_type": "digital", "page_size": 20})
        assert r.status_code == 200
        items = r.json().get("items", [])
        assert len(items) == 5
        assert all(i.get("fulfillment_type") == "digital" for i in items)
        titles = [i["title"] for i in items]
        # Titles may carry suffixes (e.g. " — Vol. 2"); match by prefix
        expected_prefixes = ["Cinematic Lightroom Preset Pack", "Deep Work Field Notes",
                             "Monarch", "Lo-Fi Ambient Sample Pack", "Founder OS"]
        for pref in expected_prefixes:
            assert any(t.startswith(pref) for t in titles), (
                f"missing digital product starting with '{pref}'. Have: {titles}"
            )


# ----------------------------- Low-stock admin endpoint -----------------------------
class TestLowStock:
    def test_unauthenticated_blocked(self):
        r = requests.get(f"{BASE_URL}/api/admin/inventory/low-stock")
        assert r.status_code in (401, 403)

    def test_user_forbidden(self, user_headers):
        r = requests.get(f"{BASE_URL}/api/admin/inventory/low-stock", headers=user_headers)
        assert r.status_code in (401, 403)

    def test_admin_shape_and_sort(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/inventory/low-stock", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert {"count", "items", "threshold_default"}.issubset(data.keys())
        assert isinstance(data["items"], list)
        stocks = [i.get("stock_quantity", 0) for i in data["items"]]
        assert stocks == sorted(stocks), f"items not sorted ascending: {stocks}"


# ----------------------------- Orders backfill -----------------------------
class TestOrders:
    def test_admin_orders_returns_has_flags(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/orders", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        orders = data if isinstance(data, list) else data.get("items") or data.get("orders") or []
        if not orders:
            pytest.skip("no orders to verify backfill")
        for o in orders[:5]:
            assert "has_warehouse" in o, f"missing has_warehouse on order: {list(o.keys())}"
            assert "has_dropship" in o, f"missing has_dropship on order: {list(o.keys())}"
            assert isinstance(o["has_warehouse"], bool)
            assert isinstance(o["has_dropship"], bool)


# ----------------------------- Restock Alerts (public + admin) -----------------------------
class TestRestockAlerts:
    def test_subscribe_invalid_email(self):
        r = requests.post(f"{BASE_URL}/api/restock-alerts",
                          json={"product_id": OOS_WAREHOUSE_PRODUCT_ID, "email": "not-an-email"})
        assert r.status_code == 400

    def test_subscribe_404_for_unknown_product(self):
        r = requests.post(f"{BASE_URL}/api/restock-alerts",
                          json={"product_id": "does-not-exist-" + uuid.uuid4().hex,
                                "email": "TEST_resp@example.com"})
        assert r.status_code == 404

    def test_subscribe_400_for_dropship(self, mongo_db):
        # pick any dropship product id
        d = mongo_db.products.find_one({"fulfillment_type": "dropship"}, {"_id": 0, "id": 1})
        assert d, "no dropship product to test"
        r = requests.post(f"{BASE_URL}/api/restock-alerts",
                          json={"product_id": d["id"], "email": "TEST_dropship@example.com"})
        assert r.status_code == 400

    def test_subscribe_400_for_digital(self, mongo_db):
        d = mongo_db.products.find_one({"fulfillment_type": "digital"}, {"_id": 0, "id": 1})
        assert d, "no digital product to test"
        r = requests.post(f"{BASE_URL}/api/restock-alerts",
                          json={"product_id": d["id"], "email": "TEST_digital@example.com"})
        assert r.status_code == 400

    def test_subscribe_warehouse_oos_idempotent(self, mongo_db):
        email = f"test_alert_{uuid.uuid4().hex[:8]}@example.com"  # already lowercase
        r1 = requests.post(f"{BASE_URL}/api/restock-alerts",
                           json={"product_id": OOS_WAREHOUSE_PRODUCT_ID, "email": email})
        assert r1.status_code == 201, r1.text
        body1 = r1.json()
        assert body1.get("ok") is True
        # Second submit with same email → still 201 (idempotent upsert)
        r2 = requests.post(f"{BASE_URL}/api/restock-alerts",
                           json={"product_id": OOS_WAREHOUSE_PRODUCT_ID, "email": email})
        assert r2.status_code == 201
        # Only one doc persisted (server lowercases email)
        count = mongo_db.restock_alerts.count_documents(
            {"product_id": OOS_WAREHOUSE_PRODUCT_ID, "email": email}
        )
        assert count == 1, f"idempotency failed, got {count} docs"
        # Cleanup this test-prefixed alert
        mongo_db.restock_alerts.delete_one(
            {"product_id": OOS_WAREHOUSE_PRODUCT_ID, "email": email}
        )

    def test_admin_list_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/admin/restock-alerts")
        assert r.status_code in (401, 403)

    def test_admin_list_shape(self, admin_headers):
        r = requests.get(f"{BASE_URL}/api/admin/restock-alerts", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total_pending" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total_pending"], int)
        # OOS product should be present in list (it has demo subscribers)
        ids = {i["product_id"] for i in data["items"]}
        assert OOS_WAREHOUSE_PRODUCT_ID in ids, f"expected OOS product in pending alerts, got: {ids}"

    def test_admin_run_unauthenticated(self):
        r = requests.post(f"{BASE_URL}/api/admin/restock-alerts/run")
        assert r.status_code in (401, 403)

    def test_admin_run_dispatch_skips_oos(self, admin_headers, mongo_db):
        # The OOS product is still at 0 stock so dispatcher must NOT mark its alerts notified
        before_pending = mongo_db.restock_alerts.count_documents(
            {"product_id": OOS_WAREHOUSE_PRODUCT_ID, "notified_at": None}
        )
        r = requests.post(f"{BASE_URL}/api/admin/restock-alerts/run", headers=admin_headers)
        assert r.status_code == 200
        data = r.json()
        assert data.get("ok") is True
        for key in ("checked", "ready", "sent", "failed"):
            assert key in data, f"missing {key} in response: {data}"
        # OOS product stays in pending (stock still 0)
        after_pending = mongo_db.restock_alerts.count_documents(
            {"product_id": OOS_WAREHOUSE_PRODUCT_ID, "notified_at": None}
        )
        assert after_pending == before_pending, (
            f"OOS alerts should remain pending: before={before_pending} after={after_pending}"
        )

    def test_admin_run_dispatch_processes_restocked(self, admin_headers, mongo_db):
        """Pick a separate warehouse product with stock > 0, subscribe a TEST email,
        run dispatch, ensure that alert is marked notified."""
        prod = mongo_db.products.find_one(
            {"fulfillment_type": "warehouse", "stock_quantity": {"$gt": 0},
             "id": {"$ne": OOS_WAREHOUSE_PRODUCT_ID}},
            {"_id": 0, "id": 1, "title": 1},
        )
        assert prod, "no in-stock warehouse product available"
        email = f"TEST_dispatch_{uuid.uuid4().hex[:8]}@example.com"
        # Insert a pending alert directly (bypasses the API stock check that blocks subscription
        # when product is in stock — we want to simulate a legacy pending alert for a product
        # that has now returned to stock).
        from datetime import datetime, timezone
        mongo_db.restock_alerts.insert_one({
            "product_id": prod["id"],
            "product_title": prod.get("title") or "",
            "email": email,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "notified_at": None,
        })
        try:
            r = requests.post(f"{BASE_URL}/api/admin/restock-alerts/run", headers=admin_headers)
            assert r.status_code == 200
            data = r.json()
            # ready should be >= 1
            assert data.get("ready", 0) >= 1, f"expected ready >= 1, got {data}"
            # alert was marked notified (sent or skipped depending on RESEND_API_KEY presence)
            doc = mongo_db.restock_alerts.find_one(
                {"product_id": prod["id"], "email": email}
            )
            assert doc and doc.get("notified_at") is not None, (
                f"alert was not marked notified: {doc}"
            )
            assert doc.get("delivery_status") in ("sent", "skipped")
        finally:
            mongo_db.restock_alerts.delete_one(
                {"product_id": prod["id"], "email": email}
            )


# ----------------------------- Stripe checkout flags -----------------------------
class TestCheckout:
    def test_checkout_persists_has_flags(self, user_headers, mongo_db):
        """POST /api/checkout/session with warehouse + dropship items and assert flags."""
        # Find one warehouse + one dropship product id
        wh = mongo_db.products.find_one({"fulfillment_type": "warehouse"}, {"_id": 0, "id": 1})
        ds = mongo_db.products.find_one({"fulfillment_type": "dropship"}, {"_id": 0, "id": 1})
        assert wh and ds
        payload = {
            "items": [
                {"product_id": wh["id"], "qty": 1},
                {"product_id": ds["id"], "qty": 1},
            ],
            "shipping_address": {
                "email": "user@demo.com",
                "first_name": "Test",
                "last_name": "User",
                "address1": "123 Test St",
                "address2": "",
                "city": "Austin",
                "state": "TX",
                "zip": "78701",
                "country": "United States",
            },
            "shipping_method": "standard",
            "origin_url": "https://dropship-route.preview.emergentagent.com",
        }
        r = requests.post(f"{BASE_URL}/api/checkout/session",
                          json=payload, headers=user_headers)
        if r.status_code >= 500:
            pytest.skip(f"checkout 5xx (likely stripe config), got: {r.status_code} {r.text[:200]}")
        assert r.status_code == 200, r.text
        body = r.json()
        url = body.get("url") or body.get("checkout_url")
        assert url and "stripe.com" in url, f"no stripe URL returned: {body}"
        # Look up the most recently created order for this user that has both flags
        order = mongo_db.orders.find_one(
            {"has_warehouse": True, "has_dropship": True},
            sort=[("created_at", -1)],
        )
        assert order is not None, "no order persisted with has_warehouse=True AND has_dropship=True"

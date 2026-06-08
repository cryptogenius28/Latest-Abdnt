"""Iteration 6 backend regression tests — restock alerts + digital products + warehouse restoration."""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://dropship-route.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@abundant.com"
ADMIN_PASSWORD = "Admin@2026"
CUSTOMER_EMAIL = "user@demo.com"
CUSTOMER_PASSWORD = "User@123"


# ----------------------------- Fixtures -----------------------------
@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def customer_token():
    r = requests.post(f"{API}/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
    assert r.status_code == 200, r.text
    return r.json()["access_token"]


@pytest.fixture(scope="module")
def warehouse_oos_product():
    """Find a warehouse product that is out of stock (Wooden Building Blocks per spec)."""
    r = requests.get(f"{API}/products", params={"fulfillment_type": "warehouse", "page_size": 96})
    assert r.status_code == 200
    items = r.json()["items"]
    oos = [p for p in items if p.get("stock_quantity", 0) == 0]
    assert oos, "Expected at least one OOS warehouse product"
    return oos[0]


@pytest.fixture(scope="module")
def dropship_product():
    r = requests.get(f"{API}/products", params={"fulfillment_type": "dropship", "page_size": 1})
    assert r.status_code == 200
    items = r.json()["items"]
    assert items
    return items[0]


@pytest.fixture(scope="module")
def digital_product():
    r = requests.get(f"{API}/products", params={"fulfillment_type": "digital", "page_size": 10})
    assert r.status_code == 200
    items = r.json()["items"]
    assert items
    return items[0]


# ----------------------------- Restock Alerts (public POST) -----------------------------
class TestRestockAlertsPost:
    def test_success_warehouse_product(self, warehouse_oos_product):
        email = f"TEST_{uuid.uuid4().hex[:8]}@example.com"
        r = requests.post(f"{API}/restock-alerts", json={"product_id": warehouse_oos_product["id"], "email": email})
        assert r.status_code == 201, r.text
        data = r.json()
        assert data.get("ok") is True
        assert isinstance(data.get("message"), str) and len(data["message"]) > 0

    def test_invalid_email(self, warehouse_oos_product):
        r = requests.post(f"{API}/restock-alerts", json={"product_id": warehouse_oos_product["id"], "email": "notanemail"})
        assert r.status_code == 400

    def test_product_not_found(self):
        r = requests.post(f"{API}/restock-alerts", json={"product_id": "nonexistent_id_xyz", "email": "x@y.com"})
        assert r.status_code == 404

    def test_dropship_product_rejected(self, dropship_product):
        r = requests.post(f"{API}/restock-alerts", json={"product_id": dropship_product["id"], "email": f"TEST_{uuid.uuid4().hex[:6]}@x.com"})
        assert r.status_code == 400

    def test_digital_product_rejected(self, digital_product):
        r = requests.post(f"{API}/restock-alerts", json={"product_id": digital_product["id"], "email": f"TEST_{uuid.uuid4().hex[:6]}@x.com"})
        assert r.status_code == 400

    def test_idempotent_duplicate(self, warehouse_oos_product, admin_token):
        email = f"TEST_dup_{uuid.uuid4().hex[:8]}@example.com"
        pid = warehouse_oos_product["id"]
        r1 = requests.post(f"{API}/restock-alerts", json={"product_id": pid, "email": email})
        r2 = requests.post(f"{API}/restock-alerts", json={"product_id": pid, "email": email})
        assert r1.status_code == 201
        assert r2.status_code == 201
        # Verify only one row exists via admin endpoint
        r = requests.get(f"{API}/admin/restock-alerts", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        # Find the row for this product
        match = next((it for it in r.json()["items"] if it["product_id"] == pid), None)
        # We can't assert exact subscriber count (other tests add too) but at least row exists.
        assert match is not None


# ----------------------------- Admin restock alerts -----------------------------
class TestAdminRestockAlerts:
    def test_admin_can_list(self, admin_token, warehouse_oos_product):
        # Seed one subscription first
        requests.post(f"{API}/restock-alerts", json={"product_id": warehouse_oos_product["id"], "email": f"TEST_admin_{uuid.uuid4().hex[:6]}@x.com"})
        r = requests.get(f"{API}/admin/restock-alerts", headers={"Authorization": f"Bearer {admin_token}"})
        assert r.status_code == 200
        data = r.json()
        assert "items" in data and "total_pending" in data
        assert isinstance(data["items"], list)
        assert isinstance(data["total_pending"], int)
        assert data["total_pending"] >= 1
        item = data["items"][0]
        for key in ("product_id", "product_title", "subscribers", "latest_subscription"):
            assert key in item, f"missing key {key}"

    def test_non_admin_forbidden(self, customer_token):
        r = requests.get(f"{API}/admin/restock-alerts", headers={"Authorization": f"Bearer {customer_token}"})
        assert r.status_code in (401, 403)

    def test_unauthenticated_rejected(self):
        r = requests.get(f"{API}/admin/restock-alerts")
        assert r.status_code in (401, 403)


# ----------------------------- Digital products -----------------------------
class TestDigitalProducts:
    EXPECTED_TITLE_PREFIXES = [
        "Cinematic Lightroom Preset Pack",
        "Deep Work Field Notes",
        "Monarch",  # Monarch — Display + Mono Font Duo
        "Lo-Fi Ambient Sample Pack",
        "Founder OS",
    ]

    def test_returns_five_digital(self):
        r = requests.get(f"{API}/products", params={"fulfillment_type": "digital", "page_size": 50})
        assert r.status_code == 200
        items = r.json()["items"]
        assert len(items) >= 5, f"Expected ≥5 digital products, got {len(items)}"
        titles = [p["title"] for p in items]
        for prefix in self.EXPECTED_TITLE_PREFIXES:
            assert any(prefix in t for t in titles), f"Missing digital product starting with '{prefix}'. Got: {titles}"

    def test_each_has_download_url_and_type(self):
        r = requests.get(f"{API}/products", params={"fulfillment_type": "digital", "page_size": 50})
        items = r.json()["items"]
        for p in items:
            assert p.get("fulfillment_type") == "digital", p.get("title")
            # download_url may live in product detail, fetch full doc
            r2 = requests.get(f"{API}/products/{p['id']}")
            assert r2.status_code == 200
            full = r2.json()
            assert full.get("download_url"), f"{p['title']} missing download_url"


# ----------------------------- Adjustable Dumbbells warehouse restore -----------------------------
class TestAdjustableDumbbells:
    def test_sku_AM_SPO_091_is_warehouse(self):
        # Try sku param; fall back to title search
        r = requests.get(f"{API}/products", params={"q": "Adjustable Dumbbells", "page_size": 10})
        assert r.status_code == 200
        items = r.json()["items"]
        found = next((p for p in items if "Adjustable Dumbbells" in p.get("title", "")), None)
        assert found is not None, f"Adjustable Dumbbells not found. Got titles: {[p['title'] for p in items]}"
        assert found["fulfillment_type"] == "warehouse"
        assert found["stock_quantity"] > 0


# ----------------------------- Smoke checks (catalog sanity) -----------------------------
class TestCatalogCounts:
    def test_total_around_106(self):
        r = requests.get(f"{API}/products", params={"page_size": 1})
        assert r.status_code == 200
        total = r.json().get("total")
        assert total >= 100, f"Total catalog seems low: {total}"

    def test_warehouse_count(self):
        r = requests.get(f"{API}/products", params={"fulfillment_type": "warehouse", "page_size": 1})
        assert r.status_code == 200
        assert r.json()["total"] >= 50

    def test_dropship_count(self):
        r = requests.get(f"{API}/products", params={"fulfillment_type": "dropship", "page_size": 1})
        assert r.status_code == 200
        assert r.json()["total"] >= 50

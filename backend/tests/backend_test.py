"""Backend tests for Abundant Merchandise."""
import os
import time
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://store-completion.preview.emergentagent.com").rstrip("/")
# Read frontend env if available
try:
    with open("/app/frontend/.env") as f:
        for line in f:
            if line.startswith("REACT_APP_BACKEND_URL"):
                BASE_URL = line.split("=", 1)[1].strip().rstrip("/")
except Exception:
    pass

ADMIN_EMAIL = "admin@abundant.com"
ADMIN_PASSWORD = "Admin@12345"
CUSTOMER_EMAIL = "user@demo.com"
CUSTOMER_PASSWORD = "User@123"


# ----------------------------- Fixtures -----------------------------
@pytest.fixture(scope="module")
def anon():
    return requests.Session()


@pytest.fixture(scope="module")
def admin_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
    if r.status_code != 200:
        pytest.skip(f"Admin login failed: {r.status_code} {r.text}")
    return s


@pytest.fixture(scope="module")
def customer_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/auth/login", json={"email": CUSTOMER_EMAIL, "password": CUSTOMER_PASSWORD})
    if r.status_code != 200:
        # Try to register
        r = s.post(f"{BASE_URL}/api/auth/register", json={"email": CUSTOMER_EMAIL, "name": "Demo User", "password": CUSTOMER_PASSWORD})
        if r.status_code != 200:
            # Email may already exist with diff pwd
            pytest.skip(f"Customer login/register failed: {r.status_code} {r.text}")
    return s


# ----------------------------- Health -----------------------------
class TestHealth:
    def test_root(self, anon):
        r = anon.get(f"{BASE_URL}/api/")
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ----------------------------- Auth -----------------------------
class TestAuth:
    def test_login_admin(self):
        s = requests.Session()
        r = s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == ADMIN_EMAIL
        assert data["role"] == "admin"
        # Cookie set
        cookies = s.cookies.get_dict()
        assert "access_token" in cookies or "refresh_token" in cookies

    def test_login_invalid(self, anon):
        r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": "wrong"})
        assert r.status_code == 401

    def test_me_unauthenticated(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_authenticated(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 200
        assert r.json()["role"] == "admin"

    def test_register_and_duplicate(self):
        s = requests.Session()
        email = f"test_{uuid.uuid4().hex[:8]}@test.com"
        r = s.post(f"{BASE_URL}/api/auth/register", json={"email": email, "name": "Test", "password": "Passw0rd!"})
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == email
        assert data["role"] == "customer"
        # Duplicate
        r2 = requests.post(f"{BASE_URL}/api/auth/register", json={"email": email, "name": "Test", "password": "Passw0rd!"})
        assert r2.status_code == 400

    def test_logout(self, admin_session):
        # Create separate session to not impact others
        s = requests.Session()
        s.post(f"{BASE_URL}/api/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD})
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 200
        r = s.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        # After logout, the cookie should be cleared
        s.cookies.clear()
        assert s.get(f"{BASE_URL}/api/auth/me").status_code == 401


# ----------------------------- Categories -----------------------------
class TestCategories:
    def test_list(self, anon):
        r = anon.get(f"{BASE_URL}/api/categories")
        assert r.status_code == 200
        data = r.json()
        assert isinstance(data, list)
        assert len(data) >= 4
        for c in data:
            assert "slug" in c and "name" in c and "count" in c


# ----------------------------- Products -----------------------------
class TestProducts:
    def test_list_default(self, anon):
        r = anon.get(f"{BASE_URL}/api/products")
        assert r.status_code == 200
        d = r.json()
        for k in ("items", "total", "page", "pages"):
            assert k in d
        assert d["total"] > 0
        assert len(d["items"]) > 0
        first = d["items"][0]
        for k in ("id", "title", "price", "category", "images", "stock_quantity", "fulfillment_type", "brand"):
            assert k in first

    def test_filter_category(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"category": "electronics", "page_size": 5})
        assert r.status_code == 200
        d = r.json()
        assert all(p["category"] == "electronics" for p in d["items"])

    def test_filter_price_and_sort(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"min_price": 10, "max_price": 100, "sort": "price_asc", "page_size": 10})
        assert r.status_code == 200
        items = r.json()["items"]
        prices = [p["price"] for p in items]
        assert prices == sorted(prices)
        assert all(10 <= p <= 100 for p in prices)

    def test_search_q(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"q": "a", "page_size": 5})
        assert r.status_code == 200
        assert r.json()["total"] >= 0

    def test_on_sale_filter(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"on_sale": "true", "page_size": 10})
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert p.get("sale_price") is not None and p["sale_price"] > 0

    def test_pagination(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"page": 1, "page_size": 5})
        assert r.status_code == 200
        d = r.json()
        assert d["page"] == 1
        assert len(d["items"]) <= 5

    def test_get_single(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"page_size": 1})
        pid = r.json()["items"][0]["id"]
        r2 = anon.get(f"{BASE_URL}/api/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["id"] == pid

    def test_get_404(self, anon):
        r = anon.get(f"{BASE_URL}/api/products/does-not-exist")
        assert r.status_code == 404

    # ----- Phase 3 catalog expansion checks -----
    def test_total_at_least_91_products(self, anon):
        """Base catalog has 91+ products. Use >= so seed/import additions don't break the test."""
        r = anon.get(f"{BASE_URL}/api/products", params={"page_size": 1})
        assert r.status_code == 200
        total = r.json()["total"]
        assert total >= 91, f"Expected at least 91 products, got {total}"

    def test_category_distribution(self, anon):
        """All 8 supported categories should have items; 'auto' should be empty (remapped to tools)."""
        expected_cats = ["electronics", "home-garden", "fashion", "beauty", "sports", "tools", "toys", "office"]
        for c in expected_cats:
            r = anon.get(f"{BASE_URL}/api/products", params={"category": c, "page_size": 96})
            assert r.status_code == 200, f"{c} -> {r.status_code}"
            total = r.json()["total"]
            assert total > 0, f"Category '{c}' has 0 products"
        # office >= 8
        r = anon.get(f"{BASE_URL}/api/products", params={"category": "office", "page_size": 96})
        assert r.json()["total"] >= 8, f"office must have >= 8, got {r.json()['total']}"

    def test_no_auto_category(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"category": "auto", "page_size": 96})
        assert r.status_code == 200
        # 'auto' should be remapped to tools/automotive — no items
        assert r.json()["total"] == 0, f"'auto' should be empty but has {r.json()['total']}"

    def test_automotive_under_tools(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"category": "tools", "page_size": 96})
        assert r.status_code == 200
        items = r.json()["items"]
        # at least some tools items should carry an automotive-themed subcategory
        auto_subcats = {"automotive", "tools-auto", "car-electronics", "interior", "exterior"}
        autom = [p for p in items if (p.get("subcategory") or "").lower() in auto_subcats]
        assert len(autom) > 0, f"Expected automotive-themed products under 'tools'. Got subcats: {sorted({p.get('subcategory') for p in items})}"



# ----------------------------- Admin -----------------------------
class TestAdmin:
    def test_admin_list_unauth(self):
        r = requests.get(f"{BASE_URL}/api/admin/products")
        assert r.status_code == 401

    def test_admin_list_forbidden_customer(self, customer_session):
        r = customer_session.get(f"{BASE_URL}/api/admin/products")
        assert r.status_code == 403

    def test_admin_stats(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/stats")
        assert r.status_code == 200
        d = r.json()
        for k in ("products", "users", "out_of_stock", "on_sale"):
            assert k in d
        assert d["products"] > 0

    def test_admin_list_products(self, admin_session):
        r = admin_session.get(f"{BASE_URL}/api/admin/products", params={"page_size": 5})
        assert r.status_code == 200
        assert "items" in r.json()

    def test_admin_crud(self, admin_session):
        # CREATE
        sku = f"TEST-{uuid.uuid4().hex[:8]}"
        payload = {
            "title": "TEST Product",
            "description": "test desc",
            "price": 99.99,
            "sale_price": None,
            "sku": sku,
            "brand": "TestBrand",
            "category": "electronics",
            "tags": ["test"],
            "fulfillment_type": "warehouse",
            "stock_quantity": 10,
            "images": ["https://example.com/x.jpg"],
            "specs": {"a": "b"},
            "featured": False,
        }
        r = admin_session.post(f"{BASE_URL}/api/admin/products", json=payload)
        assert r.status_code == 200, r.text
        product = r.json()
        pid = product["id"]
        assert product["sku"] == sku
        assert product["price"] == 99.99

        # GET back
        r2 = admin_session.get(f"{BASE_URL}/api/products/{pid}")
        assert r2.status_code == 200
        assert r2.json()["sku"] == sku

        # UPDATE
        r3 = admin_session.put(f"{BASE_URL}/api/admin/products/{pid}", json={"price": 49.5, "stock_quantity": 50})
        assert r3.status_code == 200
        assert r3.json()["price"] == 49.5
        assert r3.json()["stock_quantity"] == 50

        # Verify persisted
        r4 = admin_session.get(f"{BASE_URL}/api/products/{pid}")
        assert r4.json()["price"] == 49.5

        # DELETE
        r5 = admin_session.delete(f"{BASE_URL}/api/admin/products/{pid}")
        assert r5.status_code == 200

        # 404 now
        r6 = admin_session.get(f"{BASE_URL}/api/products/{pid}")
        assert r6.status_code == 404



# ============================ Phase 4 tests ============================

# ----------------------------- Facets -----------------------------
class TestFacets:
    def test_facets_basic(self, anon):
        r = anon.get(f"{BASE_URL}/api/products/facets")
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("colors", "sizes", "brands"):
            assert k in d
            assert isinstance(d[k], list)
        # Should have at least some values
        assert len(d["colors"]) > 0, "facets.colors should be populated"
        assert len(d["sizes"]) > 0, "facets.sizes should be populated"
        assert len(d["brands"]) > 0, "facets.brands should be populated"

    def test_facets_fashion(self, anon):
        r = anon.get(f"{BASE_URL}/api/products/facets", params={"category": "fashion"})
        assert r.status_code == 200
        d = r.json()
        assert isinstance(d.get("sizes"), list)


# ----------------------------- New filter params -----------------------------
class TestProductFilters:
    def test_color_filter_black(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"color": "Black", "page_size": 96})
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 7, f"expected >=7 items with color=Black, got {d['total']}"

    def test_color_filter_navy(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"color": "Navy", "page_size": 96})
        assert r.status_code == 200

    def test_size_filter_m(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"size": "M", "page_size": 96})
        assert r.status_code == 200
        assert r.json()["total"] > 0

    def test_min_rating_45(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"min_rating": 4.5, "page_size": 96})
        assert r.status_code == 200
        items = r.json()["items"]
        # All returned items must have rating >= 4.5
        for p in items:
            assert (p.get("rating") or 0) >= 4.5
        assert r.json()["total"] >= 1

    def test_fulfillment_type(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"fulfillment_type": "warehouse", "page_size": 96})
        assert r.status_code == 200
        items = r.json()["items"]
        for p in items:
            assert p.get("fulfillment_type") == "warehouse"


# ----------------------------- Newsletter + Contact -----------------------------
class TestNewsletter:
    def test_subscribe_and_idempotent(self, anon):
        email = f"news_{uuid.uuid4().hex[:8]}@test.com"
        r = anon.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": email})
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["email"] == email
        first_id = d.get("id")
        # Twice -> no duplicate, returns existing
        r2 = anon.post(f"{BASE_URL}/api/newsletter/subscribe", json={"email": email})
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["email"] == email
        if first_id and d2.get("id"):
            assert d2["id"] == first_id


class TestContact:
    def test_contact_submit(self, anon):
        payload = {
            "name": "TEST Person",
            "email": "test_contact@test.com",
            "subject": "TEST subject",
            "message": "TEST body content from automated test",
        }
        r = anon.post(f"{BASE_URL}/api/contact", json=payload)
        assert r.status_code == 200, r.text
        d = r.json()
        assert "id" in d
        assert d["email"] == payload["email"]


# ----------------------------- Reviews -----------------------------
class TestReviews:
    def _first_product_id(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"page_size": 1})
        return r.json()["items"][0]["id"]

    def test_create_review_requires_auth(self, anon):
        pid = self._first_product_id(anon)
        r = anon.post(f"{BASE_URL}/api/products/{pid}/reviews", json={"rating": 5, "title": "x", "body": "y"})
        assert r.status_code in (401, 403), f"expected 401/403 unauth, got {r.status_code}"

    def test_create_and_update_review(self, customer_session, anon):
        pid = self._first_product_id(anon)
        r1 = customer_session.post(
            f"{BASE_URL}/api/products/{pid}/reviews",
            json={"rating": 4, "title": "Good", "body": "Pretty good product"},
        )
        assert r1.status_code == 200, r1.text
        rev1 = r1.json()
        assert rev1["rating"] == 4

        # Second call by same user — should UPDATE, not duplicate
        r2 = customer_session.post(
            f"{BASE_URL}/api/products/{pid}/reviews",
            json={"rating": 5, "title": "Better", "body": "Actually loved it"},
        )
        assert r2.status_code == 200, r2.text
        rev2 = r2.json()
        assert rev2["rating"] == 5

        # Listing should contain just one for this user
        r3 = anon.get(f"{BASE_URL}/api/products/{pid}/reviews")
        assert r3.status_code == 200
        d = r3.json()
        for k in ("items", "total", "avg_rating", "distribution"):
            assert k in d
        dist = d["distribution"]
        # distribution should have keys 1..5
        for star in (1, 2, 3, 4, 5):
            assert str(star) in dist or star in dist
        my_revs = [x for x in d["items"] if x.get("title") in ("Good", "Better")]
        assert len(my_revs) == 1, f"expected dedup per (product,user), got {len(my_revs)}"


# ----------------------------- Checkout -----------------------------
class TestCheckout:
    def test_create_checkout_session(self, anon, customer_session):
        # Grab a real product
        r = anon.get(f"{BASE_URL}/api/products", params={"page_size": 2})
        items = r.json()["items"]
        payload = {
            "items": [{"product_id": items[0]["id"], "qty": 1}],
            "shipping_address": {
                "email": "test_co@test.com",
                "first_name": "TC",
                "last_name": "Tester",
                "address1": "1 Test St",
                "city": "Testville",
                "state": "CA",
                "zip": "94000",
                "country": "US",
            },
            "shipping_method": "standard",
            "origin_url": BASE_URL,
        }
        r2 = customer_session.post(f"{BASE_URL}/api/checkout/session", json=payload)
        assert r2.status_code == 200, r2.text
        d = r2.json()
        for k in ("url", "session_id", "order_id", "order_number"):
            assert k in d and d[k]
        assert d["order_number"].startswith("AM-"), f"order_number format: {d['order_number']}"
        assert len(d["order_number"]) >= 8
        # URL should look like a Stripe-hosted page
        assert "stripe.com" in d["url"], f"checkout URL must be Stripe-hosted: {d['url']}"
        # Status
        r3 = anon.get(f"{BASE_URL}/api/checkout/status/{d['session_id']}")
        assert r3.status_code == 200, r3.text
        ds = r3.json()
        for k in ("payment_status", "status", "order"):
            assert k in ds

    def test_orders_mine_requires_auth(self, anon):
        r = anon.get(f"{BASE_URL}/api/orders/mine")
        assert r.status_code in (401, 403)

    def test_orders_mine_returns_list(self, customer_session):
        r = customer_session.get(f"{BASE_URL}/api/orders/mine")
        assert r.status_code == 200
        assert isinstance(r.json(), list)


# ----------------------------- Automotive subcategory rename -----------------------------
class TestAutomotiveRename:
    def test_tools_has_automotive_subcat(self, anon):
        r = anon.get(f"{BASE_URL}/api/products", params={"category": "tools", "page_size": 96})
        assert r.status_code == 200
        items = r.json()["items"]
        # tools has ~15 items, at least 2 with subcategory == "automotive" and no "tools-auto"
        subs = [(p.get("subcategory") or "").lower() for p in items]
        autom = [s for s in subs if s == "automotive"]
        assert len(autom) >= 2, f"Expected >=2 automotive items under tools, got subcats: {sorted(set(subs))}"
        assert "tools-auto" not in subs, "tools-auto should be renamed to automotive"

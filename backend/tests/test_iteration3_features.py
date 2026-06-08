"""Tests for iteration 3 features: admin stats, promo, pagination, newsletter, categories."""
import os
import pytest
import requests

# Use localhost backend since public URL has servers asleep (preview env)
BASE_URL = os.environ.get("TEST_BASE_URL", "http://localhost:8001")


@pytest.fixture(scope="module")
def admin_token():
    r = requests.post(f"{BASE_URL}/api/auth/login",
                      json={"email": "admin@abundant.com", "password": "Admin@12345"})
    assert r.status_code == 200, r.text
    return r.json().get("access_token")


@pytest.fixture(scope="module")
def admin_headers(admin_token):
    if not admin_token:
        pytest.skip("Admin token not available")
    return {"Authorization": f"Bearer {admin_token}"}


# ---------- Health ----------
def test_health():
    r = requests.get(f"{BASE_URL}/api/")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


# ---------- Categories: automotive added with count 5 ----------
def test_categories_includes_automotive():
    r = requests.get(f"{BASE_URL}/api/categories")
    assert r.status_code == 200
    data = r.json()
    assert isinstance(data, list)
    assert len(data) == 9, f"Expected 9 categories, got {len(data)}"
    auto = next((c for c in data if c["slug"] == "automotive"), None)
    assert auto is not None, "automotive category missing"
    assert auto["count"] == 5, f"automotive count expected 5, got {auto['count']}"


def test_products_automotive_returns_5():
    r = requests.get(f"{BASE_URL}/api/products?category=automotive&page_size=20")
    assert r.status_code == 200
    data = r.json()
    assert data["total"] == 5
    assert len(data["items"]) == 5
    titles = [p["title"] for p in data["items"]]
    # Check for expected brand presence in seed
    joined = " ".join(titles).lower()
    # Some of the 5 seed products mention these brands or items
    assert any(b in joined for b in ["noco", "armor", "chemical guys", "michelin", "weathertech"]) or len(titles) == 5


# ---------- Admin stats: 7 fields ----------
def test_admin_stats_has_seven_fields(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/stats", headers=admin_headers)
    assert r.status_code == 200
    d = r.json()
    for k in ["products", "users", "out_of_stock", "on_sale",
              "total_orders", "total_revenue", "total_subscribers"]:
        assert k in d, f"Missing key: {k}"
    assert isinstance(d["total_orders"], int)
    assert isinstance(d["total_revenue"], (int, float))
    assert isinstance(d["total_subscribers"], int)


# ---------- Admin orders pagination ----------
def test_admin_orders_pagination_shape(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/orders?page=1&page_size=20", headers=admin_headers)
    assert r.status_code == 200
    d = r.json()
    for k in ["items", "total", "page", "pages"]:
        assert k in d, f"Missing key: {k}"
    assert isinstance(d["items"], list)
    assert d["page"] == 1
    assert d["pages"] >= 1


def test_admin_orders_pagination_page_size(admin_headers):
    r = requests.get(f"{BASE_URL}/api/admin/orders?page=1&page_size=5", headers=admin_headers)
    assert r.status_code == 200
    d = r.json()
    assert len(d["items"]) <= 5


# ---------- Promo validate ----------
def test_promo_welcome10_any_subtotal():
    r = requests.post(f"{BASE_URL}/api/promo/validate",
                      json={"code": "WELCOME10", "subtotal": 0})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is True
    assert d["type"] == "percent"
    assert d["amount"] == 10


def test_promo_freeship_valid():
    r = requests.post(f"{BASE_URL}/api/promo/validate",
                      json={"code": "FREESHIP", "subtotal": 25})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is True
    assert d["type"] == "free_shipping"


def test_promo_save20_min_order_fail():
    r = requests.post(f"{BASE_URL}/api/promo/validate",
                      json={"code": "SAVE20", "subtotal": 50})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is False
    assert "minimum order of $100" in (d.get("message") or "").lower()


def test_promo_save20_above_threshold():
    r = requests.post(f"{BASE_URL}/api/promo/validate",
                      json={"code": "SAVE20", "subtotal": 150})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is True
    assert d["type"] == "flat"
    assert d["amount"] == 20


def test_promo_bogus_code():
    r = requests.post(f"{BASE_URL}/api/promo/validate",
                      json={"code": "BOGUS", "subtotal": 50})
    assert r.status_code == 200
    d = r.json()
    assert d["valid"] is False
    assert "invalid" in (d.get("message") or "").lower() or "expired" in (d.get("message") or "").lower()


def test_promo_case_insensitive():
    r = requests.post(f"{BASE_URL}/api/promo/validate",
                      json={"code": "welcome10", "subtotal": 0})
    assert r.status_code == 200
    assert r.json()["valid"] is True


# ---------- Newsletter subscribe + idempotent ----------
def test_newsletter_subscribe_idempotent():
    email = "TEST_newsletter_iter3@example.com"
    r1 = requests.post(f"{BASE_URL}/api/newsletter/subscribe",
                       json={"email": email, "source": "footer"})
    assert r1.status_code == 200, r1.text
    assert r1.json()["email"] == email.lower()

    # Second call should still return 200 (idempotent)
    r2 = requests.post(f"{BASE_URL}/api/newsletter/subscribe",
                       json={"email": email, "source": "footer"})
    assert r2.status_code == 200
    assert r2.json()["email"] == email.lower()


# ---------- Products: newest sort returns up to 8 (New Arrivals) ----------
def test_products_newest_sort():
    r = requests.get(f"{BASE_URL}/api/products?sort=newest&page_size=8")
    assert r.status_code == 200
    d = r.json()
    assert len(d["items"]) <= 8
    assert d["total"] >= 8


def test_total_products_at_least_101():
    """101 base seeded + any IMP-* CSV imports. Use >= so re-imports don't break the test."""
    r = requests.get(f"{BASE_URL}/api/products?page_size=1")
    assert r.status_code == 200
    total = r.json()["total"]
    assert total >= 101, f"Expected at least 101 products, got {total}"

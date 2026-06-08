"""Backend tests for product search and Quick View modal data source (P5/P6).

Covers:
- GET /api/products?q=<term> search filtering by title/description/brand/tags
- Case-insensitive matching
- No-results behavior
- GET /api/products/{id} (used by Quick View modal)
"""
import os
import re
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://store-completion.preview.emergentagent.com").rstrip("/")


@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


class TestProductSearch:
    """GET /api/products q-param tests"""

    def test_search_shirt_returns_only_matching(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products", params={"q": "shirt", "page_size": 50})
        assert r.status_code == 200, r.text
        data = r.json()
        assert "items" in data and "total" in data
        assert isinstance(data["items"], list)
        assert data["total"] == len(data["items"]) or data["total"] >= len(data["items"])  # paginated
        # Every returned item must contain the term in title/description/brand/tags (case-insensitive)
        term = "shirt"
        for p in data["items"]:
            haystack = " ".join([
                p.get("title", ""),
                p.get("description", ""),
                p.get("brand", ""),
                " ".join(p.get("tags", []) or []),
            ]).lower()
            assert term in haystack, f"Product {p.get('id')} does not contain '{term}': {haystack[:200]}"

    def test_search_case_insensitive(self, api_client):
        r_lower = api_client.get(f"{BASE_URL}/api/products", params={"q": "shirt"})
        r_upper = api_client.get(f"{BASE_URL}/api/products", params={"q": "SHIRT"})
        r_mixed = api_client.get(f"{BASE_URL}/api/products", params={"q": "ShIrT"})
        assert r_lower.status_code == r_upper.status_code == r_mixed.status_code == 200
        assert r_lower.json()["total"] == r_upper.json()["total"] == r_mixed.json()["total"]

    def test_search_no_results(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products", params={"q": "zzzzzzzz"})
        assert r.status_code == 200
        data = r.json()
        assert data["total"] == 0
        assert data["items"] == []

    def test_search_special_chars_not_500(self, api_client):
        # Regex special chars in query should be escaped (re.escape in backend)
        for term in [".*", "(", "[abc]", "shirt+"]:
            r = api_client.get(f"{BASE_URL}/api/products", params={"q": term})
            assert r.status_code == 200, f"q='{term}' failed: {r.status_code} {r.text[:200]}"

    def test_search_total_matches_items_within_page(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products", params={"q": "shirt", "page_size": 96})
        assert r.status_code == 200
        data = r.json()
        # When all results fit in one page, total == len(items)
        if data["pages"] == 1:
            assert data["total"] == len(data["items"])

    def test_search_excludes_mongo_id(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products", params={"q": "shirt"})
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert "_id" not in p

    def test_search_combined_with_category(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products", params={"q": "shirt", "category": "fashion"})
        assert r.status_code == 200
        for p in r.json()["items"]:
            assert p["category"] == "fashion"


class TestProductDetail:
    """GET /api/products/{id} used by Quick View modal."""

    def test_get_product_by_id(self, api_client):
        # Get a known product id
        r = api_client.get(f"{BASE_URL}/api/products", params={"q": "shirt", "page_size": 1})
        assert r.status_code == 200
        items = r.json()["items"]
        assert items, "expected at least 1 shirt product"
        pid = items[0]["id"]

        # Fetch detail
        d = api_client.get(f"{BASE_URL}/api/products/{pid}")
        assert d.status_code == 200
        prod = d.json()
        # Validate fields used by QuickViewModal
        for k in ["id", "title", "price", "images"]:
            assert k in prod, f"missing field: {k}"
        assert prod["id"] == pid
        assert isinstance(prod["title"], str) and len(prod["title"]) > 0
        assert isinstance(prod["price"], (int, float))
        assert "_id" not in prod

    def test_get_product_not_found(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/products/nonexistent-id-xyz")
        assert r.status_code in (404, 422)

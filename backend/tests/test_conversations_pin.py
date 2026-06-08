"""PATCH /api/ai/conversations/{id} pin/unpin + sorting + GET pinned field tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@abndt.com"
ADMIN_PASS = "Admin@12345"


@pytest.fixture(scope="module")
def headers():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, r.text
    tok = r.json().get("access_token") or r.json().get("token")
    assert tok
    return {"Authorization": f"Bearer {tok}", "Content-Type": "application/json"}


def _create_chat(headers, title):
    payload = {
        "title": title,
        "messages": [
            {"role": "user", "content": f"Test message for {title}"},
            {"role": "assistant", "content": "Sure, here are suggestions."},
        ],
    }
    r = requests.post(f"{API}/ai/conversations", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()


@pytest.fixture(scope="module")
def two_chats(headers):
    a = _create_chat(headers, "TEST_pin_chat_A")
    b = _create_chat(headers, "TEST_pin_chat_B")
    yield (a, b)
    # cleanup
    for c in (a, b):
        requests.delete(f"{API}/ai/conversations/{c['id']}", headers=headers, timeout=10)


def test_list_includes_pinned_field(headers, two_chats):
    r = requests.get(f"{API}/ai/conversations", headers=headers, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list) and len(items) >= 2
    for it in items:
        assert "pinned" in it
        assert isinstance(it["pinned"], bool)


def test_patch_pin_returns_pinned_true(headers, two_chats):
    a, b = two_chats
    # Pin chat B (the older / second one we'd expect to bubble to top)
    r = requests.patch(f"{API}/ai/conversations/{b['id']}", json={"pinned": True}, headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["id"] == b["id"]
    assert data["pinned"] is True


def test_pinned_sorts_to_top(headers, two_chats):
    a, b = two_chats
    r = requests.get(f"{API}/ai/conversations", headers=headers, timeout=15)
    assert r.status_code == 200
    items = r.json()
    # B should appear before A
    ids = [it["id"] for it in items]
    assert b["id"] in ids and a["id"] in ids
    assert ids.index(b["id"]) < ids.index(a["id"]), f"Pinned chat B should be ahead of A: {ids}"
    # And B should be flagged pinned
    b_row = next(it for it in items if it["id"] == b["id"])
    assert b_row["pinned"] is True


def test_patch_unpin_reverses(headers, two_chats):
    a, b = two_chats
    r = requests.patch(f"{API}/ai/conversations/{b['id']}", json={"pinned": False}, headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    assert r.json()["pinned"] is False


def test_patch_invalid_id_returns_404(headers):
    r = requests.patch(f"{API}/ai/conversations/deadbeefdeadbeef00", json={"pinned": True}, headers=headers, timeout=15)
    assert r.status_code == 404


def test_patch_requires_auth(two_chats):
    a, _ = two_chats
    r = requests.patch(f"{API}/ai/conversations/{a['id']}", json={"pinned": True}, timeout=15)
    assert r.status_code in (401, 403)


def test_patch_empty_body_returns_400(headers, two_chats):
    a, _ = two_chats
    r = requests.patch(f"{API}/ai/conversations/{a['id']}", json={}, headers=headers, timeout=15)
    assert r.status_code == 400

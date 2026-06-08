"""Saved AI conversations + share endpoints regression tests."""
import os
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://abndt-core.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = "admin@abndt.com"
ADMIN_PASS = "Admin@12345"


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=20)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    body = r.json()
    tok = body.get("access_token") or body.get("token")
    assert tok, f"no token in response: {body}"
    return tok


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}


@pytest.fixture(scope="module")
def saved_chat(headers):
    payload = {
        "title": "TEST_gift under 50",
        "messages": [
            {"role": "user", "content": "Looking for a gift under $50"},
            {"role": "assistant", "content": "Here are a few good options under $50."},
        ],
    }
    r = requests.post(f"{API}/ai/conversations", json=payload, headers=headers, timeout=20)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["title"] == "TEST_gift under 50"
    assert data["message_count"] == 2
    assert "id" in data
    return data


def test_login_admin():
    r = requests.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASS}, timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert body.get("access_token") or body.get("token")


def test_create_conversation(saved_chat):
    assert saved_chat["id"]
    assert len(saved_chat["messages"]) == 2


def test_list_conversations(headers, saved_chat):
    r = requests.get(f"{API}/ai/conversations", headers=headers, timeout=15)
    assert r.status_code == 200
    items = r.json()
    assert isinstance(items, list)
    ids = [it["id"] for it in items]
    assert saved_chat["id"] in ids


def test_get_conversation_detail(headers, saved_chat):
    r = requests.get(f"{API}/ai/conversations/{saved_chat['id']}", headers=headers, timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert data["id"] == saved_chat["id"]
    assert data["title"] == "TEST_gift under 50"
    assert len(data["messages"]) == 2
    assert data["messages"][0]["role"] == "user"


def test_share_conversation_returns_token_and_url(headers, saved_chat):
    r = requests.post(f"{API}/ai/conversations/{saved_chat['id']}/share", headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert "token" in data and len(data["token"]) >= 16
    assert "url" in data
    assert data["token"] in data["url"]
    # cache token for next tests
    saved_chat["share_token"] = data["token"]


def test_share_endpoint_is_public_no_auth(saved_chat):
    token = saved_chat.get("share_token")
    assert token, "share token missing (share test must run first)"
    # Use a fresh session with no Authorization header at all
    r = requests.get(f"{API}/ai/share/{token}", timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    assert data["id"] == saved_chat["id"]
    assert len(data["messages"]) == 2


def test_share_invalid_token_returns_404():
    r = requests.get(f"{API}/ai/share/deadbeefdeadbeefdeadbeef", timeout=15)
    assert r.status_code == 404


def test_get_conversation_requires_auth(saved_chat):
    r = requests.get(f"{API}/ai/conversations/{saved_chat['id']}", timeout=15)
    assert r.status_code in (401, 403)


def test_delete_conversation_requires_auth(saved_chat):
    r = requests.delete(f"{API}/ai/conversations/{saved_chat['id']}", timeout=15)
    assert r.status_code in (401, 403)


def test_delete_conversation(headers, saved_chat):
    r = requests.delete(f"{API}/ai/conversations/{saved_chat['id']}", headers=headers, timeout=15)
    assert r.status_code == 200
    assert r.json().get("deleted") is True
    # verify gone
    r2 = requests.get(f"{API}/ai/conversations/{saved_chat['id']}", headers=headers, timeout=15)
    assert r2.status_code == 404


def test_admin_route_still_loads_via_me_after_login(headers):
    # /admin frontend was flaky last iteration. Check the /me endpoint reports admin role.
    r = requests.get(f"{API}/auth/me", headers=headers, timeout=15)
    assert r.status_code == 200, r.text
    data = r.json()
    role = data.get("role") or (data.get("user") or {}).get("role")
    assert role in ("admin", "ADMIN"), f"expected admin role, got {data}"

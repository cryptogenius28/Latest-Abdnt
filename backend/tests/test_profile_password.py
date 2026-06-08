"""Backend tests for profile update + password change + regression on auth."""
import os
import pytest
import requests

BASE_URL = os.environ['REACT_APP_BACKEND_URL'].rstrip('/') if os.environ.get('REACT_APP_BACKEND_URL') else None
if not BASE_URL:
    # Fallback to frontend/.env value
    with open('/app/frontend/.env') as f:
        for line in f:
            if line.startswith('REACT_APP_BACKEND_URL='):
                BASE_URL = line.split('=', 1)[1].strip().rstrip('/')
                break

USER_EMAIL = "user@demo.com"
USER_PASSWORD = "User@123"
ADMIN_EMAIL = "admin@abundant.com"
ADMIN_PASSWORD = "Admin@12345"


def _login(email, password):
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": email, "password": password})
    return r


@pytest.fixture(scope="module")
def user_token():
    r = _login(USER_EMAIL, USER_PASSWORD)
    if r.status_code != 200:
        pytest.skip(f"Cannot login demo user: {r.status_code} {r.text}")
    return r.json()["access_token"]


@pytest.fixture
def auth_headers(user_token):
    return {"Authorization": f"Bearer {user_token}", "Content-Type": "application/json"}


# ---------------- Regression: existing auth endpoints ----------------

class TestAuthRegression:
    def test_login_success(self):
        r = _login(USER_EMAIL, USER_PASSWORD)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["email"] == USER_EMAIL
        assert "access_token" in data and data["access_token"]
        assert data["role"] == "customer"

    def test_login_invalid(self):
        r = _login(USER_EMAIL, "wrong-pass")
        assert r.status_code == 401

    def test_me(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200, r.text
        assert r.json()["email"] == USER_EMAIL

    def test_me_unauth(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_logout(self):
        r = requests.post(f"{BASE_URL}/api/auth/logout")
        assert r.status_code == 200
        assert r.json().get("ok") is True

    def test_register_existing(self):
        r = requests.post(f"{BASE_URL}/api/auth/register",
                          json={"email": USER_EMAIL, "name": "demo", "password": "Whatever@123"})
        assert r.status_code == 400


# ---------------- PATCH /auth/profile ----------------

class TestProfileUpdate:
    def test_unauth_returns_401(self):
        r = requests.patch(f"{BASE_URL}/api/auth/profile", json={"name": "Hacker"})
        assert r.status_code == 401

    def test_empty_name_rejected(self, auth_headers):
        # Pydantic min_length=1 -> 422
        r = requests.patch(f"{BASE_URL}/api/auth/profile", headers=auth_headers, json={"name": ""})
        assert r.status_code in (400, 422), r.text

    def test_whitespace_only_name_rejected(self, auth_headers):
        # Backend strips and raises 400
        r = requests.patch(f"{BASE_URL}/api/auth/profile", headers=auth_headers, json={"name": "    "})
        assert r.status_code == 400, r.text

    def test_update_name_success(self, auth_headers):
        # Get original
        me = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers).json()
        original_name = me["name"]
        new_name = "TEST_Demo User"
        try:
            r = requests.patch(f"{BASE_URL}/api/auth/profile", headers=auth_headers, json={"name": new_name})
            assert r.status_code == 200, r.text
            assert r.json()["name"] == new_name
            # Verify persisted via /me
            me2 = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers).json()
            assert me2["name"] == new_name
        finally:
            # Restore
            requests.patch(f"{BASE_URL}/api/auth/profile", headers=auth_headers, json={"name": original_name})


# ---------------- POST /auth/change-password ----------------

class TestChangePassword:
    """Each test restores password to USER_PASSWORD at the end."""

    def _restore(self, token, from_pw):
        """Try to restore back to USER_PASSWORD."""
        if from_pw == USER_PASSWORD:
            return
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
        requests.post(f"{BASE_URL}/api/auth/change-password", headers=headers,
                      json={"current_password": from_pw, "new_password": USER_PASSWORD})

    def test_wrong_current_password(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=auth_headers,
                          json={"current_password": "WrongPass123!", "new_password": "Newpass@1234"})
        assert r.status_code == 400
        assert "incorrect" in r.json().get("detail", "").lower()

    def test_short_new_password(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=auth_headers,
                          json={"current_password": USER_PASSWORD, "new_password": "short"})
        assert r.status_code == 422

    def test_same_as_current(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=auth_headers,
                          json={"current_password": USER_PASSWORD, "new_password": USER_PASSWORD})
        assert r.status_code == 400
        assert "different" in r.json().get("detail", "").lower()

    def test_change_password_flow(self):
        # login fresh
        r = _login(USER_EMAIL, USER_PASSWORD)
        assert r.status_code == 200
        token = r.json()["access_token"]
        headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

        new_pw = "NewTempPw@2026"
        try:
            # Change password
            r = requests.post(f"{BASE_URL}/api/auth/change-password", headers=headers,
                              json={"current_password": USER_PASSWORD, "new_password": new_pw})
            assert r.status_code == 200, r.text
            assert r.json().get("ok") is True

            # Old password should fail
            r_old = _login(USER_EMAIL, USER_PASSWORD)
            assert r_old.status_code == 401

            # New password should work
            r_new = _login(USER_EMAIL, new_pw)
            assert r_new.status_code == 200
        finally:
            # Restore to original password
            r_new = _login(USER_EMAIL, new_pw)
            if r_new.status_code == 200:
                new_token = r_new.json()["access_token"]
                new_headers = {"Authorization": f"Bearer {new_token}", "Content-Type": "application/json"}
                restore = requests.post(f"{BASE_URL}/api/auth/change-password", headers=new_headers,
                                        json={"current_password": new_pw, "new_password": USER_PASSWORD})
                assert restore.status_code == 200, f"FAILED TO RESTORE PASSWORD: {restore.text}"
            # Sanity check
            sanity = _login(USER_EMAIL, USER_PASSWORD)
            assert sanity.status_code == 200, "Demo password not restored to User@123!"

import sys
from pathlib import Path

import bcrypt
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

# isort: off
from app.db import Base, SessionLocal, engine  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402
# isort: on


DEMO_PASSWORD = "Demo@123"


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        users = [
            User(
                username="citizen1",
                password_hash=bcrypt.hashpw(
                    DEMO_PASSWORD.encode(),
                    bcrypt.gensalt(),
                ).decode(),
                role="citizen",
                master_id="SETU-CIT-000001",
                display_name="Citizen User",
            ),
            User(
                username="officer1",
                password_hash=bcrypt.hashpw(
                    DEMO_PASSWORD.encode(),
                    bcrypt.gensalt(),
                ).decode(),
                role="officer",
                display_name="BSS Officer",
            ),
            User(
                username="admin1",
                password_hash=bcrypt.hashpw(
                    DEMO_PASSWORD.encode(),
                    bcrypt.gensalt(),
                ).decode(),
                role="admin",
                display_name="SETU Administrator",
            ),
        ]
        db.add_all(users)
        db.commit()
    finally:
        db.close()


def test_login_success():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={
                "username": "officer1",
                "password": DEMO_PASSWORD,
            },
        )

    assert response.status_code == 200

    body = response.json()
    assert body["token_type"] == "bearer"
    assert body["expires_in"] == 8 * 60 * 60
    assert body["access_token"]
    assert body["user"]["username"] == "officer1"
    assert body["user"]["role"] == "officer"
    assert body["user"]["locale"] == "en-IN"


def test_login_wrong_password_returns_401():
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={
                "username": "officer1",
                "password": "wrong-password",
            },
        )

    assert response.status_code == 401
    assert response.json()["detail"]["error"]["code"] == "AUTH_REQUIRED"


def test_sso_token_requires_officer_or_admin():
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={
                "username": "citizen1",
                "password": DEMO_PASSWORD,
            },
        )

        token = login.json()["access_token"]

        response = client.post(
            "/api/auth/sso-token",
            headers={"Authorization": f"Bearer {token}"},
            json={"audience": "bss"},
        )

    assert response.status_code == 403
    assert response.json()["detail"]["error"]["code"] == "FORBIDDEN"


def test_officer_can_issue_bss_sso_token(monkeypatch):
    monkeypatch.setenv("BSS_BASE_URL", "https://bss.example.test")
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={
                "username": "officer1",
                "password": DEMO_PASSWORD,
            },
        )

        token = login.json()["access_token"]

        response = client.post(
            "/api/auth/sso-token",
            headers={"Authorization": f"Bearer {token}"},
            json={"audience": "bss"},
        )

    assert response.status_code == 200

    body = response.json()
    assert body["expires_in"] == 5 * 60
    assert body["url"].startswith(
        "https://bss.example.test/sso?token="
    )



def test_sso_token_requires_bss_base_url(monkeypatch):
    monkeypatch.delenv("BSS_BASE_URL", raising=False)

    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={
                "username": "officer1",
                "password": DEMO_PASSWORD,
            },
        )

        token = login.json()["access_token"]

        try:
            client.post(
                "/api/auth/sso-token",
                headers={"Authorization": f"Bearer {token}"},
                json={"audience": "bss"},
            )
        except RuntimeError as exc:
            assert str(exc) == "BSS_BASE_URL is required"
        else:
            raise AssertionError(
                "Missing BSS_BASE_URL must fail explicitly"
            )



def test_sso_token_rejects_wrong_audience():
    with TestClient(app) as client:
        login = client.post(
            "/api/auth/login",
            json={
                "username": "officer1",
                "password": DEMO_PASSWORD,
            },
        )

        token = login.json()["access_token"]

        response = client.post(
            "/api/auth/sso-token",
            headers={"Authorization": f"Bearer {token}"},
            json={"audience": "not-bss"},
        )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == "VALIDATION_ERROR"

import os
import sys
from pathlib import Path

from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

ROOT = Path(__file__).resolve().parents[2]

os.environ["SETU_SSO_SECRET"] = "test-sso-secret"
os.environ["BSS_BASE_URL"] = "https://bss.example.test"
os.environ["SETU_DEFAULT_LOCALE"] = "en-IN"

if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from app.api import auth as auth_api  # noqa: E402
from app.db import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models import User  # noqa: E402

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

TestSessionLocal = sessionmaker(
    bind=TEST_ENGINE,
    autoflush=False,
    autocommit=False,
    expire_on_commit=False,
)

client = TestClient(app)


def setup_function():
    Base.metadata.drop_all(TEST_ENGINE)
    Base.metadata.create_all(TEST_ENGINE)

    auth_api.SessionLocal = TestSessionLocal

    with TestSessionLocal() as db:
        db.add(
            User(
                username="existing.user",
                password_hash=auth_api._hash_password("Demo@123"),
                role="citizen",
                display_name="Existing User",
                master_id="SETU-CIT-000001",
            )
        )
        db.commit()


def test_register_creates_real_citizen_account():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "new.citizen",
            "display_name": "New Citizen",
            "password": "Secure@123",
        },
    )

    assert response.status_code == 201

    body = response.json()

    assert body["access_token"]
    assert body["user"]["username"] == "new.citizen"
    assert body["user"]["role"] == "citizen"
    assert body["user"]["display_name"] == "New Citizen"
    assert body["user"]["master_id"].startswith("SETU-CIT-")

    with TestSessionLocal() as db:
        user = (
            db.query(User)
            .filter(User.username == "new.citizen")
            .first()
        )

        assert user is not None
        assert user.role == "citizen"
        assert user.master_id.startswith("SETU-CIT-")
        assert user.password_hash != "Secure@123"
        assert auth_api._verify_password(
            "Secure@123",
            user.password_hash,
        )


def test_registered_account_can_login():
    register = client.post(
        "/api/auth/register",
        json={
            "username": "login.after.registration",
            "display_name": "Registered Citizen",
            "password": "Secure@123",
        },
    )

    assert register.status_code == 201

    login = client.post(
        "/api/auth/login",
        json={
            "username": "login.after.registration",
            "password": "Secure@123",
        },
    )

    assert login.status_code == 200

    body = login.json()

    assert body["user"]["username"] == "login.after.registration"
    assert body["user"]["role"] == "citizen"
    assert body["access_token"]


def test_duplicate_username_is_rejected():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "existing.user",
            "display_name": "Another User",
            "password": "Secure@123",
        },
    )

    assert response.status_code == 409

    body = response.json()

    assert body["detail"]["error"]["code"] == "USERNAME_TAKEN"


def test_invalid_registration_payload_is_rejected():
    response = client.post(
        "/api/auth/register",
        json={
            "username": "ab",
            "display_name": "A",
            "password": "short",
        },
    )

    assert response.status_code == 422

# ruff: noqa: E402
from __future__ import annotations

import sys
from pathlib import Path

import bcrypt
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from app.db import Base, SessionLocal, engine
from app.main import app
from app.models import AccessLog, JourneyDef, System, User


@pytest.fixture(autouse=True)
def test_environment(monkeypatch):
    monkeypatch.setenv("SETU_SSO_SECRET", "test-sso-secret")
    monkeypatch.setenv("SETU_DEFAULT_LOCALE", "en-IN")
DEMO_PASSWORD = "Demo@123"


def setup_function():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)

    db = SessionLocal()
    try:
        db.add(
            User(
                username="admin",
                password_hash=bcrypt.hashpw(
                    DEMO_PASSWORD.encode(),
                    bcrypt.gensalt(),
                ).decode(),
                role="admin",
                display_name="SETU Administrator",
            )
        )

        db.add(
            System(
                code="REV",
                name="Revenue Department",
                owner_department="Revenue & Forest",
                protocol="REST",
                id_scheme="REV-TEST",
                auth_type="none",
                health="UP",
                simulate_down=False,
            )
        )

        db.flush()
        db.add(
            AccessLog(
                master_id="SETU-CIT-000001",
                system_code="REV",
                purpose="scholarship_eligibility",
                fields_json=["income_certificate.annual_income_inr"],
                application_id=None,
                outcome="DENIED",
            )
        )

        db.add(
            JourneyDef(
                id="youth_enterprise_v1",
                version=1,
                name="Youth Enterprise Support",
                status="ACTIVE",
                definition_json={
                    "consent_purpose": "youth_enterprise_eligibility",
                    "steps": [
                        {
                            "id": "fetch_training",
                            "type": "fetch",
                            "connector": "skl_training",
                            "entity": "training_record",
                            "configured": True,
                        }
                    ],
                },
            )
        )

        db.commit()
    finally:
        db.close()


def admin_headers(client: TestClient) -> dict[str, str]:
    response = client.post(
        "/api/auth/login",
        json={
            "username": "admin",
            "password": DEMO_PASSWORD,
        },
    )
    assert response.status_code == 200

    token = response.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}


def test_admin_access_log_listing():
    with TestClient(app) as client:
        headers = admin_headers(client)

        response = client.get(
            "/api/audit?limit=50&offset=0",
            headers=headers,
        )

    assert response.status_code == 200

    body = response.json()
    assert body["total"] == 1
    assert body["limit"] == 50
    assert body["offset"] == 0
    assert body["items"][0] == {
        "id": 1,
        "at": body["items"][0]["at"],
        "system_code": "REV",
        "purpose": "scholarship_eligibility",
        "fields": ["income_certificate.annual_income_inr"],
        "application_id": None,
        "outcome": "DENIED",
    }


def test_admin_journey_listing():
    with TestClient(app) as client:
        headers = admin_headers(client)

        response = client.get(
            "/api/journeys",
            headers=headers,
        )

    assert response.status_code == 200

    body = response.json()
    assert len(body) == 1
    assert body[0]["id"] == "youth_enterprise_v1"
    assert body[0]["name"] == "Youth Enterprise Support"
    assert body[0]["version"] == 1
    assert body[0]["status"] == "ACTIVE"
    assert body[0]["steps"][0]["id"] == "fetch_training"
    assert body[0]["steps"][0]["configured"] is True

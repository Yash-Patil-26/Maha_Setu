from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

import bcrypt
import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api import applications as applications_api  # noqa: E402
from app.api import auth as auth_api  # noqa: E402
from app.api import consents as consents_api  # noqa: E402
from app.api import systems as systems_api  # noqa: E402
from app.api import webhook as webhook_api  # noqa: E402
from app.db import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models import (  # noqa: E402
    Application,
    ApplicationStep,
    Consent,
    JourneyDef,
    User,
)

DEMO_PASSWORD = "Demo@123"

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


@pytest.fixture(autouse=True)
def test_environment(monkeypatch):
    monkeypatch.setenv("SETU_SSO_SECRET", "test-sso-secret")
    monkeypatch.setenv("SETU_DEFAULT_LOCALE", "en-IN")
    monkeypatch.setenv("BSS_BASE_URL", "https://bss.example.test")

    for module in (
        applications_api,
        auth_api,
        consents_api,
        systems_api,
        webhook_api,
    ):
        monkeypatch.setattr(
            module,
            "SessionLocal",
            TestSessionLocal,
        )


@pytest.fixture(autouse=True)
def clean_database():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)

    db = TestSessionLocal()
    try:
        db.add(
            User(
                username="rahul.patil",
                password_hash=bcrypt.hashpw(
                    DEMO_PASSWORD.encode(),
                    bcrypt.gensalt(),
                ).decode(),
                role="citizen",
                master_id="SETU-CIT-000001",
                display_name="Rahul Patil",
                full_name="Rahul Patil",
                dob="2004-03-04",
                mobile="9876543210",
            )
        )

        db.add(
            User(
                username="officer1",
                password_hash=bcrypt.hashpw(
                    DEMO_PASSWORD.encode(),
                    bcrypt.gensalt(),
                ).decode(),
                role="officer",
                display_name="BSS Officer",
            )
        )

        db.add(
            JourneyDef(
                id="scholarship_v1",
                version=1,
                name="Post-Matric Scholarship",
                status="ACTIVE",
                definition_json={
                    "consent_purpose": "scholarship_eligibility",
                    "steps": [],
                },
            )
        )

        db.add(
            Consent(
                master_id="SETU-CIT-000001",
                purpose="scholarship_eligibility",
                journey_id="scholarship_v1",
                fields_json=["identity_lookup", "income"],
                source_systems_json=["REV", "EDU"],
                granted_at=datetime.now(timezone.utc),
                expires_at=datetime.now(timezone.utc) + timedelta(days=30),
                status="ACTIVE",
            )
        )

        db.commit()
    finally:
        db.close()


def login(username: str) -> str:
    with TestClient(app) as client:
        response = client.post(
            "/api/auth/login",
            json={
                "username": username,
                "password": DEMO_PASSWORD,
            },
        )

    assert response.status_code == 200
    return response.json()["access_token"]


def test_create_application_requires_consent(monkeypatch):
    db = TestSessionLocal()
    try:
        db.query(Consent).delete()
        db.commit()
    finally:
        db.close()

    token = login("rahul.patil")

    with TestClient(app) as client:
        response = client.post(
            "/api/applications",
            json={"journey_id": "scholarship_v1"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert response.json()["detail"]["error"]["code"] == "CONSENT_REQUIRED"


def test_create_application_calls_journey_engine(monkeypatch):
    def fake_execute(db, application_id):
        application = db.get(Application, application_id)
        assert application is not None

        application.status = "SUBMITTED"
        application.current_step = "await_decision"
        application.outcome = "ELIGIBLE"

        db.add(
            ApplicationStep(
                application_id=application.id,
                step_id="fake",
                status="DONE",
                attempts=1,
                output_json={"ok": True},
            )
        )
        db.commit()
        db.refresh(application)
        return application

    monkeypatch.setattr(
        "app.api.applications.execute_application",
        fake_execute,
    )

    token = login("rahul.patil")

    with TestClient(app) as client:
        response = client.post(
            "/api/applications",
            json={"journey_id": "scholarship_v1"},
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 202

    body = response.json()
    assert body["application_id"] > 0
    assert body["status"] == "SUBMITTED"
    assert body["correlation_id"].startswith("SETU-")


def test_citizen_can_read_own_application(monkeypatch):
    application = Application(
        journey_id="scholarship_v1",
        journey_version=1,
        master_id="SETU-CIT-000001",
        status="SUBMITTED",
        current_step="await_decision",
        correlation_id="SETU-test-read-001",
        outcome="ELIGIBLE",
        canonical_json={
            "income_certificate": {
                "annual_income_inr": 210000,
            }
        },
        external_refs_json={
            "BSS": "BSS-2026-000045",
        },
        metrics_json={
            "fields_total": 1,
            "fields_autofilled": 1,
            "provenance": {
                "income_certificate.annual_income_inr": {
                    "source_system": "REV",
                }
            },
        },
    )

    db = TestSessionLocal()
    try:
        db.add(application)
        db.commit()
        db.refresh(application)

        db.add(
            ApplicationStep(
                application_id=application.id,
                step_id="fetch_income",
                status="DONE",
                attempts=1,
                output_json={"eligible": True, "reasons": []},
            )
        )
        db.commit()
        application_id = application.id
    finally:
        db.close()

    token = login("rahul.patil")

    with TestClient(app) as client:
        response = client.get(
            f"/api/applications/{application_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 200

    body = response.json()
    assert body["id"] == application_id
    assert body["applicant_name"] == "Rahul Patil"
    assert body["status"] == "SUBMITTED"
    assert body["external_refs"]["BSS"] == "BSS-2026-000045"
    assert body["steps"][0]["step_id"] == "fetch_income"


def test_citizen_cannot_read_other_application():
    db = TestSessionLocal()
    try:
        db.add(
            Application(
                journey_id="scholarship_v1",
                journey_version=1,
                master_id="SETU-CIT-999999",
                status="SUBMITTED",
                correlation_id="SETU-test-owner-001",
            )
        )
        db.commit()
        application_id = (
            db.query(Application)
            .filter_by(correlation_id="SETU-test-owner-001")
            .one()
            .id
        )
    finally:
        db.close()

    token = login("rahul.patil")

    with TestClient(app) as client:
        response = client.get(
            f"/api/applications/{application_id}",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 403
    assert response.json()["detail"]["error"]["code"] == "FORBIDDEN"


def test_officer_can_retry_paused_application(monkeypatch):
    db = TestSessionLocal()
    try:
        db.add(
            Application(
                journey_id="scholarship_v1",
                journey_version=1,
                master_id="SETU-CIT-000001",
                status="PAUSED_EXCEPTION",
                current_step="fetch_income",
                correlation_id="SETU-retry-001",
            )
        )
        db.commit()

        application = (
            db.query(Application).filter_by(correlation_id="SETU-retry-001").one()
        )

        db.add(
            ApplicationStep(
                application_id=application.id,
                step_id="fetch_income",
                status="FAILED",
                attempts=1,
                error_code="CONNECTOR_ERROR",
                error_detail="REV unavailable",
                output_json={},
            )
        )
        db.commit()
        application_id = application.id
    finally:
        db.close()

    def fake_retry(db, application_id):
        application = db.get(Application, application_id)
        application.status = "IN_PROGRESS"
        db.commit()
        db.refresh(application)
        return application

    monkeypatch.setattr(
        "app.api.applications.retry_application",
        fake_retry,
    )

    token = login("officer1")

    with TestClient(app) as client:
        response = client.post(
            f"/api/applications/{application_id}/retry",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert response.status_code == 202
    assert response.json()["status"] == "IN_PROGRESS"

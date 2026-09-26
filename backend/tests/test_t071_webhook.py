from __future__ import annotations

import hashlib
import hmac
import json
import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app.api import webhook as webhook_api  # noqa: E402
from app.db import Base  # noqa: E402
from app.main import app  # noqa: E402
from app.models import Application, ApplicationStep  # noqa: E402

WEBHOOK_SECRET = "test-webhook-secret"

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
def webhook_environment(monkeypatch):
    monkeypatch.setenv(
        "WEBHOOK_HMAC_SECRET_BSS",
        WEBHOOK_SECRET,
    )
    monkeypatch.setattr(
        webhook_api,
        "SessionLocal",
        TestSessionLocal,
    )


def setup_function():
    Base.metadata.drop_all(bind=TEST_ENGINE)
    Base.metadata.create_all(bind=TEST_ENGINE)

    db = TestSessionLocal()
    try:
        application = Application(
            journey_id="scholarship_v1",
            journey_version=1,
            master_id="SETU-CIT-000001",
            status="SUBMITTED",
            current_step="await_decision",
            correlation_id="corr-t071-001",
            outcome="ELIGIBLE",
            canonical_json={},
            external_refs_json={
                "BSS": "BSS-2026-000045",
            },
            metrics_json={},
        )

        db.add(application)
        db.commit()
        db.refresh(application)

        db.add(
            ApplicationStep(
                application_id=application.id,
                step_id="await_decision",
                status="WAITING",
                attempts=1,
                output_json={},
            )
        )

        db.commit()
    finally:
        db.close()


def _payload(
    *,
    event_id: str = "evt-7f3a",
    decision: str = "APPROVED",
    remarks: str = "Verified",
) -> dict:
    return {
        "specversion": "1.0",
        "id": event_id,
        "source": "bss",
        "type": "bss.application.decided",
        "subject": "BSS-2026-000045",
        "time": "2026-09-21T10:15:00Z",
        "data": {
            "decision": decision,
            "remarks": remarks,
        },
    }


def _signed_headers(body: bytes) -> dict[str, str]:
    signature = hmac.new(
        WEBHOOK_SECRET.encode("utf-8"),
        body,
        hashlib.sha256,
    ).hexdigest()

    return {
        "Content-Type": "application/json",
        "X-Signature": f"sha256={signature}",
    }


def _read_application() -> Application:
    db = TestSessionLocal()
    try:
        application = (
            db.query(Application)
            .filter_by(correlation_id="corr-t071-001")
            .one()
        )
        db.expunge(application)
        return application
    finally:
        db.close()


def test_webhook_accepts_approved_event_and_resumes_waiting_step():
    body = json.dumps(_payload()).encode("utf-8")

    with TestClient(app) as client:
        response = client.post(
            "/webhooks/BSS",
            content=body,
            headers=_signed_headers(body),
        )

    assert response.status_code == 202
    assert response.json() == {"status": "accepted"}

    application = _read_application()

    assert application.status == "APPROVED"
    assert application.outcome == "APPROVED"

    metrics = application.metrics_json
    assert metrics["webhook_event_ids"] == ["evt-7f3a"]
    assert metrics["last_webhook"]["decision"] == "APPROVED"
    assert metrics["last_webhook_notification"]["event_id"] == "evt-7f3a"

    db = TestSessionLocal()
    try:
        step = (
            db.query(ApplicationStep)
            .filter_by(
                application_id=application.id,
                step_id="await_decision",
            )
            .one()
        )
        assert step.status == "DONE"
        assert step.output_json["decision"] == "APPROVED"
    finally:
        db.close()


def test_duplicate_event_is_idempotent():
    first_body = json.dumps(_payload()).encode("utf-8")

    with TestClient(app) as client:
        first = client.post(
            "/webhooks/BSS",
            content=first_body,
            headers=_signed_headers(first_body),
        )

        second_payload = _payload(
            decision="REJECTED",
            remarks="Changed payload must not be replayed",
        )
        second_body = json.dumps(second_payload).encode("utf-8")

        second = client.post(
            "/webhooks/BSS",
            content=second_body,
            headers=_signed_headers(second_body),
        )

    assert first.status_code == 202
    assert second.status_code == 200
    assert second.json() == {"status": "duplicate"}

    application = _read_application()

    assert application.status == "APPROVED"
    assert application.metrics_json["webhook_event_ids"] == ["evt-7f3a"]


def test_bad_signature_returns_signature_invalid():
    body = json.dumps(_payload()).encode("utf-8")

    with TestClient(app) as client:
        response = client.post(
            "/webhooks/BSS",
            content=body,
            headers={
                "Content-Type": "application/json",
                "X-Signature": "sha256=invalid",
            },
        )

    assert response.status_code == 401
    assert response.json()["error"]["code"] == "SIGNATURE_INVALID"


def test_unknown_bss_reference_returns_not_found():
    payload = _payload()
    payload["subject"] = "BSS-DOES-NOT-EXIST"
    body = json.dumps(payload).encode("utf-8")

    with TestClient(app) as client:
        response = client.post(
            "/webhooks/BSS",
            content=body,
            headers=_signed_headers(body),
        )

    assert response.status_code == 404
    assert response.json()["error"]["code"] == "NOT_FOUND"


def test_invalid_decision_is_rejected():
    payload = _payload(decision="PENDING")
    body = json.dumps(payload).encode("utf-8")

    with TestClient(app) as client:
        response = client.post(
            "/webhooks/BSS",
            content=body,
            headers=_signed_headers(body),
        )

    assert response.status_code == 400
    assert response.json()["error"]["code"] == "VALIDATION_ERROR"

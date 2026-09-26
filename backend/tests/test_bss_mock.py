from __future__ import annotations

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT) not in sys.path:
    sys.path.insert(0, str(ROOT))

from mock_systems.bss import main as bss_main  # noqa: E402

client = TestClient(bss_main.app)


@pytest.fixture(autouse=True)
def reset_bss_state(monkeypatch):
    monkeypatch.setattr(bss_main, "BSS_API_TOKEN", "change-me")
    monkeypatch.setattr(
        bss_main,
        "WEBHOOK_HMAC_SECRET_BSS",
        "test-webhook-secret",
    )
    bss_main.applications.clear()
    bss_main.idempotency_store.clear()
    bss_main.next_bss_number = 1


def test_bss_health():
    response = client.get("/health")

    assert response.status_code == 200
    assert response.json() == {
        "system": "BSS",
        "status": "ok",
    }


def test_bss_submit_and_idempotency():
    payload = {
        "applicant": {
            "master_id": "MID-2026-0001",
            "full_name": "Patil Rahul Suresh",
            "dob": "2005-07-15",
            "mobile": "9876543210",
        },
        "scheme_code": "SCHOL-PM",
        "data": {
            "annual_income_inr": 210000,
        },
        "correlation_id": "11111111-1111-1111-1111-111111111111",
    }

    headers = {
        "Authorization": "Bearer change-me",
        "Idempotency-Key": "1:submit_bss",
    }

    first = client.post(
        "/api/schemes/SCHOL-PM/applications",
        json=payload,
        headers=headers,
    )

    assert first.status_code == 201
    first_body = first.json()

    assert first_body["status"] == "RECEIVED"
    assert first_body["bss_ref"].startswith("BSS-2026-")

    second = client.post(
        "/api/schemes/SCHOL-PM/applications",
        json=payload,
        headers=headers,
    )

    assert second.status_code == 200
    assert second.json() == first_body


def test_bss_rejects_bad_token():
    response = client.post(
        "/api/schemes/SCHOL-PM/applications",
        json={
            "applicant": {
                "master_id": "MID-2026-0001",
                "full_name": "Patil Rahul Suresh",
                "dob": "2005-07-15",
                "mobile": "9876543210",
            },
            "scheme_code": "SCHOL-PM",
            "data": {},
            "correlation_id": "11111111-1111-1111-1111-111111111111",
        },
        headers={
            "Authorization": "Bearer wrong-token",
            "Idempotency-Key": "2:submit_bss",
        },
    )

    assert response.status_code == 401


def _submit_test_application() -> str:
    response = client.post(
        "/api/schemes/SCHOL-PM/applications",
        json={
            "applicant": {
                "master_id": "SETU-CIT-000001",
                "full_name": "Rahul Suresh Patil",
                "dob": "2004-03-04",
                "mobile": "9876543210",
            },
            "scheme_code": "SCHOL-PM",
            "data": {
                "annual_income_inr": 210000,
            },
            "correlation_id": "test-t022-correlation",
        },
        headers={
            "Authorization": "Bearer change-me",
            "Idempotency-Key": "t022:test-submit",
        },
    )

    assert response.status_code == 201
    return response.json()["bss_ref"]


def test_officer_decision_requires_officer_session(monkeypatch):
    bss_ref = _submit_test_application()

    monkeypatch.setattr(
        bss_main,
        "send_decision_webhook",
        lambda *args, **kwargs: None,
    )

    response = client.post(
        f"/officer/applications/{bss_ref}/decision",
        data={
            "decision": "APPROVED",
            "remarks": "Verified",
        },
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "AUTH_REQUIRED"


def test_officer_decision_sends_signed_webhook(monkeypatch):
    import hashlib
    import hmac
    import json

    bss_ref = _submit_test_application()
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["body"] = kwargs["content"]
        captured["headers"] = kwargs["headers"]

    monkeypatch.setattr(bss_main.httpx, "post", fake_post)

    response = client.post(
        f"/officer/applications/{bss_ref}/decision",
        data={
            "decision": "APPROVED",
            "remarks": "Documents verified",
        },
        cookies={
            "bss_officer": "1",
        },
    )

    assert response.status_code == 200
    assert response.json()["status"] == "APPROVED"

    body = captured["body"]
    headers = captured["headers"]

    expected_signature = (
        "sha256="
        + hmac.new(
            bss_main.WEBHOOK_HMAC_SECRET_BSS.encode("utf-8"),
            body,
            hashlib.sha256,
        ).hexdigest()
    )

    assert headers["X-Signature"] == expected_signature

    payload = json.loads(body)

    assert payload["specversion"] == "1.0"
    assert payload["source"] == "bss"
    assert payload["type"] == "bss.application.decided"
    assert payload["subject"] == bss_ref
    assert payload["data"]["decision"] == "APPROVED"
    assert payload["data"]["remarks"] == "Documents verified"

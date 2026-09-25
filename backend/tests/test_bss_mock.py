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
def mock_bss_api_token(monkeypatch):
    monkeypatch.setattr(bss_main, "BSS_API_TOKEN", "change-me")


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

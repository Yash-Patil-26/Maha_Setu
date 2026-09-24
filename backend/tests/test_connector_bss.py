from __future__ import annotations

import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from app.connectors.rest_json import RestJsonConnector  # noqa: E402


def make_bss_connector() -> RestJsonConnector:
    return RestJsonConnector(
        connector_id=3,
        system_code="BSS",
        name="bss_scholarship",
        entity="application",
        config={
            "base_url": "http://testserver",
            "path_template": (
                "/api/schemes/{scheme_code}/applications"
            ),
            "auth": {
                "type": "bearer",
                "secret_ref": "BSS_API_TOKEN",
            },
            "timeout_seconds": 10,
        },
        lookup={},
        mapping={},
    )


def test_bss_submit_builds_expected_request(monkeypatch) -> None:
    monkeypatch.setenv("BSS_API_TOKEN", "test-bss-token")

    captured: dict[str, object] = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["json"] = kwargs["json"]
        captured["headers"] = kwargs["headers"]
        captured["timeout"] = kwargs["timeout"]

        return httpx.Response(
            201,
            json={
                "bss_ref": "BSS-2026-000045",
                "status": "RECEIVED",
            },
        )

    monkeypatch.setattr("httpx.post", fake_post)

    connector = make_bss_connector()

    result = connector.submit(
        applicant={
            "master_id": "SETU-CIT-000001",
            "full_name": "Rahul Suresh Patil",
            "dob": "2004-03-04",
            "mobile": "9876543210",
        },
        scheme_code="SCHOL-PM",
        data={
            "income_certificate": {
                "cert_no": "MH-INC-2026-000123",
                "annual_income_inr": 210000,
            }
        },
        application_id=12,
        step_id="submit_bss",
        correlation_id="test-correlation-id",
    )

    assert captured["url"] == (
        "http://testserver/api/schemes/SCHOL-PM/applications"
    )

    headers = captured["headers"]

    assert headers["Authorization"] == "Bearer test-bss-token"
    assert headers["Idempotency-Key"] == "12:submit_bss"
    assert headers["Content-Type"] == "application/json"
    assert headers["Accept"] == "application/json"

    payload = captured["json"]

    assert payload["applicant"]["master_id"] == "SETU-CIT-000001"
    assert payload["scheme_code"] == "SCHOL-PM"
    assert payload["correlation_id"] == "test-correlation-id"

    assert result["entity"] == "application"
    assert result["source_system"] == "BSS"
    assert result["connector_id"] == 3
    assert result["external_id"] == "BSS-2026-000045"
    assert result["record"] == {
        "bss_ref": "BSS-2026-000045",
        "status": "RECEIVED",
    }


def test_bss_submit_requires_token(monkeypatch) -> None:
    monkeypatch.delenv("BSS_API_TOKEN", raising=False)

    connector = make_bss_connector()

    try:
        connector.submit(
            applicant={
                "master_id": "SETU-CIT-000001",
            },
            scheme_code="SCHOL-PM",
            data={},
            application_id=12,
            step_id="submit_bss",
            correlation_id="test",
        )
    except Exception as exc:
        assert "BSS_API_TOKEN" in str(exc)
    else:
        raise AssertionError("Expected missing-token error")

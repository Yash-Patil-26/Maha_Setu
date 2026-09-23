import sys
from pathlib import Path

from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from mock_systems.rev.main import app

client = TestClient(app)


def test_rev_income_certificate():
    response = client.get(
        "/certificates",
        params={
            "type": "INCOME",
            "mobile": "9876543210",
            "dob": "04/03/2004",
        },
        headers={"X-API-Key": "change-me"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert "<Status>FOUND</Status>" in response.text
    assert "MH-INC-2026-000123" in response.text


def test_rev_caste_certificate():
    response = client.get(
        "/certificates",
        params={
            "type": "CASTE",
            "mobile": "9876543210",
            "dob": "04/03/2004",
        },
        headers={"X-API-Key": "change-me"},
    )

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/xml")
    assert "<Status>FOUND</Status>" in response.text
    assert "MH-CST-2024-004417" in response.text
    assert "<Category>OBC</Category>" in response.text


def test_rev_invalid_api_key():
    response = client.get(
        "/certificates",
        params={
            "type": "INCOME",
            "mobile": "9876543210",
            "dob": "04/03/2004",
        },
        headers={"X-API-Key": "wrong-key"},
    )

    assert response.status_code == 401


def test_rev_not_found():
    response = client.get(
        "/certificates",
        params={
            "type": "INCOME",
            "mobile": "9999999999",
            "dob": "01/01/2000",
        },
        headers={"X-API-Key": "change-me"},
    )

    assert response.status_code == 404
    assert response.headers["content-type"].startswith("application/xml")
    assert "<Status>NOT_FOUND</Status>" in response.text
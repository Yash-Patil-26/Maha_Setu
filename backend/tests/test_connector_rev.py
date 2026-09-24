import sys
from pathlib import Path
from uuid import uuid4

from fastapi.testclient import TestClient

ROOT = Path(__file__).resolve().parents[2]
if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

# isort: off
from app.connectors.rest_xml import RestXmlConnector  # noqa: E402
from mock_systems.rev.main import app as rev_app  # noqa: E402
# isort: on


def make_income_connector(base_url: str) -> RestXmlConnector:
    return RestXmlConnector(
        connector_id=3,
        system_code="REV",
        name="rev_income",
        entity="income_certificate",
        config={
            "base_url": base_url,
            "path": "/certificates",
            "api_key": "change-me",
            "timeout_seconds": 5,
        },
        lookup={
            "certificate_type": "INCOME",
        },
        mapping={
            "cert_no": {
                "source": "CertNo",
                "transform": "strip",
            },
            "holder_name": {
                "source": "Holder/Name",
                "transform": "title_case",
            },
            "annual_income_inr": {
                "source": "IncomeDetails/AnnualIncome",
                "transform": "to_int",
            },
            "issue_date": {
                "source": "IssueDate",
                "transform": {"date": "%d/%m/%Y"},
            },
            "valid_until": {
                "source": "ValidUntil",
                "transform": {"date": "%d/%m/%Y"},
            },
            "issuing_authority": {
                "source": "IssuingAuthority",
                "transform": "strip",
            },
        },
    )


def test_rev_income_connector_fetches_canonical_record(
    monkeypatch,
) -> None:
    with TestClient(rev_app) as client:

        connector = make_income_connector(
            "http://testserver",
        )

        monkeypatch.setattr(
            "httpx.get",
            lambda url, **kwargs: client.get(
                url.replace("http://testserver", ""),
                params=kwargs.get("params"),
                headers=kwargs.get("headers"),
            ),
        )

        result = connector.fetch(
            mobile="9876543210",
            dob="04/03/2004",
            correlation_id=str(uuid4()),
        )

    assert result["entity"] == "income_certificate"
    assert result["source_system"] == "REV"
    assert result["connector_id"] == 3

    assert result["record"] == {
        "cert_no": "MH-INC-2026-000123",
        "holder_name": "Patil Rahul Suresh",
        "annual_income_inr": 210000,
        "issue_date": "2026-04-15",
        "valid_until": "2027-04-14",
        "issuing_authority": "Tahsildar, Haveli",
    }

    assert result["warnings"] == []

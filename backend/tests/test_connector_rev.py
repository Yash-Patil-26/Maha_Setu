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
            "dob_format": "%d/%m/%Y",
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


def test_rev_income_connector_formats_iso_dob_for_legacy_api(
    monkeypatch,
) -> None:
    captured = {}

    class FakeResponse:
        status_code = 200
        headers = {"content-type": "application/xml"}
        content = b"""
        <CertificateResponse>
          <Status>FOUND</Status>
          <IncomeCertificate>
            <CertNo>MH-INC-2026-000501</CertNo>
            <Holder><Name>Bhagwat Shinde</Name></Holder>
            <IncomeDetails><AnnualIncome>1,80,000</AnnualIncome></IncomeDetails>
            <IssueDate>02/10/2026</IssueDate>
            <ValidUntil>01/10/2027</ValidUntil>
            <IssuingAuthority>Tahsildar, Haveli</IssuingAuthority>
          </IncomeCertificate>
        </CertificateResponse>
        """

    def fake_get(url, **kwargs):
        captured["params"] = kwargs["params"]
        return FakeResponse()

    monkeypatch.setattr("httpx.get", fake_get)

    connector = make_income_connector("http://testserver")
    connector.lookup["dob_format"] = "%d/%m/%Y"

    result = connector.fetch(
        mobile="7894561230",
        dob="2004-12-23",
        correlation_id=str(uuid4()),
    )

    assert captured["params"]["dob"] == "23/12/2004"
    assert result["record"]["cert_no"] == "MH-INC-2026-000501"


def test_rev_income_connector_fetches_canonical_record(
    monkeypatch,
) -> None:
    monkeypatch.setattr(
        "mock_systems.rev.main.REV_API_KEY",
        "change-me",
    )

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
            mobile="7894561230",
            dob="23/12/2004",
            correlation_id=str(uuid4()),
        )

    assert result["entity"] == "income_certificate"
    assert result["source_system"] == "REV"
    assert result["connector_id"] == 3

    assert result["record"] == {
        "cert_no": "MH-INC-2026-000501",
        "holder_name": "Bhagwat Shinde",
        "annual_income_inr": 180000,
        "issue_date": "2026-10-02",
        "valid_until": "2027-10-01",
        "issuing_authority": "Tahsildar, Haveli",
    }

    assert result["warnings"] == []

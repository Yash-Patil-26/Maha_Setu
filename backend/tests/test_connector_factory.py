from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.connectors.repository import get_connector
from app.connectors.rest_xml import RestXmlConnector
from app.db import Base
from app.models import Connector as ConnectorModel
from app.models import System


def test_active_rev_connector_is_loaded_from_sqlite() -> None:
    engine = create_engine("sqlite:///:memory:")

    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            System(
                code="REV",
                name="Revenue Department – Certificates",
                owner_department="Revenue & Forest",
                protocol="XML over HTTP",
                id_scheme="REV-<10 digits>",
                auth_type="api_key",
                health="UP",
                simulate_down=False,
            )
        )

        session.add(
            ConnectorModel(
                system_code="REV",
                name="rev_income",
                kind="REST_XML",
                entity="income_certificate",
                config_json={
                    "base_url": "http://127.0.0.1:8001",
                    "path": "/certificates",
                    "auth": {
                        "type": "api_key",
                        "secret_ref": "REV_API_KEY",
                    },
                    "timeout_seconds": 10,
                },
                lookup_json={
                    "certificate_type": "INCOME",
                },
                mapping_json={
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
                status="ACTIVE",
                version=1,
            )
        )

        session.commit()

        connector = get_connector(session, "rev_income")

        assert isinstance(connector, RestXmlConnector)
        assert connector.connector_id == 1
        assert connector.system_code == "REV"
        assert connector.name == "rev_income"
        assert connector.entity == "income_certificate"
        assert connector.config["path"] == "/certificates"
        assert connector.config["auth"]["type"] == "api_key"
        assert connector.config["auth"]["secret_ref"] == "REV_API_KEY"
        assert connector.lookup["certificate_type"] == "INCOME"

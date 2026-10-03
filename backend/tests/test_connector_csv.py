from __future__ import annotations

import sys
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.connectors.csv import CsvConnector
from app.connectors.repository import get_connector
from app.db import Base
from app.models import Connector as ConnectorModel
from app.models import System

CSV_PATH = Path("data_drop/skills_registry.csv")

SKL_MAPPING = {
    "trainee_id": {
        "source": "TRAINEE_ID",
        "transform": "strip",
    },
    "trainee_name": {
        "source": "TRAINEE_NAME",
        "transform": "title_case",
    },
    "dob": {
        "source": "DOB",
        "transform": {"date": "%d-%m-%Y"},
    },
    "course_code": {
        "source": "COURSE_CODE",
        "transform": "strip",
    },
    "course_name": {
        "source": "COURSE_NAME",
        "transform": "strip",
    },
    "completion_status": {
        "source": "COMPLETION",
        "transform": {
            "enum": {
                "Y": "COMPLETED",
                "N": "IN_PROGRESS",
                "D": "DROPPED",
            }
        },
    },
    "certificate_no": {
        "source": "CERT_NO",
        "transform": "strip",
    },
    "certificate_date": {
        "source": "CERT_DATE",
        "transform": {"date": "%d-%m-%Y"},
    },
}


def test_skl_csv_connector_fetches_bhagwat() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            System(
                code="SKL",
                name="Skills & Employment Registry",
                owner_department="Skills & Employment",
                protocol="CSV",
                id_scheme="SKL-YYYY-NNNN",
                auth_type="none",
                health="UP",
                simulate_down=False,
            )
        )

        session.add(
            ConnectorModel(
                system_code="SKL",
                name="skl_training",
                kind="CSV",
                entity="training_record",
                config_json={
                    "file": str(CSV_PATH),
                    "encoding": "utf-8-sig",
                    "delimiter": ",",
                },
                lookup_json={
                    "mobile_field": "MOBILE",
                    "dob_field": "DOB",
                    "dob_format": "%d-%m-%Y",
                },
                mapping_json=SKL_MAPPING,
                status="ACTIVE",
                version=1,
            )
        )

        session.commit()

        connector = get_connector(session, "skl_training")

        assert isinstance(connector, CsvConnector)

        result = connector.fetch(
            mobile="7894561230",
            dob="2004-12-23",
            correlation_id="test-skl-001",
        )

        assert result["entity"] == "training_record"
        assert result["source_system"] == "SKL"
        assert result["external_id"] == "SKL-2023-8841"
        assert result["record"] == {
            "trainee_id": "SKL-2023-8841",
            "trainee_name": "Bhagwat Shinde",
            "dob": "2004-12-23",
            "course_code": "ELEC-101",
            "course_name": "Electrical Technician",
            "completion_status": "COMPLETED",
            "certificate_no": "SKL-CERT-55102",
            "certificate_date": "2026-06-20",
        }


def test_skl_csv_connector_rejects_unknown_citizen() -> None:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        session.add(
            System(
                code="SKL",
                name="Skills & Employment Registry",
                owner_department="Skills & Employment",
                protocol="CSV",
                id_scheme="SKL-YYYY-NNNN",
                auth_type="none",
                health="UP",
                simulate_down=False,
            )
        )

        session.add(
            ConnectorModel(
                system_code="SKL",
                name="skl_training",
                kind="CSV",
                entity="training_record",
                config_json={"file": str(CSV_PATH)},
                lookup_json={
                    "mobile_field": "MOBILE",
                    "dob_field": "DOB",
                    "dob_format": "%d-%m-%Y",
                },
                mapping_json=SKL_MAPPING,
                status="ACTIVE",
                version=1,
            )
        )

        session.commit()

        connector = get_connector(session, "skl_training")

        try:
            connector.fetch(
                mobile="9999999999",
                dob="2002-11-12",
                correlation_id="test-skl-002",
            )
        except Exception as exc:
            assert "record not found" in str(exc).lower()
        else:
            raise AssertionError("Expected record-not-found failure")

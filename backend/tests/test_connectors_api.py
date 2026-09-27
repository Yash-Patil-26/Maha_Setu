from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

from fastapi.testclient import TestClient
from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.api.auth import get_current_user
from app.api.connectors import get_db
from app.db import Base
from app.main import app
from app.models import Connector, JourneyDef, System


def test_studio_skl_onboarding_flow(tmp_path: Path) -> None:
    csv_path = tmp_path / "skills_registry.csv"
    csv_path.write_text(
        (
            "TRAINEE_ID,TRAINEE_NAME,DOB,MOBILE,COURSE_CODE,"
            "COURSE_NAME,COMPLETION,CERT_NO,CERT_DATE\n"
            "SKL-2023-8841,PAWAR SURESH A,12-11-2002,9822012346,"
            "ELEC-101,Electrical Technician,Y,SKL-CERT-55102,20-06-2026\n"
        ),
        encoding="utf-8",
    )

    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(engine)
    session = Session(engine)

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
        JourneyDef(
            id="youth_enterprise_v1",
            version=1,
            name="Youth Enterprise",
            status="ACTIVE",
            definition_json={
                "consent_purpose": "youth_enterprise_eligibility",
                "steps": [
                    {
                        "id": "fetch_training",
                        "type": "fetch",
                        "connector": "skl_training",
                        "entity": "training_record",
                        "configured": False,
                    }
                ],
            },
        )
    )

    session.commit()

    def override_db():
        db = Session(engine)
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = (
        lambda: SimpleNamespace(role="admin")
    )

    client = TestClient(app)

    try:
        create = client.post(
            "/api/connectors",
            json={
                "system_code": "SKL",
                "name": "skl_training",
                "kind": "CSV",
                "entity": "training_record",
                "config": {
                    "file": str(csv_path),
                    "encoding": "utf-8-sig",
                    "delimiter": ",",
                },
                "lookup": {
                    "mobile_field": "MOBILE",
                    "dob_field": "DOB",
                    "dob_format": "%d-%m-%Y",
                },
                "auth": {},
            },
        )

        assert create.status_code == 201
        connector_id = create.json()["id"]
        assert create.json()["status"] == "DRAFT"

        sample = client.post(
            f"/api/connectors/{connector_id}/sample",
            json={
                "identity_sample": {
                    "mobile": "9822012346",
                    "dob": "2002-11-12",
                }
            },
        )

        assert sample.status_code == 200
        assert sample.json()["raw"]["TRAINEE_ID"] == "SKL-2023-8841"

        suggestion = client.post(
            f"/api/connectors/{connector_id}/suggest-mapping"
        )

        assert suggestion.status_code == 200

        mapping = suggestion.json()["mapping"]

        assert mapping["trainee_id"]["source"] == "TRAINEE_ID"
        assert mapping["trainee_name"]["source"] == "TRAINEE_NAME"
        assert mapping["completion_status"]["source"] == "COMPLETION"

        saved = client.put(
            f"/api/connectors/{connector_id}/mapping",
            json={
                "mapping": mapping,
                "validators": [],
            },
        )

        assert saved.status_code == 200
        assert saved.json()["status"] == "DRAFT"

        tested = client.post(
            f"/api/connectors/{connector_id}/test",
            json={
                "identity_sample": {
                    "mobile": "9822012346",
                    "dob": "2002-11-12",
                }
            },
        )

        assert tested.status_code == 200
        assert tested.json()["canonical"]["trainee_id"] == "SKL-2023-8841"
        assert (
            tested.json()["canonical"]["completion_status"]
            == "COMPLETED"
        )
        assert all(
            item["passed"]
            for item in tested.json()["validation"]
        )

        row = session.get(Connector, connector_id)
        assert row is not None
        assert row.status == "TESTED"

        activated = client.post(
            f"/api/connectors/{connector_id}/activate",
            json={
                "journey_id": "youth_enterprise_v1",
                "step_id": "fetch_training",
            },
        )

        assert activated.status_code == 200
        assert activated.json()["connector"]["status"] == "ACTIVE"
        assert activated.json()["journey_version"] == 1
        assert activated.json()["onboarding_seconds"] >= 0

        session.expire_all()

        row = session.get(Connector, connector_id)
        assert row is not None
        assert row.status == "ACTIVE"
        assert row.activated_at is not None

        journey = session.scalar(
            select(JourneyDef).where(
                JourneyDef.id == "youth_enterprise_v1",
                JourneyDef.version == 1,
            )
        )

        assert journey is not None

        step = journey.definition_json["steps"][0]
        assert step["id"] == "fetch_training"
        assert step["connector"] == "skl_training"
        assert step["configured"] is True
    finally:
        app.dependency_overrides.clear()
        session.close()
        engine.dispose()

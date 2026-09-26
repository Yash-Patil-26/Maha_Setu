from __future__ import annotations

from datetime import datetime, timedelta, timezone

from sqlalchemy import create_engine, select
from sqlalchemy.orm import Session

from app.db import Base
from app.journeys.engine import execute_application
from app.models import (
    AccessLog,
    Application,
    Connector,
    Consent,
    JourneyDef,
    System,
    User,
)


class FakeConnector:
    def __init__(
        self,
        *,
        system_code: str,
        name: str,
        entity: str,
        record: dict,
        mapping: dict[str, object],
    ) -> None:
        self.system_code = system_code
        self.name = name
        self.entity = entity
        self.record = record
        self.mapping = mapping
        self.config = {}

    def fetch(
        self,
        *,
        mobile: str,
        dob: str,
        correlation_id: str,
    ) -> dict:
        return {
            "entity": self.entity,
            "record": dict(self.record),
            "source_system": self.system_code,
            "connector_id": 1,
            "external_id": f"{self.system_code}-EXT-1",
            "fetched_at": "2026-09-26T00:00:00+00:00",
            "correlation_id": correlation_id,
            "warnings": [],
        }

    def submit(self, **kwargs):
        return {
            "entity": "application",
            "record": {"status": "RECEIVED"},
            "source_system": "BSS",
            "connector_id": 3,
            "external_id": "BSS-EXT-1",
            "submitted_at": "2026-09-26T00:00:00+00:00",
            "correlation_id": kwargs["correlation_id"],
            "warnings": [],
        }


def make_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def seed(session: Session) -> None:
    session.add(
        User(
            username="rahul.patil",
            password_hash="unused",
            role="citizen",
            master_id="SETU-CIT-000001",
            display_name="Rahul Patil",
            full_name="Rahul Patil",
            dob="2004-03-04",
            mobile="9876543210",
        )
    )

    session.add(
        System(
            code="REV",
            name="REV",
            owner_department="x",
            protocol="x",
            id_scheme="x",
            auth_type="x",
            health="UP",
        )
    )

    session.add(
        Connector(
            system_code="REV",
            name="rev_income",
            kind="REST_XML",
            entity="income_certificate",
            config_json={},
            lookup_json={},
            mapping_json={
                "annual_income_inr": {},
                "cert_no": {},
            },
            status="ACTIVE",
            version=1,
        )
    )

    session.add(
        JourneyDef(
            id="scholarship_v1",
            version=1,
            name="Post-Matric Scholarship",
            status="ACTIVE",
            definition_json={
                "consent_purpose": "scholarship_eligibility",
                "steps": [
                    {
                        "id": "fetch_income",
                        "type": "fetch",
                        "connector": "rev_income",
                        "entity": "income_certificate",
                        "configured": True,
                    },
                ],
            },
        )
    )

    session.add(
        Consent(
            master_id="SETU-CIT-000001",
            purpose="scholarship_eligibility",
            journey_id="scholarship_v1",
            fields_json=["annual_income_inr", "cert_no"],
            source_systems_json=["REV"],
            granted_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            status="ACTIVE",
        )
    )

    session.commit()


def add_application(session: Session, correlation_id: str) -> Application:
    application = Application(
        journey_id="scholarship_v1",
        journey_version=1,
        master_id="SETU-CIT-000001",
        status="CREATED",
        correlation_id=correlation_id,
        canonical_json={},
        external_refs_json={},
        metrics_json={},
    )
    session.add(application)
    session.commit()
    session.refresh(application)
    return application


def test_allow_then_revoke_then_deny() -> None:
    with make_session() as session:
        seed(session)

        connector = FakeConnector(
            system_code="REV",
            name="rev_income",
            entity="income_certificate",
            record={
                "annual_income_inr": 210000,
                "cert_no": "INC-001",
                "mobile": "SHOULD-NOT-PASS",
            },
            mapping={
                "annual_income_inr": {},
                "cert_no": {},
                "mobile": {},
            },
        )

        def loader(_db, name):
            assert name == "rev_income"
            return connector

        first = add_application(session, "S4-ALLOW-001")

        execute_application(
            session,
            first.id,
            connector_loader=loader,
        )

        allowed = session.scalars(
            select(AccessLog)
            .where(AccessLog.application_id == first.id)
            .order_by(AccessLog.id)
        ).all()

        assert len(allowed) == 1
        assert allowed[0].outcome == "ALLOWED"
        assert allowed[0].system_code == "REV"
        assert allowed[0].purpose == "scholarship_eligibility"
        assert set(allowed[0].fields_json) == {
            "annual_income_inr",
            "cert_no",
        }
        assert "mobile" not in allowed[0].fields_json

        consent = session.scalar(
            select(Consent).where(
                Consent.master_id == "SETU-CIT-000001",
                Consent.journey_id == "scholarship_v1",
            )
        )
        assert consent is not None

        consent.status = "REVOKED"
        consent.revoked_at = datetime.now(timezone.utc)
        session.commit()

        second = add_application(session, "S4-DENY-001")

        result = execute_application(
            session,
            second.id,
            connector_loader=loader,
        )

        assert result.status == "PAUSED_EXCEPTION"
        assert result.current_step == "fetch_income"

        denied = session.scalars(
            select(AccessLog)
            .where(AccessLog.application_id == second.id)
            .order_by(AccessLog.id)
        ).all()

        assert len(denied) == 1
        assert denied[0].outcome == "DENIED"
        assert denied[0].system_code == "REV"
        assert denied[0].purpose == "scholarship_eligibility"



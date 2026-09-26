from __future__ import annotations

import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

from sqlalchemy import create_engine
from sqlalchemy.orm import Session

ROOT = Path(__file__).resolve().parents[2]

if str(ROOT / "backend") not in sys.path:
    sys.path.insert(0, str(ROOT / "backend"))

from app.connectors.errors import ConnectorTransportError  # noqa: E402
from app.db import Base  # noqa: E402
from app.journeys.engine import (  # noqa: E402
    execute_application,
    retry_application,
)
from app.models import (  # noqa: E402
    Application,
    ApplicationStep,
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
        name: str,
        entity: str | None = None,
        fail_times: int = 0,
        record: dict | None = None,
    ):
        self.name = name
        self.entity = entity
        self.system_code = (
            "REV"
            if name == "rev_income"
            else "EDU"
            if name == "edu_enrolment"
            else "BSS"
        )
        self.mapping = (
            {
                "annual_income_inr": {},
                "cert_no": {},
            }
            if name == "rev_income"
            else {
                "status": {},
                "enrolment_id": {},
            }
            if name == "edu_enrolment"
            else {}
        )
        self.config = (
            {"scheme_code": "SCHOL-PM"}
            if name == "bss_scholarship"
            else {}
        )
        self.calls = 0
        self.fail_times = fail_times
        self.record = record or {}

    def fetch(
        self,
        *,
        mobile: str,
        dob: str,
        correlation_id: str,
    ) -> dict:
        self.calls += 1

        if self.calls <= self.fail_times:
            raise ConnectorTransportError(
                f"{self.name}: synthetic outage"
            )

        return {
            "entity": self.entity,
            "record": self.record,
            "source_system": (
                "REV"
                if self.name == "rev_income"
                else "EDU"
            ),
            "connector_id": (
                1
                if self.name == "rev_income"
                else 2
            ),
            "external_id": (
                "EXT-1"
                if self.name == "rev_income"
                else "EXT-2"
            ),
            "fetched_at": "2026-09-24T00:00:00+00:00",
            "correlation_id": correlation_id,
            "warnings": [],
        }

    def submit(
        self,
        *,
        applicant,
        scheme_code,
        data,
        application_id,
        step_id,
        correlation_id,
    ) -> dict:
        self.calls += 1

        return {
            "entity": "application",
            "record": {
                "bss_ref": "BSS-TEST-000001",
                "status": "RECEIVED",
            },
            "source_system": "BSS",
            "connector_id": 3,
            "external_id": "BSS-TEST-000001",
            "submitted_at": "2026-09-24T00:00:00+00:00",
            "correlation_id": correlation_id,
            "warnings": [],
        }


def make_session() -> Session:
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)
    return Session(engine)


def seed_application(session: Session) -> Application:
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
        System(
            code="EDU",
            name="EDU",
            owner_department="x",
            protocol="x",
            id_scheme="x",
            auth_type="x",
            health="UP",
        )
    )
    session.add(
        System(
            code="BSS",
            name="BSS",
            owner_department="x",
            protocol="x",
            id_scheme="x",
            auth_type="x",
            health="UP",
        )
    )

    session.add_all(
        [
            Connector(
                system_code="REV",
                name="rev_income",
                kind="REST_XML",
                entity="income_certificate",
                config_json={},
                lookup_json={},
                mapping_json={},
                status="ACTIVE",
                version=1,
            ),
            Connector(
                system_code="EDU",
                name="edu_enrolment",
                kind="SQL_VIEW",
                entity="enrolment",
                config_json={},
                lookup_json={},
                mapping_json={},
                status="ACTIVE",
                version=1,
            ),
            Connector(
                system_code="BSS",
                name="bss_scholarship",
                kind="REST_JSON",
                entity="application",
                config_json={"scheme_code": "SCHOL-PM"},
                lookup_json={},
                mapping_json={},
                status="ACTIVE",
                version=1,
            ),
        ]
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
                    {
                        "id": "fetch_enrolment",
                        "type": "fetch",
                        "connector": "edu_enrolment",
                        "entity": "enrolment",
                        "configured": True,
                    },
                    {
                        "id": "evaluate_eligibility",
                        "type": "decision",
                        "rule": (
                            "post_matric_income_250000"
                        ),
                        "configured": True,
                    },
                    {
                        "id": "submit_bss",
                        "type": "submit",
                        "connector": "bss_scholarship",
                        "configured": True,
                    },
                ],
            },
        )
    )

    session.flush()

    session.add(
        Consent(
            master_id="SETU-CIT-000001",
            purpose="scholarship_eligibility",
            journey_id="scholarship_v1",
            fields_json=[
                "annual_income_inr",
                "cert_no",
                "status",
                "enrolment_id",
            ],
            source_systems_json=["REV", "EDU"],
            granted_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(days=30),
            status="ACTIVE",
        )
    )

    application = Application(
        journey_id="scholarship_v1",
        journey_version=1,
        master_id="SETU-CIT-000001",
        status="CREATED",
        correlation_id="test-correlation-1",
        canonical_json={},
        external_refs_json={},
        metrics_json={},
    )

    session.add(application)
    session.commit()

    return application


def test_happy_path_persists_sequential_execution() -> None:
    with make_session() as session:
        application = seed_application(session)

        connectors = {
            "rev_income": FakeConnector(
                name="rev_income",
                entity="income_certificate",
                record={
                    "annual_income_inr": 210000,
                    "cert_no": "INC-1",
                },
            ),
            "edu_enrolment": FakeConnector(
                name="edu_enrolment",
                entity="enrolment",
                record={
                    "status": "ACTIVE",
                    "enrolment_id": "EDU-1",
                },
            ),
            "bss_scholarship": FakeConnector(
                name="bss_scholarship"
            ),
        }

        result = execute_application(
            session,
            application.id,
            connector_loader=(
                lambda _db, name: connectors[name]
            ),
        )

        assert result.status == "SUBMITTED"
        assert result.outcome == "ELIGIBLE"
        assert result.current_step == "await_decision"

        assert (
            result.canonical_json[
                "income_certificate"
            ]["annual_income_inr"]
            == 210000
        )

        assert (
            result.canonical_json[
                "enrolment"
            ]["status"]
            == "ACTIVE"
        )

        assert (
            result.external_refs_json["BSS"]
            == "BSS-TEST-000001"
        )

        steps = (
            session.query(ApplicationStep)
            .filter_by(application_id=application.id)
            .order_by(ApplicationStep.id)
            .all()
        )

        assert [step.status for step in steps] == [
            "DONE",
            "DONE",
            "DONE",
            "DONE",
        ]

        assert [step.attempts for step in steps] == [
            1,
            1,
            1,
            1,
        ]

        assert steps[2].output_json["eligible"] is True
        assert connectors["bss_scholarship"].calls == 1


def test_failure_pauses_and_retry_resumes_only_failed_step() -> None:
    with make_session() as session:
        application = seed_application(session)

        connectors = {
            "rev_income": FakeConnector(
                name="rev_income",
                entity="income_certificate",
                record={
                    "annual_income_inr": 210000
                },
            ),
            "edu_enrolment": FakeConnector(
                name="edu_enrolment",
                entity="enrolment",
                fail_times=1,
                record={"status": "ACTIVE"},
            ),
            "bss_scholarship": FakeConnector(
                name="bss_scholarship"
            ),
        }

        first = execute_application(
            session,
            application.id,
            connector_loader=(
                lambda _db, name: connectors[name]
            ),
        )

        assert first.status == "PAUSED_EXCEPTION"

        failed_steps = (
            session.query(ApplicationStep)
            .filter_by(application_id=application.id)
            .order_by(ApplicationStep.id)
            .all()
        )

        assert [step.status for step in failed_steps] == [
            "DONE",
            "FAILED",
            "PENDING",
            "PENDING",
        ]

        assert failed_steps[1].attempts == 1
        assert (
            failed_steps[1].error_code
            == "CONNECTOR_ERROR"
        )

        assert connectors["rev_income"].calls == 1

        resumed = retry_application(
            session,
            application.id,
            connector_loader=(
                lambda _db, name: connectors[name]
            ),
        )

        assert resumed.status == "SUBMITTED"
        assert connectors["rev_income"].calls == 1
        assert connectors["edu_enrolment"].calls == 2
        assert connectors["bss_scholarship"].calls == 1

        final_steps = (
            session.query(ApplicationStep)
            .filter_by(application_id=application.id)
            .order_by(ApplicationStep.id)
            .all()
        )

        assert [step.status for step in final_steps] == [
            "DONE",
            "DONE",
            "DONE",
            "DONE",
        ]

        assert [step.attempts for step in final_steps] == [
            1,
            2,
            1,
            1,
        ]


def test_not_eligible_stops_before_submission() -> None:
    with make_session() as session:
        application = seed_application(session)

        connectors = {
            "rev_income": FakeConnector(
                name="rev_income",
                entity="income_certificate",
                record={
                    "annual_income_inr": 300000
                },
            ),
            "edu_enrolment": FakeConnector(
                name="edu_enrolment",
                entity="enrolment",
                record={"status": "ACTIVE"},
            ),
            "bss_scholarship": FakeConnector(
                name="bss_scholarship"
            ),
        }

        result = execute_application(
            session,
            application.id,
            connector_loader=(
                lambda _db, name: connectors[name]
            ),
        )

        assert result.status == "NOT_ELIGIBLE"
        assert result.outcome == "NOT_ELIGIBLE"
        assert (
            connectors["bss_scholarship"].calls == 0
        )

        steps = (
            session.query(ApplicationStep)
            .filter_by(application_id=application.id)
            .order_by(ApplicationStep.id)
            .all()
        )

        assert [step.status for step in steps] == [
            "DONE",
            "DONE",
            "DONE",
            "SKIPPED",
        ]

        assert steps[2].output_json["eligible"] is False
        assert (
            steps[2].output_json["reasons"][0]["code"]
            == "INCOME_LIMIT"
        )

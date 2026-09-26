from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.auth import get_current_user
from app.api.consents import get_db
from app.db import Base
from app.main import app
from app.models import Connector, JourneyDef, User

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

Base.metadata.create_all(engine)

with Session(engine) as session:
    user = User(
        username="consent-test",
        password_hash="unused",
        role="citizen",
        master_id="SETU-CIT-000001",
        display_name="Test Citizen",
        full_name="Test Citizen",
        dob="2004-01-01",
        mobile="9999999999",
    )

    journey = JourneyDef(
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
                    "id": "submit_bss",
                    "type": "submit",
                    "connector": "bss_scholarship",
                    "entity": "application",
                    "configured": True,
                },
            ],
        },
    )

    rev = Connector(
        system_code="REV",
        name="rev_income",
        kind="REST_XML",
        entity="income_certificate",
        config_json={},
        lookup_json={},
        mapping_json={
            "cert_no": {},
            "holder_name": {},
            "annual_income_inr": {},
        },
        status="ACTIVE",
        version=1,
    )

    edu = Connector(
        system_code="EDU",
        name="edu_enrolment",
        kind="SQL_VIEW",
        entity="enrolment",
        config_json={},
        lookup_json={},
        mapping_json={
            "enrolment_id": {},
            "student_name": {},
            "dob": {},
        },
        status="ACTIVE",
        version=1,
    )

    session.add_all([user, journey, rev, edu])
    session.commit()
    TEST_USER_ID = user.id


def override_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def override_user():
    with Session(engine) as session:
        return session.get(User, TEST_USER_ID)


@pytest.fixture(autouse=True)
def consent_api_overrides():
    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user

    try:
        yield
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


client = TestClient(app)


def test_create_list_and_revoke_consent():
    response = client.post(
        "/api/consents",
        json={
            "journey_id": "scholarship_v1",
            "purpose": "scholarship_eligibility",
        },
    )

    assert response.status_code == 201
    body = response.json()

    assert body["status"] == "ACTIVE"
    assert body["source_systems"] == ["REV", "EDU"]
    assert body["fields"] == [
        "annual_income_inr",
        "cert_no",
        "dob",
        "enrolment_id",
        "holder_name",
        "student_name",
    ]

    consent_id = body["id"]

    listed = client.get("/api/consents")
    assert listed.status_code == 200
    assert listed.json()[0]["id"] == consent_id

    revoked = client.post(f"/api/consents/{consent_id}/revoke")
    assert revoked.status_code == 200
    assert revoked.json()["status"] == "REVOKED"


def test_wrong_purpose_is_rejected():
    response = client.post(
        "/api/consents",
        json={
            "journey_id": "scholarship_v1",
            "purpose": "wrong-purpose",
        },
    )

    assert response.status_code == 400
    assert response.json()["detail"]["error"]["code"] == (
        "CONSENT_PURPOSE_MISMATCH"
    )


def test_regrant_after_revoke_creates_new_active_consent():
    first = client.post(
        "/api/consents",
        json={
            "journey_id": "scholarship_v1",
            "purpose": "scholarship_eligibility",
        },
    )

    assert first.status_code == 201

    first_id = first.json()["id"]

    revoked = client.post(
        f"/api/consents/{first_id}/revoke"
    )

    assert revoked.status_code == 200
    assert revoked.json()["status"] == "REVOKED"

    second = client.post(
        "/api/consents",
        json={
            "journey_id": "scholarship_v1",
            "purpose": "scholarship_eligibility",
        },
    )

    assert second.status_code == 201
    assert second.json()["status"] == "ACTIVE"
    assert second.json()["id"] != first_id

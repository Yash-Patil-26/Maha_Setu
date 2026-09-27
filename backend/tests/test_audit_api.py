from typing import Generator

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session
from sqlalchemy.pool import StaticPool

from app.api.audit import get_db as audit_get_db
from app.api.auth import get_current_user
from app.api.systems import get_db as systems_get_db
from app.db import Base
from app.main import app
from app.models import AuditLog, System, User

engine = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)

Base.metadata.create_all(engine)

with Session(engine) as session:
    admin = User(
        username="audit-admin",
        password_hash="unused",
        role="admin",
        master_id="SETU-ADM-000001",
        display_name="Audit Admin",
    )

    officer = User(
        username="audit-officer",
        password_hash="unused",
        role="officer",
        master_id="SETU-OFF-000001",
        display_name="Audit Officer",
    )

    system = System(
        code="REV",
        name="Revenue Department",
        owner_department="Revenue",
        protocol="XML",
        id_scheme="REV",
        auth_type="api_key",
    )

    session.add_all([admin, officer, system])
    session.commit()

    ADMIN_ID = admin.id
    OFFICER_ID = officer.id


CURRENT_USER_ID = ADMIN_ID


def override_db() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session


def override_user() -> User:
    with Session(engine) as session:
        return session.get(User, CURRENT_USER_ID)


@pytest.fixture(autouse=True)
def audit_api_overrides():
    global CURRENT_USER_ID

    CURRENT_USER_ID = ADMIN_ID

    with Session(engine) as session:
        session.query(AuditLog).delete()

        session.query(System).filter(
            System.code == "REV"
        ).update(
            {
                "health": "UP",
                "simulate_down": False,
            }
        )

        session.commit()

    app.dependency_overrides[audit_get_db] = override_db
    app.dependency_overrides[systems_get_db] = override_db
    app.dependency_overrides[get_current_user] = override_user

    try:
        yield
    finally:
        app.dependency_overrides.pop(audit_get_db, None)
        app.dependency_overrides.pop(systems_get_db, None)
        app.dependency_overrides.pop(get_current_user, None)


client = TestClient(app)


def test_admin_can_read_audit_logs():
    with Session(engine) as session:
        session.add(
            AuditLog(
                user_id=ADMIN_ID,
                username="audit-admin",
                role="admin",
                action="System Outage Simulation",
                resource="REV",
                status="Success",
            )
        )
        session.commit()

    response = client.get("/api/admin/audit")

    assert response.status_code == 200

    body = response.json()

    assert len(body) == 1
    assert body[0]["user"] == "audit-admin"
    assert body[0]["role"] == "Administrator"
    assert body[0]["action"] == "System Outage Simulation"
    assert body[0]["resource"] == "REV"
    assert body[0]["status"] == "Success"


def test_non_admin_cannot_read_audit_logs():
    global CURRENT_USER_ID
    CURRENT_USER_ID = OFFICER_ID

    response = client.get("/api/admin/audit")

    assert response.status_code == 403


def test_system_outage_and_restore_create_audit_events():
    outage = client.post(
        "/api/systems/REV/simulate-outage",
        json={"down": True},
    )

    assert outage.status_code == 200
    assert outage.json()["health"] == "DOWN"

    restore = client.post(
        "/api/systems/REV/simulate-outage",
        json={"down": False},
    )

    assert restore.status_code == 200
    assert restore.json()["health"] == "UP"

    response = client.get("/api/admin/audit")

    assert response.status_code == 200

    actions = [item["action"] for item in response.json()]

    assert actions[:2] == [
        "System Restore",
        "System Outage Simulation",
    ]

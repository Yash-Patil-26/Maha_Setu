import json
from datetime import datetime

import pytest
from backend.app.db import Base
from backend.app.models.consent import Consent
from backend.app.services.consent import (
    ConsentRequiredError,
    ConsentRevokedError,
    filter_fields,
    revoke_consent,
)
from sqlalchemy import create_engine
from sqlalchemy.orm import Session


@pytest.fixture
def db():
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(engine)

    with Session(engine) as session:
        yield session


def add_consent(
    db: Session,
    *,
    status: str = "ACTIVE",
    fields: list[str] | None = None,
) -> Consent:
    consent = Consent(
        master_id="SETU-CIT-000001",
        purpose="scholarship",
        fields_json=json.dumps(fields or ["full_name", "dob"]),
        source_systems_json=json.dumps(["REV"]),
        granted_at=datetime.utcnow(),
        status=status,
    )
    db.add(consent)
    db.commit()
    db.refresh(consent)
    return consent


def test_active_consent_filters_unconsented_fields(db):
    add_consent(db)

    result = filter_fields(
        db=db,
        master_id="SETU-CIT-000001",
        purpose="scholarship",
        source_system="REV",
        data={
            "full_name": "Test Citizen",
            "dob": "2004-01-01",
            "mobile": "9999999999",
        },
    )

    assert result == {
        "full_name": "Test Citizen",
        "dob": "2004-01-01",
    }
    assert "mobile" not in result


def test_missing_consent_denies_access(db):
    with pytest.raises(ConsentRequiredError):
        filter_fields(
            db=db,
            master_id="SETU-CIT-000001",
            purpose="scholarship",
            source_system="REV",
            data={"full_name": "Test Citizen"},
        )


def test_revoked_consent_denies_access(db):
    add_consent(db, status="REVOKED")

    with pytest.raises(ConsentRevokedError):
        filter_fields(
            db=db,
            master_id="SETU-CIT-000001",
            purpose="scholarship",
            source_system="REV",
            data={"full_name": "Test Citizen"},
        )

def test_revoke_blocks_next_fetch(db):
    consent = add_consent(db)

    allowed = filter_fields(
        db=db,
        master_id="SETU-CIT-000001",
        purpose="scholarship",
        source_system="REV",
        data={
            "full_name": "Test Citizen",
            "dob": "2004-01-01",
        },
    )

    assert allowed == {
        "full_name": "Test Citizen",
        "dob": "2004-01-01",
    }

    revoked = revoke_consent(db, consent.id)

    assert revoked.status == "REVOKED"
    assert revoked.revoked_at is not None

    with pytest.raises(ConsentRevokedError):
        filter_fields(
            db=db,
            master_id="SETU-CIT-000001",
            purpose="scholarship",
            source_system="REV",
            data={
                "full_name": "Test Citizen",
                "dob": "2004-01-01",
            },
        )

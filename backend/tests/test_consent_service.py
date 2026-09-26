from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from app.db import Base
from app.models import Consent
from app.services.consent import (
    ConsentRequiredError,
    ConsentRevokedError,
    filter_fields,
    revoke_consent,
)


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
    source_systems: list[str] | None = None,
    expires_at: datetime | None = None,
) -> Consent:
    consent = Consent(
        master_id="SETU-CIT-000001",
        purpose="scholarship",
        journey_id="scholarship_v1",
        fields_json=fields or ["full_name", "dob"],
        source_systems_json=source_systems or ["REV"],
        granted_at=datetime.now(timezone.utc),
        expires_at=expires_at
        or datetime.now(timezone.utc) + timedelta(hours=1),
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


def test_expired_consent_denies_access(db):
    add_consent(
        db,
        expires_at=datetime.now(timezone.utc) - timedelta(minutes=1),
    )

    with pytest.raises(ConsentRequiredError):
        filter_fields(
            db=db,
            master_id="SETU-CIT-000001",
            purpose="scholarship",
            source_system="REV",
            data={"full_name": "Test Citizen"},
        )


def test_wrong_source_system_denies_access(db):
    add_consent(db, source_systems=["EDU"])

    with pytest.raises(ConsentRequiredError):
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


def test_new_active_consent_supersedes_older_revoked_consent(db):
    revoked = add_consent(db, status="REVOKED")

    db.add(
        Consent(
            master_id=revoked.master_id,
            purpose=revoked.purpose,
            journey_id=revoked.journey_id,
            fields_json=["full_name"],
            source_systems_json=["REV"],
            granted_at=datetime.now(timezone.utc),
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            status="ACTIVE",
        )
    )
    db.commit()

    result = filter_fields(
        db=db,
        master_id="SETU-CIT-000001",
        purpose="scholarship",
        source_system="REV",
        data={
            "full_name": "Test Citizen",
            "dob": "2004-01-01",
        },
    )

    assert result == {
        "full_name": "Test Citizen",
    }

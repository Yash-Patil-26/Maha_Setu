from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from ..models import AccessLog, Consent


class ConsentError(Exception):
    """Base exception for consent enforcement errors."""


class ConsentRequiredError(ConsentError):
    """Raised when no usable consent exists."""


class ConsentRevokedError(ConsentError):
    """Raised when matching consent was revoked."""


def _as_string_list(value: object) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value]


def _utc(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value


def get_active_consent(
    db: Session,
    master_id: str,
    purpose: str,
    source_system: str,
    journey_id: str | None = None,
) -> Consent:
    query = (
        select(Consent)
        .where(
            Consent.master_id == master_id,
            Consent.purpose == purpose,
        )
        .order_by(Consent.granted_at.desc())
    )

    if journey_id is not None:
        query = query.where(Consent.journey_id == journey_id)

    consents = db.scalars(query).all()

    matching = [
        consent
        for consent in consents
        if source_system in _as_string_list(consent.source_systems_json)
    ]

    now = datetime.now(timezone.utc)

    for consent in matching:
        if consent.status == "REVOKED":
            raise ConsentRevokedError("Consent has been revoked.")

        if consent.status != "ACTIVE":
            continue

        if _utc(consent.expires_at) <= now:
            continue

        return consent

    raise ConsentRequiredError("Consent is required.")


def filter_consented_fields(
    consent: Consent,
    data: dict,
) -> dict:
    allowed_fields = set(_as_string_list(consent.fields_json))

    return {
        field: value
        for field, value in data.items()
        if field in allowed_fields
    }


def filter_fields(
    db: Session,
    master_id: str,
    purpose: str,
    source_system: str,
    data: dict,
    journey_id: str | None = None,
) -> dict:
    consent = get_active_consent(
        db=db,
        master_id=master_id,
        purpose=purpose,
        source_system=source_system,
        journey_id=journey_id,
    )

    return filter_consented_fields(consent, data)


def revoke_consent(
    db: Session,
    consent_id: int,
) -> Consent:
    consent = db.get(Consent, consent_id)

    if consent is None:
        raise ConsentRequiredError("Consent not found.")

    if consent.status != "REVOKED":
        consent.status = "REVOKED"
        consent.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(consent)

    return consent


def record_access(
    db: Session,
    *,
    master_id: str,
    system_code: str,
    purpose: str,
    fields: list[str],
    outcome: str,
    application_id: int | None = None,
) -> AccessLog:
    row = AccessLog(
        master_id=master_id,
        system_code=system_code,
        purpose=purpose,
        fields_json=fields,
        application_id=application_id,
        outcome=outcome,
    )
    db.add(row)
    db.flush()
    return row

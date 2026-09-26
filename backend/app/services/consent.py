from __future__ import annotations

import json
from datetime import datetime

from backend.app.models.consent import Consent
from sqlalchemy import select
from sqlalchemy.orm import Session


class ConsentError(Exception):
    """Base exception for consent enforcement errors."""


class ConsentRequiredError(ConsentError):
    """Raised when no usable consent exists."""


class ConsentRevokedError(ConsentError):
    """Raised when matching consent was revoked."""


def _json_list(value: str) -> list[str]:
    parsed = json.loads(value or "[]")
    if not isinstance(parsed, list):
        return []
    return [str(item) for item in parsed]


def get_active_consent(
    db: Session,
    master_id: str,
    purpose: str,
    source_system: str,
) -> Consent:
    consents = db.scalars(
        select(Consent)
        .where(
            Consent.master_id == master_id,
            Consent.purpose == purpose,
        )
        .order_by(Consent.granted_at.desc())
    ).all()

    matching = [
        consent
        for consent in consents
        if source_system in _json_list(consent.source_systems_json)
    ]

    if any(consent.status == "REVOKED" for consent in matching):
        raise ConsentRevokedError("Consent has been revoked.")

    now = datetime.utcnow()

    for consent in matching:
        if consent.status != "ACTIVE":
            continue

        if consent.expires_at is not None and consent.expires_at <= now:
            continue

        return consent

    raise ConsentRequiredError("Consent is required.")


def filter_fields(
    db: Session,
    master_id: str,
    purpose: str,
    source_system: str,
    data: dict,
) -> dict:
    consent = get_active_consent(
        db=db,
        master_id=master_id,
        purpose=purpose,
        source_system=source_system,
    )

    allowed_fields = set(_json_list(consent.fields_json))

    return {
        field: value
        for field, value in data.items()
        if field in allowed_fields
    }


def revoke_consent(
    db: Session,
    consent_id: int,
) -> Consent:
    consent = db.get(Consent, consent_id)

    if consent is None:
        raise ConsentRequiredError("Consent not found.")

    if consent.status != "REVOKED":
        consent.status = "REVOKED"
        consent.revoked_at = datetime.utcnow()
        db.commit()
        db.refresh(consent)

    return consent

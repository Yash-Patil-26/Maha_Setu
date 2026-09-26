from __future__ import annotations

from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import AccessLog, Connector, Consent, JourneyDef, User
from .auth import require_roles

router = APIRouter(prefix="/api/consents", tags=["consents"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateConsentRequest(BaseModel):
    journey_id: str = Field(min_length=1, max_length=100)
    purpose: str = Field(min_length=1, max_length=150)
    expires_in_days: int = Field(default=30, ge=1, le=3650)


class ConsentResponse(BaseModel):
    id: int
    master_id: str
    journey_id: str
    purpose: str
    fields: list[str]
    source_systems: list[str]
    status: str
    granted_at: datetime
    expires_at: datetime
    revoked_at: datetime | None = None


class AccessLogResponse(BaseModel):
    id: int
    master_id: str
    system_code: str
    purpose: str
    fields: list[str]
    at: datetime
    application_id: int | None
    outcome: str


def _serialize_consent(consent: Consent) -> ConsentResponse:
    return ConsentResponse(
        id=consent.id,
        master_id=consent.master_id,
        journey_id=consent.journey_id,
        purpose=consent.purpose,
        fields=[str(item) for item in (consent.fields_json or [])],
        source_systems=[
            str(item) for item in (consent.source_systems_json or [])
        ],
        status=consent.status,
        granted_at=consent.granted_at,
        expires_at=consent.expires_at,
        revoked_at=consent.revoked_at,
    )


def _serialize_access_log(row: AccessLog) -> AccessLogResponse:
    return AccessLogResponse(
        id=row.id,
        master_id=row.master_id,
        system_code=row.system_code,
        purpose=row.purpose,
        fields=[str(item) for item in (row.fields_json or [])],
        at=row.at,
        application_id=row.application_id,
        outcome=row.outcome,
    )


@router.post(
    "",
    response_model=ConsentResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_consent(
    payload: CreateConsentRequest,
    user: User = Depends(require_roles("citizen")),
    db: Session = Depends(get_db),
) -> ConsentResponse:
    journey = db.scalar(
        select(JourneyDef)
        .where(
            JourneyDef.id == payload.journey_id,
            JourneyDef.status == "ACTIVE",
        )
        .order_by(JourneyDef.version.desc())
    )

    if journey is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "JOURNEY_NOT_FOUND",
                    "message": f"Active journey not found: {payload.journey_id}",
                }
            },
        )

    definition = journey.definition_json or {}
    expected_purpose = definition.get("consent_purpose")

    if payload.purpose != expected_purpose:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "CONSENT_PURPOSE_MISMATCH",
                    "message": "Consent purpose does not match the journey",
                }
            },
        )

    fields: set[str] = set()
    source_systems: list[str] = []

    for step in definition.get("steps", []):
        if step.get("type") != "fetch":
            continue

        if step.get("configured") is False:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "JOURNEY_CONFIGURATION_ERROR",
                        "message": (
                            f"Journey step is not configured: "
                            f"{step.get('id')}"
                        ),
                    }
                },
            )

        connector_name = step.get("connector")
        connector = db.scalar(
            select(Connector).where(
                Connector.name == connector_name,
                Connector.status == "ACTIVE",
            )
        )

        if connector is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail={
                    "error": {
                        "code": "JOURNEY_CONFIGURATION_ERROR",
                        "message": (
                            f"Active connector not found: {connector_name}"
                        ),
                    }
                },
            )

        source_systems.append(connector.system_code)

        mapping = connector.mapping_json or {}
        fields.update(str(field) for field in mapping)

    source_systems = list(dict.fromkeys(source_systems))
    ordered_fields = sorted(fields)

    if not source_systems:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "CONSENT_SCOPE_EMPTY",
                    "message": "Journey has no configured fetch sources",
                }
            },
        )

    existing = db.scalar(
        select(Consent)
        .where(
            Consent.master_id == user.master_id,
            Consent.journey_id == journey.id,
            Consent.purpose == payload.purpose,
            Consent.status == "ACTIVE",
            Consent.revoked_at.is_(None),
        )
        .order_by(Consent.id.desc())
    )

    now = datetime.now(timezone.utc)

    if existing is not None:
        expires_at = existing.expires_at
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        if expires_at > now:
            return _serialize_consent(existing)

        existing.status = "EXPIRED"

    consent = Consent(
        master_id=user.master_id,
        purpose=payload.purpose,
        journey_id=journey.id,
        fields_json=ordered_fields,
        source_systems_json=source_systems,
        granted_at=now,
        expires_at=now + timedelta(days=payload.expires_in_days),
        status="ACTIVE",
    )

    db.add(consent)
    db.commit()
    db.refresh(consent)

    return _serialize_consent(consent)


@router.get(
    "",
    response_model=list[ConsentResponse],
)
def list_consents(
    user: User = Depends(require_roles("citizen")),
    db: Session = Depends(get_db),
) -> list[ConsentResponse]:
    rows = db.scalars(
        select(Consent)
        .where(Consent.master_id == user.master_id)
        .order_by(Consent.id.desc())
    ).all()

    return [_serialize_consent(row) for row in rows]


@router.post(
    "/{consent_id}/revoke",
    response_model=ConsentResponse,
)
def revoke(
    consent_id: int,
    user: User = Depends(require_roles("citizen")),
    db: Session = Depends(get_db),
) -> ConsentResponse:
    consent = db.get(Consent, consent_id)

    if consent is None or consent.master_id != user.master_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "CONSENT_NOT_FOUND",
                    "message": "Consent not found",
                }
            },
        )

    if consent.status != "REVOKED":
        consent.status = "REVOKED"
        consent.revoked_at = datetime.now(timezone.utc)
        db.commit()
        db.refresh(consent)

    return _serialize_consent(consent)


@router.get(
    "/{consent_id}/access-log",
    response_model=list[AccessLogResponse],
)
def consent_access_log(
    consent_id: int,
    user: User = Depends(require_roles("citizen")),
    db: Session = Depends(get_db),
) -> list[AccessLogResponse]:
    consent = db.get(Consent, consent_id)

    if consent is None or consent.master_id != user.master_id:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "CONSENT_NOT_FOUND",
                    "message": "Consent not found",
                }
            },
        )

    rows = db.scalars(
        select(AccessLog)
        .where(
            AccessLog.master_id == user.master_id,
            AccessLog.purpose == consent.purpose,
        )
        .order_by(AccessLog.id.desc())
    ).all()

    return [_serialize_access_log(row) for row in rows]

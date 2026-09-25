from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..journeys.engine import (
    JourneyExecutionError,
    execute_application,
    retry_application,
)
from ..models import Application, ApplicationStep, Consent, JourneyDef, User
from .auth import get_current_user, require_roles

router = APIRouter(prefix="/api/applications", tags=["applications"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


class CreateApplicationRequest(BaseModel):
    journey_id: str = Field(min_length=1, max_length=100)


class ApplicationResponse(BaseModel):
    application_id: int
    status: str
    correlation_id: str


class ApplicationStepResponse(BaseModel):
    id: int
    step_id: str
    status: str
    attempts: int
    started_at: datetime | None = None
    ended_at: datetime | None = None
    error_code: str | None = None
    error_detail: str | None = None
    output: dict[str, Any]


class ApplicationDetailResponse(BaseModel):
    id: int
    journey_id: str
    journey_version: int
    master_id: str
    status: str
    current_step: str | None
    correlation_id: str
    created_at: datetime
    updated_at: datetime
    outcome: str | None
    canonical: dict[str, Any]
    provenance: dict[str, Any]
    eligibility: dict[str, Any] | None
    metrics: dict[str, Any]
    external_refs: dict[str, Any]
    steps: list[ApplicationStepResponse]


def _journey_or_404(db: Session, journey_id: str) -> JourneyDef:
    journey = db.scalar(
        select(JourneyDef)
        .where(
            JourneyDef.id == journey_id,
            JourneyDef.status == "ACTIVE",
        )
        .order_by(JourneyDef.version.desc())
    )

    if journey is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Active journey not found: {journey_id}",
                }
            },
        )

    return journey


def _require_active_consent(
    db: Session,
    *,
    master_id: str,
    journey: JourneyDef,
) -> None:
    definition = journey.definition_json or {}
    purpose = definition.get("consent_purpose")

    if not isinstance(purpose, str) or not purpose:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": (f"Journey {journey.id} is missing consent_purpose"),
                }
            },
        )

    now = datetime.now(timezone.utc)

    consent = db.scalar(
        select(Consent)
        .where(
            Consent.master_id == master_id,
            Consent.journey_id == journey.id,
            Consent.purpose == purpose,
            Consent.status == "ACTIVE",
            Consent.expires_at > now,
            Consent.revoked_at.is_(None),
        )
        .order_by(Consent.id.desc())
    )

    if consent is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "CONSENT_REQUIRED",
                    "message": ("Active consent is required for this journey"),
                }
            },
        )


def _application_steps(
    db: Session,
    application_id: int,
) -> list[ApplicationStep]:
    return db.scalars(
        select(ApplicationStep)
        .where(ApplicationStep.application_id == application_id)
        .order_by(ApplicationStep.id)
    ).all()


def _application_response(application: Application) -> ApplicationDetailResponse:
    metrics = dict(application.metrics_json or {})
    provenance = dict(metrics.get("provenance", {}))

    eligibility = None
    for step_output in (
        step.output_json or {} for step in getattr(application, "_response_steps", [])
    ):
        if isinstance(step_output, dict):
            if "eligible" in step_output or "reasons" in step_output:
                eligibility = {
                    "eligible": step_output.get("eligible"),
                    "reasons": step_output.get("reasons", []),
                }
                break

    steps = [
        ApplicationStepResponse(
            id=step.id,
            step_id=step.step_id,
            status=step.status,
            attempts=step.attempts,
            started_at=step.started_at,
            ended_at=step.ended_at,
            error_code=step.error_code,
            error_detail=step.error_detail,
            output=dict(step.output_json or {}),
        )
        for step in getattr(application, "_response_steps", [])
    ]

    return ApplicationDetailResponse(
        id=application.id,
        journey_id=application.journey_id,
        journey_version=application.journey_version,
        master_id=application.master_id,
        status=application.status,
        current_step=application.current_step,
        correlation_id=application.correlation_id,
        created_at=application.created_at,
        updated_at=application.updated_at,
        outcome=application.outcome,
        canonical=dict(application.canonical_json or {}),
        provenance=provenance,
        eligibility=eligibility,
        metrics=metrics,
        external_refs=dict(application.external_refs_json or {}),
        steps=steps,
    )


def _attach_steps(
    db: Session,
    application: Application,
) -> Application:
    application._response_steps = _application_steps(db, application.id)
    return application


def _application_for_request(
    db: Session,
    *,
    application_id: int,
    user: User,
) -> Application:
    application = db.get(Application, application_id)

    if application is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"Application not found: {application_id}",
                }
            },
        )

    if user.role == "citizen" and application.master_id != user.master_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "error": {
                    "code": "FORBIDDEN",
                    "message": "Application does not belong to citizen",
                }
            },
        )

    return application


@router.post(
    "",
    response_model=ApplicationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def create_application(
    payload: CreateApplicationRequest,
    user: User = Depends(require_roles("citizen")),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    journey = _journey_or_404(db, payload.journey_id)

    if not user.master_id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": "Citizen account has no master_id",
                }
            },
        )

    _require_active_consent(
        db,
        master_id=user.master_id,
        journey=journey,
    )

    application = Application(
        journey_id=journey.id,
        journey_version=journey.version,
        master_id=user.master_id,
        status="CREATED",
        correlation_id=f"SETU-{uuid.uuid4().hex}",
    )

    db.add(application)
    db.commit()
    db.refresh(application)

    try:
        application = execute_application(
            db,
            application.id,
        )
    except JourneyExecutionError:
        db.rollback()
        application = db.get(Application, application.id)
        if application is None:
            raise
        db.commit()

    return ApplicationResponse(
        application_id=application.id,
        status=application.status,
        correlation_id=application.correlation_id,
    )


@router.get(
    "/{application_id}",
    response_model=ApplicationDetailResponse,
)
def get_application(
    application_id: int,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApplicationDetailResponse:
    application = _application_for_request(
        db,
        application_id=application_id,
        user=user,
    )

    return _application_response(_attach_steps(db, application))


@router.post(
    "/{application_id}/retry",
    response_model=ApplicationResponse,
    status_code=status.HTTP_202_ACCEPTED,
)
def retry_application_api(
    application_id: int,
    user: User = Depends(require_roles("officer", "admin")),
    db: Session = Depends(get_db),
) -> ApplicationResponse:
    application = _application_for_request(
        db,
        application_id=application_id,
        user=user,
    )

    try:
        application = retry_application(
            db,
            application.id,
        )
    except JourneyExecutionError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={
                "error": {
                    "code": "STATE_CONFLICT",
                    "message": str(exc),
                }
            },
        ) from exc

    return ApplicationResponse(
        application_id=application.id,
        status=application.status,
        correlation_id=application.correlation_id,
    )

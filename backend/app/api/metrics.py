from __future__ import annotations

from datetime import timezone
from statistics import median
from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import Application, Connector, User
from .auth import require_roles

router = APIRouter(
    prefix="/api/metrics",
    tags=["metrics"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _duration_seconds(created_at, activated_at) -> float:
    if created_at.tzinfo is None:
        created_at = created_at.replace(tzinfo=timezone.utc)

    if activated_at.tzinfo is None:
        activated_at = activated_at.replace(tzinfo=timezone.utc)

    return max(
        0.0,
        (activated_at - created_at).total_seconds(),
    )


@router.get("/summary")
def get_metrics_summary(
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    applications = db.scalars(
        select(Application)
    ).all()

    fields_total = 0
    fields_autofilled = 0
    citizen_typed = 0
    documents_not_uploaded = 0

    for application in applications:
        metrics = application.metrics_json or {}

        fields_total += int(metrics.get("fields_total", 0) or 0)
        fields_autofilled += int(
            metrics.get("fields_autofilled", 0) or 0
        )
        citizen_typed += int(
            metrics.get("citizen_typed", 0) or 0
        )
        documents_not_uploaded += int(
            metrics.get("documents_not_uploaded", 0) or 0
        )

    autofill_pct = (
        round((fields_autofilled / fields_total) * 100, 1)
        if fields_total
        else 0.0
    )

    activated_connectors = db.scalars(
        select(Connector)
        .where(Connector.activated_at.is_not(None))
        .order_by(Connector.activated_at.asc())
    ).all()

    onboarding_durations = [
        _duration_seconds(
            connector.created_at,
            connector.activated_at,
        )
        for connector in activated_connectors
        if connector.activated_at is not None
    ]

    last_seconds = 0.0

    if activated_connectors:
        latest = activated_connectors[-1]

        if latest.activated_at is not None:
            last_seconds = _duration_seconds(
                latest.created_at,
                latest.activated_at,
            )

    median_seconds = (
        round(float(median(onboarding_durations)), 3)
        if onboarding_durations
        else 0.0
    )

    return {
        "once_only": {
            "applications": len(applications),
            "fields_total": fields_total,
            "fields_autofilled": fields_autofilled,
            "citizen_typed": citizen_typed,
            "documents_not_uploaded": documents_not_uploaded,
            "autofill_pct": autofill_pct,
        },
        "onboarding": {
            "sessions": len(onboarding_durations),
            "last_seconds": round(last_seconds, 3),
            "median_seconds": median_seconds,
            "code_changes": 0,
        },
    }

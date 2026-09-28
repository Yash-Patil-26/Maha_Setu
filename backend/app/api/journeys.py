from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import JourneyDef, User
from .auth import require_roles

router = APIRouter(
    prefix="/api/journeys",
    tags=["journeys"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def list_journeys(
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> list[dict[str, Any]]:
    rows = db.scalars(
        select(JourneyDef).order_by(
            JourneyDef.id,
            JourneyDef.version.desc(),
        )
    ).all()

    journeys = []

    for row in rows:
        definition = row.definition_json or {}
        raw_steps = definition.get("steps", [])

        steps = []
        if isinstance(raw_steps, list):
            for step in raw_steps:
                if not isinstance(step, dict):
                    continue

                steps.append(
                    {
                        "id": step.get("id"),
                        "type": step.get("type"),
                        "connector": step.get("connector"),
                        "entity": step.get("entity"),
                        "configured": bool(
                            step.get("configured", False)
                        ),
                    }
                )

        journeys.append(
            {
                "id": row.id,
                "name": row.name,
                "version": row.version,
                "status": row.status,
                "steps": steps,
            }
        )

    return journeys

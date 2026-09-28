from __future__ import annotations

from typing import Any

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import AccessLog, User
from .auth import require_roles

router = APIRouter(
    prefix="/api/audit",
    tags=["audit"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.get("")
def list_access_logs(
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    total = db.scalar(
        select(func.count()).select_from(AccessLog)
    ) or 0

    rows = db.scalars(
        select(AccessLog)
        .order_by(AccessLog.id.desc())
        .offset(offset)
        .limit(limit)
    ).all()

    items = [
        {
            "id": row.id,
            "at": row.at.isoformat(),
            "system_code": row.system_code,
            "purpose": row.purpose,
            "fields": [
                str(item) for item in (row.fields_json or [])
            ],
            "application_id": row.application_id,
            "outcome": row.outcome,
        }
        for row in rows
    ]

    return {
        "items": items,
        "total": total,
        "limit": limit,
        "offset": offset,
    }

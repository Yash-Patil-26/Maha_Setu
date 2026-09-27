from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import AuditLog, User
from .auth import require_roles

router = APIRouter(
    prefix="/api/admin/audit",
    tags=["audit"],
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def _role_label(role: str | None) -> str:
    return {
        "admin": "Administrator",
        "officer": "Government Official",
        "recruiter": "Recruiter",
        "citizen": "Citizen",
        "system": "System",
    }.get(role or "", role or "Unknown")


@router.get("")
def list_admin_audit(
    _user: User = Depends(require_roles("admin")),
    db: Session = Depends(get_db),
) -> list[dict]:
    rows = db.scalars(
        select(AuditLog)
        .order_by(AuditLog.id.desc())
        .limit(200)
    ).all()

    return [
        {
            "id": row.id,
            "user": row.username or "System",
            "role": _role_label(row.role),
            "action": row.action,
            "resource": row.resource or "",
            "status": row.status,
            "time": row.created_at.isoformat(),
        }
        for row in rows
    ]

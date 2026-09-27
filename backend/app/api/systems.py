from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from ..db import SessionLocal
from ..models import System, User
from ..services.audit import record_audit_event
from .auth import require_roles

router = APIRouter(
    prefix="/api/systems",
    tags=["systems"],
)


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


def serialize(system: System) -> dict:
    return {
        "code": system.code,
        "name": system.name,
        "owner_department": system.owner_department,
        "protocol": system.protocol,
        "id_scheme": system.id_scheme,
        "auth_type": system.auth_type,
        "health": system.health,
        "simulate_down": bool(system.simulate_down),
    }


@router.get("")
def list_systems(
    _user: User = Depends(
        require_roles("admin"),
    ),
    db: Session = Depends(get_db),
) -> list[dict]:
    systems = db.scalars(
        select(System).order_by(System.code)
    ).all()

    return [
        serialize(system)
        for system in systems
    ]


@router.post("/{code}/simulate-outage")
def simulate_outage(
    code: str,
    body: dict,
    user: User = Depends(
        require_roles("admin"),
    ),
    db: Session = Depends(get_db),
) -> dict:
    down = body.get("down")

    if not isinstance(down, bool):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="down must be boolean",
        )

    system = db.get(
        System,
        code.upper(),
    )

    if system is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="system not found",
        )

    system.simulate_down = down
    system.health = (
        "DOWN"
        if down
        else "UP"
    )

    record_audit_event(
        db,
        user=user,
        action=(
            "System Outage Simulation"
            if down
            else "System Restore"
        ),
        resource=system.code,
    )

    db.commit()
    db.refresh(system)

    return serialize(system)

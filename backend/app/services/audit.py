from sqlalchemy.orm import Session

from ..models import AuditLog, User


def record_audit_event(
    db: Session,
    *,
    user: User | None,
    action: str,
    resource: str | None,
    status: str = "Success",
) -> AuditLog:
    event = AuditLog(
        user_id=user.id if user else None,
        username=user.username if user else "System",
        role=user.role if user else "system",
        action=action,
        resource=resource,
        status=status,
    )

    db.add(event)
    db.flush()

    return event

from datetime import datetime, timezone

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column

from .db import Base


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    password_hash: Mapped[str] = mapped_column(Text, nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    master_id: Mapped[str | None] = mapped_column(String(50), unique=True)
    display_name: Mapped[str] = mapped_column(String(150), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(200))
    dob: Mapped[str | None] = mapped_column(String(10))
    mobile: Mapped[str | None] = mapped_column(String(20))

    __table_args__ = (
        CheckConstraint(
            "role IN ('citizen', 'officer', 'admin')",
            name="ck_users_role",
        ),
    )


class System(Base):
    __tablename__ = "systems"

    code: Mapped[str] = mapped_column(String(20), primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    owner_department: Mapped[str] = mapped_column(String(200), nullable=False)
    protocol: Mapped[str] = mapped_column(String(100), nullable=False)
    id_scheme: Mapped[str] = mapped_column(String(150), nullable=False)
    auth_type: Mapped[str] = mapped_column(String(100), nullable=False)
    health: Mapped[str] = mapped_column(String(20), nullable=False, default="UP")
    simulate_down: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)

    __table_args__ = (
        CheckConstraint(
            "health IN ('UP', 'DOWN', 'DEGRADED')",
            name="ck_systems_health",
        ),
    )


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    system_code: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("systems.code"),
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(100), unique=True, nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    config_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    lookup_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    mapping_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="DRAFT")
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True)
    )

    __table_args__ = (
        CheckConstraint(
            "kind IN ('REST_JSON', 'REST_XML', 'SQL_VIEW', 'CSV')",
            name="ck_connectors_kind",
        ),
        CheckConstraint(
            "status IN ('DRAFT', 'TESTED', 'ACTIVE')",
            name="ck_connectors_status",
        ),
    )


class JourneyDef(Base):
    __tablename__ = "journey_defs"

    id: Mapped[str] = mapped_column(String(100), primary_key=True)
    version: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    definition_json: Mapped[dict] = mapped_column(JSON, nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")

    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE', 'DRAFT', 'DISABLED')",
            name="ck_journey_defs_status",
        ),
    )


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    journey_id: Mapped[str] = mapped_column(String(100), nullable=False)
    journey_version: Mapped[int] = mapped_column(Integer, nullable=False)
    master_id: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(String(30), nullable=False, default="CREATED")
    current_step: Mapped[str | None] = mapped_column(String(100))
    correlation_id: Mapped[str] = mapped_column(
        String(100), unique=True, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
        onupdate=utc_now,
    )
    outcome: Mapped[str | None] = mapped_column(String(100))
    canonical_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    external_refs_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    metrics_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    __table_args__ = (
        CheckConstraint(
            "status IN ("
            "'CREATED', 'IN_PROGRESS', 'BLOCKED_CONSENT', "
            "'PAUSED_EXCEPTION', 'NEEDS_REVIEW', 'SUBMITTED', "
            "'APPROVED', 'REJECTED', 'NOT_ELIGIBLE'"
            ")",
            name="ck_applications_status",
        ),
    )


class ApplicationStep(Base):
    __tablename__ = "application_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("applications.id", ondelete="CASCADE"),
        nullable=False,
    )
    step_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="PENDING")
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ended_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    error_code: Mapped[str | None] = mapped_column(String(100))
    error_detail: Mapped[str | None] = mapped_column(Text)
    output_json: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)

    __table_args__ = (
        UniqueConstraint(
            "application_id",
            "step_id",
            name="uq_application_step",
        ),
        CheckConstraint(
            "status IN ('PENDING', 'RUNNING', 'DONE', 'FAILED', 'WAITING', 'SKIPPED')",
            name="ck_application_steps_status",
        ),
    )


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    master_id: Mapped[str] = mapped_column(String(50), nullable=False)
    purpose: Mapped[str] = mapped_column(String(150), nullable=False)
    journey_id: Mapped[str] = mapped_column(String(100), nullable=False)
    fields_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    source_systems_json: Mapped[list] = mapped_column(
        JSON, nullable=False, default=list
    )
    granted_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="ACTIVE")

    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE', 'REVOKED', 'EXPIRED')",
            name="ck_consents_status",
        ),
    )


class AccessLog(Base):
    __tablename__ = "access_log"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    master_id: Mapped[str] = mapped_column(String(50), nullable=False)
    system_code: Mapped[str] = mapped_column(
        String(20),
        ForeignKey("systems.code"),
        nullable=False,
    )
    purpose: Mapped[str] = mapped_column(String(150), nullable=False)
    fields_json: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )
    application_id: Mapped[int | None] = mapped_column(
        Integer,
        ForeignKey("applications.id", ondelete="SET NULL"),
    )
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)

    __table_args__ = (
        CheckConstraint(
            "outcome IN ('ALLOWED', 'DENIED')",
            name="ck_access_log_outcome",
        ),
    )

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True,
    )
    user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    username: Mapped[str | None] = mapped_column(String(100))
    role: Mapped[str | None] = mapped_column(String(20))
    action: Mapped[str] = mapped_column(String(150), nullable=False)
    resource: Mapped[str | None] = mapped_column(String(150))
    status: Mapped[str] = mapped_column(
        String(30),
        nullable=False,
        default="Success",
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=utc_now,
    )

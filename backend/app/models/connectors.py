from datetime import datetime

from backend.app.db import Base
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class Connector(Base):
    __tablename__ = "connectors"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    system_code: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    kind: Mapped[str] = mapped_column(String(20), nullable=False)
    entity: Mapped[str] = mapped_column(String(100), nullable=False)
    config_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    lookup_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    mapping_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    validators_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    version: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )


class ConnectorCall(Base):
    __tablename__ = "connector_calls"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    connector_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    http_status: Mapped[int | None] = mapped_column(Integer, nullable=True)


class OnboardingSession(Base):
    __tablename__ = "onboarding_sessions"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    connector_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    admin_id: Mapped[int] = mapped_column(Integer, nullable=False)
    started_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    activated_at: Mapped[datetime | None] = mapped_column(
        DateTime,
        nullable=True,
    )
    code_changes: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
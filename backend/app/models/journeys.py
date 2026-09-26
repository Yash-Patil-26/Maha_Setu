from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base


class JourneyDef(Base):
    __tablename__ = "journey_defs"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    version: Mapped[int] = mapped_column(Integer, nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    definition_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    status: Mapped[str] = mapped_column(String(20), nullable=False)


class Application(Base):
    __tablename__ = "applications"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    journey_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    journey_version: Mapped[int] = mapped_column(Integer, nullable=False)
    master_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(30), nullable=False)
    current_step: Mapped[str | None] = mapped_column(String(100), nullable=True)
    correlation_id: Mapped[str] = mapped_column(String(100), nullable=False)
    due_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
    )
    decided_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    outcome: Mapped[str | None] = mapped_column(String(50), nullable=True)
    canonical_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    external_refs_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    metrics_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")


class ApplicationStep(Base):
    __tablename__ = "application_steps"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    application_id: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    step_id: Mapped[str] = mapped_column(String(100), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    attempts: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    started_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    ended_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    error_code: Mapped[str | None] = mapped_column(String(50), nullable=True)
    error_detail: Mapped[str | None] = mapped_column(Text, nullable=True)
    output_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
from datetime import datetime

from backend.app.db import Base
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column


class Consent(Base):
    __tablename__ = "consents"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    master_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    fields_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    source_systems_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    granted_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    expires_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    status: Mapped[str] = mapped_column(String(20), nullable=False)


class AccessLog(Base):
    __tablename__ = "access_log"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    master_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    system_code: Mapped[str] = mapped_column(String(10), nullable=False)
    purpose: Mapped[str] = mapped_column(String(255), nullable=False)
    fields_json: Mapped[str] = mapped_column(Text, nullable=False, default="[]")
    at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )
    application_id: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )
    outcome: Mapped[str] = mapped_column(String(20), nullable=False)
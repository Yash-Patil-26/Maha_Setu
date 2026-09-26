from datetime import datetime

from sqlalchemy import Boolean, DateTime, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from backend.app.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(100), nullable=False, unique=True)
    password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    master_id: Mapped[str | None] = mapped_column(String(32), nullable=True)
    display_name: Mapped[str] = mapped_column(String(255), nullable=False)
    locale: Mapped[str] = mapped_column(String(20), nullable=False)


class DataConflict(Base):
    __tablename__ = "data_conflicts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    master_id: Mapped[str] = mapped_column(String(32), nullable=False, index=True)
    attribute: Mapped[str] = mapped_column(String(100), nullable=False)
    values_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    status: Mapped[str] = mapped_column(String(20), nullable=False)
    resolution_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    resolved_by: Mapped[str | None] = mapped_column(String(100), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


class System(Base):
    __tablename__ = "systems"

    code: Mapped[str] = mapped_column(String(10), primary_key=True)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    owner_department: Mapped[str] = mapped_column(String(255), nullable=False)
    steward_contact: Mapped[str] = mapped_column(String(255), nullable=False)
    protocol: Mapped[str] = mapped_column(String(50), nullable=False)
    id_scheme: Mapped[str] = mapped_column(String(100), nullable=False)
    auth_type: Mapped[str] = mapped_column(String(50), nullable=False)
    health: Mapped[str] = mapped_column(String(20), nullable=False)
    simulate_down: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False,
    )
from datetime import datetime

from backend.app.db import Base
from sqlalchemy import DateTime, Float, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column


class MasterCitizen(Base):
    __tablename__ = "master_citizens"

    master_id: Mapped[str] = mapped_column(String(32), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(255), nullable=False)
    dob: Mapped[str] = mapped_column(String(10), nullable=False)
    mobile: Mapped[str] = mapped_column(String(10), nullable=False, index=True)
    golden_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    provenance_json: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
        default=datetime.utcnow,
    )


class IdentityLink(Base):
    __tablename__ = "identity_links"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    master_id: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        index=True,
    )
    system_code: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
    )
    external_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    method: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )
    confidence: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )
    status: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
    )

    __table_args__ = (
        UniqueConstraint(
            "master_id",
            "system_code",
            name="uq_identity_link_master_system",
        ),
    )
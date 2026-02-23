import uuid
from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AuthAccountRole(Base):
    __tablename__ = "auth_account_roles"

    auth_account_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("auth_accounts.id"),
        primary_key=True,
    )
    role: Mapped[str] = mapped_column(String(20), primary_key=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

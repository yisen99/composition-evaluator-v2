from datetime import datetime, timezone
from uuid import UUID

from sqlalchemy import DateTime, ForeignKey, String, Uuid
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class WechatAccountLink(Base):
    __tablename__ = "wechat_account_links"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    auth_account_id: Mapped[UUID] = mapped_column(Uuid, ForeignKey("auth_accounts.id"), nullable=False, unique=True, index=True)
    unionid: Mapped[str | None] = mapped_column(String(128), nullable=True, unique=True, index=True)
    openid: Mapped[str] = mapped_column(String(128), nullable=False, unique=True, index=True)
    nickname: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)


class WechatBindSession(Base):
    __tablename__ = "wechat_bind_sessions"

    ticket: Mapped[str] = mapped_column(String(64), primary_key=True)
    role: Mapped[str] = mapped_column(String(20), nullable=False)
    unionid: Mapped[str | None] = mapped_column(String(128), nullable=True, index=True)
    openid: Mapped[str] = mapped_column(String(128), nullable=False, index=True)
    nickname: Mapped[str | None] = mapped_column(String(120), nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    next_path: Mapped[str | None] = mapped_column(String(500), nullable=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False, index=True)
    consumed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

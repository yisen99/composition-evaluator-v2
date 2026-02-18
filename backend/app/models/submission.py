from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class Submission(Base):
    __tablename__ = "submissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), nullable=False, index=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("classes.id"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    content_type: Mapped[str] = mapped_column(String(20), nullable=False)
    text_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    file_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    storage_provider: Mapped[str] = mapped_column(String(40), default="local", nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="submitted", nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

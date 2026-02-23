from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class AssignmentReminder(Base):
    __tablename__ = "assignment_reminders"

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    assignment_id: Mapped[str] = mapped_column(ForeignKey("assignments.id"), nullable=False, index=True)
    class_id: Mapped[str] = mapped_column(ForeignKey("classes.id"), nullable=False, index=True)
    teacher_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    reminder_type: Mapped[str] = mapped_column(String(32), nullable=False, default="submission")
    target_student_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    message: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)

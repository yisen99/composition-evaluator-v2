from datetime import datetime, timezone

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ManualFeedbackReceipt(Base):
    __tablename__ = "manual_feedback_receipts"
    __table_args__ = (
        UniqueConstraint("submission_id", "student_id", name="uq_manual_feedback_receipt_submission_student"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True)
    manual_review_id: Mapped[str] = mapped_column(ForeignKey("manual_reviews.id"), nullable=False, index=True)
    submission_id: Mapped[str] = mapped_column(ForeignKey("submissions.id"), nullable=False, index=True)
    student_id: Mapped[str] = mapped_column(ForeignKey("users.id"), nullable=False, index=True)
    first_viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    last_viewed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    view_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False)

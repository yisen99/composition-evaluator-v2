from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ManualReviewStatus = Literal["draft", "published"]
ManualReviewQueueStatus = Literal["none", "draft", "published"]


class ManualReviewDraftRequest(BaseModel):
    submission_id: str
    structure_score: int = Field(ge=0, le=100)
    language_score: int = Field(ge=0, le=100)
    value_score: int = Field(ge=0, le=100)
    summary_feedback: str = Field(min_length=1, max_length=5000)
    actionable_suggestions: list[str] = Field(min_length=2, max_length=8)
    strengths: str | None = Field(default=None, max_length=2000)
    next_goal: str | None = Field(default=None, max_length=2000)

    @field_validator("summary_feedback")
    @classmethod
    def _normalize_feedback(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("summary_feedback must not be empty")
        return normalized

    @field_validator("actionable_suggestions")
    @classmethod
    def _normalize_suggestions(cls, value: list[str]) -> list[str]:
        normalized = [item.strip() for item in value if item and item.strip()]
        if len(normalized) < 2:
            raise ValueError("at least 2 actionable suggestions are required")
        return normalized

    @field_validator("strengths", "next_goal")
    @classmethod
    def _normalize_optional_text(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class ManualReviewPublishRequest(BaseModel):
    submission_id: str


class ManualReviewRead(BaseModel):
    review_id: str
    submission_id: str
    assignment_id: str
    class_id: str
    student_id: str
    teacher_id: str
    structure_score: int
    language_score: int
    value_score: int
    total_score: int
    summary_feedback: str
    actionable_suggestions: list[str]
    strengths: str | None = None
    next_goal: str | None = None
    status: ManualReviewStatus
    version: int
    created_at: datetime
    updated_at: datetime
    published_at: datetime | None = None


class ManualReviewSubmissionResponse(BaseModel):
    submission_id: str
    exists: bool
    review: ManualReviewRead | None = None


class AssignmentGradingQueueItem(BaseModel):
    submission_id: str
    student_id: str
    student_name: str
    content_type: str
    submitted_at: datetime
    manual_status: ManualReviewQueueStatus
    manual_total_score: int | None = None
    manual_updated_at: datetime | None = None
    manual_published_at: datetime | None = None
    manual_viewed: bool = False
    manual_view_count: int = 0
    manual_first_viewed_at: datetime | None = None
    manual_last_viewed_at: datetime | None = None


class AssignmentGradingQueueResponse(BaseModel):
    assignment_id: str
    class_id: str
    total_submissions: int
    manual_draft_count: int
    manual_published_count: int
    items: list[AssignmentGradingQueueItem]

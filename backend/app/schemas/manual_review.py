from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ManualReviewStatus = Literal["draft", "published"]
ManualReviewQueueStatus = Literal["none", "draft", "published"]
ManualReviewReplyAuthorRole = Literal["teacher", "student"]


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


class ManualReviewReplyCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=3000)

    @field_validator("content")
    @classmethod
    def _normalize_content(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("content must not be empty")
        return normalized


class StudentManualReviewReplyCreateRequest(ManualReviewReplyCreateRequest):
    submission_id: str


class ManualReviewReplyRead(BaseModel):
    reply_id: str
    manual_review_id: str
    submission_id: str
    assignment_id: str
    class_id: str
    student_id: str
    teacher_id: str
    author_role: ManualReviewReplyAuthorRole
    author_id: str
    content: str
    created_at: datetime


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
    reply_total_count: int = 0
    student_reply_count: int = 0
    teacher_reply_count: int = 0
    pending_teacher_reply: bool = False
    last_reply_role: ManualReviewReplyAuthorRole | None = None
    last_reply_at: datetime | None = None


class AssignmentGradingQueueResponse(BaseModel):
    assignment_id: str
    class_id: str
    total_submissions: int
    manual_draft_count: int
    manual_published_count: int
    items: list[AssignmentGradingQueueItem]


class AssignmentCommunicationStudentItem(BaseModel):
    student_id: str
    student_name: str
    submission_ids: list[str]
    reply_total_count: int
    student_reply_count: int
    teacher_reply_count: int
    pending_teacher_reply_count: int
    pending_student_reply_count: int
    unread_by_student_reply_count: int
    latest_reply_role: ManualReviewReplyAuthorRole | None = None
    latest_reply_content: str | None = None
    latest_reply_at: datetime | None = None


class AssignmentCommunicationThreadsResponse(BaseModel):
    assignment_id: str
    class_id: str
    total_students: int
    total_replies: int
    total_pending_teacher_replies: int
    total_unread_by_students: int
    items: list[AssignmentCommunicationStudentItem]

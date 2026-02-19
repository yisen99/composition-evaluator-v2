from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator

SubmissionContentType = Literal["text", "image", "document"]
ReviewAgentName = Literal["structure", "language", "value"]


class CreateSubmissionResponse(BaseModel):
    submission_id: str
    assignment_id: str
    class_id: str
    student_id: str
    content_type: SubmissionContentType
    file_url: str | None = None
    status: str
    created_at: datetime


class StudentSubmissionListItem(BaseModel):
    submission_id: str
    assignment_id: str
    assignment_title: str
    class_id: str
    class_name: str
    content_type: SubmissionContentType
    status: str
    created_at: datetime
    due_at: datetime | None = None
    file_name: str | None = None
    file_url: str | None = None
    text_excerpt: str | None = None


class StudentAgentDimensionScore(BaseModel):
    structure: int | None = None
    language: int | None = None
    value: int | None = None


class StudentAgentReviewItem(BaseModel):
    agent_name: ReviewAgentName
    score: int
    feedback: str
    created_at: datetime


class StudentAgentSummary(BaseModel):
    total_score: int | None = None
    radar: StudentAgentDimensionScore
    items: list[StudentAgentReviewItem]


class StudentManualFeedbackItem(BaseModel):
    submission_id: str
    assignment_id: str
    assignment_title: str
    class_id: str
    class_name: str
    content_type: SubmissionContentType
    created_at: datetime
    manual_total_score: int
    structure_score: int
    language_score: int
    value_score: int
    summary_feedback: str
    actionable_suggestions: list[str]
    strengths: str | None = None
    next_goal: str | None = None
    manual_published_at: datetime | None = None
    manual_view_count: int = 0
    manual_first_viewed_at: datetime | None = None
    manual_last_viewed_at: datetime | None = None
    agent_summary: StudentAgentSummary | None = None


class MarkManualFeedbackReadRequest(BaseModel):
    submission_ids: list[str] = Field(min_length=1, max_length=50)

    @field_validator("submission_ids")
    @classmethod
    def _normalize_submission_ids(cls, value: list[str]) -> list[str]:
        normalized = []
        seen: set[str] = set()
        for item in value:
            submission_id = item.strip()
            if not submission_id or submission_id in seen:
                continue
            seen.add(submission_id)
            normalized.append(submission_id)
        if not normalized:
            raise ValueError("submission_ids must include at least 1 valid id")
        return normalized


class MarkManualFeedbackReadResponse(BaseModel):
    marked_count: int

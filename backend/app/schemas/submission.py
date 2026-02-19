from datetime import datetime
from typing import Literal

from pydantic import BaseModel

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
    agent_summary: StudentAgentSummary | None = None

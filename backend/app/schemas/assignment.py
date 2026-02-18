from datetime import datetime

from pydantic import BaseModel


class CreateAssignmentRequest(BaseModel):
    class_id: str
    title: str
    prompt: str
    due_at: datetime | None = None


class CreateAssignmentResponse(BaseModel):
    assignment_id: str
    class_id: str
    status: str


class AssignmentListItem(BaseModel):
    assignment_id: str
    class_id: str
    title: str
    prompt: str
    due_at: datetime | None = None
    status: str


class AssignmentSubmissionItem(BaseModel):
    submission_id: str
    student_id: str
    student_name: str
    content_type: str
    status: str
    created_at: datetime
    file_url: str | None = None
    text_excerpt: str | None = None
    latest_agent_name: str | None = None
    latest_review_score: int | None = None
    latest_review_feedback: str | None = None
    latest_memory_note: str | None = None


class AssignmentDetailResponse(BaseModel):
    assignment_id: str
    class_id: str
    teacher_id: str
    title: str
    prompt: str
    due_at: datetime | None = None
    status: str
    created_at: datetime
    submissions_count: int
    submissions: list[AssignmentSubmissionItem]

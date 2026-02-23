from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


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


AssignmentBatchAction = Literal["enter_workflow", "publish_reminder", "advance_status"]
AssignmentTargetStatus = Literal["published", "closed"]
AssignmentBatchItemStatus = Literal["success", "failed"]


class AssignmentBatchActionRequest(BaseModel):
    assignment_ids: list[str] = Field(min_length=1, max_length=100)
    action: AssignmentBatchAction
    target_status: AssignmentTargetStatus | None = None

    @field_validator("assignment_ids")
    @classmethod
    def _normalize_assignment_ids(cls, value: list[str]) -> list[str]:
        normalized: list[str] = []
        seen: set[str] = set()
        for assignment_id in value:
            current = assignment_id.strip()
            if not current or current in seen:
                continue
            seen.add(current)
            normalized.append(current)
        if not normalized:
            raise ValueError("assignment_ids must include at least one valid id")
        return normalized


class AssignmentBatchActionResultItem(BaseModel):
    assignment_id: str
    title: str | None = None
    class_id: str | None = None
    status: AssignmentBatchItemStatus
    detail: str
    detail_path: str | None = None
    before_status: str | None = None
    after_status: str | None = None
    reminder_target_count: int | None = None


class AssignmentBatchActionResponse(BaseModel):
    action: AssignmentBatchAction
    total: int
    succeeded: int
    failed: int
    workflow_assignment_ids: list[str] = []
    results: list[AssignmentBatchActionResultItem]

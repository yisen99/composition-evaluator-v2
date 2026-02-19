from datetime import datetime

from pydantic import BaseModel


class StudentMemoryItem(BaseModel):
    note_id: str
    student_id: str
    teacher_id: str
    class_id: str
    source_submission_id: str
    source_review_id: str
    agent_name: str
    note: str
    tags: str
    status: str
    created_at: datetime


class StudentMemoryResponse(BaseModel):
    student_id: str
    total: int
    items: list[StudentMemoryItem]


class StudentProgressSubmissionItem(BaseModel):
    submission_id: str
    assignment_id: str
    assignment_title: str
    class_id: str
    class_name: str
    content_type: str
    submitted_at: datetime
    structure_score: int | None = None
    language_score: int | None = None
    value_score: int | None = None
    total_score: int | None = None


class StudentProgressPoint(BaseModel):
    index: int
    submitted_at: datetime
    total_score: int | None = None


class StudentProgressResponse(BaseModel):
    student_id: str
    total_submissions: int
    latest_score: int | None = None
    average_score: int | None = None
    best_score: int | None = None
    score_delta_from_first: int | None = None
    trajectory: list[StudentProgressPoint]
    submissions: list[StudentProgressSubmissionItem]

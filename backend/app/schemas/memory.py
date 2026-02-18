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

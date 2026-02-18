from datetime import datetime

from pydantic import BaseModel


class CreateAssignmentRequest(BaseModel):
    class_id: str
    teacher_id: str
    title: str
    prompt: str
    due_at: datetime | None = None


class CreateAssignmentResponse(BaseModel):
    assignment_id: str
    class_id: str
    status: str

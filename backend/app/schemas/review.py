from datetime import datetime
from typing import Literal

from pydantic import BaseModel

ReviewAgentName = Literal["structure", "language", "value"]


class RunReviewRequest(BaseModel):
    submission_id: str
    agent_name: ReviewAgentName


class RunReviewResponse(BaseModel):
    review_id: str
    submission_id: str
    assignment_id: str
    class_id: str
    student_id: str
    teacher_id: str
    agent_name: ReviewAgentName
    score: int
    feedback: str
    memory_note_id: str
    status: str
    created_at: datetime

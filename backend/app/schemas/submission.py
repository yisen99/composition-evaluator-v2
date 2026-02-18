from datetime import datetime
from typing import Literal

from pydantic import BaseModel

SubmissionContentType = Literal["text", "image", "document"]


class CreateSubmissionResponse(BaseModel):
    submission_id: str
    assignment_id: str
    class_id: str
    student_id: str
    content_type: SubmissionContentType
    file_url: str | None = None
    status: str
    created_at: datetime

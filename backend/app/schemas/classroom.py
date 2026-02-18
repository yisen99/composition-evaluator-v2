from typing import Literal

from pydantic import BaseModel


class CreateClassRequest(BaseModel):
    name: str
    grade_band: Literal["primary", "junior"]


class CreateClassResponse(BaseModel):
    class_id: str
    join_code: str


class JoinClassRequest(BaseModel):
    join_code: str
    student_name: str | None = None


class JoinClassResponse(BaseModel):
    class_id: str
    class_name: str

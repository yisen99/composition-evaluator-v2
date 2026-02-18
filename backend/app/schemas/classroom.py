from typing import Literal

from pydantic import BaseModel

ClassGradeBand = Literal["primary", "junior"]


class CreateClassRequest(BaseModel):
    name: str
    grade_band: ClassGradeBand


class CreateClassResponse(BaseModel):
    class_id: str
    join_code: str


class JoinClassRequest(BaseModel):
    join_code: str
    student_name: str | None = None


class JoinClassResponse(BaseModel):
    class_id: str
    class_name: str


class ClassListItem(BaseModel):
    class_id: str
    name: str
    grade_band: ClassGradeBand
    join_code: str

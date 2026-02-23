from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator


class UxEventTrackRequest(BaseModel):
    event_name: str = Field(min_length=1, max_length=100)
    event_category: str = Field(min_length=1, max_length=50)
    page: str | None = Field(default=None, max_length=160)
    properties: dict[str, Any] | None = None

    @field_validator("event_name", "event_category")
    @classmethod
    def _normalize_key(cls, value: str) -> str:
        normalized = value.strip()
        if not normalized:
            raise ValueError("field must not be empty")
        return normalized

    @field_validator("page")
    @classmethod
    def _normalize_page(cls, value: str | None) -> str | None:
        if value is None:
            return None
        normalized = value.strip()
        return normalized or None


class UxEventTrackResponse(BaseModel):
    event_id: str
    created_at: datetime


class UxEventMetricItem(BaseModel):
    event_name: str
    count: int


class UxMetricsSummaryResponse(BaseModel):
    days: int
    total_events: int
    active_user_count: int
    teacher_task_center_view_count: int
    teacher_batch_action_count: int
    student_todo_click_count: int
    event_breakdown: list[UxEventMetricItem]

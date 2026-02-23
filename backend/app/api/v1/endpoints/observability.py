import json
from datetime import datetime, timedelta, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_teacher
from app.db.deps import get_db
from app.models import UxEventLog, User
from app.schemas.observability import (
    UxEventMetricItem,
    UxEventTrackRequest,
    UxEventTrackResponse,
    UxMetricsSummaryResponse,
)

router = APIRouter()


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


@router.post("/events", response_model=UxEventTrackResponse)
def track_ux_event(
    payload: UxEventTrackRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> UxEventTrackResponse:
    event = UxEventLog(
        id=str(uuid4()),
        user_id=current_user.id,
        role=current_user.role,
        event_name=payload.event_name,
        event_category=payload.event_category,
        page=payload.page,
        properties_json=json.dumps(payload.properties, ensure_ascii=False) if payload.properties else None,
        created_at=_utcnow(),
    )
    db.add(event)
    db.commit()
    return UxEventTrackResponse(event_id=event.id, created_at=event.created_at)


@router.get("/summary", response_model=UxMetricsSummaryResponse)
def get_ux_metrics_summary(
    days: int = Query(default=7, ge=1, le=30),
    db: Session = Depends(get_db),
    _: User = Depends(require_teacher),
) -> UxMetricsSummaryResponse:
    since = _utcnow() - timedelta(days=days)
    base_query = select(UxEventLog).where(UxEventLog.created_at >= since)

    total_events = db.scalar(select(func.count()).select_from(base_query.subquery())) or 0
    active_user_count = db.scalar(
        select(func.count(func.distinct(UxEventLog.user_id))).where(UxEventLog.created_at >= since)
    ) or 0

    teacher_task_center_view_count = db.scalar(
        select(func.count())
        .select_from(UxEventLog)
        .where(
            UxEventLog.created_at >= since,
            UxEventLog.event_name == "teacher_task_center_view",
        )
    ) or 0
    teacher_batch_action_count = db.scalar(
        select(func.count())
        .select_from(UxEventLog)
        .where(
            UxEventLog.created_at >= since,
            UxEventLog.event_name == "teacher_task_batch_action_execute",
        )
    ) or 0
    student_todo_click_count = db.scalar(
        select(func.count())
        .select_from(UxEventLog)
        .where(
            UxEventLog.created_at >= since,
            UxEventLog.event_name == "student_todo_card_click",
        )
    ) or 0

    breakdown_rows = db.execute(
        select(UxEventLog.event_name, func.count(UxEventLog.id))
        .where(UxEventLog.created_at >= since)
        .group_by(UxEventLog.event_name)
        .order_by(func.count(UxEventLog.id).desc(), UxEventLog.event_name.asc())
        .limit(20)
    ).all()
    event_breakdown = [UxEventMetricItem(event_name=name, count=count) for name, count in breakdown_rows]

    return UxMetricsSummaryResponse(
        days=days,
        total_events=total_events,
        active_user_count=active_user_count,
        teacher_task_center_view_count=teacher_task_center_view_count,
        teacher_batch_action_count=teacher_batch_action_count,
        student_todo_click_count=student_todo_click_count,
        event_breakdown=event_breakdown,
    )

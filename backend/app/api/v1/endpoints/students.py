from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import require_student, require_teacher
from app.db.deps import get_db
from app.models import Assignment, ClassMember, ClassRoom, StudentMemoryNote, Submission, SubmissionReview, User
from app.schemas.memory import (
    StudentMemoryItem,
    StudentMemoryResponse,
    StudentProgressPoint,
    StudentProgressResponse,
    StudentProgressSubmissionItem,
)

router = APIRouter()


@router.get("/me/progress", response_model=StudentProgressResponse)
def get_my_progress(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> StudentProgressResponse:
    rows = db.execute(
        select(Submission, Assignment.title, ClassRoom.name)
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .join(ClassRoom, ClassRoom.id == Submission.class_id)
        .where(Submission.student_id == current_student.id)
        .order_by(Submission.created_at.asc())
    ).all()

    trajectory: list[StudentProgressPoint] = []
    submissions: list[StudentProgressSubmissionItem] = []
    total_score_series: list[int] = []

    for index, (submission, assignment_title, class_name) in enumerate(rows, start=1):
        latest_reviews = db.scalars(
            select(SubmissionReview)
            .where(SubmissionReview.submission_id == submission.id)
            .order_by(SubmissionReview.created_at.desc())
        ).all()
        score_by_agent: dict[str, int] = {}
        for review in latest_reviews:
            if review.agent_name not in score_by_agent:
                score_by_agent[review.agent_name] = review.score

        dimension_scores = [
            score_by_agent.get("structure"),
            score_by_agent.get("language"),
            score_by_agent.get("value"),
        ]
        valid_scores = [score for score in dimension_scores if score is not None]
        total_score = round(sum(valid_scores) / len(valid_scores)) if valid_scores else None
        if total_score is not None:
            total_score_series.append(total_score)

        trajectory.append(
            StudentProgressPoint(
                index=index,
                submitted_at=submission.created_at,
                total_score=total_score,
            )
        )
        submissions.append(
            StudentProgressSubmissionItem(
                submission_id=submission.id,
                assignment_id=submission.assignment_id,
                assignment_title=assignment_title,
                class_id=submission.class_id,
                class_name=class_name,
                content_type=submission.content_type,
                submitted_at=submission.created_at,
                structure_score=score_by_agent.get("structure"),
                language_score=score_by_agent.get("language"),
                value_score=score_by_agent.get("value"),
                total_score=total_score,
            )
        )

    average_score = round(sum(total_score_series) / len(total_score_series)) if total_score_series else None
    best_score = max(total_score_series) if total_score_series else None
    latest_score = total_score_series[-1] if total_score_series else None
    score_delta_from_first = (
        (total_score_series[-1] - total_score_series[0]) if len(total_score_series) >= 2 else None
    )

    return StudentProgressResponse(
        student_id=current_student.id,
        total_submissions=len(submissions),
        latest_score=latest_score,
        average_score=average_score,
        best_score=best_score,
        score_delta_from_first=score_delta_from_first,
        trajectory=trajectory,
        submissions=list(reversed(submissions)),
    )


@router.get("/{student_id}/memory", response_model=StudentMemoryResponse)
def get_student_memory(
    student_id: str,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> StudentMemoryResponse:
    can_access_student = db.scalar(
        select(ClassMember.id)
        .join(ClassRoom, ClassRoom.id == ClassMember.class_id)
        .where(
            ClassMember.student_id == student_id,
            ClassRoom.teacher_id == current_teacher.id,
        )
        .limit(1)
    )
    if not can_access_student:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher does not have access to this student",
        )

    notes = db.scalars(
        select(StudentMemoryNote)
        .where(
            StudentMemoryNote.student_id == student_id,
            StudentMemoryNote.teacher_id == current_teacher.id,
        )
        .order_by(StudentMemoryNote.created_at.desc())
    ).all()

    return StudentMemoryResponse(
        student_id=student_id,
        total=len(notes),
        items=[
            StudentMemoryItem(
                note_id=note.id,
                student_id=note.student_id,
                teacher_id=note.teacher_id,
                class_id=note.class_id,
                source_submission_id=note.source_submission_id,
                source_review_id=note.source_review_id,
                agent_name=note.agent_name,
                note=note.note,
                tags=note.tags,
                status=note.status,
                created_at=note.created_at,
            )
            for note in notes
        ],
    )

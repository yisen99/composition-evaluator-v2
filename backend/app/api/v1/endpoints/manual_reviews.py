from datetime import datetime, timezone
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import require_teacher
from app.db.deps import get_db
from app.models import Assignment, ManualReview, Submission, User
from app.schemas.manual_review import (
    ManualReviewDraftRequest,
    ManualReviewPublishRequest,
    ManualReviewRead,
    ManualReviewSubmissionResponse,
)

router = APIRouter()


def _get_owned_submission(
    db: Session,
    *,
    submission_id: str,
    current_teacher: User,
) -> tuple[Submission, Assignment]:
    submission = db.get(Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    assignment = db.get(Assignment, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher does not own this submission")

    return submission, assignment


def _to_manual_review_read(review: ManualReview) -> ManualReviewRead:
    return ManualReviewRead(
        review_id=review.id,
        submission_id=review.submission_id,
        assignment_id=review.assignment_id,
        class_id=review.class_id,
        student_id=review.student_id,
        teacher_id=review.teacher_id,
        structure_score=review.structure_score,
        language_score=review.language_score,
        value_score=review.value_score,
        total_score=review.total_score,
        summary_feedback=review.summary_feedback,
        actionable_suggestions=review.actionable_suggestions,
        strengths=review.strengths,
        next_goal=review.next_goal,
        status=review.status,  # type: ignore[arg-type]
        version=review.version,
        created_at=review.created_at,
        updated_at=review.updated_at,
        published_at=review.published_at,
    )


@router.get("/submission/{submission_id}", response_model=ManualReviewSubmissionResponse)
def get_submission_manual_review(
    submission_id: str,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> ManualReviewSubmissionResponse:
    submission, _ = _get_owned_submission(db, submission_id=submission_id, current_teacher=current_teacher)
    review = db.scalar(
        select(ManualReview)
        .where(
            ManualReview.submission_id == submission.id,
            ManualReview.teacher_id == current_teacher.id,
        )
        .limit(1)
    )
    if not review:
        return ManualReviewSubmissionResponse(submission_id=submission.id, exists=False, review=None)
    return ManualReviewSubmissionResponse(submission_id=submission.id, exists=True, review=_to_manual_review_read(review))


@router.post("/draft", response_model=ManualReviewRead)
def save_manual_review_draft(
    payload: ManualReviewDraftRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> ManualReviewRead:
    submission, assignment = _get_owned_submission(db, submission_id=payload.submission_id, current_teacher=current_teacher)
    total_score = round((payload.structure_score + payload.language_score + payload.value_score) / 3)

    review = db.scalar(
        select(ManualReview)
        .where(
            ManualReview.submission_id == submission.id,
            ManualReview.teacher_id == current_teacher.id,
        )
        .limit(1)
    )
    if review:
        review.structure_score = payload.structure_score
        review.language_score = payload.language_score
        review.value_score = payload.value_score
        review.total_score = total_score
        review.summary_feedback = payload.summary_feedback
        review.actionable_suggestions = payload.actionable_suggestions
        review.strengths = payload.strengths
        review.next_goal = payload.next_goal
        review.status = "draft"
        review.published_at = None
        review.version += 1
        review.updated_at = datetime.now(timezone.utc)
    else:
        review = ManualReview(
            id=str(uuid4()),
            submission_id=submission.id,
            assignment_id=assignment.id,
            class_id=assignment.class_id,
            student_id=submission.student_id,
            teacher_id=current_teacher.id,
            structure_score=payload.structure_score,
            language_score=payload.language_score,
            value_score=payload.value_score,
            total_score=total_score,
            summary_feedback=payload.summary_feedback,
            actionable_suggestions=payload.actionable_suggestions,
            strengths=payload.strengths,
            next_goal=payload.next_goal,
            status="draft",
            version=1,
        )
        db.add(review)

    db.commit()
    db.refresh(review)
    return _to_manual_review_read(review)


@router.post("/publish", response_model=ManualReviewRead)
def publish_manual_review(
    payload: ManualReviewPublishRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> ManualReviewRead:
    submission, _ = _get_owned_submission(db, submission_id=payload.submission_id, current_teacher=current_teacher)
    review = db.scalar(
        select(ManualReview)
        .where(
            ManualReview.submission_id == submission.id,
            ManualReview.teacher_id == current_teacher.id,
        )
        .limit(1)
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual review draft not found")

    review.status = "published"
    review.version += 1
    now = datetime.now(timezone.utc)
    review.published_at = now
    review.updated_at = now

    db.commit()
    db.refresh(review)
    return _to_manual_review_read(review)

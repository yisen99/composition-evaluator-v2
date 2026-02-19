from uuid import uuid4
from typing import cast

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import require_teacher
from app.db.deps import get_db
from app.models import Assignment, StudentMemoryNote, Submission, SubmissionReview, User
from app.schemas.review import (
    ReviewAgentName,
    ReviewDimensionScore,
    ReviewSummaryItem,
    ReviewSummaryRequest,
    ReviewSummaryResponse,
    RunReviewRequest,
    RunReviewResponse,
)
from app.services.review import build_summary_suggestions, run_agent_review

router = APIRouter()


@router.post("/run", response_model=RunReviewResponse)
def run_review(
    payload: RunReviewRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> RunReviewResponse:
    submission = db.get(Submission, payload.submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    assignment = db.get(Assignment, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.teacher_id != current_teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher does not own this submission",
        )

    review_result = run_agent_review(
        agent_name=payload.agent_name,
        title=assignment.title,
        prompt=assignment.prompt,
        content_type=submission.content_type,
        text_content=submission.text_content,
    )

    review = SubmissionReview(
        id=str(uuid4()),
        submission_id=submission.id,
        assignment_id=submission.assignment_id,
        class_id=submission.class_id,
        student_id=submission.student_id,
        teacher_id=current_teacher.id,
        agent_name=payload.agent_name,
        score=review_result.score,
        feedback=review_result.feedback,
        status="completed",
    )
    db.add(review)
    db.flush()

    note = StudentMemoryNote(
        id=str(uuid4()),
        student_id=submission.student_id,
        teacher_id=current_teacher.id,
        class_id=submission.class_id,
        source_submission_id=submission.id,
        source_review_id=review.id,
        agent_name=payload.agent_name,
        note=review_result.memory_note,
        tags=",".join(review_result.tags),
        status="active",
    )
    db.add(note)
    db.commit()
    db.refresh(review)
    db.refresh(note)

    return RunReviewResponse(
        review_id=review.id,
        submission_id=review.submission_id,
        assignment_id=review.assignment_id,
        class_id=review.class_id,
        student_id=review.student_id,
        teacher_id=review.teacher_id,
        agent_name=payload.agent_name,
        score=review.score,
        feedback=review.feedback,
        rewrite_suggestions=review_result.rewrite_suggestions,
        memory_note_id=note.id,
        status=review.status,
        created_at=review.created_at,
    )


@router.post("/summary", response_model=ReviewSummaryResponse)
def create_review_summary(
    payload: ReviewSummaryRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> ReviewSummaryResponse:
    submission = db.get(Submission, payload.submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    assignment = db.get(Assignment, submission.assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.teacher_id != current_teacher.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher does not own this submission",
        )

    scores: dict[str, int] = {}
    feedbacks: dict[str, str] = {}
    summary_items: list[ReviewSummaryItem] = []

    for agent_name in ("structure", "language", "value"):
        normalized_agent = cast(ReviewAgentName, agent_name)
        latest_review = db.scalar(
            select(SubmissionReview)
            .where(
                SubmissionReview.submission_id == submission.id,
                SubmissionReview.agent_name == normalized_agent,
            )
            .order_by(SubmissionReview.created_at.desc())
            .limit(1)
        )

        if latest_review is None:
            review_payload = RunReviewRequest(submission_id=submission.id, agent_name=normalized_agent)
            run_result = run_review(review_payload, db=db, current_teacher=current_teacher)
            latest_review = db.get(SubmissionReview, run_result.review_id)

        if latest_review is None:
            continue

        scores[agent_name] = latest_review.score
        feedbacks[agent_name] = latest_review.feedback
        summary_items.append(
            ReviewSummaryItem(
                agent_name=normalized_agent,
                score=latest_review.score,
                feedback=latest_review.feedback,
            )
        )

    radar = ReviewDimensionScore(
        structure=scores.get("structure", 0),
        language=scores.get("language", 0),
        value=scores.get("value", 0),
    )
    valid_scores = [radar.structure, radar.language, radar.value]
    total_score = round(sum(valid_scores) / len(valid_scores)) if valid_scores else 0

    actionable_suggestions = build_summary_suggestions(
        feedbacks={
            "structure": feedbacks.get("structure", ""),
            "language": feedbacks.get("language", ""),
            "value": feedbacks.get("value", ""),
        },
        prompt=assignment.prompt,
    )

    return ReviewSummaryResponse(
        submission_id=submission.id,
        assignment_id=submission.assignment_id,
        class_id=submission.class_id,
        student_id=submission.student_id,
        total_score=total_score,
        radar=radar,
        items=summary_items,
        actionable_suggestions=actionable_suggestions,
    )

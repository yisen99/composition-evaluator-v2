from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import require_teacher
from app.db.deps import get_db
from app.models import Assignment, StudentMemoryNote, Submission, SubmissionReview, User
from app.schemas.review import RunReviewRequest, RunReviewResponse
from app.services.review import build_agent_review

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

    score, feedback, memory_note = build_agent_review(
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
        score=score,
        feedback=feedback,
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
        note=memory_note,
        tags=f"agent:{payload.agent_name},score:{score}",
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
        memory_note_id=note.id,
        status=review.status,
        created_at=review.created_at,
    )

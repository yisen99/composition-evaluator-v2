from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import and_, select
from sqlalchemy.orm import Session

from app.api.deps.auth import require_student
from app.core.config import settings
from app.db.deps import get_db
from app.models import (
    Assignment,
    ClassMember,
    ClassRoom,
    ManualFeedbackReceipt,
    ManualReview,
    Submission,
    SubmissionReview,
    User,
)
from app.schemas.submission import (
    CreateSubmissionResponse,
    MarkManualFeedbackReadRequest,
    MarkManualFeedbackReadResponse,
    StudentAgentDimensionScore,
    StudentAgentReviewItem,
    StudentAgentSummary,
    StudentManualFeedbackItem,
    StudentSubmissionListItem,
    SubmissionContentType,
)
from app.services.storage import get_storage_backend

router = APIRouter()

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".webp", ".gif"}
DOCUMENT_EXTENSIONS = {".doc", ".docx", ".pdf", ".txt", ".md"}
AGENT_NAMES = ("structure", "language", "value")


def _is_assignment_overdue(due_at: datetime | None) -> bool:
    if due_at is None:
        return False
    normalized_due_at = due_at if due_at.tzinfo else due_at.replace(tzinfo=timezone.utc)
    return normalized_due_at < datetime.now(timezone.utc)


def _ensure_assignment_is_open(assignment: Assignment) -> None:
    if assignment.status != "published":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assignment is not open for submission")
    if _is_assignment_overdue(assignment.due_at):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Assignment due date has passed")


def _load_latest_agent_summary(db: Session, *, submission_id: str) -> StudentAgentSummary | None:
    latest_reviews = db.scalars(
        select(SubmissionReview)
        .where(SubmissionReview.submission_id == submission_id)
        .order_by(SubmissionReview.created_at.desc())
    ).all()

    by_agent: dict[str, SubmissionReview] = {}
    for review in latest_reviews:
        if review.agent_name not in AGENT_NAMES:
            continue
        if review.agent_name in by_agent:
            continue
        by_agent[review.agent_name] = review
        if len(by_agent) == len(AGENT_NAMES):
            break

    if not by_agent:
        return None

    radar = StudentAgentDimensionScore(
        structure=by_agent.get("structure").score if by_agent.get("structure") else None,
        language=by_agent.get("language").score if by_agent.get("language") else None,
        value=by_agent.get("value").score if by_agent.get("value") else None,
    )
    valid_scores = [score for score in (radar.structure, radar.language, radar.value) if score is not None]
    total_score = round(sum(valid_scores) / len(valid_scores)) if valid_scores else None

    items = [
        StudentAgentReviewItem(
            agent_name=agent_name,  # type: ignore[arg-type]
            score=by_agent[agent_name].score,
            feedback=by_agent[agent_name].feedback,
            created_at=by_agent[agent_name].created_at,
        )
        for agent_name in AGENT_NAMES
        if agent_name in by_agent
    ]

    return StudentAgentSummary(total_score=total_score, radar=radar, items=items)


async def _validate_file_before_storage(content_type: SubmissionContentType, file: UploadFile) -> None:
    original_name = file.filename or ""
    suffix = Path(original_name).suffix.lower()
    file_content_type = (file.content_type or "").lower()

    if content_type == "image":
        if suffix not in IMAGE_EXTENSIONS or not file_content_type.startswith("image/"):
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Unsupported image file type")
    elif content_type == "document":
        if suffix not in DOCUMENT_EXTENSIONS:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Unsupported document file type")

    # Read at most max+1 bytes to enforce hard limit while keeping memory bounded.
    sampled_content = await file.read(settings.submission_max_upload_bytes + 1)
    await file.seek(0)
    if len(sampled_content) > settings.submission_max_upload_bytes:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File is too large. Max bytes: {settings.submission_max_upload_bytes}",
        )


@router.get("/me", response_model=list[StudentSubmissionListItem])
def list_my_submissions(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> list[StudentSubmissionListItem]:
    rows = db.execute(
        select(Submission, Assignment.title, Assignment.due_at, ClassRoom.name)
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .join(ClassRoom, ClassRoom.id == Submission.class_id)
        .where(Submission.student_id == current_student.id)
        .order_by(Submission.created_at.desc())
    ).all()

    return [
        StudentSubmissionListItem(
            submission_id=submission.id,
            assignment_id=submission.assignment_id,
            assignment_title=assignment_title,
            class_id=submission.class_id,
            class_name=class_name,
            content_type=submission.content_type,
            status=submission.status,
            created_at=submission.created_at,
            due_at=due_at,
            file_name=submission.file_name,
            file_url=submission.file_url,
            text_excerpt=submission.text_content[:120] if submission.text_content else None,
        )
        for submission, assignment_title, due_at, class_name in rows
    ]


@router.get("/me/manual-feedback", response_model=list[StudentManualFeedbackItem])
def list_my_manual_feedback(
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> list[StudentManualFeedbackItem]:
    rows = db.execute(
        select(Submission, Assignment.title, ClassRoom.name, ManualReview, ManualFeedbackReceipt)
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .join(ClassRoom, ClassRoom.id == Submission.class_id)
        .join(
            ManualReview,
            and_(
                ManualReview.submission_id == Submission.id,
                ManualReview.student_id == current_student.id,
                ManualReview.status == "published",
            ),
        )
        .outerjoin(
            ManualFeedbackReceipt,
            and_(
                ManualFeedbackReceipt.submission_id == Submission.id,
                ManualFeedbackReceipt.student_id == current_student.id,
            ),
        )
        .where(Submission.student_id == current_student.id)
        .order_by(ManualReview.published_at.desc(), Submission.created_at.desc())
    ).all()

    return [
        StudentManualFeedbackItem(
            submission_id=submission.id,
            assignment_id=submission.assignment_id,
            assignment_title=assignment_title,
            class_id=submission.class_id,
            class_name=class_name,
            content_type=submission.content_type,
            created_at=submission.created_at,
            manual_total_score=manual_review.total_score,
            structure_score=manual_review.structure_score,
            language_score=manual_review.language_score,
            value_score=manual_review.value_score,
            summary_feedback=manual_review.summary_feedback,
            actionable_suggestions=manual_review.actionable_suggestions,
            strengths=manual_review.strengths,
            next_goal=manual_review.next_goal,
            manual_published_at=manual_review.published_at,
            manual_view_count=receipt.view_count if receipt else 0,
            manual_first_viewed_at=receipt.first_viewed_at if receipt else None,
            manual_last_viewed_at=receipt.last_viewed_at if receipt else None,
            agent_summary=_load_latest_agent_summary(db, submission_id=submission.id),
        )
        for submission, assignment_title, class_name, manual_review, receipt in rows
    ]


@router.post("/me/manual-feedback/mark-read", response_model=MarkManualFeedbackReadResponse)
def mark_my_manual_feedback_read(
    payload: MarkManualFeedbackReadRequest,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> MarkManualFeedbackReadResponse:
    published_reviews = db.scalars(
        select(ManualReview).where(
            ManualReview.submission_id.in_(payload.submission_ids),
            ManualReview.student_id == current_student.id,
            ManualReview.status == "published",
        )
    ).all()
    if not published_reviews:
        return MarkManualFeedbackReadResponse(marked_count=0)

    review_by_submission = {review.submission_id: review for review in published_reviews}
    existing_receipts = db.scalars(
        select(ManualFeedbackReceipt).where(
            ManualFeedbackReceipt.submission_id.in_(list(review_by_submission.keys())),
            ManualFeedbackReceipt.student_id == current_student.id,
        )
    ).all()
    receipt_by_submission = {receipt.submission_id: receipt for receipt in existing_receipts}

    now = datetime.now(timezone.utc)
    for submission_id, review in review_by_submission.items():
        receipt = receipt_by_submission.get(submission_id)
        if receipt:
            receipt.manual_review_id = review.id
            receipt.last_viewed_at = now
            receipt.view_count += 1
            receipt.updated_at = now
            continue

        db.add(
            ManualFeedbackReceipt(
                id=str(uuid4()),
                manual_review_id=review.id,
                submission_id=submission_id,
                student_id=current_student.id,
                first_viewed_at=now,
                last_viewed_at=now,
                view_count=1,
            )
        )

    db.commit()
    return MarkManualFeedbackReadResponse(marked_count=len(review_by_submission))


@router.post("", response_model=CreateSubmissionResponse, status_code=status.HTTP_201_CREATED)
async def create_submission(
    assignment_id: str = Form(...),
    content_type: SubmissionContentType = Form(...),
    text_content: str | None = Form(default=None),
    file: UploadFile | None = File(default=None),
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> CreateSubmissionResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    _ensure_assignment_is_open(assignment)

    membership = db.scalar(
        select(ClassMember).where(
            ClassMember.class_id == assignment.class_id,
            ClassMember.student_id == current_student.id,
        )
    )
    if not membership:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student does not belong to this class")

    file_url: str | None = None
    file_name: str | None = None
    storage_provider = "local"
    normalized_text: str | None = None

    if content_type == "text":
        normalized_text = (text_content or "").strip()
        if not normalized_text:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="Text content is required")
        if file:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
                detail="Text submission does not accept file",
            )
    else:
        if file is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail="File is required")
        await _validate_file_before_storage(content_type, file)
        storage = get_storage_backend()
        stored = await storage.save_upload(
            file,
            category=f"{assignment.class_id}/{assignment.id}/{current_student.id}",
        )
        file_url = stored.file_url
        file_name = stored.file_name
        storage_provider = stored.provider

    submission = Submission(
        id=str(uuid4()),
        assignment_id=assignment.id,
        class_id=assignment.class_id,
        student_id=current_student.id,
        content_type=content_type,
        text_content=normalized_text,
        file_name=file_name,
        file_url=file_url,
        storage_provider=storage_provider,
        status="submitted",
    )
    db.add(submission)
    db.commit()
    db.refresh(submission)

    return CreateSubmissionResponse(
        submission_id=submission.id,
        assignment_id=submission.assignment_id,
        class_id=submission.class_id,
        student_id=submission.student_id,
        content_type=content_type,
        file_url=submission.file_url,
        status=submission.status,
        created_at=submission.created_at,
    )

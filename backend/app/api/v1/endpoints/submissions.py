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
    ManualReviewReply,
    Submission,
    SubmissionReview,
    User,
)
from app.schemas.manual_review import (
    ManualReviewReplyRead,
    StudentManualReviewReplyCreateRequest,
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


def _to_manual_review_reply_read(reply: ManualReviewReply) -> ManualReviewReplyRead:
    return ManualReviewReplyRead(
        reply_id=reply.id,
        manual_review_id=reply.manual_review_id,
        submission_id=reply.submission_id,
        assignment_id=reply.assignment_id,
        class_id=reply.class_id,
        student_id=reply.student_id,
        teacher_id=reply.teacher_id,
        author_role=reply.author_role,  # type: ignore[arg-type]
        author_id=reply.author_id,
        content=reply.content,
        created_at=reply.created_at,
    )


def _get_student_published_manual_review(
    db: Session,
    *,
    submission_id: str,
    current_student: User,
) -> ManualReview:
    submission = db.get(Submission, submission_id)
    if not submission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    if submission.student_id != current_student.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student does not own this submission")

    review = db.scalar(
        select(ManualReview)
        .where(
            ManualReview.submission_id == submission.id,
            ManualReview.student_id == current_student.id,
        )
        .limit(1)
    )
    if not review:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Manual review draft not found")
    if review.status != "published":
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Manual review is not published yet")
    return review


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

    if not rows:
        return []

    submission_ids = [submission.id for submission, _, _, _, _ in rows]
    teacher_replies = db.scalars(
        select(ManualReviewReply)
        .where(
            ManualReviewReply.submission_id.in_(submission_ids),
            ManualReviewReply.author_role == "teacher",
        )
        .order_by(ManualReviewReply.created_at.desc())
    ).all()
    teacher_replies_by_submission: dict[str, list[ManualReviewReply]] = {}
    for reply in teacher_replies:
        teacher_replies_by_submission.setdefault(reply.submission_id, []).append(reply)

    items: list[StudentManualFeedbackItem] = []
    for submission, assignment_title, class_name, manual_review, receipt in rows:
        teacher_reply_list = teacher_replies_by_submission.get(submission.id, [])
        latest_teacher_reply_at = teacher_reply_list[0].created_at if teacher_reply_list else None
        if receipt and receipt.last_viewed_at:
            unread_teacher_reply_count = sum(1 for item in teacher_reply_list if item.created_at > receipt.last_viewed_at)
        else:
            unread_teacher_reply_count = len(teacher_reply_list)

        items.append(
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
                has_unread_teacher_reply=unread_teacher_reply_count > 0,
                unread_teacher_reply_count=unread_teacher_reply_count,
                latest_teacher_reply_at=latest_teacher_reply_at,
                agent_summary=_load_latest_agent_summary(db, submission_id=submission.id),
            )
        )
    return items


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


@router.get("/me/manual-feedback/replies", response_model=list[ManualReviewReplyRead])
def list_my_manual_feedback_replies(
    submission_id: str,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> list[ManualReviewReplyRead]:
    review = _get_student_published_manual_review(db, submission_id=submission_id, current_student=current_student)
    rows = db.scalars(
        select(ManualReviewReply)
        .where(ManualReviewReply.manual_review_id == review.id)
        .order_by(ManualReviewReply.created_at.asc())
    ).all()
    return [_to_manual_review_reply_read(item) for item in rows]


@router.post("/me/manual-feedback/replies", response_model=ManualReviewReplyRead, status_code=status.HTTP_201_CREATED)
def create_my_manual_feedback_reply(
    payload: StudentManualReviewReplyCreateRequest,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> ManualReviewReplyRead:
    review = _get_student_published_manual_review(
        db,
        submission_id=payload.submission_id,
        current_student=current_student,
    )
    reply = ManualReviewReply(
        id=str(uuid4()),
        manual_review_id=review.id,
        submission_id=review.submission_id,
        assignment_id=review.assignment_id,
        class_id=review.class_id,
        student_id=review.student_id,
        teacher_id=review.teacher_id,
        author_role="student",
        author_id=current_student.id,
        content=payload.content,
    )
    db.add(reply)
    db.commit()
    db.refresh(reply)
    return _to_manual_review_reply_read(reply)


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

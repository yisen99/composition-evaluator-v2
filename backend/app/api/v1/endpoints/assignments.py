from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_teacher
from app.db.deps import get_db
from app.models import (
    Assignment,
    AssignmentReminder,
    ClassMember,
    ClassRoom,
    ManualFeedbackReceipt,
    ManualReview,
    ManualReviewReply,
    StudentMemoryNote,
    Submission,
    SubmissionReview,
    User,
)
from app.schemas.assignment import (
    AssignmentBatchActionRequest,
    AssignmentBatchActionResponse,
    AssignmentBatchActionResultItem,
    AssignmentDetailResponse,
    AssignmentListItem,
    AssignmentSubmissionItem,
    CreateAssignmentRequest,
    CreateAssignmentResponse,
)
from app.schemas.manual_review import (
    AssignmentCommunicationStudentItem,
    AssignmentCommunicationThreadsResponse,
    AssignmentGradingQueueItem,
    AssignmentGradingQueueResponse,
)

router = APIRouter()


@router.post("", response_model=CreateAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: CreateAssignmentRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> CreateAssignmentResponse:
    classroom = db.get(ClassRoom, payload.class_id)
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")
    if classroom.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher does not own this class")

    assignment = Assignment(
        id=str(uuid4()),
        class_id=payload.class_id,
        teacher_id=current_teacher.id,
        title=payload.title,
        prompt=payload.prompt,
        due_at=payload.due_at,
        status="published",
    )
    db.add(assignment)
    db.commit()
    db.refresh(assignment)

    return CreateAssignmentResponse(
        assignment_id=assignment.id,
        class_id=assignment.class_id,
        status=assignment.status,
    )


@router.get("", response_model=list[AssignmentListItem])
def list_assignments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[AssignmentListItem]:
    if current_user.role == "teacher":
        assignments = db.scalars(
            select(Assignment)
            .where(Assignment.teacher_id == current_user.id)
            .order_by(Assignment.created_at.desc())
        ).all()
    else:
        assignments = db.scalars(
            select(Assignment)
            .join(ClassMember, ClassMember.class_id == Assignment.class_id)
            .where(ClassMember.student_id == current_user.id)
            .order_by(Assignment.created_at.desc())
        ).all()

    return [
        AssignmentListItem(
            assignment_id=assignment.id,
            class_id=assignment.class_id,
            title=assignment.title,
            prompt=assignment.prompt,
            due_at=assignment.due_at,
            status=assignment.status,
        )
        for assignment in assignments
    ]


@router.get("/{assignment_id}", response_model=AssignmentDetailResponse)
def get_assignment_detail(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> AssignmentDetailResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher does not own this assignment")

    rows = db.execute(
        select(Submission, User.display_name)
        .join(User, User.id == Submission.student_id)
        .where(Submission.assignment_id == assignment.id)
        .order_by(Submission.created_at.desc())
    ).all()
    submissions = [
        AssignmentSubmissionItem(
            submission_id=submission.id,
            student_id=submission.student_id,
            student_name=student_name,
            content_type=submission.content_type,
            status=submission.status,
            created_at=submission.created_at,
            file_url=submission.file_url,
            text_excerpt=(submission.text_content[:120] if submission.text_content else None),
            latest_agent_name=latest_review.agent_name if latest_review else None,
            latest_review_score=latest_review.score if latest_review else None,
            latest_review_feedback=latest_review.feedback if latest_review else None,
            latest_memory_note=latest_memory_note,
        )
        for submission, student_name in rows
        for latest_review, latest_memory_note in [  # keep single-pass mapping readable without extra helper
            _load_latest_review_and_note(db, submission.id)
        ]
    ]

    return AssignmentDetailResponse(
        assignment_id=assignment.id,
        class_id=assignment.class_id,
        teacher_id=assignment.teacher_id,
        title=assignment.title,
        prompt=assignment.prompt,
        due_at=assignment.due_at,
        status=assignment.status,
        created_at=assignment.created_at,
        submissions_count=len(submissions),
        submissions=submissions,
    )


@router.post("/batch/actions", response_model=AssignmentBatchActionResponse)
def execute_assignment_batch_action(
    payload: AssignmentBatchActionRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> AssignmentBatchActionResponse:
    assignment_ids = payload.assignment_ids
    assignments = db.scalars(select(Assignment).where(Assignment.id.in_(assignment_ids))).all()
    assignment_by_id = {item.id: item for item in assignments}
    workflow_assignment_ids: list[str] = []
    results: list[AssignmentBatchActionResultItem] = []

    for assignment_id in assignment_ids:
        assignment = assignment_by_id.get(assignment_id)
        if not assignment:
            results.append(
                AssignmentBatchActionResultItem(
                    assignment_id=assignment_id,
                    status="failed",
                    detail="任务不存在或已删除。",
                )
            )
            continue
        if assignment.teacher_id != current_teacher.id:
            results.append(
                AssignmentBatchActionResultItem(
                    assignment_id=assignment_id,
                    title=assignment.title,
                    class_id=assignment.class_id,
                    status="failed",
                    detail="你无权操作该任务。",
                )
            )
            continue

        if payload.action == "enter_workflow":
            workflow_assignment_ids.append(assignment.id)
            results.append(
                AssignmentBatchActionResultItem(
                    assignment_id=assignment.id,
                    title=assignment.title,
                    class_id=assignment.class_id,
                    status="success",
                    detail="已加入批处理工作流。",
                    detail_path=f"/teacher/assignments/{assignment.id}",
                )
            )
            continue

        if payload.action == "publish_reminder":
            class_student_ids = db.scalars(
                select(ClassMember.student_id).where(ClassMember.class_id == assignment.class_id)
            ).all()
            submitted_student_ids = db.scalars(
                select(Submission.student_id)
                .where(Submission.assignment_id == assignment.id)
                .distinct()
            ).all()
            pending_count = max(0, len(set(class_student_ids) - set(submitted_student_ids)))

            reminder_message = (
                "请尽快提交本次作文任务。"
                if pending_count > 0
                else "班级内学生已全部提交，本次提醒记录为零目标提醒。"
            )
            db.add(
                AssignmentReminder(
                    id=str(uuid4()),
                    assignment_id=assignment.id,
                    class_id=assignment.class_id,
                    teacher_id=current_teacher.id,
                    reminder_type="submission",
                    target_student_count=pending_count,
                    message=reminder_message,
                )
            )
            results.append(
                AssignmentBatchActionResultItem(
                    assignment_id=assignment.id,
                    title=assignment.title,
                    class_id=assignment.class_id,
                    status="success",
                    detail="提醒已记录，可用于后续短信/企微等渠道发送。",
                    reminder_target_count=pending_count,
                )
            )
            continue

        if payload.action == "advance_status":
            if not payload.target_status:
                raise HTTPException(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    detail="target_status is required for advance_status action",
                )
            before_status = assignment.status
            assignment.status = payload.target_status
            results.append(
                AssignmentBatchActionResultItem(
                    assignment_id=assignment.id,
                    title=assignment.title,
                    class_id=assignment.class_id,
                    status="success",
                    detail="任务状态已推进。",
                    before_status=before_status,
                    after_status=assignment.status,
                )
            )
            continue

        results.append(
            AssignmentBatchActionResultItem(
                assignment_id=assignment.id,
                title=assignment.title,
                class_id=assignment.class_id,
                status="failed",
                detail="未知批处理动作。",
            )
        )

    if payload.action in {"publish_reminder", "advance_status"}:
        db.commit()

    succeeded = sum(1 for item in results if item.status == "success")
    failed = len(results) - succeeded
    return AssignmentBatchActionResponse(
        action=payload.action,
        total=len(results),
        succeeded=succeeded,
        failed=failed,
        workflow_assignment_ids=workflow_assignment_ids,
        results=results,
    )


@router.get("/{assignment_id}/grading-queue", response_model=AssignmentGradingQueueResponse)
def get_assignment_grading_queue(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> AssignmentGradingQueueResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher does not own this assignment")

    submission_rows = db.execute(
        select(Submission, User.display_name)
        .join(User, User.id == Submission.student_id)
        .where(Submission.assignment_id == assignment.id)
        .order_by(Submission.created_at.desc())
    ).all()
    manual_reviews = db.scalars(
        select(ManualReview).where(
            ManualReview.assignment_id == assignment.id,
            ManualReview.teacher_id == current_teacher.id,
        )
    ).all()
    manual_by_submission = {item.submission_id: item for item in manual_reviews}
    submission_ids = [submission.id for submission, _ in submission_rows]
    manual_receipts = (
        db.scalars(
            select(ManualFeedbackReceipt).where(
                ManualFeedbackReceipt.submission_id.in_(submission_ids),
            )
        ).all()
        if submission_ids
        else []
    )
    receipt_by_submission = {item.submission_id: item for item in manual_receipts}
    manual_replies = (
        db.scalars(
            select(ManualReviewReply)
            .where(ManualReviewReply.submission_id.in_(submission_ids))
            .order_by(ManualReviewReply.created_at.asc())
        ).all()
        if submission_ids
        else []
    )
    replies_by_submission: dict[str, list[ManualReviewReply]] = {}
    for reply in manual_replies:
        replies_by_submission.setdefault(reply.submission_id, []).append(reply)

    items: list[AssignmentGradingQueueItem] = []
    manual_draft_count = 0
    manual_published_count = 0
    for submission, student_name in submission_rows:
        manual = manual_by_submission.get(submission.id)
        manual_status = "none"
        manual_total_score = None
        manual_updated_at = None
        manual_published_at = None
        manual_viewed = False
        manual_view_count = 0
        manual_first_viewed_at = None
        manual_last_viewed_at = None
        reply_total_count = 0
        student_reply_count = 0
        teacher_reply_count = 0
        pending_teacher_reply = False
        last_reply_role = None
        last_reply_at = None
        if manual:
            manual_status = manual.status
            manual_total_score = manual.total_score
            manual_updated_at = manual.updated_at
            manual_published_at = manual.published_at
            if manual.status == "published":
                manual_published_count += 1
            elif manual.status == "draft":
                manual_draft_count += 1
            if manual.status == "published":
                receipt = receipt_by_submission.get(submission.id)
                if receipt:
                    manual_viewed = receipt.view_count > 0
                    manual_view_count = receipt.view_count
                    manual_first_viewed_at = receipt.first_viewed_at
                    manual_last_viewed_at = receipt.last_viewed_at
                replies = replies_by_submission.get(submission.id, [])
                reply_total_count = len(replies)
                student_reply_count = sum(1 for item in replies if item.author_role == "student")
                teacher_reply_count = sum(1 for item in replies if item.author_role == "teacher")
                if replies:
                    last_reply = replies[-1]
                    last_reply_role = last_reply.author_role
                    last_reply_at = last_reply.created_at
                    pending_teacher_reply = last_reply.author_role == "student"

        items.append(
            AssignmentGradingQueueItem(
                submission_id=submission.id,
                student_id=submission.student_id,
                student_name=student_name,
                content_type=submission.content_type,
                submitted_at=submission.created_at,
                manual_status=manual_status,  # type: ignore[arg-type]
                manual_total_score=manual_total_score,
                manual_updated_at=manual_updated_at,
                manual_published_at=manual_published_at,
                manual_viewed=manual_viewed,
                manual_view_count=manual_view_count,
                manual_first_viewed_at=manual_first_viewed_at,
                manual_last_viewed_at=manual_last_viewed_at,
                reply_total_count=reply_total_count,
                student_reply_count=student_reply_count,
                teacher_reply_count=teacher_reply_count,
                pending_teacher_reply=pending_teacher_reply,
                last_reply_role=last_reply_role,  # type: ignore[arg-type]
                last_reply_at=last_reply_at,
            )
        )

    return AssignmentGradingQueueResponse(
        assignment_id=assignment.id,
        class_id=assignment.class_id,
        total_submissions=len(items),
        manual_draft_count=manual_draft_count,
        manual_published_count=manual_published_count,
        items=items,
    )


@router.get("/{assignment_id}/communication-threads", response_model=AssignmentCommunicationThreadsResponse)
def get_assignment_communication_threads(
    assignment_id: str,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> AssignmentCommunicationThreadsResponse:
    assignment = db.get(Assignment, assignment_id)
    if not assignment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    if assignment.teacher_id != current_teacher.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher does not own this assignment")

    submission_rows = db.execute(
        select(Submission, User.display_name)
        .join(User, User.id == Submission.student_id)
        .where(Submission.assignment_id == assignment.id)
        .order_by(Submission.created_at.desc())
    ).all()
    if not submission_rows:
        return AssignmentCommunicationThreadsResponse(
            assignment_id=assignment.id,
            class_id=assignment.class_id,
            total_students=0,
            total_replies=0,
            total_pending_teacher_replies=0,
            total_unread_by_students=0,
            items=[],
        )

    submission_ids = [submission.id for submission, _ in submission_rows]
    replies = db.scalars(
        select(ManualReviewReply)
        .where(ManualReviewReply.submission_id.in_(submission_ids))
        .order_by(ManualReviewReply.created_at.asc())
    ).all()
    receipts = db.scalars(
        select(ManualFeedbackReceipt)
        .where(ManualFeedbackReceipt.submission_id.in_(submission_ids))
    ).all()
    receipt_by_submission = {item.submission_id: item for item in receipts}
    replies_by_submission: dict[str, list[ManualReviewReply]] = {}
    for reply in replies:
        replies_by_submission.setdefault(reply.submission_id, []).append(reply)

    submission_meta = {
        submission.id: (submission.student_id, student_name)
        for submission, student_name in submission_rows
    }
    student_summary: dict[str, AssignmentCommunicationStudentItem] = {}
    total_replies = 0
    total_pending_teacher_replies = 0
    total_unread_by_students = 0

    for submission_id in submission_ids:
        student_id, student_name = submission_meta[submission_id]
        thread_replies = replies_by_submission.get(submission_id, [])
        thread_total = len(thread_replies)
        total_replies += thread_total

        student_reply_count = sum(1 for item in thread_replies if item.author_role == "student")
        teacher_reply_count = sum(1 for item in thread_replies if item.author_role == "teacher")
        pending_teacher_reply = bool(thread_replies) and thread_replies[-1].author_role == "student"
        pending_student_reply = bool(thread_replies) and thread_replies[-1].author_role == "teacher"

        receipt = receipt_by_submission.get(submission_id)
        if receipt and receipt.last_viewed_at:
            unread_by_student_reply_count = sum(
                1
                for item in thread_replies
                if item.author_role == "teacher" and item.created_at > receipt.last_viewed_at
            )
        else:
            unread_by_student_reply_count = sum(1 for item in thread_replies if item.author_role == "teacher")

        summary = student_summary.get(student_id)
        if not summary:
            summary = AssignmentCommunicationStudentItem(
                student_id=student_id,
                student_name=student_name,
                submission_ids=[],
                reply_total_count=0,
                student_reply_count=0,
                teacher_reply_count=0,
                pending_teacher_reply_count=0,
                pending_student_reply_count=0,
                unread_by_student_reply_count=0,
                latest_reply_role=None,
                latest_reply_content=None,
                latest_reply_at=None,
            )
            student_summary[student_id] = summary

        summary.submission_ids.append(submission_id)
        summary.reply_total_count += thread_total
        summary.student_reply_count += student_reply_count
        summary.teacher_reply_count += teacher_reply_count
        summary.unread_by_student_reply_count += unread_by_student_reply_count
        if pending_teacher_reply:
            summary.pending_teacher_reply_count += 1
            total_pending_teacher_replies += 1
        if pending_student_reply:
            summary.pending_student_reply_count += 1
        total_unread_by_students += unread_by_student_reply_count

        if thread_replies:
            latest = thread_replies[-1]
            if not summary.latest_reply_at or latest.created_at > summary.latest_reply_at:
                summary.latest_reply_at = latest.created_at
                summary.latest_reply_role = latest.author_role  # type: ignore[assignment]
                summary.latest_reply_content = latest.content

    items = sorted(
        student_summary.values(),
        key=lambda item: (
            item.pending_teacher_reply_count,
            item.unread_by_student_reply_count,
            item.latest_reply_at.timestamp() if item.latest_reply_at else 0,
        ),
        reverse=True,
    )

    return AssignmentCommunicationThreadsResponse(
        assignment_id=assignment.id,
        class_id=assignment.class_id,
        total_students=len(items),
        total_replies=total_replies,
        total_pending_teacher_replies=total_pending_teacher_replies,
        total_unread_by_students=total_unread_by_students,
        items=items,
    )


def _load_latest_review_and_note(db: Session, submission_id: str) -> tuple[SubmissionReview | None, str | None]:
    latest_review = db.scalar(
        select(SubmissionReview)
        .where(SubmissionReview.submission_id == submission_id)
        .order_by(SubmissionReview.created_at.desc())
        .limit(1)
    )
    if not latest_review:
        return None, None

    latest_note = db.scalar(
        select(StudentMemoryNote)
        .where(StudentMemoryNote.source_review_id == latest_review.id)
        .order_by(StudentMemoryNote.created_at.desc())
        .limit(1)
    )
    return latest_review, (latest_note.note if latest_note else None)

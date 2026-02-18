from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import require_student
from app.db.deps import get_db
from app.models import Assignment, ClassMember, Submission, User
from app.schemas.submission import CreateSubmissionResponse, SubmissionContentType
from app.services.storage import get_storage_backend

router = APIRouter()


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
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Text content is required")
        if file:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Text submission does not accept file",
            )
    else:
        if file is None:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="File is required")
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

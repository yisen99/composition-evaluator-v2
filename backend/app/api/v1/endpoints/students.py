from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import require_teacher
from app.db.deps import get_db
from app.models import ClassMember, ClassRoom, StudentMemoryNote, User
from app.schemas.memory import StudentMemoryItem, StudentMemoryResponse

router = APIRouter()


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

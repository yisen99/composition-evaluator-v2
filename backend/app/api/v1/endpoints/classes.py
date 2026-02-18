import secrets
import string
from typing import cast
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_student, require_teacher
from app.db.deps import get_db
from app.models import ClassMember, ClassRoom, User
from app.schemas.classroom import (
    ClassGradeBand,
    ClassListItem,
    CreateClassRequest,
    CreateClassResponse,
    JoinClassRequest,
    JoinClassResponse,
)

router = APIRouter()


def _generate_join_code() -> str:
    alphabet = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(alphabet) for _ in range(6))


def _generate_unique_join_code(db: Session) -> str:
    for _ in range(20):
        code = _generate_join_code()
        exists = db.scalar(select(ClassRoom).where(ClassRoom.join_code == code))
        if not exists:
            return code
    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Failed to generate unique join code",
    )


@router.post("", response_model=CreateClassResponse, status_code=status.HTTP_201_CREATED)
def create_class(
    payload: CreateClassRequest,
    db: Session = Depends(get_db),
    current_teacher: User = Depends(require_teacher),
) -> CreateClassResponse:
    classroom = ClassRoom(
        id=str(uuid4()),
        teacher_id=current_teacher.id,
        name=payload.name,
        grade_band=payload.grade_band,
        join_code=_generate_unique_join_code(db),
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    return CreateClassResponse(class_id=classroom.id, join_code=classroom.join_code)


@router.post("/join", response_model=JoinClassResponse)
def join_class(
    payload: JoinClassRequest,
    db: Session = Depends(get_db),
    current_student: User = Depends(require_student),
) -> JoinClassResponse:
    classroom = db.scalar(select(ClassRoom).where(ClassRoom.join_code == payload.join_code))
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    if payload.student_name:
        current_student.display_name = payload.student_name

    membership = db.scalar(
        select(ClassMember).where(
            ClassMember.class_id == classroom.id,
            ClassMember.student_id == current_student.id,
        )
    )
    if not membership:
        db.add(
            ClassMember(
                id=str(uuid4()),
                class_id=classroom.id,
                student_id=current_student.id,
            )
        )
    db.commit()

    return JoinClassResponse(class_id=classroom.id, class_name=classroom.name)


@router.get("", response_model=list[ClassListItem])
def list_classes(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> list[ClassListItem]:
    if current_user.role == "teacher":
        classrooms = db.scalars(
            select(ClassRoom)
            .where(ClassRoom.teacher_id == current_user.id)
            .order_by(ClassRoom.created_at.desc())
        ).all()
    else:
        classrooms = db.scalars(
            select(ClassRoom)
            .join(ClassMember, ClassMember.class_id == ClassRoom.id)
            .where(ClassMember.student_id == current_user.id)
            .order_by(ClassRoom.created_at.desc())
        ).all()

    return [
        ClassListItem(
            class_id=classroom.id,
            name=classroom.name,
            grade_band=cast(ClassGradeBand, classroom.grade_band),
            join_code=classroom.join_code,
        )
        for classroom in classrooms
    ]

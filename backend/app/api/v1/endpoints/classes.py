import secrets
import string
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models import ClassMember, ClassRoom, User
from app.schemas.classroom import CreateClassRequest, CreateClassResponse, JoinClassRequest, JoinClassResponse

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
def create_class(payload: CreateClassRequest, db: Session = Depends(get_db)) -> CreateClassResponse:
    teacher = db.get(User, payload.teacher_id)
    if teacher and teacher.role != "teacher":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User role is not teacher")

    if not teacher:
        teacher = User(
            id=payload.teacher_id,
            role="teacher",
            display_name=payload.teacher_name,
        )
        db.add(teacher)
        db.flush()

    classroom = ClassRoom(
        id=str(uuid4()),
        teacher_id=teacher.id,
        name=payload.name,
        grade_band=payload.grade_band,
        join_code=_generate_unique_join_code(db),
    )
    db.add(classroom)
    db.commit()
    db.refresh(classroom)

    return CreateClassResponse(class_id=classroom.id, join_code=classroom.join_code)


@router.post("/join", response_model=JoinClassResponse)
def join_class(payload: JoinClassRequest, db: Session = Depends(get_db)) -> JoinClassResponse:
    classroom = db.scalar(select(ClassRoom).where(ClassRoom.join_code == payload.join_code))
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    student = db.get(User, payload.student_id)
    if student and student.role != "student":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User role is not student")

    if not student:
        student = User(
            id=payload.student_id,
            role="student",
            display_name=payload.student_name,
        )
        db.add(student)
        db.flush()

    membership = db.scalar(
        select(ClassMember).where(
            ClassMember.class_id == classroom.id,
            ClassMember.student_id == payload.student_id,
        )
    )
    if not membership:
        db.add(
            ClassMember(
                id=str(uuid4()),
                class_id=classroom.id,
                student_id=payload.student_id,
            )
        )
    db.commit()

    return JoinClassResponse(class_id=classroom.id, class_name=classroom.name)

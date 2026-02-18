from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.deps import get_db
from app.models import Assignment, ClassRoom, User
from app.schemas.assignment import CreateAssignmentRequest, CreateAssignmentResponse

router = APIRouter()


@router.post("", response_model=CreateAssignmentResponse, status_code=status.HTTP_201_CREATED)
def create_assignment(
    payload: CreateAssignmentRequest, db: Session = Depends(get_db)
) -> CreateAssignmentResponse:
    classroom = db.get(ClassRoom, payload.class_id)
    if not classroom:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Class not found")

    teacher = db.get(User, payload.teacher_id)
    if not teacher:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Teacher not found")
    if teacher.role != "teacher":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="User role is not teacher")
    if classroom.teacher_id != payload.teacher_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher does not own this class")

    assignment = Assignment(
        id=str(uuid4()),
        class_id=payload.class_id,
        teacher_id=payload.teacher_id,
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

from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user, require_teacher
from app.db.deps import get_db
from app.models import Assignment, ClassMember, ClassRoom, User
from app.schemas.assignment import AssignmentListItem, CreateAssignmentRequest, CreateAssignmentResponse

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

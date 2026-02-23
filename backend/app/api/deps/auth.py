from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import current_active_auth_user, sync_domain_user_from_account
from app.db.deps import get_db
from app.models import AuthAccount, User


def get_current_user(
    auth_user: AuthAccount = Depends(current_active_auth_user),
    db: Session = Depends(get_db),
) -> User:
    user = sync_domain_user_from_account(db, auth_user)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User not found")
    return user


def require_teacher(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "teacher":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Teacher role required")
    return current_user


def require_student(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "student":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Student role required")
    return current_user

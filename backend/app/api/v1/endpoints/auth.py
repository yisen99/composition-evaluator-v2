from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token
from app.db.deps import get_db
from app.models import User
from app.schemas.auth import LoginRequest, LoginResponse, SendCodeRequest, SendCodeResponse, UserProfile
from app.services.auth import AuthCodeError, create_verification_code, normalize_phone, verify_code

router = APIRouter()


@router.post("/send-code", response_model=SendCodeResponse)
def send_code(payload: SendCodeRequest, db: Session = Depends(get_db)) -> SendCodeResponse:
    try:
        normalized_phone = normalize_phone(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc

    existing_user = db.scalar(select(User).where(User.phone == normalized_phone))
    if payload.role_hint == "teacher" and not existing_user:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher SMS signup is disabled",
        )

    if existing_user and existing_user.role != payload.role_hint:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Phone already registered with another role",
        )

    record = create_verification_code(normalized_phone, payload.role_hint)
    if settings.auth_fixed_code:
        # Local debugging aid. Remove this in production integrations.
        print(f"[auth] dev verification code for {normalized_phone}: {record.code}")
    return SendCodeResponse(request_id=record.request_id, expires_in=settings.auth_code_expire_seconds)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    try:
        verification = verify_code(payload.phone, payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc
    except AuthCodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    user = db.scalar(select(User).where(User.phone == verification.phone))
    if user and user.role != verification.role_hint:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Phone role mismatch")

    if not user:
        if verification.role_hint == "teacher":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher SMS signup is disabled",
            )
        user = User(
            id=str(uuid4()),
            role="student",
            phone=verification.phone,
            display_name=payload.display_name or f"{verification.role_hint}-{verification.phone[-4:]}",
        )
        db.add(user)
    elif payload.display_name:
        user.display_name = payload.display_name

    db.commit()
    db.refresh(user)

    return LoginResponse(
        access_token=create_access_token(user),
        refresh_token=create_refresh_token(user),
        user=UserProfile(
            id=user.id,
            role=user.role,
            phone=user.phone or verification.phone,
            display_name=user.display_name,
        ),
    )

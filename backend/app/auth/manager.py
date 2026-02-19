import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin, exceptions
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.deps import get_async_db
from app.db.session import SessionLocal
from app.models import AuthAccount, User
from app.schemas.account_auth import AuthAccountCreate, AuthAccountRead, AuthAccountUpdate
from app.services.auth import normalize_phone


async def get_auth_user_db(
    session: AsyncSession = Depends(get_async_db),
):
    yield SQLAlchemyUserDatabase(session, AuthAccount)


class AuthAccountManager(UUIDIDMixin, BaseUserManager[AuthAccount, uuid.UUID]):
    reset_password_token_secret = settings.jwt_secret
    verification_token_secret = settings.jwt_secret

    async def validate_password(self, password: str, user: AuthAccountCreate | AuthAccount) -> None:
        if len(password) < 8:
            raise exceptions.InvalidPasswordException(
                reason="Password should be at least 8 characters"
            )

    async def on_after_register(self, user: AuthAccount, request: Optional[Request] = None) -> None:
        normalized_phone = _safe_normalize_phone(user.phone)
        db = SessionLocal()
        try:
            domain_user = db.get(User, str(user.id))
            if not domain_user:
                domain_user = User(
                    id=str(user.id),
                    role=user.role,
                    phone=normalized_phone,
                    display_name=user.display_name,
                )
                db.add(domain_user)
            else:
                domain_user.role = user.role
                domain_user.phone = normalized_phone
                domain_user.display_name = user.display_name
            db.commit()
        finally:
            db.close()

    async def on_after_login(
        self,
        user: AuthAccount,
        request: Optional[Request] = None,
        response=None,
    ) -> None:
        db = SessionLocal()
        try:
            domain_user = db.scalar(select(User).where(User.id == str(user.id)))
            if domain_user is None:
                db.add(
                    User(
                        id=str(user.id),
                        role=user.role,
                        phone=_safe_normalize_phone(user.phone),
                        display_name=user.display_name,
                    )
                )
                db.commit()
        finally:
            db.close()


async def get_user_manager(user_db=Depends(get_auth_user_db)):
    yield AuthAccountManager(user_db)


bearer_transport = BearerTransport(tokenUrl="api/v1/auth/jwt/login")


def get_jwt_strategy() -> JWTStrategy:
    return JWTStrategy(secret=settings.jwt_secret, lifetime_seconds=settings.access_token_expire_minutes * 60)


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_jwt_strategy,
)

fastapi_users = FastAPIUsers[AuthAccount, uuid.UUID](get_user_manager, [auth_backend])
current_active_auth_user = fastapi_users.current_user(active=True)


def to_auth_profile(user: AuthAccount) -> AuthAccountRead:
    return AuthAccountRead(
        id=user.id,
        email=user.email,
        is_active=user.is_active,
        is_superuser=user.is_superuser,
        is_verified=user.is_verified,
        role=user.role,  # type: ignore[arg-type]
        display_name=user.display_name,
        phone=user.phone,
    )


def _safe_normalize_phone(phone: str | None) -> str | None:
    if not phone:
        return None
    try:
        return normalize_phone(phone)
    except ValueError:
        return None

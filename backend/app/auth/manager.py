import uuid
from typing import Optional

from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin, exceptions
from fastapi_users.authentication import AuthenticationBackend, BearerTransport, JWTStrategy
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
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

    async def create(
        self,
        user_create: AuthAccountCreate,
        safe: bool = False,
        request: Optional[Request] = None,
    ) -> AuthAccount:
        normalized_phone = _safe_normalize_phone(user_create.phone)
        if normalized_phone and _is_account_phone_taken(normalized_phone):
            raise exceptions.UserAlreadyExists()

        normalized_create = user_create.model_copy(update={"phone": normalized_phone})
        return await super().create(normalized_create, safe=safe, request=request)

    async def on_after_register(self, user: AuthAccount, request: Optional[Request] = None) -> None:
        db = SessionLocal()
        try:
            _upsert_domain_user_from_account(db, user)
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
            _upsert_domain_user_from_account(db, user)
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


def _is_account_phone_taken(phone: str) -> bool:
    db = SessionLocal()
    try:
        account_taken = db.scalar(select(AuthAccount.id).where(AuthAccount.phone == phone).limit(1))
        domain_taken = db.scalar(select(User.id).where(User.phone == phone).limit(1))
        return bool(account_taken or domain_taken)
    finally:
        db.close()


def _domain_phone_or_none(db, phone: str | None, domain_user_id: str) -> str | None:
    if not phone:
        return None
    conflict = db.scalar(
        select(User.id)
        .where(
            User.phone == phone,
            User.id != domain_user_id,
        )
        .limit(1)
    )
    return None if conflict else phone


def _upsert_domain_user_from_account(db, user: AuthAccount) -> None:
    normalized_phone = _safe_normalize_phone(user.phone)
    domain_user = db.get(User, str(user.id))
    mapped_phone = _domain_phone_or_none(db, normalized_phone, domain_user_id=str(user.id))
    if not domain_user:
        domain_user = User(
            id=str(user.id),
            role=user.role,
            phone=mapped_phone,
            display_name=user.display_name,
        )
        db.add(domain_user)
    else:
        domain_user.role = user.role
        domain_user.phone = mapped_phone
        domain_user.display_name = user.display_name
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # Keep auth flow available; drop conflicting phone link in domain profile.
        domain_user = db.get(User, str(user.id))
        if not domain_user:
            domain_user = User(
                id=str(user.id),
                role=user.role,
                phone=None,
                display_name=user.display_name,
            )
            db.add(domain_user)
        else:
            domain_user.phone = None
            domain_user.role = user.role
            domain_user.display_name = user.display_name
        db.commit()

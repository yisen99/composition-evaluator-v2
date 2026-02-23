import uuid
from typing import Literal, Optional

import redis.asyncio as redis
from fastapi import Depends, Request
from fastapi_users import BaseUserManager, FastAPIUsers, UUIDIDMixin, exceptions
from fastapi_users.authentication import (
    AuthenticationBackend,
    BearerTransport,
    JWTStrategy,
    RedisStrategy,
    Strategy,
)
from fastapi_users.authentication.strategy.jwt import JWTStrategyDestroyNotSupportedError
from fastapi_users.db import SQLAlchemyUserDatabase
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session

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


TokenStrategyName = Literal["jwt", "redis"]
_redis_client: redis.Redis | None = None


def _resolve_strategy_name() -> TokenStrategyName:
    return "redis" if settings.auth_token_strategy == "redis" else "jwt"


def _get_redis_client() -> redis.Redis:
    global _redis_client  # noqa: PLW0603
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url)
    return _redis_client


def get_access_token_strategy() -> Strategy[AuthAccount, uuid.UUID]:
    if _resolve_strategy_name() == "redis":
        return RedisStrategy(
            redis=_get_redis_client(),
            lifetime_seconds=settings.access_token_expire_minutes * 60,
            key_prefix="ce:auth:access:",
        )
    return JWTStrategy(
        secret=settings.jwt_secret,
        lifetime_seconds=settings.access_token_expire_minutes * 60,
        algorithm=settings.jwt_algorithm,
    )


def get_refresh_token_strategy() -> Strategy[AuthAccount, uuid.UUID]:
    if _resolve_strategy_name() == "redis":
        return RedisStrategy(
            redis=_get_redis_client(),
            lifetime_seconds=settings.refresh_token_expire_minutes * 60,
            key_prefix="ce:auth:refresh:",
        )
    return JWTStrategy(
        secret=settings.jwt_secret,
        lifetime_seconds=settings.refresh_token_expire_minutes * 60,
        algorithm=settings.jwt_algorithm,
    )


async def issue_access_token(user: AuthAccount) -> str:
    strategy = get_access_token_strategy()
    return await strategy.write_token(user)


async def issue_refresh_token(user: AuthAccount) -> str:
    strategy = get_refresh_token_strategy()
    return await strategy.write_token(user)


async def read_refresh_token(
    refresh_token: str,
    user_manager: AuthAccountManager,
) -> AuthAccount | None:
    strategy = get_refresh_token_strategy()
    return await strategy.read_token(refresh_token, user_manager)


async def revoke_refresh_token(
    refresh_token: str,
    user: AuthAccount,
) -> None:
    strategy = get_refresh_token_strategy()
    try:
        await strategy.destroy_token(refresh_token, user)
    except JWTStrategyDestroyNotSupportedError:
        # JWT strategy is stateless and cannot revoke a single token.
        return


auth_backend = AuthenticationBackend(
    name="jwt",
    transport=bearer_transport,
    get_strategy=get_access_token_strategy,
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


def _domain_phone_or_none(db: Session, phone: str | None, domain_user_id: str) -> str | None:
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


def _upsert_domain_user_from_account(db: Session, user: AuthAccount) -> User:
    normalized_phone = _safe_normalize_phone(user.phone)
    domain_user = db.get(User, str(user.id))
    mapped_phone = _domain_phone_or_none(db, normalized_phone, domain_user_id=str(user.id))
    changed = False
    if not domain_user:
        domain_user = User(
            id=str(user.id),
            role=user.role,
            phone=mapped_phone,
            display_name=user.display_name,
        )
        db.add(domain_user)
        changed = True
    else:
        if domain_user.role != user.role:
            domain_user.role = user.role
            changed = True
        if domain_user.phone != mapped_phone:
            domain_user.phone = mapped_phone
            changed = True
        if domain_user.display_name != user.display_name:
            domain_user.display_name = user.display_name
            changed = True

    if changed:
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
        db.refresh(domain_user)

    return domain_user


def sync_domain_user_from_account(db: Session, user: AuthAccount) -> User:
    return _upsert_domain_user_from_account(db, user)

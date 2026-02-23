import secrets
from datetime import datetime, timedelta, timezone
from typing import Literal
from uuid import UUID, uuid4

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi_users.password import PasswordHelper
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.auth import (
    current_active_auth_user,
    get_user_manager,
    issue_access_token,
    issue_refresh_token,
    read_refresh_token,
    revoke_refresh_token,
    sync_domain_user_from_account,
)
from app.core.config import settings
from app.db.deps import get_db
from app.models import AuthAccount, User, WechatAccountLink, WechatBindSession
from app.schemas.auth import (
    AdminGrantRoleRequest,
    AdminGrantRoleResponse,
    AuthRolesResponse,
    LoginRequest,
    LoginResponse,
    PasswordLoginRequest,
    RefreshTokenRequest,
    SendCodeRequest,
    SendCodeResponse,
    SwitchRoleRequest,
    UserProfile,
    WechatAuthPayload,
    WechatAuthorizeResponse,
    WechatBindPhoneRequest,
    WechatBindSendCodeRequest,
)
from app.services.account_roles import ensure_account_role, list_account_roles, normalize_role, resolve_active_role
from app.services.auth import AuthCodeError, create_verification_code, normalize_phone, verify_code
from app.services.wechat_oauth import (
    WechatOAuthError,
    build_wechat_authorize_url,
    decode_wechat_state,
    fetch_wechat_oauth_profile,
)

router = APIRouter()
_PASSWORD_HELPER = PasswordHelper()


def _build_sms_email(phone: str, role: str) -> str:
    return f"sms-{role}-{phone}@sms.local"


def _build_wechat_email(identity: str, role: str) -> str:
    return f"wx-{role}-{identity}@wechat.local"


def _parse_user_uuid(user_id: str) -> UUID:
    try:
        return UUID(user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="User ID format is invalid for auth mapping",
        ) from exc


def _ensure_auth_account_for_sms_user(
    db: Session,
    *,
    user: User,
    phone: str,
) -> AuthAccount:
    account = db.get(AuthAccount, _parse_user_uuid(user.id))
    if account is None:
        account = db.scalar(
            select(AuthAccount)
            .where(AuthAccount.phone == phone)
            .limit(1)
        )
        if account and str(account.id) != user.id:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail="Phone already linked to another account",
            )

    if account is None:
        account = AuthAccount(
            id=_parse_user_uuid(user.id),
            email=_build_sms_email(phone, user.role),
            hashed_password=_PASSWORD_HELPER.hash(_PASSWORD_HELPER.generate()),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role=user.role,
            display_name=user.display_name,
            phone=phone,
        )
        db.add(account)
        ensure_account_role(
            db,
            auth_account_id=account.id,
            role=account.role,
        )
        return account

    account.display_name = user.display_name
    account.phone = phone
    account.is_active = True
    account.is_verified = True
    ensure_account_role(
        db,
        auth_account_id=account.id,
        role=account.role,
    )
    return account


def _resolve_phone_account_conflicts(
    db: Session,
    *,
    phone: str,
) -> tuple[User | None, AuthAccount | None]:
    existing_user = db.scalar(select(User).where(User.phone == phone).limit(1))
    existing_account = db.scalar(select(AuthAccount).where(AuthAccount.phone == phone).limit(1))

    if existing_user and existing_account and str(existing_account.id) != existing_user.id:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Phone already linked to another account",
        )
    return existing_user, existing_account


async def _issue_login_response(
    *,
    db: Session,
    user: User,
    account: AuthAccount,
    fallback_phone: str,
) -> LoginResponse:
    active_role, available_roles = resolve_active_role(
        db,
        account=account,
        preferred_role=user.role,
    )
    ensure_account_role(
        db,
        auth_account_id=account.id,
        role=active_role,
    )
    if user.role != active_role:
        user.role = active_role

    access_token = await issue_access_token(account)
    refresh_token = await issue_refresh_token(account)
    return LoginResponse(
        access_token=access_token,
        refresh_token=refresh_token,
        user=UserProfile(
            id=user.id,
            role=active_role,  # type: ignore[arg-type]
            available_roles=available_roles,  # type: ignore[arg-type]
            last_active_role=active_role,  # type: ignore[arg-type]
            phone=user.phone or fallback_phone,
            display_name=user.display_name,
        ),
    )


def _get_wechat_link(
    db: Session,
    *,
    unionid: str | None,
    openid: str,
) -> WechatAccountLink | None:
    if unionid:
        by_unionid = db.scalar(
            select(WechatAccountLink)
            .where(WechatAccountLink.unionid == unionid)
            .limit(1)
        )
        if by_unionid:
            return by_unionid
    return db.scalar(
        select(WechatAccountLink)
        .where(WechatAccountLink.openid == openid)
        .limit(1)
    )


def _create_wechat_bind_session(
    db: Session,
    *,
    role: str,
    unionid: str | None,
    openid: str,
    nickname: str | None,
    avatar_url: str | None,
    next_path: str | None,
) -> WechatBindSession:
    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=settings.wechat_bind_ticket_expire_seconds)
    db.execute(
        WechatBindSession.__table__.delete().where(
            WechatBindSession.expires_at < now,
        )
    )
    ticket = secrets.token_urlsafe(24)
    bind = WechatBindSession(
        ticket=ticket,
        role=role,
        unionid=unionid,
        openid=openid,
        nickname=nickname,
        avatar_url=avatar_url,
        next_path=next_path,
        expires_at=expires_at,
        consumed_at=None,
    )
    db.add(bind)
    db.commit()
    db.refresh(bind)
    return bind


def _get_active_bind_session(db: Session, bind_ticket: str) -> WechatBindSession:
    bind = db.get(WechatBindSession, bind_ticket)
    if not bind:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Wechat bind ticket not found")

    now = datetime.now(timezone.utc)
    if bind.consumed_at is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Wechat bind ticket has been used")
    expires_at = bind.expires_at if bind.expires_at.tzinfo else bind.expires_at.replace(tzinfo=timezone.utc)
    if expires_at < now:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Wechat bind ticket expired")
    return bind


def _raise_wechat_error(exc: WechatOAuthError) -> None:
    message = str(exc)
    if "not configured" in message.lower():
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=message) from exc
    raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=message) from exc


@router.post("/send-code", response_model=SendCodeResponse)
def send_code(payload: SendCodeRequest, db: Session = Depends(get_db)) -> SendCodeResponse:
    try:
        normalized_phone = normalize_phone(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc

    existing_user, existing_account = _resolve_phone_account_conflicts(
        db,
        phone=normalized_phone,
    )

    if payload.role_hint == "teacher" and not existing_user and not existing_account:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Teacher SMS signup is disabled",
        )

    try:
        record = create_verification_code(normalized_phone, payload.role_hint)
    except AuthCodeError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    return SendCodeResponse(request_id=record.request_id, expires_in=settings.auth_code_expire_seconds)


@router.post("/login", response_model=LoginResponse)
async def login(payload: LoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    try:
        verification = verify_code(payload.phone, payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc
    except AuthCodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    user = db.scalar(select(User).where(User.phone == verification.phone).limit(1))
    account = db.scalar(select(AuthAccount).where(AuthAccount.phone == verification.phone).limit(1))

    if user and account and str(account.id) != user.id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Phone already linked to another account")

    if user is None:
        if verification.role_hint == "teacher" and account is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Teacher SMS signup is disabled",
            )
        if account is not None:
            user = User(
                id=str(account.id),
                role=account.role,
                phone=verification.phone,
                display_name=account.display_name,
            )
        else:
            user = User(
                id=str(uuid4()),
                role="student",
                phone=verification.phone,
                display_name=f"student-{verification.phone[-4:]}",
            )
        db.add(user)

    if payload.display_name:
        user.display_name = payload.display_name

    user.phone = verification.phone
    account = _ensure_auth_account_for_sms_user(db, user=user, phone=verification.phone)
    active_role, _ = resolve_active_role(
        db,
        account=account,
        preferred_role=user.role,
    )
    user.role = active_role

    db.commit()
    db.refresh(user)
    db.refresh(account)

    return await _issue_login_response(
        db=db,
        user=user,
        account=account,
        fallback_phone=verification.phone,
    )


@router.post("/password-login", response_model=LoginResponse)
async def password_login(payload: PasswordLoginRequest, db: Session = Depends(get_db)) -> LoginResponse:
    normalized_email = payload.email.strip().lower()
    account = db.scalar(
        select(AuthAccount)
        .where(func.lower(AuthAccount.email) == normalized_email)
        .limit(1)
    )
    if account is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if not account.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")

    verified, updated_hash = _PASSWORD_HELPER.verify_and_update(payload.password, account.hashed_password)
    if not verified:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password")
    if updated_hash:
        account.hashed_password = updated_hash

    user = sync_domain_user_from_account(db, account)
    db.commit()
    db.refresh(account)

    return await _issue_login_response(
        db=db,
        user=user,
        account=account,
        fallback_phone=account.phone or account.email,
    )


@router.post("/refresh", response_model=LoginResponse)
async def refresh_login(
    payload: RefreshTokenRequest,
    db: Session = Depends(get_db),
    user_manager=Depends(get_user_manager),
) -> LoginResponse:
    account = await read_refresh_token(payload.refresh_token, user_manager)
    if account is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token")
    if not account.is_active:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")

    user = sync_domain_user_from_account(db, account)
    await revoke_refresh_token(payload.refresh_token, account)

    return await _issue_login_response(
        db=db,
        user=user,
        account=account,
        fallback_phone=account.phone or account.email,
    )


@router.get("/roles", response_model=AuthRolesResponse)
def get_auth_roles(
    current_auth_user: AuthAccount = Depends(current_active_auth_user),
    db: Session = Depends(get_db),
) -> AuthRolesResponse:
    account = db.get(AuthAccount, current_auth_user.id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")

    user = sync_domain_user_from_account(db, account)
    active_role, available_roles = resolve_active_role(
        db,
        account=account,
        preferred_role=user.role,
    )
    if user.role != active_role:
        user.role = active_role
    db.commit()

    return AuthRolesResponse(
        active_role=active_role,  # type: ignore[arg-type]
        available_roles=available_roles,  # type: ignore[arg-type]
    )


@router.post("/switch-role", response_model=LoginResponse)
async def switch_auth_role(
    payload: SwitchRoleRequest,
    current_auth_user: AuthAccount = Depends(current_active_auth_user),
    db: Session = Depends(get_db),
) -> LoginResponse:
    account = db.get(AuthAccount, current_auth_user.id)
    if account is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Inactive account")

    target_role = normalize_role(payload.target_role)
    available_roles = list_account_roles(
        db,
        auth_account_id=account.id,
        fallback_role=account.role,
    )
    if target_role not in available_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Role is not available for current account",
        )

    account.role = target_role
    user = sync_domain_user_from_account(db, account)
    if user.role != target_role:
        user.role = target_role
    db.commit()
    db.refresh(account)
    db.refresh(user)

    return await _issue_login_response(
        db=db,
        user=user,
        account=account,
        fallback_phone=account.phone or account.email,
    )


@router.post("/admin/grant-role", response_model=AdminGrantRoleResponse)
def admin_grant_role(
    payload: AdminGrantRoleRequest,
    current_auth_user: AuthAccount = Depends(current_active_auth_user),
    db: Session = Depends(get_db),
) -> AdminGrantRoleResponse:
    if not current_auth_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin role required",
        )

    try:
        normalized_phone = normalize_phone(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc

    account = db.scalar(
        select(AuthAccount)
        .where(AuthAccount.phone == normalized_phone)
        .limit(1)
    )
    if account is None:
        domain_user = db.scalar(
            select(User)
            .where(User.phone == normalized_phone)
            .limit(1)
        )
        if domain_user is not None:
            account = db.get(AuthAccount, _parse_user_uuid(domain_user.id))

    if account is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found for phone")

    domain_user = db.get(User, str(account.id))
    preferred_role = domain_user.role if domain_user else account.role
    ensure_account_role(
        db,
        auth_account_id=account.id,
        role=payload.target_role,
    )
    active_role, available_roles = resolve_active_role(
        db,
        account=account,
        preferred_role=preferred_role,
    )
    if domain_user and domain_user.role != active_role:
        domain_user.role = active_role
    db.commit()

    return AdminGrantRoleResponse(
        account_id=str(account.id),
        active_role=active_role,  # type: ignore[arg-type]
        available_roles=available_roles,  # type: ignore[arg-type]
    )


@router.get("/wechat/authorize", response_model=WechatAuthorizeResponse)
def create_wechat_authorize_url(
    role: Literal["teacher", "student"] = Query(...),
    next_path: str | None = Query(default=None, alias="next"),
) -> WechatAuthorizeResponse:
    try:
        authorization_url, state = build_wechat_authorize_url(role=role, next_path=next_path)
    except WechatOAuthError as exc:
        _raise_wechat_error(exc)
    return WechatAuthorizeResponse(authorization_url=authorization_url, state=state)


@router.get("/wechat/callback", response_model=WechatAuthPayload)
async def handle_wechat_callback(
    code: str | None = Query(default=None),
    state: str | None = Query(default=None),
    error: str | None = Query(default=None),
    error_description: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> WechatAuthPayload:
    if error:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Wechat login failed: {error_description or error}",
        )
    if not code or not state:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing wechat callback parameters")

    try:
        state_payload = decode_wechat_state(state)
        profile = await fetch_wechat_oauth_profile(code)
    except WechatOAuthError as exc:
        _raise_wechat_error(exc)

    link = _get_wechat_link(db, unionid=profile.unionid, openid=profile.openid)
    if link:
        account = db.get(AuthAccount, link.auth_account_id)
        if account:
            available_roles = list_account_roles(
                db,
                auth_account_id=account.id,
                fallback_role=account.role,
            )
            if state_payload.role not in available_roles:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Wechat account role mismatch")
        if account and account.phone:
            user = sync_domain_user_from_account(db, account)
            login_payload = await _issue_login_response(
                db=db,
                user=user,
                account=account,
                fallback_phone=account.phone,
            )
            return WechatAuthPayload(
                role=state_payload.role,  # type: ignore[arg-type]
                next_path=state_payload.next_path,
                need_bind_phone=False,
                access_token=login_payload.access_token,
                refresh_token=login_payload.refresh_token,
                user=login_payload.user,
            )

    bind = _create_wechat_bind_session(
        db,
        role=state_payload.role,
        unionid=profile.unionid,
        openid=profile.openid,
        nickname=profile.nickname,
        avatar_url=profile.avatar_url,
        next_path=state_payload.next_path,
    )
    return WechatAuthPayload(
        role=state_payload.role,  # type: ignore[arg-type]
        next_path=state_payload.next_path,
        need_bind_phone=True,
        bind_ticket=bind.ticket,
        bind_expires_in=settings.wechat_bind_ticket_expire_seconds,
        wechat_nickname=bind.nickname,
        wechat_avatar_url=bind.avatar_url,
    )


@router.post("/wechat/send-bind-code", response_model=SendCodeResponse)
def send_wechat_bind_code(
    payload: WechatBindSendCodeRequest,
    db: Session = Depends(get_db),
) -> SendCodeResponse:
    bind = _get_active_bind_session(db, payload.bind_ticket)
    try:
        normalized_phone = normalize_phone(payload.phone)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc

    _resolve_phone_account_conflicts(
        db,
        phone=normalized_phone,
    )

    try:
        record = create_verification_code(normalized_phone, bind.role)  # type: ignore[arg-type]
    except AuthCodeError as exc:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(exc)) from exc
    return SendCodeResponse(request_id=record.request_id, expires_in=settings.auth_code_expire_seconds)


@router.post("/wechat/bind-phone", response_model=LoginResponse)
async def bind_wechat_phone(
    payload: WechatBindPhoneRequest,
    db: Session = Depends(get_db),
) -> LoginResponse:
    bind = _get_active_bind_session(db, payload.bind_ticket)

    try:
        verification = verify_code(payload.phone, payload.code)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid phone format") from exc
    except AuthCodeError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if verification.role_hint != bind.role:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Wechat bind role mismatch")

    normalized_phone = verification.phone
    existing_user, existing_account = _resolve_phone_account_conflicts(
        db,
        phone=normalized_phone,
    )

    account = existing_account
    if account is None:
        if existing_user and existing_user.role != bind.role:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Wechat account role mismatch")
        account_id = _parse_user_uuid(existing_user.id) if existing_user else uuid4()
        email_identity = bind.unionid or bind.openid
        email = _build_wechat_email(email_identity, bind.role)
        if db.scalar(select(AuthAccount.id).where(AuthAccount.email == email).limit(1)):
            email = _build_wechat_email(f"{email_identity}-{uuid4().hex[:6]}", bind.role)

        display_name = (
            (payload.display_name or "").strip()
            or bind.nickname
            or (existing_user.display_name if existing_user else None)
            or f"{bind.role}-{normalized_phone[-4:]}"
        )
        account = AuthAccount(
            id=account_id,
            email=email,
            hashed_password=_PASSWORD_HELPER.hash(_PASSWORD_HELPER.generate()),
            is_active=True,
            is_superuser=False,
            is_verified=True,
            role=existing_user.role if existing_user else bind.role,
            display_name=display_name,
            phone=normalized_phone,
        )
        db.add(account)
        ensure_account_role(
            db,
            auth_account_id=account.id,
            role=account.role,
        )
    else:
        available_roles = list_account_roles(
            db,
            auth_account_id=account.id,
            fallback_role=account.role,
        )
        if bind.role not in available_roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Wechat account role mismatch")
        desired_name = (payload.display_name or "").strip() or account.display_name or bind.nickname
        account.display_name = desired_name or account.display_name
        account.phone = normalized_phone
        account.is_active = True
        account.is_verified = True

    user = existing_user
    if user is None:
        active_role, _ = resolve_active_role(
            db,
            account=account,
        )
        user = User(
            id=str(account.id),
            role=active_role,
            phone=normalized_phone,
            display_name=account.display_name,
        )
        db.add(user)
    else:
        active_role, _ = resolve_active_role(
            db,
            account=account,
            preferred_role=user.role,
        )
        user.role = active_role
        user.phone = normalized_phone
        preferred_name = (payload.display_name or "").strip() or user.display_name or account.display_name
        user.display_name = preferred_name

    if account.display_name != user.display_name:
        account.display_name = user.display_name

    existing_wechat_link = _get_wechat_link(db, unionid=bind.unionid, openid=bind.openid)
    target_account_uuid = account.id
    if existing_wechat_link and existing_wechat_link.auth_account_id != target_account_uuid:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Wechat identity has been linked to another account",
        )

    account_link = db.scalar(
        select(WechatAccountLink)
        .where(WechatAccountLink.auth_account_id == target_account_uuid)
        .limit(1)
    )
    if account_link and (account_link.openid != bind.openid or (bind.unionid and account_link.unionid != bind.unionid)):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Account already linked to another wechat identity",
        )

    if existing_wechat_link is None:
        existing_wechat_link = account_link

    if existing_wechat_link is None:
        existing_wechat_link = WechatAccountLink(
            id=str(uuid4()),
            auth_account_id=target_account_uuid,
            unionid=bind.unionid,
            openid=bind.openid,
            nickname=bind.nickname,
            avatar_url=bind.avatar_url,
        )
        db.add(existing_wechat_link)
    else:
        existing_wechat_link.auth_account_id = target_account_uuid
        existing_wechat_link.unionid = bind.unionid
        existing_wechat_link.openid = bind.openid
        existing_wechat_link.nickname = bind.nickname
        existing_wechat_link.avatar_url = bind.avatar_url

    bind.consumed_at = datetime.now(timezone.utc)

    db.commit()
    db.refresh(account)
    db.refresh(user)

    return await _issue_login_response(
        db=db,
        user=user,
        account=account,
        fallback_phone=normalized_phone,
    )

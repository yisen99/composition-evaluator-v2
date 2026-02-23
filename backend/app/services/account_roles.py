import uuid
from collections.abc import Sequence

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import AuthAccount, AuthAccountRole

SUPPORTED_ROLES: tuple[str, str] = ("teacher", "student")


def normalize_role(role: str) -> str:
    normalized = role.strip().lower()
    if normalized not in SUPPORTED_ROLES:
        raise ValueError("Unsupported role")
    return normalized


def ensure_account_role(
    db: Session,
    *,
    auth_account_id: uuid.UUID,
    role: str,
) -> bool:
    normalized_role = normalize_role(role)
    for pending in db.new:
        if (
            isinstance(pending, AuthAccountRole)
            and pending.auth_account_id == auth_account_id
            and pending.role == normalized_role
        ):
            return False

    existing = db.scalar(
        select(AuthAccountRole)
        .where(
            AuthAccountRole.auth_account_id == auth_account_id,
            AuthAccountRole.role == normalized_role,
        )
        .limit(1)
    )
    if existing:
        return False

    db.add(
        AuthAccountRole(
            auth_account_id=auth_account_id,
            role=normalized_role,
        )
    )
    return True


def list_account_roles(
    db: Session,
    *,
    auth_account_id: uuid.UUID,
    fallback_role: str | None = None,
) -> list[str]:
    pending_roles = {
        normalize_role(pending.role)
        for pending in db.new
        if (
            isinstance(pending, AuthAccountRole)
            and pending.auth_account_id == auth_account_id
            and pending.role in SUPPORTED_ROLES
        )
    }
    rows: Sequence[str] = db.scalars(
        select(AuthAccountRole.role)
        .where(AuthAccountRole.auth_account_id == auth_account_id)
        .order_by(AuthAccountRole.created_at.asc(), AuthAccountRole.role.asc())
    ).all()
    roles = [normalize_role(role) for role in rows if role in SUPPORTED_ROLES]
    roles.extend(pending_roles)

    if not roles and fallback_role:
        normalized_fallback = normalize_role(fallback_role)
        ensure_account_role(
            db,
            auth_account_id=auth_account_id,
            role=normalized_fallback,
        )
        return [normalized_fallback]

    # Keep deterministic ordering for client-side dropdowns and tests.
    ordered = sorted(set(roles), key=lambda item: SUPPORTED_ROLES.index(item))
    return ordered


def resolve_active_role(
    db: Session,
    *,
    account: AuthAccount,
    preferred_role: str | None = None,
) -> tuple[str, list[str]]:
    roles = list_account_roles(
        db,
        auth_account_id=account.id,
        fallback_role=account.role,
    )
    if not roles:
        raise ValueError("No available roles for account")

    if preferred_role and preferred_role in roles:
        if account.role != preferred_role:
            account.role = preferred_role
        return preferred_role, roles

    if account.role in roles:
        return account.role, roles

    fallback_role = roles[0]
    account.role = fallback_role
    return fallback_role, roles

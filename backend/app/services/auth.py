from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from threading import Lock
from uuid import uuid4

from app.core.config import settings
from app.schemas.auth import UserRole


class AuthCodeError(Exception):
    """Raised when auth code is invalid or expired."""


@dataclass
class VerificationCodeRecord:
    request_id: str
    phone: str
    role_hint: UserRole
    code: str
    expires_at: datetime


_store_lock = Lock()
_verification_code_store: dict[str, VerificationCodeRecord] = {}


def normalize_phone(phone: str) -> str:
    digits = "".join(ch for ch in phone if ch.isdigit())
    if len(digits) < 11:
        raise ValueError("Invalid phone format")
    return digits


def create_verification_code(phone: str, role_hint: UserRole) -> VerificationCodeRecord:
    normalized_phone = normalize_phone(phone)
    now = datetime.now(timezone.utc)
    code = settings.auth_fixed_code or f"{int(uuid4().int % 1000000):06d}"

    record = VerificationCodeRecord(
        request_id=str(uuid4()),
        phone=normalized_phone,
        role_hint=role_hint,
        code=code,
        expires_at=now + timedelta(seconds=settings.auth_code_expire_seconds),
    )
    with _store_lock:
        _verification_code_store[normalized_phone] = record
    return record


def verify_code(phone: str, code: str) -> VerificationCodeRecord:
    normalized_phone = normalize_phone(phone)
    now = datetime.now(timezone.utc)

    with _store_lock:
        record = _verification_code_store.get(normalized_phone)
        if not record:
            raise AuthCodeError("Verification code not found")

        if record.expires_at < now:
            del _verification_code_store[normalized_phone]
            raise AuthCodeError("Verification code expired")

        if record.code != code:
            raise AuthCodeError("Verification code invalid")

        del _verification_code_store[normalized_phone]
        return record

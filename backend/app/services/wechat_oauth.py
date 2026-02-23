import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from urllib.parse import urlencode

import httpx
import jwt

from app.core.config import settings


class WechatOAuthError(Exception):
    """Raised when wechat oauth flow fails."""


@dataclass
class WechatOAuthState:
    role: str
    next_path: str | None


@dataclass
class WechatOAuthProfile:
    openid: str
    unionid: str | None
    nickname: str | None
    avatar_url: str | None


def _is_config_value_set(value: str | None) -> bool:
    if not value:
        return False
    normalized = value.strip()
    if not normalized:
        return False
    return not normalized.lower().startswith("your-")


def is_wechat_oauth_enabled() -> bool:
    return all(
        [
            _is_config_value_set(settings.casdoor_endpoint),
            _is_config_value_set(settings.casdoor_client_id),
            _is_config_value_set(settings.casdoor_client_secret),
            _is_config_value_set(settings.casdoor_redirect_uri),
        ]
    )


def sanitize_next_path(raw: str | None) -> str | None:
    if not raw:
        return None
    if not raw.startswith("/"):
        return None
    if raw.startswith("//"):
        return None
    if "://" in raw:
        return None
    return raw


def create_wechat_state(role: str, next_path: str | None) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(seconds=settings.wechat_state_expire_seconds)
    payload = {
        "type": "wechat_oauth_state",
        "role": role,
        "next_path": sanitize_next_path(next_path),
        "nonce": secrets.token_urlsafe(16),
        "exp": expires_at,
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=settings.jwt_algorithm)


def decode_wechat_state(state_token: str) -> WechatOAuthState:
    try:
        payload = jwt.decode(state_token, settings.jwt_secret, algorithms=[settings.jwt_algorithm])
    except Exception as exc:  # noqa: BLE001
        raise WechatOAuthError("Invalid wechat state") from exc

    if payload.get("type") != "wechat_oauth_state":
        raise WechatOAuthError("Invalid wechat state type")

    role = payload.get("role")
    if role not in {"teacher", "student"}:
        raise WechatOAuthError("Invalid wechat login role")

    next_path = sanitize_next_path(payload.get("next_path"))
    return WechatOAuthState(role=role, next_path=next_path)


def build_wechat_authorize_url(*, role: str, next_path: str | None) -> tuple[str, str]:
    if not is_wechat_oauth_enabled():
        raise WechatOAuthError("Casdoor OAuth is not configured")

    state = create_wechat_state(role=role, next_path=next_path)
    query = urlencode(
        {
            "client_id": settings.casdoor_client_id,
            "redirect_uri": settings.casdoor_redirect_uri,
            "response_type": "code",
            "scope": settings.casdoor_scope,
            "state": state,
        }
    )
    return f"{_build_casdoor_url(settings.casdoor_authorize_path)}?{query}", state


def _build_casdoor_url(path: str) -> str:
    if path.startswith("http://") or path.startswith("https://"):
        return path
    endpoint = (settings.casdoor_endpoint or "").rstrip("/")
    normalized_path = f"/{path.lstrip('/')}"
    return f"{endpoint}{normalized_path}"


def _extract_casdoor_error(payload: dict) -> str | None:
    oauth_error = payload.get("error")
    if oauth_error:
        description = payload.get("error_description")
        return f"{oauth_error}: {description}" if description else str(oauth_error)

    err_code = payload.get("errcode")
    if err_code in (None, 0, "0"):
        if payload.get("status") == "error":
            msg = payload.get("msg") or payload.get("message")
            return str(msg or "unknown error")
        return None

    err_msg = payload.get("errmsg") or payload.get("message")
    return f"errcode={err_code}, errmsg={err_msg}" if err_msg else f"errcode={err_code}"


async def fetch_wechat_oauth_profile(code: str) -> WechatOAuthProfile:
    if not is_wechat_oauth_enabled():
        raise WechatOAuthError("Casdoor OAuth is not configured")

    timeout = httpx.Timeout(settings.wechat_timeout_seconds)
    async with httpx.AsyncClient(timeout=timeout) as client:
        token_url = _build_casdoor_url(settings.casdoor_token_path)
        token_payload_data = {
            "grant_type": "authorization_code",
            "client_id": settings.casdoor_client_id,
            "client_secret": settings.casdoor_client_secret,
            "code": code,
            "redirect_uri": settings.casdoor_redirect_uri,
        }
        token_response = await client.post(token_url, data=token_payload_data)
        if token_response.status_code == 405:
            token_response = await client.get(token_url, params=token_payload_data)
        token_response.raise_for_status()
        token_payload = token_response.json()

        token_error = _extract_casdoor_error(token_payload)
        if token_error:
            raise WechatOAuthError(f"Failed to exchange casdoor code: {token_error}")

        access_token = token_payload.get("access_token")
        if not access_token:
            raise WechatOAuthError("Casdoor oauth token response is missing access_token")

        user_response = await client.get(
            _build_casdoor_url(settings.casdoor_userinfo_path),
            headers={"Authorization": f"Bearer {access_token}"},
        )
        user_response.raise_for_status()
        user_payload = user_response.json()

        user_error = _extract_casdoor_error(user_payload)
        if user_error:
            raise WechatOAuthError(f"Failed to fetch casdoor profile: {user_error}")

        openid = user_payload.get("sub") or user_payload.get("id") or user_payload.get("name")
        if not openid:
            raise WechatOAuthError("Casdoor userinfo response is missing subject")

        unionid = user_payload.get("unionid")
        nickname = (
            user_payload.get("displayName")
            or user_payload.get("name")
            or user_payload.get("preferred_username")
            or user_payload.get("username")
        )
        avatar_url = user_payload.get("avatar") or user_payload.get("picture")

        return WechatOAuthProfile(
            openid=str(openid),
            unionid=str(unionid) if unionid else None,
            nickname=str(nickname) if nickname else None,
            avatar_url=str(avatar_url) if avatar_url else None,
        )

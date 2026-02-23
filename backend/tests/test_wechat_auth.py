import time

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import select

from app.core.config import settings
from app.db.session import SessionLocal
from app.main import app
from app.models import AuthAccount, WechatAccountLink
from app.services.wechat_oauth import WechatOAuthProfile


@pytest.fixture(autouse=True)
def enable_wechat_oauth_for_tests():
    snapshot = {
        "casdoor_endpoint": settings.casdoor_endpoint,
        "casdoor_client_id": settings.casdoor_client_id,
        "casdoor_client_secret": settings.casdoor_client_secret,
        "casdoor_redirect_uri": settings.casdoor_redirect_uri,
    }
    settings.casdoor_endpoint = "https://door.example.com"
    settings.casdoor_client_id = "casdoor-test-client"
    settings.casdoor_client_secret = "casdoor-test-secret"
    settings.casdoor_redirect_uri = "http://127.0.0.1:3000/login/wechat/callback"
    try:
        yield
    finally:
        settings.casdoor_endpoint = snapshot["casdoor_endpoint"]
        settings.casdoor_client_id = snapshot["casdoor_client_id"]
        settings.casdoor_client_secret = snapshot["casdoor_client_secret"]
        settings.casdoor_redirect_uri = snapshot["casdoor_redirect_uri"]


def test_wechat_authorize_contract() -> None:
    with TestClient(app) as client:
        response = client.get(
            "/api/v1/auth/wechat/authorize",
            params={"role": "student", "next": "/student"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert payload["authorization_url"].startswith("https://door.example.com/login/oauth/authorize?")
    assert "client_id=casdoor-test-client" in payload["authorization_url"]
    assert payload["state"]


@pytest.mark.parametrize("role,next_path", [("student", "/student"), ("teacher", "/teacher")])
def test_wechat_bind_phone_flow(monkeypatch, role: str, next_path: str) -> None:
    identity_suffix = str(time.time_ns())
    phone = f"136{str(time.time_ns() % 100_000_000).zfill(8)}"

    async def fake_fetch_profile(_: str) -> WechatOAuthProfile:
        return WechatOAuthProfile(
            openid=f"openid-{role}-{identity_suffix}",
            unionid=f"unionid-{role}-{identity_suffix}",
            nickname="微信用户",
            avatar_url="https://example.com/avatar.png",
        )

    monkeypatch.setattr("app.api.v1.endpoints.auth.fetch_wechat_oauth_profile", fake_fetch_profile)

    with TestClient(app) as client:
        authorize_response = client.get(
            "/api/v1/auth/wechat/authorize",
            params={"role": role, "next": next_path},
        )
        assert authorize_response.status_code == 200
        state = authorize_response.json()["state"]

        callback_response = client.get(
            "/api/v1/auth/wechat/callback",
            params={"code": "wechat-code", "state": state},
        )
        assert callback_response.status_code == 200
        callback_payload = callback_response.json()
        assert callback_payload["need_bind_phone"] is True
        assert callback_payload["bind_ticket"]

        send_code_response = client.post(
            "/api/v1/auth/wechat/send-bind-code",
            json={"bind_ticket": callback_payload["bind_ticket"], "phone": phone},
        )
        assert send_code_response.status_code == 200

        bind_response = client.post(
            "/api/v1/auth/wechat/bind-phone",
            json={
                "bind_ticket": callback_payload["bind_ticket"],
                "phone": phone,
                "code": "123456",
                "display_name": "微信绑定用户",
            },
        )
        assert bind_response.status_code == 200
        bind_payload = bind_response.json()
        assert bind_payload["access_token"]
        assert bind_payload["refresh_token"]
        assert bind_payload["user"]["phone"] == phone
        assert bind_payload["user"]["role"] == role

        second_callback_response = client.get(
            "/api/v1/auth/wechat/callback",
            params={"code": "wechat-code-2", "state": state},
        )
        assert second_callback_response.status_code == 200
        second_payload = second_callback_response.json()
        assert second_payload["need_bind_phone"] is False
        assert second_payload["access_token"]
        assert second_payload["user"]["phone"] == phone

    db = SessionLocal()
    try:
        account = db.scalar(select(AuthAccount).where(AuthAccount.phone == phone).limit(1))
        assert account is not None
        link = db.scalar(select(WechatAccountLink).where(WechatAccountLink.auth_account_id == account.id).limit(1))
        assert link is not None
        assert link.openid.startswith(f"openid-{role}-")
    finally:
        db.close()


def test_wechat_callback_rejects_role_mismatch(monkeypatch) -> None:
    identity_suffix = str(time.time_ns())
    phone = f"135{str(time.time_ns() % 100_000_000).zfill(8)}"

    async def fake_fetch_profile(_: str) -> WechatOAuthProfile:
        return WechatOAuthProfile(
            openid=f"openid-student-{identity_suffix}",
            unionid=f"unionid-student-{identity_suffix}",
            nickname="微信用户",
            avatar_url=None,
        )

    monkeypatch.setattr("app.api.v1.endpoints.auth.fetch_wechat_oauth_profile", fake_fetch_profile)

    with TestClient(app) as client:
        student_authorize = client.get(
            "/api/v1/auth/wechat/authorize",
            params={"role": "student", "next": "/student"},
        )
        student_state = student_authorize.json()["state"]

        callback_response = client.get(
            "/api/v1/auth/wechat/callback",
            params={"code": "wechat-code", "state": student_state},
        )
        bind_ticket = callback_response.json()["bind_ticket"]

        send_code = client.post(
            "/api/v1/auth/wechat/send-bind-code",
            json={"bind_ticket": bind_ticket, "phone": phone},
        )
        assert send_code.status_code == 200

        bind_response = client.post(
            "/api/v1/auth/wechat/bind-phone",
            json={"bind_ticket": bind_ticket, "phone": phone, "code": "123456"},
        )
        assert bind_response.status_code == 200

        teacher_authorize = client.get(
            "/api/v1/auth/wechat/authorize",
            params={"role": "teacher", "next": "/teacher"},
        )
        teacher_state = teacher_authorize.json()["state"]

        mismatch_response = client.get(
            "/api/v1/auth/wechat/callback",
            params={"code": "wechat-code-2", "state": teacher_state},
        )

    assert mismatch_response.status_code == 403
    assert mismatch_response.json()["detail"] == "Wechat account role mismatch"

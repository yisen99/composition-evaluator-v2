import time

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import AuthAccount, User


def _dynamic_phone(prefix: str = "138") -> str:
    return f"{prefix}{str(time.time_ns() % 100_000_000).zfill(8)}"


def test_send_code_contract() -> None:
    phone = _dynamic_phone("136")
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "request_id" in payload
    assert payload["expires_in"] == 300


def test_send_code_rate_limit_contract() -> None:
    phone = _dynamic_phone("132")
    with TestClient(app) as client:
        first_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        second_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )

    assert first_response.status_code == 200
    assert second_response.status_code == 429
    assert second_response.json()["detail"] == "Verification code requested too frequently"


def test_login_contract() -> None:
    phone = _dynamic_phone("135")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "小明"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert "refresh_token" in payload
    assert payload["user"]["phone"] == phone
    assert payload["user"]["role"] == "student"
    assert payload["user"]["display_name"] == "小明"


def test_login_refresh_contract() -> None:
    phone = _dynamic_phone("134")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        login_response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "小明"},
        )
        assert login_response.status_code == 200
        refresh_token = login_response.json()["refresh_token"]

        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": refresh_token},
        )

    assert refresh_response.status_code == 200
    refresh_payload = refresh_response.json()
    assert refresh_payload["access_token"]
    assert refresh_payload["refresh_token"]
    assert refresh_payload["user"]["phone"] == phone
    assert refresh_payload["user"]["role"] == "student"


def test_refresh_rejects_invalid_token() -> None:
    with TestClient(app) as client:
        refresh_response = client.post(
            "/api/v1/auth/refresh",
            json={"refresh_token": "invalid-refresh-token"},
        )

    assert refresh_response.status_code == 401


def test_send_code_rejects_teacher_sms_signup_for_new_phone() -> None:
    with TestClient(app) as client:
        phone = f"139{str(time.time_ns() % 100_000_000).zfill(8)}"
        response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "teacher"},
        )

    assert response.status_code == 403


def test_existing_teacher_can_use_sms_login() -> None:
    with TestClient(app) as client:
        phone = f"137{str(time.time_ns() % 100_000_000).zfill(8)}"
        email = f"teacher_sms_{time.time_ns()}@example.com"
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePass123!",
                "role": "teacher",
                "display_name": "短信老师",
                "phone": phone,
            },
        )
        assert register_response.status_code == 201

        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "teacher"},
        )
        assert send_code_response.status_code == 200

        login_response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "短信老师"},
        )

    assert login_response.status_code == 200
    assert login_response.json()["user"]["role"] == "teacher"


def test_sms_login_token_can_access_protected_student_api() -> None:
    phone = _dynamic_phone("133")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        login_response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "短信学生"},
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        classes_response = client.get(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {access_token}"},
        )

    assert classes_response.status_code == 200


def test_account_register_and_password_login_contract() -> None:
    with TestClient(app) as client:
        email = f"teacher_pwd_{time.time_ns()}@example.com"
        phone = f"138{str(time.time_ns() % 100_000_000).zfill(8)}"
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePass123!",
                "role": "teacher",
                "display_name": "账号老师",
                "phone": phone,
            },
        )
        assert register_response.status_code == 201
        register_payload = register_response.json()
        assert register_payload["email"] == email
        assert register_payload["role"] == "teacher"

        login_response = client.post(
            "/api/v1/auth/password-login",
            json={"email": email, "password": "SecurePass123!"},
        )
        assert login_response.status_code == 200
        token_payload = login_response.json()
        assert token_payload["access_token"]
        assert token_payload["refresh_token"]

        create_class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {token_payload['access_token']}"},
            json={"name": "密码登录班级", "grade_band": "primary"},
        )

    assert create_class_response.status_code == 201


def test_account_register_with_duplicate_phone_returns_client_error() -> None:
    with TestClient(app) as client:
        suffix = str(time.time_ns() % 100_000_000).zfill(8)
        phone = f"138{suffix}"
        email_a = f"teacher_dup_a_{time.time_ns()}@example.com"
        email_b = f"teacher_dup_b_{time.time_ns()}@example.com"

        first_register = client.post(
            "/api/v1/auth/register",
            json={
                "email": email_a,
                "password": "SecurePass123!",
                "role": "teacher",
                "display_name": "老师A",
                "phone": phone,
            },
        )
        assert first_register.status_code == 201

        second_register = client.post(
            "/api/v1/auth/register",
            json={
                "email": email_b,
                "password": "SecurePass123!",
                "role": "teacher",
                "display_name": "老师B",
                "phone": phone,
            },
        )

    assert second_register.status_code == 400


def test_auth_users_me_patch_role_is_rejected() -> None:
    with TestClient(app) as client:
        email = f"student_patch_{time.time_ns()}@example.com"
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePass123!",
                "role": "student",
                "display_name": "学生补丁",
            },
        )
        assert register_response.status_code == 201

        login_response = client.post(
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "SecurePass123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_response.status_code == 200
        token = login_response.json()["access_token"]

        patch_response = client.patch(
            "/api/v1/auth/users/me",
            headers={"Authorization": f"Bearer {token}"},
            json={"role": "teacher"},
        )
        me_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )

    assert patch_response.status_code == 422
    assert me_response.status_code == 200
    assert me_response.json()["role"] == "student"


def test_password_login_syncs_domain_user_role_from_account() -> None:
    with TestClient(app) as client:
        email = f"sync_role_{time.time_ns()}@example.com"
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePass123!",
                "role": "student",
                "display_name": "同步学生",
            },
        )
        assert register_response.status_code == 201

        first_login = client.post(
            "/api/v1/auth/password-login",
            json={"email": email, "password": "SecurePass123!"},
        )
        assert first_login.status_code == 200

        db = SessionLocal()
        try:
            account = db.scalar(select(AuthAccount).where(AuthAccount.email == email))
            assert account is not None
            account.role = "teacher"
            db.commit()
        finally:
            db.close()

        second_login = client.post(
            "/api/v1/auth/password-login",
            json={"email": email, "password": "SecurePass123!"},
        )
        assert second_login.status_code == 200
        token = second_login.json()["access_token"]

        create_class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {token}"},
            json={"name": "同步后班级", "grade_band": "primary"},
        )

        db = SessionLocal()
        try:
            account = db.scalar(select(AuthAccount).where(AuthAccount.email == email))
            assert account is not None
            domain_user = db.get(User, str(account.id))
            assert domain_user is not None
            synced_role = domain_user.role
        finally:
            db.close()

    assert create_class_response.status_code == 201
    assert synced_role == "teacher"

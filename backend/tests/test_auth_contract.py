from fastapi.testclient import TestClient
import time

from app.main import app


def test_send_code_contract() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": "13800138000", "role_hint": "teacher"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "request_id" in payload
    assert payload["expires_in"] == 300


def test_login_contract() -> None:
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": "13800138001", "role_hint": "teacher"},
        )
        assert send_code_response.status_code == 200

        response = client.post(
            "/api/v1/auth/login",
            json={"phone": "13800138001", "code": "123456", "display_name": "王老师"},
        )

    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert "refresh_token" in payload
    assert payload["user"]["phone"] == "13800138001"
    assert payload["user"]["role"] == "teacher"
    assert payload["user"]["display_name"] == "王老师"


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
            "/api/v1/auth/jwt/login",
            data={"username": email, "password": "SecurePass123!"},
            headers={"Content-Type": "application/x-www-form-urlencoded"},
        )
        assert login_response.status_code == 200
        token_payload = login_response.json()
        assert token_payload["access_token"]

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

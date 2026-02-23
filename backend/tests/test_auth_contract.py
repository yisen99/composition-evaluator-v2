import time

from fastapi.testclient import TestClient
from sqlalchemy import select

from app.db.session import SessionLocal
from app.main import app
from app.models import AuthAccount, AuthAccountRole, User


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
    assert payload["user"]["available_roles"] == ["student"]
    assert payload["user"]["last_active_role"] == "student"
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
    assert refresh_payload["user"]["available_roles"] == ["student"]
    assert refresh_payload["user"]["last_active_role"] == "student"


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


def test_password_login_keeps_last_active_role_when_teacher_role_is_granted() -> None:
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
        second_payload = second_login.json()
        token = second_payload["access_token"]

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

    assert create_class_response.status_code == 403
    assert second_payload["user"]["role"] == "student"
    assert sorted(second_payload["user"]["available_roles"]) == ["student", "teacher"]
    assert synced_role == "student"


def test_auth_roles_and_switch_role_persist_last_active_role() -> None:
    phone = _dynamic_phone("131")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        first_login = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "双角色学生"},
        )
        assert first_login.status_code == 200
        first_payload = first_login.json()
        student_access_token = first_payload["access_token"]
        assert first_payload["user"]["role"] == "student"
        assert first_payload["user"]["available_roles"] == ["student"]

        db = SessionLocal()
        try:
            account = db.scalar(select(AuthAccount).where(AuthAccount.phone == phone).limit(1))
            assert account is not None
            has_teacher_role = db.scalar(
                select(AuthAccountRole)
                .where(
                    AuthAccountRole.auth_account_id == account.id,
                    AuthAccountRole.role == "teacher",
                )
                .limit(1)
            )
            if has_teacher_role is None:
                db.add(
                    AuthAccountRole(
                        auth_account_id=account.id,
                        role="teacher",
                    )
                )
            db.commit()
        finally:
            db.close()

        roles_response = client.get(
            "/api/v1/auth/roles",
            headers={"Authorization": f"Bearer {student_access_token}"},
        )
        assert roles_response.status_code == 200
        roles_payload = roles_response.json()
        assert roles_payload["active_role"] == "student"
        assert sorted(roles_payload["available_roles"]) == ["student", "teacher"]

        switch_to_teacher_response = client.post(
            "/api/v1/auth/switch-role",
            headers={"Authorization": f"Bearer {student_access_token}"},
            json={"target_role": "teacher"},
        )
        assert switch_to_teacher_response.status_code == 200
        switch_payload = switch_to_teacher_response.json()
        assert switch_payload["user"]["role"] == "teacher"
        assert switch_payload["user"]["last_active_role"] == "teacher"
        assert sorted(switch_payload["user"]["available_roles"]) == ["student", "teacher"]

        switched_access_token = switch_payload["access_token"]
        create_class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {switched_access_token}"},
            json={"name": "切换后班级", "grade_band": "primary"},
        )
        assert create_class_response.status_code == 201

        send_code_again_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "teacher"},
        )
        assert send_code_again_response.status_code == 200

        second_login = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456"},
        )
        assert second_login.status_code == 200
        second_payload = second_login.json()
        assert second_payload["user"]["role"] == "teacher"
        assert second_payload["user"]["last_active_role"] == "teacher"
        assert sorted(second_payload["user"]["available_roles"]) == ["student", "teacher"]


def test_switch_role_rejects_unavailable_role() -> None:
    phone = _dynamic_phone("130")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        login_response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "单角色学生"},
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        switch_response = client.post(
            "/api/v1/auth/switch-role",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"target_role": "teacher"},
        )

    assert switch_response.status_code == 403
    assert switch_response.json()["detail"] == "Role is not available for current account"


def test_role_guard_uses_active_role_after_switch() -> None:
    phone = _dynamic_phone("129")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        login_response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "切换守卫学生"},
        )
        assert login_response.status_code == 200
        access_token = login_response.json()["access_token"]

        db = SessionLocal()
        try:
            account = db.scalar(select(AuthAccount).where(AuthAccount.phone == phone).limit(1))
            assert account is not None
            db.add(
                AuthAccountRole(
                    auth_account_id=account.id,
                    role="teacher",
                )
            )
            db.commit()
        finally:
            db.close()

        switch_teacher_response = client.post(
            "/api/v1/auth/switch-role",
            headers={"Authorization": f"Bearer {access_token}"},
            json={"target_role": "teacher"},
        )
        assert switch_teacher_response.status_code == 200
        teacher_token = switch_teacher_response.json()["access_token"]

        teacher_create_class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "老师态班级", "grade_band": "primary"},
        )
        assert teacher_create_class_response.status_code == 201

        switch_student_response = client.post(
            "/api/v1/auth/switch-role",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"target_role": "student"},
        )
        assert switch_student_response.status_code == 200
        student_token = switch_student_response.json()["access_token"]

        student_create_class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"name": "学生态班级", "grade_band": "primary"},
        )

    assert student_create_class_response.status_code == 403
    assert student_create_class_response.json()["detail"] == "Teacher role required"


def test_admin_grant_role_keeps_user_last_active_role() -> None:
    admin_email = f"admin_{time.time_ns()}@example.com"
    student_phone = _dynamic_phone("128")
    with TestClient(app) as client:
        student_send_code = client.post(
            "/api/v1/auth/send-code",
            json={"phone": student_phone, "role_hint": "student"},
        )
        assert student_send_code.status_code == 200

        student_login = client.post(
            "/api/v1/auth/login",
            json={"phone": student_phone, "code": "123456", "display_name": "待升级学生"},
        )
        assert student_login.status_code == 200
        assert student_login.json()["user"]["role"] == "student"

        admin_register = client.post(
            "/api/v1/auth/register",
            json={
                "email": admin_email,
                "password": "SecurePass123!",
                "role": "teacher",
                "display_name": "系统管理员",
                "phone": _dynamic_phone("127"),
            },
        )
        assert admin_register.status_code == 201

        db = SessionLocal()
        try:
            admin_account = db.scalar(select(AuthAccount).where(AuthAccount.email == admin_email).limit(1))
            assert admin_account is not None
            admin_account.is_superuser = True
            db.commit()
        finally:
            db.close()

        admin_login = client.post(
            "/api/v1/auth/password-login",
            json={"email": admin_email, "password": "SecurePass123!"},
        )
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]

        grant_response = client.post(
            "/api/v1/auth/admin/grant-role",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={"phone": student_phone, "target_role": "teacher"},
        )
        assert grant_response.status_code == 200
        grant_payload = grant_response.json()
        assert grant_payload["active_role"] == "student"
        assert sorted(grant_payload["available_roles"]) == ["student", "teacher"]

        student_send_code_again = client.post(
            "/api/v1/auth/send-code",
            json={"phone": student_phone, "role_hint": "teacher"},
        )
        assert student_send_code_again.status_code == 200
        student_login_again = client.post(
            "/api/v1/auth/login",
            json={"phone": student_phone, "code": "123456"},
        )
        assert student_login_again.status_code == 200
        student_payload = student_login_again.json()
        assert student_payload["user"]["role"] == "student"
        assert sorted(student_payload["user"]["available_roles"]) == ["student", "teacher"]


def test_admin_grant_role_rejects_non_admin_user() -> None:
    phone = _dynamic_phone("126")
    with TestClient(app) as client:
        send_code_response = client.post(
            "/api/v1/auth/send-code",
            json={"phone": phone, "role_hint": "student"},
        )
        assert send_code_response.status_code == 200

        login_response = client.post(
            "/api/v1/auth/login",
            json={"phone": phone, "code": "123456", "display_name": "普通学生"},
        )
        assert login_response.status_code == 200
        student_token = login_response.json()["access_token"]

        grant_response = client.post(
            "/api/v1/auth/admin/grant-role",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"phone": phone, "target_role": "teacher"},
        )

    assert grant_response.status_code == 403
    assert grant_response.json()["detail"] == "Admin role required"

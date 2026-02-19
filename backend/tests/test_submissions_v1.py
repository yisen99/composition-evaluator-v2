import time

from fastapi.testclient import TestClient

from app.main import app


def _phone(seed: str) -> str:
    suffix = str(abs(hash(seed)) % 100_000_000).zfill(8)
    return f"138{suffix}"


def _login(
    client: TestClient,
    *,
    phone: str,
    role: str,
    display_name: str,
) -> tuple[str, dict]:
    if role == "teacher":
        email = f"teacher_{phone}_{time.time_ns()}@example.com"
        register_response = client.post(
            "/api/v1/auth/register",
            json={
                "email": email,
                "password": "SecurePass123!",
                "role": "teacher",
                "display_name": display_name,
                "phone": phone,
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

        me_response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {token}"},
        )
        assert me_response.status_code == 200
        return token, me_response.json()

    send_code_response = client.post(
        "/api/v1/auth/send-code",
        json={"phone": phone, "role_hint": role},
    )
    assert send_code_response.status_code == 200

    login_response = client.post(
        "/api/v1/auth/login",
        json={"phone": phone, "code": "123456", "display_name": display_name},
    )
    assert login_response.status_code == 200
    payload = login_response.json()
    return payload["access_token"], payload["user"]


def _setup_assignment_and_join(client: TestClient) -> tuple[str, str]:
    teacher_token, _ = _login(
        client,
        phone=_phone(f"teacher-submit-v1-{time.time_ns()}"),
        role="teacher",
        display_name="王老师",
    )
    student_token, _ = _login(
        client,
        phone=_phone(f"student-submit-v1-{time.time_ns()}"),
        role="student",
        display_name="小明",
    )

    class_response = client.post(
        "/api/v1/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "三年级一班", "grade_band": "primary"},
    )
    assert class_response.status_code == 201
    class_payload = class_response.json()

    join_response = client.post(
        "/api/v1/classes/join",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"join_code": class_payload["join_code"], "student_name": "小明"},
    )
    assert join_response.status_code == 200
    return teacher_token, student_token


def test_submission_blocks_overdue_assignment() -> None:
    with TestClient(app) as client:
        teacher_token, student_token = _setup_assignment_and_join(client)

        assignment_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": client.get("/api/v1/classes", headers={"Authorization": f"Bearer {teacher_token}"}).json()[0]["class_id"],
                "title": "过期作文",
                "prompt": "请写一篇记叙文。",
                "due_at": "2000-01-01T00:00:00Z",
            },
        )
        assert assignment_response.status_code == 201
        assignment_id = assignment_response.json()["assignment_id"]

        submit_response = client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            data={
                "assignment_id": assignment_id,
                "content_type": "text",
                "text_content": "这是一篇文本作文。",
            },
        )

    assert submit_response.status_code == 409
    assert submit_response.json()["detail"] == "Assignment due date has passed"


def test_submission_rejects_invalid_image_upload_type() -> None:
    with TestClient(app) as client:
        teacher_token, student_token = _setup_assignment_and_join(client)

        assignment_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": client.get("/api/v1/classes", headers={"Authorization": f"Bearer {teacher_token}"}).json()[0]["class_id"],
                "title": "图片作文",
                "prompt": "上传手写作文照片。",
                "due_at": "2099-01-01T00:00:00Z",
            },
        )
        assert assignment_response.status_code == 201
        assignment_id = assignment_response.json()["assignment_id"]

        submit_response = client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            data={
                "assignment_id": assignment_id,
                "content_type": "image",
            },
            files={"file": ("bad.pdf", b"pdf-content", "application/pdf")},
        )

    assert submit_response.status_code == 422
    assert submit_response.json()["detail"] == "Unsupported image file type"


def test_student_can_list_my_submissions() -> None:
    with TestClient(app) as client:
        teacher_token, student_token = _setup_assignment_and_join(client)

        class_id = client.get("/api/v1/classes", headers={"Authorization": f"Bearer {teacher_token}"}).json()[0]["class_id"]
        assignment_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": class_id,
                "title": "我的校园",
                "prompt": "写校园生活。",
                "due_at": "2099-01-01T00:00:00Z",
            },
        )
        assert assignment_response.status_code == 201
        assignment_id = assignment_response.json()["assignment_id"]

        submit_response = client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            data={
                "assignment_id": assignment_id,
                "content_type": "text",
                "text_content": "操场上有风，树叶在阳光下发亮。",
            },
        )
        assert submit_response.status_code == 201

        list_response = client.get(
            "/api/v1/submissions/me",
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert list_response.status_code == 200
    payload = list_response.json()
    assert len(payload) >= 1
    assert payload[0]["assignment_id"] == assignment_id
    assert payload[0]["assignment_title"] == "我的校园"
    assert payload[0]["class_name"] == "三年级一班"

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
    token = payload["access_token"]
    return token, payload["user"]


def test_teacher_can_create_class_and_receive_join_code() -> None:
    with TestClient(app) as client:
        teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-create-{time.time_ns()}"),
            role="teacher",
            display_name="王老师",
        )

        response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "name": "三年级一班",
                "grade_band": "primary",
            },
        )

    assert response.status_code == 201
    payload = response.json()
    assert "class_id" in payload
    assert len(payload["join_code"]) == 6


def test_student_can_join_class_with_join_code() -> None:
    with TestClient(app) as client:
        teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-join-{time.time_ns()}"),
            role="teacher",
            display_name="张老师",
        )
        student_token, _ = _login(
            client,
            phone=_phone(f"student-join-{time.time_ns()}"),
            role="student",
            display_name="小明",
        )

        create_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "name": "四年级二班",
                "grade_band": "primary",
            },
        )
        class_payload = create_response.json()

        join_response = client.post(
            "/api/v1/classes/join",
            headers={"Authorization": f"Bearer {student_token}"},
            json={
                "join_code": class_payload["join_code"],
                "student_name": "小明",
            },
        )

    assert join_response.status_code == 200
    joined = join_response.json()
    assert joined["class_id"] == class_payload["class_id"]
    assert joined["class_name"] == "四年级二班"


def test_teacher_can_publish_assignment_for_owned_class() -> None:
    with TestClient(app) as client:
        teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-assignment-{time.time_ns()}"),
            role="teacher",
            display_name="李老师",
        )

        class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "name": "五年级三班",
                "grade_band": "primary",
            },
        )
        class_payload = class_response.json()

        assignment_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": class_payload["class_id"],
                "title": "我的家乡",
                "prompt": "请写一篇介绍家乡景色与人情的作文，600字左右。",
                "due_at": "2026-03-01T23:59:59",
            },
        )

    assert assignment_response.status_code == 201
    assignment_payload = assignment_response.json()
    assert assignment_payload["class_id"] == class_payload["class_id"]
    assert assignment_payload["status"] == "published"


def test_role_guard_blocks_student_from_creating_class() -> None:
    with TestClient(app) as client:
        student_token, _ = _login(
            client,
            phone=_phone(f"student-guard-{time.time_ns()}"),
            role="student",
            display_name="小红",
        )
        create_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"name": "错误班级", "grade_band": "primary"},
        )

    assert create_response.status_code == 403
    assert create_response.json()["detail"] == "Teacher role required"


def test_teacher_can_list_classes_and_assignments() -> None:
    with TestClient(app) as client:
        teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-list-{time.time_ns()}"),
            role="teacher",
            display_name="赵老师",
        )
        create_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "六年级二班", "grade_band": "primary"},
        )
        assert create_response.status_code == 201
        class_payload = create_response.json()

        publish_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": class_payload["class_id"],
                "title": "雨中的校园",
                "prompt": "描写一场雨中的校园生活。",
                "due_at": "2026-03-10T09:00:00",
            },
        )
        assert publish_response.status_code == 201
        assignment_payload = publish_response.json()

        classes_response = client.get(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assignments_response = client.get(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

    assert classes_response.status_code == 200
    class_ids = [item["class_id"] for item in classes_response.json()]
    assert class_payload["class_id"] in class_ids

    assert assignments_response.status_code == 200
    assignment_ids = [item["assignment_id"] for item in assignments_response.json()]
    assert assignment_payload["assignment_id"] in assignment_ids

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
        me_response = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
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


def _seed_teacher_assignments(client: TestClient) -> tuple[str, str, str]:
    teacher_token, _ = _login(
        client,
        phone=_phone(f"teacher-task-center-{time.time_ns()}"),
        role="teacher",
        display_name="杨老师",
    )
    student_token, _ = _login(
        client,
        phone=_phone(f"student-task-center-{time.time_ns()}"),
        role="student",
        display_name="小李",
    )
    class_response = client.post(
        "/api/v1/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "六年级三班", "grade_band": "primary"},
    )
    assert class_response.status_code == 201
    class_payload = class_response.json()

    join_response = client.post(
        "/api/v1/classes/join",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"join_code": class_payload["join_code"], "student_name": "小李"},
    )
    assert join_response.status_code == 200

    first_assignment_response = client.post(
        "/api/v1/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "class_id": class_payload["class_id"],
            "title": "第一篇写景",
            "prompt": "描写清晨校园景色。",
            "due_at": "2099-05-01T12:00:00Z",
        },
    )
    assert first_assignment_response.status_code == 201
    first_assignment_id = first_assignment_response.json()["assignment_id"]

    second_assignment_response = client.post(
        "/api/v1/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "class_id": class_payload["class_id"],
            "title": "第二篇写人",
            "prompt": "写一位你尊敬的人。",
            "due_at": "2099-05-06T12:00:00Z",
        },
    )
    assert second_assignment_response.status_code == 201
    second_assignment_id = second_assignment_response.json()["assignment_id"]

    submit_response = client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "assignment_id": first_assignment_id,
            "content_type": "text",
            "text_content": "早晨的操场有露珠，风很轻。",
        },
    )
    assert submit_response.status_code == 201

    return teacher_token, first_assignment_id, second_assignment_id


def test_task_center_batch_actions_cover_workflow_reminder_and_status() -> None:
    with TestClient(app) as client:
        teacher_token, first_assignment_id, second_assignment_id = _seed_teacher_assignments(client)

        enter_response = client.post(
            "/api/v1/assignments/batch/actions",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "assignment_ids": [first_assignment_id, "not-exists-id", second_assignment_id],
                "action": "enter_workflow",
            },
        )
        assert enter_response.status_code == 200
        enter_payload = enter_response.json()
        assert enter_payload["action"] == "enter_workflow"
        assert enter_payload["succeeded"] == 2
        assert enter_payload["failed"] == 1
        assert enter_payload["workflow_assignment_ids"] == [first_assignment_id, second_assignment_id]

        reminder_response = client.post(
            "/api/v1/assignments/batch/actions",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "assignment_ids": [first_assignment_id, second_assignment_id],
                "action": "publish_reminder",
            },
        )
        assert reminder_response.status_code == 200
        reminder_payload = reminder_response.json()
        assert reminder_payload["succeeded"] == 2
        reminder_targets = {
            item["assignment_id"]: item["reminder_target_count"] for item in reminder_payload["results"] if item["status"] == "success"
        }
        assert reminder_targets[first_assignment_id] == 0
        assert reminder_targets[second_assignment_id] == 1

        advance_response = client.post(
            "/api/v1/assignments/batch/actions",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "assignment_ids": [first_assignment_id, second_assignment_id],
                "action": "advance_status",
                "target_status": "closed",
            },
        )
        assert advance_response.status_code == 200
        assert advance_response.json()["succeeded"] == 2

        list_response = client.get(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert list_response.status_code == 200
        statuses = {item["assignment_id"]: item["status"] for item in list_response.json()}
        assert statuses[first_assignment_id] == "closed"
        assert statuses[second_assignment_id] == "closed"


def test_observability_event_tracking_and_summary() -> None:
    with TestClient(app) as client:
        teacher_token, _, _ = _seed_teacher_assignments(client)

        track_one_response = client.post(
            "/api/v1/observability/events",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "event_name": "teacher_task_center_view",
                "event_category": "page_view",
                "page": "/teacher/tasks",
                "properties": {"source": "test"},
            },
        )
        assert track_one_response.status_code == 200

        track_two_response = client.post(
            "/api/v1/observability/events",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "event_name": "teacher_task_batch_action_execute",
                "event_category": "action",
                "page": "/teacher/tasks",
                "properties": {"action": "publish_reminder", "selected_count": 2},
            },
        )
        assert track_two_response.status_code == 200

        summary_response = client.get(
            "/api/v1/observability/summary?days=7",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

    assert summary_response.status_code == 200
    summary_payload = summary_response.json()
    assert summary_payload["days"] == 7
    assert summary_payload["total_events"] >= 2
    assert summary_payload["teacher_task_center_view_count"] >= 1
    assert summary_payload["teacher_batch_action_count"] >= 1

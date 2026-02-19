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
        me_payload = me_response.json()
        return token, {
            "id": me_payload["id"],
            "role": me_payload["role"],
            "phone": me_payload["phone"] or phone,
            "display_name": me_payload["display_name"],
        }

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


def test_student_can_list_joined_classes_and_assignments() -> None:
    with TestClient(app) as client:
        teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-student-list-{time.time_ns()}"),
            role="teacher",
            display_name="周老师",
        )
        student_token, _ = _login(
            client,
            phone=_phone(f"student-list-{time.time_ns()}"),
            role="student",
            display_name="小刚",
        )

        class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "七年级一班", "grade_band": "junior"},
        )
        assert class_response.status_code == 201
        class_payload = class_response.json()

        publish_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": class_payload["class_id"],
                "title": "我最敬佩的人",
                "prompt": "写一个你最敬佩的人，说明理由。",
                "due_at": "2026-03-20T18:00:00",
            },
        )
        assert publish_response.status_code == 201
        assignment_payload = publish_response.json()

        join_response = client.post(
            "/api/v1/classes/join",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"join_code": class_payload["join_code"], "student_name": "小刚"},
        )
        assert join_response.status_code == 200

        student_classes_response = client.get(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        student_assignments_response = client.get(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert student_classes_response.status_code == 200
    student_class_ids = [item["class_id"] for item in student_classes_response.json()]
    assert class_payload["class_id"] in student_class_ids

    assert student_assignments_response.status_code == 200
    student_assignment_ids = [item["assignment_id"] for item in student_assignments_response.json()]
    assert assignment_payload["assignment_id"] in student_assignment_ids


def test_student_can_submit_composition_and_teacher_can_view_assignment_detail() -> None:
    with TestClient(app) as client:
        teacher_token, teacher_user = _login(
            client,
            phone=_phone(f"teacher-detail-{time.time_ns()}"),
            role="teacher",
            display_name="陈老师",
        )
        student_token, student_user = _login(
            client,
            phone=_phone(f"student-submit-{time.time_ns()}"),
            role="student",
            display_name="小雨",
        )

        class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "五年级一班", "grade_band": "primary"},
        )
        class_payload = class_response.json()

        assignment_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": class_payload["class_id"],
                "title": "春天的脚步",
                "prompt": "观察春天变化，写一篇记叙文。",
                "due_at": "2026-03-28T20:00:00",
            },
        )
        assignment_payload = assignment_response.json()

        join_response = client.post(
            "/api/v1/classes/join",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"join_code": class_payload["join_code"], "student_name": "小雨"},
        )
        assert join_response.status_code == 200

        submit_text_response = client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            data={
                "assignment_id": assignment_payload["assignment_id"],
                "content_type": "text",
                "text_content": "今天我在校园里看到了第一朵迎春花，风也变得温柔起来。",
            },
        )
        assert submit_text_response.status_code == 201
        submit_text_payload = submit_text_response.json()

        submit_file_response = client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            data={
                "assignment_id": assignment_payload["assignment_id"],
                "content_type": "document",
            },
            files={"file": ("zuowen.docx", b"mock-binary-content", "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert submit_file_response.status_code == 201
        submit_file_payload = submit_file_response.json()

        detail_response = client.get(
            f"/api/v1/assignments/{assignment_payload['assignment_id']}",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

    assert submit_text_payload["assignment_id"] == assignment_payload["assignment_id"]
    assert submit_text_payload["content_type"] == "text"
    assert submit_text_payload["status"] == "submitted"

    assert submit_file_payload["content_type"] == "document"
    assert submit_file_payload["file_url"]

    assert detail_response.status_code == 200
    detail_payload = detail_response.json()
    assert detail_payload["assignment_id"] == assignment_payload["assignment_id"]
    assert detail_payload["teacher_id"] == teacher_user["id"]
    assert detail_payload["submissions_count"] == 2
    assert len(detail_payload["submissions"]) == 2
    student_ids = [item["student_id"] for item in detail_payload["submissions"]]
    assert student_user["id"] in student_ids


def test_teacher_can_run_agent_review_and_fetch_student_memory() -> None:
    with TestClient(app) as client:
        teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-review-{time.time_ns()}"),
            role="teacher",
            display_name="何老师",
        )
        student_token, student_user = _login(
            client,
            phone=_phone(f"student-review-{time.time_ns()}"),
            role="student",
            display_name="小晴",
        )

        class_response = client.post(
            "/api/v1/classes",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"name": "六年级三班", "grade_band": "primary"},
        )
        class_payload = class_response.json()

        assignment_response = client.post(
            "/api/v1/assignments",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "class_id": class_payload["class_id"],
                "title": "夜晚的操场",
                "prompt": "描写夜晚操场的声音、光线和心情。",
                "due_at": "2026-04-01T20:00:00",
            },
        )
        assignment_payload = assignment_response.json()

        join_response = client.post(
            "/api/v1/classes/join",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"join_code": class_payload["join_code"], "student_name": "小晴"},
        )
        assert join_response.status_code == 200

        submit_response = client.post(
            "/api/v1/submissions",
            headers={"Authorization": f"Bearer {student_token}"},
            data={
                "assignment_id": assignment_payload["assignment_id"],
                "content_type": "text",
                "text_content": "夜晚的操场像一面安静的湖，路灯把树影拉得很长。",
            },
        )
        assert submit_response.status_code == 201
        submission_payload = submit_response.json()

        forbidden_review_response = client.post(
            "/api/v1/reviews/run",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"submission_id": submission_payload["submission_id"], "agent_name": "value"},
        )

        review_response = client.post(
            "/api/v1/reviews/run",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"submission_id": submission_payload["submission_id"], "agent_name": "value"},
        )
        summary_response = client.post(
            "/api/v1/reviews/summary",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"submission_id": submission_payload["submission_id"]},
        )
        memory_response = client.get(
            f"/api/v1/students/{student_user['id']}/memory",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        student_progress_response = client.get(
            "/api/v1/students/me/progress",
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert forbidden_review_response.status_code == 403
    assert review_response.status_code == 200
    review_payload = review_response.json()
    assert review_payload["submission_id"] == submission_payload["submission_id"]
    assert review_payload["agent_name"] == "value"
    assert review_payload["memory_note_id"]
    assert review_payload["rewrite_suggestions"]

    assert summary_response.status_code == 200
    summary_payload = summary_response.json()
    assert summary_payload["submission_id"] == submission_payload["submission_id"]
    assert summary_payload["radar"]["structure"] >= 0
    assert summary_payload["radar"]["language"] >= 0
    assert summary_payload["radar"]["value"] >= 0
    assert summary_payload["actionable_suggestions"]
    assert summary_payload["rewrite_paragraph"]
    assert len(summary_payload["items"]) == 3

    assert memory_response.status_code == 200
    memory_payload = memory_response.json()
    assert len(memory_payload["items"]) >= 1
    assert memory_payload["items"][0]["student_id"] == student_user["id"]

    assert student_progress_response.status_code == 200
    progress_payload = student_progress_response.json()
    assert progress_payload["student_id"] == student_user["id"]
    assert progress_payload["total_submissions"] >= 1
    assert len(progress_payload["trajectory"]) >= 1

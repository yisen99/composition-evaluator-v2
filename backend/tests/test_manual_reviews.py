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


def _seed_submission(client: TestClient) -> tuple[str, str, str]:
    teacher_token, _ = _login(
        client,
        phone=_phone(f"teacher-manual-{time.time_ns()}"),
        role="teacher",
        display_name="何老师",
    )
    student_token, _ = _login(
        client,
        phone=_phone(f"student-manual-{time.time_ns()}"),
        role="student",
        display_name="小雨",
    )

    class_response = client.post(
        "/api/v1/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "五年级二班", "grade_band": "primary"},
    )
    assert class_response.status_code == 201
    class_payload = class_response.json()

    assignment_response = client.post(
        "/api/v1/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "class_id": class_payload["class_id"],
            "title": "我眼中的春天",
            "prompt": "写一篇描写春天景色和心情的作文。",
            "due_at": "2099-01-01T00:00:00Z",
        },
    )
    assert assignment_response.status_code == 201
    assignment_payload = assignment_response.json()

    join_response = client.post(
        "/api/v1/classes/join",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"join_code": class_payload["join_code"], "student_name": "小雨"},
    )
    assert join_response.status_code == 200

    submit_response = client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "assignment_id": assignment_payload["assignment_id"],
            "content_type": "text",
            "text_content": "清晨的风吹过操场，我闻到了泥土和花香。",
        },
    )
    assert submit_response.status_code == 201
    submission_payload = submit_response.json()

    return teacher_token, assignment_payload["assignment_id"], submission_payload["submission_id"]


def test_teacher_manual_review_draft_publish_and_queue() -> None:
    with TestClient(app) as client:
        teacher_token, assignment_id, submission_id = _seed_submission(client)

        save_draft_response = client.post(
            "/api/v1/manual-reviews/draft",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "submission_id": submission_id,
                "structure_score": 86,
                "language_score": 88,
                "value_score": 90,
                "summary_feedback": "内容完整，结构清楚，建议补充更具体的动作细节。",
                "actionable_suggestions": ["主体段增加一个具体场景细节。", "结尾补一句反思，回扣主题。"],
                "strengths": "开头氛围感较强。",
                "next_goal": "练习一段一重点的写法。",
            },
        )
        assert save_draft_response.status_code == 200

        get_review_response = client.get(
            f"/api/v1/manual-reviews/submission/{submission_id}",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert get_review_response.status_code == 200
        assert get_review_response.json()["exists"] is True
        assert get_review_response.json()["review"]["status"] == "draft"

        publish_response = client.post(
            "/api/v1/manual-reviews/publish",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"submission_id": submission_id},
        )
        assert publish_response.status_code == 200
        assert publish_response.json()["status"] == "published"
        assert publish_response.json()["published_at"] is not None

        queue_response = client.get(
            f"/api/v1/assignments/{assignment_id}/grading-queue",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

    assert queue_response.status_code == 200
    queue_payload = queue_response.json()
    assert queue_payload["assignment_id"] == assignment_id
    assert len(queue_payload["items"]) == 1
    assert queue_payload["items"][0]["manual_status"] == "published"
    assert queue_payload["items"][0]["manual_total_score"] == 88


def test_teacher_manual_review_rejects_non_owner() -> None:
    with TestClient(app) as client:
        owner_token, _, submission_id = _seed_submission(client)
        other_teacher_token, _ = _login(
            client,
            phone=_phone(f"teacher-manual-other-{time.time_ns()}"),
            role="teacher",
            display_name="别的老师",
        )

        owner_save_response = client.post(
            "/api/v1/manual-reviews/draft",
            headers={"Authorization": f"Bearer {owner_token}"},
            json={
                "submission_id": submission_id,
                "structure_score": 80,
                "language_score": 81,
                "value_score": 82,
                "summary_feedback": "先给一版草稿。",
                "actionable_suggestions": ["补充细节。", "优化结尾。"],
            },
        )
        assert owner_save_response.status_code == 200

        forbidden_response = client.post(
            "/api/v1/manual-reviews/draft",
            headers={"Authorization": f"Bearer {other_teacher_token}"},
            json={
                "submission_id": submission_id,
                "structure_score": 90,
                "language_score": 90,
                "value_score": 90,
                "summary_feedback": "越权批改测试。",
                "actionable_suggestions": ["建议A", "建议B"],
            },
        )

    assert forbidden_response.status_code == 403
    assert forbidden_response.json()["detail"] == "Teacher does not own this submission"

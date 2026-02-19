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


def _seed_submission(client: TestClient) -> tuple[str, str, str, str]:
    teacher_token, _ = _login(
        client,
        phone=_phone(f"teacher-student-feedback-{time.time_ns()}"),
        role="teacher",
        display_name="周老师",
    )
    student_token, _ = _login(
        client,
        phone=_phone(f"student-student-feedback-{time.time_ns()}"),
        role="student",
        display_name="小林",
    )

    class_response = client.post(
        "/api/v1/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "五年级四班", "grade_band": "primary"},
    )
    assert class_response.status_code == 201
    class_payload = class_response.json()

    assignment_response = client.post(
        "/api/v1/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "class_id": class_payload["class_id"],
            "title": "放学路上",
            "prompt": "写放学路上看到的景象和心情。",
            "due_at": "2099-01-01T00:00:00Z",
        },
    )
    assert assignment_response.status_code == 201
    assignment_payload = assignment_response.json()

    join_response = client.post(
        "/api/v1/classes/join",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"join_code": class_payload["join_code"], "student_name": "小林"},
    )
    assert join_response.status_code == 200

    submission_response = client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "assignment_id": assignment_payload["assignment_id"],
            "content_type": "text",
            "text_content": "放学时，晚霞把街道染成了橙红色，我和同学一路说笑回家。",
        },
    )
    assert submission_response.status_code == 201
    submission_payload = submission_response.json()
    return teacher_token, student_token, assignment_payload["assignment_id"], submission_payload["submission_id"]


def test_student_can_view_published_manual_feedback() -> None:
    with TestClient(app) as client:
        teacher_token, student_token, _, submission_id = _seed_submission(client)

        for agent_name in ("structure", "language", "value"):
            run_response = client.post(
                "/api/v1/reviews/run",
                headers={"Authorization": f"Bearer {teacher_token}"},
                json={"submission_id": submission_id, "agent_name": agent_name},
            )
            assert run_response.status_code == 200

        save_response = client.post(
            "/api/v1/manual-reviews/draft",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "submission_id": submission_id,
                "structure_score": 86,
                "language_score": 88,
                "value_score": 90,
                "summary_feedback": "叙事顺序清楚，建议增强动作和心理描写。",
                "actionable_suggestions": ["加入一个人物动作细节。", "结尾补一句点题反思。"],
                "strengths": "开头很有画面感。",
                "next_goal": "练习过渡句。",
            },
        )
        assert save_response.status_code == 200

        publish_response = client.post(
            "/api/v1/manual-reviews/publish",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"submission_id": submission_id},
        )
        assert publish_response.status_code == 200

        student_feedback_response = client.get(
            "/api/v1/submissions/me/manual-feedback",
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert student_feedback_response.status_code == 200
    payload = student_feedback_response.json()
    assert len(payload) == 1
    assert payload[0]["submission_id"] == submission_id
    assert payload[0]["manual_total_score"] == 88
    assert payload[0]["summary_feedback"] == "叙事顺序清楚，建议增强动作和心理描写。"
    assert payload[0]["actionable_suggestions"] == ["加入一个人物动作细节。", "结尾补一句点题反思。"]
    assert payload[0]["agent_summary"]["total_score"] >= 0
    assert payload[0]["agent_summary"]["radar"]["structure"] >= 0
    assert payload[0]["agent_summary"]["radar"]["language"] >= 0
    assert payload[0]["agent_summary"]["radar"]["value"] >= 0
    assert len(payload[0]["agent_summary"]["items"]) == 3


def test_student_cannot_view_draft_manual_feedback() -> None:
    with TestClient(app) as client:
        teacher_token, student_token, _, submission_id = _seed_submission(client)

        save_response = client.post(
            "/api/v1/manual-reviews/draft",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "submission_id": submission_id,
                "structure_score": 80,
                "language_score": 82,
                "value_score": 84,
                "summary_feedback": "先保存草稿。",
                "actionable_suggestions": ["补充描写。", "优化结尾。"],
            },
        )
        assert save_response.status_code == 200

        student_feedback_response = client.get(
            "/api/v1/submissions/me/manual-feedback",
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert student_feedback_response.status_code == 200
    payload = student_feedback_response.json()
    assert payload == []


def test_student_mark_feedback_read_updates_teacher_queue() -> None:
    with TestClient(app) as client:
        teacher_token, student_token, assignment_id, submission_id = _seed_submission(client)

        save_response = client.post(
            "/api/v1/manual-reviews/draft",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={
                "submission_id": submission_id,
                "structure_score": 85,
                "language_score": 86,
                "value_score": 87,
                "summary_feedback": "发布前草稿。",
                "actionable_suggestions": ["补充场景细节。", "结尾回扣主题。"],
            },
        )
        assert save_response.status_code == 200
        publish_response = client.post(
            "/api/v1/manual-reviews/publish",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"submission_id": submission_id},
        )
        assert publish_response.status_code == 200

        initial_queue_response = client.get(
            f"/api/v1/assignments/{assignment_id}/grading-queue",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert initial_queue_response.status_code == 200
        initial_item = initial_queue_response.json()["items"][0]
        assert initial_item["manual_viewed"] is False
        assert initial_item["manual_view_count"] == 0

        first_read_response = client.post(
            "/api/v1/submissions/me/manual-feedback/mark-read",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"submission_ids": [submission_id]},
        )
        assert first_read_response.status_code == 200
        assert first_read_response.json()["marked_count"] == 1

        second_read_response = client.post(
            "/api/v1/submissions/me/manual-feedback/mark-read",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"submission_ids": [submission_id]},
        )
        assert second_read_response.status_code == 200
        assert second_read_response.json()["marked_count"] == 1

        queue_response = client.get(
            f"/api/v1/assignments/{assignment_id}/grading-queue",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

    assert queue_response.status_code == 200
    item = queue_response.json()["items"][0]
    assert item["manual_viewed"] is True
    assert item["manual_view_count"] == 2
    assert item["manual_first_viewed_at"] is not None
    assert item["manual_last_viewed_at"] is not None

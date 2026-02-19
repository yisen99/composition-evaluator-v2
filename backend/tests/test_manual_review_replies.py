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


def _seed_manual_review(client: TestClient, *, published: bool) -> tuple[str, str, str, str]:
    teacher_token, _ = _login(
        client,
        phone=_phone(f"teacher-reply-{time.time_ns()}"),
        role="teacher",
        display_name="孙老师",
    )
    student_token, _ = _login(
        client,
        phone=_phone(f"student-reply-{time.time_ns()}"),
        role="student",
        display_name="小海",
    )

    class_response = client.post(
        "/api/v1/classes",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={"name": "六年级一班", "grade_band": "primary"},
    )
    assert class_response.status_code == 201
    class_payload = class_response.json()

    assignment_response = client.post(
        "/api/v1/assignments",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "class_id": class_payload["class_id"],
            "title": "雨后的操场",
            "prompt": "描写一场雨后操场上的见闻与感受。",
            "due_at": "2099-01-01T00:00:00Z",
        },
    )
    assert assignment_response.status_code == 201
    assignment_payload = assignment_response.json()

    join_response = client.post(
        "/api/v1/classes/join",
        headers={"Authorization": f"Bearer {student_token}"},
        json={"join_code": class_payload["join_code"], "student_name": "小海"},
    )
    assert join_response.status_code == 200

    submission_response = client.post(
        "/api/v1/submissions",
        headers={"Authorization": f"Bearer {student_token}"},
        data={
            "assignment_id": assignment_payload["assignment_id"],
            "content_type": "text",
            "text_content": "雨停了，操场边的树叶还在滴水，我踩着积水回教室。",
        },
    )
    assert submission_response.status_code == 201
    submission_id = submission_response.json()["submission_id"]

    save_response = client.post(
        "/api/v1/manual-reviews/draft",
        headers={"Authorization": f"Bearer {teacher_token}"},
        json={
            "submission_id": submission_id,
            "structure_score": 85,
            "language_score": 86,
            "value_score": 87,
            "summary_feedback": "叙述清晰，建议增加细节动作。",
            "actionable_suggestions": ["补充一个人物动作。", "结尾加一句反思。"],
        },
    )
    assert save_response.status_code == 200

    if published:
        publish_response = client.post(
            "/api/v1/manual-reviews/publish",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"submission_id": submission_id},
        )
        assert publish_response.status_code == 200

    return teacher_token, student_token, assignment_payload["assignment_id"], submission_id


def test_student_and_teacher_can_exchange_manual_review_replies() -> None:
    with TestClient(app) as client:
        teacher_token, student_token, assignment_id, submission_id = _seed_manual_review(client, published=True)

        student_reply_response = client.post(
            "/api/v1/submissions/me/manual-feedback/replies",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"submission_id": submission_id, "content": "老师好，我会按建议补充动作细节。"},
        )
        assert student_reply_response.status_code == 201
        assert student_reply_response.json()["author_role"] == "student"

        teacher_list_response = client.get(
            f"/api/v1/manual-reviews/submission/{submission_id}/replies",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert teacher_list_response.status_code == 200
        assert len(teacher_list_response.json()) == 1

        queue_after_student_reply = client.get(
            f"/api/v1/assignments/{assignment_id}/grading-queue",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        assert queue_after_student_reply.status_code == 200
        first_queue_item = queue_after_student_reply.json()["items"][0]
        assert first_queue_item["student_reply_count"] == 1
        assert first_queue_item["teacher_reply_count"] == 0
        assert first_queue_item["pending_teacher_reply"] is True
        assert first_queue_item["last_reply_role"] == "student"

        teacher_reply_response = client.post(
            f"/api/v1/manual-reviews/submission/{submission_id}/replies",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"content": "很好，下次重点再练习过渡句。"},
        )
        assert teacher_reply_response.status_code == 201
        assert teacher_reply_response.json()["author_role"] == "teacher"

        student_list_response = client.get(
            f"/api/v1/submissions/me/manual-feedback/replies?submission_id={submission_id}",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        queue_after_teacher_reply = client.get(
            f"/api/v1/assignments/{assignment_id}/grading-queue",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )
        communication_response = client.get(
            f"/api/v1/assignments/{assignment_id}/communication-threads",
            headers={"Authorization": f"Bearer {teacher_token}"},
        )

    assert student_list_response.status_code == 200
    payload = student_list_response.json()
    assert len(payload) == 2
    roles = [item["author_role"] for item in payload]
    assert "student" in roles
    assert "teacher" in roles
    assert queue_after_teacher_reply.status_code == 200
    second_queue_item = queue_after_teacher_reply.json()["items"][0]
    assert second_queue_item["student_reply_count"] == 1
    assert second_queue_item["teacher_reply_count"] == 1
    assert second_queue_item["pending_teacher_reply"] is False
    assert second_queue_item["last_reply_role"] == "teacher"
    assert communication_response.status_code == 200
    communication_payload = communication_response.json()
    assert communication_payload["assignment_id"] == assignment_id
    assert communication_payload["total_students"] == 1
    assert communication_payload["items"][0]["pending_teacher_reply_count"] == 0
    assert communication_payload["items"][0]["student_reply_count"] == 1
    assert communication_payload["items"][0]["teacher_reply_count"] == 1
    assert communication_payload["items"][0]["latest_reply_role"] == "teacher"


def test_student_cannot_reply_before_manual_review_is_published() -> None:
    with TestClient(app) as client:
        _, student_token, _, submission_id = _seed_manual_review(client, published=False)

        student_reply_response = client.post(
            "/api/v1/submissions/me/manual-feedback/replies",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"submission_id": submission_id, "content": "我先试着回复一下。"},
        )

    assert student_reply_response.status_code == 409
    assert student_reply_response.json()["detail"] == "Manual review is not published yet"


def test_student_manual_feedback_contains_unread_teacher_reply_badge() -> None:
    with TestClient(app) as client:
        teacher_token, student_token, _, submission_id = _seed_manual_review(client, published=True)

        teacher_reply_response = client.post(
            f"/api/v1/manual-reviews/submission/{submission_id}/replies",
            headers={"Authorization": f"Bearer {teacher_token}"},
            json={"content": "你先把第二段动作细节补完整。"},
        )
        assert teacher_reply_response.status_code == 201

        unread_feedback_response = client.get(
            "/api/v1/submissions/me/manual-feedback",
            headers={"Authorization": f"Bearer {student_token}"},
        )
        assert unread_feedback_response.status_code == 200
        unread_item = unread_feedback_response.json()[0]
        assert unread_item["has_unread_teacher_reply"] is True
        assert unread_item["unread_teacher_reply_count"] == 1

        mark_read_response = client.post(
            "/api/v1/submissions/me/manual-feedback/mark-read",
            headers={"Authorization": f"Bearer {student_token}"},
            json={"submission_ids": [submission_id]},
        )
        assert mark_read_response.status_code == 200

        read_feedback_response = client.get(
            "/api/v1/submissions/me/manual-feedback",
            headers={"Authorization": f"Bearer {student_token}"},
        )

    assert read_feedback_response.status_code == 200
    read_item = read_feedback_response.json()[0]
    assert read_item["has_unread_teacher_reply"] is False
    assert read_item["unread_teacher_reply_count"] == 0

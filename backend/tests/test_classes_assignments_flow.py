from uuid import uuid4

from fastapi.testclient import TestClient

from app.main import app


def test_teacher_can_create_class_and_receive_join_code() -> None:
    with TestClient(app) as client:
        response = client.post(
            "/api/v1/classes",
            json={
                "teacher_id": str(uuid4()),
                "teacher_name": "王老师",
                "name": "三年级一班",
                "grade_band": "primary",
            },
        )

    assert response.status_code == 201
    payload = response.json()
    assert "class_id" in payload
    assert len(payload["join_code"]) == 6


def test_student_can_join_class_with_join_code() -> None:
    teacher_id = str(uuid4())

    with TestClient(app) as client:
        create_response = client.post(
            "/api/v1/classes",
            json={
                "teacher_id": teacher_id,
                "teacher_name": "张老师",
                "name": "四年级二班",
                "grade_band": "primary",
            },
        )
        class_payload = create_response.json()

        join_response = client.post(
            "/api/v1/classes/join",
            json={
                "join_code": class_payload["join_code"],
                "student_id": str(uuid4()),
                "student_name": "小明",
            },
        )

    assert join_response.status_code == 200
    joined = join_response.json()
    assert joined["class_id"] == class_payload["class_id"]
    assert joined["class_name"] == "四年级二班"


def test_teacher_can_publish_assignment_for_owned_class() -> None:
    teacher_id = str(uuid4())

    with TestClient(app) as client:
        class_response = client.post(
            "/api/v1/classes",
            json={
                "teacher_id": teacher_id,
                "teacher_name": "李老师",
                "name": "五年级三班",
                "grade_band": "primary",
            },
        )
        class_payload = class_response.json()

        assignment_response = client.post(
            "/api/v1/assignments",
            json={
                "class_id": class_payload["class_id"],
                "teacher_id": teacher_id,
                "title": "我的家乡",
                "prompt": "请写一篇介绍家乡景色与人情的作文，600字左右。",
                "due_at": "2026-03-01T23:59:59",
            },
        )

    assert assignment_response.status_code == 201
    assignment_payload = assignment_response.json()
    assert assignment_payload["class_id"] == class_payload["class_id"]
    assert assignment_payload["status"] == "published"

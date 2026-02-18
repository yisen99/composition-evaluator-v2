from fastapi.testclient import TestClient

from app.main import app


def test_send_code_contract() -> None:
    client = TestClient(app)

    response = client.post("/api/v1/auth/send-code", json={"phone": "13800138000", "role_hint": "teacher"})

    assert response.status_code == 200
    payload = response.json()
    assert "request_id" in payload
    assert payload["expires_in"] == 300


def test_login_contract() -> None:
    client = TestClient(app)

    response = client.post("/api/v1/auth/login", json={"phone": "13800138000", "code": "123456"})

    assert response.status_code == 200
    payload = response.json()
    assert "access_token" in payload
    assert "refresh_token" in payload
    assert payload["user"]["phone"] == "13800138000"

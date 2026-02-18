import uuid

from fastapi import APIRouter

from app.schemas.auth import LoginRequest, LoginResponse, SendCodeRequest, SendCodeResponse, UserProfile

router = APIRouter()


@router.post("/send-code", response_model=SendCodeResponse)
def send_code(payload: SendCodeRequest) -> SendCodeResponse:
    _ = payload
    return SendCodeResponse(request_id=str(uuid.uuid4()), expires_in=300)


@router.post("/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    return LoginResponse(
        access_token="mock_access_token",
        refresh_token="mock_refresh_token",
        user=UserProfile(
            id=str(uuid.uuid4()),
            role="teacher",
            phone=payload.phone,
            display_name="Mock User",
        ),
    )

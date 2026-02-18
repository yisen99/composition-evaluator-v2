from pydantic import BaseModel


class SendCodeRequest(BaseModel):
    phone: str
    role_hint: str | None = None


class SendCodeResponse(BaseModel):
    request_id: str
    expires_in: int


class LoginRequest(BaseModel):
    phone: str
    code: str


class UserProfile(BaseModel):
    id: str
    role: str
    phone: str
    display_name: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfile

from typing import Literal

from pydantic import BaseModel

UserRole = Literal["teacher", "student"]


class SendCodeRequest(BaseModel):
    phone: str
    role_hint: UserRole


class SendCodeResponse(BaseModel):
    request_id: str
    expires_in: int


class LoginRequest(BaseModel):
    phone: str
    code: str
    display_name: str | None = None


class UserProfile(BaseModel):
    id: str
    role: UserRole
    phone: str
    display_name: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfile

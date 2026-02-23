from typing import Literal

from pydantic import BaseModel, Field

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


class PasswordLoginRequest(BaseModel):
    email: str
    password: str


class UserProfile(BaseModel):
    id: str
    role: UserRole
    phone: str
    display_name: str


class LoginResponse(BaseModel):
    access_token: str
    refresh_token: str
    user: UserProfile


class RefreshTokenRequest(BaseModel):
    refresh_token: str


class WechatAuthorizeResponse(BaseModel):
    authorization_url: str
    state: str


class WechatAuthPayload(BaseModel):
    role: UserRole
    next_path: str | None = None
    need_bind_phone: bool
    bind_ticket: str | None = None
    bind_expires_in: int | None = None
    wechat_nickname: str | None = None
    wechat_avatar_url: str | None = None
    access_token: str | None = None
    refresh_token: str | None = None
    user: UserProfile | None = None


class WechatBindSendCodeRequest(BaseModel):
    bind_ticket: str = Field(min_length=16, max_length=64)
    phone: str


class WechatBindPhoneRequest(BaseModel):
    bind_ticket: str = Field(min_length=16, max_length=64)
    phone: str
    code: str
    display_name: str | None = None

import uuid
from typing import Literal

from fastapi_users import schemas
from pydantic import ConfigDict

AccountRole = Literal["teacher", "student"]


class AuthAccountRead(schemas.BaseUser[uuid.UUID]):
    role: AccountRole
    display_name: str
    phone: str | None = None


class AuthAccountCreate(schemas.BaseUserCreate):
    role: AccountRole = "student"
    display_name: str
    phone: str | None = None


class AuthAccountUpdate(schemas.BaseUserUpdate):
    model_config = ConfigDict(extra="forbid")
    display_name: str | None = None
    phone: str | None = None

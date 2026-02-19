from fastapi import APIRouter, Depends

from app.auth import current_active_auth_user, to_auth_profile
from app.models import AuthAccount
from app.schemas.account_auth import AuthAccountRead

router = APIRouter()


@router.get("/me", response_model=AuthAccountRead)
async def get_account_me(
    current_user: AuthAccount = Depends(current_active_auth_user),
) -> AuthAccountRead:
    return to_auth_profile(current_user)

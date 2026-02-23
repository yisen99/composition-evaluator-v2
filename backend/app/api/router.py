from fastapi import APIRouter

from app.auth import auth_backend, fastapi_users
from app.api.v1.endpoints.account import router as account_router
from app.api.v1.endpoints.assignments import router as assignments_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.classes import router as classes_router
from app.api.v1.endpoints.health import router as health_router
from app.api.v1.endpoints.manual_reviews import router as manual_reviews_router
from app.api.v1.endpoints.observability import router as observability_router
from app.api.v1.endpoints.reviews import router as reviews_router
from app.api.v1.endpoints.students import router as students_router
from app.api.v1.endpoints.submissions import router as submissions_router
from app.schemas.account_auth import AuthAccountCreate, AuthAccountRead, AuthAccountUpdate

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(
    fastapi_users.get_auth_router(auth_backend),
    prefix="/auth/jwt",
    tags=["auth-account"],
)
api_router.include_router(
    fastapi_users.get_register_router(AuthAccountRead, AuthAccountCreate),
    prefix="/auth",
    tags=["auth-account"],
)
api_router.include_router(
    fastapi_users.get_users_router(AuthAccountRead, AuthAccountUpdate),
    prefix="/auth/users",
    tags=["auth-account"],
)
api_router.include_router(account_router, prefix="/auth", tags=["auth-account"])
api_router.include_router(classes_router, prefix="/classes", tags=["classes"])
api_router.include_router(assignments_router, prefix="/assignments", tags=["assignments"])
api_router.include_router(submissions_router, prefix="/submissions", tags=["submissions"])
api_router.include_router(manual_reviews_router, prefix="/manual-reviews", tags=["manual-reviews"])
api_router.include_router(reviews_router, prefix="/reviews", tags=["reviews"])
api_router.include_router(students_router, prefix="/students", tags=["students"])
api_router.include_router(observability_router, prefix="/observability", tags=["observability"])

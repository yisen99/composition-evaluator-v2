from fastapi import APIRouter

from app.api.v1.endpoints.assignments import router as assignments_router
from app.api.v1.endpoints.auth import router as auth_router
from app.api.v1.endpoints.classes import router as classes_router
from app.api.v1.endpoints.health import router as health_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, prefix="/auth", tags=["auth"])
api_router.include_router(classes_router, prefix="/classes", tags=["classes"])
api_router.include_router(assignments_router, prefix="/assignments", tags=["assignments"])

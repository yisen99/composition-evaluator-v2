import os

from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = "sqlite+pysqlite:///./composition_evaluator.db"
    redis_url: str = "redis://localhost:6379/0"
    jwt_secret: str = "dev-jwt-secret-change-me-please-set-32-plus-chars"
    jwt_algorithm: str = "HS256"
    access_token_expire_minutes: int = 60
    refresh_token_expire_minutes: int = 60 * 24 * 7
    auth_code_expire_seconds: int = 300
    auth_fixed_code: str | None = None
    storage_root: str = "./storage/uploads"
    storage_public_base_url: str = "/storage/uploads"
    submission_max_upload_bytes: int = 10 * 1024 * 1024
    qwen_api_key: str | None = None
    qwen_base_url: str = "https://dashscope.aliyuncs.com/compatible-mode/v1"
    qwen_model: str = "qwen-max"
    qwen_timeout_seconds: int = 30


settings = Settings(
    database_url=os.getenv("DATABASE_URL", "sqlite+pysqlite:///./composition_evaluator.db"),
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
    jwt_secret=os.getenv("JWT_SECRET", "dev-jwt-secret-change-me-please-set-32-plus-chars"),
    jwt_algorithm=os.getenv("JWT_ALGORITHM", "HS256"),
    access_token_expire_minutes=int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60")),
    refresh_token_expire_minutes=int(os.getenv("REFRESH_TOKEN_EXPIRE_MINUTES", str(60 * 24 * 7))),
    auth_code_expire_seconds=int(os.getenv("AUTH_CODE_EXPIRE_SECONDS", "300")),
    auth_fixed_code=os.getenv("AUTH_FIXED_CODE") or None,
    storage_root=os.getenv("STORAGE_ROOT", "./storage/uploads"),
    storage_public_base_url=os.getenv("STORAGE_PUBLIC_BASE_URL", "/storage/uploads"),
    submission_max_upload_bytes=int(os.getenv("SUBMISSION_MAX_UPLOAD_BYTES", str(10 * 1024 * 1024))),
    qwen_api_key=os.getenv("QWEN_API_KEY"),
    qwen_base_url=os.getenv("QWEN_BASE_URL", "https://dashscope.aliyuncs.com/compatible-mode/v1"),
    qwen_model=os.getenv("QWEN_MODEL", "qwen-max"),
    qwen_timeout_seconds=int(os.getenv("QWEN_TIMEOUT_SECONDS", "30")),
)

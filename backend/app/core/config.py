import os

from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = "sqlite+pysqlite:///./composition_evaluator.db"
    redis_url: str = "redis://localhost:6379/0"


settings = Settings(
    database_url=os.getenv("DATABASE_URL", "sqlite+pysqlite:///./composition_evaluator.db"),
    redis_url=os.getenv("REDIS_URL", "redis://localhost:6379/0"),
)

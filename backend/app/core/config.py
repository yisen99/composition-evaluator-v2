from pydantic import BaseModel


class Settings(BaseModel):
    database_url: str = "postgresql+psycopg://postgres:postgres@localhost:5432/composition_evaluator"
    redis_url: str = "redis://localhost:6379/0"


settings = Settings()

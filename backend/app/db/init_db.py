import time

from sqlalchemy.exc import OperationalError

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import engine


def init_db() -> None:
    last_error: Exception | None = None
    for _ in range(15):
        try:
            Base.metadata.create_all(bind=engine)
            return
        except OperationalError as exc:
            last_error = exc
            time.sleep(1)
    if last_error:
        raise last_error

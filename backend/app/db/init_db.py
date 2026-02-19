from pathlib import Path
import time

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.exc import OperationalError

import app.models  # noqa: F401
from app.db.base import Base
from app.db.session import engine

LEGACY_BASELINE_REVISION = "20260218_0001"
LEGACY_BASELINE_TABLES = {"users", "classes", "class_members", "assignments"}


def _make_alembic_config() -> Config:
    backend_root = Path(__file__).resolve().parents[2]
    alembic_cfg = Config(str(backend_root / "alembic.ini"))
    alembic_cfg.set_main_option("script_location", str(backend_root / "alembic"))
    return alembic_cfg


def _get_existing_tables() -> set[str]:
    inspector = inspect(engine)
    return set(inspector.get_table_names())


def _bootstrap_alembic_history_if_needed() -> None:
    tables = _get_existing_tables()
    has_alembic_version = "alembic_version" in tables
    user_tables = tables - {"alembic_version"}
    model_tables = set(Base.metadata.tables.keys())
    missing_tables = model_tables - user_tables

    alembic_cfg = _make_alembic_config()
    if has_alembic_version:
        command.upgrade(alembic_cfg, "head")
        return

    if not user_tables:
        command.upgrade(alembic_cfg, "head")
        return

    if not missing_tables:
        # Existing database was likely created by create_all(); adopt current migration head.
        command.stamp(alembic_cfg, "head")
        return

    if LEGACY_BASELINE_TABLES.issubset(user_tables):
        only_new_tables_missing = missing_tables == (model_tables - LEGACY_BASELINE_TABLES)
        if only_new_tables_missing:
            command.stamp(alembic_cfg, LEGACY_BASELINE_REVISION)
            command.upgrade(alembic_cfg, "head")
            return

    raise RuntimeError(
        "Database schema does not match migration history and cannot be auto-adopted safely. "
        f"Existing tables: {sorted(user_tables)}; missing model tables: {sorted(missing_tables)}"
    )


def init_db() -> None:
    last_error: Exception | None = None
    for _ in range(15):
        try:
            _bootstrap_alembic_history_if_needed()
            return
        except OperationalError as exc:
            last_error = exc
            time.sleep(1)
    if last_error:
        raise last_error

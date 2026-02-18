from pathlib import Path
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles

from app.api.router import api_router
from app.core.config import settings
from app.db.init_db import init_db

@asynccontextmanager
async def lifespan(_: FastAPI):
    init_db()
    yield


app = FastAPI(title="Composition Evaluator API", version="0.1.0", lifespan=lifespan)
app.include_router(api_router, prefix="/api/v1")
storage_root = Path(settings.storage_root)
storage_root.mkdir(parents=True, exist_ok=True)
app.mount(settings.storage_public_base_url, StaticFiles(directory=storage_root), name="storage")

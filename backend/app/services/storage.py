from dataclasses import dataclass
from pathlib import Path
from typing import Protocol
from uuid import uuid4

from fastapi import UploadFile

from app.core.config import settings


@dataclass
class StoredFile:
    file_name: str
    file_url: str
    provider: str


class StorageBackend(Protocol):
    async def save_upload(self, upload_file: UploadFile, *, category: str) -> StoredFile:
        ...


class LocalStorageBackend:
    def __init__(self, root_dir: str, public_base_url: str) -> None:
        self.root_dir = Path(root_dir)
        self.public_base_url = public_base_url.rstrip("/")
        self.root_dir.mkdir(parents=True, exist_ok=True)

    async def save_upload(self, upload_file: UploadFile, *, category: str) -> StoredFile:
        category_dir = self.root_dir / category
        category_dir.mkdir(parents=True, exist_ok=True)

        original_name = upload_file.filename or "file.bin"
        suffix = Path(original_name).suffix
        stored_name = f"{uuid4().hex}{suffix}"
        target_path = category_dir / stored_name

        content = await upload_file.read()
        target_path.write_bytes(content)
        await upload_file.close()

        relative_path = target_path.relative_to(self.root_dir).as_posix()
        file_url = f"{self.public_base_url}/{relative_path}"
        return StoredFile(file_name=original_name, file_url=file_url, provider="local")


_local_backend = LocalStorageBackend(
    root_dir=settings.storage_root,
    public_base_url=settings.storage_public_base_url,
)


def get_storage_backend() -> StorageBackend:
    return _local_backend

import asyncio
import os
from pathlib import Path

from vercel.blob import AsyncBlobClient


BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_DIR = BACKEND_DIR / "uploads" / "bills"
BLOB_FILE_PREFIX = "blob://"


def uses_blob_storage() -> bool:
    return bool(
        os.getenv("VERCEL")
        or os.getenv("BLOB_STORE_ID")
        or os.getenv("BLOB_READ_WRITE_TOKEN")
    )


def bill_file_path(file_path: str) -> Path:
    path = Path(file_path)
    if path.is_absolute():
        return path

    backend_path = BACKEND_DIR / path
    return backend_path if backend_path.exists() else path


async def store_bill_file(
    filename: str,
    content: bytes,
    content_type: str,
) -> str:
    if uses_blob_storage():
        has_oidc_credentials = bool(
            os.getenv("BLOB_STORE_ID") and os.getenv("VERCEL_OIDC_TOKEN")
        )
        if not has_oidc_credentials and not os.getenv("BLOB_READ_WRITE_TOKEN"):
            raise RuntimeError("Vercel Blob credentials are not configured")

        async with AsyncBlobClient() as client:
            result = await client.put(
                f"bills/{filename}",
                content,
                access="private",
                content_type=content_type,
                add_random_suffix=False,
            )
        return f"{BLOB_FILE_PREFIX}{result.pathname}"

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    stored_path = UPLOAD_DIR / filename
    await asyncio.to_thread(stored_path.write_bytes, content)
    return str(stored_path)


async def read_blob_file(file_path: str) -> bytes:
    pathname = file_path.removeprefix(BLOB_FILE_PREFIX)
    async with AsyncBlobClient() as client:
        result = await client.get(pathname, access="private")
    return result.content


async def delete_bill_file(file_path: str) -> None:
    if file_path.startswith(BLOB_FILE_PREFIX):
        pathname = file_path.removeprefix(BLOB_FILE_PREFIX)
        async with AsyncBlobClient() as client:
            await client.delete(pathname)
        return

    path = bill_file_path(file_path)
    await asyncio.to_thread(path.unlink, missing_ok=True)

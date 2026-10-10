from __future__ import annotations

import io
import json
import re
import zipfile
from collections.abc import Callable, Iterator
from contextlib import contextmanager
from typing import Any
from uuid import UUID, uuid4

import httpx
from django.conf import settings
from supabase import ClientOptions, create_client

from apps.accounts.principals import SupabaseUser
from apps.accounts.services.tokens import access_token_for_verified_request
from apps.db.rls import require_rls_context, rls_context
from apps.templates_app.models import Template

BUCKET = "template-files"
MAX_FILE_BYTES = 20 * 1024 * 1024
_MIME_BY_EXTENSION = {
    "json": "application/json",
    "csv": "text/csv",
    "pdf": "application/pdf",
    "xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "xls": "application/vnd.ms-excel",
}
_OBJECT_PATH = re.compile(
    r"^templates/(?P<template>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/"
    r"(?P<object>[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(json|csv|pdf|xlsx|xls)$",
    re.IGNORECASE,
)


class StorageServiceError(RuntimeError):
    def __init__(self, message: str, *, cleanup_path: str | None = None) -> None:
        super().__init__(message)
        self.cleanup_path = cleanup_path


@contextmanager
def _bucket(access_token: str) -> Iterator[Any]:
    if not settings.SUPABASE_URL or not settings.SUPABASE_PUBLISHABLE_KEY:
        raise StorageServiceError("Supabase Storage is not configured.")
    http_client = httpx.Client(timeout=httpx.Timeout(15.0))
    options = ClientOptions(
        headers={"Authorization": f"Bearer {access_token}"},
        auto_refresh_token=False,
        persist_session=False,
        storage_client_timeout=15,
        httpx_client=http_client,
    )
    try:
        try:
            bucket = create_client(
                settings.SUPABASE_URL, settings.SUPABASE_PUBLISHABLE_KEY, options
            ).storage.from_(BUCKET)
        except Exception as error:
            raise StorageServiceError("Supabase Storage client could not be created.") from error
        yield bucket
    finally:
        http_client.close()


def _storage_request(access_token: str, action: Callable[[Any], Any]) -> Any:
    with _bucket(access_token) as bucket:
        try:
            return action(bucket)
        except Exception as error:
            raise StorageServiceError("Supabase Storage request failed.") from error


def _file_details(upload: Any) -> tuple[bytes, str]:
    filename = getattr(upload, "name", "")
    extension = (
        filename.rsplit(".", 1)[-1].lower() if isinstance(filename, str) and "." in filename else ""
    )
    content_type = _MIME_BY_EXTENSION.get(extension)
    if content_type is None:
        raise ValueError("Template files must be JSON, CSV, PDF, XLS, or XLSX.")
    content = upload.read(MAX_FILE_BYTES + 1)
    if not isinstance(content, bytes) or not content or len(content) > MAX_FILE_BYTES:
        raise ValueError("Template file is empty or exceeds 20 MiB.")
    if extension == "pdf" and not content.startswith(b"%PDF-"):
        raise ValueError("File contents do not match PDF format.")
    if extension == "json":
        try:
            json.loads(content)
        except (UnicodeDecodeError, json.JSONDecodeError) as error:
            raise ValueError("File contents do not match JSON format.") from error
    if extension == "csv":
        try:
            content.decode("utf-8-sig")
        except UnicodeDecodeError as error:
            raise ValueError("CSV files must use UTF-8 text.") from error
    if extension == "xlsx":
        try:
            with zipfile.ZipFile(io.BytesIO(content)) as archive:
                if (
                    "[Content_Types].xml" not in archive.namelist()
                    or "xl/workbook.xml" not in archive.namelist()
                ):
                    raise ValueError("File contents do not match XLSX format.")
        except zipfile.BadZipFile as error:
            raise ValueError("File contents do not match XLSX format.") from error
    if extension == "xls" and not content.startswith(bytes.fromhex("D0CF11E0A1B11AE1")):
        raise ValueError("File contents do not match XLS format.")
    return content, content_type


def _validated_path(path: str, template_id: UUID) -> str:
    match = _OBJECT_PATH.fullmatch(path)
    if match is None or UUID(match.group("template")) != template_id:
        raise ValueError("Invalid template file reference.")
    return path


def upload_template_file(
    request: Any, user: SupabaseUser, template_id: UUID, upload: Any
) -> dict[str, Any]:
    content, content_type = _file_details(upload)
    extension = upload.name.rsplit(".", 1)[-1].lower()
    token = access_token_for_verified_request(request, user)
    with rls_context(user):
        require_rls_context()
        template = (
            Template.objects.using("supabase").filter(id=template_id, created_by=user.id).first()
        )
        if template is None:
            raise ValueError("Template is not available for file upload.")
        old_path = template.uploaded_file
        path = f"templates/{template_id}/{uuid4()}.{extension}"
    _storage_request(
        token,
        lambda bucket: bucket.upload(
            path, content, {"content-type": content_type, "upsert": "false"}
        ),
    )
    try:
        # Upload first, then commit the exact old-reference replacement. If the
        # database write or transaction commit fails, remove only this new object.
        with rls_context(user):
            require_rls_context()
            updated = (
                Template.objects.using("supabase")
                .filter(id=template_id, created_by=user.id, uploaded_file=old_path)
                .update(uploaded_file=path)
            )
            if updated != 1:
                raise ValueError("Template file changed before the new upload could be saved.")
    except Exception as error:
        try:
            _storage_request(token, lambda bucket: bucket.remove([path]))
        except StorageServiceError as cleanup_error:
            raise StorageServiceError(
                "The file reference was not saved; the new object needs cleanup.",
                cleanup_path=path,
            ) from cleanup_error
        raise error

    cleanup_pending = False
    cleanup_path = None
    if old_path:
        try:
            old_path = _validated_path(old_path, template_id)
        except ValueError:
            cleanup_pending = True
        else:
            try:
                _storage_request(token, lambda bucket: bucket.remove([old_path]))
            except StorageServiceError:
                cleanup_pending = True
                cleanup_path = old_path
    return {
        "path": path,
        "content_type": content_type,
        "cleanup_pending": cleanup_pending,
        "cleanup_path": cleanup_path,
    }


def download_template_file(
    request: Any, user: SupabaseUser, template_id: UUID
) -> tuple[bytes, str, str]:
    token = access_token_for_verified_request(request, user)
    with rls_context(user):
        require_rls_context()
        template = Template.objects.using("supabase").filter(id=template_id).first()
        if template is None or not template.uploaded_file:
            raise ValueError("Template file is not available.")
        path = _validated_path(template.uploaded_file, template_id)
        extension = path.rsplit(".", 1)[-1].lower()
        # Storage's CDN may retain this private response for the same user
        # after a share is revoked. A fresh key forces each read through RLS.
        data = _storage_request(
            token,
            lambda bucket: bucket.download(
                path, query_params={"cacheNonce": uuid4().hex}
            ),
        )
        if not isinstance(data, bytes):
            raise StorageServiceError("Storage returned an invalid file response.")
        return data, _MIME_BY_EXTENSION[extension], f"template.{extension}"


def delete_template_file(request: Any, user: SupabaseUser, template_id: UUID) -> bool:
    token = access_token_for_verified_request(request, user)
    with rls_context(user):
        require_rls_context()
        template = (
            Template.objects.using("supabase").filter(id=template_id, created_by=user.id).first()
        )
        if template is None or not template.uploaded_file:
            return False
        path = _validated_path(template.uploaded_file, template_id)
    # Remove the reference and commit before Storage deletion. A Storage outage
    # can then leave only an unreferenced private object, never a broken DB link.
    with rls_context(user):
        require_rls_context()
        updated = (
            Template.objects.using("supabase")
            .filter(id=template_id, created_by=user.id, uploaded_file=path)
            .update(uploaded_file=None)
        )
        if updated != 1:
            return False
    try:
        _storage_request(token, lambda bucket: bucket.remove([path]))
    except StorageServiceError as error:
        raise StorageServiceError(
            "The file reference was cleared; its private object needs cleanup.",
            cleanup_path=path,
        ) from error
    return True

from collections.abc import Iterator
from contextlib import contextmanager
from dataclasses import dataclass
from ipaddress import ip_address
from math import isfinite
from time import time
from typing import Any
from urllib.parse import urlsplit
from uuid import UUID

import httpx
import jwt
from django.conf import settings
from pydantic import ValidationError
from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions
from supabase_auth.errors import AuthError


class AuthServiceError(RuntimeError):
    def __init__(self, message: str, *, kind: str = "unavailable") -> None:
        super().__init__(message)
        self.kind = kind


@dataclass(frozen=True)
class AuthTokens:
    subject: str
    email: str | None
    user_metadata: dict[str, Any]
    access_token: str
    refresh_token: str
    expires_at: int


def _project_url(path: str) -> str:
    configured = settings.SUPABASE_URL.rstrip("/")
    try:
        parsed = urlsplit(configured)
        host = parsed.hostname or ""
    except ValueError as error:
        raise AuthServiceError("Authentication provider origin is invalid.") from error
    try:
        local_host = ip_address(host).is_loopback
    except ValueError:
        local_host = host.lower() == "localhost"
    if (
        not host
        or parsed.username
        or parsed.password
        or parsed.path not in {"", "/"}
        or parsed.query
        or parsed.fragment
        or (parsed.scheme != "https" and not (parsed.scheme == "http" and local_host))
    ):
        raise AuthServiceError("Authentication provider origin is invalid.")
    base = f"{parsed.scheme}://{parsed.netloc}"
    if not base or not settings.SUPABASE_PUBLISHABLE_KEY.startswith("sb_publishable_"):
        raise AuthServiceError("Authentication is not configured.")
    return f"{base}/auth/v1/{path.lstrip('/')}"


def _parse_user(payload: object) -> tuple[str, str | None, dict[str, Any]]:
    if not isinstance(payload, dict):
        raise AuthServiceError("Authentication returned an invalid response.")
    user = payload.get("user", payload)
    if not isinstance(user, dict):
        raise AuthServiceError("Authentication returned an invalid response.")
    subject = user.get("id")
    try:
        normalized_subject = str(UUID(subject)) if isinstance(subject, str) else ""
    except ValueError:
        normalized_subject = ""
    email = user.get("email")
    metadata = user.get("user_metadata", {})
    if not normalized_subject or (email is not None and not isinstance(email, str)):
        raise AuthServiceError("Authentication returned an invalid identity.")
    if not isinstance(metadata, dict):
        metadata = {}
    return normalized_subject, email, metadata


def parse_tokens(payload: object) -> AuthTokens:
    if not isinstance(payload, dict):
        raise AuthServiceError("Authentication returned an invalid session.")
    subject, email, metadata = _parse_user(payload)
    access = payload.get("access_token")
    refresh = payload.get("refresh_token")
    expires_in = payload.get("expires_in")
    if not isinstance(access, str) or not access or not isinstance(refresh, str) or not refresh:
        raise AuthServiceError("Authentication returned an invalid session.")
    if (
        isinstance(expires_in, bool)
        or not isinstance(expires_in, (int, float))
        or not isfinite(expires_in)
        or expires_in <= 0
    ):
        raise AuthServiceError("Authentication returned an invalid session.")
    return AuthTokens(
        subject=subject,
        email=email,
        user_metadata=metadata,
        access_token=access,
        refresh_token=refresh,
        expires_at=int(time() + expires_in),
    )


class GoTrueClient:
    """Supabase Python SDK boundary; a fresh client per operation, no shared identity."""

    def __init__(self, *, transport: httpx.BaseTransport | None = None) -> None:
        self.transport = transport

    @contextmanager
    def sdk(self) -> Iterator[Client]:
        _project_url("")
        timeout = settings.AUTH_TIMEOUT_SECONDS
        if not isfinite(timeout) or timeout <= 0:
            raise AuthServiceError("Authentication timeout is not configured.")
        try:
            with httpx.Client(
                timeout=timeout,
                follow_redirects=False,
                transport=self.transport,
            ) as http_client:
                yield create_client(
                    settings.SUPABASE_URL.rstrip("/"),
                    settings.SUPABASE_PUBLISHABLE_KEY,
                    options=SyncClientOptions(
                        persist_session=False,
                        auto_refresh_token=False,
                        httpx_client=http_client,
                    ),
                )
        except AuthError as error:
            status = getattr(error, "status", 0)
            kind = "unavailable"
            if status in {400, 401, 403, 404, 422}:
                kind = "invalid"
            elif status == 429:
                kind = "rate_limited"
            raise AuthServiceError("Authentication request failed.", kind=kind) from error
        except (
            httpx.HTTPError,
            ValidationError,
            ValueError,
            IndexError,
            jwt.InvalidTokenError,
        ) as error:
            raise AuthServiceError("Authentication service is unavailable.") from error

    def sign_in(self, email: str, password: str) -> AuthTokens:
        with self.sdk() as client:
            result = client.auth.sign_in_with_password({"email": email, "password": password})
            return parse_tokens(result.session.model_dump() if result.session else None)

    def sign_up(self, email: str, password: str, metadata: dict[str, str]) -> object:
        with self.sdk() as client:
            result = client.auth.sign_up(
                {"email": email, "password": password, "options": {"data": metadata}}
            )
            if result.session:
                return result.session.model_dump()
            return {"user": result.user.model_dump() if result.user else None}

    def update_password(self, password: str, access_token: str, refresh_token: str) -> None:
        with self.sdk() as client:
            # Django already serialized refresh and verified this session. Do not let
            # set_session refresh outside that lock if the JWT expires in the meantime.
            claims = jwt.decode(access_token, options={"verify_signature": False})
            if claims.get("exp", 0) <= time() + 90:
                raise AuthServiceError("Session must be refreshed before updating the password.")
            client.auth.set_session(access_token, refresh_token)
            client.auth.update_user({"password": password})

    def refresh(self, refresh_token: str) -> AuthTokens:
        with self.sdk() as client:
            result = client.auth.refresh_session(refresh_token)
            return parse_tokens(result.session.model_dump() if result.session else None)

    def get_user(self, access_token: str) -> tuple[str, str | None, dict[str, Any]]:
        with self.sdk() as client:
            result = client.auth.get_user(access_token)
            return _parse_user(result.user.model_dump() if result else None)

    def sign_out_local(self, access_token: str) -> None:
        with self.sdk() as client:
            # SDK documents this for revoking a supplied USER JWT; no admin key is used.
            client.auth.admin.sign_out(access_token, "local")

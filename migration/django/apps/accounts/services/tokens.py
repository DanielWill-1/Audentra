from copy import deepcopy
from datetime import UTC, datetime
from time import time
from typing import Any, cast

from django.contrib.sessions.models import Session
from django.db import router, transaction
from django.http import HttpRequest

from apps.accounts.principals import SupabaseUser
from apps.accounts.services.gotrue import AuthServiceError, AuthTokens, GoTrueClient

AUTH_SESSION_KEY = "_accounts"
ABSOLUTE_SECONDS = 14 * 24 * 60 * 60
REFRESH_WINDOW_SECONDS = 90


def _principal(subject: str, email: str | None, metadata: dict[str, Any]) -> SupabaseUser:
    from uuid import UUID

    user = SupabaseUser(UUID(subject), email, deepcopy(metadata))
    object.__setattr__(user, "_verified", True)
    return user


def install_tokens(request: HttpRequest, tokens: AuthTokens, *, remember_me: bool) -> None:
    now = int(time())
    request.session.flush()
    request.session[AUTH_SESSION_KEY] = {
        "version": 1,
        "subject": tokens.subject,
        "email": tokens.email,
        "user_metadata": tokens.user_metadata,
        "access_token": tokens.access_token,
        "refresh_token": tokens.refresh_token,
        "access_expires_at": tokens.expires_at,
        "absolute_expires_at": now + ABSOLUTE_SECONDS,
        "remember_me": bool(remember_me),
        "generation": 1,
    }
    request.session.set_expiry(ABSOLUTE_SECONDS)


def _canonical_session(request: HttpRequest) -> tuple[dict[str, Any], Session] | None:
    key = request.session.session_key
    if not key:
        return None
    using = router.db_for_write(Session)
    row = Session.objects.using(using).select_for_update().filter(session_key=key).first()
    if row is None:
        return None
    store = request.session.__class__(session_key=key)
    return store.decode(row.session_data), row


def _write_canonical(
    request: HttpRequest, row: Session, data: dict[str, Any], absolute_expires_at: int
) -> None:
    store = request.session.__class__(session_key=row.session_key)
    row.session_data = store.encode(data)
    row.expire_date = datetime.fromtimestamp(absolute_expires_at, tz=UTC)
    row.save(update_fields=("session_data", "expire_date"))
    cast(Any, request.session)._session_cache = data
    request.session.modified = False


def clear_session(request: HttpRequest) -> None:
    key = request.session.session_key
    if key:
        using = router.db_for_write(Session)
        with transaction.atomic(using=using):
            Session.objects.using(using).select_for_update().filter(session_key=key).delete()
    cast(Any, request.session)._session_key = None
    cast(Any, request.session)._session_cache = {}
    request.session.modified = True


def authenticate_session(
    request: HttpRequest, *, client: GoTrueClient | None = None
) -> SupabaseUser | None:
    data = request.session.get(AUTH_SESSION_KEY)
    if not isinstance(data, dict):
        return None
    now = int(time())
    expected_subject = data.get("subject")
    absolute_expiry = data.get("absolute_expires_at")
    access = data.get("access_token")
    refresh = data.get("refresh_token")
    access_expiry = data.get("access_expires_at")
    if (
        not isinstance(expected_subject, str)
        or not isinstance(absolute_expiry, int)
        or absolute_expiry <= now
        or not isinstance(access, str)
        or not isinstance(refresh, str)
        or not isinstance(access_expiry, int)
    ):
        clear_session(request)
        return None

    auth_client = client or GoTrueClient()
    if access_expiry <= now + REFRESH_WINDOW_SECONDS:
        key = request.session.session_key
        if not key:
            clear_session(request)
            return None
        using = router.db_for_write(Session)
        with transaction.atomic(using=using):
            canonical = _canonical_session(request)
            if canonical is None:
                clear_session(request)
                return None
            canonical_data, row = canonical
            current = canonical_data.get(AUTH_SESSION_KEY)
            if not isinstance(current, dict) or current.get("absolute_expires_at", 0) <= now:
                row.delete(using=using)
                clear_session(request)
                return None
            if current.get("subject") != expected_subject:
                clear_session(request)
                return None
            if current.get("access_expires_at", 0) <= now + REFRESH_WINDOW_SECONDS:
                try:
                    updated = auth_client.refresh(current["refresh_token"])
                except AuthServiceError as error:
                    if error.kind == "invalid":
                        row.delete(using=using)
                        clear_session(request)
                        return None
                    raise
                if updated.subject != expected_subject:
                    row.delete(using=using)
                    clear_session(request)
                    return None
                current.update(
                    {
                        "email": updated.email,
                        "user_metadata": updated.user_metadata,
                        "access_token": updated.access_token,
                        "refresh_token": updated.refresh_token,
                        "access_expires_at": updated.expires_at,
                        "generation": int(current.get("generation", 0)) + 1,
                    }
                )
                canonical_data[AUTH_SESSION_KEY] = current
                _write_canonical(request, row, canonical_data, absolute_expiry)
            else:
                cast(Any, request.session)._session_cache = canonical_data
                request.session.modified = False
            data = request.session.get(AUTH_SESSION_KEY, {})
            access = data.get("access_token")

    if not isinstance(access, str):
        clear_session(request)
        return None
    try:
        subject, email, metadata = auth_client.get_user(access)
    except AuthServiceError as error:
        if error.kind == "invalid":
            clear_session(request)
            return None
        raise
    if subject != expected_subject:
        clear_session(request)
        return None
    return _principal(subject, email, metadata)


def access_token_for_verified_request(request: HttpRequest, expected_user: SupabaseUser) -> str:
    """Return a server-session token only after rechecking its subject with Supabase Auth."""
    principal = authenticate_session(request)
    if principal is None or principal.id != expected_user.id:
        raise AuthServiceError(
            "Authentication is required for this file operation.", kind="invalid"
        )
    data = request.session.get(AUTH_SESSION_KEY)
    if not isinstance(data, dict) or data.get("subject") != str(expected_user.id):
        raise AuthServiceError(
            "Authentication is required for this file operation.", kind="invalid"
        )
    token = data.get("access_token")
    if not isinstance(token, str) or not token:
        raise AuthServiceError(
            "Authentication is required for this file operation.", kind="invalid"
        )
    return token


def logout_session(request: HttpRequest, *, client: GoTrueClient | None = None) -> bool:
    key = request.session.session_key
    if not key:
        clear_session(request)
        return False
    using = router.db_for_write(Session)
    remote_failed = False
    with transaction.atomic(using=using):
        row = Session.objects.using(using).select_for_update().filter(session_key=key).first()
        if row is not None:
            canonical = request.session.__class__(session_key=key).decode(row.session_data)
            auth_data = canonical.get(AUTH_SESSION_KEY)
            if isinstance(auth_data, dict) and isinstance(auth_data.get("access_token"), str):
                try:
                    (client or GoTrueClient()).sign_out_local(auth_data["access_token"])
                except AuthServiceError:
                    remote_failed = True
            row.delete(using=using)
    cast(Any, request.session)._session_key = None
    cast(Any, request.session)._session_cache = {}
    request.session.modified = True
    return remote_failed

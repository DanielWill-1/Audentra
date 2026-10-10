from collections import defaultdict, deque
from threading import Lock
from time import monotonic

from django.conf import settings

_requests: dict[str, deque[float]] = defaultdict(deque)
_lock = Lock()


def allow_request(client_key: str, *, now: float | None = None) -> bool:
    """Bound local per-client traffic without trusting forwarded IP headers."""
    current = monotonic() if now is None else now
    cutoff = current - settings.P3_RATE_LIMIT_WINDOW_SECONDS
    with _lock:
        requests = _requests.get(client_key)
        if requests is None:
            if len(_requests) >= 1024:
                for stale_key in tuple(_requests):
                    if not _requests[stale_key] or _requests[stale_key][0] <= cutoff:
                        _requests.pop(stale_key, None)
                if len(_requests) >= 1024:
                    return False
            requests = _requests[client_key]
        while requests and requests[0] <= cutoff:
            requests.popleft()
        if len(requests) >= settings.P3_RATE_LIMIT_REQUESTS:
            return False
        requests.append(current)
        return True


def clear_rate_limits() -> None:
    """Clear local limiter state for deterministic unit tests."""
    with _lock:
        _requests.clear()

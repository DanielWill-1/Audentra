import os
from pathlib import Path
from urllib.parse import parse_qs, unquote, urlsplit

from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parents[2]
load_dotenv(BASE_DIR / ".env", override=False)

SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "development-only-change-me")
DEBUG = False
ALLOWED_HOSTS = [
    host.strip()
    for host in os.getenv("DJANGO_ALLOWED_HOSTS", "127.0.0.1,localhost").split(",")
    if host.strip()
]

INSTALLED_APPS = [
    "django.contrib.sessions",
    "django.contrib.staticfiles",
    "apps.core.apps.CoreConfig",
    "apps.accounts.apps.AccountsConfig",
    "apps.pages.apps.PagesConfig",
    "apps.application.apps.ApplicationConfig",
    "apps.templates_app.apps.TemplatesAppConfig",
    "apps.scheduler.apps.SchedulerConfig",
    "apps.voice",
]

MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "apps.accounts.middleware.SessionCookiePolicyMiddleware",
    "apps.accounts.middleware.SafeSessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "apps.accounts.middleware.SupabasePrincipalMiddleware",
    "apps.api.middleware.ServiceCsrfMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "config.urls"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {"context_processors": ["django.template.context_processors.request"]},
    }
]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"


def _database_from_url(url: str, schema: str) -> dict[str, object]:
    parsed = urlsplit(url)
    if parsed.scheme not in {"postgres", "postgresql"} or not parsed.hostname:
        raise ValueError("Database URL must be a PostgreSQL URL with a host.")

    query = parse_qs(parsed.query)
    pooler_transaction = (
        (parsed.hostname or "").endswith(".pooler.supabase.com") and parsed.port == 6543
    )
    options: dict[str, object] = {
        "sslmode": query.get("sslmode", ["require"])[0],
        "connect_timeout": 5,
        "application_name": f"voiceform-django-{schema}",
    }
    if pooler_transaction:
        options["prepare_threshold"] = None
    else:
        options["options"] = f"-c search_path={schema}"
    return {
        "ENGINE": "django.db.backends.postgresql",
        "NAME": unquote(parsed.path.lstrip("/")) or "postgres",
        "USER": unquote(parsed.username or ""),
        "PASSWORD": unquote(parsed.password or ""),
        "HOST": parsed.hostname,
        "PORT": str(parsed.port or 5432),
        "CONN_MAX_AGE": 0,
        "CONN_HEALTH_CHECKS": True,
        "DISABLE_SERVER_SIDE_CURSORS": True,
        "OPTIONS": options,
    }


def _local_database() -> dict[str, object]:
    return {"ENGINE": "django.db.backends.sqlite3", "NAME": ":memory:"}


default_url = os.getenv("DJANGO_DATABASE_URL", "").strip()
supabase_url = os.getenv("DJANGO_SUPABASE_DATABASE_URL", "").strip()
if default_url or supabase_url:
    if not default_url or not supabase_url:
        raise ValueError("Set both restricted PostgreSQL URLs, or neither for offline checks.")
    DATABASES = {
        "default": _database_from_url(default_url, "django"),
        "supabase": _database_from_url(supabase_url, "public"),
    }
else:
    DATABASES = {"default": _local_database(), "supabase": _local_database()}

DATABASE_ROUTERS = ["apps.db.router.DjangoStateRouter"]
SESSION_ENGINE = "apps.accounts.sessions"
SESSION_COOKIE_NAME = "audentra_session"
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 14 * 24 * 60 * 60
CSRF_COOKIE_SAMESITE = "Lax"

LANGUAGE_CODE = "en-us"
TIME_ZONE = "UTC"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = Path(os.getenv("DJANGO_STATIC_ROOT", str(BASE_DIR / "staticfiles")))
STATICFILES_DIRS = [BASE_DIR / "static"]
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

P3_SERVICES_ENABLED = os.getenv("P3_SERVICES_ENABLED", "false").lower() == "true"
P3_API_MARKER = os.getenv("INTERNAL_API_TOKEN", "voiceform-p3")
P3_ALLOWED_ORIGINS = [
    origin.strip().rstrip("/")
    for origin in os.getenv(
        "P3_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173",
    ).split(",")
    if origin.strip()
]
DJANGO_PUBLIC_ORIGIN = os.getenv("DJANGO_PUBLIC_ORIGIN", "http://127.0.0.1:8000").rstrip("/")
P3_ALLOWED_ORIGINS = list(dict.fromkeys([*P3_ALLOWED_ORIGINS, DJANGO_PUBLIC_ORIGIN]))
P3_RATE_LIMIT_REQUESTS = 30
P3_RATE_LIMIT_WINDOW_SECONDS = 60
P3_MAX_REQUEST_BYTES = 20 * 1024 * 1024
P3_MAX_BASE64_CHARS = 10 * 1024 * 1024
P3_MAX_AUDIO_BYTES = P3_MAX_BASE64_CHARS * 3 // 4
DATA_UPLOAD_MAX_MEMORY_SIZE = P3_MAX_REQUEST_BYTES
FILE_UPLOAD_MAX_MEMORY_SIZE = 2_621_440
DATA_UPLOAD_MAX_NUMBER_FIELDS = 1000
P3_PROVIDER_TIMEOUT_SECONDS = float(os.getenv("P3_PROVIDER_TIMEOUT_SECONDS", "15"))

# The P6 bridge stays opt-in even when a local legacy origin is configured.
# It forwards only routes and assets listed in the reviewed P6 inventories.
P6_LEGACY_FALLBACK_ENABLED = os.getenv("P6_LEGACY_FALLBACK_ENABLED", "false").lower() == "true"
P6_LEGACY_ORIGIN = os.getenv("P6_LEGACY_ORIGIN", "").strip()
P7_LEGACY_ROLLBACK_ROUTES = frozenset(
    route.strip()
    for route in os.getenv("P7_LEGACY_ROLLBACK_ROUTES", "").split(",")
    if route.strip()
)
P7_PUBLIC_SESSION_ROUTES = frozenset(
    {
        "/",
        "/features",
        "/industries",
        "/security",
        "/pricing",
        "/about",
        "/contact",
        "/status",
        "/help-center",
        "/documentation",
        "/terms",
        "/privacy",
        "/open",
    }
)
P7_PROTECTED_PATHS = frozenset(
    {
        "/dashboard",
        "/templates",
        "/scheduler",
        "/manage-schedules",
        "/scheduler-settings",
        "/filledtemplates",
        "/AIVoiceAutoFill",
        "/activitylog",
    }
)
P6_PREVIEW_ENABLED = os.getenv("P6_PREVIEW_ENABLED", "false").lower() == "true"
P6_ASSET_INVENTORY = BASE_DIR / "config" / "p6_legacy_assets.json"
P6_ROUTE_OWNERSHIP = BASE_DIR / "config" / "p6_route_ownership.json"

SPEECH_BACKEND = os.getenv("SPEECH_BACKEND", "mock").lower()
TTS_BACKEND = os.getenv("TTS_BACKEND", "mock").lower()
USE_MOCK_AI = os.getenv("USE_MOCK_AI", "true").lower() == "true"
GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_API_URL = os.getenv("GROQ_API_URL", "https://api.groq.com/openai/v1/chat/completions")
GROQ_MODEL = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_PUBLISHABLE_KEY = os.getenv("SUPABASE_PUBLISHABLE_KEY", "")
AUTH_TIMEOUT_SECONDS = float(os.getenv("AUTH_TIMEOUT_SECONDS", "8"))
GOOGLE_APPLICATION_CREDENTIALS = os.getenv("GOOGLE_APPLICATION_CREDENTIALS", "")

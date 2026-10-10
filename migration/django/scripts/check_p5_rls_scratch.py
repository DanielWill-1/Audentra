"""Exercise the Django RLS context on the explicitly isolated native scratch database."""

import os
from urllib.parse import urlsplit
from uuid import UUID

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings.dev")

import django
from django.conf import settings


def main() -> None:
    django.setup()
    from apps.accounts.principals import SupabaseUser
    from apps.accounts.services.tokens import _principal
    from apps.db.rls import RlsContextError, rls_context
    from apps.templates_app.models import Template
    from apps.templates_app.selectors import get_template
    from apps.templates_app.services import create_template, delete_template
    from django.db import connections

    url = urlsplit(os.environ.get("DJANGO_SUPABASE_DATABASE_URL", ""))
    if (
        url.hostname not in {"127.0.0.1", "localhost", "::1"}
        or url.port != 49518
        or url.path != "/p5_rls"
    ):
        raise SystemExit(
            "Refusing to run unless the configured data alias is the P5 native scratch database."
        )
    if settings.DATABASES["supabase"]["USER"] != "django_data":
        raise SystemExit("The scratch data alias must use django_data.")

    user_a = _principal("11111111-1111-4111-8111-111111111111", None, {})
    user_b = _principal("22222222-2222-4222-8222-222222222222", None, {})
    unverified = SupabaseUser(UUID("11111111-1111-4111-8111-111111111111"), None, {})

    try:
        Template.objects.using("supabase").count()
    except RlsContextError:
        pass
    else:
        raise AssertionError("Out-of-context ORM query was not rejected.")

    try:
        with rls_context(unverified):
            pass
    except RlsContextError:
        pass
    else:
        raise AssertionError("An unverified principal opened an RLS context.")

    def assert_identity(user: SupabaseUser) -> None:
        with rls_context(user):
            with connections["supabase"].cursor() as cursor:
                cursor.execute("SELECT current_user, auth.uid()")
                current_role, actual_id = cursor.fetchone()
            if current_role != "authenticated" or actual_id != user.id:
                raise AssertionError("The transaction role or Auth subject is incorrect.")
            Template.objects.using("supabase").count()
            with rls_context(user):
                Template.objects.using("supabase").count()

    assert_identity(user_a)
    created = create_template(
        user_a,
        {
            "name": "P5 Django INSERT RETURNING probe",
            "category": "education",
            "description": "Synthetic local regression check",
            "form_data": {"fields": []},
            "visibility": "visible",
        },
    )
    created_id = UUID(str(created["id"]))
    if get_template(user_a, created_id) is None:
        raise AssertionError("Owner could not read the newly inserted template.")
    if not delete_template(user_a, created_id):
        raise AssertionError("Owner could not delete the inserted template regression row.")
    try:
        with rls_context(user_a):
            with rls_context(user_b):
                pass
    except RlsContextError:
        pass
    else:
        raise AssertionError("Nested RLS context allowed a user switch.")

    try:
        with rls_context(user_a):
            raise RuntimeError("rollback probe")
    except RuntimeError as error:
        if str(error) != "rollback probe":
            raise
    assert_identity(user_b)

    print(
        "P5 Django RLS scratch verification passed: guard, verified identity, nested context, "
        "user switch, rollback."
    )


if __name__ == "__main__":
    main()

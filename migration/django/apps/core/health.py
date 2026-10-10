from collections.abc import Mapping

from django.db import connections

from apps.db.rls import _allow_fixed_metadata_query


class DatabaseBoundaryError(RuntimeError):
    pass


_HEALTH_SQL = """
SELECT current_user,
       current_schema(),
       role.rolsuper,
       role.rolcreatedb,
       role.rolcreaterole,
       role.rolinherit,
       role.rolbypassrls,
       role.rolcanlogin,
       has_database_privilege(current_user, current_database(), 'CONNECT'),
       has_schema_privilege(current_user, 'django', 'USAGE'),
       has_schema_privilege(current_user, 'django', 'CREATE'),
       has_schema_privilege(current_user, 'public', 'USAGE'),
       has_schema_privilege(current_user, 'public', 'CREATE'),
       NOT EXISTS (
           SELECT 1
           FROM pg_class AS item
           JOIN pg_namespace AS namespace ON namespace.oid = item.relnamespace
           WHERE namespace.nspname = 'public'
             AND item.relkind IN ('r', 'p', 'v', 'm', 'f')
             AND (
                 has_table_privilege(current_user, item.oid, 'SELECT') OR
                 has_table_privilege(current_user, item.oid, 'INSERT') OR
                 has_table_privilege(current_user, item.oid, 'UPDATE') OR
                 has_table_privilege(current_user, item.oid, 'DELETE') OR
                 has_table_privilege(current_user, item.oid, 'TRUNCATE')
             )
       ),
       NOT EXISTS (
           SELECT 1
           FROM pg_class AS item
           JOIN pg_namespace AS namespace ON namespace.oid = item.relnamespace
           WHERE namespace.nspname = 'django'
             AND item.relname IN ('django_session', 'django_migrations')
             AND (
                 has_table_privilege(current_user, item.oid, 'SELECT') OR
                 has_table_privilege(current_user, item.oid, 'INSERT') OR
                 has_table_privilege(current_user, item.oid, 'UPDATE') OR
                 has_table_privilege(current_user, item.oid, 'DELETE') OR
                 has_table_privilege(current_user, item.oid, 'TRUNCATE')
             )
       ),
       EXISTS (
           SELECT 1 FROM pg_class AS item
           JOIN pg_namespace AS namespace ON namespace.oid = item.relnamespace
           WHERE namespace.nspname = 'django' AND item.relname = 'django_session'
       ),
       EXISTS (
           SELECT 1 FROM pg_class AS item
           JOIN pg_namespace AS namespace ON namespace.oid = item.relnamespace
           WHERE namespace.nspname = 'django' AND item.relname = 'django_migrations'
       ),
       (
           (role.rolname = 'django_data'
            AND EXISTS (
                SELECT 1 FROM pg_auth_members membership
                JOIN pg_roles parent ON parent.oid = membership.roleid
                WHERE membership.member = role.oid AND parent.rolname = 'authenticated'
                  AND NOT membership.admin_option
                  AND NOT membership.inherit_option
                  AND membership.set_option
            )
            AND NOT EXISTS (
                SELECT 1 FROM pg_auth_members membership
                JOIN pg_roles parent ON parent.oid = membership.roleid
                WHERE membership.member = role.oid AND parent.rolname <> 'authenticated'
            ))
           OR
           (role.rolname <> 'django_data' AND NOT EXISTS (
                SELECT 1 FROM pg_auth_members membership WHERE membership.member = role.oid
           ))
       )
FROM pg_roles AS role
WHERE role.rolname = current_user
"""


def inspect_database_alias(alias: str) -> Mapping[str, object]:
    if alias not in {"default", "supabase"}:
        raise DatabaseBoundaryError("Unknown database alias.")

    database = connections[alias]
    if database.vendor != "postgresql":
        raise DatabaseBoundaryError("A PostgreSQL connection is required for live health.")

    with _allow_fixed_metadata_query(_HEALTH_SQL):
        with database.cursor() as cursor:
            cursor.execute(_HEALTH_SQL)
            row = cursor.fetchone()

    if row is None:
        raise DatabaseBoundaryError("Connection role metadata is unavailable.")

    (
        current_user,
        current_schema,
        is_superuser,
        can_create_database,
        can_create_roles,
        inherits_roles,
        bypasses_rls,
        can_login,
        can_connect,
        django_usage,
        django_create,
        public_usage,
        public_create,
        no_public_table_access,
        no_django_table_access,
        session_table_exists,
        migrations_table_exists,
        memberships_ok,
    ) = row

    role_and_database_ok = (
        not is_superuser
        and not can_create_database
        and not can_create_roles
        and not inherits_roles
        and not bypasses_rls
        and can_login
        and can_connect
        and memberships_ok
    )

    if alias == "default":
        valid = (
            current_user == "django_app"
            and current_schema == "django"
            and role_and_database_ok
            and django_usage
            and django_create
            and not public_create
            and no_public_table_access
            and session_table_exists
            and migrations_table_exists
        )
    else:
        valid = (
            current_user == "django_data"
            and current_schema == "public"
            and role_and_database_ok
            and public_usage
            and not public_create
            and not django_usage
            and not django_create
            and no_public_table_access
            and no_django_table_access
        )

    if not valid:
        raise DatabaseBoundaryError("Database role or schema privileges do not match P2.")
    return {"alias": alias, "status": "ok"}

from typing import Any

from apps.accounts.models import Profile
from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context

_PROFILE_FIELDS = {"first_name": 100, "last_name": 100, "company": 200, "industry": 120}


def _metadata_value(user: SupabaseUser, key: str) -> str:
    value = user.user_metadata.get(key, "")
    return value.strip()[: _PROFILE_FIELDS[key]] if isinstance(value, str) else ""


def _profile_data(profile: Profile) -> dict[str, Any]:
    return {
        "id": profile.id,
        "first_name": profile.first_name,
        "last_name": profile.last_name,
        "company": profile.company,
        "industry": profile.industry,
        "created_at": profile.created_at,
        "updated_at": profile.updated_at,
    }


def ensure_profile(user: SupabaseUser) -> dict[str, Any]:
    """Create the verified account's own profile once; never enumerate Auth users."""
    with rls_context(user):
        require_rls_context()
        profile, _ = Profile.objects.using("supabase").get_or_create(
            id=user.id,
            defaults={key: _metadata_value(user, key) for key in _PROFILE_FIELDS},
        )
        return _profile_data(profile)


def update_profile(user: SupabaseUser, values: dict[str, Any]) -> dict[str, Any]:
    unknown = set(values) - _PROFILE_FIELDS.keys()
    if unknown:
        raise ValueError("Unsupported profile field.")
    clean: dict[str, str] = {}
    for key, limit in _PROFILE_FIELDS.items():
        if key in values:
            value = values[key]
            if not isinstance(value, str):
                raise ValueError(f"{key} must be text.")
            clean[key] = value.strip()[:limit]

    with rls_context(user):
        require_rls_context()
        profile, _ = Profile.objects.using("supabase").get_or_create(
            id=user.id,
            defaults={key: _metadata_value(user, key) for key in _PROFILE_FIELDS},
        )
        for key, value in clean.items():
            setattr(profile, key, value)
        if clean:
            profile.save(using="supabase", update_fields=tuple(clean))
            profile.refresh_from_db(using="supabase")
        return _profile_data(profile)

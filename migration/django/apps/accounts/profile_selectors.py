from typing import Any

from apps.accounts.models import Profile
from apps.accounts.principals import SupabaseUser
from apps.db.rls import require_rls_context, rls_context


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


def get_profile(user: SupabaseUser) -> dict[str, Any]:
    with rls_context(user):
        require_rls_context()
        profile = Profile.objects.using("supabase").filter(id=user.id).first()
        if profile is None:
            from apps.accounts.profile_services import ensure_profile

            return ensure_profile(user)
        return _profile_data(profile)

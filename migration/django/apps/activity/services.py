from uuid import UUID

from apps.accounts.principals import SupabaseUser
from apps.activity.models import ActivityEvent
from apps.db.rls import require_rls_context, rls_context


def remove_activity_event(user: SupabaseUser, event_id: UUID) -> bool:
    with rls_context(user):
        require_rls_context()
        deleted, _ = (
            ActivityEvent.objects.using("supabase")
            .filter(id=event_id, user_id=user.id)
            .delete()
        )
        return deleted > 0

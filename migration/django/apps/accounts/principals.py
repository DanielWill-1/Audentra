from dataclasses import dataclass, field
from typing import Any
from uuid import UUID


@dataclass(frozen=True)
class SupabaseUser:
    id: UUID
    email: str | None
    user_metadata: dict[str, Any]
    is_authenticated: bool = True
    is_anonymous: bool = False
    _verified: bool = field(default=False, init=False, repr=False, compare=False)

    @property
    def pk(self) -> UUID:
        return self.id

    @property
    def is_active(self) -> bool:
        return True

    @property
    def is_verified(self) -> bool:
        return self._verified


@dataclass(frozen=True)
class AnonymousSupabaseUser:
    is_authenticated: bool = False
    is_anonymous: bool = True
    id: None = None
    email: None = None
    user_metadata: dict[str, Any] | None = None

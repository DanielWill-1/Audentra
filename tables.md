# Database Schema — VoiceForm / Audentra

---

## Existing Tables (from migrations)

### 1. `templates`
Form templates created by users.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique template ID |
| `name` | `text` | NOT NULL | Template name |
| `category` | `text` | NOT NULL, CHECK (`healthcare`, `fieldwork`, `hr`, `legal`, `education`, `realestate`) | Template category |
| `description` | `text` | — | Optional description |
| `form_data` | `jsonb` | — | Form structure/fields |
| `uploaded_file` | `text` | — | File path/URL if uploaded |
| `visibility` | `text` | NOT NULL, DEFAULT `visible`, CHECK (`visible`, `hidden`) | Visibility toggle |
| `created_by` | `uuid` | NOT NULL, FK → `auth.users(id)` ON DELETE CASCADE | Owner user ID |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last updated (trigger-maintained) |

**RLS**: Users can CRUD their own templates (`created_by = auth.uid()`).

**Trigger**: `update_templates_updated_at` auto-sets `updated_at` on UPDATE.

**Indexes**: `idx_templates_category`, `idx_templates_created_by`, `idx_templates_visibility`.

**Migration**: `20250612153114_spring_water.sql`

---

### 2. `scheduled_events`
Calendar/scheduled events for forms and team activities.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique event ID |
| `title` | `text` | NOT NULL | Event title |
| `description` | `text` | DEFAULT `""` | Optional description |
| `date` | `date` | NOT NULL | Event date |
| `time` | `time` | NOT NULL | Event time |
| `duration` | `integer` | DEFAULT `60`, CHECK (`> 0`) | Duration in minutes |
| `type` | `text` | NOT NULL, DEFAULT `other`, CHECK (`form_review`, `team_meeting`, `training`, `maintenance`, `other`) | Event type |
| `priority` | `text` | NOT NULL, DEFAULT `medium`, CHECK (`low`, `medium`, `high`) | Priority level |
| `attendees` | `jsonb` | DEFAULT `[]` | Array of attendees |
| `location` | `text` | DEFAULT `""` | Optional location |
| `form_id` | `uuid` | — | Optional reference to a form |
| `reminder_minutes` | `integer` | DEFAULT `15`, CHECK (`>= 0`) | Reminder lead time |
| `status` | `text` | NOT NULL, DEFAULT `scheduled`, CHECK (`scheduled`, `in_progress`, `completed`, `cancelled`) | Event status |
| `created_by` | `uuid` | NOT NULL | Owner user ID |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last updated (trigger-maintained) |

**RLS**: Users can CRUD their own events (`created_by = auth.uid()`).

**Trigger**: `update_scheduled_events_updated_at` auto-sets `updated_at` on UPDATE.

**Indexes**: `idx_scheduled_events_created_by`, `idx_scheduled_events_date`, `idx_scheduled_events_status`, `idx_scheduled_events_type`, `idx_scheduled_events_priority`, `idx_scheduled_events_date_time`.

**Migration**: `20250614161822_turquoise_king.sql`

---

### 3. `users`
Public user profiles synced from `auth.users`.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, FK → `auth.users(id)` ON DELETE CASCADE | User ID (synced from auth) |
| `email` | `text` | UNIQUE, NOT NULL | User email |
| `first_name` | `text` | DEFAULT `""` | First name |
| `last_name` | `text` | DEFAULT `""` | Last name |
| `company` | `text` | DEFAULT `""` | Company name |
| `industry` | `text` | DEFAULT `""` | Industry |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last updated (trigger-maintained) |

**RLS**: Authenticated users can SELECT all + UPDATE/INSERT own row (`auth.uid() = id`).

**Trigger**: `on_auth_user_created` (AFTER INSERT on `auth.users`) auto-creates a row via `handle_new_user()`.

**Indexes**: `idx_users_email`, `idx_users_created_at`.

**Migration**: `20250628064052_twilight_disk.sql`

---

### 4. `teams`
Team groups owned by a user.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique team ID |
| `name` | `text` | NOT NULL | Team name |
| `description` | `text` | DEFAULT `""` | Optional description |
| `owner_id` | `uuid` | NOT NULL | Team owner user ID |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last updated (trigger-maintained) |

**RLS**: Owners have full access (`owner_id = auth.uid()`). Active team members can SELECT via `team_members` join.

**Indexes**: `idx_teams_owner_id`.

**Migration**: `20250628064557_aged_tree.sql`

---

### 5. `team_members`
Team membership records.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique membership ID |
| `team_id` | `uuid` | NOT NULL, FK → `teams(id)` ON DELETE CASCADE | Team reference |
| `user_id` | `uuid` | — | User reference (nullable for pending) |
| `email` | `text` | NOT NULL, UNIQUE(team_id, email) | Member email |
| `name` | `text` | NOT NULL, DEFAULT `""` | Member name |
| `role` | `text` | NOT NULL, DEFAULT `viewer`, CHECK (`admin`, `editor`, `viewer`) | Member role |
| `status` | `text` | NOT NULL, DEFAULT `pending`, CHECK (`active`, `pending`, `inactive`) | Member status |
| `invited_by` | `uuid` | NOT NULL | Inviting user ID |
| `invited_at` | `timestamptz` | DEFAULT `now()` | Invitation timestamp |
| `joined_at` | `timestamptz` | — | When member joined |
| `last_active` | `timestamptz` | — | Last activity timestamp |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last updated (trigger-maintained) |

**RLS**: Active team members can SELECT. Team owners and admins have full CRUD access.

**Indexes**: `idx_team_members_team_id`, `idx_team_members_user_id`, `idx_team_members_email`, `idx_team_members_status`.

**Migration**: `20250628064557_aged_tree.sql`

---

### 6. `team_invites`
Pending team invitations.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique invite ID |
| `team_id` | `uuid` | NOT NULL, FK → `teams(id)` ON DELETE CASCADE | Team reference |
| `email` | `text` | NOT NULL | Invitee email |
| `role` | `text` | NOT NULL, DEFAULT `viewer`, CHECK (`admin`, `editor`, `viewer`) | Invited role |
| `invited_by` | `uuid` | NOT NULL | Inviting user ID |
| `message` | `text` | DEFAULT `""` | Optional invite message |
| `status` | `text` | NOT NULL, DEFAULT `pending`, CHECK (`pending`, `accepted`, `declined`, `expired`) | Invite status |
| `expires_at` | `timestamptz` | NOT NULL | Expiration timestamp |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Last updated (trigger-maintained) |

**RLS**: Team admins/owners have full CRUD. Users can SELECT invites sent to their email.

**Indexes**: `idx_team_invites_team_id`, `idx_team_invites_email`, `idx_team_invites_status`.

**Migration**: `20250628064557_aged_tree.sql`

---

### 7. `team_activity`
Audit log for team actions.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique activity ID |
| `team_id` | `uuid` | NOT NULL, FK → `teams(id)` ON DELETE CASCADE | Team reference |
| `user_id` | `uuid` | NOT NULL | Actor user ID |
| `action_type` | `text` | NOT NULL | Type of action |
| `description` | `text` | NOT NULL | Human-readable description |
| `metadata` | `jsonb` | DEFAULT `{}` | Additional action data |
| `created_at` | `timestamptz` | DEFAULT `now()` | Created timestamp |

**RLS**: Active team members and team owners can SELECT/INSERT. INSERT also requires `user_id = auth.uid()`.

**Indexes**: `idx_team_activity_team_id`, `idx_team_activity_user_id`, `idx_team_activity_created_at`.

**Migration**: `20250628064557_aged_tree.sql`

---

---

## Missing Tables (referenced in code — NO migration)

### 8. `template_shares` ⚠️ MISSING
Used extensively in `src/lib/templates.ts`. Migration `20250628065741_precious_brook.sql` adds RLS to this table but no migration creates it.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique share ID |
| `template_id` | `uuid` | NOT NULL, FK → `templates(id)` ON DELETE CASCADE | Template reference |
| `user_id` | `uuid` | — | Target user ID (nullable — fkey dropped) |
| `user_email` | `text` | NOT NULL | Target user email |
| `user_name` | `text` | NOT NULL | Target user display name |
| `role` | `text` | NOT NULL, DEFAULT `viewer`, CHECK (`admin`, `editor`, `viewer`) | Share role |
| `shared_by` | `uuid` | NOT NULL | Sharing user ID |
| `shared_at` | `timestamptz` | NOT NULL | Share timestamp |
| `message` | `text` | DEFAULT `""` | Optional share message |
| `updated_at` | `timestamptz` | DEFAULT `now()` | Used by `toggleSharedTemplateVisibility` |

**RLS** (from precious_brook): Authenticated users can SELECT all (policy `Authenticated users can read template shares`). Missing INSERT/UPDATE/DELETE policies — CRUD operations will fail.

**Used in**: `shareTemplate()`, `shareTemplatesWithTeam()`, `getSharedTemplates()`, `getTemplatesSharedByUser()`, `removeTemplateShare()`, `deleteSharedTemplate()`, `toggleSharedTemplateVisibility()`, `updateTemplateShareRole()`.

---

### 9. `template_reviews` ⚠️ MISSING
Used extensively in `src/lib/templates.ts`. Migration `20250628065741_precious_brook.sql` adds RLS to this table but no migration creates it.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique review ID |
| `template_id` | `uuid` | NOT NULL, FK → `templates(id)` ON DELETE CASCADE | Template reference |
| `reviewer_id` | `uuid` | NOT NULL | Reviewer user ID |
| `reviewer_name` | `text` | NOT NULL | Reviewer display name |
| `reviewer_email` | `text` | NOT NULL | Reviewer email |
| `rating` | `integer` | NOT NULL, CHECK (`0–5`) | Star rating (0 = unrated) |
| `comment` | `text` | DEFAULT `""` | Optional review comment |
| `status` | `text` | NOT NULL, CHECK (`pending`, `approved`, `rejected`, `needs_changes`) | Review status |
| `created_at` | `timestamptz` | NOT NULL | Created timestamp |
| `updated_at` | `timestamptz` | NOT NULL | Last updated timestamp |

**RLS** (from precious_brook): Authenticated users can SELECT all (policy `Authenticated users can read template reviews`). Missing INSERT/UPDATE/DELETE policies — CRUD operations will fail.

**Used in**: `addTemplateToReviewQueue()`, `getReviewQueue()`, `addTemplateReview()`, `updateTemplateReview()`, `getTemplateReviews()`.

---

### 10. `filled_templates` ⚠️ MISSING
Queried directly in `src/pages/FilledTemplates.tsx`. No migration exists.

| Column | Type | Constraints | Description |
|---|---|---|---|
| `id` | `uuid` | PK, `DEFAULT gen_random_uuid()` | Unique filled-template ID |
| `user_id` | `uuid` | NOT NULL | Owner user ID |
| `template_name` | `text` | NOT NULL | Template name (displayed in UI) |
| `form_data` | `jsonb` | NOT NULL | Filled form field data (iterated as `Object.entries`) |
| `created_at` | `timestamptz` | DEFAULT `now()` | Fill timestamp |

**RLS needed**: Users should only see/delete their own rows (`user_id = auth.uid()`).

**Used in**: `FilledTemplates.tsx::fetchFilled()` (SELECT), `FilledTemplates.tsx::deleteFilledTemplate()` (DELETE).

---

## Storage Buckets

### `template-files` ⚠️ STATUS UNKNOWN
Referenced in `uploadTemplateFile()` (`src/lib/templates.ts`). Stores uploaded template files (PDF, Excel, CSV, etc.).

**File path pattern**: `templates/{templateId}.{ext}`

**Needs**: Public read access + authenticated upload. Must be created manually in Supabase dashboard (no migration creates buckets).

---

## Migration Execution Order

| Order | Migration | Creates |
|---|---|---|
| 1 | `20250612153114_spring_water.sql` | `templates` |
| 2 | `20250612154531_dry_lantern.sql` | Replaces RLS on `templates` |
| 3 | `20250612155158_humble_fire.sql` | Adds duplicate RLS on `templates` (redundant) |
| 4 | `20250614161822_turquoise_king.sql` | `scheduled_events` |
| 5 | `20250628064052_twilight_disk.sql` | `users`, `handle_new_user()` trigger |
| 6 | `20250628064557_aged_tree.sql` | `teams`, `team_members`, `team_invites`, `team_activity` |
| 7 | `20250628065741_precious_brook.sql` | **WILL FAIL** — adds RLS to `template_shares` and `template_reviews` which don't exist yet |

---

## Critical Issues

1. **Migration 7 will error** — `template_shares` and `template_reviews` don't exist when the migration runs. A migration to CREATE these tables must be inserted before `20250628065741_precious_brook.sql`.

2. **Missing INSERT/UPDATE/DELETE RLS policies** for `template_shares` and `template_reviews` — the precious_brook migration only adds SELECT policies. All CRUD operations from `lib/templates.ts` will fail for authenticated users.

3. **`filled_templates` has NO migration or RLS at all** — must be created from scratch.

4. **Storage bucket `template-files` is not created by any migration** — must be created manually in Supabase dashboard.

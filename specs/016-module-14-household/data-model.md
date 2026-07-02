# Phase 1 Data Model: Module 14 — Household & Family

**Feature**: `016-module-14-household` | **Date**: 2026-06-29

Entities the Household module **owns/provides**. Consumed contracts (`AccountState`, `GoalState`, `MerchantGraph`, `ConnectionConsent`, `CardLineup`, `StatusState`, `HabitProgress`, `SafeToActSignal`) are owned by Module 0 / Module 1 / Module 8 / Module 3 and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_amount`/`*_cents` money fields are **integer minor units (CAD cents)** via `MoneyCents`. This module owns **no** rate/multiplier fields (it does no FX or points math). No field is a binary float.

**Authorization convention** (FR-HH-001): every owned entity is scoped to a `household_id` and a subject `profile_id`; **every cross-user read/proposal is authZ-checked server-side** against the validated session identity and the looked-up `MemberScope` — never a client-supplied id. The entities below describe grants; they are **not** the enforcement point.

---

## Shared value objects (owned by Module 0, referenced here)

### FreshnessStamp (`finos:common/FreshnessStamp/1.0.0`)
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier (often `derived` for FinOS-owned household state) |
| observed_at | timestamp (ISO-8601, UTC) | when the value was produced |
| staleness_threshold_seconds | integer | per-value window (research §5) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

**Rule**: Any externally-sourced value carries a `FreshnessStamp`. A consumer that reads `is_stale = true` MUST flag or withhold; a stale **money** input withholds (FR-X-008).

### MoneyCents (`finos:common/MoneyCents/1.0.0`)
| Field | Type | Notes |
|-------|------|-------|
| amount_cents | integer | integer minor units (CAD cents); signed |
| currency | string (ISO-4217) | default CAD |

---

## Owned entities

### Household
The family unit. **Provided** as `HouseholdRoles`.

| Field | Type | Validation |
|-------|------|------------|
| household_id | string (uuid) | required, unique |
| display_name | string | optional; displayed verbatim (not translated) |
| created_by_profile_id | string (uuid) | required; the founder (becomes `owner`) |
| freshness | FreshnessStamp | required |

### Member / Membership
A profile's membership edge in a household. **Provided** via `HouseholdRoles`.

| Field | Type | Validation |
|-------|------|------------|
| member_id | string (uuid) | required; the membership edge id (distinct from `profile_id`) |
| household_id | string (uuid) | required |
| profile_id | string (uuid) | required; the member's FinOS profile — **never** trusted as an authZ source from a client |
| role | enum {owner, admin, adult, teen, kid} | required; exactly one `owner` per household |
| status | enum {invited, active, suspended, left} | required; only `active` grants access |
| guardian_member_ids | list<uuid> | required for `kid`/`teen`; the guardians who manage/see this minor |
| joined_at | timestamp | required (audited) |
| left_at | timestamp | required iff status = left |

**Invariants**:
- Exactly **one** `owner` per household at all times; the `owner` cannot be removed/demoted by another member.
- A household always retains ≥1 `owner`/`admin` capable of management.
- `guardian_member_ids` non-empty for `kid`/`teen`; empty for `adult`/`admin`/`owner`.

### MemberScope / Grant
The per-(viewer, subject, module) access grant. **Provided** as `MemberScopes`. The contract **every module enforces server-side**.

| Field | Type | Validation |
|-------|------|------------|
| household_id | string (uuid) | required |
| subject_profile_id | string (uuid) | required; the data owner |
| viewer_profile_id | string (uuid) | required; the member granted visibility |
| module_id | enum {spine, rewards, credit, cash_safety, bills, pay, shopping, inbox, tasks, habits, focus, travel, docs, workspace, household, social} | required |
| access_level | enum {none, read, propose} | required; **no** write/execute level (no member moves another's money) |
| granted_at | timestamp | required |
| expires_at | timestamp | optional; past it the grant is treated as `none` |

**Invariants**:
- **Default = none**: any tuple with no row resolves to no access (least privilege, Constitution V).
- `access_level = none` is an explicit deny that overrides any inherited default.
- The **subject** controls grants over their own data; **exception**: guardian visibility over a `kid`/`teen` is configured by `owner`/`admin`.
- A revocation takes effect **immediately** server-side; cached grants MUST NOT be served afterward (ux-foundations §5.5).

### KidGoal
A minor's kid-friendly savings goal. **Provided** via `KidGoals` to Goals (Spine) and Habits.

| Field | Type | Validation |
|-------|------|------------|
| kid_goal_id | string (uuid) | required |
| household_id | string (uuid) | required |
| kid_profile_id | string (uuid) | required; only the kid + guardians (per scope) may read |
| name | string | required; kid-chosen; displayed verbatim |
| target_amount_cents | integer | > 0 |
| saved_amount_cents | integer | ≥ 0; a MONEY value (stale ⇒ time-to-goal flagged) |
| time_to_goal_days | integer or null | ≥ 0; null when pace unknown — never guessed (FR-X-004) |
| status | enum {active, achieved, paused, archived} | required |
| freshness | FreshnessStamp | required |

### Allowance / ChoreReward
A chore-based allowance definition + its accrual ledger. **Provided** via `KidGoals`.

| Field | Type | Validation |
|-------|------|------------|
| allowance_id | string (uuid) | required |
| household_id | string (uuid) | required |
| kid_profile_id | string (uuid) | required |
| chore_name_en / chore_name_fr | string | both required for FinOS-template chores (bilingual); user-entered chores use a single `chore_name` displayed verbatim |
| reward_amount_cents | integer | > 0; CAD cents earned per completion |
| cadence | enum {per_completion, daily, weekly, monthly} | required |
| linked_kid_goal_id | string (uuid) or null | optional; accrual advances this goal's saved amount |
| linked_habit_id | string (uuid) or null | optional; completion advances a Habits streak (real event only) |
| accrued_amount_cents | integer | ≥ 0; earned-but-not-handed-over ledger figure |
| paid_amount_cents | integer | ≥ 0; recorded real-world hand-overs (≤ accrued) |
| last_completed_at | timestamp or null | |

**Rule (FR-HH-002)**: On a chore completion, `accrued_amount_cents += reward_amount_cents` (integer addition, exact) and any `linked_kid_goal_id`'s `saved_amount_cents += reward_amount_cents`. The write is **idempotent**, keyed on the source event id — a replay does not double-accrue. "Paid" records a guardian's real-world hand-over (`paid_amount_cents += handed_over`); **FinOS moves no money**. Fixtures: `$2.50` chore ×4 → `1000` cents exactly; goal `5000`/saved `1000` + `$5.00` chore → `1500` cents; replayed completion → no double-accrual.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| household_id | string (uuid) | required |
| actor_profile_id | string (uuid) | the member who performed (or was denied) the action — from the validated session |
| type | enum {member_invited, member_joined, member_left, role_changed, scope_granted, scope_revoked, chore_completed, allowance_accrued, allowance_marked_paid, kid_goal_advanced, cross_user_access_denied} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp | required, immutable |

**Rules**:
- **Idempotency** (Principle IV): `chore_completed`, `allowance_accrued`, `allowance_marked_paid`, and `role_changed`/`scope_*` writes are keyed on the source event id; a replay does not double-apply.
- **Denied access is audited** (SC-015): every cross-user authZ denial emits a `cross_user_access_denied` event.

---

## State transitions

### Membership lifecycle
`invited → active → (suspended ⇄ active) → left`
- `invited`: no data access yet. `active`: full access per role/scope. `suspended`: all access frozen (denied + auditable). `left`: scopes over others → none, others' grants over them removed, their aggregation links partially revoked (FR-CORE-007); history retained per retention policy.

### Scope grant lifecycle
`(absent = none) → read | propose → revoked (= none)`
- Revocation is immediate server-side; the revoked viewer sees the Empty state with no cached data (ux-foundations §5.5, §10.3).

### Minor age-up
`kid | teen → adult` (guardian-initiated, audited; removes `kid` UI constraints). Threshold is a household-configurable default (Clarifications open question 1).

### Allowance accrual
`accrued += reward (on chore completion, idempotent) → paid += handed_over (on guardian "marked paid", recommend-only, idempotent)`

---

## Relationships

- `Household` 1—* `Member`; exactly one `Member` has `role = owner`.
- `Member` (kid/teen) *—* `Member` (guardian) via `guardian_member_ids`.
- `MemberScope` *—1 subject `Member`, *—1 viewer `Member`, scoped per `module_id`.
- `KidGoal` *—1 kid `Member`; `Allowance` *—0..1 `KidGoal` (via `linked_kid_goal_id`), *—0..1 Habits streak (via `linked_habit_id`).
- `KidGoal` is mirrored to `GoalState` (Spine) for time-to-goal context (FR-X-004).
- All owned entities are scoped by `household_id` + `profile_id`; **every cross-user read is authZ-checked server-side** (threat model), with Postgres RLS as defense-in-depth (platform-decisions §5).

## Consumed contracts (referenced, owned elsewhere)

`AccountState`, `GoalState`, `MerchantGraph`, `ConnectionConsent` (Module 0); `CardLineup`, `StatusState` (Module 1); `HabitProgress` (Module 8); `SafeToActSignal` (Module 3). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage, and always filtered by `MemberScope` server-side before returning anything.

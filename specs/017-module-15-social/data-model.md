# Phase 1 Data Model: Module 15 — Social & Accountability

**Feature**: `017-module-15-social` | **Date**: 2026-06-29

Entities the Social module **owns**. Consumed contracts (`GoalState`, `HabitProgress`/`StreakState`, `MemberScope`) are owned by Module 0 / Module 9 / Module 14 and are referenced, not defined here.

**Money typing convention** (Principle IV): Social produces **no monetary value**. There is **no `*_cents` field and no currency** in any owned entity — this is the module's privacy guarantee made structural (FR-SOC-001). The only numeric ratio (`percentage_complete`) is an **arbitrary-precision decimal in `[0,1]`, string-encoded on the wire** (computed by the spine, never by Social). No field is a binary float; no field is a money amount.

**Freshness** (Principle VIII): every shared projection carries a `FreshnessStamp` derived from its underlying `GoalState`/`HabitProgress`. A stale projection is **flagged** (dimensionless secondary metric), never withheld; a source feed-down yields the Unavailable state, never a fabricated value.

---

## Shared value objects

### FreshnessStamp (`finos:common/FreshnessStamp/1.0.0`)
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier (e.g. `derived`, `goal_state`, `habit_progress`) — never a token |
| observed_at | timestamp (UTC, ISO-8601) | when the underlying value was sourced |
| staleness_threshold_seconds | integer | default 24 h for projections (research §3); user-adjustable |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

**Rule**: a consumer reading `is_stale = true` FLAGS the projection (stale chip). There is no money input to force a withhold.

### Reasoning / provenance (Explainability — Principle VI / FR-X-006)
A projection is "explained" minimally by its `shared_metric_kind`, its `source_kind` (goal/habit), and its `FreshnessStamp` — i.e. *what it is derived from* and *how fresh*. Social surfaces no money recommendation, so it does not carry the full Rewards-style `inputs/rationale_en/rationale_fr` reasoning object; an `AccountabilitySignal` carries a bilingual `short_description`.

---

## Owned entities

### Circle
An accountability group scoped to one shared challenge.

| Field | Type | Validation |
|-------|------|------------|
| circle_id | string (uuid) | required, unique |
| owner_member_id | string (uuid) | required — the creating member; scopes ownership |
| name | string | required, minLength 1 — user-entered, displayed **verbatim** (not translated) |
| shared_metric_kind | enum {percentage_complete, streak_count, pace_status} | required — exactly one; **amounts are not a valid kind** (FR-SOC-001) |
| source_kind | enum {goal, habit} | required; `habit` requires Habits (feature-checked) |
| member_cap | integer | default 8; 2 ≤ cap ≤ 8 (research §4 / Clarifications) |
| status | enum {active, closed} | required; default `active` |
| created_at | timestamp (UTC) | required, immutable (audited) |

### CircleMembership
A member's presence and role in a circle.

| Field | Type | Validation |
|-------|------|------------|
| membership_id | string (uuid) | required, unique |
| circle_id | string (uuid) | required (→ Circle) |
| member_id | string (uuid) | required — opaque, circle-scoped; **not** an account identifier |
| role | enum {owner, member} | required |
| display_name | string | optional — member's chosen circle name (verbatim; non-financial) |
| joined_at | timestamp (UTC) | required |
| share_state | enum {present_not_sharing, sharing, revoked} | required; default `present_not_sharing` (membership without a ShareGrant) |

**Uniqueness**: (`circle_id`, `member_id`) is unique — a user is in a circle at most once.

### ShareGrant
A member's explicit, revocable consent to share ONE metric from ONE source into ONE circle. The keystone of FR-SOC-001/002.

| Field | Type | Validation |
|-------|------|------------|
| grant_id | string (uuid) | required, unique |
| circle_id | string (uuid) | required (→ Circle) |
| member_id | string (uuid) | required (→ CircleMembership) |
| source_kind | enum {goal, habit} | required; MUST match the circle's `source_kind` |
| source_ref_id | string (uuid) | required — the specific `goal_id` (GoalState) or habit id being shared; **stored server-side, never exposed in CircleProgress** |
| metric_kind | enum {percentage_complete, streak_count, pace_status} | required; MUST match the circle's `shared_metric_kind` |
| household_scope_extended | boolean | default false — true only if the source goal is household-joint AND the household member's `MemberScope` was explicitly extended to the circle (FR-SOC-001) |
| granted_at | timestamp (UTC) | required, immutable (audited) |
| revoked_at | timestamp (UTC) or null | null until revoked; set on revocation (audited) |

**Exclusion rule (FR-SOC-001)**: a ShareGrant whose `source_ref_id` is a goal jointly owned with a household member is **rejected** unless `household_scope_extended = true`. The safe default (and the behavior until `MemberScope` is published) is to **exclude** all household-joint goals.

### CircleProgress (provided projection — `finos:social/CircleProgress/1.0.0`)
The server-computed, dimensionless value transmitted to authorized circle members. **Owned & provided.**

| Field | Type | Validation |
|-------|------|------------|
| circle_id | string (uuid) | required |
| member_ref.member_id | string (uuid) | required — opaque circle-scoped id |
| member_ref.is_self | boolean | derived per requester |
| shared_metric_kind | enum {percentage_complete, streak_count, pace_status} | required |
| metric.percentage_complete | decimal string `0..1` or null | present iff kind = percentage_complete; **string-encoded**, full precision; **no amount** |
| metric.streak_count | integer ≥ 0 or null | present iff kind = streak_count |
| metric.pace_status | enum {on_track, ahead, behind, unknown} or null | present iff kind = pace_status; `unknown` never guessed |
| display_label.{label_en,label_fr} | string | both required (bilingual, FR-X-005); non-financial |
| source_kind | enum {goal, habit} | required |
| freshness | FreshnessStamp | required; stale ⇒ flagged |

**Invariant (FR-SOC-001)**: this object NEVER contains an amount, currency, account identifier, or institution name. Computed by the **server-side projection filter** from the granted source, *before* transmission. `percentage_complete` is the spine's `current_amount/target_amount` ratio (arbitrary precision) — Social transmits the ratio only and never reconstructs an amount.

### AccountabilitySignal (provided — `finos:social/AccountabilitySignals/1.0.0`)
A bilingual motivational signal emitted to Inbox/Habits. **Owned & provided.**

| Field | Type | Validation |
|-------|------|------------|
| signal_id | string (uuid) | required — idempotency/dedup key |
| circle_id | string (uuid) | required |
| recipient_member_ref.member_id | string (uuid) | required |
| signal_type | enum {peer_milestone, streak_at_risk, circle_invite, circle_closed, share_revoked, goal_celebration} | required; none carry money |
| priority_tier | enum {informational, important} | required; never `critical` |
| payload.{short_description_en,short_description_fr} | string | both required (bilingual) |
| payload.action_url | string | required — deep link via Inbox |
| expires_at | timestamp (UTC) or null | for time-bounded signals |
| freshness | FreshnessStamp | required |

**Rule**: routes through the Inbox digest (ux-foundations §6) — never a direct push. MUST NOT embed a money amount/account/institution.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| actor_member_id | string (uuid) | required — the validated session identity, never client-supplied |
| circle_id | string (uuid) | required where applicable |
| type | enum {circle_created, share_granted, share_revoked, circle_closed, deletion_cascade, access_denied} | |
| payload | map | member identifiers + finance-derived values **redacted** in debug logs; full record only in the audit trail (FR-X-014) |
| occurred_at | timestamp (UTC) | required, immutable |
| source_event_id | string (uuid) | UNIQUE — idempotency key (replays never double-apply) |

**Idempotency rule (Principle IV)**: projection recompute-and-publish, share-grant, and revocation are keyed on `source_event_id`; a replayed event does not double-apply. `access_denied` events satisfy SC-015 (every denied cross-user access is audited).

---

## State transitions

- **CircleMembership.share_state**: `present_not_sharing` → (member creates ShareGrant) → `sharing` → (member revokes / owner closes circle / deletion) → `revoked`. A `revoked` member's `CircleProgress` is removed from all peers' views server-side immediately; no cached copy is rendered (FR-SOC-002, Threat Model).
- **Circle.status**: `active` → (owner closes or deletes) → `closed`; closing tears down all ShareGrants and projections (no orphaned projection survives).
- **ShareGrant**: created (audited) → revoked (`revoked_at` set, audited). Idempotent: revoking an already-revoked grant is a no-op success, no duplicate audit event.
- **Projection freshness**: source fresh → projection shown with Fresh/Aging chip; source stale (> 24 h) → **Stale chip + "Updated {date}"** (flagged, not withheld); source feed-down → **Unavailable** (last-known timestamp, no fabricated value); source goal/habit deleted mid-session → projection row → "no longer shared" (owner prompted to re-pick or close).

---

## Relationships

- `Circle` 1—* `CircleMembership` (≤ `member_cap`); 1—* `ShareGrant`.
- `CircleMembership` 0..1—1 `ShareGrant` (a member shares at most one metric per circle).
- `ShareGrant` *—1 consumed `GoalState` goal **or** consumed `HabitProgress` habit (via `source_ref_id`, stored server-side, never exposed).
- `CircleProgress` is the server-computed projection of one `ShareGrant`, transmitted only to authorized members of the same `Circle`.
- `AccountabilitySignal` *—1 `Circle`; routed to Inbox/Habits.
- All owned entities are scoped by circle membership; every cross-circle/cross-member read is authZ-checked server-side against the validated session identity (Threat Model, SC-015).

## Consumed contracts (referenced, owned elsewhere)

`GoalState` (Module 0, published); `HabitProgress`/`StreakState` (Module 9 Habits, **not yet published** — habit circles feature-checked); `MemberScope` (Module 14 Household, **not yet published** — safe-default exclude household-joint goals). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage. Social transmits no monetary amount, so no `MoneyCents` contract is consumed or emitted.

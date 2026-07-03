# Phase 1 Data Model: Module 8 — Habits & Routines

**Feature**: `010-module-8-habits` | **Date**: 2026-06-29

Entities the Habits module **owns/provides**. Consumed contracts (`TaskCompletionEvents`, `RoundupProposals`, `BillCalendar`, `NotificationDigest`, `GoalState`) are owned by other modules and are referenced, not defined here.

**Money typing convention** (Principle IV): This module **computes no money**. The only monetary fields that appear are **read-only pass-throughs** from a source contract, carried as the canonical `finos:common/MoneyCents/1.0.0` value object (integer minor units, CAD) **unchanged** — never re-rounded, never converted, never an input to any Habits calculation. There are **no** `*_rate` fields and **no** decimal arithmetic in this module. XP/streak math uses **integer event/streak counts only**.

**Freshness convention** (Principle VIII): every value Habits surfaces that originates from an external/source feed carries the source's `finos:common/FreshnessStamp/1.0.0`. Habits does not invent freshness; it propagates the source's stamp. A stale source section is flagged/withheld (FR-X-008).

**Idempotency convention** (Principle IV / FR-X-003): every state Habits writes on the user's behalf is keyed on a **source event id** with a uniqueness constraint and is safe to retry.

---

## Shared value objects (reused, owned by Module 0)

| Object | `$id` | Use in Habits |
|--------|-------|---------------|
| `FreshnessStamp` | `finos:common/FreshnessStamp/1.0.0` | propagated onto every ritual item / completion event |
| `Reasoning` | `finos:common/Reasoning/1.0.0` | "why this counted" on a streak advance (which source event + action class) |
| `MoneyCents` | `finos:common/MoneyCents/1.0.0` | read-only pass-through amount on a ritual money item — never computed here |

---

## Owned entities

### Habit
An opt-in habit tied to a real action class.

| Field | Type | Validation |
|-------|------|------------|
| habit_id | string (uuid) | required, unique per profile |
| profile_id | string (uuid) | required — scopes ownership (authZ) |
| action_class | enum {roundup_approve, bill_review, task_complete, notification_clear, daily_ritual} | required — the *real action* that advances it (FR-HAB-001) |
| name_en / name_fr | string | both required (bilingual; single-language leak = defect) |
| cadence | enum {daily, weekly} | required |
| grace_seconds | integer | ≥ 0; default 21600 (6 h) — preserves streak past local-day boundary |
| enabled | boolean | required — independent of the global game-layer toggle |

**Rule**: `action_class` MUST map to a consumed completion event class — a habit cannot be tied to a non-real action (app-open, view).

### StreakState  *(provided — projection only)*
Current/longest streak for a habit. **Provided** to Social and Inbox.

| Field | Type | Validation |
|-------|------|------------|
| habit_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| current_streak | integer | ≥ 0 |
| longest_streak | integer | ≥ current_streak |
| last_qualified_on | date | optional; local-day of the last qualifying event |
| in_grace | boolean | derived; within the grace window after the local-day boundary |
| freshness | FreshnessStamp | required — depends on freshness-stamped completion events |

**No monetary field.** This is the cross-user-safe projection (FR-SOC-001).

### HabitProgress  *(provided — projection only)*
A profile's aggregate game-layer state. **Provided** to Social and Inbox.

| Field | Type | Validation |
|-------|------|------------|
| profile_id | string (uuid) | required |
| game_layer_enabled | boolean | required (FR-HAB-001 disable-able) |
| xp | integer | ≥ 0 — derived from event/streak facts; **never** a money input |
| level | integer | ≥ 0 — XP threshold |
| streaks | list<StreakState> | per active habit |
| badges | list<Badge> | may be empty |
| freshness | FreshnessStamp | required |

**Badge**: `{ badge_id, name_en, name_fr, earned_on }` — no monetary value.

### QualifyingEvent  *(explainability + idempotency key)*
Immutable link from a consumed source event to the advance it produced.

| Field | Type | Validation |
|-------|------|------------|
| qualifying_event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| habit_id | string (uuid) | required |
| source_module | enum {tasks, cash_safety, bills, inbox} | required |
| source_event_id | string | required — **UNIQUE** per (profile, habit); the idempotency key |
| action_class | enum {roundup_approve, bill_review, task_complete, notification_clear} | required |
| applied_at | timestamp (UTC) | required, immutable |
| compensated | boolean | default false; set true when the source action is reversed/voided |
| reasoning | Reasoning | required — bilingual "why this counted" (source event + class) |

**Idempotency rule (Principle IV)**: a second event with the same `source_event_id` for the same (profile, habit) is a **no-op** (advance applied at most once).

### Ritual / RitualRun
Daily ritual definition and a dated run instance.

| Field | Type | Validation |
|-------|------|------------|
| run_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| local_day | date | required — **UNIQUE** per (profile, local_day): a run is idempotent per day |
| items | list<RitualItem> | live items pulled at assembly time |
| state | enum {assembled, in_progress, completed, all_clear} | `all_clear` when no live items (US2 AS4) |
| started_at / completed_at | timestamp (UTC) | optional |

### RitualItem
One micro-action in a run.

| Field | Type | Validation |
|-------|------|------------|
| item_id | string (uuid) | required |
| source_module | enum {bills, cash_safety, inbox, tasks} | required |
| source_ref | string | required — opaque reference into the source module (e.g. bill id, roundup id, digest item id) |
| kind | enum {bill_review, roundup_approve, notification_clear, task_complete} | required |
| display_en / display_fr | string | both required (bilingual) |
| money_passthrough | MoneyCents (`finos:common/MoneyCents/1.0.0`) | optional; **read-only** source amount (roundup/bill) — never computed/converted here |
| freshness | FreshnessStamp | required — the **source's** stamp; stale ⇒ section flagged/withheld |
| completion_state | enum {pending, completed, withheld, conflict} | `withheld` when source money input stale; `conflict` when Cash Safety overrides |

**Rule**: a `kind` implying a money action MUST be executed via the **owning module's Confirm-Action sheet** — `RitualItem` carries no executor. `money_passthrough` is displayed via `@finos/format` unchanged.

### GameLayerSetting
| Field | Type | Validation |
|-------|------|------------|
| profile_id | string (uuid) | required, unique |
| enabled | boolean | required — disabling hides all game UI; re-enable resumes streaks from 0, XP/level preserved (Clarifications) |
| ritual_cadence | enum {daily, off} | required |
| grace_seconds_override | integer | optional; ≥ 0 |

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {streak_advanced, streak_compensated, xp_awarded, ritual_started, ritual_completed, cross_user_read_denied} | |
| payload | map | PII/money-passthrough **redacted** in debug logs; full record only in the append-only audit trail (FR-X-014) |
| occurred_at | timestamp (UTC) | required, immutable |

---

## Relationships

- `Habit` 1—1 `StreakState`; `Habit` 1—* `QualifyingEvent`.
- `HabitProgress` 1—* `StreakState`, 1—* `Badge` (aggregate per profile).
- `QualifyingEvent` *—1 a consumed source event (by `source_module` + `source_event_id`); drives `StreakState` advance and compensation.
- `RitualRun` 1—* `RitualItem`; each `RitualItem` *—1 a consumed source object (`BillCalendar` / `RoundupProposals` / `NotificationDigest` / `TaskCompletionEvents`) by `source_ref`.
- All owned entities are scoped by `profile_id`; every cross-user read is authZ-checked server-side (threat model). Cross-user consumers (Social) receive only `StreakState`/`HabitProgress` **projections** — never `RitualItem` money pass-throughs or `source_ref`s.

## State transitions

**StreakState (per habit, per cadence period)**:
- qualifying source event (new `source_event_id`, action holds) → `current_streak += 1`; update `longest_streak`, `last_qualified_on`; emit `streak_advanced` + `xp_awarded`.
- replayed event (existing `source_event_id`) → **no-op** (idempotent).
- reversal/void of a prior qualifying event → **compensate**: decrement; if the reversed day was the most recent qualifying day, reset/recompute the streak; emit `streak_compensated`.
- period elapses with no qualifying event beyond `grace_seconds` → `current_streak = 0` (streak reset).

**RitualRun**:
- assemble for (profile, local_day) → `assembled`; if no live items → `all_clear`.
- user begins → `in_progress`.
- a section's source is stale (money item) → that item `withheld`; run proceeds on remaining items.
- a section conflicts with Cash Safety `SafeToActSignal` → that item `conflict` (Conflict Banner; Cash Safety precedence; UX §3.1/§10.4).
- all actionable items completed → `completed`; if game layer enabled, advance the `daily_ritual` habit (idempotent per `run_id`).

## Consumed contracts (referenced, owned elsewhere)

`TaskCompletionEvents` (Tasks/M7), `RoundupProposals` (Cash Safety/M3), `BillCalendar` (Bills), `NotificationDigest` (Inbox/M10), `GoalState` (Spine/M0). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage. See [contracts/consumed/README.md](./contracts/consumed/README.md).

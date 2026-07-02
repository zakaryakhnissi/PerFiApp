# Phase 1 Data Model: Module 7 — Tasks & To-Dos

**Feature**: `009-module-7-tasks` | **Date**: 2026-06-29

Entities the Tasks module **owns/provides**. Consumed contracts (`GoalState`, `MerchantGraph`, `CashFlowForecast` from Module 0; `BillCalendar`, `PaymentSchedule`, `SafeToActSignal` forward-declared) are owned elsewhere and are referenced, not defined here.

**Money typing convention** (Principle IV): Tasks owns **no** money-amount field. Any money value a task displays is **read live** from a consumed contract as **integer minor units (CAD cents)** (`finos:common/MoneyCents/1.0.0`) and rendered via `@finos/format`; rates/multipliers, where ever shown, are read as **decimal strings**. No Tasks field is a binary float, and Tasks stores **no private copy** of a linked money figure — only the link reference. No `float`/`double`/`real` anywhere (enforced by the no-float lint + DB schema-lint gate, platform-decisions §4/§6).

---

## Shared value objects (reused from Module 0 common)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier (never a token/secret) |
| observed_at | timestamp (UTC) | when the value was sourced |
| staleness_threshold_seconds | integer | per-value window (inherited from source contract) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

**Rule**: Any externally-sourced value a task displays carries a `FreshnessStamp`. A consumer that reads `is_stale = true` MUST flag or withhold; a stale **money** input withholds the dependent behavior (FR-X-008).

### Reasoning — `finos:common/Reasoning/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| inputs | map<string, any> | the inputs that produced a scheduling placement / suggestion (e.g. next_payday, due_date, linked freshness); redacted from debug logs, full only in the audit trail |
| rationale_en | string | human-readable "why", English |
| rationale_fr | string | human-readable "why", French (bilingual — Principle II) |

---

## Owned entities

### Task
A user to-do, optionally money-aware via a `TaskLink`. The core owned entity. **Provided** via `TaskState`.

| Field | Type | Validation |
|-------|------|------------|
| task_id | string (uuid) | required, unique |
| profile_id | string (uuid) | required — scopes ownership (every cross-profile read is authZ-checked server-side) |
| title | string | required, minLength 1; **user-authored, displayed verbatim (not translated)**; redacted from debug logs |
| notes | string \| null | optional; user-authored, verbatim, redacted from debug logs |
| status | enum {open, scheduled, in_progress, completed, archived} | required |
| priority | enum {low, medium, high} \| null | optional |
| is_money_aware | boolean | true iff a `TaskLink` is attached |
| link | TaskLink \| null | optional; the live link |
| schedule | TaskSchedule \| null | optional; computed placement |
| sync_status | enum {not_applicable, synced, pending_sync, no_op_orphaned} | write-back outcome for a completed money-aware task |
| created_at / updated_at | timestamp (UTC) | required, immutable created_at |

### TaskLink
A live link binding a task to a financial entity. Holds **no** copy of a money value — only the reference.

| Field | Type | Validation |
|-------|------|------------|
| entity_type | enum {bill, merchant, budget, goal, payment, module_action} | required (FR-TASK-001) |
| entity_id | string | required, minLength 1 — id in the owning module/contract |
| source_contract | string | required — owning contract `$id`+version (e.g. `finos:spine/GoalState/1.0.0`); version skew disables the link |
| link_status | enum {live, orphaned, unavailable} | required; `live` = source present & compatible; `orphaned` = source entity deleted (no write-back); `unavailable` = owning module/contract not yet shipped or version-skewed |

**Rule**: the linked money value is **read from `source_contract` at display time**, never stored here (SC-T-001). A stale linked **money** value is flagged/withheld via its source `FreshnessStamp`.

### TaskSchedule
Computed placement of a task relative to paydays and due dates (FR-TASK-003).

| Field | Type | Validation |
|-------|------|------------|
| scheduled_date | date \| null | day the task is placed; null when withheld/unscheduled |
| placement_source | enum {payday_aware, due_date, manual, unscheduled, withheld_stale_forecast} | required; `withheld_stale_forecast` ⇒ `CashFlowForecast` was stale/absent and payday-aware placement was **withheld** (never guessed); `manual` is never overwritten by auto-scheduling |
| reasoning | Reasoning | required when `placement_source = payday_aware` (which payday / which due date drove it — FR-X-006) |
| freshness | FreshnessStamp | required; derives from `CashFlowForecast`; stale ⇒ payday-aware placement flagged/withheld |

### TaskCompletionEvent (append-only; Principle VI / FR-X-007)
Idempotent record that a money-aware task was completed. **Provided** via `TaskCompletionEvent`.

| Field | Type | Validation |
|-------|------|------------|
| event_id | string (uuid) | required |
| source_event_id | string | required, **UNIQUE** — client-generated idempotency key; replays are no-ops |
| profile_id | string (uuid) | required |
| task_id | string (uuid) | required |
| completed_at | timestamp (UTC) | required, immutable |
| link_ref | {entity_type, entity_id, source_contract} \| null | reference of the entity whose status was updated; null for unlinked tasks; **never a money value** |
| writeback_outcome | enum {synced, pending_sync, no_op_orphaned, no_op_unlinked} | required |
| moved_money | boolean (const false) | MUST be false — Tasks never moves money (FR-X-003) |
| reasoning | Reasoning | optional; redacted in debug logs, full only in audit trail |

**Idempotency rule (Principle IV)**: status write-back and this event are keyed on `source_event_id`; a replayed completion applies the status change and writes the event **at most once** (US2 AS-2).

### TaskState (aggregate provided view)
The provided projection of a profile's tasks + link/sync status, freshness-stamped. Schema: `finos:tasks/TaskState/1.0.0`. Composed of the above entities; not a separate stored table beyond the projection.

---

## State transitions

**Task lifecycle**:
`open` → `scheduled` (scheduling runs) → `in_progress` (optional) → `completed` → `archived`.

**Completion → write-back (money-aware task)**:
1. User checks off a money-aware task → a `TaskCompletionEvent` is created with a `source_event_id`.
2. If `link.link_status = live` → status write-back to the owning module's contract operation (authorized against the **link owner's** scope) → `writeback_outcome = synced` (`sync_status = synced`).
3. If the write-back fails/times out → `writeback_outcome = pending_sync` (`sync_status = pending_sync`); retried with backoff (FR-X-012); not shown as reconciled until the owning module confirms.
4. If `link.link_status = orphaned` → `writeback_outcome = no_op_orphaned`; no write-back.
5. Replay of the same `source_event_id` → **no-op** (idempotent).
6. `SafeToActSignal` overdraft risk on a spend-implying task → spend-implying completion **held/flagged**, Conflict Banner shown, Cash Safety precedence; plain "mark done" still allowed.

**Link lifecycle**:
`live` → `orphaned` (source entity deleted; task preserved as unlinked to-do, no write-back) · `live` → `unavailable` (owning module/contract not shipped or version-skewed; degrades gracefully) · `unavailable` → `live` (owning contract ships / migrates).

**Schedule lifecycle**:
`unscheduled` → `payday_aware`/`due_date` (scheduling runs with fresh inputs) · `payday_aware` → `withheld_stale_forecast` (when `CashFlowForecast` goes stale in-session — placement withheld in-place) · any → `manual` (user reschedule; not overwritten by auto-scheduling).

---

## Relationships

- `Task` 1—0..1 `TaskLink` (a task is money-aware iff it has a link).
- `Task` 1—0..1 `TaskSchedule`.
- `Task` 1—* `TaskCompletionEvent` (append-only; normally one terminal completion, but replays are recorded idempotently as no-ops).
- `TaskLink` *—1 a consumed entity in `GoalState` / `MerchantGraph` / `BillCalendar` / `PaymentSchedule` (by `entity_id` + `source_contract`).
- `TaskSchedule` *—1 `CashFlowForecast` (paydays/runway) and *—1 `BillCalendar`/`PaymentSchedule` (due dates).
- `TaskCompletionEvent` → consumed by Habits (`StreakState`/XP), Inbox, and the originating module — Habits advances at most once per `source_event_id`.
- All owned entities are scoped by `profile_id`; every cross-profile read/completion is authZ-checked server-side (threat model).

## Consumed contracts (referenced, owned elsewhere)

`GoalState`, `MerchantGraph`, `CashFlowForecast` (`finos:spine/.../1.0.0`, Module 0); `BillCalendar` (Module 4), `PaymentSchedule` (Module 5), `SafeToActSignal` (Module 3) — forward-declared, behind a feature check. Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage. Shared value objects `FreshnessStamp`, `Reasoning`, `MoneyCents` reused from `finos:common/*`.

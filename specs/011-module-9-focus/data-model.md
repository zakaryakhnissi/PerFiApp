# Phase 1 Data Model: Module 9 — Focus & Mental Health

**Feature**: `011-module-9-focus` | **Date**: 2026-06-29

Entities the Focus module **owns**. Consumed contracts (`BillCalendar`, `RunwayForecast`, `GoalState`, `CreditState`) are owned by Modules 4/3/0 and are referenced, not defined here.

**Money typing convention** (Principle IV): Focus **originates no monetary value**. Any `*_cents` field it holds is a **read-only pass-through copy** of a provider-owned **integer minor unit (CAD cents)** value, retained only for display context and always paired with the source's `FreshnessStamp`. Focus performs **no arithmetic, FX, or rounding** on money; there is no binary float anywhere because there is no money math. No `*_rate` fields are owned by this module.

**Freshness convention** (Principle VIII): Every displayed money figure carries the `FreshnessStamp` of its source contract. A consumer-side rule: if a stressor's source money input `is_stale = true`, the money figure is **withheld** (set null) and the proposed action falls back to a non-money action — never asserted as fresh.

**Privacy convention** (FR-FOC-005): All owned entities are **private-by-default** well-being PII, scoped by `profile_id`, authZ-checked server-side, and **never** exposed across household members regardless of `MemberScope`. No free-text distress content is stored in MVP.

---

## Shared value objects (reused from Module 0)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier (never a token/secret) |
| observed_at | timestamp (UTC, ISO-8601) | when the value was sourced |
| staleness_threshold_seconds | integer | per-value window (inherited from source) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

**Rule**: Any externally-sourced value carries a `FreshnessStamp`. A consumer reading `is_stale = true` on a **money** input MUST withhold that figure (FR-X-008).

### Reasoning — `finos:common/Reasoning/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| inputs | map<string, any> | the stressor inputs that produced the proposal (kind, entity_ref, source freshness, optional provider money figure) — **no free-text distress content** (FR-X-014) |
| rationale_en | string | human-readable "why", English |
| rationale_fr | string | human-readable "why", French (bilingual — Principle II) |

---

## Owned entities

### FocusSession
A single stress-pack or wind-down session. **Owned, not provided** (private well-being PII). Stores **structured metadata only** — no free-text distress.

| Field | Type | Validation |
|-------|------|------------|
| session_id | string (uuid) | required, unique |
| profile_id | string (uuid) | required — scopes ownership (private-by-default authZ) |
| type | enum {stress_pack, wind_down} | required |
| stressor_refs | list<StressorRef> | the stressor(s) the session addressed (by reference); may be empty for a generic support session |
| started_at | timestamp (UTC) | required, immutable |
| completed_at | timestamp (UTC) | optional; set on completion |
| outcome_per_stressor | map<entity_ref, enum{action_proposed, action_confirmed, skipped, already_captured, resolved}> | structured outcome only |

**Rule**: No field stores free-text descriptions of emotional state (Principle IX, data minimization, SC-F-008).

### StressorRef
A typed reference to an underlying entity causing money stress. **Derived** from consumed contracts; not persisted as authoritative money state (the source contract remains authoritative).

| Field | Type | Validation |
|-------|------|------------|
| kind | enum {bill, runway, goal, credit_card} | required |
| entity_ref | string | required; canonical, e.g. `bill:{bill_id}`, `goal:{goal_id}`, `runway:{profile_id}:{period}`, `card:{account_id}` |
| source_contract | enum {BillCalendar, RunwayForecast, GoalState, CreditState} | required |
| money_input_state | enum {fresh, stale_withheld, absent} | required; default `fresh` |
| money_figure_cents | integer \| null | optional, pass-through; **MUST** be null when `money_input_state ≠ fresh` |
| freshness | FreshnessStamp | required (inherited from source) |

**Rule**: `money_figure_cents` is read **as-provided** (no Focus arithmetic). Stale money input ⇒ `stale_withheld` + null figure (FR-X-008).

### WellbeingAction — **Provided** contract `finos:focus/WellbeingAction/1.0.0`
A recommend-only proposal to create a task/goal linked to a stressor. **Provided** to Tasks (Module 7) and Workspace (Module 13).

| Field | Type | Validation |
|-------|------|------------|
| wellbeing_action_id | string (uuid) | required, unique |
| profile_id | string (uuid) | required — private-by-default authZ |
| session_id | string (uuid) | required → `FocusSession` |
| stressor | StressorRef | required (typed link, never a copied figure) |
| proposed_action | {action_type: enum{create_task, create_goal, refresh_data}, label_en, label_fr, target} | required; exactly one action (FR-FOC-001) |
| informational_only | bool (const true) | MUST be true (non-clinical, not regulated advice) |
| idempotency_key | string | required; derived from `(stressor.entity_ref, session_id)`; **UNIQUE** |
| status | enum {proposed, confirmed, skipped, already_captured, resolved} | required |
| reasoning | Reasoning | required (bilingual; no distress free-text) |
| freshness | FreshnessStamp | required (inherited from stressor source) |

**Rule (FR-FOC-001/002)**: A `WellbeingAction` is recommend-only — nothing is created until the user confirms via a Confirm-Action sheet. On confirmation a creation request is dispatched to Tasks/Spine and the confirmation is audited. When the stressor's money input is stale/absent, `action_type` MUST be `refresh_data` (non-money fallback) and `money_figure_cents` MUST be null.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {session_started, session_completed, wellbeing_action_proposed, wellbeing_action_confirmed, worry_skipped} | |
| payload | map | PII / monetary values / **well-being signals** redacted in debug logs; full record only in the audit trail (FR-X-014) |
| occurred_at | timestamp (UTC) | required, immutable |
| source_event_id | string | UNIQUE — idempotency anchor |

**Idempotency rule (Principle IV)**: `wellbeing_action_confirmed` writes are keyed on the `WellbeingAction` `idempotency_key`/`source_event_id`; a replayed confirmation does not double-create a task/goal (SC-F-003).

---

## State transitions

`WellbeingAction.status`:

- `proposed` → `confirmed`: user approves via Confirm-Action; task/goal-creation request dispatched (idempotent); audited.
- `proposed` → `skipped`: user explicitly skips in wind-down; re-offered next session (not dropped).
- `proposed` → `already_captured`: a still-open task/goal already exists for `(entity_ref)`; not re-created (idempotent dedup).
- any → `resolved`: the underlying stressor resolved out-of-band per the source contract (bill paid, runway recovered, goal back on pace); not re-offered; not deleted.

**Withhold guard**: if `stressor.money_input_state ∈ {stale_withheld, absent}` at proposal time, `proposed_action.action_type` is forced to `refresh_data` and `money_figure_cents` is null (FR-X-008) — the session still pairs support with a concrete (non-money) action (FR-FOC-001).

**Conflict guard**: if a `WellbeingAction` would imply spending and Cash Safety (`RunwayForecast`/`SafeToActSignal`) flags overdraft risk, the action is held and the Conflict Banner is surfaced with Cash Safety winning (umbrella precedence; ux-foundations §10.4). Most Focus actions are reminders/captures and never trigger this guard.

---

## Relationships

- `FocusSession` 1—* `StressorRef`; `FocusSession` 1—* `WellbeingAction`.
- `WellbeingAction` *—1 `StressorRef`; `WellbeingAction` *—1 (`Task` in Module 7 OR `Goal` in Module 0) **via a confirmed creation request** — Focus holds only the link, never the task/goal lifecycle.
- `StressorRef` *—1 source contract node (`BillCalendar` item / `RunwayForecast` / `GoalState` goal / `CreditState` per-card).
- All owned entities scoped by `profile_id`; every read/write authZ-checked server-side; well-being content excluded from every cross-member view (Threat Model).

## Consumed contracts (referenced, owned elsewhere)

`BillCalendar` (Module 4), `RunwayForecast` (Module 3), `GoalState`, `CreditState` (Module 0). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage. Focus reads them to identify stressors and displays their money figures as-provided with freshness; it computes no new money value.

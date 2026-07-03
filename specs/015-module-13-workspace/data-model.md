# Phase 1 Data Model: Module 13 — Workspace & Playbooks

**Feature**: `015-module-13-workspace` | **Date**: 2026-06-29

Entities the Workspace module **owns/provides**. Consumed contracts (`BudgetState`, `GoalState`, `CreditState`, `RunwayForecast`, `SafeToActSignal`, `BillCalendar`, `DocumentVault`, `TripBudget`, `TaskState`/`TaskCompletionEvents`) are owned by Module 0 / Cash Safety / Bills / Docs / Travel / Tasks and are **referenced, not defined here**.

**Money typing convention** (Principle IV): Workspace **owns no money source of truth and performs no monetary arithmetic** (SC-W-005). Where it caches a figure for render it stores `*_amount_cents` as **integer minor units**, typed exactly as the upstream contract, alongside the upstream `FreshnessStamp` — never re-rounded, summed, or converted, and never a binary float. Rates/fractions (e.g. utilization) are cached as **arbitrary-precision decimal strings**. A stale **money** cache renders `withheld`, never as fresh.

**Freshness convention** (Principle VIII): every referenced figure carries the owning contract's `FreshnessStamp`. Workspace does not set its own money-staleness policy — it inherits each figure's threshold and flags/withholds accordingly.

---

## Shared value objects (referenced from Module 0)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
Attached to every referenced figure. A figure read as `is_stale = true` is flagged; a stale **money** figure is **withheld** (resolution_state `withheld`).

### Reasoning — `finos:common/Reasoning/1.0.0`
`{ inputs, rationale_en, rationale_fr }` — required on any step that proposes a money action (Principle VI). Bilingual rationale; single-language is a defect.

---

## Owned entities

### PlaybookTemplate (curated dataset — not user data)
A curated, versioned, bilingual Canada-specific life-event template.

| Field | Type | Validation |
|-------|------|------------|
| template_id | string | required, unique |
| version | string (semver) | required; a step-schema change bumps this and is caught by contract tests |
| event_kind | enum {moving, job_change, new_baby, immigration_newcomer} | required (FR-WS-001) |
| title_en / title_fr | string | both required (bilingual) |
| step_specs | list<StepSpec> | ≥ 1; ordered checklist definition |

**StepSpec**: `{ step_id, title_en, title_fr, binding_specs: list<BindingSpec>, generation_specs: list<GenerationSpec>, proposes_money_action: bool }`. A `BindingSpec` declares `{ target_contract ($id), value_path, render_kind }`. A `GenerationSpec` declares `{ generation_kind: task|goal, ... }`.

**Rule**: Templates are a **versioned dataset** (like the Rewards card-knowledgebase). Adding/curating a template requires no code change.

### PlaybookInstance (owned; provided via `Playbooks`)
A user's running instance of a template.

| Field | Type | Validation |
|-------|------|------------|
| instance_id | string (uuid) | required, unique per user |
| profile_id | string (uuid) | required — scopes ownership (session-derived, never client-supplied) |
| template_id | string | required (→ PlaybookTemplate) |
| template_version | string (semver) | required; pins the template the instance was created from |
| event_kind | enum | required |
| title_en / title_fr | string | both required |
| status | enum {in_progress, completed, abandoned} | required |
| started_at | timestamp (UTC) | required |
| completed_at | timestamp (UTC) | nullable; set on completion |

### PlaybookStep (owned; within an instance)
| Field | Type | Validation |
|-------|------|------------|
| step_id | string | required; stable within template; part of provenance key |
| instance_id | string (uuid) | required (→ PlaybookInstance) |
| title_en / title_fr | string | both required |
| state | enum {pending, done, snoozed, overridden} | required; `overridden` when held by a higher-precedence signal |
| snoozed_until | date | nullable; step reappears at/after this date (US4) |
| proposes_money_action | bool | required; if true, `reasoning` required + routes through Confirm-Action sheet |
| reasoning | Reasoning | required iff proposes_money_action |
| safe_to_act_deferred | bool | true iff SafeToActSignal overrode a spend-implying step (Cash Safety precedence) |

### LiveBinding (owned; render-only reference within a step)
A live figure a step reads from an upstream contract. **Cache for render only — never a money source of truth.**

| Field | Type | Validation |
|-------|------|------------|
| target_contract | string ($id) | required; upstream contract the figure is read from |
| value_path | string | required; JSON path of the figure in the upstream object |
| resolution_state | enum {live, stale, withheld, unavailable} | required; never `live` for a stale money figure |
| cached_amount_cents | integer | nullable; last-known amount, typed as upstream, render-only — never re-rounded/summed |
| cached_rate | decimal string | nullable; last-known rate/fraction, render-only |
| goal_ref | {goal_id} | nullable; time-to-goal context (FR-X-004) |
| freshness | FreshnessStamp | required; inherited from owning contract; stale money ⇒ withheld |

### GeneratedItem (owned; task/goal proposal with provenance)
| Field | Type | Validation |
|-------|------|------------|
| provenance_id | string | required, **UNIQUE** = hash of {instance_id, step_id, generation_kind} — idempotency key |
| step_id | string | required |
| generation_kind | enum {task, goal} | required |
| materialization_state | enum {pending, materialized} | required |
| downstream_task_id | string (uuid) | nullable; set when Tasks materializes a task proposal |
| downstream_goal_id | string (uuid) | nullable; set when the Spine goal service materializes a goal proposal — Workspace never writes the goal's money balance |

**Idempotency rule (Constitution IV)**: materialization is keyed on `provenance_id` with a `UNIQUE` constraint; a replay/double-tap/sync retry returns the existing reference and never double-creates (SC-W-003).

### NotebookPage (owned)
| Field | Type | Validation |
|-------|------|------------|
| page_id | string (uuid) | required, unique per user |
| profile_id | string (uuid) | required — scopes ownership |
| title | string | user-provided; displayed verbatim, not translated |
| body | rich-text/blocks | user free text; shown verbatim; not machine-translated |
| created_at / updated_at | timestamp (UTC) | required |

### NotebookReference (owned; provided via `NotebookReferences`)
An embedded, auto-refreshing reference to an upstream figure.

| Field | Type | Validation |
|-------|------|------------|
| reference_id | string (uuid) | required |
| page_id | string (uuid) | required (→ NotebookPage) |
| target_contract | string ($id) | required; upstream contract the figure resolves from |
| value_path | string | required |
| label_en / label_fr | string | both required (bilingual chrome) |
| resolution_state | enum {live, stale, withheld, unavailable} | required; `unavailable` when target deleted/revoked/version-skewed |
| cached_amount_cents | integer | nullable; render-only |
| cached_rate | decimal string | nullable; render-only |
| goal_ref | {goal_id} | nullable; time-to-goal context |
| freshness | FreshnessStamp | required; stale money ⇒ withheld |

**Idempotency**: reference creation is idempotent per `{page_id, target_contract, value_path}` — re-embedding the same figure does not duplicate it.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {playbook_started, step_completed, playbook_completed, task_generated, goal_proposed, reference_created, reference_unavailable} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail (FR-X-014) |
| occurred_at | timestamp (UTC) | required, immutable |

---

## State transitions

**PlaybookStep**:
- `pending` → `done` (user marks complete; `step_completed` audit event).
- `pending` → `snoozed` (user snoozes; `snoozed_until` set) → `pending` at/after `snoozed_until`.
- any → `overridden` when a higher-precedence signal (e.g. `SafeToActSignal` overdraft risk) holds a spend-implying step; the Conflict Banner is shown and `safe_to_act_deferred = true`. Returns to `pending` when the conflict clears.

**LiveBinding / NotebookReference resolution**:
- `live` — figure fresh within threshold; render the value + Fresh/Aging chip.
- `stale` — non-money figure past threshold; render flagged with a Stale chip (May be outdated).
- `withheld` — **money** figure past threshold; withhold the value, show Withheld treatment + Refresh CTA (never a guessed number).
- `unavailable` — target deleted/archived/revoked or contract version-skewed; render explicit "no longer available" (never a cached number as if current, never a blank). `reference_unavailable` audit event.

**GeneratedItem**:
- created `pending` on first step run (`task_generated` / `goal_proposed` audit event).
- `pending` → `materialized` when the downstream module/goal-service confirms, setting `downstream_task_id`/`downstream_goal_id`. A second generation request for the same `provenance_id` is a no-op returning the existing item.

**PlaybookInstance**:
- `in_progress` → `completed` when all required steps are `done`; `playbook_completed` audit event written, `completed_at` set.
- `in_progress` → `abandoned` (user discards); generated tasks/goals already materialized are **not** retracted (owned downstream).

---

## Relationships

- `PlaybookTemplate` 1—* `PlaybookInstance` (a user may run a template once or re-run).
- `PlaybookInstance` 1—* `PlaybookStep`.
- `PlaybookStep` 1—* `LiveBinding` (the live figures it reads) and 0..* `GeneratedItem` (tasks/goals it proposes).
- `GeneratedItem` *—0..1 downstream `TaskState` / Spine goal (via `downstream_task_id` / `downstream_goal_id`).
- `NotebookPage` 1—* `NotebookReference`.
- `LiveBinding` / `NotebookReference` *—1 upstream contract figure (by `target_contract` + `value_path`); *—0..1 `GoalState` goal (via `goal_ref`).
- All owned entities are scoped by `profile_id`; every read/write is authZ-checked server-side against the session identity (single-profile; no cross-profile access in this module).

## Consumed contracts (referenced, owned elsewhere)

`BudgetState`, `GoalState`, `CreditState` (Module 0); `RunwayForecast`, `SafeToActSignal` (Module 3, Cash Safety); `BillCalendar` (Module 4, Bills); `DocumentVault` (Module 12, Docs); `TripBudget` (Module 11, Travel); `TaskState` / `TaskCompletionEvents` (Module 7, Tasks). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage.

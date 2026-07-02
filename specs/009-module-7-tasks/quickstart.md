# Quickstart & Validation: Module 7 — Tasks & To-Dos

**Feature**: `009-module-7-tasks` | **Date**: 2026-06-29

A run/validation guide proving Tasks works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `GoalState`, `MerchantGraph`, `CashFlowForecast` (all `finos:spine/.../1.0.0`).
- Forward-declared `BillCalendar` (Module 4), `PaymentSchedule` (Module 5), and `SafeToActSignal` (Module 3) are wired **behind a feature check** — their consumers are feature-checked off until those providers ship; bill-/payment-linked and overdraft-precedence behaviors degrade gracefully (link `unavailable`, best-effort scheduling).
- Seeded fixtures: a `GoalState` goal node, a `MerchantGraph` merchant node, a `CashFlowForecast` with a known next payday + predicted-shortfall date, and a (stubbed) bill with an amount + due date.
- Toolchain per [platform-decisions.md](../_platform/platform-decisions.md) and [plan.md](./plan.md) Technical Context. Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:tasks-fixtures      # goal node, merchant node, cash-flow forecast, stub bill
```

## Validation by user story

### US1 — Money-aware tasks with live links (P1) 🎯 MVP

```bash
<pkg> test tasks/unit/link-resolver
<pkg> test tasks/integration/live-link
```

Expected:
- A task created from a bill or goal carries a **live link** (`entity_type` + `entity_id` + `source_contract` $id+version) — and stores **no** private copy of the money figure (SC-T-001).
- The displayed linked amount/due-date reflects the **current** contract value on re-read after the underlying contract changes (no stale local copy).
- The linked external value carries the source `FreshnessStamp`; a **stale money** value is flagged/withheld, not shown as current (SC-T-006).
- **Money pass-through fixture (mandatory)**: a linked bill amount of `123456` cents renders exactly `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA) — **no float drift**, no re-rounding by Tasks (SC-T-007, Money Correctness §).
- A goal-linked task shows time-to-goal context from `GoalState` (FR-X-004).
- A free-text task with no link saves as a plain unlinked to-do (graceful degradation; no money-aware behavior).
- A user-authored title renders **verbatim** in both locales (not translated); system labels/statuses render bilingually (no single-language leak, SC-T-007).

### US2 — Completion updates the linked entity's status, idempotently & audited (P1)

```bash
<pkg> test tasks/unit/completion-idempotency
<pkg> test tasks/integration/completion-writeback
```

Expected:
- Marking a bill-linked task complete updates the bill's status **through the owning module's contract** (0 direct cross-module writes, SC-T-002) and writes an append-only audit event (FR-X-007).
- **Idempotency fixture (mandatory)**: re-delivering the same completion (same `source_event_id`, `UNIQUE`) updates the linked entity and writes the audit event **at most once** — 0 double-applied status updates, 0 duplicate audit events, 0 double-advanced downstream streaks (SC-T-003).
- `TaskCompletionEvent.moved_money` is **const false**; grep the Tasks API surface — there is **no** money-movement endpoint (SC-T-004 / FR-X-003).
- A status write-back that fails/times out leaves the task in **`pending_sync`**, is retried with backoff, and is **not** shown as reconciled until the owning module confirms (US2 AS-4 / FR-X-012).
- An **orphaned-link** task (source entity deleted) completes with `writeback_outcome = no_op_orphaned` — no write-back.
- With `SafeToActSignal` overdraft risk present on a spend-implying task → the spend-implying completion is **held/flagged**, the Conflict Banner names both signals + Cash Safety precedence, and the plain "mark done" still works.

### US3 — Smart scheduling around paydays & due dates (P2)

```bash
<pkg> test tasks/unit/scheduling-deterministic
<pkg> test tasks/integration/scheduling
```

Expected:
- Given several tasks + a known next payday (`CashFlowForecast`) + bill due dates, pay-implying tasks are placed **after** the next projected inflow and **before** the predicted-shortfall window; placement carries `Reasoning` (which payday / which due date drove it, SC-T-008).
- **Deterministic-placement fixture (mandatory)**: fixed tasks + fixed payday + fixed due date → the **same** schedule every run (pure/deterministic, Money Correctness §).
- **Withhold fixture (mandatory)**: with `CashFlowForecast.freshness.is_stale = true` (or absent), payday-aware placement is **WITHHELD** (`placement_source = withheld_stale_forecast`) and the task falls back to its own due date or stays unscheduled — never a guessed payday (SC-T-005 / Constitution VI). There is **no** documented-default money path here.
- A missing bill due date (absent source contract) → best-effort placement from present inputs + Partial state surfaced — not dropped silently.
- A user's manual reschedule (`placement_source = manual`) is **respected** and not overwritten by auto-scheduling.

## Contract tests (mandatory — Principle VII / SC-T-010)

```bash
<pkg> test tasks/contract/consumed   # GoalState, MerchantGraph, CashFlowForecast (+ feature-checked BillCalendar, PaymentSchedule, SafeToActSignal)
<pkg> test tasks/contract/provided   # TaskState, TaskCompletionEvent
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken consumed schema **fails CI** and **disables** the dependent link/scheduling behavior (the task degrades to an unlinked item — version-skew behavior, SC-T-010). Forward-declared consumers fail closed once their provider ships with a different shape.

## Cross-cutting checks

- **Recommend/record-only (SC-T-004 / FR-X-003)**: grep the Tasks API surface — there is **no** money-movement endpoint; every action is a record or a user-confirmed status write-back, and `moved_money` is const false.
- **Audit trail (Principle VI / FR-X-007)**: each `TaskCompletionEvent` produces an append-only audit record, kept **separate** from debug logs; a denied cross-profile access is audited.
- **Redaction (FR-X-014)**: debug logs contain no task titles/notes (may carry merchant/amount hints), no linked amounts, and no PII.
- **Cross-profile authZ (SC-T-009 / Principle V)**: at the **API layer** (not UI), a request to read or complete another profile's task is denied against the session identity + Household `MemberScope`; a forged status write-back against an unowned link is denied; both denials are audited. 0 cross-profile exposures.
- **Graceful degradation (SC-T-011)**: with Bills (Module 4) / Pay (Module 5) not shipped, bill-/payment-linked tasks show `link_status = unavailable` and scheduling runs best-effort — no crash, no fabricated link value.
- **Performance (SC-010 / FR-X-015)**: module-switch into Tasks renders the cached `TaskState` projection in ≤ 300 ms; a cache miss / stale money value renders a flagged/withheld state rather than blocking.
- **Accessibility (SC-011 / FR-X-016)**: WCAG 2.1 AA; bilingual screen-reader labels on interactive elements; Dynamic Type + reduced-motion behaviors honored.
- **Notification restraint (SC-009)**: task reminders are emitted to the Inbox digest pipeline only; Tasks sends no standalone push.

## Done when

All user-story validations pass, the money pass-through fixture shows zero float drift, the idempotency-replay fixture applies exactly once, the stale-forecast fixture withholds payday-aware placement, all consumer+provider contract tests are green, and the cross-cutting checks hold.

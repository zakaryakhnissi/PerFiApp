# Phase 0 Research: Module 7 — Tasks & To-Dos

**Feature**: `009-module-7-tasks` | **Date**: 2026-06-29

Resolves the Tasks-specific design decisions the module depends on. Platform-stack choices (language/storage/mobile framework/auth/audit) are **inherited** from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are **not** re-litigated here. Tasks is a P3 connective layer (Constitution IX): the analysis is thorough, the surface is lean.

---

## 1. Module placement & boundary (Tasks owns no money source)

**Decision**: Tasks is a **read/record-only** connective module. It owns the `Task`, `TaskLink`, `TaskSchedule`, and `TaskCompletionEvent` entities and the `TaskState` / `TaskCompletionEvent` provided contracts. It owns **no** money source, valuation, FX, or recommendation engine; every money value it shows is read live from a consumed contract.

**Rationale**: Umbrella Module 7 description ("a connective convenience layer; valuable but not foundational") + Constitution IX (Simplicity/YAGNI). Keeping Tasks money-source-free means there is no float/rounding/FX surface to get wrong here — the only money-safety obligations are faithful pass-through and idempotent writes (spec → Money Correctness).

**Alternatives considered**: Let Tasks cache/compute linked amounts for offline display — **rejected**: it would create a private copy of a money figure that can drift from the source and bypass Fresh-or-Flagged (Constitution IV/VIII). Tasks reads the source contract and shows its `FreshnessStamp` instead.

---

## 2. Live link representation (reference, not value)

**Decision**: A `TaskLink` stores `entity_type` + `entity_id` + `source_contract` ($id+version) + `link_status`. The linked money/date value is fetched from `source_contract` at display time, never persisted in Tasks. Version skew or a deleted entity transitions the link to `unavailable`/`orphaned` rather than reading on a mismatched schema or a dead reference.

**Rationale**: FR-TASK-001 ("live links") + Principle VII (versioned contracts) + Integration-First (FR-X-001). Storing the contract id+version in the link makes version-skew detectable by the consumer contract test and lets the link fail closed (SC-T-010).

**Alternatives considered**: Store a denormalized snapshot of the linked entity — rejected (staleness/drift, violates SC-T-001). Link by id only (no contract ref) — rejected (cannot detect schema skew or route the write-back to the right contract).

---

## 3. Idempotent completion & status write-back

**Decision**: A completion carries a client-generated `source_event_id` persisted with a `UNIQUE` constraint. The status write-back goes through the **owning module's** contract operation (e.g. "mark bill handled"), authorized against the **link owner's** scope. Both the write-back and the append-only audit/completion event are keyed on `source_event_id` — replays are no-ops. A failed write-back enters `pending_sync` and is retried with backoff.

**Rationale**: FR-TASK-002 + umbrella Acceptance Scenario 4 (duplicate completion ⇒ at-most-once) + Constitution IV (idempotent, safe-to-retry) + platform-decisions §4 (idempotency keyed on `source_event_id`) and §6 (audit store). Cross-module status changes via a contract, never a direct cross-schema write (three-layer boundary, platform-decisions §3).

**Alternatives considered**: Direct cross-module DB write to flip a bill's status — rejected (violates the per-schema-role boundary and Principle VII). At-least-once without an idempotency key — rejected (double-applies status + double-counts Habits streaks).

---

## 4. Smart scheduling inputs & stale-input behavior

**Decision**: Scheduling reads **paydays/runway** from `CashFlowForecast` (`next inflow`, `runway_days`, `projected_lowest_on`, `shortfall_flag`) and **due dates** from `BillCalendar`/`PaymentSchedule`. Pay-implying tasks are placed after the next projected inflow and before the predicted-shortfall window. When `CashFlowForecast` is **stale/absent**, payday-aware placement is **withheld** (`placement_source = withheld_stale_forecast`), falling back to the task's own due date or leaving it unscheduled — never a guessed payday. User manual reschedules are respected over auto-scheduling.

**Rationale**: FR-TASK-003 + Constitution VIII (Fresh or Flagged: "no runway calculation on a multi-day-old balance") + VI (withhold-and-ask; there is **no** documented-default money path here because Tasks originates no money figure). The scheduling reasoning (which payday/due date) is attached per FR-X-006.

**Alternatives considered**: Guess a payday from calendar heuristics when the forecast is stale — rejected (guessing a money-derived input, Constitution VI/VIII). Recompute runway in Tasks from `AccountState` — rejected (duplicates spine logic, Integration-First single-source).

---

## 5. Cash Safety precedence for spend-implying tasks

**Decision**: Tasks consumes `SafeToActSignal` (Module 3) **directly behind a feature check**. A spend-implying task whose completion `SafeToActSignal` flags for overdraft risk has its spend-implying action **held/flagged** with the Conflict Banner (Cash Safety precedence, UX §10.4); the plain non-money "mark done" still works. Until Cash Safety ships, the consumer is wired but inert.

**Rationale**: Umbrella precedence rule ("every module that proposes spending checks `SafeToActSignal`"; safety signals override optimization signals) + phased delivery (Cash Safety is P1 but may land separately). Mirrors how Rewards wired `SafeToActSignal` ahead of Cash Safety.

**Alternatives considered**: Rely solely on the owning module to surface the conflict downstream — rejected (the conflict should be visible at the Task surface before the user navigates away). Block all spend-implying tasks until Cash Safety ships — rejected (Tasks is independently shippable per its Independent Test).

---

## 6. Forward-declared Bills/Pay dependencies (graceful degradation)

**Decision**: `BillCalendar` (Module 4) and `PaymentSchedule` (Module 5) are P2 modules **not yet authored**; their consumer clients are wired behind a feature check. Bill-/payment-linked tasks set `link_status = unavailable` and due-date scheduling runs best-effort on present inputs until those provider contracts are ratified (provisional $ids `finos:bills/BillCalendar/1.0.0`, `finos:pay/PaymentSchedule/1.0.0`). The umbrella spec is the authority for their names/owners.

**Rationale**: Constitution VII (never invent a contract with no provider) + FR-X-012 (graceful degradation). Wiring the consumer now with a feature check + pinned target version lets the consumer contract test fail closed once the provider ships with a different shape.

**Alternatives considered**: Author placeholder provider schemas for Bills/Pay here — rejected (those contracts belong to their own modules; inventing them violates the boundary). Omit bill/payment links entirely — rejected (they are core FR-TASK-001 link types; degrade gracefully instead).

---

## 7. Notification restraint (Inbox digest only)

**Decision**: Task reminders/nudges (e.g. a scheduled task is due) are emitted to the **Inbox digest pipeline** (Module 10) as events carrying `module_id`, `event_type`, `priority_tier`, bilingual short description, and `expires_at`. Tasks sends **no** standalone push notifications.

**Rationale**: UX §6 / SC-009 ("no other module may send standalone push notifications"; ≤2 money-related pushes/day owned by Inbox). Task reminders are typically `Important` (digest) or `Informational` (in-tab only).

**Alternatives considered**: Direct local notifications from Tasks — rejected (violates notification budget and the Inbox-owns-notifications rule).

---

## 8. Performance: ≤300 ms tab-switch

**Decision**: The Tasks tab renders from a locally cached, freshness-stamped `TaskState` projection; linked values are read from cached spine/module contract reads refreshed in the background. A cache miss or stale-beyond-threshold money value triggers a flagged/withheld state, not a blocking network fetch on the hot path.

**Rationale**: FR-X-015 / SC-010 (≤300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget (consistent with the platform pattern and the Rewards research §9). NEEDS-RATIFICATION NR-7 (real-device perf budget) is owned by Module 0.

**Alternatives considered**: Always-live fetch of every linked value on tab open — rejected (blows the 300 ms budget). Serve stale linked money silently to hit latency — rejected (violates Principle VIII).

---

## 9. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed contract (`GoalState`, `MerchantGraph`, `CashFlowForecast`; and forward-declared `BillCalendar`, `PaymentSchedule`, `SafeToActSignal` once ratified) and provider contract tests for each provided contract (`TaskState`, `TaskCompletionEvent`), running in CI (Pact, platform-decisions §6). Contracts semver'd with a deprecation window; version skew **disables** the dependent link/scheduling behavior.

**Rationale**: Principle VII + FR-X-011 + SC-T-010. A breaking change in a consumed schema fails the consumer test and degrades the link rather than reading on a mismatched schema (umbrella SC-012).

**Alternatives considered**: Integration tests against live modules only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (not blocking design)

- **Bills/Pay/Cash Safety provider schemas**: final $ids/versions of `BillCalendar`, `PaymentSchedule`, `SafeToActSignal` are set when those modules are authored; pin them in `contracts/consumed/README.md` and the consumer tests at that time (forward-declared today).
- **Status write-back operations**: the exact contract operation each owning module exposes to accept an idempotent status update ("mark bill handled", "acknowledge goal contribution") is confirmed per owning module; until exposed, completion records locally and enters `pending_sync` (spec Assumptions, US2 AS-4).
- **Staleness windows**: inherited from the source contracts' `FreshnessStamp` (Module 0 research NR-2, user-adjustable); Tasks defines none of its own.
- **Dormant-account retention / email-revocation purge**: merchant-linked enrichment from an email source obeys FR-X-013 / FR-X-019; exact windows set in the Module 0 PIA (NR-3, NR-6).
- **Real-device perf budget**: ≤300 ms profiled on mid-range Canadian devices (NR-7, Module 0).

---

description: "Task list for Module 7 — Tasks & To-Dos"
---

# Tasks: Module 7 — Tasks & To-Dos

**Input**: Design documents from `/specs/009-module-7-tasks/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [platform-decisions.md](../_platform/platform-decisions.md) / [plan.md](./plan.md)): TypeScript/Node NestJS backend + React Native (Expo) mobile; `@finos/money`/`@finos/format` for **display pass-through only** (Tasks owns no money math), integer cents on the wire; Prisma (`tasks` schema + RLS); Pact for contract tests; Jest; BullMQ for status-write-back retry. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create tasks module structure per plan: `backend/src/modules/tasks/{domain,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/tasks/{task-list,task-detail,create-link,schedule-view}`, `mobile/tests/`
- [ ] T002 Initialize the `TasksModule` (NestJS) + dependencies (`@finos/money`, `@finos/format`, Prisma, Pact, Jest, BullMQ) in `backend/src/modules/tasks/tasks.module.ts` and `backend/package.json`
- [ ] T003 [P] Configure lint/format incl. the **no-float money** rule + cross-module-import ban (dependency-cruiser) for the tasks module in `backend/.eslintrc`
- [ ] T004 [P] Configure Jest + fixture test harness (money pass-through, deterministic scheduling) in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`
- [ ] T006 [P] Define the `tasks` Prisma schema + migration (Task, TaskLink, TaskSchedule, append-only TaskCompletionEvent) with **no `float`/`double`/`real` column**, `source_event_id` `UNIQUE`, per-schema role + RLS on `profile_id` in `backend/prisma/tasks.schema.prisma` (platform-decisions §2/§5)

**Checkpoint**: Project builds; `tasks` schema migrates; test runner green on an empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 [P] Implement `FreshnessStamp` value object + `isStale` check (source, observed_at, threshold) re-exported from `finos:common/FreshnessStamp/1.0.0` in `backend/src/modules/tasks/domain/freshness.ts` (Principle VIII)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) from `finos:common/Reasoning/1.0.0` in `backend/src/modules/tasks/domain/reasoning.ts` (Principle VI)
- [ ] T009 [P] Implement append-only, immutable `TaskCompletionEvent` audit store (INSERT-only grant, kept separate from debug logs, `source_event_id` idempotency) in `backend/src/modules/tasks/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with PII + monetary-value redaction (task titles/notes + any linked amount redacted) in `backend/src/modules/tasks/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Implement money **display pass-through** helpers via `@finos/format` (read integer cents / decimal-string rate → en-CA `$1,234.56` / fr-CA `1 234,56 $`; **no** arithmetic, **no** re-rounding, **no** float) in `backend/src/modules/tasks/domain/money-display.ts` (Principle IV / FR-X-005)
- [ ] T012 Implement server-side cross-profile authZ + `profile_id` scoping guard (session identity + Household `MemberScope`, never a client-supplied id) in `backend/src/modules/tasks/api/authz.ts` (Principle V / FR-X-010)
- [ ] T013 [P] Implement consumed spine contract clients with version pinning + graceful degradation (timeouts/retries) in `backend/src/modules/tasks/contracts/consumed/` (`goal-state.ts`, `merchant-graph.ts`, `cash-flow-forecast.ts`) (Principle VII / FR-X-011/012)
- [ ] T014 [P] Implement **forward-declared** consumed clients behind a feature check (`bill-calendar.ts`, `payment-schedule.ts`, `safe-to-act.ts`) with pinned target versions — degrade to `link_status = unavailable` until providers ship in `backend/src/modules/tasks/contracts/consumed/` (research §6, SC-T-011)
- [ ] T015 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/tasks/contracts/provided/registry.ts` (Principle VII)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Money-aware tasks with live links (Priority: P1) 🎯 MVP

**Goal**: Create a task linked to a bill/merchant/budget/goal that displays the entity's **current** contract value + freshness (no private money copy), or a plain unlinked to-do.

**Independent Test**: Create a task from a bill (or goal), open it, confirm it shows the linked entity's current amount/due-date with a freshness stamp and updates when the underlying contract changes — without storing its own copy of the money figure.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T016 [P] [US1] Provider contract test for `TaskState` against `contracts/provided/task-state.schema.json` (incl. reference-only `link`, `link_status`, no money field) in `backend/tests/contract/task-state.provider.test.ts`
- [ ] T017 [P] [US1] Consumer contract tests for `GoalState` + `MerchantGraph` (live value + time-to-goal + bilingual merchant name) in `backend/tests/contract/link-consumers.test.ts`
- [ ] T018 [P] [US1] **Money pass-through fixture**: a linked bill amount of `123456` cents renders exactly `$1,234.56` (en-CA) / `1 234,56 $` (fr-CA), no float drift, no re-rounding, in `backend/tests/unit/money-display.test.ts` (SC-T-007 / Money Correctness §)
- [ ] T019 [P] [US1] Live-link freshness test: a stale **money** value is flagged/withheld (not shown current); a non-stale value renders with a Fresh chip, in `backend/tests/unit/link-freshness.test.ts` (FR-X-008 / SC-T-006)
- [ ] T020 [P] [US1] Reference-only link test: the linked money value is **read from `source_contract`**, never persisted in Tasks; changing the source changes the displayed value, in `backend/tests/unit/link-no-copy.test.ts` (SC-T-001)
- [ ] T021 [P] [US1] Bilingual/locale test: system labels/statuses render EN/FR (no single-language leak); user-authored titles render **verbatim** (not translated), in `backend/tests/unit/link-bilingual.test.ts` (SC-T-007)
- [ ] T022 [P] [US1] Orphaned-link transition test: source entity deleted → `link_status = orphaned`, task preserved as unlinked to-do, in `backend/tests/unit/orphaned-link.test.ts` (spec Edge Cases)
- [ ] T023 [P] [US1] Integration test: create a money-aware task and a free-text task end-to-end in `backend/tests/integration/live-link.test.ts`

### Implementation for User Story 1

- [ ] T024 [P] [US1] `Task` + `TaskLink` domain (status, priority, is_money_aware, reference-only link: entity_type/entity_id/source_contract/link_status — **no money field**) in `backend/src/modules/tasks/domain/task.ts`
- [ ] T025 [US1] Link-resolver service (live read of consumed contract by `source_contract`; version-skew → `unavailable`; deleted entity → `orphaned`; attach source `FreshnessStamp`; stale money flag/withhold) in `backend/src/modules/tasks/services/link-resolver.ts` (depends on T024, T013, T014)
- [ ] T026 [US1] Task service (create linked/unlinked task, read with live-resolved link values via pass-through display) in `backend/src/modules/tasks/services/task-service.ts`
- [ ] T027 [US1] Task API (record-only: create/link/list; **no** money-movement endpoint) with the authZ guard in `backend/src/modules/tasks/api/tasks.controller.ts`
- [ ] T028 [US1] Wire `TaskState` provided-contract output (tasks + link + schedule + sync_status + freshness) in `backend/src/modules/tasks/contracts/provided/task-state.ts`
- [ ] T029 [P] [US1] Mobile Task List + Task Detail + Create/Link screens (linked-entity chip + freshness, six-state matrix incl. Empty/Partial, verbatim titles, `@finos/format` money) in `mobile/src/features/tasks/{task-list,task-detail,create-link}/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Completion updates the linked entity's status, idempotently & audited (Priority: P1)

**Goal**: Checking off a money-aware task updates the linked entity's status via the owning module's contract — exactly once, audited, safe to retry — and moves **no** money.

**Independent Test**: Mark a bill-linked task complete; confirm the bill's status updates via the owning contract (not a direct write); re-deliver the same completion event and confirm the status update and audit event each occur **at most once**.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T030 [P] [US2] Provider contract test for `TaskCompletionEvent` (incl. `source_event_id`, `writeback_outcome`, `moved_money` const false, reference-only `link_ref`) in `backend/tests/contract/task-completion-event.provider.test.ts`
- [ ] T031 [P] [US2] **Idempotency-replay fixture**: a replayed completion (same `source_event_id`) applies the status write-back and writes the audit event **at most once** — 0 double-applied updates / duplicate audit events in `backend/tests/unit/completion-idempotency.test.ts` (FR-TASK-002 / SC-T-003 / FR-X-003)
- [ ] T032 [P] [US2] **No-money-movement test**: `moved_money` is const false on every completion; grep proves no money-movement endpoint exists, in `backend/tests/unit/no-money-movement.test.ts` (SC-T-004 / FR-X-003)
- [ ] T033 [P] [US2] Write-back outcome tests: `live` → `synced`; failure/timeout → `pending_sync` (retried, not shown reconciled); `orphaned` → `no_op_orphaned`; unlinked → `no_op_unlinked`, in `backend/tests/unit/writeback-outcomes.test.ts` (US2 AS-1/4 / FR-X-012)
- [ ] T034 [P] [US2] `SafeToActSignal` precedence test (feature-checked): spend-implying completion held/flagged + Conflict Banner data + Cash Safety precedence; plain "mark done" still allowed, in `backend/tests/unit/completion-safe-to-act.test.ts` (umbrella §10.4)
- [ ] T035 [P] [US2] Cross-profile **forged write-back** authZ test (API layer): a completion against an unowned link is denied against session identity + link-owner scope and **audited**, in `backend/tests/integration/cross-profile-completion-authz.test.ts` (SC-T-009 / Principle V)
- [ ] T036 [P] [US2] Integration test: complete a bill-linked task → status write-back via owning contract + audit event in `backend/tests/integration/completion-writeback.test.ts`

### Implementation for User Story 2

- [ ] T037 [P] [US2] `TaskCompletionEvent` domain (event_id, source_event_id, writeback_outcome, moved_money const false, reference-only link_ref, reasoning) in `backend/src/modules/tasks/domain/completion-event.ts`
- [ ] T038 [US2] Completion service (create idempotent completion keyed on `source_event_id`; route status write-back through the **owning module's** contract authorized against the **link owner's** scope; emit append-only audit event; replays no-op) in `backend/src/modules/tasks/services/completion-service.ts` (depends on T009, T012, T037)
- [ ] T039 [US2] Status-write-back retry worker (BullMQ; backoff; `pending_sync` until owning module confirms; idempotent) in `backend/src/modules/tasks/services/writeback-retry.ts` (FR-X-012)
- [ ] T040 [US2] Safe-to-act precedence integration (feature-checked until Cash Safety ships; hold/flag spend-implying completion, surface conflict) in `backend/src/modules/tasks/services/completion-safe-to-act.ts`
- [ ] T041 [US2] Completion API (record-only complete endpoint with `source_event_id`; **no** money movement) in `backend/src/modules/tasks/api/completion.controller.ts`
- [ ] T042 [US2] Wire `TaskCompletionEvent` provided contract (stream to Habits/Inbox/originating module — completion signal + link ref only, never raw amounts) in `backend/src/modules/tasks/contracts/provided/task-completion-event.ts`
- [ ] T043 [P] [US2] Mobile completion UX: Confirm-Action recap + Why layer for the status write-back (specific CTA "Mark rent handled" / "Marquer le loyer comme réglé"), `pending_sync` state, Conflict Banner on overdraft, in `mobile/src/features/tasks/task-detail/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Smart scheduling around paydays & due dates (Priority: P2)

**Goal**: Distribute tasks across suitable days factoring paydays (`CashFlowForecast`) and due dates (`BillCalendar`/`PaymentSchedule`); withhold payday-aware placement on stale/absent forecast; respect manual reschedules.

**Independent Test**: With several tasks + a known next payday + bill due dates, scheduling places pay-implying tasks after the next inflow and before the predicted-shortfall date; with a stale `CashFlowForecast` it withholds payday-aware placement instead of guessing.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T044 [P] [US3] Consumer contract test for `CashFlowForecast` (next payday, runway_days, projected_lowest, shortfall_flag, freshness) in `backend/tests/contract/cash-flow-forecast.consumer.test.ts`
- [ ] T045 [P] [US3] **Deterministic-placement fixture**: fixed tasks + fixed payday + fixed due date → the **same** schedule every run, in `backend/tests/unit/scheduling-deterministic.test.ts` (Money Correctness § / FR-TASK-003)
- [ ] T046 [P] [US3] **Withhold-on-stale fixture**: `CashFlowForecast.freshness.is_stale = true` (or absent) → payday-aware placement **WITHHELD** (`placement_source = withheld_stale_forecast`), fall back to due date / unscheduled, never guessed, in `backend/tests/unit/scheduling-withhold.test.ts` (SC-T-005 / FR-X-008 / Constitution VI)
- [ ] T047 [P] [US3] Placement reasoning test: payday-aware placement carries `Reasoning` (which payday / which due date), bilingual rationale, in `backend/tests/unit/scheduling-reasoning.test.ts` (SC-T-008 / FR-X-006)
- [ ] T048 [P] [US3] Partial-input + manual-override tests: missing due date → best-effort + Partial state surfaced; user manual reschedule (`manual`) not overwritten by auto-scheduling, in `backend/tests/unit/scheduling-partial-manual.test.ts` (US3 AS-4/5)
- [ ] T049 [P] [US3] Integration test: schedule several tasks against forecast + due dates in `backend/tests/integration/scheduling.test.ts`

### Implementation for User Story 3

- [ ] T050 [P] [US3] `TaskSchedule` domain (scheduled_date, placement_source incl. `withheld_stale_forecast`, reasoning, freshness) in `backend/src/modules/tasks/domain/task-schedule.ts`
- [ ] T051 [US3] Scheduling service (pure/deterministic: place pay-implying tasks after next inflow + before predicted shortfall; **withhold** payday-aware placement on stale/absent `CashFlowForecast`; respect `manual`; best-effort on partial inputs; attach `Reasoning`) in `backend/src/modules/tasks/services/scheduling.ts` (depends on T013, T050)
- [ ] T052 [US3] Scheduling API (record-only schedule/reschedule endpoint) in `backend/src/modules/tasks/api/schedule.controller.ts`
- [ ] T053 [P] [US3] Mobile Schedule View (tasks across days vs paydays/due dates; Withheld Card on stale forecast with Refresh CTA; Why layer on placements) in `mobile/src/features/tasks/schedule-view/`

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T054 [P] Notification restraint: emit task-reminder events (module_id, event_type, priority_tier, bilingual short description, expires_at) to the **Inbox digest** pipeline only — **no** standalone push from Tasks, in `backend/src/modules/tasks/services/inbox-emitter.ts` (SC-009 / UX §6)
- [ ] T055 [P] API-layer IDOR / horizontal-priv-esc authorization test for **read** of another profile's task (server-side, not UI), denied access audited, in `backend/tests/integration/cross-profile-read-authz.test.ts` (SC-T-009 / Principle V)
- [ ] T056 [P] Verify log redaction (no task titles/notes, no linked amounts, no PII) + audit-trail completeness/separation across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T057 [P] Email-revocation / dormant-retention cascade test: merchant-linked email-sourced enrichment orphans + is purged within the window (FR-X-013/019), in `backend/tests/integration/link-purge.test.ts` (threat model)
- [ ] T058 [P] Bilingual + locale-format verification (EN/FR system strings, fr-CA `1 234,56 $` / `28 juin 2026`, verbatim user titles) and WCAG 2.1 AA bilingual screen-reader labels, Dynamic Type + reduced-motion, in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016)
- [ ] T059 [P] Performance check: cached `TaskState` module-switch ≤ 300 ms; stale/cache-miss → flagged/withheld state, not a blocking fetch, in `mobile/tests/perf-tasks.test.ts` (FR-X-015 / SC-010)
- [ ] T060 [P] Version-skew test: a bumped/broken consumed schema fails the consumer contract test and **disables** the dependent link/scheduling behavior (degrades to unlinked), in `backend/tests/contract/version-skew.test.ts` (SC-T-010 / SC-012)
- [ ] T061 Threat-model mitigation verification: confirm no money-movement endpoint exists; server-side cross-profile authZ + forged-write-back denial enforced everywhere; `moved_money` const false (spec Threat Model)
- [ ] T062 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory money pass-through / idempotency / withhold fixtures + consumer+provider contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (freshness, reasoning, audit, redaction, money-display pass-through, authZ, consumed-contract clients incl. feature-checked forward-declared, provided-contract registry).
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US2 (completion/write-back) builds on US1's `Task`/`TaskLink` domain — sequence US2 after US1.
  - US3 (scheduling) consumes `CashFlowForecast` and operates on tasks from US1 — sequence US3 after US1; independent of US2.
- **Polish (Phase 6)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T007–T011, T013, T014, T015 in parallel (T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 must land first; US2 and US3 can then be staffed in parallel by different developers (both depend on US1, not on each other).

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T016 TaskState provider contract test
T017 GoalState + MerchantGraph consumer contract tests
T018 123456¢ money pass-through fixture (no float drift)
T019 live-link freshness (stale money flagged/withheld)
T020 reference-only link (no private money copy)
T021 bilingual system strings / verbatim user titles
T022 orphaned-link transition
# Then domain models [P]:
T024 Task + TaskLink domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (money-aware task with live-linked value, freshness, no private copy, pass-through fixture exact) → demo.

### Incremental Delivery
US1 (MVP) → US2 (idempotent audited completion + write-back) → US3 (smart scheduling) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Tasks owns **no** money math: the only money-safety properties are faithful **pass-through** (no float, no re-rounding — fixture T018) and **idempotent** state writes (fixture T031). There is **no** documented-default money path — stale money inputs always withhold (fixture T046).
- Record-only: no task creates a money-movement endpoint; `moved_money` is const false (T032, T061 verify).
- Forward-declared `BillCalendar`/`PaymentSchedule`/`SafeToActSignal` are wired behind a feature check (T014) and degrade gracefully (T060 covers version-skew fail-closed).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

---

description: "Task list for Module 13 — Workspace & Playbooks"
---

# Tasks: Module 13 — Workspace & Playbooks

**Input**: Design documents from `/specs/015-module-13-workspace/`

**Prerequisites**: plan.md, spec.md (US1–US4), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [plan.md](./plan.md) / [platform-decisions.md](../_platform/platform-decisions.md)): TypeScript/Node + NestJS (Fastify) backend, Prisma over PostgreSQL 16 (`workspace` schema + RLS), React Native (Expo) mobile; `@finos/format` for locale rendering (Workspace performs **no** money arithmetic — SC-W-005); Pact for contract tests; Jest + React Native Testing Library. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2 → P3) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US4 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create workspace module structure per plan: `backend/src/modules/workspace/{domain,reference,provenance,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/workspace/{playbooks,notebook}`, `mobile/tests/`
- [ ] T002 Initialize `WorkspaceModule` (NestJS) + dependencies (`@finos/format`, `@finos/contract-common` for `FreshnessStamp`/`Reasoning`, Pact, Jest) wired into the monolith; create the `workspace` Postgres schema + per-schema role in `backend/prisma/schema.prisma`
- [ ] T003 [P] Configure lint/format (ESLint + Prettier) for the module in `backend/.eslintrc`, including the **no-money-arithmetic** boundary rule for `modules/workspace/` (bans `+`/`-`/`*` on `*_cents` and any `@finos/money` arithmetic import) (SC-W-005)
- [ ] T004 [P] Configure Jest + the provenance-key + freshness test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite; the no-money-arithmetic lint rule is active.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 [P] Implement `FreshnessStamp` consumption + `resolution_state` evaluation (live / stale / withheld / unavailable; stale **money** ⇒ withheld) in `backend/src/modules/workspace/reference/freshness.ts` (Principle VIII)
- [ ] T007 [P] Implement render-only money typing + locale-render helper (integer `*_cents` typed exactly as upstream, decimal-string rates; **no arithmetic**; renders via `@finos/format`) in `backend/src/modules/workspace/reference/render.ts` (Principle IV/II / SC-W-005)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) wiring for action-proposing steps in `backend/src/modules/workspace/domain/reasoning.ts` (Principle VI)
- [ ] T009 [P] Implement append-only, immutable `AuditEvent` writer (playbook lifecycle / generation / reference events), kept separate from debug logs, in `backend/src/modules/workspace/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with PII + monetary-value redaction on render/generation paths in `backend/src/modules/workspace/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 Implement server-side single-profile authZ guard + `profile_id` scoping (session identity, never client-supplied id) + RLS policy on workspace tables in `backend/src/modules/workspace/api/authz.ts` (Principle V / platform §5)
- [ ] T012 [P] Implement consumed-contract clients with version pinning + graceful degradation (timeouts/retries; feature-check not-yet-shipped providers) in `backend/src/modules/workspace/contracts/consumed/` (`budget-state.ts`, `goal-state.ts`, `credit-state.ts`, `runway-forecast.ts`, `safe-to-act.ts`, `bill-calendar.ts`, `document-vault.ts`, `trip-budget.ts`, `task-state.ts`) (Principle VII / FR-X-011/012)
- [ ] T013 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/{playbooks,notebook-references}.schema.json`) with version-skew disable behavior in `backend/src/modules/workspace/contracts/provided/registry.ts` (Principle VII / SC-W-009)
- [ ] T014 [P] Implement stable provenance-key derivation (`hash({instance_id, step_id, generation_kind})`, pure/deterministic) in `backend/src/modules/workspace/provenance/provenance-key.ts` (Constitution IV / SC-W-003)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Life-event playbook wired to live data (Priority: P1) 🎯 MVP

**Goal**: Start a Canada-specific bilingual playbook whose steps render live FinOS figures by reference (runway, bills, goal progress), each freshness-stamped, with all six UI states.

**Independent Test**: Start the "Moving" playbook with a connected spine; ≥1 step renders a live runway-days + bill-total figure carrying a `FreshnessStamp`; no step shows a hard-coded money number; a stale money figure withholds; a missing source degrades to Partial/Empty.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T015 [P] [US1] Provider contract test for `Playbooks` against `contracts/provided/playbooks.schema.json` in `backend/tests/contract/playbooks.provider.test.ts`
- [ ] T016 [P] [US1] Consumer contract tests for `RunwayForecast`, `BillCalendar`, `GoalState` in `backend/tests/contract/playbook-consumers.test.ts`
- [ ] T017 [P] [US1] Money fixture (display-by-reference): a `LiveBinding` renders the **upstream integer-cents** figure verbatim with **0** hard-coded/copy-pasted numbers, in `backend/tests/unit/live-binding-render.test.ts` (FR-WS-001 / SC-W-001/005)
- [ ] T018 [P] [US1] Freshness/withhold fixture: a stale **money** runway/bill figure resolves `withheld` (not `live`), a stale non-money figure resolves `stale`, in `backend/tests/unit/live-binding-freshness.test.ts` (SC-W-002 / FR-X-008)
- [ ] T019 [P] [US1] Locale fixture: the same integer-cents figure renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA), date `28 juin 2026`; step title/body bilingual with no single-language leak, in `backend/tests/unit/playbook-locale.test.ts` (SC-W-006 / FR-X-005)
- [ ] T020 [P] [US1] Missing-source degradation: a step whose source contract is absent renders Partial/Empty with a "Connect {module}" affordance, never zero-filled, in `backend/tests/unit/step-degradation.test.ts` (FR-X-012)
- [ ] T021 [P] [US1] Integration test: start the "Moving" playbook end-to-end against the seeded spine in `backend/tests/integration/playbook-moving.test.ts`

### Implementation for User Story 1

- [ ] T022 [P] [US1] `PlaybookTemplate` + `StepSpec`/`BindingSpec` domain (versioned dataset shape) in `backend/src/modules/workspace/domain/playbook-template.ts`
- [ ] T023 [P] [US1] `PlaybookInstance` + `PlaybookStep` + `LiveBinding` domain in `backend/src/modules/workspace/domain/playbook.ts`
- [ ] T024 [P] [US1] Curated bilingual Canada template dataset loader (Moving, Job change, New baby, Immigration/newcomer) — versioned, no code change to add templates — in `backend/src/modules/workspace/services/template-loader.ts` (research §5)
- [ ] T025 [US1] Reference-resolution service (typed pointer → upstream figure via consumed clients; assigns `resolution_state`; render-only cache; **no money arithmetic**) in `backend/src/modules/workspace/reference/resolver.ts` (depends on T006, T007, T012)
- [ ] T026 [US1] Playbook-runner service (instantiate template, resolve step live bindings, six-state per step, `playbook_started` audit) in `backend/src/modules/workspace/services/playbook-runner.ts`
- [ ] T027 [US1] Wire `Playbooks` provided-contract output in `backend/src/modules/workspace/contracts/provided/playbooks.ts`
- [ ] T028 [US1] Playbook read API (recommend-only; no money-movement endpoint) in `backend/src/modules/workspace/api/playbooks.ts`
- [ ] T029 [P] [US1] Mobile Playbook screen (live step figures, freshness chips, six-state matrix, "Connect {module}" CTA) in `mobile/src/features/workspace/playbooks/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Living notebook references that never go stale (Priority: P1)

**Goal**: A free-form notebook whose embedded references to FinOS figures stay current automatically, always show freshness, and resolve to explicit Unavailable when their target is gone.

**Independent Test**: Insert a runway `NotebookReference`; change the underlying value/freshness; the page re-renders the new value + freshness chip with no manual edit; a stale money value flags/withholds; a deleted target resolves Unavailable.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T030 [P] [US2] Provider contract test for `NotebookReferences` against `contracts/provided/notebook-references.schema.json` in `backend/tests/contract/notebook-references.provider.test.ts`
- [ ] T031 [P] [US2] Consumer contract test for `BudgetState` / `GoalState` (notebook-referenced figures) in `backend/tests/contract/notebook-consumers.test.ts`
- [ ] T032 [P] [US2] Auto-refresh fixture: changing the underlying figure (or its freshness) re-renders the reference with no manual edit, in `backend/tests/unit/notebook-autorefresh.test.ts` (FR-WS-002 / SC-W-001)
- [ ] T033 [P] [US2] Money locale fixture (display-by-reference): one integer-cents reference renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA) from the same cached value, in `backend/tests/unit/notebook-locale.test.ts` (SC-W-006)
- [ ] T034 [P] [US2] Reference-resolution-failure fixture: deleted/archived/revoked/version-skewed target resolves `unavailable` (never a stale cached number, never a blank) + `reference_unavailable` audit event, in `backend/tests/unit/notebook-unavailable.test.ts` (SC-W-010 / FR-X-008)
- [ ] T035 [P] [US2] Reference-creation idempotency: re-embedding the same `{page_id, target_contract, value_path}` does not duplicate, in `backend/tests/unit/notebook-idempotency.test.ts` (FR-X-003)
- [ ] T036 [P] [US2] Integration test: notebook page with a live reference end-to-end in `backend/tests/integration/notebook-references.test.ts`

### Implementation for User Story 2

- [ ] T037 [P] [US2] `NotebookPage` + `NotebookReference` domain (render-only cache + resolution_state; bilingual labels) in `backend/src/modules/workspace/domain/notebook.ts`
- [ ] T038 [US2] Notebook service (page CRUD; user free-text stored verbatim, not translated; idempotent reference creation per `{page_id, target}`; reference resolution via the shared resolver) in `backend/src/modules/workspace/services/notebook.ts` (depends on T025 resolver)
- [ ] T039 [US2] Wire `NotebookReferences` provided-contract output in `backend/src/modules/workspace/contracts/provided/notebook-references.ts`
- [ ] T040 [US2] Notebook API (recommend-only; reference embed/resolve; no money-movement endpoint) in `backend/src/modules/workspace/api/notebook.ts`
- [ ] T041 [P] [US2] Mobile Notebook screen (free-text editor, inline live references + freshness chips, Unavailable state, six-state matrix) in `mobile/src/features/workspace/notebook/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Idempotent task/goal generation from playbook steps (Priority: P2)

**Goal**: A playbook step can generate a task or goal **proposal**; replays/double-taps/concurrency never duplicate; goals flow through the Spine goal service (Workspace never writes a money value).

**Independent Test**: Run a step generating a task and a goal; re-run the identical step; exactly one task and one goal exist for that step (keyed on provenance id); the second run is a no-op returning existing references.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T042 [P] [US3] Provenance-key determinism fixture: `hash({instance_id, step_id, generation_kind})` is stable across runs/restarts, in `backend/tests/unit/provenance-key.test.ts` (SC-W-003)
- [ ] T043 [P] [US3] Generation idempotency fixture: re-running a step yields exactly one task + one goal (UNIQUE provenance key); second run returns existing references, in `backend/tests/unit/generation-idempotency.test.ts` (FR-WS-001 / Constitution IV)
- [ ] T044 [P] [US3] Concurrency fixture: two concurrent generation requests for the same step admit exactly one materialization (no double-apply), in `backend/tests/unit/generation-concurrency.test.ts` (Constitution IV)
- [ ] T045 [P] [US3] Consumer contract test for `TaskState`/`TaskCompletionEvents` (completion reflected back into steps) + goal materialization via Spine goal service, in `backend/tests/contract/generation-consumers.test.ts`
- [ ] T045a [P] [US3] Consumer contract tests for the remaining consumed contracts so SC-W-009 holds (100% consumed covered): `CreditState` (`finos:spine/CreditState/1.0.0`), `SafeToActSignal` (`finos:cashsafety/SafeToActSignal/1.0.0`), `DocumentVault` (`finos:lifeadmin/DocumentVault/1.0.0`), `TripBudget` (`finos:travel/TripBudget/1.0.0`) in `backend/tests/contract/remaining-consumers.test.ts` (Principle VII / SC-W-009)
- [ ] T046 [P] [US3] Integration test: step generates task + goal, re-run is a no-op, downstream stub records exactly one of each, in `backend/tests/integration/generation-idempotency.test.ts`

### Implementation for User Story 3

- [ ] T047 [P] [US3] `GeneratedItem` domain (provenance_id UNIQUE, generation_kind, materialization_state, downstream refs) in `backend/src/modules/workspace/domain/generated-item.ts`
- [ ] T048 [US3] Idempotent generation guard (UNIQUE on provenance_id; no-op returns existing; safe under concurrency) in `backend/src/modules/workspace/provenance/generation-guard.ts` (depends on T014)
- [ ] T049 [US3] Generation service (propose task to Tasks Module 7; propose goal to Spine goal service — **never** writes a goal balance/money value; `task_generated`/`goal_proposed` audit) in `backend/src/modules/workspace/services/generation.ts`
- [ ] T050 [US3] Reflect `TaskCompletionEvents` back into step state (Workspace does not own/override the task lifecycle) in `backend/src/modules/workspace/services/task-sync.ts`
- [ ] T051 [US3] Extend `Playbooks` provided contract output with `steps[].generated[]` provenance + downstream refs in `backend/src/modules/workspace/contracts/provided/playbooks.ts`

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Playbook progress, snooze, and completion (Priority: P3)

**Goal**: Work a playbook over time — mark steps done, snooze to a future date, see progress, complete the playbook with an audit event; re-opened steps re-render live (no frozen snapshots).

**Independent Test**: Mark several steps done and snooze one to a future date; progress reflects only completed steps; the snoozed step reappears after its date; completing all steps writes a `playbook_completed` audit event.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T052 [P] [US4] Snooze/progress fixture: progress reflects only `done` steps; a snoozed step reappears at/after `snoozed_until`, in `backend/tests/unit/playbook-progress.test.ts`
- [ ] T053 [P] [US4] Completion audit fixture: completing all required steps writes a `playbook_completed` append-only event, in `backend/tests/unit/playbook-completion-audit.test.ts` (SC-W-012 / FR-X-007)
- [ ] T054 [P] [US4] Re-open liveness fixture: a completed step's referenced figure re-renders **live** (not a frozen stale snapshot) when re-opened, in `backend/tests/unit/playbook-reopen-live.test.ts`
- [ ] T055 [P] [US4] Integration test: full lifecycle (done/snooze/complete) end-to-end in `backend/tests/integration/playbook-lifecycle.test.ts`

### Implementation for User Story 4

- [ ] T056 [US4] Lifecycle service (mark done, snooze with `snoozed_until`, progress computation, completion + `playbook_completed` audit; re-resolve bindings live on re-open) in `backend/src/modules/workspace/services/playbook-lifecycle.ts`
- [ ] T057 [P] [US4] Mobile playbook lifecycle UI (step done/snooze controls, progress indicator, completion state) in `mobile/src/features/workspace/playbooks/`

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T058 [US1] Conflict precedence: a spend-implying step conflicting with `SafeToActSignal` surfaces the Conflict Banner, sets `safe_to_act_deferred = true` + step `overridden`, Cash Safety wins; feature-checked until Cash Safety ships, in `backend/src/modules/workspace/services/conflict.ts` + `backend/tests/unit/conflict-precedence.test.ts` (SC-W-008)
- [ ] T059 [US1] Confirm-Action + Recommendation Card for any money-action step (Why layer with referenced inputs + bilingual reasoning; exact-cents impact by reference; "not regulated financial advice" disclaimer; verb+object CTA; never auto-executes) in `mobile/src/features/workspace/playbooks/` + `backend/tests/unit/money-action-step.test.ts` (SC-W-004/007 / FR-X-003/006)
- [ ] T060 [P] No-money-computation gate: assert **0** monetary arithmetic operations in `modules/workspace/` (lint + test), in `backend/tests/unit/no-money-arithmetic.test.ts` (SC-W-005 / Principle IV)
- [ ] T061 [P] Recommend-only gate: assert no money-movement endpoint and no goal-balance write across the Workspace API surface, in `backend/tests/integration/recommend-only.test.ts` (SC-W-004 / FR-X-003)
- [ ] T062 [P] Single-profile authZ: API-layer IDOR / cross-profile-access test (server-side, session identity, not UI) — denied cross-profile reads are audited, in `backend/tests/integration/session-scoped-authz.test.ts` (Principle V / platform §5)
- [ ] T063 [P] Verify log redaction (no PII/monetary leak) + audit-trail completeness across render/generation/reference paths in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / SC-W-012)
- [ ] T064 [P] Deletion cascade + dormant retention: notebook content + provenance records purged within 7 days (FR-X-013) and dormant-account anonymization (FR-X-019), incl. email-sourced reference revocation cascade, in `backend/tests/integration/deletion-retention.test.ts`
- [ ] T065 [P] Bilingual + locale-format verification (EN/FR chrome/template strings, fr-CA `1 234,56 $`/dates, verbatim user free-text) and WCAG 2.1 AA bilingual screen-reader labels in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016)
- [ ] T066 [P] Performance check: cached playbook/notebook shell module-switch ≤ 300 ms; stale figure → flagged/withheld state, not blocking fetch, in `mobile/tests/perf-workspace.test.ts` (FR-X-015 / SC-W-011)
- [ ] T067 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + display-by-reference money fixtures + provenance-key fixture + 9 consumer / 2 provider contract tests green + no-money-arithmetic gate)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (freshness/resolution, render-only money typing, reasoning, audit, redaction, authZ/RLS, consumed-contract clients, provided-contract registry, provenance-key).
- **User Stories (Phases 3–6)** → all depend on Foundational; then independently testable.
  - US2 (notebook) reuses US1's reference-resolution service (T025) — sequence the shared resolver in US1, then US2 builds on it; both are P1 and can otherwise proceed in parallel.
  - US3 (generation) extends US1's `Playbooks` contract output (T051 builds on T027) — sequence US3 after US1.
  - US4 (lifecycle) extends US1's playbook services — sequence after US1.
- **Polish (Phase 7)** → depends on the targeted stories (conflict + money-action on US1; gates span all).

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → reference/provenance helpers → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T006–T010, T012, T013, T014 in parallel (T011 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 and US2 can be staffed in parallel by different developers (US2 waits only on the shared resolver T025); US3 and US4 sequence after their US1 dependencies.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T015 Playbooks provider contract test
T016 RunwayForecast/BillCalendar/GoalState consumer contract tests
T017 display-by-reference money fixture (0 hard-coded numbers)
T018 freshness/withhold fixture
T019 locale fixture (en-CA / fr-CA)
T020 missing-source degradation
# Then domain models [P]:
T022 PlaybookTemplate domain
T023 PlaybookInstance/Step/LiveBinding domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (start "Moving" playbook; ≥1 live freshness-stamped figure; 0 hard-coded money; stale money withholds) → demo.

### Incremental Delivery
US1 (MVP playbook) → US2 (living notebook) → US3 (idempotent generation) → US4 (lifecycle) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- **No money math in Workspace** (SC-W-005 / Principle IV): the no-money-arithmetic lint rule (T003) + gate (T060) guard against any cent-slippage being introduced in this orchestration layer; all monetary figures are read by reference and rendered via `@finos/format`.
- Recommend-only: no task creates a money-movement endpoint or a goal-balance write (T061 verifies).
- Idempotency: generation is keyed on the stable provenance id (T014 / T048); fixtures T042–T044 guard against duplicates under replay/concurrency.
- Threat model: **not required** here (single-profile; no credentials/tokens/cross-user data) — see plan.md Constitution Check; T062 still proves server-side session-scoped authZ.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

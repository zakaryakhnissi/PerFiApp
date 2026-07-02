---

description: "Task list for Module 9 — Focus & Mental Health"
---

# Tasks: Module 9 — Focus & Mental Health

**Input**: Design documents from `/specs/011-module-9-focus/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [platform-decisions.md](../_platform/platform-decisions.md), restated in [plan.md](./plan.md) — NOT re-decided here): TypeScript/NestJS backend + React Native (Expo) mobile; `@finos/format` for en-CA/fr-CA rendering and `@finos/money` types for pass-through cents (Focus does **no** money math); Prisma over the `focus` Postgres schema + RLS; Pact for contract tests; Jest. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order — all three are P3; sequenced US1 → US2 → US3 per spec) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create focus module structure per plan: `backend/src/modules/focus/{domain,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/focus/{stressor-list,stress-pack,wind-down,crisis-signpost}`, `mobile/tests/`
- [ ] T002 Register `FocusModule` NestJS bounded context + `focus` Prisma schema (per-schema role + RLS keyed on `auth.uid()`), no money columns owned beyond pass-through display cents, in `backend/src/modules/focus/focus.module.ts` and `backend/prisma/focus.schema.prisma` (platform-decisions §2/§3)
- [ ] T003 [P] Configure lint/format + `no-restricted-imports` boundary (no cross-module imports; no raw `toLocaleString`/float money) in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 [P] Implement `StressorRef` + freshness/withhold helper (`money_input_state` derivation: `is_stale` money input ⇒ `stale_withheld` + null figure; absent source ⇒ `absent`) in `backend/src/modules/focus/domain/stressor-ref.ts` (Principle VIII / FR-X-008)
- [ ] T007 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr; no free-text distress content) in `backend/src/modules/focus/domain/reasoning.ts` (Principle VI / FR-X-014)
- [ ] T008 [P] Implement append-only, immutable `AuditEvent` store (session + action events), kept separate from debug logs, keyed on `source_event_id` (UNIQUE), in `backend/src/modules/focus/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T009 [P] Implement structured logging with PII + monetary-value + **well-being-signal** redaction in `backend/src/modules/focus/services/logging.ts` (Principle V / FR-X-014)
- [ ] T010 [P] Implement `@finos/format` binding for en-CA/fr-CA money/percent/date rendering of pass-through cents (no ad-hoc formatting, no float) in `backend/src/modules/focus/domain/format.ts` (Principle II / FR-X-005)
- [ ] T011 Implement server-side **private-by-default** authZ + `profile_id` scoping guard — session identity, never client-supplied id; well-being content excluded from every cross-member view regardless of `MemberScope` — in `backend/src/modules/focus/api/authz.ts` (Principle V / FR-FOC-005 / FR-HH-001)
- [ ] T012 [P] Implement consumed contract clients with version pinning + graceful degradation (an absent/skewed source contributes no stressors) in `backend/src/modules/focus/contracts/consumed/` (`bill-calendar.ts`, `runway-forecast.ts`, `goal-state.ts`, `credit-state.ts`, `safe-to-act.ts` feature-checked) (Principle VII / FR-X-011/012)
- [ ] T013 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/wellbeing-action.schema.json`) in `backend/src/modules/focus/contracts/provided/registry.ts` (Principle VII)
- [ ] T014 [P] Load curated, versioned, bilingual static datasets — crisis-resource signpost + stress-pack/wind-down support scripts (EN/FR parity is a CI gate; no single-language leak) in `backend/src/modules/focus/services/content-dataset.ts` (research OI-1/OI-2 / FR-X-005)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Money-Stress Pack pairs support with a concrete linked action (Priority: P3) 🎯 MVP

**Goal**: A stress pack about a specific stressor presents short support content AND ends in exactly one recommend-only `WellbeingAction` linked by typed reference to the underlying entity; idempotent on retry; non-money fallback when the money input is stale.

**Independent Test**: With ≥1 stressor source connected (a `BillCalendar` with an overdue bill), start a stress pack and confirm the session both presents support content AND produces exactly one `WellbeingAction` linked to that bill, recommend-only, bilingual, with a freshness stamp.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T015 [P] [US1] Provider contract test for `WellbeingAction` against `contracts/provided/wellbeing-action.schema.json` (recommend-only, typed `stressor`, `informational_only=true`, idempotency_key present) in `backend/tests/contract/wellbeing-action.provider.test.ts`
- [ ] T016 [P] [US1] Consumer contract test for `BillCalendar` (due date + amount + status) in `backend/tests/contract/bill-calendar.consumer.test.ts`
- [ ] T017 [P] [US1] Action-pairing test: a completed pack with a stressor yields **exactly one** `WellbeingAction` linked by typed `entity_ref` (never free-text) in `backend/tests/unit/stress-pack-action.test.ts` (FR-FOC-001 / SC-F-001)
- [ ] T018 [P] [US1] **Stale-money fixture** (mandatory): stale `RunwayForecast`/`BillCalendar` figure → `money_input_state=stale_withheld`, `money_figure_cents=null`, `action_type=refresh_data`, support still offered (never asserts stale figure as fresh) in `backend/tests/unit/stale-money-fallback.test.ts` (FR-X-008 / SC-F-005)
- [ ] T019 [P] [US1] **Locale fixture** (mandatory): the same provider cents render `1 234,56 $` (fr-CA) and `$1,234.56` (en-CA); action/support content bilingual with no single-language leak in `backend/tests/unit/locale-passthrough.test.ts` (FR-X-005 / SC-F-006)
- [ ] T020 [P] [US1] **Idempotency fixture** (mandatory): re-run / re-submit for the same `(stressor_entity_ref, session_id)` yields at most one `WellbeingAction`/task (UNIQUE constraint) in `backend/tests/unit/action-idempotency.test.ts` (FR-X-003 / SC-F-003)
- [ ] T021 [P] [US1] Audit + recommend-only test: confirmation writes one append-only `wellbeing_action_confirmed` event; no task created without confirmation; no money-movement path in `backend/tests/unit/audit-recommend-only.test.ts` (Principle VI / FR-FOC-004 / SC-F-004)
- [ ] T022 [P] [US1] Integration test: start stress pack → propose → confirm → Tasks dispatch end-to-end in `backend/tests/integration/stress-pack.test.ts`

### Implementation for User Story 1

- [ ] T023 [P] [US1] `FocusSession` (type=`stress_pack`, structured metadata only — no free-text) + `WellbeingAction` domain (status machine, withhold guard forcing `refresh_data`) in `backend/src/modules/focus/domain/session.ts` and `backend/src/modules/focus/domain/wellbeing-action.ts` (data-model)
- [ ] T024 [US1] Stressor-identification (single source) service: derive a `StressorRef` from `BillCalendar`, attach money figure as-provided with freshness, withhold on stale in `backend/src/modules/focus/services/stressor-identification.ts` (FR-FOC-003) — depends on T006
- [ ] T025 [US1] Session service (`stress_pack`): pair support content with exactly one proposed `WellbeingAction`; non-money fallback on stale input in `backend/src/modules/focus/services/session.ts` (FR-FOC-001) — depends on T023, T024
- [ ] T026 [US1] WellbeingAction service: idempotent worry-to-action conversion keyed on `(stressor_entity_ref, session_id)`; dispatch `create_task`/`create_goal` request to Tasks/Spine **only on confirmation**; audited in `backend/src/modules/focus/services/wellbeing-action.ts` (FR-FOC-004 / FR-X-003) — depends on T008, T023
- [ ] T027 [US1] Wire `WellbeingAction` provided contract output in `backend/src/modules/focus/contracts/provided/wellbeing-action.ts`
- [ ] T028 [US1] Recommend-only API (propose + confirm-and-record only; no money-movement, no silent creation) + authz guard in `backend/src/modules/focus/api/focus.controller.ts` — depends on T011
- [ ] T029 [P] [US1] Mobile Stress-Pack screen: support session → one Recommendation Card (Why layer) → Confirm-Action sheet (specific CTA, disclaimer, in-flight-disabled idempotent CTA) in `mobile/src/features/focus/stress-pack/` (ux-foundations §4.1/§4.2)
- [ ] T030 [P] [US1] Mobile Crisis-Signpost panel: static, localized resources; no data entry, no transmission in `mobile/src/features/focus/crisis-signpost/` (FR-FOC-005)

**Checkpoint**: US1 fully functional and independently testable (MVP — the umbrella Independent Test).

---

## Phase 4: User Story 2 — Evening Wind-Down converts worries into tasks/goals before calming (Priority: P3)

**Goal**: The evening wind-down surfaces outstanding money worries and offers to convert each into a task/goal BEFORE the guided calming portion; capture is offered, never forced; idempotent; calm Empty state when clear.

**Independent Test**: Trigger wind-down with ≥1 open worry; confirm worry-capture is presented **before** the guided wind-down, confirming a worry dispatches a linked `WellbeingAction`, and the guided portion only begins after capture is completed or explicitly skipped.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T031 [P] [US2] Consumer contract tests for `RunwayForecast`, `GoalState`, `CreditState` (multi-source worry identification) in `backend/tests/contract/wind-down-consumers.test.ts`
- [ ] T032 [P] [US2] **Order test**: with ≥1 open worry, worry-capture step is presented **before** the guided wind-down; 0 wind-downs begin guided ahead of capture in `backend/tests/unit/wind-down-order.test.ts` (FR-FOC-002 / SC-F-002)
- [ ] T033 [P] [US2] Offered-never-forced test: explicit **skip** proceeds to guided wind-down and records the skip so the worry is re-offered next session (not dropped) in `backend/tests/unit/wind-down-skip.test.ts` (FR-FOC-002)
- [ ] T034 [P] [US2] Already-captured idempotency test: a worry converted to a still-open task/goal is shown as `already_captured` (linked to existing) and **not** re-offered — no duplicate in `backend/tests/unit/wind-down-already-captured.test.ts` (SC-F-003)
- [ ] T035 [P] [US2] Empty-state test: no open worries → calm "nothing outstanding" Empty state, proceeds directly, never zero-filled/alarming in `backend/tests/unit/wind-down-empty.test.ts` (ux-foundations §3)
- [ ] T036 [P] [US2] Integration test: wind-down with multiple worries → capture-before-calm → confirm/skip end-to-end in `backend/tests/integration/wind-down.test.ts`

### Implementation for User Story 2

- [ ] T037 [P] [US2] `FocusSession` (type=`wind_down`) extension + worry-capture-before-calm sequencing rule in `backend/src/modules/focus/domain/wind-down.ts` (FR-FOC-002)
- [ ] T038 [US2] Extend stressor-identification to multi-source (Runway, Goal, Credit) with `already_captured` dedup against still-open actions in `backend/src/modules/focus/services/stressor-identification.ts` (FR-FOC-003) — depends on T024
- [ ] T039 [US2] Wind-down session flow: surface worries → offer capture (Confirm-Action) before guided portion → record skip / `already_captured` / `resolved` in `backend/src/modules/focus/services/wind-down.ts` (FR-FOC-002) — depends on T025, T026, T037
- [ ] T040 [P] [US2] Mobile Wind-Down screen: worry-capture step (Recommendation Card per worry → Confirm-Action) **before** guided wind-down; explicit Skip; calm Empty state when clear; reduced-motion honored in `mobile/src/features/focus/wind-down/` (ux-foundations §3/§4.1/§4.2/§7.3)

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Stressor inbox: prioritized by safety (Priority: P3)

**Goal**: A prioritized list of current money stressors ordered by the documented safety-first precedence, each with a freshness chip and a one-tap path into a pack or direct action; absent sources omitted (never fabricated).

**Independent Test**: With multiple stressor types present, open Focus and confirm the list is ordered runway/Cash-Safety → Credit hard-avoid → Budget/Bills → Goals, each item carries a freshness chip, and each offers a path to a pack or action.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T041 [P] [US3] **Safety-precedence ordering test**: list ordered (1) runway/Cash-Safety → (2) Credit hard-avoid → (3) Budget/Bills → (4) Goals in `backend/tests/unit/stressor-precedence.test.ts` (FR-FOC-003 / SC ux-foundations §10.4)
- [ ] T042 [P] [US3] Stale/unavailable-source test: stale source → stale chip + money figure withheld; entirely-unavailable source → its stressors omitted (never fabricated, never blocks) in `backend/tests/unit/stressor-source-states.test.ts` (FR-X-008/012)
- [ ] T043 [P] [US3] Integration test: render prioritized stressor list with mixed fresh/stale/absent sources in `backend/tests/integration/stressor-list.test.ts`

### Implementation for User Story 3

- [ ] T044 [US3] Stressor-list service: aggregate identified stressors, apply safety-precedence ordering, attach freshness, omit absent sources in `backend/src/modules/focus/services/stressor-list.ts` (FR-FOC-003) — depends on T038
- [ ] T045 [P] [US3] Mobile Stressor-List screen (Focus tab landing): safety-prioritized list, freshness chip per item, Partial Data Banner + "Incomplete picture" chip on partial, path to pack/action; all six states (empty/loading/partial/stale/error/withheld) in `mobile/src/features/focus/stressor-list/` (ux-foundations §3/§5.2)

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T046 [P] **Well-being privacy**: API-layer IDOR / cross-member authorization test (server-side, not UI) proving 0 cross-member exposure of `FocusSession`/`WellbeingAction`/stressor data regardless of `MemberScope`; profile switcher excludes Focus content; denied access audited in `backend/tests/integration/cross-member-authz.test.ts` (SC-F-007 / FR-FOC-005 / Principle V)
- [ ] T047 [P] **Data minimization**: schema-inspection test proving 0 free-text distress fields persisted; only structured metadata + entity refs stored; 7-day deletion cascade + dormant-retention bound honored in `backend/tests/integration/data-minimization.test.ts` (SC-F-008 / FR-X-013/019)
- [ ] T048 [P] Verify log redaction (no PII/monetary/well-being-signal leak) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T049 [P] Conflict-precedence test: a spend-implying action vs Cash Safety `RunwayForecast`/`SafeToActSignal` risk → action held, Conflict Banner with Cash Safety winning in `backend/tests/unit/conflict-precedence.test.ts` (ux-foundations §10.4)
- [ ] T050 [P] Inbox digest-only test: any wind-down reminder is emitted as a low-priority Informational digest event (no distress detail); no direct push API call exists in `backend/tests/unit/inbox-digest.test.ts` (ux-foundations §6)
- [ ] T051 [P] Bilingual + locale-format verification (EN/FR, fr-CA `1 234,56 $`) and WCAG 2.1 AA bilingual screen-reader labels (card, Why toggle, freshness chip, Confirm-Action CTA); reduced-motion; tap targets ≥ 44×44 pt in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016)
- [ ] T052 [P] Performance check: cached stressor-list module-switch ≤ 300 ms; stale → flagged/withheld state, not blocking fetch, in `mobile/tests/perf-stressor-list.test.ts` (FR-X-015 / SC-010)
- [ ] T053 Threat-model mitigation tasks: confirm no money-movement endpoint and no silent task/goal creation exist; private-by-default cross-member authZ enforced everywhere; no free-text distress field exists; crisis signpost has no escalation/transmission path (spec Threat Model)
- [ ] T054 Run [quickstart.md](./quickstart.md) validation end-to-end (all three user-story checks + mandatory idempotency/stale-money/locale fixtures + consumer+provider contract tests green + cross-cutting checks)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (StressorRef/withhold, reasoning, audit, redaction, format, private-by-default authZ, consumed-contract clients, provided-contract registry, content datasets).
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US2 (wind-down) extends US1's stressor-identification + WellbeingAction machinery to multiple sources — sequence US2 after US1.
  - US3 (stressor inbox) aggregates what US1/US2 identify — sequence US3 after US2's multi-source identification, though it is a thin convenience surface (Principle IX).
- **Polish (Phase 6)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T006–T010, T012, T013, T014 in parallel (T011 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- US1 must land before US2 (shared stressor-identification + WellbeingAction services); US3 follows US2's multi-source identification.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T015 WellbeingAction provider contract test
T016 BillCalendar consumer contract test
T017 action-pairing (exactly one, typed ref)
T018 stale-money fallback fixture
T019 locale passthrough fixture (fr-CA / en-CA)
T020 idempotency fixture
T021 audit + recommend-only
# Then domain models [P]:
T023 FocusSession + WellbeingAction domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (stress pack pairs support with exactly one linked recommend-only action; idempotent; stale-money fallback; fr-CA `1 234,56 $`) → demo (the umbrella Independent Test).

### Incremental Delivery
US1 (MVP) → US2 (wind-down worries-first) → US3 (stressor inbox) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- **Focus owns no money math**: every figure is a provider-owned integer-cent value displayed as-provided via `@finos/format` — no float, no arithmetic, no rounding (Principle IV). Fixtures T018/T019 guard stale-withhold and locale; there is no points/FX fixture because Focus computes no money.
- Recommend-only: no task creates a money-movement endpoint and none creates a task/goal without confirmation (T053 verifies).
- Well-being PII is private-by-default; no free-text distress field exists; crisis resources are signposted, not provided (T046/T047/T053 verify).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

---

description: "Task list for Module 3 — Cash Safety & Autopilot"
---

# Tasks: Module 3 — Cash Safety & Autopilot

**Input**: Design documents from `/specs/005-module-3-cash-safety/`

**Prerequisites**: plan.md, spec.md (US1–US4), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (ratified, per [plan.md](./plan.md) / [platform-decisions.md](../_platform/platform-decisions.md)): TypeScript/Node (NestJS) backend + React Native (Expo) mobile; `@finos/money` (integer cents + `decimal.js` FX, half-up once), `@finos/format` (en-CA/fr-CA); Prisma on the `cashsafety` Postgres schema; BullMQ roundup-trigger worker; Pact for contract tests; Jest + Testcontainers. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2) for independent implementation and testing. US1, US2, US4 are P1; US3 (roundups) is P2.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US4 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create cash-safety module structure per plan: `backend/src/modules/cash-safety/{domain,money,services,contracts/consumed,contracts/provided,ingestion,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/cash-safety/{runway,micro-actions,safe-to-act,roundups}`, `mobile/tests/`
- [ ] T002 Initialize the `CashSafetyModule` NestJS bounded context + dependencies (`@finos/money`, `@finos/format`, Prisma, BullMQ, Pact, Jest) in `backend/src/modules/cash-safety/cash-safety.module.ts` and `package.json`
- [ ] T003 [P] Provision the `cashsafety` Postgres schema with a per-schema role + RLS on every `profile_id`-scoped table (`roundup_rule`, `roundup_proposal`, `runway_projection`) in `backend/prisma/cash-safety.schema.prisma` (platform-decisions §3)
- [ ] T004 [P] Configure Jest + money-fixture test harness and Testcontainers Postgres in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite; `cashsafety` schema + RLS migrate cleanly.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement money helpers (integer-cents CAD, **roundup modular arithmetic** `(target - (amount mod target)) mod target`, FX `foreign × rate` half-up once via `@finos/money`, integer-cents gap-closed subtraction, **no float**) in `backend/src/modules/cash-safety/money/money.ts` (Principle IV)
- [ ] T007 [P] Implement `FreshnessStamp` value object + `isStale` check, with the **withhold-on-stale-money** rule wired in, in `backend/src/modules/cash-safety/domain/freshness.ts` (Principle VIII)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) in `backend/src/modules/cash-safety/domain/reasoning.ts` (Principle VI)
- [ ] T009 [P] Implement append-only, immutable `AuditEvent` writer (keyed on `source_event_id` UNIQUE; types `roundup_confirmed`/`micro_action_confirmed`/`runway_shown`/`signal_served`), kept separate from debug logs, in `backend/src/modules/cash-safety/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with PII + monetary-value redaction (no balances/shortfalls/roundup amounts in debug logs) in `backend/src/modules/cash-safety/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Wire en-CA/fr-CA locale formatting via `@finos/format` (monetary `1 234,56 $`, negative `-47,50 $`, percent, date, relative time) for all module display in `backend/src/modules/cash-safety/money/locale.ts` (Principle II / FR-X-005)
- [ ] T012 Implement server-side cross-profile authZ + `profile_id` scoping guard (session identity + `MemberScope`, never client-supplied id; RLS defense-in-depth) in `backend/src/modules/cash-safety/api/authz.ts` (Principle V / FR-HH-001)
- [ ] T013 [P] Implement consumed spine contract clients with version pinning + graceful degradation (timeouts/retries) in `backend/src/modules/cash-safety/contracts/consumed/` (`cash-flow-forecast.ts`, `account-state.ts`, `transaction-stream.ts`, `budget-state.ts`, `goal-state.ts`, `credit-state.ts`, `bill-calendar.ts` [feature-gated]) (Principle VII / FR-X-011/012)
- [ ] T014 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/cash-safety/contracts/provided/registry.ts` (Principle VII)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Forward-looking runway with shortfall flag (Priority: P1) 🎯 MVP

**Goal**: Derive a user-facing runway from the spine `CashFlowForecast` — lowest projected balance + date, runway days to the safety buffer, flagged shortfall — each freshness-stamped, with all six UI states.

**Independent Test**: With accounts + upcoming bills known to the spine, the runway shows the lowest projected balance, the date, runway days, and a shortfall flag when the buffer is breached; a stale balance withholds the runway; fr-CA renders `1 234,56 $`.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T015 [P] [US1] Provider contract test for `RunwayForecast` against `contracts/provided/runway-forecast.schema.json` in `backend/tests/contract/runway-forecast.provider.test.ts`
- [ ] T016 [P] [US1] Consumer contract tests for `CashFlowForecast` + `AccountState` in `backend/tests/contract/runway-consumers.test.ts`
- [ ] T017 [P] [US1] Runway derivation unit test: lowest projected balance + date + `runway_days` counting down to the **safety buffer** (not 0), `shortfall_flag` set on breach, in `backend/tests/unit/runway-derivation.test.ts` (FR-CASH-001)
- [ ] T018 [P] [US1] **Withhold-on-stale-money** test: stale/missing balance or `CashFlowForecast` ⇒ runway **withheld** (no documented-default); `insufficient_history` ⇒ low-confidence/withheld, in `backend/tests/unit/runway-withhold.test.ts` (FR-CASH-001 / Constitution VIII / SC-CASH-005)
- [ ] T019 [P] [US1] Partial-data test: runway on the connected subset carries `data_completeness = partial` + "Incomplete data" marker, never presented as complete, in `backend/tests/unit/runway-partial.test.ts`
- [ ] T020 [P] [US1] fr-CA locale-format test for lowest balance + safety buffer (`1 234,56 $`, `-47,50 $`) in `backend/tests/unit/runway-locale.test.ts` (FR-X-005 / SC-CASH-006)
- [ ] T021 [P] [US1] Integration test: open the runway end-to-end against a Testcontainers spine stub in `backend/tests/integration/runway.test.ts`

### Implementation for User Story 1

- [ ] T022 [P] [US1] `RunwayForecast` domain (starting_balance, safety_buffer, projected_lowest_balance + date, runway_days, shortfall_flag, confidence, points series, data_completeness, freshness) in `backend/src/modules/cash-safety/domain/runway-forecast.ts`
- [ ] T023 [US1] Runway-derivation service (consume `CashFlowForecast`/`AccountState`, apply safety buffer, withhold on stale money input, mark partial/insufficient) in `backend/src/modules/cash-safety/services/runway-derivation.ts` (depends on T022; research §1-2)
- [ ] T024 [US1] Wire `RunwayForecast` provided contract output (with `runway_shown` audit event) in `backend/src/modules/cash-safety/contracts/provided/runway-forecast.ts`
- [ ] T025 [P] [US1] Mobile Runway screen (chart, lowest-balance + date, runway-days, shortfall flag, freshness chip, all six states: empty/loading/partial/stale/error/withheld) in `mobile/src/features/cash-safety/runway/`

**Checkpoint**: US1 fully functional and independently testable (MVP) — a new user sees a runway within the 10-minute window (SC-CASH-010).

---

## Phase 4: User Story 2 — Shortfall micro-actions that close the gap (Priority: P1)

**Goal**: When the runway flags a shortfall, propose concrete, ranked micro-actions (move a bill, pause a roundup, re-sequence payments, transfer from own savings, trim discretionary) — each showing the exact CAD gap closed — and **never** a cash advance or any credit product.

**Independent Test**: A predicted shortfall yields ≥ 1 micro-action with its CAD gap-closed amount, referencing a real entity; no option is a cash advance/credit; each consequential step routes through a Confirm-Action sheet.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T026 [P] [US2] **No-credit invariant** provider test on `RunwayForecast.micro_actions`: the `kind` enum has no cash-advance/loan/credit value and none is ever emitted, in `backend/tests/contract/micro-actions-no-credit.provider.test.ts` (FR-CASH-002 / SC-CASH-003)
- [ ] T027 [P] [US2] Consumer contract tests for `BudgetState`, `CreditState`, `BillCalendar` (feature-gated) in `backend/tests/contract/micro-action-consumers.test.ts`
- [ ] T028 [P] [US2] Ranking unit test: micro-actions ordered by descending `projected_gap_closed`, tie-broken by least disruption (pause/resequence before transfer/reduce), in `backend/tests/unit/micro-action-ranking.test.ts` (FR-CASH-002)
- [ ] T029 [P] [US2] **Gap-closed money fixture**: a micro-action whose `projected_gap_closed` exactly equals a flagged shortfall drives the verdict `unsafe → safe` with zero cent drift (integer-cents subtraction), in `backend/tests/unit/micro-action-gap.test.ts` (Money Correctness / SC-CASH-004)
- [ ] T030 [P] [US2] Degradation tests: `move_bill_date` **omitted** when Bills unshipped; `reduce_discretionary` **withheld** on stale/missing `BudgetState`; non-affected kinds still surface, in `backend/tests/unit/micro-action-degradation.test.ts` (FR-X-012)
- [ ] T031 [P] [US2] CreditState secondary-guardrail test: **absent** ⇒ proceed without the due-date urgency boost (documented-default); **stale** ⇒ flag, do not reason on old due dates, in `backend/tests/unit/credit-due-date-guardrail.test.ts` (Constitution VI v2.2.0)
- [ ] T032 [P] [US2] Integration test: request micro-actions for a flagged shortfall in `backend/tests/integration/micro-actions.test.ts`

### Implementation for User Story 2

- [ ] T033 [P] [US2] `MicroAction` domain (closed `kind` enum — **no** credit value; projected_gap_closed, target_ref, reasoning) in `backend/src/modules/cash-safety/domain/micro-action.ts` (FR-CASH-002)
- [ ] T034 [US2] Micro-action-planner service (compose + rank by gap closed; feature-gate `move_bill_date`; withhold `reduce_discretionary` on stale budget; `transfer_from_savings` = own accounts only; `pause_roundup` references a rule; CreditState due-date urgency boost when fresh) in `backend/src/modules/cash-safety/services/micro-action-planner.ts` (depends on T033)
- [ ] T035 [US2] Embed `micro_actions` in the `RunwayForecast` provided output (with `micro_action_confirmed` audit event on confirm) in `backend/src/modules/cash-safety/contracts/provided/runway-forecast.ts`
- [ ] T036 [P] [US2] Mobile Micro-Actions surface (ranked Recommendation Cards with "why this action", CAD gap line, Confirm-Action sheet with the not-regulated-advice disclaimer) in `mobile/src/features/cash-safety/micro-actions/`

**Checkpoint**: US1 + US2 both independently functional — the runway is now a safety mechanism, not just a warning.

---

## Phase 5: User Story 4 — SafeToActSignal consumed by every spending module (Priority: P1)

**Goal**: Expose the cross-module `SafeToActSignal` (`safe`/`caution`/`unsafe`/`withheld`, `precedence_rank = 1`) every spending module queries before recommending a spend, with the Conflict Banner resolution surfaced.

**Independent Test**: A spend that would breach the buffer returns `unsafe` with the projected lowest balance after the spend; a stale balance returns `withheld` (never a guessed `safe`); a cross-profile query without scope is denied + audited.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T037 [P] [US4] Provider contract test for `SafeToActSignal` (incl. `precedence_rank = 1` const) in `backend/tests/contract/safe-to-act.provider.test.ts`
- [ ] T038 [P] [US4] Verdict-band unit test: `safe`/`caution`/`unsafe` by buffer-breach proximity; `projected_lowest_balance_after` present for amount-evaluated non-withheld queries, in `backend/tests/unit/safe-to-act-bands.test.ts` (FR-CASH-004)
- [ ] T039 [P] [US4] **Withhold safety** test: stale/missing money input ⇒ `verdict = withheld`; `withheld` is never coerced to `safe`, in `backend/tests/unit/safe-to-act-withhold.test.ts` (Constitution VIII / SC-CASH-005)
- [ ] T040 [P] [US4] Conflict-precedence test: `unsafe`/`caution` overrides an optimization signal; `precedence_rank = 1` surfaced for the Conflict Banner, in `backend/tests/unit/safe-to-act-precedence.test.ts` (SC-CASH-003 / ux-foundations §10.4)
- [ ] T041 [P] [US4] **Cross-profile authZ** (IDOR) test at the API layer: a `SafeToActSignal` request for a `profile_id` outside `MemberScope` is denied server-side and audited — never served from a client-supplied id, in `backend/tests/integration/cross-profile-authz.test.ts` (FR-HH-001 / SC-CASH-009)
- [ ] T042 [P] [US4] Integration test: a consuming module requests `SafeToActSignal` for a contemplated amount in `backend/tests/integration/safe-to-act.test.ts`

### Implementation for User Story 4

- [ ] T043 [P] [US4] `SafeToActSignal` domain (verdict, contemplated_amount, projected_lowest_balance_after, runway_days_after, shortfall_date, runway_ref, `precedence_rank` const 1, reasoning, freshness) in `backend/src/modules/cash-safety/domain/safe-to-act.ts`
- [ ] T044 [US4] Safe-to-act service (derive verdict from the runway; withhold on stale money; emit `precedence_rank = 1`; `signal_served` audit event) in `backend/src/modules/cash-safety/services/safe-to-act.ts` (depends on T023, T043)
- [ ] T045 [US4] Wire `SafeToActSignal` provided contract + scoped, authZ-guarded read endpoint in `backend/src/modules/cash-safety/contracts/provided/safe-to-act.ts`
- [ ] T046 [P] [US4] Mobile Conflict-Banner surface (names both signals, states the resolution rule, shows the overridden card with a disabled CTA; consumed by Rewards/Pay/Bills/Shopping/Tasks tabs) in `mobile/src/features/cash-safety/safe-to-act/`

**Checkpoint**: US1, US2, US4 independently functional — "no module advises an overdraft" is now enforceable OS-wide (SC-CASH-001).

---

## Phase 6: User Story 3 — Rules-based roundups proposed to the user's plan (Priority: P2)

**Goal**: Let the user set a roundup rule; when a qualifying purchase posts, **propose** the swept amount (integer-cents modular arithmetic) for routing to debt/TFSA/savings/a goal, recorded idempotently on confirm — a duplicate trigger never double-proposes.

**Independent Test**: With a rule active and a qualifying purchase posted, the rounded amount is proposed (not executed) with its exact integer-cents amount; confirming writes one audit event; replaying the same trigger event produces no second proposal or record.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T047 [P] [US3] Provider contract test for `RoundupProposal` against `contracts/provided/roundup-proposal.schema.json` in `backend/tests/contract/roundup-proposal.provider.test.ts`
- [ ] T048 [P] [US3] Consumer contract tests for `TransactionStream` (trigger + `source_event_id`) + `GoalState` (time-to-goal) in `backend/tests/contract/roundup-consumers.test.ts`
- [ ] T049 [P] [US3] **Roundup money fixtures**: `$4.30`→$1 ⇒ 70¢; `$4.00`→$1 ⇒ 0¢ (exact multiple ⇒ no sweep); `$23.40`→$5 ⇒ 160¢ — integer-cents modular arithmetic, no float, in `backend/tests/unit/roundup-amount.test.ts` (FR-CASH-003 / SC-CASH-004)
- [ ] T050 [P] [US3] **FX money fixture**: foreign purchase normalized to CAD with no cent drift (`USD 100.00 × 1.3725 = CAD 137.25`, half-up once) before roundup math, in `backend/tests/unit/roundup-fx.test.ts` (FR-X-002 / SC-CASH-004)
- [ ] T051 [P] [US3] **Idempotency** test: replayed trigger `source_event_id` ⇒ exactly one `RoundupProposal`; replayed confirmation ⇒ exactly one audit event, no double-apply, in `backend/tests/unit/roundup-idempotency.test.ts` (Constitution IV / FR-CASH-003 / SC-CASH-004)
- [ ] T052 [P] [US3] Goal-routed roundup test: shows swept amount + time-to-goal contribution in days, locale-formatted, in `backend/tests/unit/roundup-goal.test.ts` (FR-X-004)
- [ ] T053 [P] [US3] `pause_roundup` supersede test: a confirmed pause transitions affected proposals to `superseded` under shortfall pressure, in `backend/tests/unit/roundup-pause.test.ts` (US3 scenario 4)
- [ ] T054 [P] [US3] Integration test: rule → qualifying purchase → proposal → Confirm-Action → one audit event in `backend/tests/integration/roundup.test.ts`

### Implementation for User Story 3

- [ ] T055 [P] [US3] `RoundupRule` (round_to_cents, scope, destination, state) + `RoundupProposal` (source_event_id UNIQUE, roundup_amount, destination, status, goal_contribution_days, reasoning, freshness) domain in `backend/src/modules/cash-safety/domain/roundup.ts`
- [ ] T056 [US3] BullMQ roundup-trigger ingestion worker (consume qualifying `TransactionStream` events, timeouts/retries/rate-limit, dedup on `source_event_id`) in `backend/src/modules/cash-safety/ingestion/roundup-trigger.worker.ts` (Principle VIII)
- [ ] T057 [US3] Roundup-engine service (integer-cents modular roundup; FX-normalize first; idempotent proposal keyed on `source_event_id`; goal time-to-goal; `confirmed` writes one audit event; `pause_roundup` ⇒ `superseded`) in `backend/src/modules/cash-safety/services/roundup-engine.ts` (depends on T006, T009, T055)
- [ ] T058 [US3] Wire `RoundupProposal` provided contract (consumed by Habits) + scoped read endpoint in `backend/src/modules/cash-safety/contracts/provided/roundup-proposal.ts`
- [ ] T059 [P] [US3] Mobile Roundups surface (rule setup, proposal review, Confirm-Action sheet with a specific CTA — "Approve roundup of 2,50 $" — never auto-confirm) in `mobile/src/features/cash-safety/roundups/`

**Checkpoint**: All user stories (US1, US2, US4, US3) independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Verify the **no-money-movement / no-credit** API surface: no endpoint moves money or originates a cash advance/credit; every action is a recommendation or user-confirmed state write, in `backend/tests/integration/recommend-only.test.ts` (FR-X-003 / FR-CASH-002 / SC-CASH-007)
- [ ] T061 [P] Verify log redaction (no PII / balances / shortfalls / roundup amounts) + audit-trail completeness across all services, in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T062 [P] Threat-model mitigation tests: cross-profile IDOR denied + audited; stale-money never `safe`; replay no-ops; revoked `MemberScope` shows Empty state (no cached runway), in `backend/tests/integration/threat-model.test.ts` (spec Threat Model / SC-CASH-009)
- [ ] T063 [P] Bilingual + locale-format verification (EN/FR parity, fr-CA `1 234,56 $` / `-47,50 $`, percent, dates) and WCAG 2.1 AA bilingual screen-reader labels on the runway chart, micro-action cards, Conflict Banner, and Confirm-Action sheet, in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-CASH-006)
- [ ] T064 [P] Performance check: cached runway module-switch + `SafeToActSignal` read ≤ 300 ms; stale → flagged/withheld state, not a blocking fetch, in `mobile/tests/perf-runway.test.ts` (FR-X-015 / SC-010)
- [ ] T065 [P] Notification-restraint check: a Critical "predicted overdraft today" alert is emitted to the **Inbox pipeline** (never a direct push API call) with `module_id`/`priority_tier`/bilingual payload, in `backend/tests/integration/inbox-emit.test.ts` (ux-foundations §6.3)
- [ ] T066 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory roundup/FX/gap money fixtures + consumer+provider contract tests green + no-credit/withhold invariants)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry).
- **User Stories (Phases 3–6)** → all depend on Foundational; then independently testable.
  - US2 (micro-actions) embeds into the `RunwayForecast` produced by US1 — sequence US2 after US1.
  - US4 (`SafeToActSignal`) derives its verdict from the US1 runway service — sequence US4 after US1.
  - US3 (roundups, P2) is independent of US2/US4 but `pause_roundup` (US2) references a `RoundupRule` (US3); wire the pause→supersede link once both exist. US3 ships after the P1 safety floor.
- **Polish (Phase 7)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T007–T011, T013, T014 in parallel (T006 money first; T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 must land first (US2 and US4 both derive from the runway); US3 can be staffed in parallel with US2/US4 by a different developer.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T015 RunwayForecast provider contract test
T016 CashFlowForecast + AccountState consumer contract tests
T017 runway derivation (lowest balance, runway_days to buffer, shortfall flag)
T018 withhold-on-stale-money
T019 partial-data marker
T020 fr-CA locale format
# Then domain model:
T022 RunwayForecast domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (runway with lowest balance, runway days, shortfall flag, withhold-on-stale, fr-CA format) → demo (the 10-minute onboarding runway, SC-CASH-010).

### Incremental Delivery
US1 (MVP runway) → US2 (micro-actions make it a safety mechanism) → US4 (`SafeToActSignal` makes the floor OS-wide) → US3 (roundup autopilot). Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- **Money math**: integer cents everywhere; roundup is pure integer-cents modular arithmetic; FX is arbitrary-precision decimal half-up at the final cent only (Principle IV) — fixtures T029, T049, T050 guard against slippage.
- **The runway is a money output**: a stale/missing balance or `CashFlowForecast` withholds it (T018); there is **no** documented-default for the runway — only absent `CreditState` due-date context uses the v2.2.0 default (T031).
- **Recommend-only & no credit**: no task creates a money-movement or credit-origination endpoint (T060 verifies); the `micro_actions.kind` enum is closed with no credit value (T026 verifies).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

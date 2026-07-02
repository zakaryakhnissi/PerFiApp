---

description: "Task list for Module 5 — Pay & Payment Optimization"
---

# Tasks: Module 5 — Pay & Payment Optimization

**Input**: Design documents from `/specs/007-module-5-pay/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from the ratified platform — [platform-decisions.md](../_platform/platform-decisions.md) §2, referenced in [plan.md](./plan.md)): TypeScript/Node NestJS backend (`PayModule`) + React Native (Expo) mobile; `@finos/money` (`bigint` cents + `decimal.js` rates), `@finos/format` (en-CA/fr-CA), `@finos/contract-*`; Pact for contract tests; Jest; Prisma over the Postgres `pay` schema. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P1 → P2) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create Pay module structure per plan: `backend/src/modules/pay/{domain,money,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/pay/{checkout,sequencer}`, `mobile/tests/`
- [ ] T002 Wire `PayModule` (NestJS) + dependencies (`@finos/money`, `@finos/format`, `@finos/contract-*`, Pact, Jest, Prisma) in `backend/src/modules/pay/pay.module.ts` and `backend/package.json` / `mobile/package.json`
- [ ] T003 [P] Configure lint/format incl. the **no-float-money** ESLint rule + the **banned-cross-module-import** boundary rule (Pay may import only its own code + shared `@finos/*` / contract packages) in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest + money-fixture test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`
- [ ] T006 [P] Provision the Postgres `pay` schema with a per-schema role + RLS on every `profile_id`-scoped table (defense-in-depth, platform-decisions §5) in `backend/prisma/pay.schema.prisma`

**Checkpoint**: Project builds; test runner green on an empty suite; no-float-money + boundary lint rules active.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Verify/adopt money helpers from `@finos/money` (integer-cents combine, **half-up** FX convert once at the cent, no float) + a Pay-local `combineRewardNetOfCost` (reward_cents − fx_fee_cents) and `sumGoalProgressDeltaCents` in `backend/src/modules/pay/money/money.ts` (Principle IV) — TDD, fixtures first
- [ ] T008 [P] Adopt the shared `FreshnessStamp` value object + `isStale` check (`finos:common/FreshnessStamp/1.0.0`) for consumed-input gating in `backend/src/modules/pay/domain/freshness.ts` (Principle VIII)
- [ ] T009 [P] Adopt the bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr; `finos:common/Reasoning/1.0.0`) in `backend/src/modules/pay/domain/reasoning.ts` (Principle VI)
- [ ] T010 [P] Implement append-only, immutable `AuditEvent` writer (types `recommendation_shown`, `sequence_proposed`, `sequence_accepted`, `schedule_published`, `cross_profile_denied`), keyed on `source_event_id` for accept/publish, kept separate from debug logs, in `backend/src/modules/pay/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T011 [P] Implement structured logging with PII + monetary-value redaction (balances, obligations, schedules) in `backend/src/modules/pay/services/logging.ts` (Principle V / FR-X-014)
- [ ] T012 [P] Wire en-CA/fr-CA locale formatting via `@finos/format` (monetary `1 234,56 $`, percent `12,3 %`, date `28 juin 2026`) for Pay surfaces in `backend/src/modules/pay/money/locale.ts` (Principle II / FR-X-005)
- [ ] T013 Implement server-side cross-profile authZ guard + `profile_id` scoping (session identity + Household `MemberScope`, never a client-supplied id) that emits a `cross_profile_denied` audit event on denial, in `backend/src/modules/pay/api/authz.ts` (Principle V / FR-X-010 / FR-HH-001)
- [ ] T014 [P] Implement consumed spine/Rewards contract clients with version pinning + graceful degradation (timeouts/retries/circuit-break) in `backend/src/modules/pay/contracts/consumed/` (`best-card-recommendation.ts`, `card-lineup.ts`, `points-valuation.ts`, `credit-state.ts`, `cash-flow-forecast.ts`, `budget-state.ts`, `goal-state.ts`, `account-state.ts`, `merchant-graph.ts`) (Principle VII/VIII / FR-X-011/012)
- [ ] T015 [P] Implement **feature-checked** consumed clients for the not-yet-shipped providers — `SafeToActSignal` (`finos:cashsafety/SafeToActSignal/1.0.0`, precedence override) and `BillCalendar` (`finos:bills/BillCalendar/1.0.0`, obligation set; user-entered fallback) — pinning the expected `$id`/version, in `backend/src/modules/pay/contracts/consumed/{safe-to-act.ts,bill-calendar.ts}` (research §8)
- [ ] T016 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/pay/contracts/provided/registry.ts` (Principle VII)
- [ ] T017 [P] Implement the FX-conversion gate (foreign checkout → CAD via a timestamped, freshness-stamped FX rate; stale ⇒ withhold the runway-dependent pick) in `backend/src/modules/pay/money/fx.ts` (Principle VIII / spec Money Correctness; OI-1)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Safe-to-pay checkout recommendation (Priority: P1) 🎯 MVP

**Goal**: At a checkout moment, recommend **one** safe payment method whose reasoning cites reward value AND runway safety AND utilization effect together; exclude runway-breaching / hard-avoid methods; defer to Cash Safety on conflict.

**Independent Test**: At a simulated checkout (merchant + amount), the result names exactly one method with reasoning referencing reward value, runway impact, and utilization effect, and a method that would breach runway or push utilization > 50% is not recommended.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T018 [P] [US1] Provider contract test for `CheckoutRecommendation` against `contracts/provided/checkout-recommendation.schema.json` (incl. `utilization_source`, `runway_safe`, `safe_to_act_deferred`) in `backend/tests/contract/checkout-recommendation.provider.test.ts`
- [ ] T019 [P] [US1] Consumer contract tests for `BestCardRecommendation`, `CardLineup`, `PointsValuation`, `CreditState`, `CashFlowForecast`, `BudgetState`, `AccountState`, `MerchantGraph` in `backend/tests/contract/checkout-consumers.test.ts`
- [ ] T020 [P] [US1] **Money fixture**: reward-optimal card rejected for a runway breach → safer account chosen; `reward_foregone` exact in cents, no slippage, in `backend/tests/unit/checkout-runway-breach.test.ts` (FR-PAY-001 / SC-P-007)
- [ ] T021 [P] [US1] **Money fixture**: utilization bands — candidate landing 30–50% → `utilization_warning = true`; candidate landing > 50% → excluded, in `backend/tests/unit/checkout-utilization-bands.test.ts` (FR-PAY-001 / SC-P-001)
- [ ] T022 [P] [US1] **Money fixture**: near-tie within `reward_tie_threshold_cents` (default 25¢) → prefer lower-utilization / higher-liquidity method, in `backend/tests/unit/checkout-near-tie.test.ts` (Clarifications / research §6)
- [ ] T023 [P] [US1] **Money fixture**: foreign-currency checkout converted via a fixed FX rate (half-up at the final cent once) enters reasoning with no cent drift, in `backend/tests/unit/checkout-fx.test.ts` (spec Money Correctness / SC-P-007)
- [ ] T024 [P] [US1] Missing/stale-input tests: stale/missing `CashFlowForecast` or `BudgetState` → **withhold**; `CreditState` **absent** → `assumed_healthy_default` silently; `CreditState` **stale** → flag/withhold; stale FX → withhold runway-dependent pick, in `backend/tests/unit/checkout-missing-inputs.test.ts` (FR-PAY-001 / Constitution VI/VIII / SC-P-008)
- [ ] T025 [P] [US1] `SafeToActSignal` overdraft precedence: spend-positive pick overridden, `safe_to_act_deferred = true`, Conflict Banner data surfaced, in `backend/tests/unit/checkout-safe-to-act.test.ts` (SC-P-012)
- [ ] T026 [P] [US1] Integration test: request a checkout recommendation end-to-end (one method + reward/runway/utilization reasoning) in `backend/tests/integration/checkout-recommendation.test.ts`
- [ ] T027 [P] [US1] Mobile component test: checkout Recommendation Card renders all six states (empty/loading/partial/stale/error/withheld), bilingual SR labels, fr-CA `1 234,56 $`, in `mobile/tests/checkout-card.test.tsx` (ux-foundations §3 / Principle II / SC-P-009)

### Implementation for User Story 1

- [ ] T028 [P] [US1] `CheckoutRecommendation` + `PaymentMethod` (projection) domain (recommended_method, net_reward_value, reward_foregone, utilization_warning, utilization_source, runway_safe, safe_to_act_deferred, trade_off_en/fr, reasoning, freshness) in `backend/src/modules/pay/domain/checkout-recommendation.ts`
- [ ] T029 [US1] Runway-safety predicate (apply checkout amount as outflow on `CashFlowForecast`; safe iff `projected_lowest_balance` ≥ buffer / no new `shortfall_flag`; never recompute the forecast) in `backend/src/modules/pay/services/runway-safety.ts` (research §3)
- [ ] T030 [US1] Checkout-overlay service (consume Rewards best-card; build eligible-method projection from `CardLineup` + `AccountState`; apply utilization bands from `CreditState` — hard-avoid excluded, warn flagged, documented healthy-band default when `CreditState` absent; apply runway safety; near-tie tiebreak; withhold on stale/missing money inputs) in `backend/src/modules/pay/services/checkout-overlay.ts` (depends on T028–T029, T007, T017) (FR-PAY-001)
- [ ] T031 [US1] Conflict-resolution: consume `SafeToActSignal` (feature-checked); Cash Safety precedence over Pay optimization; populate `safe_to_act_deferred` + Conflict Banner payload (ux-foundations §3.1/§10.4) in `backend/src/modules/pay/services/conflict-resolution.ts`
- [ ] T032 [US1] Checkout API (recommend-only; emits `recommendation_shown` audit event; authZ-scoped) in `backend/src/modules/pay/api/checkout.ts` (no money-movement endpoint)
- [ ] T033 [US1] Wire `CheckoutRecommendation` provided contract output in `backend/src/modules/pay/contracts/provided/checkout-recommendation.ts`
- [ ] T034 [P] [US1] Mobile checkout screen (Recommendation Card: one method + "why" reward/runway/utilization, Conflict Banner, freshness chips, Withheld state) in `mobile/src/features/pay/checkout/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Monthly payment sequencer (Priority: P1)

**Goal**: From the month's obligations + projected inflows, propose an ordered, dated payment plan that avoids overdrafts and maximizes goal progress; surface a shortfall + deferral recommendations when no overdraft-free ordering exists.

**Independent Test**: With a fixed obligation set + inflow schedule, the sequencer returns an ordered, dated plan whose every intermediate projected balance stays ≥ the safety buffer; reordering toward goal progress never introduces a projected overdraft; an infeasible set surfaces a shortfall instead of an overdrafting plan.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T035 [P] [US2] Provider contract test for `PaymentSchedule` (feasibility, projected_lowest_balance, shortfall, goal_progress_delta, steps, deferral_recommendations) against `contracts/provided/payment-schedule.schema.json` in `backend/tests/contract/payment-schedule.provider.test.ts`
- [ ] T036 [P] [US2] Consumer contract tests for `CashFlowForecast`, `GoalState`, and the feature-checked `BillCalendar` in `backend/tests/contract/sequencer-consumers.test.ts`
- [ ] T037 [P] [US2] **Money fixture (feasible)**: over a fixed obligation+inflow set, every intermediate `projected_balance_after` ≥ safety buffer, deterministic order, `goal_progress_delta` exact in cents under summation, in `backend/tests/unit/sequencer-feasible.test.ts` (FR-PAY-002 / SC-P-004/007)
- [ ] T038 [P] [US2] **Money fixture (infeasible)**: inflows insufficient → `feasibility = infeasible`, **no overdrafting plan emitted**, exact `shortfall_on` + `shortfall_amount`, criticality-ranked `deferral_recommendations`, in `backend/tests/unit/sequencer-infeasible.test.ts` (FR-PAY-002)
- [ ] T039 [P] [US2] Goal-progress tiebreak: two overdraft-free orderings differing only in goal progress → greater-goal-progress order chosen; Why cites the goal advanced + days, in `backend/tests/unit/sequencer-goal-tiebreak.test.ts` (SC-P-003 / FR-X-004)
- [ ] T040 [P] [US2] Stale-input withhold: stale runway/budget → sequence **WITHHELD**, in `backend/tests/unit/sequencer-stale-withhold.test.ts` (SC-P-008)
- [ ] T041 [P] [US2] Integration test: run the sequencer over a seeded obligation+inflow set end-to-end in `backend/tests/integration/payment-sequencer.test.ts`
- [ ] T042 [P] [US2] Mobile component test: sequence view renders ordered steps with per-step expandable Why (source account, date, CAD cents, runway impact, goal contribution), six states, bilingual SR labels, fr-CA dates/amounts, in `mobile/tests/sequencer-view.test.tsx` (ux-foundations §3/§7 / SC-P-009)

### Implementation for User Story 2

- [ ] T043 [P] [US2] `PaymentSchedule` / `ScheduledPayment` + `SequencerResult` + `DeferralRec` domain (feasibility, projected_lowest_balance, shortfall, steps with sequence_index/obligation_ref/source_account_id/amount/scheduled_date/projected_balance_after/goal_progress_contribution/goal_ref/status) in `backend/src/modules/pay/domain/payment-schedule.ts`
- [ ] T044 [US2] Obligation-source adapter: consume `BillCalendar` when present (feature-checked), else a user-entered obligation set; normalize to the obligation_ref shape, in `backend/src/modules/pay/services/obligation-source.ts` (research §8 / OI-5)
- [ ] T045 [US2] Sequencer service (deterministic constraint-first greedy: (1) order obligations by due date / earliest binding constraint, fund from the account keeping every intermediate projected balance ≥ buffer; (2) advance discretionary goal contributions within slack; emit `infeasible` + shortfall + criticality-ranked deferrals when no overdraft-free order exists; withhold on stale runway/budget) in `backend/src/modules/pay/services/sequencer.ts` (depends on T043–T044, T029, T007) (FR-PAY-002 / research §4)
- [ ] T046 [US2] Sequencer API (propose-only; emits `sequence_proposed` audit event; authZ-scoped) in `backend/src/modules/pay/api/sequencer.ts` (no money-movement endpoint)
- [ ] T047 [US2] Wire `PaymentSchedule` provided contract output (proposed sequence) in `backend/src/modules/pay/contracts/provided/payment-schedule.ts`
- [ ] T048 [P] [US2] Mobile sequencer screen (ordered steps, per-step Why, shortfall + deferral surfacing, six states) in `mobile/src/features/pay/sequencer/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Accept a sequence & sync the bill calendar (Priority: P2)

**Goal**: On user acceptance via the Confirm-Action sheet, record each scheduled item idempotently and publish `PaymentSchedule` so Bills updates the calendar — without moving any money; flag a later-unsafe step for re-sequencing.

**Independent Test**: Accept a proposed sequence via the Confirm-Action sheet; confirm an append-only audit record per item keyed on the source event id, a re-submission does not double-record, and the published `PaymentSchedule` reflects the accepted items with no money-movement side effect.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T049 [P] [US3] **Idempotency fixture**: a double-submitted acceptance (same `source_event_id`) records each step **exactly once** — no double-record, no second audit entry, in `backend/tests/unit/accept-idempotency.test.ts` (FR-PAY-003 / FR-X-003 / SC-P-006)
- [ ] T050 [P] [US3] Recommend-only / no-money-movement assertion: no Pay endpoint moves money; acceptance only records + publishes; `schedule_published` audit written, in `backend/tests/unit/accept-no-money-movement.test.ts` (SC-P-005 / FR-X-003)
- [ ] T051 [P] [US3] Re-sequence flag: a post-acceptance spine refresh making a step overdraft-risky sets `status → needs_resequence` (never auto-executed, never silently drifting), in `backend/tests/unit/accept-needs-resequence.test.ts` (FR-PAY-003)
- [ ] T052 [P] [US3] Deferral/renegotiation hand-off: an obligation cancellation/renegotiation is handed to Bills and the proposal + projected effect is recorded for audit, in `backend/tests/unit/accept-deferral-handoff.test.ts` (FR-PAY-003)
- [ ] T053 [P] [US3] Integration test: accept-and-publish end-to-end (Confirm-Action → records → `PaymentSchedule` published) in `backend/tests/integration/accept-and-publish.test.ts`
- [ ] T054 [P] [US3] Mobile component test: Confirm-Action sheet — specific CTA "Schedule payments" / "Planifier les paiements" (Household: "…for {Name}"), exact CAD cents per step, mandatory disclaimer, CTA disabled in-flight, in `mobile/tests/confirm-action-sheet.test.tsx` (ux-foundations §4.2 / SC-P-005)

### Implementation for User Story 3

- [ ] T055 [US3] Accept-and-publish service (record each `ScheduledPayment` `proposed → accepted` idempotently keyed on `source_event_id` with a `UNIQUE` constraint; publish `PaymentSchedule`; emit `sequence_accepted` + `schedule_published` audit events; no money moved) in `backend/src/modules/pay/services/accept-and-publish.ts` (depends on T043, T010) (FR-PAY-003)
- [ ] T056 [US3] Re-sequence watcher (on spine refresh, flag an accepted step `needs_resequence` when it becomes overdraft-risky; route a re-sequence alert to the Inbox digest, never a direct push) in `backend/src/modules/pay/services/resequence-watcher.ts` (ux-foundations §6 / FR-PAY-003)
- [ ] T057 [US3] Accept API (Confirm-Action acceptance; idempotent on `source_event_id`; authZ-scoped; emits audit) in `backend/src/modules/pay/api/accept.ts` (no money-movement endpoint)
- [ ] T058 [P] [US3] Mobile Confirm-Action sheet for accepting a sequence (per-step recap with exact cents, Why layer, disclaimer, specific CTA, in-flight disable) in `mobile/src/features/pay/sequencer/confirm-action.tsx`

**Checkpoint**: All user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T059 [P] Cross-profile (Household) authorization test at the **API layer** (not UI): 0 cross-profile data exposure for checkout + sequence + accept; every denied request emits a `cross_profile_denied` audit event, in `backend/tests/integration/cross-profile-authz.test.ts` (SC-P-011 / Principle V)
- [ ] T060 [P] Verify log redaction (no PII/monetary leak: balances, obligations, schedules) + audit-trail completeness (all five event types append-only, separate from debug logs) across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T061 [P] Threat-model mitigation verification: confirm no money-movement endpoint exists; cross-profile authZ on session identity everywhere; idempotency `UNIQUE` constraint present; stale-money-input withhold enforced, in `backend/tests/integration/threat-model-mitigations.test.ts` (spec Threat Model)
- [ ] T062 [P] Bilingual + locale-format verification (EN/FR no single-language leak; fr-CA `1 234,56 $`, `12,3 %`, `28 juin 2026`) and WCAG 2.1 AA bilingual screen-reader labels on every value + CTA, in `mobile/tests/a11y-locale.test.tsx` (Principle II / FR-X-016 / SC-P-009)
- [ ] T063 [P] Performance check: cached recommendation/sequence module-switch ≤ 300 ms; stale → flagged/Withheld state, not a blocking fetch, in `mobile/tests/perf-pay.test.tsx` (FR-X-015 / SC-010)
- [ ] T064 [P] Contract version-skew test: an intentionally bumped/broken consumed schema fails CI and **disables** the dependent Pay recommendation (not served on a mismatched schema), in `backend/tests/contract/version-skew.test.ts` (SC-012 / SC-P-010)
- [ ] T065 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory money/idempotency fixtures + consumer+provider contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, FX gate, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients incl. feature-checked providers, provided-contract registry).
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US2 (sequencer) reuses the runway-safety predicate (T029) from US1's foundation but is otherwise independent; US1 and US2 can be staffed in parallel after Phase 2.
  - US3 (accept & sync) depends on US2's `PaymentSchedule` domain (T043) — sequence after US2.
- **Polish (Phase 6)** → depends on all three stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T012, T014, T015, T016, T017 in parallel (T007 money first; T013 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 and US2 can be staffed in parallel by different developers; US3 sequences after US2.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T018 CheckoutRecommendation provider contract test
T019 consumer contract tests (BestCard/CardLineup/PointsValuation/CreditState/CashFlow/Budget/Account/Merchant)
T020 runway-breach reward-foregone money fixture
T021 utilization-band money fixture (warn/hard-avoid)
T022 near-tie money fixture
T023 FX-conversion money fixture
T024 missing/stale-input withhold + documented-default
T025 SafeToActSignal precedence
# Then domain models [P]:
T028 CheckoutRecommendation + PaymentMethod domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (one safe method + reward/runway/utilization reasoning, runway-breach fixture exact, bands enforced, Cash-Safety precedence) → demo.

### Incremental Delivery
US1 (MVP checkout overlay) → US2 (sequencer) → US3 (accept & sync) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: integer CAD cents for amounts/balances/reward/goal-deltas, arbitrary-precision FX half-up at the final cent only (Principle IV) — fixtures T020–T023, T037–T038, T049 guard against slippage and double-recording.
- Recommend-and-record-only: no task creates a money-movement endpoint (T050, T061 verify).
- The single permitted documented default is the utilization guardrail when `CreditState` is **entirely absent** (`utilization_source = assumed_healthy_default`); every other missing/stale money input withholds (T024, Constitution VI v2.2.0).
- Cash-Safety `SafeToActSignal` precedence is non-negotiable (T025, T031; ux-foundations §3.1/§10.4).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

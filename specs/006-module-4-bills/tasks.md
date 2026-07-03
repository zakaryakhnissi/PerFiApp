---

description: "Task list for Module 4 — Bills & Subscriptions"
---

# Tasks: Module 4 — Bills & Subscriptions

**Input**: Design documents from `/specs/006-module-4-bills/`

**Prerequisites**: plan.md, spec.md (US1–US4), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (ratified — [platform-decisions.md](../_platform/platform-decisions.md) §2): TypeScript/NestJS backend + React Native (Expo) mobile; `@finos/money` (integer cents + `decimal.js`) and `@finos/format` (en-CA/fr-CA); Pact for contract tests; Jest; BullMQ workers; Prisma (`bills` schema, RLS); Testcontainers Postgres. Paths below assume the ratified layout (plan.md Project Structure).

**Organization**: Tasks grouped by user story (priority order P1 → P2) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US4 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create bills module structure per plan: `backend/src/modules/bills/{domain,money,services,workers,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/bills/{subscription-radar,bill-calendar,free-trial-guard,cancellation}`, `mobile/tests/`
- [ ] T002 Register `BillsModule` (NestJS bounded context) + wire the `bills` Prisma schema with a per-schema role + RLS on every profile-scoped table in `backend/src/modules/bills/bills.module.ts` and `backend/prisma/bills.schema.prisma` (platform §3)
- [ ] T003 [P] Configure lint/format incl. the no-float-money rule and the no-cross-module-import boundary (dependency-cruiser) in `backend/.eslintrc` and `backend/.dependency-cruiser.cjs`
- [ ] T004 [P] Configure Jest + money-fixture test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite; `bills` schema migrates with RLS enabled.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement Bills money helpers (integer-cents CAD impacts/savings, `annualized = monthly × 12` exact, negotiation `reduction_rate` arbitrary-precision **half-up once** via `@finos/money`, **no float**, reuse spine `cad_amount` — no re-FX) in `backend/src/modules/bills/money/money.ts` (Principle IV)
- [ ] T007 [P] Implement `FreshnessStamp` consumption + `isStale` withhold/flag policy (money input stale ⇒ withhold; secondary stale ⇒ flag) in `backend/src/modules/bills/domain/freshness.ts` (Principle VIII)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) for every recommendation/Confirm-Action in `backend/src/modules/bills/domain/reasoning.ts` (Principle VI)
- [ ] T009 [P] Implement append-only, immutable `BillsAuditEvent` projection over `audit.event_log` (idempotent on `source_event_id` UNIQUE), kept separate from debug logs, in `backend/src/modules/bills/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with PII + monetary-value + merchant-descriptor redaction in `backend/src/modules/bills/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Wire en-CA/fr-CA locale formatting (monetary `12,99 $`, percent `25 %`, dates, relative countdown) via `@finos/format` in `backend/src/modules/bills/money/locale.ts` and `mobile/src/features/bills/format.ts` (Principle II / FR-X-005)
- [ ] T012 Implement server-side profile-scoped authZ guard (session identity + Household `MemberScope`, never a client-supplied `profile_id`; denied access audited) in `backend/src/modules/bills/api/authz.ts` (Principle V / FR-X-010 / FR-HH-001)
- [ ] T013 [P] Implement consumed spine/Cash-Safety contract clients with version pinning + graceful degradation (timeouts/retries/rate-limits) in `backend/src/modules/bills/contracts/consumed/` (`transaction-stream.ts`, `merchant-graph.ts`, `budget-state.ts`, `cash-flow-forecast.ts`, `goal-state.ts`, `safe-to-act.ts` [feature-checked, pending Module 3]) (Principle VII / FR-X-011/012)
- [ ] T014 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/bills/contracts/provided/registry.ts` (Principle VII)
- [ ] T015 [P] Implement BullMQ worker scaffold (detection + obligation-projection jobs) with mandatory timeouts/retries/rate-limits in `backend/src/modules/bills/workers/index.ts` (Principle VIII / FR-X-012)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Subscription Radar: recurring charges detected & categorized (Priority: P1) 🎯 MVP

**Goal**: Detect every recurring charge from the transaction stream, group into a `RecurringSeries` inventory, categorize essential/negotiable/nice-to-have with monthly + annualized CAD impact, freshness, and user-overridable classification.

**Independent Test**: With ≥1 account connected and recurring charges in `TransactionStream`, the radar shows each detected charge once, categorized, with monthly + annualized CAD impact and a freshness stamp; the `$12.99 → $155.88` fixture is exact; a duplicate/pending row is excluded; fr-CA renders `12,99 $`.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T016 [P] [US1] Provider contract test for `SubscriptionInventory` against `contracts/provided/subscription-inventory.schema.json` in `backend/tests/contract/subscription-inventory.provider.test.ts` (SC-B-010)
- [ ] T017 [P] [US1] Consumer contract tests for `TransactionStream` (incl. `cad_amount`, `is_recurring`, `suspected_duplicate`/`pending`) and `MerchantGraph` (`is_subscription_like`) in `backend/tests/contract/radar-consumers.test.ts` (SC-B-010)
- [ ] T018 [P] [US1] Consumer contract test for `BudgetState` (category + `data_completeness`) in `backend/tests/contract/budget-state.consumer.test.ts`
- [ ] T019 [P] [US1] Money fixture: `$12.99`/mo → annualized `$155.88` (`1299 × 12 = 18 588` cents), no slippage, in `backend/tests/unit/money-annualize.test.ts` (FR-BILL-001 / SC-B-004)
- [ ] T020 [P] [US1] Double-count fixture: a series with a `suspected_duplicate`/`pending` underlying row excludes those rows from `monthly_impact_cents` in `backend/tests/unit/double-count.test.ts` (SC-B-004, spine dedup edge case)
- [ ] T021 [P] [US1] Foreign-currency fixture: a USD subscription valued in CAD from the spine's `cad_amount` (no re-FX in Bills) in `backend/tests/unit/foreign-currency.test.ts` (FR-X-002, multi-currency edge case)
- [ ] T022 [P] [US1] Cadence-inference + irregular/unknown-cadence marker test in `backend/tests/unit/cadence.test.ts` (FR-BILL-001, edge case)
- [ ] T023 [P] [US1] Necessity classification: inferred default `nice_to_have`, curated essential/negotiable mapping, and `user_override` wins, in `backend/tests/unit/classification.test.ts` (FR-BILL-001 / C-3)
- [ ] T024 [P] [US1] Stale `TransactionStream` ⇒ impacts flagged stale (not shown as current) in `backend/tests/unit/radar-staleness.test.ts` (FR-X-008 / SC-B-005)
- [ ] T025 [P] [US1] fr-CA formatting test (`12,99 $` / `155,88 $`, no `$` prefix) in `backend/tests/unit/radar-locale.test.ts` (FR-X-005 / SC-B-006)
- [ ] T026 [P] [US1] Integration test: open Subscription Radar end-to-end in `backend/tests/integration/subscription-radar.test.ts`

### Implementation for User Story 1

- [ ] T027 [P] [US1] `RecurringSeries` domain (merchant_ref, cadence, recurring_amount, necessity, classification_source, detection_state, monthly/annualized impact, freshness) in `backend/src/modules/bills/domain/recurring-series.ts`
- [ ] T028 [P] [US1] `NecessityClassifier` interface + curated Canada-first category→necessity dataset loader (versioned) in `backend/src/modules/bills/services/necessity-classifier.ts` (research §4)
- [ ] T029 [US1] Recurrence-detection service (group `TransactionStream` by merchant via spine hints, infer cadence/amount, exclude `suspected_duplicate`/`pending`, build series) in `backend/src/modules/bills/services/recurrence-detector.ts` (depends on T027–T028)
- [ ] T030 [US1] Budget-impact service (monthly + `× 12` annualized cents tied to `BudgetState` category; stale flag) in `backend/src/modules/bills/services/budget-impact.ts`
- [ ] T031 [US1] Detection worker job (off-hot-path recurrence detection, idempotent series upsert) in `backend/src/modules/bills/workers/detect-recurrence.job.ts`
- [ ] T032 [US1] Radar API (read inventory; classification override write idempotent on `source_event_id`, audited) in `backend/src/modules/bills/api/radar.ts`
- [ ] T033 [US1] Wire `SubscriptionInventory` provided contract output in `backend/src/modules/bills/contracts/provided/subscription-inventory.ts`
- [ ] T034 [P] [US1] Mobile Subscription Radar screen (series grouped by necessity, CAD impacts, freshness chip, "Incomplete data" chip in Partial state, re-classify action, all six states) in `mobile/src/features/bills/subscription-radar/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Bill Calendar with runway-aware safe-to-pay dates (Priority: P1)

**Goal**: Present upcoming bills with due dates + runway-derived predicted safe-to-pay dates from `CashFlowForecast`; withhold (never guess) when the runway money-input is stale/missing; flag at-risk bills; surface Cash Safety precedence conflicts.

**Independent Test**: With obligations detected and a fresh `CashFlowForecast`, each bill shows due date + safe-to-pay date; with a stale/missing forecast the safe-to-pay annotation is **withheld** (due date still shows); a safe-to-pay-after-due bill is flagged at-risk.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T035 [P] [US2] Provider contract test for `BillCalendar` against `contracts/provided/bill-calendar.schema.json` in `backend/tests/contract/bill-calendar.provider.test.ts` (SC-B-010)
- [ ] T036 [P] [US2] Provider contract test for `RecurringObligations` against `contracts/provided/recurring-obligations.schema.json` in `backend/tests/contract/recurring-obligations.provider.test.ts` (SC-B-010)
- [ ] T037 [P] [US2] Consumer contract test for `CashFlowForecast` (`runway_days`, `projected_lowest_balance`, `shortfall_flag`) in `backend/tests/contract/cash-flow-forecast.consumer.test.ts`
- [ ] T038 [P] [US2] **Withhold** test: stale/missing `CashFlowForecast` ⇒ `safe_to_pay_status = withheld`, `safe_to_pay_on = null`, due date still shown, never guessed, in `backend/tests/unit/safe-to-pay-withhold.test.ts` (FR-BILL-003 / Constitution VI/VIII / SC-B-005)
- [ ] T039 [P] [US2] At-risk test: `safe_to_pay_on > due_on` or `shortfall_flag = true` ⇒ `at_risk = true` + conflict surfaced (Cash Safety precedence) in `backend/tests/unit/safe-to-pay-at-risk.test.ts` (FR-X-001, conflict precedence)
- [ ] T040 [P] [US2] `SafeToActSignal` precedence (feature-checked): when present, overdraft overrides pay-timing; `safe_to_pay_source = safe_to_act_signal`; conflict surfaced, in `backend/tests/unit/safe-to-act-precedence.test.ts` (umbrella cross-module edge case / C-1)
- [ ] T041 [P] [US2] Irregular-cadence bill ⇒ "estimated / cadence uncertain" marker (not a confident date) in `backend/tests/unit/calendar-estimated.test.ts` (edge case)
- [ ] T042 [P] [US2] Integration test: open Bill Calendar end-to-end (fresh + stale forecast paths) in `backend/tests/integration/bill-calendar.test.ts`

### Implementation for User Story 2

- [ ] T043 [P] [US2] `BillCalendarEntry` + `RecurringObligation` domain (due_on, safe_to_pay_on/status/source, at_risk, estimated markers, freshness) in `backend/src/modules/bills/domain/bill-calendar.ts`
- [ ] T044 [US2] Safe-to-pay service (derive date from `CashFlowForecast`; **withhold** on stale/missing money input; at-risk when after due / shortfall; `SafeToActSignal` override behind feature check) in `backend/src/modules/bills/services/safe-to-pay.ts` (depends on T043, FR-BILL-003 / C-1)
- [ ] T045 [US2] Obligation-projection service + worker (forward-project occurrences per series, stable `obligation_id` for idempotent re-projection) in `backend/src/modules/bills/services/obligation-projector.ts` and `backend/src/modules/bills/workers/project-obligations.job.ts`
- [ ] T046 [US2] Calendar API (read-only; due + safe-to-pay + at-risk annotations) in `backend/src/modules/bills/api/calendar.ts`
- [ ] T047 [US2] Wire `BillCalendar` + `RecurringObligations` provided contracts in `backend/src/modules/bills/contracts/provided/bill-calendar.ts` and `.../recurring-obligations.ts`
- [ ] T048 [P] [US2] Mobile Bill Calendar screen (month view, due + safe-to-pay annotations, Withheld Card on stale runway, at-risk markers, Conflict Banner, all six states) in `mobile/src/features/bills/bill-calendar/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Free-Trial Guard: keep/cancel before conversion (Priority: P2)

**Goal**: Track free trials as first-class objects with a countdown to conversion; surface a one-tap keep/cancel prompt before the charge date (default 3-day window) with post-conversion CAD cost; route alerts via Inbox; record decisions idempotently and audited.

**Independent Test**: With a trial detected and its conversion date within the alert window, a countdown + keep/cancel prompt is surfaced before the charge date showing the post-conversion CAD cost; cancel is guided (not executed); the alert routes via the Inbox digest.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T049 [P] [US3] Provider contract test for `FreeTrialExpiry` against `contracts/provided/free-trial-expiry.schema.json` in `backend/tests/contract/free-trial-expiry.provider.test.ts` (SC-B-010)
- [ ] T050 [P] [US3] Alert-window test: prompt surfaced iff `converts_on − today ≤ alert_window_days` (default 3, C-4), with post-conversion CAD cost, **before** the charge date, in `backend/tests/unit/free-trial-window.test.ts` (FR-BILL-002 / SC-B-007)
- [ ] T051 [P] [US3] Unknown conversion date ⇒ `converts_on_is_estimated = true` ("estimated", never confident) in `backend/tests/unit/free-trial-estimated.test.ts` (FR-BILL-002, edge case)
- [ ] T052 [P] [US3] Keep/cancel decision **idempotency**: replayed `source_event_id` is a no-op (never double-applies) + audit event written, in `backend/tests/unit/free-trial-idempotency.test.ts` (FR-X-003 / FR-X-007 / SC-B-009)
- [ ] T053 [P] [US3] Guided-cancel test: "cancel" surfaces the guided action and does **not** execute a cancellation/contact a merchant in `backend/tests/unit/free-trial-guided.test.ts` (FR-X-003 / C-6)
- [ ] T054 [P] [US3] Inbox-routing test: free-trial alert emitted to the Inbox digest with `priority_tier` + bilingual payload, no standalone push, in `backend/tests/unit/free-trial-inbox.test.ts` (SC-009 / FR-INB-002)
- [ ] T055 [P] [US3] Integration test: free-trial guard end-to-end in `backend/tests/integration/free-trial-guard.test.ts`

### Implementation for User Story 3

- [ ] T056 [P] [US3] `FreeTrial` domain (converts_on, estimated flag, post_conversion_cost, alert_window_days, decision_state, freshness) in `backend/src/modules/bills/domain/free-trial.ts`
- [ ] T057 [P] [US3] `TrialDetector` interface (transaction/merchant + email signals; unknown date ⇒ estimated) in `backend/src/modules/bills/services/trial-detector.ts` (research §5)
- [ ] T058 [US3] Free-trial-guard service (countdown, keep/cancel decision idempotent on `source_event_id`, guided-cancel surface, audit) in `backend/src/modules/bills/services/free-trial-guard.ts` (depends on T056–T057)
- [ ] T059 [US3] Inbox emitter (free-trial alert → Inbox digest with `priority_tier` + bilingual payload; no direct push) in `backend/src/modules/bills/services/inbox-emitter.ts` (UX §6.3 / C-7)
- [ ] T060 [US3] Free-trial API (read trials; keep/cancel write idempotent + audited) in `backend/src/modules/bills/api/free-trial.ts`
- [ ] T061 [US3] Wire `FreeTrialExpiry` provided contract in `backend/src/modules/bills/contracts/provided/free-trial-expiry.ts`
- [ ] T062 [P] [US3] Mobile Free-Trial Guard screen (countdown cards, keep/cancel via Confirm-Action sheet, estimated marker, all six states) in `mobile/src/features/bills/free-trial-guard/`

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Cancellation & Negotiation with savings & goal impact (Priority: P2)

**Goal**: Let the user initiate a cancellation/negotiation showing projected monthly + annualized CAD savings AND time-to-goal impact via a Confirm-Action sheet before confirming; generate bilingual scripts; never offer cancellation on essentials; record the action idempotently and audited.

**Independent Test**: With a negotiable/nice-to-have subscription, initiate a cancellation/negotiation and confirm projected monthly + annualized savings (CAD) + time-to-goal impact are shown before confirming, and that confirming records the action for audit.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T063 [P] [US4] Consumer contract test for `GoalState` (time-to-goal pace, never recomputed) in `backend/tests/contract/goal-state.consumer.test.ts` (SC-B-010)
- [ ] T064 [P] [US4] **Negotiation money fixture**: reduce `$89.99` by `25%` → new monthly `$67.49` (`8999 × 0.75 = 6749.25 → 6749`, **half-up once**) and annualized savings `$270.00` (`(8999 − 6749) × 12 = 27 000` cents), no float, in `backend/tests/unit/negotiation-savings.test.ts` (FR-BILL-004 / C-5 / SC-B-004)
- [ ] T065 [P] [US4] Cancellation savings fixture: `monthly × 12` annualized savings, integer cents, in `backend/tests/unit/cancellation-savings.test.ts` (FR-BILL-004)
- [ ] T066 [P] [US4] Essential-guard test: an `essential`-classified series is **never** offered cancellation (negotiation may still apply) in `backend/tests/unit/essential-guard.test.ts` (FR-BILL-001, Integration-First)
- [ ] T067 [P] [US4] Goal-impact test: time-to-goal delta sourced from `GoalState` pace, never recomputed in Bills, in `backend/tests/unit/goal-impact.test.ts` (FR-X-004 / research §7)
- [ ] T068 [P] [US4] Idempotency + audit test: confirmed cancel/negotiate write keyed on `source_event_id` (UNIQUE) is replay-safe and recorded in the append-only trail, in `backend/tests/unit/cancellation-idempotency.test.ts` (FR-X-003 / FR-X-007 / SC-B-009)
- [ ] T069 [P] [US4] Bilingual negotiation-script test (EN/FR present, no single-language leak; framed as informational, not FinOS contacting merchant) in `backend/tests/unit/negotiation-script-bilingual.test.ts` (FR-X-005 / FR-X-003 / SC-B-006)
- [ ] T070 [P] [US4] Integration test: cancellation/negotiation end-to-end through the Confirm-Action sheet in `backend/tests/integration/cancellation-negotiation.test.ts`

### Implementation for User Story 4

- [ ] T071 [P] [US4] `CancellationAction`/`NegotiationAction` domain (projected savings cents, reduction_rate decimal string, goal_impact_ref, bilingual script, outcome_state, reasoning, source_event_id) in `backend/src/modules/bills/domain/cancellation-action.ts`
- [ ] T072 [P] [US4] Cancellation-link / negotiation-script dataset loader (curated, bilingual; guided deep-link or script) in `backend/src/modules/bills/services/cancellation-dataset.ts` (research §6)
- [ ] T073 [US4] Savings + goal-impact service (cancellation = `monthly × 12`; negotiation = `amount × reduction_rate` half-up once; goal delta from `GoalState`, never recomputed) in `backend/src/modules/bills/services/savings.ts` (depends on T006, T071, FR-BILL-004 / C-5 / research §7)
- [ ] T074 [US4] Cancellation/negotiation service (essential-guard, guided-not-executed, idempotent confirmed write, audit) in `backend/src/modules/bills/services/cancellation-negotiation.ts` (depends on T072–T073)
- [ ] T075 [US4] Cancellation/negotiation API (recommend-only; Confirm-Action confirm write idempotent + audited; no execution/merchant-contact endpoint) in `backend/src/modules/bills/api/cancellation.ts`
- [ ] T076 [P] [US4] Mobile Cancellation/Negotiation flow (savings + time-to-goal → Confirm-Action sheet with disclaimer + specific CTA, bilingual script, all six states) in `mobile/src/features/bills/cancellation/`

**Checkpoint**: All user stories (US1–US4) independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T077 [P] API-layer cross-profile authZ / IDOR / horizontal-priv-esc test (server-side, not UI; Household `MemberScope`; denied access audited) in `backend/tests/integration/cross-profile-authz.test.ts` (SC-B-011 / Principle V / threat model)
- [ ] T078 [P] Verify log redaction (no PII / monetary / merchant-descriptor leak) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T079 [P] Email-purge cascade test: an email-sourced subscription enrichment is purged within 7 days of revocation; Bills holds no copy that escapes the cascade, in `backend/tests/integration/email-purge.test.ts` (FR-X-013, threat model)
- [ ] T080 [P] Threat-model mitigation verification: stale-runway never served as fresh (withheld), replay-safe decisions, no token/secret handled in Bills, in `backend/tests/integration/threat-model-mitigations.test.ts` (spec Threat Model)
- [ ] T081 [P] Contract version-skew test: a bumped/broken consumed schema fails CI and disables the dependent Bills behavior (not served on a mismatched schema); pending `SafeToActSignal` degrades, never blocks, in `backend/tests/contract/version-skew.test.ts` (SC-B-010 / SC-012)
- [ ] T082 [P] Bilingual + locale-format verification (EN/FR, fr-CA `12,99 $` / `25 %` / dates) and WCAG 2.1 AA bilingual screen-reader labels on every value/chip/card/CTA in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-B-006)
- [ ] T083 [P] Performance check: cached inventory/calendar module-switch ≤ 300 ms; stale runway → withheld state, not a blocking fetch, in `mobile/tests/perf-bills.test.ts` (FR-X-015 / SC-010)
- [ ] T084 Recommend-only verification: grep the Bills API surface — no money-movement, cancellation-execution, scheduling, or merchant-contact endpoint exists (spec Money Correctness / SC-B-009)
- [ ] T085 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory money fixtures + consumer/provider contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry, worker scaffold).
- **User Stories (Phases 3–6)** → all depend on Foundational; then independently testable.
  - US2 (calendar/obligations) reads `RecurringSeries` from US1's domain but degrades gracefully; US1 (MVP) ships first.
  - US3 (free-trial) and US4 (cancellation/negotiation) reason over the US1 inventory; sequence after US1, parallelizable with each other.
- **Polish (Phase 7)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services/workers → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T007–T011, T013, T014, T015 in parallel (T006 money first; T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 ships first; US3 and US4 can then be staffed in parallel by different developers; US2 sequences after US1's series domain.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T016 SubscriptionInventory provider contract test
T017 TransactionStream + MerchantGraph consumer contract tests
T018 BudgetState consumer contract test
T019 $12.99 → $155.88 annualize fixture
T020 duplicate/pending exclusion fixture
T021 foreign-currency (spine cad_amount reuse) fixture
T022 cadence inference
T023 necessity classification + user_override
T024 stale TransactionStream flag
T025 fr-CA formatting
# Then domain models [P]:
T027 RecurringSeries domain
T028 NecessityClassifier + curated dataset
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (radar with categorized series, CAD impacts, freshness, money fixtures exact, no double-count) → demo.

### Incremental Delivery
US1 (MVP — Subscription Radar) → US2 (Bill Calendar / safe-to-pay) → US3 (Free-Trial Guard) → US4 (Cancellation & Negotiation) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: integer cents for amounts/impacts/savings, `annualized = monthly × 12` exact, negotiation `reduction_rate` arbitrary-precision half-up **once** at the boundary (Principle IV) — fixtures T019, T020, T021, T064, T065 guard against slippage and double-counting; spine `cad_amount` is reused (no re-FX in Bills).
- Safe-to-pay is a money-grounded annotation: stale/missing `CashFlowForecast` **withholds** it (T038), never guesses (Principle VI/VIII).
- Recommend-only: no task creates a money-movement, cancellation-execution, scheduling, or merchant-contact endpoint (T084 verifies).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

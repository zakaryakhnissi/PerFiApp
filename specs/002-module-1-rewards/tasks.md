---

description: "Task list for Module 1 — Rewards & Loyalty"
---

# Tasks: Module 1 — Rewards & Loyalty

**Input**: Design documents from `/specs/002-module-1-rewards/`

**Prerequisites**: plan.md, spec.md (US1–US6), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (provisional, per [plan.md](./plan.md) — ratified in the Module 0 platform plan): TypeScript/Node backend + React Native mobile; `decimal.js` for rates/transfer math, integer cents for CAD; Pact for contract tests; Jest. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2 → P3) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US6 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create rewards module structure per plan: `backend/src/modules/rewards/{domain,money,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/rewards/{points-wallet,best-card,perks-coach,bonus-tracker,offers,transfer-intel}`, `mobile/tests/`
- [ ] T002 Initialize TypeScript project + dependencies (`decimal.js`, Pact, Jest) in `backend/package.json` and `mobile/package.json`
- [ ] T003 [P] Configure lint/format (ESLint + Prettier) in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest + money-fixture test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T006 Implement money helpers (arbitrary-precision decimal rates/ratios, integer-cents CAD, **half-up** rounding, transfer-ratio × bonus multiplication, FX conversion, no float) in `backend/src/modules/rewards/money/money.ts` (Principle IV) — ✅ TDD, 15 tests green
- [ ] T007 [P] Implement `FreshnessStamp` value object + `isStale` check (source, observed_at, threshold) in `backend/src/modules/rewards/domain/freshness.ts` (Principle VIII)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) in `backend/src/modules/rewards/domain/reasoning.ts` (Principle VI)
- [ ] T009 [P] Implement append-only, immutable `AuditEvent` store, kept separate from debug logs, in `backend/src/modules/rewards/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with PII + monetary-value redaction in `backend/src/modules/rewards/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Implement en-CA/fr-CA locale formatter (monetary `1 234,56 $`, percent, date) in `backend/src/modules/rewards/money/locale.ts` (Principle II / FR-X-005)
- [ ] T012 Implement server-side cross-profile authZ + `profile_id` scoping guard (session identity, never client-supplied id) in `backend/src/modules/rewards/api/authz.ts` (Principle V / FR-X-010)
- [ ] T013 [P] Implement consumed spine contract clients with version pinning + graceful degradation (timeouts/retries) in `backend/src/modules/rewards/contracts/consumed/` (`budget-state.ts`, `cash-flow.ts`, `credit-state.ts`, `merchant-graph.ts`, `goal-state.ts`, `safe-to-act.ts`) (Principle VII / FR-X-011/012)
- [ ] T014 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/rewards/contracts/provided/registry.ts` (Principle VII)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Points Wallet valued in CAD (Priority: P1) 🎯 MVP

**Goal**: See every loyalty balance valued in CAD with time-to-goal, freshness, manual entry, custom valuation, and expiry alerts.

**Independent Test**: With ≥1 program connected, the wallet shows each balance's CAD value + time-to-goal with a freshness stamp; the 500k×1.05 fixture is exact; fr-CA renders `1 234,56 $`.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T015 [P] [US1] Provider contract test for `PointsValuation` against `contracts/provided/points-valuation.schema.json` in `backend/tests/contract/points-valuation.provider.test.ts`
- [ ] T016 [P] [US1] Consumer contract test for `GoalState` (time-to-goal) in `backend/tests/contract/goal-state.consumer.test.ts`
- [X] T017 [P] [US1] Money fixture: `500000 × 1.05 cpp = 525000 cents ($5,250.00)`, no slippage, in `backend/tests/unit/money.test.ts` (FR-REW-001) — ✅ green
- [ ] T018 [P] [US1] Manual-entry staleness test (user-entered balance flagged stale past its window) in `backend/tests/unit/manual-balance.test.ts` (FR-REW-010)
- [ ] T019 [P] [US1] Custom-override valuation + fr-CA formatting test in `backend/tests/unit/valuation-override-locale.test.ts` (FR-X-005 / FR-REW-010)
- [ ] T020 [P] [US1] Expiry "expiring soon" flag test (default 60-day window, at-risk CAD, "expiry unknown") in `backend/tests/unit/expiry.test.ts` (FR-REW-009)
- [ ] T021 [P] [US1] Integration test: open Points Wallet end-to-end in `backend/tests/integration/points-wallet.test.ts`

### Implementation for User Story 1

- [ ] T022 [P] [US1] `PointsBalance`/`PointsValuation` domain (base_rate, effective_rate, valuation_source, expiry, freshness) in `backend/src/modules/rewards/domain/points-valuation.ts`
- [ ] T023 [P] [US1] `RateProvider` interface + curated Canada seed table in `backend/src/modules/rewards/services/rate-provider.ts` (research §2)
- [ ] T024 [P] [US1] `FxProvider` interface for multi-currency programs in `backend/src/modules/rewards/services/fx-provider.ts` (research §3)
- [ ] T025 [US1] Valuation service (points→CAD half-up, manual + override sources, stale flag/withhold) in `backend/src/modules/rewards/services/valuation.ts` (depends on T022–T024)
- [ ] T026 [US1] Expiry-alerts service (60-day default, at-risk CAD, route via Inbox digest) in `backend/src/modules/rewards/services/expiry-alerts.ts`
- [ ] T027 [US1] Wallet API (read-only; manual entry + custom rate writes idempotent) in `backend/src/modules/rewards/api/wallet.ts`
- [ ] T028 [US1] Wire `PointsValuation` provided contract output in `backend/src/modules/rewards/contracts/provided/points-valuation.ts`
- [ ] T029 [P] [US1] Mobile Points Wallet screen (CAD values, time-to-goal, freshness/expiry flags, manual entry) in `mobile/src/features/rewards/points-wallet/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Best Card Recommender (Priority: P1)

**Goal**: One best card per merchant/moment, grounded in earn rate + budget headroom + utilization, with bands, tiebreak, and documented-default handling.

**Independent Test**: A recommendation names one card with reasoning citing earn rate + budget + utilization; >50% card excluded; 30–50% warned; absent CreditState → assumed healthy default silently.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T030 [P] [US2] Provider contract test for `BestCardRecommendation` (incl. `utilization_source`) in `backend/tests/contract/best-card.provider.test.ts`
- [ ] T031 [P] [US2] Consumer contract tests for `BudgetState`, `CreditState`, `MerchantGraph` in `backend/tests/contract/recommender-consumers.test.ts`
- [ ] T032 [P] [US2] Band logic: >50% excluded, 30–50% warn, tiebreak = highest absolute CAD reward then lowest utilization impact, in `backend/tests/unit/recommender-bands.test.ts` (FR-REW-003)
- [ ] T033 [P] [US2] Missing-utilization tests: CreditState **absent** → `assumed_healthy_default` silently; CreditState **stale** → withhold; BudgetState missing → withhold, in `backend/tests/unit/recommender-missing-inputs.test.ts` (FR-REW-003 / Constitution VI v2.2.0)
- [ ] T034 [P] [US2] `SafeToActSignal` overdraft precedence + conflict surfaced (`safe_to_act_deferred`) in `backend/tests/unit/recommender-safe-to-act.test.ts`
- [ ] T035 [P] [US2] Integration test: request best card for a merchant in `backend/tests/integration/best-card.test.ts`

### Implementation for User Story 2

- [ ] T036 [P] [US2] `BestCardRecommendation` domain (utilization_source, reasoning, freshness) in `backend/src/modules/rewards/domain/best-card.ts`
- [ ] T037 [US2] Recommender service (earn+budget+utilization, tiebreak, documented healthy-band default on absent CreditState, withhold on money/stale inputs) in `backend/src/modules/rewards/services/best-card-recommender.ts`
- [ ] T038 [US2] `SafeToActSignal` consumer integration (feature-checked until Cash Safety ships) in `backend/src/modules/rewards/services/safe-to-act.ts`
- [ ] T039 [US2] Wire `BestCardRecommendation` provided contract in `backend/src/modules/rewards/contracts/provided/best-card.ts`
- [ ] T040 [P] [US2] Mobile Best Card screen (one card + "why" reasoning, utilization warning) in `mobile/src/features/rewards/best-card/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Card Knowledgebase & Perks Coach (Priority: P2)

**Goal**: Bilingual Canada-first card knowledgebase; perks coach tracking statement credits + downgrade/cancel flags.

**Independent Test**: A card with an unused credit nearing reset shows a usage plan + downgrade/cancel flag when chronically unused; KB fields render bilingually.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T041 [P] [US3] Provider contract test for `CardLineup` in `backend/tests/contract/card-lineup.provider.test.ts`
- [ ] T042 [P] [US3] Perks-coach test: unused credit near reset → usage plan + downgrade flag when chronically unused (threshold: ≥2 consecutive reset periods) in `backend/tests/unit/perks-coach.test.ts` (FR-REW-005)
- [ ] T043 [P] [US3] Bilingual knowledgebase rendering test (no single-language leak) in `backend/tests/unit/kb-bilingual.test.ts` (FR-REW-002)

### Implementation for User Story 3

- [ ] T044 [P] [US3] `Card`/`CardLineup` + `StatementCredit`/`Perk` domain in `backend/src/modules/rewards/domain/card-lineup.ts`
- [ ] T045 [P] [US3] `CardKnowledgebase` versioned-dataset loader (Canada-first, bilingual) in `backend/src/modules/rewards/services/card-knowledgebase.ts` (research §4)
- [ ] T046 [US3] Perks-coach service (reset tracking, chronically-unused flag) in `backend/src/modules/rewards/services/perks-coach.ts`
- [ ] T047 [US3] Wire `CardLineup` provided contract in `backend/src/modules/rewards/contracts/provided/card-lineup.ts`
- [ ] T048 [P] [US3] Mobile Knowledgebase + Perks Coach screens in `mobile/src/features/rewards/perks-coach/`

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Welcome Bonus & Min-Spend Tracker (Priority: P2)

**Goal**: Track welcome-bonus min-spends; warn when meeting one exceeds healthy budget; show remaining + CAD value.

**Independent Test**: An active min-spend that would exceed healthy budget triggers a warning + alternate path; progress shows remaining amount/days + CAD bonus value.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T049 [P] [US4] Over-budget warning test (meeting min-spend exceeds healthy headroom → warn + alternate path) in `backend/tests/unit/bonus-over-budget.test.ts` (FR-REW-004)
- [ ] T050 [P] [US4] Integration test: min-spend progress (remaining amount/days + CAD value) in `backend/tests/integration/bonus-tracker.test.ts`

### Implementation for User Story 4

- [ ] T051 [P] [US4] `WelcomeBonus`/`MinSpendProgress` domain in `backend/src/modules/rewards/domain/welcome-bonus.ts`
- [ ] T052 [US4] Bonus-tracker service (BudgetState headroom check, progress, CAD value) in `backend/src/modules/rewards/services/bonus-tracker.ts`
- [ ] T053 [P] [US4] Mobile Bonus Tracker screen in `mobile/src/features/rewards/bonus-tracker/`

**Checkpoint**: US1–US4 independently functional.

---

## Phase 7: User Story 6 — Transfer & Redemption Intelligence (Priority: P2)

**Goal**: Transfer partners + ratios, live transfer bonuses, transfer-aware effective valuation, buy-points "worth it?", earn-path using only held cards.

**Independent Test**: A currency shows partners + a transfer-with-bonus effective rate; the 100k×1:1×+30% fixture is exact; expired bonus falls back to base rate; earn-path uses only held cards (informational).

### Tests for User Story 6 (write first, must FAIL)

- [ ] T054 [P] [US6] Provider contract test for `TransferIntelligence` in `backend/tests/contract/transfer-intelligence.provider.test.ts`
- [X] T055 [P] [US6] Transfer-with-bonus fixture: `100000 @ 1:1 + 30% → 130000` partner pts, no cent drift, in `backend/tests/unit/transfer.test.ts` (FR-REW-007/008) — ✅ green
- [ ] T056 [P] [US6] Expired/stale bonus NOT applied → effective_rate falls back to base_rate, in `backend/tests/unit/transfer-stale-bonus.test.ts` (FR-REW-008 / FR-X-008)
- [ ] T057 [P] [US6] Earn-path uses **only held cards** + `informational_only=true` (no card-acquisition advice) in `backend/tests/unit/earn-path.test.ts` (FR-REW-011)
- [ ] T058 [P] [US6] Buy-points "worth it?" comparison test in `backend/tests/unit/buy-points.test.ts` (FR-REW-008)
- [ ] T059 [P] [US6] Integration test: transfer intelligence end-to-end (single-hop + curated 2-hop scope) in `backend/tests/integration/transfer-intelligence.test.ts`

### Implementation for User Story 6

- [ ] T060 [P] [US6] `TransferPartner`/`TransferRoute`, `TransferBonus`/`BuyPointsPromo`, `EarnPath` domain in `backend/src/modules/rewards/domain/transfer.ts`
- [ ] T061 [P] [US6] `TransferProvider` (curated graph + 2-hop sweet-spot allowlist) + bonus/buy-points feed adapter in `backend/src/modules/rewards/services/transfer-provider.ts` (research §2-3, FR-REW-007)
- [ ] T062 [US6] Transfer-intelligence service (effective_rate = base × best ratio × live bonus, half-up; expired→base) in `backend/src/modules/rewards/services/transfer-intelligence.ts`
- [ ] T063 [US6] Earn-path service (held-cards-only, informational) in `backend/src/modules/rewards/services/earn-path.ts`
- [ ] T064 [US6] Wire `TransferIntelligence` provided contract + extend `PointsValuation.effective_rate` in `backend/src/modules/rewards/contracts/provided/transfer-intelligence.ts`
- [ ] T065 [P] [US6] Mobile Transfer Intelligence screen (partners, bonuses, earn-path, buy-points) in `mobile/src/features/rewards/transfer-intel/`

**Checkpoint**: US1–US4, US6 independently functional.

---

## Phase 8: User Story 5 — Card-Linked Offers (Priority: P3)

**Goal**: Normalized card-linked offers tied to budget categories + merchant graph, freshness-gated, idempotent activation.

**Independent Test**: Each offer is normalized, tied to a budget category + merchant, with freshness; stale offer flagged/withheld; activation idempotent.

### Tests for User Story 5 (write first, must FAIL)

- [ ] T066 [P] [US5] Provider contract test for `OfferCatalog` in `backend/tests/contract/offer-catalog.provider.test.ts`
- [ ] T067 [P] [US5] Offer normalization (budget category + merchant_ref + freshness) + stale flag/withhold test in `backend/tests/unit/offers.test.ts` (FR-REW-006 / FR-X-008)
- [ ] T068 [P] [US5] Offer-activation idempotency (replayed activation does not double-apply) in `backend/tests/unit/offer-activation-idempotency.test.ts` (FR-X-003)

### Implementation for User Story 5

- [ ] T069 [P] [US5] `Offer`/`OfferCatalog` domain in `backend/src/modules/rewards/domain/offer.ts`
- [ ] T070 [P] [US5] `OfferProvider` adapters (per Canadian bank) normalizing to budget category in `backend/src/modules/rewards/services/offer-provider.ts` (research §5)
- [ ] T071 [US5] Offers service (idempotent activation keyed on offer_id+profile_id) in `backend/src/modules/rewards/services/offers.ts`
- [ ] T072 [US5] Wire `OfferCatalog` provided contract in `backend/src/modules/rewards/contracts/provided/offer-catalog.ts`
- [ ] T073 [P] [US5] Mobile Offers screen in `mobile/src/features/rewards/offers/`

**Checkpoint**: All user stories independently functional.

---

## Phase 9: Polish & Cross-Cutting Concerns

- [ ] T074 [P] Implement `StatusState` provided contract + loyalty/elite status tracker in `backend/src/modules/rewards/services/status-tracker.ts` and `contracts/provided/status-state.ts` (Status Tracker submodule; provided to Travel/Household)
- [ ] T075 [P] Multi-Profile Rewards Manager: API-layer IDOR / horizontal-priv-esc authorization test (server-side, not UI) in `backend/tests/integration/cross-profile-authz.test.ts` (SC-R-009 / Principle V)
- [ ] T076 [P] Verify log redaction (no PII/monetary leak) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI)
- [ ] T077 [P] Bilingual + locale-format verification (EN/FR, fr-CA `1 234,56 $`) and WCAG 2.1 AA bilingual screen-reader labels in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016)
- [ ] T078 [P] Performance check: cached wallet/lineup module-switch ≤ 300 ms; stale → flagged state, not blocking fetch, in `mobile/tests/perf-wallet.test.ts` (FR-X-015 / SC-010)
- [ ] T079 Threat-model mitigation tasks: confirm no money-movement endpoint exists; server-side cross-profile authZ enforced everywhere (spec Threat Model)
- [ ] T079a [P] Override/manual-entry poisoning guard test: server-side sanity-bounds validation rejects out-of-range user-override rates and manual balances; persisted `valuation_source` provenance tag (`user_override`/`manual`) emitted on the provided `PointsValuation`; override/manual entries audited in `backend/tests/integration/override-poisoning-guard.test.ts` (FR-REW-010 / spec Threat Model / FR-X-014)
- [ ] T080 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory money/transfer fixtures + contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry).
- **User Stories (Phases 3–8)** → all depend on Foundational; then independently testable.
  - US2 (recommender) reads `CardLineup` from US3's domain but degrades gracefully (recommends on earn+budget if a lineup is partial); US3 can ship before or after US2.
  - US6 extends `PointsValuation.effective_rate` (US1) — sequence US6 after US1.
  - US5 (P3) last.
- **Polish (Phase 9)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T007–T011, T013, T014 in parallel (T006 money first; T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1/US3/US4 can be staffed in parallel by different developers; US2 and US6 sequence after their dependencies.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T015 PointsValuation provider contract test
T016 GoalState consumer contract test
T017 500k×1.05 money fixture
T018 manual-entry staleness
T019 custom-override + fr-CA format
T020 expiry flag
# Then domain models [P]:
T022 PointsValuation domain
T023 RateProvider
T024 FxProvider
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (wallet with CAD values, freshness, money fixture exact) → demo.

### Incremental Delivery
US1 (MVP) → US2 (flagship recommender) → US3 → US4 → US6 → US5 → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: arbitrary-precision decimal + integer cents, half-up at the final cent only (Principle IV) — fixtures T017 and T055 guard against slippage.
- Recommend-only: no task creates a money-movement endpoint (T079 verifies).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

---

description: "Task list for Module 6 — Shopping & Deals"
---

# Tasks: Module 6 — Shopping & Deals

**Input**: Design documents from `/specs/008-module-6-shopping/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [platform-decisions.md](../_platform/platform-decisions.md); see [plan.md](./plan.md)): TypeScript/Node NestJS backend + React Native (Expo) mobile; `@finos/money` (integer CAD cents + `decimal.js` for FX/discount fractions), `@finos/format` (en-CA/fr-CA); Prisma on PostgreSQL 16 (`shopping` schema, RLS); Pact for contract tests; BullMQ for ingestion; Jest. Paths below assume that layout.

**Organization**: Tasks grouped by user story (all P2 — priority order US1 → US2 → US3) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create shopping module structure per plan: `backend/src/modules/shopping/{domain,money,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/shopping/{coupon-checkout,price-watch,buy-wait}`, `mobile/tests/`
- [ ] T002 Register `ShoppingModule` (NestJS) + `shopping` Prisma schema with per-schema role + RLS keyed on `profile_id`/household membership in `backend/src/modules/shopping/shopping.module.ts` and `backend/prisma/schema.prisma`
- [ ] T003 [P] Wire `@finos/money` and `@finos/format` as dependencies (reused, not re-implemented) in `backend/package.json` and `mobile/package.json`
- [ ] T004 [P] Configure Jest + money-fixture test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`
- [ ] T006 [P] Configure ESLint cross-module-import ban + no-`float`/`double` money-type lint for the shopping module in `backend/.eslintrc`

**Checkpoint**: Project builds; test runner green on an empty suite; lint boundary rules active.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Implement coupon/FX money helpers over `@finos/money` (price × discount_fraction and foreign × fx in arbitrary precision, **half-up at the final cent only**, integer CAD cents, no float) in `backend/src/modules/shopping/money/money.ts` (Principle IV)
- [ ] T008 [P] Implement `FreshnessStamp` value-object usage + `isStale` check, with the money-vs-secondary split (stale **money** ⇒ withhold; stale **price/coupon/FX** ⇒ flag) in `backend/src/modules/shopping/domain/freshness.ts` (Principle VIII)
- [ ] T009 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) usage in `backend/src/modules/shopping/domain/reasoning.ts` (Principle VI)
- [ ] T010 [P] Implement append-only, immutable `AuditEvent` store (types: recommendation_shown, coupon_use_acknowledged, realized_savings_recorded, watch_created, watch_removed, cross_member_access_denied), kept separate from debug logs, in `backend/src/modules/shopping/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T011 [P] Implement structured logging with PII + monetary-value redaction in `backend/src/modules/shopping/services/logging.ts` (Principle V / FR-X-014)
- [ ] T012 [P] Implement en-CA/fr-CA locale formatting usage (`@finos/format`: `12,50 $`, `12,3 %`, `3 juillet 2026`) in `backend/src/modules/shopping/money/locale.ts` (Principle II / FR-X-005)
- [ ] T013 Implement server-side cross-member authZ + `profile_id`/`MemberScope` scoping guard (session identity, never client-supplied id; denied reads audited) in `backend/src/modules/shopping/api/authz.ts` (Principle V / FR-X-010)
- [ ] T014 [P] Implement consumed spine/Rewards contract clients with version pinning + graceful degradation (timeouts/retries/rate-limits) in `backend/src/modules/shopping/contracts/consumed/` (`budget-state.ts`, `cash-flow.ts`, `goal-state.ts`, `merchant-graph.ts`, `transaction-stream.ts`, `offer-catalog.ts`) (Principle VII / FR-X-011/012)
- [ ] T015 [P] Implement feature-checked consumed clients for `SafeToActSignal` (Module 3) and `CheckoutRecommendation` (Module 5), behind a feature flag until those providers ship, in `backend/src/modules/shopping/contracts/consumed/{safe-to-act.ts,checkout-recommendation.ts}` (research OI-4/OI-5)
- [ ] T016 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`: WatchedItems, CouponRecommendation, PurchasePlan, RealizedSavings) in `backend/src/modules/shopping/contracts/provided/registry.ts` (Principle VII)
- [ ] T017 [P] Implement email-provenance tagging + FR-X-013 revocation-purge hook (`source = email_inferred`, `email_sourced = true`; 7-day cascade target) in `backend/src/modules/shopping/services/email-provenance.ts` (Principle V / FR-X-013)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Auto-Coupon at Checkout + Realized-Savings Ledger (Priority: P2) 🎯 MVP

**Goal**: Surface the single best valid coupon at a supported merchant checkout and, after the user confirms use and the purchase posts, record the realized (actual, not optimistic) saving idempotently, framed against the budget category.

**Independent Test**: At a supported merchant checkout, request coupons and confirm exactly one best valid code is surfaced with its expected CAD saving and a freshness stamp; after confirm + purchase-posted, confirm a `RealizedSavings` record is written exactly once and reflected against the linked budget category.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T018 [P] [US1] Provider contract test for `CouponRecommendation` against `contracts/provided/coupon-recommendation.schema.json` in `backend/tests/contract/coupon-recommendation.provider.test.ts`
- [ ] T019 [P] [US1] Provider contract test for `RealizedSavings` against `contracts/provided/realized-savings.schema.json` in `backend/tests/contract/realized-savings.provider.test.ts`
- [ ] T020 [P] [US1] Consumer contract tests for `MerchantGraph` + `TransactionStream` (purchase-posted, only `posted`/non-`merged_duplicate` rows) in `backend/tests/contract/coupon-consumers.test.ts`
- [ ] T021 [P] [US1] Money fixture: percentage coupon `$249.99 × 15% off → $37.50` saving, exact integer cents, no slippage, in `backend/tests/unit/coupon-money.test.ts` (FR-SHOP-001 / SC-SH-005)
- [ ] T022 [P] [US1] Multi-currency fixture: USD coupon valued through a fixed FX rate → CAD, half-up at the final cent; stale FX ⇒ converted figure flagged, in `backend/tests/unit/coupon-fx.test.ts` (FR-X-002/008 / SC-SH-005)
- [ ] T023 [P] [US1] Realized-vs-expected divergence fixture: actual posted saving recorded (not optimistic expected), `diverged = true`, in `backend/tests/unit/realized-divergence.test.ts` (SC-SH-006)
- [ ] T024 [P] [US1] Idempotency test: replayed purchase-posted event records `RealizedSavings` at most once (same `source_event_id`), no duplicate audit event, in `backend/tests/unit/realized-idempotency.test.ts` (FR-X-003 / SC-SH-005)
- [ ] T025 [P] [US1] Best-coupon selection test: among valid candidates (not expired, cart ≥ minimum_spend, eligible) pick highest expected CAD saving; reasoning lists why it beat runners-up; stack only when terms permit, in `backend/tests/unit/coupon-selection.test.ts` (FR-SHOP-001 / Clarification Q1)
- [ ] T026 [P] [US1] All-stale-coupons test: no live coupon surfaced; Stale/Unavailable state + refresh, in `backend/tests/unit/coupon-stale.test.ts` (FR-X-008 / SC-SH-004)
- [ ] T027 [P] [US1] Integration test: coupon-at-checkout → confirm-used → purchase-posts → realized-savings recorded once, in `backend/tests/integration/coupon-checkout.test.ts`

### Implementation for User Story 1

- [ ] T028 [P] [US1] `CouponOffer` (candidate) + `CouponRecommendation` domain (terms, discount_fraction, expected_saving, reasoning, freshness) in `backend/src/modules/shopping/domain/coupon.ts`
- [ ] T029 [P] [US1] `RealizedSavings` domain (source_event_id UNIQUE, actual_saving authoritative, diverged flag, append-only) in `backend/src/modules/shopping/domain/realized-savings.ts`
- [ ] T030 [P] [US1] `CouponProvider` interface + curated Canada-first seed feed (freshness-stamped) in `backend/src/modules/shopping/services/coupon-provider.ts` (research §2, OI-1)
- [ ] T031 [US1] Coupon-selection service (best valid code = max expected CAD saving subject to validity terms; reasoning; stale flag/withhold) in `backend/src/modules/shopping/services/coupon-selection.ts` (depends on T028, T030)
- [ ] T032 [US1] Realized-savings recorder (records on `TransactionStream` purchase-posted; actual figure + divergence; idempotent on source_event_id; budget-category framing) in `backend/src/modules/shopping/services/realized-savings-recorder.ts` (depends on T029)
- [ ] T033 [US1] Coupon/savings API (recommend-only: surface code + confirm-and-record realized saving via Confirm-Action; no auto-apply, no money movement) in `backend/src/modules/shopping/api/coupons.ts`
- [ ] T034 [US1] Wire `CouponRecommendation` + `RealizedSavings` provided contracts in `backend/src/modules/shopping/contracts/provided/{coupon-recommendation.ts,realized-savings.ts}`
- [ ] T035 [P] [US1] Mobile checkout-coupon surface + realized-savings ledger (single best code, terms, CAD saving, freshness chip, Confirm-Action sheet with disclaimer) in `mobile/src/features/shopping/coupon-checkout/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Price Watch & Droplist with Budget/Goal-Framed Alerts (Priority: P2)

**Goal**: Watch an item against an observed-history baseline and alert on a real drop framed by the linked budget category and goal, routed through the Inbox digest, never as a context-free "deal!" nudge.

**Independent Test**: Watch an item with a known baseline; simulate a feed price drop; confirm a single Inbox-digest alert states the new price, the CAD saving vs baseline, and the budget/goal impact, each freshness-stamped.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T036 [P] [US2] Provider contract test for `WatchedItems` against `contracts/provided/watched-items.schema.json` in `backend/tests/contract/watched-items.provider.test.ts`
- [ ] T037 [P] [US2] Consumer contract tests for `BudgetState` + `GoalState` (drop-alert framing) in `backend/tests/contract/watch-consumers.test.ts`
- [ ] T038 [P] [US2] Rolling-baseline test: baseline = observed median/trough over the window; a feed that inflates list price then "discounts" does NOT fire a phantom-saving alert, in `backend/tests/unit/price-baseline.test.ts` (FR-SHOP-002 / Clarification Q2 / SC-SH-004)
- [ ] T039 [P] [US2] Drop-alert framing test: alert states new price + CAD saving vs baseline + budget category; **no linked goal ⇒ time-to-goal line omitted** (not "no goal"), in `backend/tests/unit/drop-alert-framing.test.ts` (FR-SHOP-002 / FR-X-004)
- [ ] T040 [P] [US2] Stale-price test: stale price feed flagged, item NOT alerted as a live drop, in `backend/tests/unit/price-stale.test.ts` (FR-X-008 / SC-SH-004)
- [ ] T041 [P] [US2] Notification-routing test: drop alert routes through the Inbox digest (priority *Important*), localized EN/FR; 0 standalone pushes, in `backend/tests/unit/drop-alert-notification.test.ts` (FR-INB-002 / SC-SH-009)
- [ ] T042 [P] [US2] Multi-currency watch test: USD item converts to CAD via timestamped FX (arbitrary precision, half-up final cent); stale FX flags the figure, in `backend/tests/unit/watch-fx.test.ts` (FR-X-002/008)
- [ ] T043 [P] [US2] Watch create/remove idempotency + email-provenance test (`email_sourced` watch targeted by FR-X-013 purge) in `backend/tests/unit/watch-idempotency-provenance.test.ts` (FR-X-003/013)
- [ ] T044 [P] [US2] Integration test: watch item → price drop → single budget/goal-framed Inbox alert, in `backend/tests/integration/price-watch.test.ts`

### Implementation for User Story 2

- [ ] T045 [P] [US2] `WatchedItem` domain (merchant_ref, baseline_price, current_price, drop_threshold, budget/goal links, source/email_sourced provenance, freshness) in `backend/src/modules/shopping/domain/watched-item.ts`
- [ ] T046 [P] [US2] `PriceProvider` interface + curated observed-history seed (rolling median/trough baseline) in `backend/src/modules/shopping/services/price-provider.ts` (research §3, OI-2)
- [ ] T047 [US2] Price-watch service (baseline computation, threshold/default-% drop detection, stale-price guard) in `backend/src/modules/shopping/services/price-watch.ts` (depends on T045, T046)
- [ ] T048 [US2] Drop-alert service (CAD-saving + budget/goal framing, FX-convert foreign prices, emit to Inbox digest pipeline) in `backend/src/modules/shopping/services/drop-alert.ts` (depends on T047)
- [ ] T049 [US2] Watchlist API (watch create/remove idempotent + recommend-only) in `backend/src/modules/shopping/api/watchlist.ts`
- [ ] T050 [US2] Wire `WatchedItems` provided contract in `backend/src/modules/shopping/contracts/provided/watched-items.ts`
- [ ] T051 [P] [US2] Mobile watchlist + droplist screens (current price + freshness chip, budget/goal-framed drop, six-state matrix) in `mobile/src/features/shopping/price-watch/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Buy-Now-vs-Wait Score Grounded in Budget, Runway & Goals (Priority: P2)

**Goal**: For an item under consideration, return a buy-now-vs-wait score, recommended best date, and goal impact — computed against budget headroom and `SafeToActSignal`, withholding on stale/missing money inputs and capping at "wait/neutral" when no safety input exists.

**Independent Test**: With a watched item, a populated `BudgetState`, and a `SafeToActSignal`, request a buy/wait decision and confirm it returns a score, a best date, and goal impact citing price trend + budget headroom + runway/safety; when headroom is absent or `SafeToActSignal` flags risk, "wait" is favored with the reason named.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T052 [P] [US3] Provider contract test for `PurchasePlan` against `contracts/provided/purchase-plan.schema.json` (incl. `safety_signal_source`, `safe_to_act_deferred`) in `backend/tests/contract/purchase-plan.provider.test.ts`
- [ ] T053 [P] [US3] Consumer contract tests for `BudgetState`, `CashFlowForecast`, `GoalState`, and feature-checked `SafeToActSignal` in `backend/tests/contract/buy-wait-consumers.test.ts`
- [ ] T054 [P] [US3] Reasoning-completeness test: every score cites price trend AND budget headroom AND runway/safety (a score ignoring an available input is a defect), in `backend/tests/unit/buy-wait-reasoning.test.ts` (FR-SHOP-003 / SC-SH-001)
- [ ] T055 [P] [US3] No-budget-headroom branch: headroom ≤ 0 ⇒ `decision = wait`, reason references budget/goal state, in `backend/tests/unit/buy-wait-no-headroom.test.ts` (FR-SHOP-003 / SC-SH-001)
- [ ] T056 [P] [US3] Cash-Safety precedence branch: `SafeToActSignal` overdraft risk ⇒ `decision = wait`, `safe_to_act_deferred = true`, Conflict Banner data surfaced, in `backend/tests/unit/buy-wait-safe-to-act.test.ts` (SC-SH-002 / ux-foundations §10.4)
- [ ] T057 [P] [US3] Withhold branch: stale/missing `BudgetState`/`CashFlowForecast`/`GoalState` (primary money inputs) ⇒ score **WITHHELD** (never guessed), in `backend/tests/unit/buy-wait-withhold.test.ts` (Constitution VI / SC-SH-003)
- [ ] T058 [P] [US3] Safety-fallback branch: `SafeToActSignal` absent ⇒ fall back to `CashFlowForecast`; **both** absent ⇒ `safety_signal_source = unavailable`, output **capped at wait/neutral** for material spends (never confident `buy_now`), in `backend/tests/unit/buy-wait-safety-fallback.test.ts` (Clarification Q4 / Constitution VI boundary)
- [ ] T059 [P] [US3] Locale test: future `recommended_best_date` renders `3 juillet 2026` (fr-CA); projected saving-by-waiting in CAD, in `backend/tests/unit/buy-wait-locale.test.ts` (FR-X-004/005 / SC-SH-008)
- [ ] T060 [P] [US3] Integration test: request buy/wait for an item end-to-end (score + best date + goal impact + reasoning) in `backend/tests/integration/buy-wait.test.ts`

### Implementation for User Story 3

- [ ] T061 [P] [US3] `PurchasePlan`/`BuyWaitScore` domain (decision, score, recommended_best_date, projected_saving_by_waiting, goal_impact, safety_signal_source, safe_to_act_deferred, reasoning, freshness) in `backend/src/modules/shopping/domain/purchase-plan.ts`
- [ ] T062 [US3] Buy-wait scorer service (price trend + budget headroom + runway/safety + goal impact; withhold on stale/missing money inputs; capped-output safety fallback per Clarification Q4) in `backend/src/modules/shopping/services/buy-wait-scorer.ts` (depends on T061; reads T014/T015 consumers, T046 price provider)
- [ ] T063 [US3] Conflict-resolution integration: `SafeToActSignal` precedence over a would-be buy_now; populate Conflict Banner data, in `backend/src/modules/shopping/services/conflict-resolution.ts`
- [ ] T064 [US3] Buy-wait API (recommend-only; Confirm-Action for a confirmed planned purchase) in `backend/src/modules/shopping/api/buy-wait.ts`
- [ ] T065 [US3] Wire `PurchasePlan` provided contract in `backend/src/modules/shopping/contracts/provided/purchase-plan.ts`
- [ ] T066 [P] [US3] Mobile buy-now-vs-wait detail screen (Recommendation Card: action/why/state layers, price-trend chart, best date, goal-impact line, Conflict Banner, Withheld Card) in `mobile/src/features/shopping/buy-wait/`

**Checkpoint**: All user stories (US1–US3) independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T067 [P] Cross-member authZ: API-layer IDOR / horizontal-priv-esc authorization test (server-side, not UI) on watchlist / realized-savings / buy-wait history; denied reads audited, in `backend/tests/integration/cross-member-authz.test.ts` (SC-SH-011 / Principle V — threat model)
- [ ] T068 [P] Email-revocation purge test: data whose **sole** source is a connected email purged within 7 days, regardless of store, in `backend/tests/integration/email-purge.test.ts` (SC-SH-012 / FR-X-013)
- [ ] T069 [P] Verify log redaction (no PII/monetary leak) + audit-trail completeness across all Shopping services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T070 [P] Recommend-only verification: assert no money-movement / auto-apply / checkout endpoint exists on the Shopping API surface, in `backend/tests/integration/recommend-only.test.ts` (SC-SH-007 / FR-X-003)
- [ ] T071 [P] Bilingual + locale-format verification (EN/FR parity, fr-CA `12,50 $` / `12,3 %` / `3 juillet 2026`, no single-language leak) and WCAG 2.1 AA bilingual screen-reader labels in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-SH-008)
- [ ] T072 [P] Six-state-matrix UI test (empty, loading, partial, stale, error, withheld) for watchlist, buy-wait, and coupon surfaces; Conflict Banner + Partial Data Banner behaviors, in `mobile/tests/states-matrix.test.ts` (ux-foundations §3)
- [ ] T073 [P] Performance check: cached watchlist/last-coupon module-switch ≤ 300 ms; stale → flagged/withheld state, not blocking fetch, in `mobile/tests/perf-shopping.test.ts` (FR-X-015 / SC-010)
- [ ] T074 [P] Contract version-skew test: an intentionally broken consumed schema fails CI and disables the dependent Shopping feature (not served on a mismatched schema), in `backend/tests/contract/version-skew.test.ts` (SC-SH-010)
- [ ] T075 Run [quickstart.md](./quickstart.md) validation end-to-end (all US1–US3 checks + mandatory money fixtures + consumer/provider contract tests green + cross-cutting checks)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients incl. feature-checked, provided-contract registry, email provenance).
- **User Stories (Phases 3–5, all P2)** → all depend on Foundational; then independently testable.
  - US1 (coupons + realized savings) is the MVP; ship and validate first.
  - US3 (buy/wait) reads US2's `WatchedItem`/`PriceProvider` price history but degrades gracefully (an item without watch history still scores on budget/runway/goal); US2 should precede US3 for richest signal.
- **Polish (Phase 6)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → providers/services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T012, T014, T015, T016, T017 in parallel (T007 money first; T013 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models + provider interfaces run in parallel before their (sequential) services.
- After Foundational, US1 and US2 can be staffed in parallel by different developers; US3 sequences after US2 for price history.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T018 CouponRecommendation provider contract test
T019 RealizedSavings provider contract test
T020 MerchantGraph + TransactionStream consumer contract test
T021 $249.99 × 15% coupon money fixture
T022 multi-currency FX coupon fixture
T023 realized-vs-expected divergence fixture
T024 realized-savings idempotency
# Then domain models + provider [P]:
T028 Coupon domain
T029 RealizedSavings domain
T030 CouponProvider interface + curated seed
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (best coupon surfaced, realized saving recorded once, money fixtures exact) → demo.

### Incremental Delivery
US1 (MVP coupons + ledger) → US2 (price watch + droplist) → US3 (buy/wait flagship) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: arbitrary-precision decimal (FX/discount fractions) + integer CAD cents, half-up at the final cent only (Principle IV) — fixtures T021 (percentage), T022 (FX), T023 (divergence) guard against slippage/optimism.
- Recommend-only: no task creates a money-movement, auto-apply, or checkout endpoint (T070 verifies).
- Buy/wait safety boundary: stale/missing **money** inputs withhold (T057); when no safety input exists, output is **capped at wait/neutral** for material spends — never a confident buy_now (T058, Clarification Q4).
- Threat-model mitigations: cross-member authZ (T067), email-revocation purge (T068), redaction/audit (T069) are mandatory, not optional polish.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

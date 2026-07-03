# Quickstart & Validation: Module 6 — Shopping & Deals

**Feature**: `008-module-6-shopping` | **Date**: 2026-06-29

A run/validation guide proving Shopping & Deals works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in [tasks.md](./tasks.md); this is the "does it actually work" checklist tied to the spec's user stories (US1–US3) and success criteria (SC-SH-001..012).

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, `TransactionStream`. `OfferCatalog` (Module 1) optional — enriches but is not required. `SafeToActSignal` (Module 3) and `CheckoutRecommendation` (Module 5) optional — their consumers are feature-checked.
- Seeded fixtures: a curated Canada-first coupon sample (`CouponProvider`), an observed price-history sample (`PriceProvider`), a fixed FX rate, a `MerchantGraph` test node, and a `BudgetState` with a known category headroom.
- Toolchain per the ratified [platform-decisions.md](../_platform/platform-decisions.md) and this module's [plan.md](./plan.md) Technical Context. Commands below are illustrative — adjust to the ratified stack (`pnpm` + NestJS + Pact + Jest + Testcontainers).

## Setup

```bash
# from repo root
pnpm install
pnpm run seed:shopping-fixtures      # coupons, price history, fx, merchant node, budget headroom
```

## Validation by user story

### US1 — Auto-Coupon at Checkout + Realized-Savings Ledger (P2) 🎯 MVP

```bash
pnpm test shopping/unit/coupon-selection
pnpm test shopping/unit/realized-savings
pnpm test shopping/integration/coupon-checkout
```

Expected:
- At a supported merchant with ≥1 valid coupon, **exactly one** best valid code is surfaced with its `expected_saving` (CAD), its terms (minimum spend, expiry), and a `FreshnessStamp`; `reasoning` lists why it beat the runners-up (SC-SH-001).
- **Money fixture (mandatory)**: a percentage coupon `$249.99 × 15% off → $37.50` saving — exact integer cents, no drift (SC-SH-005).
- **Multi-currency fixture (mandatory)**: a USD-priced coupon valued through a fixed FX rate converts to CAD with half-up at the final cent only; a stale FX rate flags the converted figure (SC-SH-005 / FR-X-002/008).
- **Divergence fixture (mandatory)**: when the posted purchase saving differs from the coupon's expected value, `RealizedSavings.actual_saving` records the **actual** posted figure and `diverged = true` — never the optimistic expected one (SC-SH-006).
- **Idempotency**: a replayed purchase-posted event records `RealizedSavings` **at most once** (same `source_event_id`) and emits no duplicate audit event (SC-SH-005 / FR-X-003).
- All candidate coupons stale beyond their window → no coupon presented as live; Stale/Unavailable state with a refresh CTA (SC-SH-004).
- fr-CA locale renders `12,50 $`, not `$12.50` (SC-SH-008).

### US2 — Price Watch & Droplist with Budget/Goal-Framed Alerts (P2)

```bash
pnpm test shopping/unit/price-baseline
pnpm test shopping/integration/price-watch
```

Expected:
- A watched item with a recorded baseline that drops below the user threshold produces a single alert stating the new price, the CAD saving vs baseline, and the budget-category + goal impact, each freshness-stamped (SC-SH-001).
- The baseline is the **rolling observed median/trough**, not a single snapshot — a feed that inflates list price then "discounts" does **not** fire a phantom-saving alert (SC-SH-004; Clarification Q2).
- A watched item with **no linked goal** still shows budget framing; the time-to-goal line is **omitted** (not "no goal") (FR-X-004).
- A stale price feed renders the price with a Stale chip and is **not** alerted as a live drop (SC-SH-004).
- The alert routes through the **Inbox digest** (priority *Important*) — Shopping sends **0** standalone pushes (SC-SH-009).
- A USD-priced item converts to CAD via a timestamped FX rate (arbitrary precision, half-up at the final cent); a stale FX rate flags the converted figure (FR-X-002/008).

### US3 — Buy-Now-vs-Wait Score Grounded in Budget, Runway & Goals (P2)

```bash
pnpm test shopping/unit/buy-wait-branches
pnpm test shopping/integration/buy-wait
```

Expected:
- The score returns a numeric `score`, a `recommended_best_date`, and `goal_impact`, with `reasoning` citing price trend **and** budget headroom **and** runway/safety (SC-SH-001).
- **No budget headroom** in the item's category → `decision = wait`, reason references the budget/goal state (FR-SHOP-003; umbrella AS4).
- **`SafeToActSignal` overdraft risk** present → Cash Safety **takes precedence**: `decision = wait`, `safe_to_act_deferred = true`, Conflict Banner names both signals and the resolution rule (SC-SH-002; ux-foundations §3.1/§10.4).
- **Stale/missing `BudgetState`/`CashFlowForecast`/`GoalState`** (primary money inputs) → score **WITHHELD**, user asked to refresh — never guessed (SC-SH-003; Constitution VI).
- **`SafeToActSignal` entirely absent** → falls back to `CashFlowForecast.shortfall_flag`/`runway_days` (`safety_signal_source = cash_flow_forecast`); when **both** are absent → `safety_signal_source = unavailable`, output **capped at wait/neutral** for any material spend, labelled "safety signal unavailable" — never a confident `buy_now` (Clarification Q4; documented Constitution VI boundary).
- A future `recommended_best_date` renders in the active locale (`3 juillet 2026` for fr-CA) and the projected saving-by-waiting shows in CAD (FR-X-004/005).

## Contract tests (mandatory — Principle VII / SC-SH-010)

```bash
pnpm test shopping/contract/consumed   # BudgetState, CashFlowForecast, GoalState, MerchantGraph,
                                        # TransactionStream, OfferCatalog (+ feature-checked SafeToActSignal, CheckoutRecommendation)
pnpm test shopping/contract/provided    # WatchedItems, CouponRecommendation, PurchasePlan, RealizedSavings
```

Expected: all consumer + provider contract tests pass against the pinned min versions (`finos:spine/*/1.0.0`, `finos:rewards/OfferCatalog/1.0.0`, `finos:shopping/*/1.0.0`); an intentionally bumped/broken **consumed** schema **fails CI** and disables the dependent Shopping feature rather than serving on a mismatched schema (version-skew behavior, SC-SH-010). Feature-checked consumers (`SafeToActSignal`, `CheckoutRecommendation`) keep their consumer tests behind the same feature flag until those providers ship.

## Cross-cutting checks

- **Recommend-only (SC-SH-007 / FR-X-003)**: grep the Shopping API surface — there is **no** endpoint that completes a checkout, auto-applies a coupon, or moves money; every action is a recommendation or a user-confirmed state write through a Confirm-Action sheet.
- **Audit trail (Principle VI / FR-X-007)**: `recommendation_shown`, `coupon_use_acknowledged`, `realized_savings_recorded`, `watch_created`/`watch_removed`, and `cross_member_access_denied` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Cross-member authZ (SC-SH-011 / Principle V)**: an API-layer (not UI) authorization test proves **0** cross-member exposure of another member's watchlist/ledger/buy-wait history; every denied cross-member read is audited.
- **Email-revocation purge (SC-SH-012 / FR-X-013)**: a watched item/coupon whose **sole** source is a connected email (`email_sourced = true`) is purged within 7 days of email-access revocation, regardless of which store holds it.
- **Redaction (FR-X-014)**: debug logs contain no PII or monetary values.
- **Notification restraint (SC-SH-009)**: price-drop/best-date alerts route only through the Inbox digest; 0 standalone pushes.
- **Performance (SC-010)**: module-switch into Shopping renders the cached watchlist/last-coupon in ≤ 300 ms; cache miss/stale renders a flagged/withheld state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual EN/FR screen-reader labels on every interactive element and data value.

## Done when

All US1–US3 validations pass, the money fixtures (percentage-coupon slippage, multi-currency FX, realized-vs-expected divergence, buy/wait "no-headroom ⇒ wait" and "Cash-Safety-risk ⇒ wait" branches) show zero slippage and correct branching, all consumer+provider contract tests are green, and the cross-cutting checks (recommend-only, audit, cross-member authZ, email purge, redaction, notification restraint, performance, a11y) hold.

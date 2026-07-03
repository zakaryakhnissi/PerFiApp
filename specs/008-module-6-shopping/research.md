# Phase 0 Research: Module 6 — Shopping & Deals

**Feature**: `008-module-6-shopping` | **Date**: 2026-06-29

Resolves the module-specific technical decisions the design depends on. **Platform-stack choices are inherited from [platform-decisions.md](../_platform/platform-decisions.md) and NOT re-litigated here** (TypeScript modular monolith; NestJS + RN/Expo; PostgreSQL `ca-central-1`; `@finos/money` integer-cents + `decimal.js`; `@finos/format` locale rendering; append-only audit; Pact contract tests; BullMQ ingestion). Items genuinely open are flagged as **documented open items (non-blocking)** and handed to planning/ops.

Decision format: **Decision / Rationale / Alternatives**.

---

## 1. Monetary arithmetic & rounding (inherited)

**Decision**: Reuse the platform `@finos/money` convention — savings/prices/thresholds as **integer CAD cents**; FX rates and coupon discount fractions as **arbitrary-precision decimal strings** on the wire. Compute `price × discount_fraction` and `foreign × fx` in arbitrary precision, round **half-up to the nearest CAD cent** at the final step only. No binary float in any coupon, price, saving, or FX path.

**Rationale**: Constitution IV (NON-NEGOTIABLE) and FR-X-002. A percentage coupon on a large cart drifts by a cent under float; integer cents keep saving totals exact and the ledger reconcilable. Identical to the Rewards valuation discipline so the shared money package is reused, not re-implemented.

**Alternatives considered**: Float/double — rejected (constitutionally prohibited). Per-module money helpers — rejected (drift risk; `@finos/money` is the single source).

---

## 2. Coupon/promo-code source

**Decision**: Treat retail coupons as an **external, freshness-stamped feed** behind a `CouponProvider` interface, seeded with a curated Canada-first sample (major Canadian retailers). The interface and freshness handling are fixed now; concrete vendor selection is a procurement/planning decision (subprocessor register, platform NR-4).

**Rationale**: FR-SHOP-001 + Fresh-or-Flagged (Principle VIII). Abstracting behind `CouponProvider` lets a curated seed ship for MVP and a licensed feed swap in without touching best-code selection. Each coupon carries a `FreshnessStamp`; stale coupons flag/withhold (SC-SH-004). Mirrors Rewards' `OfferProvider` pattern.

**Alternatives considered**: Hard-coded coupon list — rejected (no refresh, no freshness semantics). Browser-extension scraping at checkout — rejected for MVP (ToS/fragility; out of the recommend-only mobile scope).

---

## 3. Price-watch baseline & drop detection

**Decision**: Compute the drop baseline from **observed price history** (rolling median/trough over the tracked window) via a `PriceProvider` interface, **not** a single feed snapshot. A drop fires when the current tracked price falls below the user's threshold or a default percentage below the rolling baseline.

**Rationale**: FR-SHOP-002 + the "fake-anchor discount" edge case. A single-snapshot baseline lets a feed inflate the list price then alert a phantom saving; a rolling observed baseline defeats this (Clarification Q2; SC-SH-004). Price feeds carry a `FreshnessStamp`; stale ⇒ no live-drop alert.

**Alternatives considered**: Single-snapshot baseline — rejected (gameable). User-entered baseline only — rejected (poor coverage, weak alerts).

---

## 4. Buy/wait scoring inputs & safety fallback

**Decision**: The buy/wait score is computed from **price trend (PriceProvider) + budget headroom (`BudgetState`) + runway/safety (`SafeToActSignal`, else `CashFlowForecast`) + goal impact (`GoalState`)**. `BudgetState`/`CashFlowForecast`/`GoalState` are **primary money inputs**: stale/missing ⇒ **withhold**. `SafeToActSignal` is the preferred safety input; when absent, fall back to `CashFlowForecast.shortfall_flag`/`runway_days`; when **both** are absent, compute on budget/goal alone, label "safety signal unavailable", and **cap output at wait/neutral** for material spends (never a confident buy-now without a safety input).

**Rationale**: Integration-First (FR-X-001) + Cash-Safety precedence (ux-foundations.md §10.4) + the Constitution VI documented-default boundary. Unlike Rewards' silent healthy-band default, the missing input here bears directly on a **spend** recommendation, so the safe boundary is a capped "wait", not a confident proceed (Clarification Q4). This keeps the module usable before Cash Safety ships without ever upgrading to an unsafe buy-now.

**Alternatives considered**: Block all buy/wait until Cash Safety ships — rejected (Shopping must be independently shippable per its Independent Test). Assume "safe" when no safety input — rejected (would recommend buy-now over an unknown overdraft risk; violates the precedence rule).

---

## 5. Staleness-threshold defaults

**Decision**: Ship Canada-oriented default staleness windows, user-adjustable: coupons **6 h**, tracked prices **24 h**, FX rates **1 h**. Exact values confirmed in the Module 0 ops/PIA review; the mechanism (per-value `FreshnessStamp` + threshold) is fixed and shared with the spine.

**Rationale**: FR-X-008 / SC-SH-004. Coupons expire fast and move often (shorter window); prices are slower; FX is fastest (matches the platform FX window). Concrete behavior for tests now, final tuning to ops (platform NR-2).

**Alternatives considered**: Single global threshold — rejected (FX and coupons move at very different rates).

---

## 6. Realized-savings recording (idempotent, truthful)

**Decision**: Record a `RealizedSavings` row when a watched/coupon-tied purchase **posts** in `TransactionStream` (status `posted`, not `merged_duplicate`/`suspected_duplicate`), keyed idempotently on the source event id. The recorded figure is the **actual** posted saving; when it diverges from the coupon's expected value, store the actual and set `diverged = true`.

**Rationale**: FR-SHOP-001 + FR-X-003 (idempotent writes) + SC-SH-006 (truth over optimism). Keying on the source event id makes retries safe; reading `dedup_state` from `TransactionStream` prevents double-counting a merged duplicate.

**Alternatives considered**: Record on coupon **recommendation** (before purchase) — rejected (records a saving that may never happen). Record the expected figure — rejected (overstates savings; violates SC-SH-006).

---

## 7. Recommend-only enforcement

**Decision**: No Shopping endpoint completes a checkout, auto-fills/submits a coupon, or moves money. Every consequential step (acknowledging a coupon was used, confirming a planned purchase) routes through a Confirm-Action sheet; the API surface is propose / confirm-and-record only (platform §2 recommend-only).

**Rationale**: Constitution IV recommend-only clause + FR-X-003 + ux-foundations.md §2.2. The realized-savings ledger records what the **user** did; FinOS never acts.

**Alternatives considered**: One-tap "apply coupon" automation — rejected (would have FinOS act in the checkout; out of bounds).

---

## 8. Notification routing

**Decision**: Price-drop and best-date alerts are emitted to the **Inbox digest pipeline** (priority tier *Important*) with localized EN/FR short descriptions; Shopping never calls a push API directly.

**Rationale**: SC-SH-009 + ux-foundations.md §6 (Inbox owns notification discipline; ≤2 money notifications/day). Keeps the module within the platform notification budget.

**Alternatives considered**: Direct push on every drop — rejected (violates the notification budget and §6.3).

---

## 9. Contract testing approach (inherited)

**Decision**: Consumer-driven (Pact) contract tests for each consumed contract (`BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, `TransactionStream`, `OfferCatalog`, and the feature-checked `SafeToActSignal`/`CheckoutRecommendation`) and provider contract tests for each provided contract (`WatchedItems`, `PurchasePlan`, `RealizedSavings`, `CouponRecommendation`), running in CI; contracts semver'd with a deprecation window.

**Rationale**: Principle VII + FR-X-011 + SC-SH-010. Version skew disables the dependent feature rather than serving on a mismatched schema. Feature-checked consumers (Cash Safety, Pay) keep their consumer tests behind the same feature flag until those providers ship.

**Alternatives considered**: Integration-only against a live spine — rejected (slow, no schema pin, no provider-side guarantee).

---

## Documented open items (handed to planning/ops — non-blocking)

- **OI-1 (Coupon vendor)**: concrete Canadian-coverage retail coupon feed + residency posture; enters the subprocessor register (platform NR-4). Working default: `CouponProvider` interface + curated seed.
- **OI-2 (Price vendor)**: concrete price-history feed + residency posture; subprocessor register. Working default: `PriceProvider` interface + curated seed.
- **OI-3 (Staleness windows)**: final coupon/price/FX windows confirmed in the Module 0 ops/PIA review (platform NR-2).
- **OI-4 (Pay availability)**: whether `CheckoutRecommendation` (Module 5) is available at Shopping MVP; consumer is feature-checked until Pay ships.
- **OI-5 (Cash Safety availability)**: `SafeToActSignal` (Module 3) is not yet published; the documented `CashFlowForecast` fallback + capped-output rule (Clarification Q4 / §4 above) governs until it ships.
- **OI-6 (Email-parsing subprocessor)**: shared with the platform Inbox/Travel email-parsing provider (platform NR-6); Shopping only consumes provenance-tagged enrichment and applies the FR-X-013 purge.

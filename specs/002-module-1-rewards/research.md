# Phase 0 Research: Module 1 — Rewards & Loyalty

**Feature**: `002-module-1-rewards` | **Date**: 2026-06-26

Resolves the `NEEDS CLARIFICATION` items from [plan.md](./plan.md) Technical Context, plus the Rewards-specific technical decisions that the design depends on. Platform-stack choices (language/storage/mobile framework) are deferred to the Module 0 platform plan and are **not** re-litigated here.

---

## 1. Monetary arithmetic & rounding

**Decision**: Store points redemption rates (cents-per-point) and FX rates as **arbitrary-precision decimal**; store and total CAD values as **integer minor units (cents)**. Compute `points × rate` (and `foreign × fx`) in arbitrary precision, then round **half-up to the nearest CAD cent** at the display/storage boundary only. No binary floating point in any valuation, earn-rate, or bonus math.

**Rationale**: Constitution Principle IV (NON-NEGOTIABLE) and FR-X-002 / FR-REW-001. Float on a 500,000-point balance produces cent-level drift that cascades into time-to-goal and downstream `BestCardRecommendation`. Integer cents make totals associative and exact; arbitrary-precision rates avoid precision loss before the single rounding step.

**Alternatives considered**: Float/double — rejected (constitutionally prohibited, slippage). Cents-only without decimal rates — rejected (rates like 1.05 cpp need sub-cent precision before the final round).

---

## 2. Points redemption-rate source

**Decision**: Treat redemption rate (cents-per-point) as an **external, freshness-stamped feed** behind a `RateProvider` interface, seeded with a curated Canada-first valuation table (Aeroplan, Scene+, RBC Avion, AmEx MR, WestJet, etc.). Concrete vendor/source selection is a procurement decision; the interface and freshness handling are fixed now.

**Rationale**: FR-REW-001 + Fresh-or-Flagged (Principle VIII). Abstracting behind `RateProvider` lets the curated seed table ship for MVP and a licensed feed swap in without touching valuation logic. Each rate carries a `FreshnessStamp`; stale rates flag/withhold the valuation (SC-R-005).

**Alternatives considered**: Hard-coded rates in code — rejected (not refreshable, no freshness semantics). User-entered rates only — rejected (poor onboarding payoff, SC-R-007).

---

## 3. FX-rate source (multi-currency programs)

**Decision**: Consume a **timestamped FX-rate feed** via an `FxProvider` interface (same freshness contract as rates). Convert foreign-program valuations to CAD in arbitrary precision, round half-up to cents. Stale FX flags the converted figure (umbrella multi-currency edge case).

**Rationale**: Umbrella "FX and deal feeds" assumption + FR-X-008. Mirrors the Travel module's FX handling (FR-TRV-001) so a single shared FX provider can serve both.

**Alternatives considered**: Per-module FX implementations — rejected (duplicate logic, drift risk); a shared spine-level FX contract is preferable and noted as a cross-module follow-up.

---

## 4. Canada-first card knowledgebase

**Decision**: A **curated, versioned, bilingual card-knowledgebase dataset** (earn rates by category, credits, perks, insurance) behind a `CardKnowledgebase` interface, versioned as a contract so the recommender reasons against a known schema. MVP ships a curated dataset for major Canadian issuers; a licensed feed can replace the loader later.

**Rationale**: FR-REW-002 (Canada-first, bilingual) + Principle VII (versioned contracts). Versioning the dataset means a breaking schema change is caught by contract tests rather than silently mis-recommending.

**Alternatives considered**: Scrape issuer sites — rejected (fragile, ToS risk, no bilingual guarantee). Crowd-sourced — rejected for MVP (accuracy/liability).

---

## 5. Card-linked offer feed

**Decision**: Normalize card-linked offers behind an `OfferProvider` interface per Canadian bank, mapping each offer to a `MerchantGraph` node and a budget category, with a `FreshnessStamp`. P3 story (US5); ships after the wallet/recommender. Stale offers flag/withhold.

**Rationale**: FR-REW-006 + FR-X-008. Offer availability/format varies per issuer; an adapter-per-source pattern keeps normalization isolated.

**Alternatives considered**: Single aggregated offer feed — kept as an option if a provider covers multiple issuers; the interface supports both.

---

## 6. Staleness-threshold defaults

**Decision**: Ship Canada-oriented default staleness windows, user-adjustable (umbrella "default thresholds" assumption): points balances/valuations **24 h**, FX rates **1 h**, card-linked offers **24 h**, knowledgebase **30 d** (curated, slow-moving). Exact values confirmed in the Module 0 privacy/ops review; the mechanism (per-value `FreshnessStamp` + threshold) is fixed.

**Rationale**: FR-X-008 / SC-R-005. Provides concrete behavior for tests now while leaving final tuning to ops.

**Alternatives considered**: Single global threshold — rejected (FX moves far faster than a curated knowledgebase).

---

## 7. Utilization-band sourcing (no recompute)

**Decision**: Read canonical utilization bands and current utilization from `CreditState` (< 10% optimal, < 30% healthy, 30–50% warn, > 50% hard-avoid). The recommender evaluates a candidate spend's effect on per-card **and** aggregate utilization using `CreditState`; it does not recompute utilization from raw balances.

**Rationale**: FR-REW-003 + umbrella `CreditState` canonical bands. Single source of truth prevents divergence between Credit and Rewards (umbrella Integration principle).

**Alternatives considered**: Recompute utilization in Rewards from `AccountState` — rejected (duplicates Credit logic, risks divergence).

---

## 8. Conflict resolution with Cash Safety

**Decision**: When `SafeToActSignal` (Module 3) is present and flags overdraft risk, it **takes precedence** over a spend-positive best-card recommendation; the conflict and resolution are surfaced (umbrella cross-module edge case). When Cash Safety is not yet shipped, the recommender still enforces `CreditState` utilization bands and proceeds; the `SafeToActSignal` consumer is wired behind a feature check.

**Rationale**: Umbrella "Conflicting recommendations" edge case + phased delivery (Rewards is P1, Cash Safety also P1 but may land separately).

**Alternatives considered**: Block all recommendations until Cash Safety exists — rejected (Rewards is independently shippable per its Independent Test).

---

## 9. Performance: ≤ 300 ms module-switch

**Decision**: Maintain a local, freshness-stamped cache of the Points Wallet and `CardLineup` on the mobile client; the recommender operates on cached spine reads refreshed in the background. A cache miss or stale-beyond-threshold value triggers a flagged/withheld state rather than a blocking network fetch on the hot path.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget.

**Alternatives considered**: Always-live fetch on tab open — rejected (blows the 300 ms budget); serve stale silently to hit latency — rejected (violates Principle VIII).

---

## 10. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed spine contract (`BudgetState`, `CashFlowForecast`, `CreditState`, `MerchantGraph`, `GoalState`, `SafeToActSignal`) and provider contract tests for each provided contract (`CardLineup`, `PointsValuation`, `BestCardRecommendation`, `OfferCatalog`, `StatusState`), running in CI; contracts semver'd with a deprecation window.

**Rationale**: Principle VII + FR-X-011 + SC-R-008. Version skew disables the dependent recommendation (umbrella edge case) instead of serving on a mismatched schema.

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (not blocking design)

- Final vendor selection for redemption-rate, FX, and offer feeds (procurement).
- Exact staleness-window and dormant-account retention values (Module 0 privacy impact assessment, FR-X-019).
- Whether FX becomes a shared spine-level contract (cross-module follow-up with Travel).

# Consumed Contracts (referenced — owned by other modules)

Shopping accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Shopping's **consumer** contract tests pin the exact minimum versions it depends on. Version skew on any of these **disables** the dependent Shopping feature in CI (umbrella edge case, SC-SH-010).

| Contract | `$id` (min version) | Owner | Why Shopping needs it |
|----------|---------------------|-------|-----------------------|
| `BudgetState` | `finos:spine/BudgetState/1.0.0` | Module 0 (Spine) | budget headroom for buy/wait (PRIMARY money input — stale/missing ⇒ withhold); drop-alert and savings budget-category framing |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 (Spine) | runway/safety input for buy/wait; SafeToActSignal fallback when Cash Safety is absent (Clarification Q4) |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | goal impact + time-to-goal framing on savings and buy/wait |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 (Spine) | canonical merchant identity for watched items, coupons, and realized savings |
| `TransactionStream` | `finos:spine/TransactionStream/1.0.0` | Module 0 (Spine) | purchase-posted detection to record realized savings idempotently (only `posted`, non-`merged_duplicate` rows count) |
| `OfferCatalog` | `finos:rewards/OfferCatalog/1.0.0` | Module 1 (Rewards) | card-linked offers to enrich the coupon surface (the **chosen** coupon stays Shopping-owned) |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` | Module 3 (Cash Safety) | overdraft-precedence override of a would-be buy-now. **Not yet published** — Module 3 is a placeholder; wired behind a feature check, with `CashFlowForecast` as the documented fallback until it ships (Assumptions; Clarification Q4) |
| `CheckoutRecommendation` | `finos:pay/CheckoutRecommendation/1.0.0` | Module 5 (Pay) | surface the recommended checkout card alongside the coupon. **Not yet published** — Module 5 is unspecced; wired behind a feature check; Shopping surfaces the coupon without it until Pay ships |

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent Shopping feature is **disabled**, not served on a mismatched schema.

## External datasets/feeds (not cross-module contracts, but freshness-bound)

These power FR-SHOP-001..003 and obey Fresh-or-Flagged; concrete Canadian-coverage vendors and their residency posture are selected in planning (subprocessor register; platform NR-4). Behind swappable interfaces:

- **Retail coupon/promo-code feed** (`CouponProvider`) — per-merchant valid codes + terms; stale ⇒ flagged/withheld.
- **Price-history feed** (`PriceProvider`) — observed price series powering the watch baseline (rolling median/trough, Clarification Q2); stale ⇒ flagged.
- **FX-rate feed** (shared with the spine) — foreign coupon/price → CAD conversion (decimal-string rate, half-up at the final cent); stale ⇒ converted figure flagged.
- **Email-inferred enrichment** — watched items/coupons inferred from a connected promotional email; provenance-tracked (`source = email_inferred`, `email_sourced = true`) so the FR-X-013 revocation purge targets exactly that data within 7 days.

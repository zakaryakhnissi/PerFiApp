# Contracts: Module 6 — Shopping & Deals

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011) — never shared mutable state. Every contract has **consumer + provider** contract tests in CI (SC-SH-010). Contracts are semver'd in their `$id` (`finos:<area>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window, and version skew **disables** the dependent feature rather than serving on a mismatched schema (umbrella edge case).

All schemas are JSON Schema **draft 2020-12**. Shared value objects (`finos:common/FreshnessStamp/1.0.0`, `finos:common/MoneyCents/1.0.0`, `finos:common/Reasoning/1.0.0`) are published by Module 0 and reused here by `$ref`.

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `WatchedItems` | `finos:shopping/WatchedItems/1.0.0` | [provided/watched-items.schema.json](./provided/watched-items.schema.json) | Tasks, Pay, Inbox |
| `PurchasePlan` (Buy-Now-vs-Wait Score) | `finos:shopping/PurchasePlan/1.0.0` | [provided/purchase-plan.schema.json](./provided/purchase-plan.schema.json) | Tasks, Pay, Inbox |
| `RealizedSavings` | `finos:shopping/RealizedSavings/1.0.0` | [provided/realized-savings.schema.json](./provided/realized-savings.schema.json) | Tasks, Pay, Inbox |
| `CouponRecommendation` | `finos:shopping/CouponRecommendation/1.0.0` | [provided/coupon-recommendation.schema.json](./provided/coupon-recommendation.schema.json) | Pay, Inbox |

> The umbrella Provides list for Module 6 is `WatchedItems`, `PurchasePlan`, `RealizedSavings` (to Tasks, Pay, Inbox). `CouponRecommendation` is added as the recommend-only surface of FR-SHOP-001 (the single best valid code), consumed by Pay (alongside its own `CheckoutRecommendation`) and Inbox (digest alerts).

## Consumed (this module is a consumer)

Owned by Module 0 (spine), Module 1 (Rewards), Module 3 (Cash Safety), and Module 5 (Pay). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | `$id` / Version | Owner | Used by |
|----------|-----------------|-------|---------|
| `BudgetState` | `finos:spine/BudgetState/1.0.0` | Module 0 | buy/wait headroom; drop-alert budget framing; saving ledger category |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 | buy/wait runway/safety input (and SafeToActSignal fallback) |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 | goal-impact + time-to-goal framing |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 | merchant identity for watch/coupon/saving |
| `TransactionStream` | `finos:spine/TransactionStream/1.0.0` | Module 0 | purchase-posted detection for realized-savings recording |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` *(not yet published)* | Module 3 | buy/wait overdraft precedence (feature-checked) |
| `OfferCatalog` | `finos:rewards/OfferCatalog/1.0.0` | Module 1 | enrich coupon surface with card-linked offers |
| `CheckoutRecommendation` | `finos:pay/CheckoutRecommendation/1.0.0` *(not yet published)* | Module 5 | surface card recommendation alongside coupon (feature-checked) |

**Money on the wire**: `*_cents` / `MoneyCents.amount_cents` are integer minor units; FX rates and discount fractions are decimal **string-encoded** (`^[0-9]+(\.[0-9]+)?$`) to prevent float coercion (Principle IV). Every externally-sourced object carries a `FreshnessStamp` (Principle VIII).

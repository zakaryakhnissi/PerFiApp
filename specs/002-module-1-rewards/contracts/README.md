# Contracts: Module 1 — Rewards & Loyalty

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-R-008). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window.

## Provided (this module is the provider)

| Contract | Version | Schema | Consumers |
|----------|---------|--------|-----------|
| `CardLineup` | 1.0.0 | [provided/card-lineup.schema.json](./provided/card-lineup.schema.json) | Pay, Shopping, Travel, Household, Credit |
| `PointsValuation` | 1.0.0 | [provided/points-valuation.schema.json](./provided/points-valuation.schema.json) | Pay, Travel, Goals UI |
| `TransferIntelligence` | 1.0.0 | [provided/transfer-intelligence.schema.json](./provided/transfer-intelligence.schema.json) | Travel, Pay |
| `BestCardRecommendation` | 1.0.0 | [provided/best-card-recommendation.schema.json](./provided/best-card-recommendation.schema.json) | Pay |
| `OfferCatalog` | 1.0.0 | [provided/offer-catalog.schema.json](./provided/offer-catalog.schema.json) | Shopping & Deals |
| `StatusState` | 1.0.0 | [provided/status-state.schema.json](./provided/status-state.schema.json) | Travel, Household |

## Consumed (this module is a consumer)

Owned by Module 0 (spine) / Module 3 (Cash Safety). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `BudgetState` | Module 0 | recommender, bonus tracker, offers |
| `CashFlowForecast` | Module 0 | recommender |
| `CreditState` (utilization bands) | Module 0 | recommender (band logic) |
| `MerchantGraph` | Module 0 | recommender, offers |
| `GoalState` | Module 0 | points valuation (time-to-goal) |
| `SafeToActSignal` | Module 3 | recommender (overdraft precedence) |

**Money on the wire**: `*_cents` are integer minor units; `*_rate` are decimal **string-encoded** to prevent float coercion (Principle IV).

# Contracts: Module 11 — Travel & Trips

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-012). Contracts are semver'd in their `$id` (`finos:<area>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window. On version skew, the dependent recommendation is **disabled**, not served on a mismatched schema (umbrella edge case, SC-012).

All schemas are JSON Schema **draft 2020-12**.

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `TripBudget` | `finos:travel/TripBudget/1.0.0` | [provided/trip-budget.schema.json](./provided/trip-budget.schema.json) | Rewards (status), Bills (trip bills), Workspace |
| `TravelSpend` | `finos:travel/TravelSpend/1.0.0` | [provided/travel-spend.schema.json](./provided/travel-spend.schema.json) | Rewards (status), Bills (trip bills), Workspace |

## Consumed (this module is a consumer)

Owned by Module 0 (spine) and Module 1 (Rewards). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `BudgetState` | Module 0 | trip-budget linking, headroom, over-budget flag |
| `GoalState` | Module 0 | time-to-goal context on trip costs/savings |
| `MerchantGraph` | Module 0 | travel-merchant identity for spend matching |
| `TransactionStream` | Module 0 | matching real travel transactions for TravelSpend stats |
| `CardLineup` | Module 1 (Rewards) | card travel-insurance perks for the insurance-gap flag |
| `StatusState` | Module 1 (Rewards) | loyalty/elite status context on a trip |
| `SafeToActSignal` | Module 3 (Cash Safety) | overdraft-precedence on any spend-positive trip suggestion (feature-checked until Cash Safety ships) |

**Money on the wire**: `*_cents` are integer minor units (CAD); `fx_rate` / rate fields are decimal **string-encoded** to prevent float coercion (Principle IV). Foreign amounts are FX-converted to CAD in arbitrary precision, half-up at the final cent.

**External feeds (not cross-module contracts, but freshness-bound)**: an FX-rate feed and an email/confirmation parsing source. The spine has **no FX contract** (FX is an internal Module 0 feed); Travel consumes FX as a freshness-stamped external feed behind an `FxProvider` interface (shared with Rewards). See [consumed/README.md](./consumed/README.md) and [../research.md](../research.md).

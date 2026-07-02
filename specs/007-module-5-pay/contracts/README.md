# Contracts: Module 5 — Pay & Payment Optimization

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-P-010). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window. On version skew, the dependent recommendation is **disabled**, not served on a mismatched schema (umbrella edge case, SC-012).

## Provided (this module is the provider)

| Contract | Version | `$id` | Schema | Consumers |
|----------|---------|-------|--------|-----------|
| `CheckoutRecommendation` | 1.0.0 | `finos:pay/CheckoutRecommendation/1.0.0` | [provided/checkout-recommendation.schema.json](./provided/checkout-recommendation.schema.json) | Bills, Cash Safety, Shopping, Tasks |
| `PaymentSchedule` | 1.0.0 | `finos:pay/PaymentSchedule/1.0.0` | [provided/payment-schedule.schema.json](./provided/payment-schedule.schema.json) | Bills, Cash Safety, Shopping, Tasks |

> The umbrella "Provides" list for Module 5 is `PaymentSchedule`, `CheckoutRecommendation` — both are published here.

## Consumed (this module is a consumer)

Owned by Module 0 (spine), Module 1 (Rewards), and the not-yet-shipped Module 3 (Cash Safety) / Module 4 (Bills). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `BestCardRecommendation` | Module 1 (Rewards) | checkout overlay (reward-optimal candidate) |
| `CardLineup` | Module 1 (Rewards) | checkout overlay (card method set, earn rules, limits) |
| `PointsValuation` | Module 1 (Rewards) | checkout overlay (already-CAD-valued reward figure) |
| `CreditState` | Module 0 (Spine) | checkout overlay (utilization bands / hard-avoid guardrail) |
| `CashFlowForecast` | Module 0 (Spine) | checkout overlay + sequencer (runway / projected lowest balance) |
| `BudgetState` | Module 0 (Spine) | checkout overlay (budget headroom, primary money input) |
| `GoalState` | Module 0 (Spine) | sequencer (goal-progress objective, time-to-goal context) |
| `AccountState` | Module 0 (Spine) | checkout overlay (account method set, liquidity) |
| `MerchantGraph` | Module 0 (Spine) | checkout overlay (merchant identity) |
| `SafeToActSignal` | Module 3 (Cash Safety) | checkout overlay + sequencer (overdraft-precedence override; wired behind a feature check until Cash Safety ships) |
| `BillCalendar` | Module 4 (Bills) | sequencer (recurring-obligation set; user-entered fallback until Bills ships) |

**Money on the wire**: `*_cents` are integer minor units; any rate (FX/earn multiplier) consumed from a provider is decimal **string-encoded** to prevent float coercion (Principle IV). Pay re-derives no points-to-CAD valuation — reward figures arrive already CAD-valued from Rewards.

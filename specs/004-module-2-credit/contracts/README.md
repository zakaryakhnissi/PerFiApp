# Contracts: Module 2 — Credit & Coaching

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-C-008). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window.

> **Provider-boundary note (CreditState):** the **Spine (Module 0)** is the **single canonical provider** of `finos:spine/CreditState/1.0.0` (utilization, bands, due-date risk) per FR-CORE-005. The umbrella's "Module 2 **Provides**: `CreditState` enrichment" is realized by Module 2 **feeding bureau-sourced score/factor enrichment into the spine's CreditState pipeline** — **not** by re-publishing a competing `CreditState` contract (that would give one contract two providers, violating Principle VII). Module 2's own provided contracts are the **coaching/playbook/refinance outputs** plus a **`CreditFactors`** monitor read-model (score + ranked factors). See [spec.md → Clarifications](../spec.md#clarifications).

## Provided (this module is the provider)

| Contract | $id / Version | Schema | Consumers |
|----------|---------------|--------|-----------|
| `CreditFactors` | `finos:credit/CreditFactors/1.0.0` | [provided/credit-factors.schema.json](./provided/credit-factors.schema.json) | Credit UI, Household |
| `CreditCoachingPlan` | `finos:credit/CreditCoachingPlan/1.0.0` | [provided/credit-coaching-plan.schema.json](./provided/credit-coaching-plan.schema.json) | Credit UI, Cash Safety, Pay, Bills, Household |
| `CreditBuilderPlaybook` | `finos:credit/CreditBuilderPlaybook/1.0.0` | [provided/credit-builder-playbook.schema.json](./provided/credit-builder-playbook.schema.json) | Credit UI, Household |
| `RefinanceSignals` | `finos:credit/RefinanceSignals/1.0.0` | [provided/refinance-signals.schema.json](./provided/refinance-signals.schema.json) | Rewards, Cash Safety, Pay, Bills, Household |

## Consumed (this module is a consumer)

Owned by Module 0 (spine) / Module 1 (Rewards) / Module 3 (Cash Safety). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `CreditState` | Module 0 | Credit Monitor, coaching (canonical utilization/bands/due-date risk) |
| `AccountState` | Module 0 | coaching (balances/limits for early-payment math), refinance |
| `CashFlowForecast` | Module 0 | coaching (can the user afford the early payment without overdraft) |
| `GoalState` | Module 0 | time-to-goal context on credit-boosting plans |
| `CardLineup` | Module 1 (Rewards) | refinance signals (annual fee + rewards-value side of keep/downgrade/cancel) |
| `SafeToActSignal` | Module 3 (Cash Safety) | coaching/refinance (overdraft precedence over an early-payment recommendation) |

**Money on the wire**: `*_cents` / `MoneyCents.amount_cents` are integer minor units; utilization, APR, and rate fields are decimal **string-encoded** to prevent float coercion (Principle IV).

# Contracts: Module 0 — Financial Core & Data Spine

Module 0 is the **single canonical spine**: it publishes the foundational contracts **every other module reads from** (FR-CORE-005). All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011) — never shared mutable state. Every contract has **consumer + provider** contract tests in CI (SC-012). Contracts are semver'd in their `$id` (`finos:<area>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window, and version skew **disables** the dependent recommendation rather than serving on a mismatched schema (umbrella edge case, SC-012).

All schemas are JSON Schema **draft 2020-12**.

## Shared value objects (published by Module 0, reused by ALL modules)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `FreshnessStamp` | `finos:common/FreshnessStamp/1.0.0` | [provided/freshness-stamp.schema.json](./provided/freshness-stamp.schema.json) | **Every module** (already `$ref`'d by Module 1 Rewards contracts) |
| `Reasoning` | `finos:common/Reasoning/1.0.0` | [provided/reasoning.schema.json](./provided/reasoning.schema.json) | Every module producing a recommendation |
| `MoneyCents` | `finos:common/MoneyCents/1.0.0` | [provided/money-cents.schema.json](./provided/money-cents.schema.json) | Every module with a money field |

> These three were referenced as platform-canonical shared value objects in `specs/_platform/platform-decisions.md` §3 and are **ratified here** as Module 0 deliverables. Module 1's contracts already `$ref` `finos:common/FreshnessStamp/1.0.0`; this is its definitional home.

This module publishes **11 contracts in total**: the **8 spine contracts** below plus the **3 shared value objects** above. SC-S-008 gates all 11 on passing **consumer + provider** tests in CI.

## Provided spine contracts (this module is the provider — consumed by ALL modules)

| Contract | `$id` / Version | Schema | Primary consumers |
|----------|-----------------|--------|-------------------|
| `AccountState` | `finos:spine/AccountState/1.0.0` | [provided/account-state.schema.json](./provided/account-state.schema.json) | Credit, Cash Safety, Bills, Household, Tax, Pay |
| `TransactionStream` | `finos:spine/TransactionStream/1.0.0` | [provided/transaction-stream.schema.json](./provided/transaction-stream.schema.json) | Cash Safety, Bills, Tax, Shopping, Inbox |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | [provided/merchant-graph.schema.json](./provided/merchant-graph.schema.json) | Rewards, Bills/Subscriptions, Tax, Shopping |
| `BudgetState` | `finos:spine/BudgetState/1.0.0` | [provided/budget-state.schema.json](./provided/budget-state.schema.json) | Rewards, Cash Safety, Shopping, Travel, Habits |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | [provided/cash-flow-forecast.schema.json](./provided/cash-flow-forecast.schema.json) | Cash Safety, Bills, Pay, Goals, Focus |
| `CreditState` | `finos:spine/CreditState/1.0.0` | [provided/credit-state.schema.json](./provided/credit-state.schema.json) | Rewards, Credit, Pay, Focus |
| `GoalState` | `finos:spine/GoalState/1.0.0` | [provided/goal-state.schema.json](./provided/goal-state.schema.json) | Rewards, Cash Safety, Habits, Social, Travel, Focus |
| `ConnectionConsent` (AggregationLink) | `finos:spine/ConnectionConsent/1.0.0` | [provided/connection-consent.schema.json](./provided/connection-consent.schema.json) | Household, Home/onboarding, Settings |

## Consumed (this module is a consumer)

Module 0 consumes **only external feeds** — never product-module state (no circular dependencies). See [consumed/README.md](./consumed/README.md).

| External source | Maps to | Notes |
|-----------------|---------|-------|
| Aggregation provider (Plaid Canada) | `AccountState`, `TransactionStream`, `CreditState` (liabilities), `ConnectionConsent` | Behind `SpineAggregationPort`; swappable (FR-CORE-006). Tokens in KMS, never in any contract. |
| Credit bureau (Canada) | `CreditState` (score/factors) | Freshness-stamped; absent ⇒ consumers use documented healthy-band default (Constitution VI v2.2.0). |
| FX-rate feed | `TransactionStream.cad_amount`, foreign valuations | Decimal-string rates; stale ⇒ flag converted figure. |

## Money & freshness wire conventions (Principle IV / VIII)

- **Amounts** are integer minor units via `MoneyCents` (`amount_cents` integer, `currency` ISO-4217, default CAD). **Never** a float/decimal-string for an amount.
- **Rates/fractions** (FX, utilization, band thresholds) are arbitrary-precision **decimal strings** (`^[0-9]+(\.[0-9]+)?$`) to defeat JSON float coercion.
- **Every externally-sourced object carries a `FreshnessStamp`.** Stale **money** inputs (balances, amounts, forecasts) ⇒ consumers **withhold**; stale **secondary** inputs (e.g. utilization) ⇒ flag/withhold per the consuming spec; **entirely absent** utilization ⇒ documented healthy-band default.
- **Tokens/secrets appear in NO contract.** `ConnectionConsent` exposes only non-secret link metadata; aggregation tokens live solely in the KMS-backed secrets store (FR-CORE-007).

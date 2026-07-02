# Contracts: Module 4 — Bills & Subscriptions

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-B-010). Contracts are semver'd in their `$id` (`finos:<area>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window, and version skew **disables** the dependent behavior rather than serving on a mismatched schema (umbrella edge case, SC-012).

All schemas are JSON Schema **draft 2020-12**. They `$ref` the Module 0 shared value objects (`finos:common/FreshnessStamp/1.0.0`, `finos:common/MoneyCents/1.0.0`).

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `SubscriptionInventory` | `finos:bills/SubscriptionInventory/1.0.0` | [provided/subscription-inventory.schema.json](./provided/subscription-inventory.schema.json) | Cash Safety, Pay, Tasks, Shopping, Inbox |
| `BillCalendar` | `finos:bills/BillCalendar/1.0.0` | [provided/bill-calendar.schema.json](./provided/bill-calendar.schema.json) | Pay, Cash Safety, Tasks, Inbox, Habits (daily ritual) |
| `RecurringObligations` | `finos:bills/RecurringObligations/1.0.0` | [provided/recurring-obligations.schema.json](./provided/recurring-obligations.schema.json) | Cash Safety (runway), Pay (sequencer), Tasks, Shopping, Inbox |
| `FreeTrialExpiry` | `finos:bills/FreeTrialExpiry/1.0.0` | [provided/free-trial-expiry.schema.json](./provided/free-trial-expiry.schema.json) | Inbox (digest), Cash Safety, Tasks |

> These four are exactly the umbrella **Provides** list for Module 4 (`BillCalendar`, `SubscriptionInventory`, `RecurringObligations`, `FreeTrialExpiry`). `CancellationAction`/`NegotiationAction` and `BillsAuditEvent` are **module-internal** (data-model.md) — not cross-module contracts — because no other module consumes them; the resulting savings/goal impact is surfaced via the audit trail and the inventory, not a separate published contract (Principle IX).

## Consumed (this module is a consumer)

Owned by Module 0 (spine) / Module 3 (Cash Safety). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `TransactionStream` | Module 0 | Subscription Radar (recurrence detection, amounts) |
| `MerchantGraph` | Module 0 | series merchant identity + `is_subscription_like` hint |
| `BudgetState` | Module 0 | per-series budget impact + category tie-in |
| `CashFlowForecast` | Module 0 | runway → predicted safe-to-pay date (BillCalendar) |
| `GoalState` | Module 0 | time-to-goal impact of cancellation/negotiation savings |
| `SafeToActSignal` | Module 3 (Cash Safety) | overdraft-precedence override of pay-timing (wired behind a feature check until Cash Safety ships — spec C-1) |

**Money on the wire**: `*_cents` / `amount` (`MoneyCents`) are integer minor units; any rate/fraction is a decimal **string** (`^[0-9]+(\.[0-9]+)?$`) to prevent float coercion (Principle IV). Foreign-currency subscriptions use the spine's already-FX-converted `cad_amount` — Bills performs no FX of its own.

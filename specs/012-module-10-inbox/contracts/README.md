# Contracts: Module 10 — Inbox & Notifications

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-I-011). Contracts are semver'd in their `$id` (`finos:<area>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window, and version skew **disables** the dependent path rather than serving on a mismatched schema (umbrella edge case, SC-012).

All schemas are JSON Schema **draft 2020-12**. Money is integer minor units via `finos:common/MoneyCents/1.0.0` (Inbox **carries but never computes** money — Clarifications Q3); decimal fractions (e.g. impulse score) are **decimal strings** (`^[0-9]+(\.[0-9]+)?$`); every externally-sourced/relayed object carries `finos:common/FreshnessStamp/1.0.0`.

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `ModuleAlertEvent` | `finos:inbox/ModuleAlertEvent/1.0.0` | [provided/module-alert-event.schema.json](./provided/module-alert-event.schema.json) | **Every source module** (Bills, Cash Safety, Shopping, Credit, Rewards, Tasks, Habits, Travel, Docs, Social, …) emits this; Inbox is its validator/consumer |
| `NotificationDigest` | `finos:inbox/NotificationDigest/1.0.0` | [provided/notification-digest.schema.json](./provided/notification-digest.schema.json) | Habits (daily ritual), Shopping (impulse signals), Tasks |
| `UnsubscribeAction` | `finos:inbox/UnsubscribeAction/1.0.0` | [provided/unsubscribe-action.schema.json](./provided/unsubscribe-action.schema.json) | Shopping (impulse signals), Tasks |
| `NotificationPreference` | `finos:inbox/NotificationPreference/1.0.0` | [provided/notification-preference.schema.json](./provided/notification-preference.schema.json) | Settings, Home |

> **Why `ModuleAlertEvent` is a *provided* contract**: notification discipline is platform-owned (ux-foundations §6.3) — no module may push directly; every module emits a uniform alert envelope **into** Inbox. Inbox publishes the envelope shape (so all emitters conform) and is simultaneously its consumer/validator. Emitters own the substance and money correctness of their alert (Clarifications Q3); Inbox owns prioritization, dedup, budgeting, bilingual assembly, breakthrough routing, and delivery.

## Consumed (this module is a consumer)

Owned by Module 0 (spine) and the substance-bearing source modules. Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `MoneyCents` / `FreshnessStamp` / `Reasoning` | Module 0 (shared value objects) | `$ref`'d by every provided contract |
| `TransactionStream` | Module 0 (Spine) | impulse-spend ranking signal (FR-INB-001) |
| `MerchantGraph` | Module 0 (Spine) | sender → merchant mapping for impulse ranking; email-sourced enrichment cascade (FR-X-013) |
| `ConnectionConsent` | Module 0 (Spine) | email/connection link status + revocation cascade trigger |
| `ModuleAlertEvent` (as emitted by sources) | every source module | ingestion of all alerts (Inbox validates each) |

**Money on the wire**: `cad_amount` is `MoneyCents` (integer minor units), carried unchanged from the emitting module; Inbox renders via `@finos/format` and never recomputes or converts (Clarifications Q3). Decimal scores are string-encoded to prevent float coercion (Principle IV).

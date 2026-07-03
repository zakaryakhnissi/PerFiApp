# Contracts: Module 12 — Life Admin & Docs

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (Pact, platform-decisions §6). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window.

**Money on the wire**: `*_cents` fields (and `MoneyCents.amount_cents`) are integer minor units (CAD); there are **no rate fields** in this module's provided contracts (Life Admin stores and links documents — it does not compute redemption/FX math). No binary float in any path. Every externally-sourced or OCR-derived value carries a `finos:common/FreshnessStamp/1.0.0`.

## Provided (this module is the provider)

| Contract | Version | $id | Schema | Consumers |
|----------|---------|-----|--------|-----------|
| `DocumentVault` | 1.0.0 | `finos:lifeadmin/DocumentVault/1.0.0` | [provided/document-vault.schema.json](./provided/document-vault.schema.json) | Workspace, Tasks, Inbox, Travel |
| `WarrantyReminders` | 1.0.0 | `finos:lifeadmin/WarrantyReminders/1.0.0` | [provided/warranty-reminders.schema.json](./provided/warranty-reminders.schema.json) | Tasks, Inbox, Workspace |
| `ReceiptLinks` | 1.0.0 | `finos:lifeadmin/ReceiptLinks/1.0.0` | [provided/receipt-links.schema.json](./provided/receipt-links.schema.json) | Tasks, Inbox, Workspace, Travel |

Per the umbrella Cross-Module Links, Module 12 **Provides** `DocumentVault`, `WarrantyReminders`, and `ReceiptLinks` to **Tasks, Inbox, Workspace, and Travel**.

## Consumed (this module is a consumer)

Owned by Module 0 (Spine). Accessed only through their versioned contract clients — never via direct storage or cross-schema `SELECT` (preserves the swappable-spine boundary, Principle VII; platform-decisions §3). See [consumed/README.md](./consumed/README.md).

| Contract | Owner | $id (min version) | Used by |
|----------|-------|-------------------|---------|
| `TransactionStream` | Module 0 (Spine) | `finos:spine/TransactionStream/1.0.0` | receipt→transaction matching (FR-DOC-001) |
| `MerchantGraph` | Module 0 (Spine) | `finos:spine/MerchantGraph/1.0.0` | merchant identity for receipt/warranty linking + ambiguity disambiguation |

Shared value objects reused (published by Module 0): `finos:common/FreshnessStamp/1.0.0`, `finos:common/MoneyCents/1.0.0`, `finos:common/Reasoning/1.0.0`.

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent capability (auto-linking) is **disabled** rather than served on a mismatched schema — manual upload/storage of documents (which does not depend on the spine) continues to work.

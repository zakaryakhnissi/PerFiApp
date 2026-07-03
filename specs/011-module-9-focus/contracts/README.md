# Contracts: Module 9 — Focus & Mental Health

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-F-010). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window.

## Provided (this module is the provider)

| Contract | Version | `$id` | Schema | Consumers |
|----------|---------|-------|--------|-----------|
| `WellbeingAction` | 1.0.0 | `finos:focus/WellbeingAction/1.0.0` | [provided/wellbeing-action.schema.json](./provided/wellbeing-action.schema.json) | Tasks (Module 7), Workspace (Module 13) |

`WellbeingAction` is **recommend-only**: it is a proposal to create a task/goal linked to a money stressor, dispatched to Tasks/Spine only after explicit user confirmation (FR-X-003, FR-FOC-001/002). It carries the minimal action label + a typed entity reference and bilingual reasoning — never free-text distress content (FR-X-013/014). Money figures it carries are read **as-provided** (integer cents) from the source contract with that source's `FreshnessStamp`; Focus computes no money.

> **Note on `FocusSession`**: Focus session records are **owned but not provided** — they are private-by-default well-being PII and are intentionally not exposed as a cross-module contract (FR-FOC-005, Threat Model). The only data Focus emits across a module boundary is the user-confirmed `WellbeingAction` (to Tasks/Workspace) and low-priority digest events (to Inbox, per ux-foundations §6 — not a data contract).

## Consumed (this module is a consumer)

Owned by Module 0 (Spine), Module 3 (Cash Safety), and Module 4 (Bills). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `BillCalendar` | Module 4 (Bills) | stressor identification (overdue/soon-due bills) |
| `RunwayForecast` | Module 3 (Cash Safety) | stressor identification (overdraft/runway risk) + spend-precedence |
| `GoalState` | Module 0 (Spine) | stressor identification (behind-pace goals) + time-to-goal context |
| `CreditState` | Module 0 (Spine) | stressor identification (hard-avoid-band cards) |

**Money on the wire**: `*_cents` are integer minor units; any rate/fraction is decimal **string-encoded** to prevent float coercion (Principle IV). Focus is a display pass-through: it neither produces nor rounds money.

**Shared value objects** reused from Module 0: `finos:common/FreshnessStamp/1.0.0`, `finos:common/Reasoning/1.0.0`, `finos:common/MoneyCents/1.0.0`.

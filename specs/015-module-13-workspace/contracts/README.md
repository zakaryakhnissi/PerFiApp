# Contracts: Module 13 — Workspace & Playbooks

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-W-009). Contracts are semver'd in their `$id` (`finos:<module>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window, and version skew **disables** the dependent step/reference rather than rendering on a mismatched schema (umbrella edge case, SC-012).

All schemas are JSON Schema **draft 2020-12** and `$ref` Module 0's shared value objects (`finos:common/FreshnessStamp/1.0.0`, `finos:common/Reasoning/1.0.0`).

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `Playbooks` | `finos:workspace/Playbooks/1.0.0` | [provided/playbooks.schema.json](./provided/playbooks.schema.json) | Tasks (Module 7), Goals (Spine/Module 0), Focus (Module 9) |
| `NotebookReferences` | `finos:workspace/NotebookReferences/1.0.0` | [provided/notebook-references.schema.json](./provided/notebook-references.schema.json) | Focus (Module 9) |

> Per the umbrella **Provides** list for Module 13: `Playbooks`, `NotebookReferences` (generating tasks and goals) to **Tasks, Goals (Spine), and Focus**. Generated tasks/goals are **proposals** — `Playbooks.instances[].steps[].generated[]` carries the provenance id + downstream reference once Tasks / the Spine goal service materializes them. Workspace **never** writes a money value or a goal balance (recommend-only, FR-X-003).

## Consumed (this module is a consumer)

Owned by Module 0 (spine) and several product modules. Accessed **only** through their versioned contract clients — never via direct storage (preserves the swappable boundary, Principle VII). See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `BudgetState` | Module 0 (Spine) | budget-headroom step figures / notebook references |
| `GoalState` | Module 0 (Spine) | goal-progress step figures + time-to-goal context; generated-goal materialization |
| `CreditState` | Module 0 (Spine) | utilization figures in relevant playbooks (e.g. job change) |
| `RunwayForecast` | Module 3 (Cash Safety) | live runway figures in steps/references |
| `SafeToActSignal` | Module 3 (Cash Safety) | overdraft-precedence override of spend-implying steps |
| `BillCalendar` | Module 4 (Bills) | relevant-bills figures in moving/job-change playbooks |
| `DocumentVault` | Module 12 (Docs) | document links referenced by steps (e.g. lease, ROE) |
| `TripBudget` | Module 11 (Travel) | trip-cost figures in relevant playbooks |
| `TaskState` / `TaskCompletionEvents` | Module 7 (Tasks) | materialization + completion state of generated tasks |

**Money & freshness on the wire**: any cached figure is integer minor units (`*_amount_cents`) typed exactly as its upstream contract; rates are decimal **strings** (`^[0-9]+(\.[0-9]+)?$`). Workspace performs **no** monetary arithmetic (SC-W-005). Every externally-sourced figure carries a `FreshnessStamp`; a stale **money** figure resolves to `withheld` (Constitution VIII). No contract Workspace consumes or provides carries a token or secret (FR-CORE-007).

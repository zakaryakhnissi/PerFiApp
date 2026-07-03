# Contracts: Module 7 — Tasks & To-Dos

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-T-010). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window. On version skew, the dependent link/scheduling behavior is **disabled**, not served on a mismatched schema (umbrella SC-012).

## Provided (this module is the provider)

| Contract | Version | Schema | Consumers |
|----------|---------|--------|-----------|
| `TaskState` | 1.0.0 | [provided/task-state.schema.json](./provided/task-state.schema.json) | Habits, Inbox, Workspace, originating modules (Bills, Pay, Goals/Spine) |
| `TaskCompletionEvent` | 1.0.0 | [provided/task-completion-event.schema.json](./provided/task-completion-event.schema.json) | Habits (streaks/XP for real actions), Inbox, originating modules |

**$id / version of each provided contract**:
- `finos:tasks/TaskState/1.0.0`
- `finos:tasks/TaskCompletionEvent/1.0.0`

> The umbrella Provides list names `TaskState` and `TaskCompletionEvents` (plural). `TaskCompletionEvent` is the singular per-event schema; a stream/batch of these events is what the umbrella's `TaskCompletionEvents` refers to (Habits consumes the stream to advance streaks/XP idempotently).

## Consumed (this module is a consumer)

Owned by Module 0 (spine) and other product modules. Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `GoalState` | Module 0 | goal-linked tasks (live value + time-to-goal) |
| `MerchantGraph` | Module 0 | merchant-linked tasks (canonical merchant identity) |
| `CashFlowForecast` | Module 0 | smart scheduling (paydays / runway / predicted shortfall) |
| `BillCalendar` | Module 4 (Bills) — **forward-declared** | bill-linked tasks + due-date scheduling |
| `PaymentSchedule` | Module 5 (Pay) — **forward-declared** | payment-linked tasks + due-date scheduling |
| `SafeToActSignal` | Module 3 (Cash Safety) — **forward-declared** | overdraft-precedence check for spend-implying tasks |

**Money on the wire**: linked `*_cents` are integer minor units; `*_rate` are decimal **string-encoded** to prevent float coercion (Principle IV). Tasks reads these for display only and performs **no** monetary arithmetic (see spec → Money Correctness).

**Forward-declared dependencies**: `BillCalendar`, `PaymentSchedule`, and `SafeToActSignal` belong to P2/P1 modules whose provider schemas are not yet ratified at this module's authoring time. Their consumer clients are wired **behind a feature check**; the dependent behavior degrades gracefully until those contracts ship (mirrors how Rewards wired `SafeToActSignal` ahead of Cash Safety). Min versions are pinned in [consumed/README.md](./consumed/README.md) so consumer contract tests fail closed on skew.

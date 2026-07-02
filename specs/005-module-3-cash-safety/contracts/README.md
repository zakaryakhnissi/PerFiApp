# Contracts: Module 3 — Cash Safety & Autopilot

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-CASH-008). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window. Money on the wire is **integer minor units** (`*_cents` via `finos:common/MoneyCents/1.0.0`); every externally-derived object carries a `finos:common/FreshnessStamp/1.0.0`.

## Provided (this module is the provider)

| Contract | Version | $id | Schema | Consumers |
|----------|---------|-----|--------|-----------|
| `RunwayForecast` | 1.0.0 | `finos:cashsafety/RunwayForecast/1.0.0` | [provided/runway-forecast.schema.json](./provided/runway-forecast.schema.json) | Pay, Bills, Shopping, Tasks, Rewards, Focus, Workspace, Home/Spine dashboard |
| `SafeToActSignal` | 1.0.0 | `finos:cashsafety/SafeToActSignal/1.0.0` | [provided/safe-to-act-signal.schema.json](./provided/safe-to-act-signal.schema.json) | Pay, Bills, Shopping, Tasks, Rewards (every module proposing spend) |
| `RoundupProposal` | 1.0.0 | `finos:cashsafety/RoundupProposal/1.0.0` | [provided/roundup-proposal.schema.json](./provided/roundup-proposal.schema.json) | Habits (`RoundupProposals`, Module 8 daily ritual) |

**Precedence note**: `SafeToActSignal` carries `precedence_rank = 1` (ux-foundations §10.4). When it returns `unsafe`/`caution`, consuming modules MUST surface the Conflict Banner and defer to it over any optimization recommendation (umbrella "Conflicting recommendations" edge case; SC-CASH-003).

**Recommend-only note**: None of these contracts move money. `RunwayForecast.micro_actions` and `RoundupProposal` are PROPOSALS the user executes externally (Constitution IV; FR-X-003; SC-007). No `micro_actions.kind` or `RoundupProposal.destination` value originates a cash advance or any credit product (FR-CASH-002).

## Consumed (this module is a consumer)

Owned by Module 0 (spine) / Module 4 (Bills). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `CashFlowForecast` | Module 0 | runway derivation (primary money input) |
| `AccountState` | Module 0 | starting balance / account picture, partial-data marking |
| `TransactionStream` | Module 0 | roundup triggers (qualifying purchases) |
| `BudgetState` | Module 0 | `reduce_discretionary` micro-action; safe-spend context |
| `GoalState` | Module 0 | roundup destination time-to-goal contribution |
| `CreditState` | Module 0 | due-date risk context for shortfall ranking (secondary guardrail) |
| `BillCalendar` | Module 4 (Bills) | `move_bill_date` micro-action (wired behind a feature check until Bills ships) |

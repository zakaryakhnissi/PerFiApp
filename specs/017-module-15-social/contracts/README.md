# Contracts: Module 15 — Social & Accountability

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-S-008). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window.

## Provided (this module is the provider)

| Contract | Version | Schema | $id | Consumers |
|----------|---------|--------|-----|-----------|
| `CircleProgress` | 1.0.0 | [provided/circle-progress.schema.json](./provided/circle-progress.schema.json) | `finos:social/CircleProgress/1.0.0` | Habits, Inbox |
| `AccountabilitySignals` | 1.0.0 | [provided/accountability-signals.schema.json](./provided/accountability-signals.schema.json) | `finos:social/AccountabilitySignals/1.0.0` | Habits, Inbox |

**Leak-proof by construction (FR-SOC-001)**: Neither provided contract has a monetary-amount, account-identifier, or institution-name field. `CircleProgress` transmits only a **dimensionless** projection (`percentage_complete` as a `0..1` decimal string, `streak_count` as an integer, or `pace_status` as an enum). A provider contract test MUST assert the absence of any money/account/institution field in every response (Threat Model).

**No money on the wire**: Social transmits no monetary amount. The only numeric ratio (`percentage_complete`) is **string-encoded** (`^(0(\.[0-9]+)?|1(\.0+)?)$`) to defeat JSON float coercion, mirroring the platform rate convention (platform-decisions §4). No `*_cents` field exists here because Social produces no cent value.

## Consumed (this module is a consumer)

Owned by Module 0 (Spine), Module 9 (Habits — *not yet published*), and Module 14 (Household — `MemberScope` *not yet published*). Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `GoalState` | Module 0 | `percentage_complete` / `pace_status` projections; real-data integrity (FR-SOC-002) |
| `HabitProgress` / `StreakState` | Module 9 (Habits, not yet specced) | `streak_count` projections (feature-checked until Habits ships) |
| `MemberScope` | Module 14 (Household) | household-joint-goal exclusion (FR-SOC-001); safe-default exclude until published |

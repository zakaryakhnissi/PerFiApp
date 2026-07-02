# Contracts: Module 8 — Habits & Routines

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011). Every contract has **consumer** and **provider** contract tests in CI (SC-H-010). Contracts are semver'd; breaking changes require a version bump + migration plan + deprecation window. Version skew **disables** the dependent ritual section / projection rather than serving on a mismatched schema (umbrella edge case, SC-012).

> **No money on this module's wire.** Habits computes no monetary value. The provided contracts carry **no** `*_cents` or `*_rate` field — they are cross-user-safe **projections** (streak count, XP, level, badges) with no money, account, merchant, or source reference (FR-SOC-001). Any CAD figure a Habits *screen* shows is a read-only pass-through of a **consumed** source contract's `MoneyCents`, formatted unchanged — it never appears on a provided Habits contract.

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `StreakState` | `finos:habits/StreakState/1.0.0` | [provided/streak-state.schema.json](./provided/streak-state.schema.json) | Social, Inbox |
| `HabitProgress` | `finos:habits/HabitProgress/1.0.0` | [provided/habit-progress.schema.json](./provided/habit-progress.schema.json) | Social, Inbox |

Both are **server-computed projections**: the sensitive fields are computed-out **before** transmission (never filtered consumer-side), and cross-user access is enforced server-side on session identity + `MemberScope` + RLS (platform §5). Denied cross-user reads are audited (FR-SOC-001, SC-H-008).

## Consumed (this module is a consumer)

Owned by other modules. Accessed only through their versioned contract clients — never via direct storage. See [consumed/README.md](./consumed/README.md).

| Contract | Owner | Used by |
|----------|-------|---------|
| `TaskCompletionEvents` | Tasks (Module 7) | streak/XP advance on a completed money task; ritual "complete a task" item |
| `RoundupProposals` | Cash Safety (Module 3) | streak/XP advance on an **approved** roundup; ritual "approve a roundup" item (money pass-through) |
| `BillCalendar` | Bills | ritual "review/pay a bill" item (money pass-through); streak advance on a reviewed/paid bill |
| `NotificationDigest` | Inbox (Module 10) | ritual "clear a notification" item; streak advance on a cleared item; nudge emission target |
| `GoalState` | Module 0 (Spine) | tie a habit to a goal's time-to-goal context (FR-X-004 pass-through) |

**Idempotency**: every advance Habits writes is keyed on the consumed source `source_event_id` (UNIQUE) — replays never double-apply (Principle IV / FR-X-003).

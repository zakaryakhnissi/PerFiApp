# Consumed Contracts (referenced — owned by other modules)

Tasks accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine and module boundaries, Principle VII). Schemas live in the owning module's spec; listed here so Tasks' **consumer** contract tests pin the exact versions it depends on. Tasks reads these values for display/scheduling and **never** re-computes or moves a money figure.

## Ratified now (provider schema exists)

| Contract | $id | Owner | Min version | Why Tasks needs it |
|----------|-----|-------|-------------|--------------------|
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | goal-linked tasks: live target/current amount + time-to-goal context (FR-X-004); completion may acknowledge a goal contribution status update |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 (Spine) | 1.0.0 | merchant-linked tasks: canonical merchant identity + bilingual display name |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 (Spine) | 1.0.0 | smart scheduling: paydays / runway_days / projected_lowest / shortfall_flag drive payday-aware placement; **stale ⇒ payday-aware placement WITHHELD** (FR-X-008, FR-TASK-003) |

Shared value objects reused from Module 0 common: `finos:common/FreshnessStamp/1.0.0`, `finos:common/Reasoning/1.0.0`, `finos:common/MoneyCents/1.0.0`.

## Forward-declared (provider schema NOT yet ratified — wired behind a feature check)

These belong to modules not yet authored at this module's authoring time. Their consumer clients are wired behind a feature check; bill-/payment-linked tasks and due-date scheduling degrade gracefully (link `unavailable`, best-effort scheduling) until the provider contracts ship. The umbrella spec is the authority for their names/owners/Provides lists. When ratified, pin the version here and the consumer contract test fails closed on skew.

| Contract | Expected $id (provisional) | Owner | Min version (target) | Why Tasks needs it |
|----------|----------------------------|-------|----------------------|--------------------|
| `BillCalendar` | `finos:bills/BillCalendar/1.0.0` | Module 4 (Bills) — **P2, not yet authored** | 1.0.0 | bill-linked tasks (live amount + due date) and due-date scheduling; completion marks a bill handled via the Bills contract |
| `PaymentSchedule` | `finos:pay/PaymentSchedule/1.0.0` | Module 5 (Pay) — **P2, not yet authored** | 1.0.0 | payment-linked tasks and payment-due-date scheduling |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` | Module 3 (Cash Safety) — **not yet authored** | 1.0.0 | overdraft-precedence check for spend-implying tasks ("every module that proposes spending checks `SafeToActSignal`"); Cash Safety always takes precedence (umbrella §10.4) |

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent link/scheduling behavior is **disabled**, not served on a mismatched schema — the task degrades to an unlinked item until the consumer migrates.

**Status write-back operation**: completion updates a linked entity's status through the **owning module's** contract operation (e.g. "mark bill handled"), authorized against the **link owner's** scope, never a direct cross-module write. Where an owning module does not yet expose such an operation, completion records locally and enters `pending_sync` until it exists (spec Assumptions; US2 AS-4).

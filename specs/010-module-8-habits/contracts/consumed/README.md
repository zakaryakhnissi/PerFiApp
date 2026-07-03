# Consumed Contracts (referenced — owned by other modules)

Habits accesses these **only** through their versioned contract clients, never via direct storage (preserves the module-boundary, Principle VII; platform §3). Schemas live in the owning module's spec; listed here so Habits' **consumer** contract tests pin the exact versions it depends on.

| Contract | Canonical `$id` (owner-defined) | Owner | Min version | Why Habits needs it |
|----------|----------------------------------|-------|-------------|---------------------|
| `RoundupProposals` | `finos:cashsafety/RoundupProposal/1.0.0` | Cash Safety (Module 3) | 1.0.0 | streak/XP advance on an **approved** roundup (approval event — not the proposal); ritual "approve a roundup" item carries the roundup's `MoneyCents` as a read-only pass-through |
| `BillCalendar` | `finos:bills/BillCalendar/1.0.0` | Bills | 1.0.0 | ritual "review/pay a bill" item (bill `MoneyCents` pass-through); streak advance on a reviewed/paid obligation |
| `NotificationDigest` | `finos:inbox/NotificationDigest/1.0.0` | Inbox (Module 10) | 1.0.0 | ritual "clear a notification" item; streak advance on a cleared item; the pipeline Habits **emits** streak/ritual nudges to (UX §6) — Habits never pushes directly |
| `TaskCompletionEvents` | `finos:tasks/TaskCompletionEvent/1.0.0` | Tasks (Module 7) | 1.0.0 | streak/XP advance on a completed money task; ritual "complete a task" prompt |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | tie a habit to a goal's time-to-goal context (FR-X-004); pass-through only — no money computed here |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` | Cash Safety (Module 3) | 1.0.0 | Cash Safety **precedence** guardrail: a ritual item that would nudge a spend-positive action this signal flags as unsafe is set to the `conflict` state (Conflict Banner; the streak never advances by overriding safety) — spec Edge Cases, UX §3.1/§10.4, data-model RitualItem `conflict`, task T034 |

> **Display name vs. canonical `$id`**: the **Contract** column keeps the umbrella's display label (some plural, e.g. `RoundupProposals` / `TaskCompletionEvents`); the **Canonical `$id`** column is the owner module's real schema id (singular `RoundupProposal` / `TaskCompletionEvent`) that consumer contract tests pin against. The `$id` is authoritative.

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent **ritual section / streak rule is disabled**, not served on a mismatched schema.

**Contract-maturity note** (non-blocking — see research.md HAB-OI-1): `RoundupProposals`, `BillCalendar`, `NotificationDigest`, and `TaskCompletionEvents` may not yet be authored by their owning modules. They are referenced at **min version 1.0.0**; exact versions are pinned in consumer tests once published. Until a provider exists, the dependent ritual section is **feature-checked off** and degrades gracefully (the ritual runs on available sections) — it is **never** stubbed with fabricated data (mirrors how Rewards feature-checks `SafeToActSignal` until Cash Safety ships). `SafeToActSignal` is authored by Cash Safety (Module 3, `specs/005-module-3-cash-safety/contracts/provided/safe-to-act-signal.schema.json`); Habits feature-checks it the same way — when it is unavailable, the conflict guardrail simply has no signal to act on (no item is force-flagged), and an item is **never** asserted "safe" on a missing signal.

**Money on the wire**: any consumed amount is the canonical `finos:common/MoneyCents/1.0.0` (integer minor units, CAD). Habits surfaces it **unchanged** through `@finos/format` — it never re-rounds, converts, or recomputes a source amount.

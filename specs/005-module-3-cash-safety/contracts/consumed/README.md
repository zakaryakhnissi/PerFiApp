# Consumed Contracts (referenced — owned by other modules)

Cash Safety accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Cash Safety's **consumer** contract tests pin the exact versions it depends on. Cash Safety does **not** re-aggregate balances or re-forecast cash flow — Module 0 (Spine) owns that; Cash Safety derives the user-facing runway, the safety verdict, and roundup proposals on top of the spine's outputs.

| Contract | Owner | Min version | $id | Why Cash Safety needs it |
|----------|-------|-------------|-----|--------------------------|
| `CashFlowForecast` | Module 0 (Spine) | 1.0.0 | `finos:spine/CashFlowForecast/1.0.0` | **Primary money input** — the projected balances / lowest point / runway days / shortfall flag the `RunwayForecast` and `SafeToActSignal` are derived from. Stale ⇒ withhold (Constitution VIII). |
| `AccountState` | Module 0 (Spine) | 1.0.0 | `finos:spine/AccountState/1.0.0` | Net liquid starting balance, account `connection_completeness` (drives Empty/Partial states), `transfer_from_savings` target accounts (user's own). Stale balance ⇒ withhold the runway. |
| `TransactionStream` | Module 0 (Spine) | 1.0.0 | `finos:spine/TransactionStream/1.0.0` | Source of qualifying-purchase events that trigger roundup rules (FR-CASH-003). Each trigger carries the `source_event_id` used for idempotency. |
| `BudgetState` | Module 0 (Spine) | 1.0.0 | `finos:spine/BudgetState/1.0.0` | Category headroom for the `reduce_discretionary` micro-action and for safe-spend context. |
| `GoalState` | Module 0 (Spine) | 1.0.0 | `finos:spine/GoalState/1.0.0` | Time-to-goal contribution when a roundup is routed to a goal (FR-X-004). |
| `CreditState` | Module 0 (Spine) | 1.0.0 | `finos:spine/CreditState/1.0.0` | Statement `due_date_risk` and due dates to prioritize which predicted shortfalls are most urgent. **Secondary guardrail**: entirely absent ⇒ proceed without it (no due-date urgency boost); present but stale ⇒ flag, do not reason on old due dates. The runway itself never depends on credit being present. |
| `BillCalendar` | Module 4 (Bills) | 1.0.0 | `finos:bills/BillCalendar/1.0.0` | The `move_bill_date` micro-action proposes a later safe-to-pay date against real bills. Bills is **P2** and may ship after Cash Safety; this consumer is wired behind a feature check, and until Bills ships, `move_bill_date` is omitted from `micro_actions` (the other micro-action kinds still close gaps). |

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent output is **disabled** (the runway/signal is withheld), not served on a mismatched schema.

## External datasets/feeds (not cross-module contracts, but freshness-bound)

Cash Safety introduces **no new external vendor feed** — it computes entirely on spine-provided, already-freshness-stamped data. Its only tunable inputs are user-set/Canada-default parameters (set in research.md, non-blocking):

- **Safety-buffer default** — the dollar floor `runway_days` counts down to; user-adjustable.
- **Runway horizon & staleness windows** — inherited from the spine `CashFlowForecast`; the balance-staleness window that gates withholding is a Module 0 plan decision (NR-2 in platform-decisions.md).
- **Roundup rule parameters** — round-to target (e.g. nearest $1/$5), destination, and active/paused state are user-defined, not an external feed.

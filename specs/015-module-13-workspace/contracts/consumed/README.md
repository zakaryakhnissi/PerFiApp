# Consumed Contracts (referenced — owned by other modules)

Workspace accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable boundary, Principle VII). Schemas live in the owning module's spec; listed here so Workspace's **consumer** contract tests pin the exact versions it depends on. Workspace performs **no money computation** — it reads these figures by reference and displays them (SC-W-005).

| Contract (`$id`) | Owner | Min version | Why Workspace needs it |
|------------------|-------|-------------|------------------------|
| `finos:spine/BudgetState/1.0.0` | Module 0 (Spine) | 1.0.0 | budget-headroom figures bound into steps / notebook references |
| `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | goal-progress figures + time-to-goal context (FR-X-004); generated-goal proposals are materialized by the Spine goal service |
| `finos:spine/CreditState/1.0.0` | Module 0 (Spine) | 1.0.0 | utilization figures in relevant playbooks (e.g. job change, immigration credit-building) |
| `finos:cashsafety/RunwayForecast/1.0.0` | Module 3 (Cash Safety) | 1.0.0 | live runway-days figures — the headline "live data" in the moving-playbook Independent Test |
| `finos:cashsafety/SafeToActSignal/1.0.0` | Module 3 (Cash Safety) | 1.0.0 | overdraft/safety precedence over any spend-implying step (Cash Safety always wins; umbrella conflict edge case) |
| `finos:bills/BillCalendar/1.0.0` | Module 4 (Bills) | 1.0.0 | relevant-bills figures (e.g. utilities to transfer on a move) |
| `finos:lifeadmin/DocumentVault/1.0.0` | Module 12 (Life Admin / Docs) | 1.0.0 | document links a step references (lease, Record of Employment, immigration papers) |
| `finos:travel/TripBudget/1.0.0` | Module 11 (Travel) | 1.0.0 | trip-cost figures where a life event involves travel (already FX-converted to CAD upstream; Workspace never converts) |
| `finos:tasks/TaskState/1.0.0` / `finos:tasks/TaskCompletionEvent/1.0.0` | Module 7 (Tasks) | 1.0.0 | materialization of `WorkspaceTask` proposals + reflecting their completion state back into steps |

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a Workspace migration, the consumer contract test fails in CI and the dependent step/reference is **disabled** (renders Unavailable with a "needs update" note), not rendered on a mismatched schema (SC-W-009).

**Availability/degradation**: several consumed contracts are owned by modules that may not yet be shipped when Workspace lands (Cash Safety, Bills, Docs, Travel, Tasks). Until a contract is available, the dependent step/reference degrades to the **Partial / Empty / Unavailable** state per the ux six-state matrix — Workspace never guesses a figure and never blocks the whole playbook on one missing source (FR-X-012).

> **Note on `$id`s of not-yet-authored providers**: `RunwayForecast`/`SafeToActSignal` (Cash Safety), `BillCalendar` (Bills), `DocumentVault` (Docs), `TripBudget` (Travel), and `TaskState`/`TaskCompletionEvents` (Tasks) are named in the umbrella spec's Cross-Module Links but their schemas are authored in their own module specs. Workspace pins them by the umbrella-declared name at min version `1.0.0`; the concrete `$id` (e.g. `finos:cashsafety/RunwayForecast/1.0.0`) is finalized when the owning module's contract ships, and Workspace's consumer test is wired then. Only `BudgetState`, `GoalState`, and `CreditState` (Module 0, `finos:spine/*/1.0.0`) exist as schemas today.

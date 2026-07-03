# Consumed Contracts (referenced — owned by other modules)

Social accesses these **only** through their versioned contract clients, never via direct storage (preserves module boundaries, Principle VII). Schemas live in the owning module's spec; listed here so Social's **consumer** contract tests pin the exact versions it depends on.

| Contract | Owner | Min version | Why Social needs it | Status |
|----------|-------|-------------|---------------------|--------|
| `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | Real goal progress → `percentage_complete` (`current_amount/target_amount`, computed by the spine in arbitrary precision) and `pace_status` projections; the **real-data integrity** guarantee (FR-SOC-002) — Social never accepts manual entry | **Published** (`specs/003-module-0-spine/contracts/provided/goal-state.schema.json`) |
| `finos:habits/HabitProgress/1.0.0` / `finos:habits/StreakState/1.0.0` | Module 8 (Habits) | 1.0.0 | Real habit streak → `streak_count` projections (FR-SOC-002) | Schemas exist (`specs/010-module-8-habits/contracts/provided/{habit-progress,streak-state}.schema.json`). Habit-streak circles are wired behind a **feature check** and degrade gracefully (goal-based circles only) until Habits is implemented. Non-blocking. |
| `finos:household/MemberScopes/1.0.0` | Module 14 (Household) | 1.0.0 | Enforce the **household-joint-goal exclusion** (FR-SOC-001): exclude any `GoalState` jointly owned with a household member whose scope was not explicitly extended to the circle | Schema exists (`specs/016-module-14-household/contracts/provided/member-scopes.schema.json`). Until Household is implemented, Social applies the **safe default**: exclude ALL household-joint goals from circles. Non-blocking. |

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent circle projection is **disabled**, not rendered on a mismatched schema.

**Shared value objects** (Module 0 common): `finos:common/FreshnessStamp/1.0.0` is reused on every provided projection/signal. No `finos:common/MoneyCents/1.0.0` is consumed or emitted — Social transmits no monetary amount.

## Downstream consumers of Social (for reference, not consumed here)

- **Habits** (Module 8) and **Inbox** consume `finos:social/CircleProgress/1.0.0` and `finos:social/AccountabilitySignals/1.0.0`. Circle signals route through the **Inbox digest** pipeline (ux-foundations §6) — Social never calls a push API directly.

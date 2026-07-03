# Consumed Contracts (referenced — owned by other modules)

Credit & Coaching accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Credit's **consumer** contract tests pin the exact versions it depends on.

| Contract | $id | Owner | Min version | Why Credit needs it |
|----------|-----|-------|-------------|----------------------|
| `CreditState` | `finos:spine/CreditState/1.0.0` | Module 0 (Spine) | 1.0.0 | **Canonical** utilization, bands (< 10 / < 30 / 30–50 / > 50%), aggregate/per-card utilization, and due-date risk. Credit reasons against this — it does **not** recompute utilization. |
| `AccountState` | `finos:spine/AccountState/1.0.0` | Module 0 (Spine) | 1.0.0 | Card balances and credit limits (integer cents) for the **specific early-payment amount** math and refinance candidate identification. |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 (Spine) | 1.0.0 | Runway context: confirm an early-payment recommendation will not itself create a shortfall before recommending it. |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | Time-to-goal context (FR-X-004) on credit-boosting plans; detects when the user's goal is credit-boosting (→ optimal band target). |
| `CardLineup` | `finos:rewards/CardLineup/1.0.0` | Module 1 (Rewards) | 1.0.0 | Annual fee + earn rules + rewards value for the **rewards-value side** of keep/downgrade/cancel/refinance trade-offs (FR-CRD-004). |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` *(provided by Module 3 when shipped)* | Module 3 (Cash Safety) | 1.0.0 | Overdraft-precedence override of an early-payment recommendation (Cash Safety takes precedence; wired behind a feature check until Cash Safety ships). |

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent recommendation (coaching plan / refinance signal) is **disabled**, not served on a mismatched schema.

## External datasets/feeds (not cross-module contracts, but freshness-bound)

These power FR-CRD-001/003 and obey Fresh-or-Flagged; concrete Canadian vendors selected in planning (research.md, NR-CRD-1). Versioned where curated:

- **Canadian credit-bureau feed** (Equifax Canada / TransUnion Canada) — score (300–900) + report factors. Freshness-stamped; stale ⇒ score flagged, coaching withheld. A bureau pull is a high-sensitivity action (see Threat Model); soft-pull only for monitoring (no score impact).
- **Credit-builder knowledgebase** (curated, versioned, bilingual dataset) — Canada-specific builder steps (secured cards, credit-builder loans, on-time-payment guidance). Curated, slow-moving; never a commissioned product feed.

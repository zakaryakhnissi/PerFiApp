# Consumed Contracts (referenced — owned by other modules)

Rewards accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Rewards' **consumer** contract tests pin the exact versions it depends on.

| Contract | Owner | Min version | Why Rewards needs it |
|----------|-------|-------------|----------------------|
| `BudgetState` | Module 0 (Spine) | 1.0.0 | budget headroom for best-card reasoning + bonus-tracker over-budget warning + offer category tie-in |
| `CashFlowForecast` | Module 0 (Spine) | 1.0.0 | runway context for spend-positive recommendations |
| `CreditState` | Module 0 (Spine) | 1.0.0 | canonical utilization + bands (< 10 / < 30 / 30–50 / > 50%) for recommender guardrails |
| `MerchantGraph` | Module 0 (Spine) | 1.0.0 | merchant identity for recommendation + offer mapping |
| `GoalState` | Module 0 (Spine) | 1.0.0 | time-to-goal contribution on points valuations |
| `SafeToActSignal` | Module 3 (Cash Safety) | 1.0.0 | overdraft-precedence override of spend-positive picks (wired behind a feature check until Cash Safety ships) |

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent recommendation is **disabled**, not served on a mismatched schema.

## External datasets/feeds (not cross-module contracts, but freshness-bound)

These power FR-REW-007..010 and obey Fresh-or-Flagged; concrete vendors selected in planning. Versioned where curated:

- **Transfer-partner graph** (curated, versioned dataset) — currency → partner routes + ratios.
- **Transfer-bonus / buy-points-promo feed** (timestamped) — live bonuses; expired/stale ⇒ not applied.
- **Points-expiry policy dataset** (curated) — per-program expiry rules; unknown ⇒ "expiry unknown".
- **Manual balance entry** — first-class user-entered source with a user-set staleness window.

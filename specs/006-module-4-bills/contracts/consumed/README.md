# Consumed Contracts (referenced — owned by other modules)

Bills accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Bills' **consumer** contract tests pin the exact versions it depends on.

| Contract | `$id` / Min version | Owner | Why Bills needs it |
|----------|---------------------|-------|--------------------|
| `TransactionStream` | `finos:spine/TransactionStream/1.0.0` | Module 0 (Spine) | recurrence detection (`is_recurring`), per-occurrence amounts, FX-converted `cad_amount`, and dedup/pending state so series are never double-counted |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 (Spine) | canonical merchant identity for each series + `is_subscription_like` subscription hint; `email_sourced`/`owner_profile_id` for the FR-X-013 purge cascade |
| `BudgetState` | `finos:spine/BudgetState/1.0.0` | Module 0 (Spine) | per-series budget category + headroom for budget-impact figures; `data_completeness` for the Partial state |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 (Spine) | runway (`runway_days`, `projected_lowest_balance`, `shortfall_flag`) → predicted safe-to-pay date; this is the umbrella "RunwayForecast" mapping (spec C-1). A **primary money input**: stale/missing ⇒ safe-to-pay **withheld** |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | time-to-goal impact of cancellation/negotiation savings (pace sourced here, never recomputed) |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` *(pending Module 3)* | Module 3 (Cash Safety) | overdraft-precedence override of a pay-now/pay-timing suggestion. **Not yet ratified** — no Cash-Safety spec exists. Wired behind a feature check; until it ships, safe-to-pay precedence is derived from `CashFlowForecast.shortfall_flag` (spec C-1). The `$id`/version above is provisional and confirmed when Module 3 publishes it. |

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent Bills behavior is **disabled**, not served on a mismatched schema.

## External datasets/feeds (not cross-module contracts, but reference/freshness-bound)

These power FR-BILL-001..004; concrete vendors/coverage selected in planning (non-blocking). Versioned where curated:

- **Necessity-classification dataset** (curated, versioned) — Canada-first category → essential/negotiable/nice-to-have mapping (spec C-3). Drives the inferred default; user override always wins.
- **Cancellation-link / negotiation-script dataset** (curated, bilingual) — known merchant cancellation deep-links + EN/FR negotiation scripts (spec C-6). Used for the guided (never executed) cancellation/negotiation flow.
- **Free-trial detection signals** — inferred from transaction/merchant signals and/or email signals (via spine/Inbox); unknown conversion dates marked "estimated", never assumed.

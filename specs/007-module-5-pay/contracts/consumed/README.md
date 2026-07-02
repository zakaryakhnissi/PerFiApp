# Consumed Contracts (referenced — owned by other modules)

Pay accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Pay's **consumer** contract tests pin the exact versions it depends on.

| Contract | `$id` | Owner | Min version | Why Pay needs it |
|----------|-------|-------|-------------|------------------|
| `BestCardRecommendation` | `finos:rewards/BestCardRecommendation/1.0.0` | Module 1 (Rewards) | 1.0.0 | the reward-optimal candidate Pay applies its safety overlay to (never re-ranked on rewards alone) |
| `CardLineup` | `finos:rewards/CardLineup/1.0.0` | Module 1 (Rewards) | 1.0.0 | card method set: earn rules, limits, fees feeding the eligible-method projection |
| `PointsValuation` | `finos:rewards/PointsValuation/1.0.0` | Module 1 (Rewards) | 1.0.0 | already-CAD-valued reward figure (Pay re-derives no points valuation) |
| `CreditState` | `finos:spine/CreditState/1.0.0` | Module 0 (Spine) | 1.0.0 | canonical utilization + bands (< 10 / < 30 / 30–50 / > 50%) for the hard-avoid / warn guardrail |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 (Spine) | 1.0.0 | runway / projected lowest balance for checkout safety and sequencer feasibility (canonical money source for runway; the umbrella "RunwayForecast" is an alias for this) |
| `BudgetState` | `finos:spine/BudgetState/1.0.0` | Module 0 (Spine) | 1.0.0 | budget headroom — a primary money input; stale/missing ⇒ withhold |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | goal-progress objective for the sequencer + time-to-goal context (FR-X-004) |
| `AccountState` | `finos:spine/AccountState/1.0.0` | Module 0 (Spine) | 1.0.0 | account method set (chequing/savings/debit) + liquidity for the eligible-method projection |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 (Spine) | 1.0.0 | merchant identity for the checkout context |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` *(provider not yet authored — Module 3)* | Module 3 (Cash Safety) | 1.0.0 | overdraft-precedence override of a spend-positive pick (documented precedence, ux-foundations §3.1/§10.4); wired behind a feature check until Cash Safety ships |
| `BillCalendar` | `finos:bills/BillCalendar/1.0.0` *(provider not yet authored — Module 4)* | Module 4 (Bills) | 1.0.0 | recurring-obligation set the sequencer orders, and the calendar Pay's `PaymentSchedule` syncs; user-entered obligation fallback until Bills ships |

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent Pay recommendation is **disabled**, not served on a mismatched schema (SC-012).

**Not-yet-shipped providers**: `SafeToActSignal` (Module 3) and `BillCalendar` (Module 4) do not yet have authored provider schemas in this repo. Pay pins the `$id`/version it expects so its consumer contract tests are ready the moment those providers publish; until then the dependent paths degrade per the spec Assumptions (runway-dependent picks withhold without `SafeToActSignal`/forecast; the sequencer uses a user-entered obligation set without `BillCalendar`). `CashFlowForecast` (already authored) is the canonical runway money source so Pay's core safety logic does not block on Cash Safety.

## External feeds (not cross-module contracts, but freshness-bound)

- **FX-rate feed** (timestamped) — converts a foreign-currency checkout amount to CAD under Fresh-or-Flagged before any runway/budget reasoning; stale ⇒ withhold the runway-dependent pick. Same shared spine/Travel FX source noted in Rewards research; concrete vendor selected in planning (NR-4). Pay consumes, does not own, this feed.

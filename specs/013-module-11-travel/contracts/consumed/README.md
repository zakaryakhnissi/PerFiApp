# Consumed Contracts (referenced — owned by other modules)

Travel accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary, Principle VII). Schemas live in the owning module's spec; listed here so Travel's **consumer** contract tests pin the exact versions it depends on.

| Contract | `$id` | Owner | Min version | Why Travel needs it |
|----------|-------|-------|-------------|---------------------|
| `BudgetState` | `finos:spine/BudgetState/1.0.0` | Module 0 (Spine) | 1.0.0 | Link a trip to the travel budget category; compute per-trip headroom; flag projected over-budget (FR-TRV-001). **Primary money input** — stale/missing ⇒ withhold CAD headroom. |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | Time-to-goal context on trip costs and savings (FR-X-004). |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 (Spine) | 1.0.0 | Identify travel merchants (airlines/hotels/car rentals) for matching real spend to a trip. |
| `TransactionStream` | `finos:spine/TransactionStream/1.0.0` | Module 0 (Spine) | 1.0.0 | Match confirmed travel transactions to a trip for `TravelSpend` lifetime/cost-per-day stats (FR-TRV-002). Carries CAD-converted amounts + freshness. |
| `CardLineup` | `finos:rewards/CardLineup/1.0.0` | Module 1 (Rewards) | 1.0.0 | Read each card's travel-insurance perks to compute the insurance-gap flag (FR-TRV-002). Travel does **not** own card/perk data. |
| `StatusState` | `finos:rewards/StatusState/1.0.0` | Module 1 (Rewards) | 1.0.0 | Loyalty/elite-status context on a trip (informational). |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` | Module 3 (Cash Safety) | 1.0.0 | Overdraft-precedence override of any spend-positive trip suggestion; wired behind a feature check until Cash Safety ships (umbrella conflict edge case). |

**Version-skew behavior** (umbrella edge case, SC-012): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent Travel feature is **disabled**, not served on a mismatched schema.

> Note: `SafeToActSignal`'s `$id` is owned by Module 3 (Cash Safety) and pinned here at the expected `finos:cashsafety/SafeToActSignal/1.0.0`; the Cash Safety spec is the definitional home. Until it ships, the consumer is feature-checked (Travel still computes FX/budget-aware figures without it).

## External datasets/feeds (not cross-module contracts, but freshness-bound)

These power FR-TRV-001/002 and obey Fresh-or-Flagged; concrete vendors selected in planning (see [../research.md](../research.md)). They are NOT cross-module contracts because no FinOS module is their canonical provider:

- **FX-rate feed** (timestamped, decimal-string rates) behind an `FxProvider` interface — foreign→CAD conversion for trip costs and travel spend. Shared with Rewards' FX handling. Stale ⇒ the converted CAD figure is flagged (umbrella multi-currency edge case). The spine has **no** FX contract; FX is an internal Module 0 feed and a Travel/Rewards external feed.
- **Email/confirmation parsing source** (user opt-in) — forwarded/parsed booking confirmations (flights/hotels/cars). After parsing, **only** the derived itinerary structure + sender identity/classification is retained — never raw message bodies (FR-X-013). On email-access revocation, all raw confirmation content and any itinerary data whose sole source was the email connection is deleted within the 7-day window — regardless of which store holds it (FR-X-013).
- **Carbon-estimation factor table** (curated, versioned dataset) — distance/class → kg CO2e factors for the optional carbon estimate. NOT money; estimates carry a coarse-confidence flag.

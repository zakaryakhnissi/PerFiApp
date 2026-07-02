# Competitive Analysis: PointsYeah Wallet (beta) → Module 1 Rewards

**Feature**: `002-module-1-rewards` | **Date**: 2026-06-26 | **Method**: web investigation (defuddle + web search)

Investigated PointsYeah and its "My Points Wallet" (beta) to benchmark the Rewards & Loyalty module and harvest missing capabilities. PointsYeah is an **award-travel search engine** with a points/cards wallet layered on top; it is travel-redemption-centric, not a personal-finance OS. The relevant lesson is its **points/transfer intelligence**, not its flight-search UI (which maps to our Module 11 — Travel).

## PointsYeah feature inventory (observed)

| # | Capability | Detail |
|---|------------|--------|
| 1 | **My Points Wallet** | Track all loyalty/point balances in one place; **manual entry** of balances (no bank aggregation). |
| 2 | **Card wallet** | User adds the credit cards they already hold; results + recommendations are tailored to the programs/transfer partners they can actually use. |
| 3 | **Transfer-partner intelligence** | For a redemption, shows points required, **available transfer partners**, and recommended cards to earn them (Amex MR, Chase UR, Citi TY, Bilt, Capital One → airline/hotel programs). |
| 4 | **Transfer-bonus awareness** | Surfaces current transfer bonuses and **recomputes points needed factoring the bonus**. |
| 5 | **Custom point valuations** (Premium) | User sets **custom cents-per-point** values per currency; drives value math. Free tier uses default valuations. |
| 6 | **Buy-points promotions** | Surfaces buy-points promos and helps assess whether buying points is worth it for a target redemption. |
| 7 | **Cash-vs-points comparison** | Compares cash rate vs points cost incl. taxes/fees, fifth-night-free, earn-if-cash (mostly hotels → Travel). |
| 8 | **Award alerts** | Track a routing/price for a date window (4 free / up to 32 premium). → Travel/Inbox in our model. |
| 9 | **Sweet-spot / outsized-value surfacing** | Highlights high-value redemptions. → Travel. |
| 10 | **Card recommendations** | "Best cards for points & travel rewards" to earn toward a goal. |
| 11 | **Multi-program coverage** | ~20–25 airline + hotel programs; iOS app + web. |

**Key characteristics**: manual balance entry (privacy-friendly, staleness-prone, **no Plaid-style sync** — many loyalty programs aren't aggregated); valuation by cents-per-point with optional user override; transfer-graph is the core differentiator.

## Gap analysis vs current Module 1 spec

Our spec already **exceeds** PointsYeah on the dimensions that matter to a finance OS: best-card recommendation **grounded in budget headroom + credit utilization** (PointsYeah does neither), bilingual/Canada-first, money-exactness, freshness, audit. What PointsYeah does that our spec was **missing or thin on**:

| Gap | PointsYeah has it | Our spec (before) | Action |
|-----|-------------------|-------------------|--------|
| **Transfer partners** | Core | Not modelled — `PointsValuation` is a flat cpp; no transfer graph | **Add** FR-REW-007: transfer-partner graph + transfer-aware effective valuation |
| **Transfer bonuses / buy-points promos** | Yes | Offers (US5) were merchant-only | **Add** FR-REW-008 |
| **Points expiration** | Implied (wallet) | `PointsBalance` had no expiry/alerts | **Add** FR-REW-009: expiry tracking + "expiring soon" alert |
| **Custom / manual valuation & sources** | Premium custom cpp; manual balances | Rate came only from a feed; no user override; assumed aggregation | **Add** FR-REW-010: valuation source (feed / user-override) + manual balance entry as a first-class freshness-stamped source |
| **Earn-path to a target redemption** | "Cards/transfers to earn the points you need" | Recommender was merchant-moment only | **Add** FR-REW-011: earn-path suggestion grounded in cards the user holds (informational, not card-acquisition advice) |

**Out of scope for Rewards (belongs to Module 11 — Travel)**: award flight/hotel search, sweet-spot surfacing, cash-vs-points booking comparison. Rewards **provides** transfer-aware valuation + transfer intelligence; Travel **consumes** it. This preserves module boundaries (Principle VII).

## Constitution alignment of the additions

- **Money Is Exact (IV)**: transfer ratios and bonus multipliers are arbitrary-precision decimals; transfer-aware effective rate computed in arbitrary precision, half-up to CAD cents. Same fixture discipline as FR-REW-001.
- **Fresh or Flagged (VIII)**: transfer-bonus windows, buy-points promos, and **manually-entered balances** all carry freshness stamps; manual balances go stale after a user-set window and the valuation is flagged.
- **Integration-First (I)**: earn-path suggestions and "expiring points" use cases tie to `GoalState` and budget — never points in a vacuum.
- **Not regulated advice**: earn-path is informational ("with the cards you hold, here's a path"), not a directive to acquire credit products.

## Sources

- [AwardWallet — PointsYeah review](https://awardwallet.com/travel/pointsyeah-review/)
- [AwardWallet — PointsYeah improvements / premium](https://awardwallet.com/news/pointsyeah-improvements/)
- [NerdWallet — PointsYeah review](https://www.nerdwallet.com/travel/learn/points-yeah-award-search-review-easily-find-your-next-points-redemption)
- [Milesopedia — PointsYeah review](https://milesopedia.com/en/reviews/products/pointsyeah/)
- [PointsYeah — membership guide](https://www.pointsyeah.com/membership-guide)
- [PointsYeah — iOS App Store listing](https://apps.apple.com/us/app/pointsyeah/id6648756794)
- [Priceless Passport — how to use PointsYeah](https://pricelesspassport.com/how-to-use-pointsyeah/)
- [The Points Guy — best award-search tools](https://thepointsguy.com/loyalty-programs/maximizing-points-redemptions-travel/)

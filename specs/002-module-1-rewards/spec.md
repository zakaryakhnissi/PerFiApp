# Feature Specification: Module 1 — Rewards & Loyalty

**Feature Branch**: `002-module-1-rewards`

**Created**: 2026-06-26

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 1 — Rewards & Loyalty (Priority: P1)"; functional requirements FR-REW-001..006 and cross-cutting FR-X-001..020; Constitution v2.2.0. Enhanced with a competitive benchmark of **PointsYeah Wallet (beta)** — see [competitive-analysis-pointsyeah.md](./competitive-analysis-pointsyeah.md) (source of FR-REW-007..011 and US6).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Rewards & Loyalty** tab only. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** spine contracts and does not re-implement aggregation, budgeting, or credit ingestion. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Rewards behavior.
>
> **Boundary with Module 11 (Travel)**: Rewards owns **points/transfer intelligence** — valuations, transfer partners, transfer bonuses, expiration, earn-paths. It does **not** own award flight/hotel **search or booking**, sweet-spot surfacing, or cash-vs-points trip comparison — those are Travel, which *consumes* the transfer-aware valuation contract Rewards provides.

## User Scenarios & Testing *(mandatory)*

Rewards is the flagship P1 differentiator: aggregate every loyalty balance and card perk, value it in CAD with time-to-goal context, and recommend the best card for a moment **after checking budget headroom and credit utilization** — never points in a vacuum.

### User Story 1 - Points Wallet valued in CAD (Priority: P1)

A user connects their loyalty programs and cards and sees every points/miles balance in one place, each translated to an estimated CAD value and its contribution to time-to-goal.

**Why this priority**: It is the first visible payoff of the Rewards tab and a core onboarding milestone (umbrella SC-014: a new user sees a populated Points Wallet within 10 minutes). It delivers standalone value even before any recommendation engine exists.

**Independent Test**: With at least one loyalty program connected, open the Points Wallet and confirm each balance shows an estimated CAD value and a time-to-goal contribution, each carrying a freshness stamp.

**Acceptance Scenarios**:

1. **Given** connected loyalty programs, **When** the user opens the Points Wallet, **Then** each balance shows an estimated CAD value and its contribution to time-to-goal.
2. **Given** a points balance whose redemption-rate feed is stale beyond its threshold, **When** the wallet renders, **Then** the CAD valuation is flagged as stale (or withheld) rather than shown as fresh.
3. **Given** an fr-CA user, **When** a CAD valuation is displayed, **Then** it is formatted `1 234,56 $` (comma decimal, space thousands, trailing symbol), not `$1,234.56`.
4. **Given** a loyalty program not covered by aggregation (e.g. Aeroplan, Scene+, PC Optimum), **When** the user enters a balance manually, **Then** it is valued like any other balance and carries a **user-entered** freshness stamp that goes stale after a user-set window (the valuation is flagged when stale). *(FR-REW-010)*
5. **Given** a user who sets a custom cents-per-point value for a currency, **When** the wallet revalues, **Then** the custom rate is used (tagged source = user-override) instead of the feed default, with exact decimal math. *(FR-REW-010)*
6. **Given** a balance with points expiring within the alert window, **When** the wallet renders, **Then** an "expiring soon" flag shows the expiry date and the at-risk CAD value, tied to a suggested use. *(FR-REW-009)*

---

### User Story 2 - Best Card Recommender grounded in budget & utilization (Priority: P1)

For a given merchant/moment, the user requests the best card to use and receives **one** recommended card with reasoning that cites earn rate **and** budget headroom **and** utilization effect — refusing cards that would push utilization into the hard-avoid band.

**Why this priority**: The flagship differentiator versus CardPointers/Mint and the most-requested daily decision ("which card do I use here?"). It is the clearest expression of the Integration-First principle.

**Independent Test**: With a card lineup and connected spine state, open a merchant and request a recommendation; confirm exactly one card is named with reasoning referencing earn rate, budget headroom, and utilization impact, and that the utilization bands are honored.

**Acceptance Scenarios**:

1. **Given** a merchant and the user's card lineup, **When** a best-card recommendation is requested, **Then** the result names one card and shows why (earn rate **and** budget headroom **and** utilization effect).
2. **Given** spending on the higher-points card would push per-card or aggregate utilization above 50% (hard-avoid), **When** the recommendation runs, **Then** that card is **not** recommended and a safer card is suggested with an explanation.
3. **Given** the same spend would land utilization in the 30–50% warn band, **When** the recommendation runs, **Then** the card MAY be recommended but **with a utilization warning** attached.
4. **Given** Cash Safety's `SafeToActSignal` indicates an overdraft risk, **When** Rewards would recommend a spend-positive card, **Then** Cash Safety takes precedence and the conflict and its resolution are shown to the user (umbrella cross-module edge case).
5. **Given** `BudgetState` (a primary input) is stale or missing, **When** a recommendation is requested, **Then** the recommendation is withheld and the user is asked to refresh — it never guesses a money input.
6. **Given** `CreditState` is **entirely absent** (e.g. no credit connected), **When** a recommendation is requested, **Then** the system applies the documented healthy-band default and proceeds **silently** (no flag), per the Constitution v2.2.0 documented-default exception; **but given** `CreditState` is present and **stale**, the recommendation flags/withholds rather than reasoning on old utilization.

---

### User Story 3 - Card Knowledgebase & Perks Coach (Priority: P2)

The user browses a Canada-first, bilingual knowledgebase of their cards (earn rates, categories, credits, perks, insurance) and gets a perks coach that tracks statement credits with reset dates and flags chronically unused perks as downgrade/cancel candidates.

**Why this priority**: The knowledgebase is the data backbone the recommender reasons over and the perks coach captures real savings, but the tab is already valuable with US1+US2 shipped.

**Independent Test**: Open a card with an unused statement credit nearing reset and confirm the perks coach shows a concrete usage plan and a downgrade/cancel flag when the perk is chronically unused.

**Acceptance Scenarios**:

1. **Given** a card with an unused statement credit nearing reset, **When** the user opens the perks coach, **Then** a concrete usage plan and a downgrade/cancel flag (if chronically unused) are shown.
2. **Given** a card in the knowledgebase, **When** the user views it, **Then** earn rates, categories, credits, perks, and insurance are shown bilingually (EN/FR) with no single-language leaks.

---

### User Story 4 - Welcome Bonus & Min-Spend Tracker (Priority: P2)

The user tracks welcome-bonus minimum-spend requirements and is warned when meeting one would exceed a healthy budget, with an alternate path offered.

**Why this priority**: High-value but situational; protects the user from overspending to chase a bonus, reinforcing Integration-First.

**Independent Test**: With an active welcome-bonus min-spend, simulate that meeting it would exceed healthy budget headroom and confirm the tracker warns and offers an alternate path.

**Acceptance Scenarios**:

1. **Given** a welcome-bonus minimum spend, **When** meeting it would exceed healthy budget, **Then** the tracker warns and offers an alternate path.
2. **Given** an in-progress min-spend, **When** the user opens the tracker, **Then** the remaining amount and days are shown with the bonus's CAD value and time-to-goal contribution.

---

### User Story 5 - Card-Linked Offers (Priority: P3)

The user sees card-linked offers normalized from Canadian banks, tied to budget categories, with merchant/reward mapping and deal surfacing.

**Why this priority**: Adds incremental savings once the wallet, recommender, and perks coach exist; lowest of the Rewards stories because it depends on the merchant graph being populated.

**Independent Test**: With card-linked offers available from the feed, confirm each surfaced offer is tied to a budget category and mapped to a merchant, with a freshness stamp.

**Acceptance Scenarios**:

1. **Given** card-linked offers from a Canadian bank feed, **When** the user opens offers, **Then** each is normalized, tied to a budget category, and carries a freshness stamp.
2. **Given** an offer whose feed is stale, **When** offers render, **Then** the offer is flagged or withheld rather than presented as live.

---

### User Story 6 - Transfer & Redemption Intelligence (Priority: P2)

The user sees, for each points currency, its **transfer partners** and current **transfer bonuses**, a **transfer-aware effective valuation** (the best value a currency can reach via its partners), and — for a target redemption — an **earn-path** using the cards they already hold. Buy-points promotions are surfaced with a "worth it?" assessment.

**Why this priority**: This is the core points-intelligence that competitors (PointsYeah) lead with; it raises the accuracy of every CAD valuation and best-card recommendation because a currency's true worth depends on its transfer options and live bonuses. It is P2 because US1/US2 deliver a usable MVP first, and the transfer graph is data-heavy.

**Independent Test**: For a currency with at least one transfer partner and an active transfer bonus, confirm the wallet shows the partners, the bonus, a transfer-aware effective rate (in arbitrary precision, half-up to cents), and — given a target redemption — an earn-path that only uses cards the user holds.

**Acceptance Scenarios**:

1. **Given** a points currency with transfer partners, **When** the user views it, **Then** the partners and any **transfer ratio** (e.g. 1:1, 1000:1500 with bonus) are shown, with a `FreshnessStamp`. *(FR-REW-007)*
2. **Given** an active transfer bonus on a partner, **When** the effective valuation is computed, **Then** the bonus multiplier is applied in arbitrary precision and the transfer-aware effective CAD rate is shown alongside the base rate. *(FR-REW-008)*
3. **Given** a target redemption and the user's current card lineup, **When** an earn-path is requested, **Then** the result uses **only cards the user holds** and is framed as informational (not card-acquisition advice), citing the transfers/bonuses involved. *(FR-REW-011)*
4. **Given** a buy-points promotion, **When** it is surfaced, **Then** a "worth it?" assessment compares the cost-per-point of buying against the user's effective valuation for that currency. *(FR-REW-008)*
5. **Given** a transfer-bonus or buy-points feed that is stale, **When** the intelligence renders, **Then** the affected figure is flagged or withheld, never presented as live. *(FR-X-008)*

---

### Edge Cases

- **Stale or missing inputs**: When `PointsValuation` rates, `BudgetState`, `MerchantGraph`, or `GoalState` are stale/absent — or when `CreditState` is **stale** — the wallet/recommender flags or withholds and asks the user; it never guesses a money input (Fresh or Flagged; Explainable & Auditable). **Exception**: when `CreditState` is **entirely absent**, the recommender applies the documented healthy-band default and proceeds silently (Constitution Principle VI v2.2.0 documented-default exception).
- **Conflicting recommendations**: When Rewards wants the high-points card but Cash Safety flags overdraft risk, `SafeToActSignal` takes precedence; the conflict and resolution are surfaced.
- **Contract version skew**: A breaking change in a consumed spine contract without a consumer migration disables the dependent recommendation (contract tests fail in CI) rather than serving on a mismatched schema.
- **Partial connectivity**: With only some cards/programs connected, the wallet and recommender compute on the known subset and clearly mark the picture as incomplete.
- **Multi-currency points**: Foreign-program valuations convert to CAD using a timestamped FX rate; a stale rate flags the converted figure.
- **Cent-level slippage**: Large balances (e.g. 500,000 points) must not drift by a cent under valuation arithmetic, including transfer-ratio and bonus multiplication (see Money Correctness).
- **Manual-entry staleness**: A manually-entered balance (program not aggregated) carries a user-entered freshness stamp; past its window the valuation is flagged stale and the user is prompted to update — it is never silently treated as current.
- **Expiring points**: Points expiring within the alert window are flagged with the expiry date and at-risk CAD value; a balance with an unknown expiry policy is marked "expiry unknown" rather than assumed non-expiring.
- **Stale transfer bonus**: A transfer-bonus or buy-points promo past its freshness window is flagged/withheld; the transfer-aware effective rate falls back to the base rate rather than applying a possibly-expired bonus.
- **Multi-profile boundaries**: In Multi-Profile Rewards Manager, a request for another profile's wallet/cards without authorization is denied and audited (see Threat Model).
- **Bilingual integrity**: A recommendation, alert, or label missing an EN or FR translation is a defect, not silently shown in one language.

## Clarifications

### Session 2026-06-26

- Q: When ≥2 cards tie on earn value for a merchant, how does the recommender pick the single card? → A: **Highest absolute CAD reward**, then lowest utilization impact as the secondary tiebreak (never naming a >50% hard-avoid card).
- Q: When CreditState (utilization) is **entirely absent** (not just stale), what does the best-card recommender do? → A: **Assume the healthy utilization band and proceed silently** (no user-facing flag). Permitted by the **v2.2.0 documented-default exception** to Constitution Principle VI (utilization is a secondary guardrail, not a money input). Stale CreditState and any missing/stale **money** input (balances, valuations) still flag/withhold.
- Q: Transfer-aware valuation scope for MVP (FR-REW-007)? → A: **Direct single-hop transfers plus a curated set of known 2-hop sweet spots** (no arbitrary multi-hop chains).
- Q: Default "expiring soon" alert window when the user hasn't set one (FR-REW-009)? → A: **60 days** before expiry.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-REW-*):

- **FR-REW-001 (Points Wallet)**: System MUST aggregate loyalty/points balances across Canadian and global programs and value each in CAD. Per FR-X-002, points redemption rates MUST be stored as arbitrary-precision decimals (never binary float); points-to-CAD valuation MUST compute in arbitrary precision and round the final result half-up to CAD minor units before storing or displaying; and at least one unit-test fixture (e.g. 500,000 points × 1.05 cpp = $5,250.00 CAD) MUST guard against cent-level slippage.
- **FR-REW-002 (Card Knowledgebase)**: System MUST maintain a Canada-first, bilingual card knowledgebase (earn rates, categories, credits, perks, insurance).
- **FR-REW-003 (Best Card Recommender)**: System MUST recommend a best card for a merchant/moment using earn rate, budget headroom, and utilization; it MUST warn when a card's use would push per-card or aggregate utilization into the 30–50% band and MUST NOT recommend a card whose use would push utilization above 50% (hard-avoid). Canonical utilization bands per `CreditState`: **< 10% optimal**, **< 30% healthy**, **30–50% warn**, **> 50% hard-avoid** (user-adjustable defaults). **Tiebreak**: when two or more eligible cards tie, the system MUST pick the one yielding the **highest absolute CAD reward**, then the lowest utilization impact. **Missing utilization**: when `CreditState` is **entirely absent**, the system MUST apply the **documented default of the healthy band** and proceed without a user-facing flag (permitted by Constitution Principle VI v2.2.0 documented-default exception); when `CreditState` is present but **stale**, the recommendation MUST flag/withhold per Fresh-or-Flagged. Missing/stale `BudgetState` (a primary input) MUST withhold.
- **FR-REW-004 (Welcome Bonus Tracker)**: System MUST track welcome-bonus minimum spends and warn when meeting one would exceed healthy budget.
- **FR-REW-005 (Perks Coach)**: System MUST track statement credits/perks with reset dates and flag chronically unused perks as downgrade/cancel candidates.
- **FR-REW-006 (Card-Linked Offers)**: System MUST surface card-linked offers normalized from Canadian banks and tie them to budget categories.

Module-owned, added from the PointsYeah benchmark (see [competitive-analysis-pointsyeah.md](./competitive-analysis-pointsyeah.md)):

- **FR-REW-007 (Transfer-partner intelligence & transfer-aware valuation)**: System MUST maintain, per points currency, its transfer partners and transfer ratios, and MUST compute a **transfer-aware effective valuation** (the best CAD value the currency can reach through an available partner). For MVP, the route search scope is **direct single-hop transfers plus a curated allowlist of known 2-hop sweet spots** — arbitrary multi-hop chains are out of scope. Per FR-X-002, transfer ratios MUST be stored as arbitrary-precision decimals and the effective rate computed in arbitrary precision, rounded half-up to CAD minor units; the base (direct) rate MUST also be shown so the user sees both. This valuation is **provided** to Travel and Pay.
- **FR-REW-008 (Transfer bonuses & buy-points promotions)**: System MUST surface active transfer bonuses and buy-points promotions with freshness stamps, apply a live transfer-bonus multiplier (arbitrary precision) to the transfer-aware valuation, and provide a "worth it?" comparison of a buy-points cost-per-point against the user's effective valuation. Stale/expired bonuses MUST be flagged/withheld and MUST NOT be applied (fall back to base rate).
- **FR-REW-009 (Points expiration tracking)**: System MUST track points-expiration policies/dates per balance where known, flag balances with points expiring within the alert window (**default 60 days**, user-adjustable) showing expiry date and at-risk CAD value, and mark unknown policies as "expiry unknown" rather than assuming non-expiring. Expiry alerts route through the Inbox digest (FR-INB-002) rather than as standalone interrupts.
- **FR-REW-010 (Valuation sources: feed, user-override, manual balance)**: System MUST support three balance/valuation sources, each tagged and freshness-stamped: (a) aggregated balances from the spine; (b) **manually-entered** balances for non-aggregated programs (user-entered freshness, stale after a user-set window); and (c) **user-override** redemption rates (custom cents-per-point) used in place of the feed default. All three flow through the same exact decimal/cents math (FR-X-002).
- **FR-REW-011 (Earn-path to a target redemption)**: System MUST, for a target redemption amount in a currency, propose an **earn-path using only cards the user already holds** (direct earn + available transfers/bonuses), framed as informational decision support — never as advice to acquire a new credit product (Constitution "not regulated advice"). The earn-path MUST cite the transfers/bonuses it assumes and respect `SafeToActSignal`/budget where the path implies spending.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility). FR-X-010 (Least privilege & threat model) applies via Multi-Profile Rewards Manager.

### Key Entities *(include if feature involves data)*

Consumed from the Spine (read-only contracts, not owned here): `BudgetState`, `CashFlowForecast`, `CreditState` (utilization bands), `MerchantGraph`, `GoalState`, `SafeToActSignal` (Cash Safety).

Owned/provided by this module:

- **Card / CardLineup**: A user's cards with earn rates, perks, credits, fees, and per-card utilization. **Provided** to Pay, Shopping, Travel, Household.
- **PointsBalance / PointsValuation**: A loyalty balance with arbitrary-precision base redemption rate, **transfer-aware effective rate**, CAD value, **valuation source** (aggregated / manual / user-override), optional **expiry**, freshness stamp, and time-to-goal contribution. **Provided** downstream.
- **TransferPartner / TransferRoute**: A directed link from a points currency to a partner program with a transfer ratio (arbitrary-precision). **Provided** to Travel and Pay.
- **TransferBonus / BuyPointsPromo**: A time-bounded, freshness-stamped bonus multiplier on a transfer route, or a buy-points promotion with a cost-per-point and a "worth it?" assessment versus the user's effective valuation.
- **PointsExpiry**: An expiration policy/date for a balance (or "unknown"), driving expiring-soon alerts and at-risk CAD value.
- **EarnPath**: An informational path to a target redemption using only cards the user holds, citing the transfers/bonuses assumed.
- **BestCardRecommendation**: A `Recommendation` naming one card with inputs (earn rate, budget headroom, utilization effect) and reasoning. **Provided** to Pay.
- **Offer / OfferCatalog**: A normalized card-linked offer tied to budget categories with freshness. **Provided** to Shopping & Deals.
- **WelcomeBonus / MinSpendProgress**: A min-spend target with remaining amount/days and CAD bonus value.
- **StatementCredit / Perk**: A periodic credit/perk with reset date and usage state (drives downgrade/cancel flags).
- **StatusState**: Loyalty/elite status tracking. **Provided** to Travel and Household.

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: Points redemption rates (cents-per-point), FX rates, and **transfer ratios / bonus multipliers** stored as **arbitrary-precision decimal**; CAD values stored as **integer minor units (cents)**. No binary floating point anywhere in valuation, earn-rate, transfer, or bonus-value math.
- **Rounding rules**: Points-to-CAD = `points × rate` computed in arbitrary precision, then **half-up to the nearest CAD cent** for storage/display. Foreign-program valuations convert via a timestamped FX rate in arbitrary precision, then half-up to CAD cents. **Transfer-aware effective rate** = `base_rate` adjusted by `transfer_ratio × bonus_multiplier`, all multiplied in arbitrary precision and rounded half-up **only at the final cent**. Intermediate products are never pre-rounded.
- **Currency & locale**: CAD throughout, with time-to-goal context (FR-X-004); en-CA and fr-CA locale-correct formatting (fr-CA `1 234,56 $`).
- **Determinism & fixtures**: Valuation, earn-rate, transfer, and min-spend math are pure and deterministic. Mandatory fixtures: the 500,000 × 1.05 cpp = `$5,250.00` slippage guard (FR-REW-001); a multi-currency points valuation through a fixed FX rate; an earn-rate computation for a category-bonus card; a **transfer-with-bonus** fixture (e.g. 100,000 pts at a 1:1 route with a 30% bonus → 130,000 partner pts, valued exactly with no cent drift).
- **Idempotency**: This module is read/recommend-oriented and writes little state; any persisted state it does write (e.g. a "perk marked used" acknowledgement, an offer-activation record) MUST be idempotent and safe to retry, keyed on the source event id.
- **Recommend-only**: Confirmed — Rewards only recommends a card/action; it never executes any payment or moves money (FR-X-003).

### Security & Privacy Threat Model *(MANDATORY — Multi-Profile Rewards Manager touches another person's financial data)*

- **Assets**: A profile's `CardLineup`, `PointsBalance`/valuations, `StatusState`, and the offers/perks tied to them; these reveal spend patterns and net-worth signals.
- **Trust boundaries / actors**: The owning user; other profiles managed under Multi-Profile Rewards Manager; the Household module's `MemberScope` grants; the spine (read-only provider); external rate/offer feeds.
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across profiles | another profile's CardLineup/PointsBalance | authZ on every cross-profile request, keyed on server-side session identity — never a client-supplied `profileId` | Yes (UI filtering alone does NOT satisfy) |
  | Stale-feed mis-valuation presented as fresh | PointsValuation, Offer | freshness stamp + flag/withhold on stale (FR-X-008) | Yes |
  | PII / monetary leak in logs | balances, valuations | structured logs redact PII + monetary values; audit trail separate (FR-X-014) | Yes |
  | User-override / manual-entry value poisoning → downstream mis-valuation (Travel/Pay) | PointsValuation (`user_override` rate, `manual` balance) | bounds/sanity checks on overridden cents-per-point and manual balances (reject out-of-range values); `valuation_source` carries the user-sourced provenance tag (`manual` / `user_override`) so downstream consumers know the value is self-reported and can discount/confirm it; every override and manual entry is audited (FR-X-014) | Yes (override/manual values validated server-side; client-supplied values never trusted) |

- **AuthZ enforcement**: Every cross-profile / cross-user read of rewards data is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted as the source of truth.
- **Data minimization, retention & revocation**: Rewards stores only what the wallet/recommender needs (balances, rates, card metadata). Offers/merchant enrichments derived solely from an email source are subject to the umbrella email-revocation cascade (FR-X-013) and the dormant-account retention bound (FR-X-019).
- **Data residency**: All rewards data inherits the Canadian-region residency constraint (FR-X-020); no rewards-derived PII is processed outside Canada without disclosure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-R-001 (Best-card value)**: For a representative basket of Canadian purchases, the recommended card equals or beats single-card "always use one card" net value in ≥ 90% of cases while **never** recommending a card that pushes utilization above the 50% hard-avoid band (umbrella SC-002).
- **SC-R-002 (Integration is real)**: 100% of best-card recommendations attach reasoning referencing earn rate, budget headroom, and utilization; a recommendation that ignores an available relevant input is a defect (umbrella SC-001, FR-X-001).
- **SC-R-003 (Explainability)**: 100% of recommendations can display "why" with their inputs; ≥ 80% of usability-test users say they understand why a card was recommended (umbrella SC-005).
- **SC-R-004 (Valuation exactness)**: 0 cent-level slippage across the money-correctness fixtures; 100% of monetary math uses minor-units/arbitrary-precision (no float).
- **SC-R-005 (Freshness safety)**: 0 points valuations or offers served past their staleness threshold without a visible stale flag (umbrella SC-006).
- **SC-R-006 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Rewards strings; 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-R-007 (Onboarding payoff)**: A new user connecting a first program/card sees a populated Points Wallet with at least one CAD-valued balance within the umbrella's 10-minute onboarding window (contributes to umbrella SC-014).
- **SC-R-008 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).
- **SC-R-009 (Profile safety)**: 0 cross-profile data exposures in API-layer authorization testing for Multi-Profile Rewards Manager; every denied cross-profile access is audited (umbrella SC-015).
- **SC-R-010 (Transfer-aware value)**: For currencies with transfer partners, the displayed effective valuation reflects the best available partner route (incl. any live bonus) in 100% of cases; 0 expired transfer bonuses are ever applied to a valuation (stale ⇒ base rate).
- **SC-R-011 (Expiry protection)**: 100% of balances with a known expiry policy and points expiring within the user's alert window surface an "expiring soon" flag with the date and at-risk CAD value before expiry.
- **SC-R-012 (Earn-path integrity)**: 100% of earn-path suggestions use only cards the user already holds and are labelled informational; 0 suggestions recommend acquiring a new credit product.

## Assumptions

- **Spine availability**: Module 0 exposes `AccountState`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `CreditState`, and `GoalState` as versioned, freshness-stamped contracts; Rewards consumes them and does not re-aggregate. Until a contract is available, the dependent Rewards story degrades (e.g. recommender withholds rather than guesses).
- **Cash Safety dependency for conflict resolution**: `SafeToActSignal` (Module 3) may not exist at Rewards MVP; until it does, Rewards still enforces utilization bands from `CreditState`, and overdraft-precedence conflict handling is wired when Cash Safety ships.
- **Card knowledgebase source**: A Canada-first card knowledgebase (earn rates, perks, credits, insurance) is curated/ingested; its exact source and update cadence are a planning decision.
- **Points/FX rate feeds**: Timestamped redemption-rate and FX feeds are available external sources subject to Fresh-or-Flagged; their concrete providers are selected in planning.
- **Transfer-partner graph & bonus/promo feeds**: A curated, Canada-first transfer-partner graph (e.g. Amex MR Canada → Aeroplan/British Airways; RBC Avion → partners; Scene+/Marriott routes) and a timestamped transfer-bonus / buy-points-promo feed are available; the graph is versioned as a dataset (like the card knowledgebase) and the bonus/promo feed obeys Fresh-or-Flagged. Concrete sources selected in planning.
- **Points-expiry policies**: Per-program expiry policies (e.g. Aeroplan 18-month inactivity) are curated where known; unknown policies are marked "expiry unknown", never assumed non-expiring.
- **No loyalty-balance auto-sync guarantee**: Many Canadian loyalty programs are not covered by bank aggregation; manual balance entry is a first-class, freshness-stamped source (FR-REW-010), not a degraded fallback.
- **Utilization bands**: Defaults are fixed (< 10% optimal, < 30% healthy, 30–50% warn, > 50% hard-avoid), user-adjustable, and read from `CreditState` rather than recomputed here.
- **Not regulated advice**: Card recommendations are informational decision support, not regulated financial advice (surfaced to users).

# Feature Specification: Card Knowledgebase & Best Card Recommender

**Feature Branch**: `001-card-knowledgebase`

**Created**: 2026-07-03

**Status**: Draft

**Input**: User description: "Card Knowledgebase & Best Card Recommender (Rewards & Loyalty module, Phase 1 MVP core) — a Canada-first, bilingual (EN/FR-CA) knowledgebase of Canadian credit cards and a recommender that tells the user which of THEIR cards to use for a given purchase to maximize net value."

## Clarifications

### Session 2026-07-03

- Q: How should the annual fee be treated when ranking cards the user already holds? → A: Sunk cost — the fee never reduces per-purchase expected value; it is displayed with each card and reserved for future keep/cancel analysis.
- Q: Which spend-category list should v1 use? → A: A fixed controlled list of 10 categories: groceries, gas, dining, recurring bills, pharmacy, travel, transit, entertainment, online shopping, other.
- Q: Where does the user's wallet live in v1? → A: On-device only — no user accounts, authentication, or server-side wallet storage in this feature.
- Q: How are point valuations curated and refreshed? → A: Team-curated per program with source and as-of date, reviewed quarterly and on major program changes; programs without a published valuation default to a conservative 0.5¢/point, disclosed in the explanation.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get the best card for a purchase (Priority: P1)

A user about to pay — at a grocery store, a gas station, a restaurant, or an online
checkout — opens the app, picks the merchant category (and optionally enters the purchase
amount), and immediately sees which of their cards earns the most net value for that
purchase, with the math shown transparently in dollars and cents.

**Why this priority**: This is the flagship "moment of value" for PerFiApp's Rewards
module and the differentiator over generic card lists: a recommendation grounded in the
user's actual wallet, expressed in exact CAD. Without it, the knowledgebase is a
reference document, not a product.

**Independent Test**: Can be fully tested by creating a wallet with two or more cards
that have different earn rates for one category, requesting a recommendation for that
category, and verifying the ranking, the CAD values, and the displayed explanation.

**Acceptance Scenarios**:

1. **Given** a user whose wallet holds Card A (2% cash back on groceries) and Card B
   (1 point/$ on everything, points valued at 1.5¢), **When** they request the best card
   for a $100.00 grocery purchase, **Then** Card A is ranked first showing $2.00 expected
   value and Card B second showing $1.50, each with a plain-language explanation of the
   math.
2. **Given** a user who requests a recommendation without entering an amount, **When**
   the ranking is produced, **Then** cards are ranked by effective earn rate for the
   category and values are shown per $100 of spend.
3. **Given** a category for which none of the user's cards has a bonus earn rate,
   **When** they request a recommendation, **Then** the ranking falls back to base earn
   rates and says so explicitly.
4. **Given** a user viewing a recommendation, **When** they switch the app language,
   **Then** every element of the recommendation — card names, category labels,
   explanation text — appears in the selected language (EN or FR-CA) with correctly
   localized currency and number formatting.

---

### User Story 2 - Browse the card knowledgebase (Priority: P2)

A user researching Canadian credit cards browses the knowledgebase: every supported
card's earn rates by category, annual fee, welcome bonus terms, statement credits,
travel perks, and insurance benefits — in their language, with all money values in CAD.

**Why this priority**: The knowledgebase is the data foundation the recommender stands
on and has standalone value for card-shopping decisions, but it delivers less
differentiated value on its own than the recommendation flow.

**Independent Test**: Can be tested by browsing the card list, filtering by category
bonus or fee, opening a card's detail view, and verifying completeness and bilingual
rendering of every field.

**Acceptance Scenarios**:

1. **Given** the knowledgebase, **When** a user opens any card's detail view, **Then**
   they see issuer, network, annual fee, earn rates per category, welcome bonus terms,
   statement credits, and perk/insurance summaries, with no missing fields.
2. **Given** the card list, **When** the user filters by "no annual fee" or by a category
   bonus (e.g., groceries), **Then** only matching cards are shown.
3. **Given** any card detail view, **When** the user switches language, **Then** all
   card and perk descriptions render in the selected language — no untranslated text.

---

### User Story 3 - Manage my wallet (Priority: P3)

A user selects which cards they hold from the knowledgebase to build their wallet, and
removes cards they cancel. The wallet is what the recommender ranks.

**Why this priority**: Required for personalization, but it is a thin selection flow on
top of the knowledgebase — and until the recommender (P1) exists, a wallet has nothing
to feed.

**Independent Test**: Can be tested by adding cards to an empty wallet, verifying they
appear with their details, removing one, and verifying recommendations reflect only the
remaining cards.

**Acceptance Scenarios**:

1. **Given** an empty wallet, **When** the user searches the knowledgebase and adds two
   cards, **Then** the wallet lists both cards.
2. **Given** a wallet with cards, **When** the user removes a card, **Then** it no longer
   appears in the wallet nor in any subsequent recommendation.
3. **Given** an empty wallet, **When** the user requests a recommendation, **Then** they
   are guided to add cards first instead of seeing an empty result.

---

### Edge Cases

- Purchase amount of $0.00, or a negative/malformed amount: rejected with a clear,
  localized message; no recommendation produced.
- Two cards produce identical expected value for a purchase: deterministic tie-break
  (documented rule — e.g., lower annual fee first, then alphabetical) so the ranking is
  stable and testable.
- A card's rewards are in points but the program has no published CAD valuation: the
  card is still ranked using a documented conservative default valuation, and the
  explanation discloses the assumption.
- Rounding: expected values are computed in exact cents; where point math produces
  fractional cents, the rounding rule is explicit, consistent, and tested (Constitution
  Principle II).
- A knowledgebase card is updated (e.g., earn rate change) after users added it to
  wallets: wallet entries reflect the updated card data on next recommendation.
- Bonus-category caps (e.g., 4% only on first $2,000/quarter): out of scope for v1
  ranking math (see Assumptions); the cap is displayed as a disclosure on the
  recommendation so the user is not misled.

## Requirements *(mandatory)*

### Functional Requirements

**Knowledgebase**

- **FR-001**: System MUST provide a curated knowledgebase of Canadian consumer credit
  cards, where each card record includes: issuer, payment network, card name (EN +
  FR-CA), annual fee, earn rates by spend category, reward currency (cash back or a
  named points program), welcome bonus terms, statement credits, travel perks, and
  insurance benefits.
- **FR-002**: All monetary values in the knowledgebase MUST be stored as integer cents
  with explicit CAD currency; earn rates MUST be stored as exact ratios (e.g., basis
  points), never floating-point percentages.
- **FR-003**: Every user-facing text field in the knowledgebase MUST exist in both
  English and Canadian French; a card cannot be published with either language missing.
- **FR-004**: Users MUST be able to browse, search by card name/issuer, and filter the
  knowledgebase by annual fee (including "no fee") and by bonus earn category.
- **FR-005**: Each points-based reward program in the knowledgebase MUST carry a CAD
  valuation (cents per point, with its source and as-of date) used for CAD-equivalent
  math. Valuations are team-curated and reviewed quarterly and on major program
  changes; a program without a published valuation uses a conservative default of
  0.5¢/point, and every recommendation using the default discloses it.

**Wallet**

- **FR-006**: Users MUST be able to add any knowledgebase card to their wallet and
  remove it; the wallet is a list of references to knowledgebase cards.
- **FR-007**: The system MUST NOT request or store card numbers, balances, credentials,
  or any bank-account linkage in this feature — wallet membership only. The wallet is
  stored on the user's device; this feature introduces no user accounts,
  authentication, or server-side storage of any user data.

**Recommender**

- **FR-008**: Given a merchant category and an optional purchase amount, the system MUST
  rank the user's wallet cards by expected net value for that purchase, computed in
  exact CAD cents.
- **FR-009**: Expected value MUST account for: the card's earn rate for the category
  (bonus rate if applicable, else base rate) and conversion of points to CAD via the
  program valuation (FR-005). The annual fee is treated as sunk cost: it MUST NOT
  reduce per-purchase expected value for cards the user holds, and this treatment MUST
  be disclosed in the explanation (see Clarifications).
- **FR-010**: Every recommendation MUST include a plain-language, localized explanation
  showing the math: rate applied, point valuation used, fee treatment, and any
  assumptions (e.g., default point valuation, bonus caps not modelled).
- **FR-011**: The ranking MUST be deterministic: identical wallet, category, and amount
  inputs always produce the same ordering, including tie-breaks.
- **FR-012**: Recommendation and knowledgebase math (earn computation, point valuation,
  rounding) MUST be developed test-first with failing tests preceding implementation
  (Constitution Principle V), including edge cases for zero, negative, and
  rounding-boundary amounts.

**Cross-cutting**

- **FR-013**: All user-facing strings across the three flows MUST come from i18n
  resources complete in `en-CA` and `fr-CA` (Constitution Principle I).
- **FR-014**: The system MUST record, for each knowledgebase card, a "data as-of" date
  visible to users, so stale card terms are detectable.

### Key Entities

- **Card**: a Canadian credit card product — issuer, network, bilingual names and
  descriptions, annual fee (cents, CAD), earn rates (category → exact ratio), reward
  currency, welcome bonus terms, statement credits, perks, insurance benefits, data
  as-of date.
- **Reward Program**: a points/cash-back scheme — bilingual name, CAD valuation in
  cents-per-point (with source + as-of date).
- **Spend Category**: the fixed, controlled, bilingual list of 10 merchant categories
  used for earn rates and recommendation requests: groceries, gas, dining, recurring
  bills, pharmacy, travel, transit, entertainment, online shopping, other.
- **Wallet**: a user's set of references to Cards, stored on-device; no financial
  account data and no server-side copy.
- **Recommendation**: the ranked result for (wallet, category, optional amount) — per
  card: expected value in cents, the applied rate, valuation, fee treatment, and the
  localized explanation.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A user with a populated wallet gets a best-card answer for a purchase in
  under 10 seconds from opening the recommendation flow, including choosing a category.
- **SC-002**: 100% of recommendation math shown to users reconciles to the cent with
  the published card terms and point valuations in the knowledgebase (verified by
  automated reconciliation across the full test suite).
- **SC-003**: Every knowledgebase card and every recommendation renders fully in both
  EN and FR-CA — zero untranslated user-facing strings in either language across the
  feature (verified by resource completeness checks).
- **SC-004**: The knowledgebase launches with at least 30 Canadian cards covering the
  5 largest issuers, sufficient for at least 90% of test users to find every card they
  hold.
- **SC-005**: Given identical inputs, recommendation results are reproducible run-over-run
  with zero ordering or value differences (deterministic-ranking property tests pass).

## Assumptions

- **Single user, single profile, on-device**: household/multi-profile coordination and
  user accounts are later features (per PDR phases and Clarifications); each wallet
  belongs to one user on one device.
- **Curated data, manual pipeline**: card data is maintained by the team as curated
  reference data with an as-of date; automated scraping/feeds of issuer terms are out
  of scope for v1.
- **Category granularity**: v1 uses the fixed 10-category list (see Clarifications)
  rather than merchant-level detection; merchant-level mapping arrives with
  transaction data in a later phase.
- **Bonus caps and rotating categories**: displayed as disclosures but not modelled in
  v1 ranking math (requires spend history the app doesn't have yet). The explanation
  must disclose this whenever a capped rate is applied.
- **Annual fee — sunk cost** (confirmed in Clarifications): the fee never affects
  per-purchase ranking for held cards; it is displayed with each card. A fee-inclusive
  keep/cancel comparison view can be added later without changing the ranking contract.
- **Point valuations** (confirmed in Clarifications): team-curated per program with
  source and as-of date, quarterly review cadence; unlisted programs use the disclosed
  0.5¢/point conservative default.
- **Out of scope for this feature** (from the feature description): bank/transaction
  aggregation, offer auto-activation, welcome-bonus progress tracking,
  utilization/budget awareness, notifications, household/multi-profile support.

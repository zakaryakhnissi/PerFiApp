# Feature Specification: Module 6 — Shopping & Deals

**Feature Branch**: `008-module-6-shopping`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 6 — Shopping & Deals (Priority: P2)"; functional requirements FR-SHOP-001..003 and cross-cutting FR-X-001..020; Constitution v2.2.0; ratified [platform-decisions.md](../_platform/platform-decisions.md) and [ux-foundations.md](../_platform/ux-foundations.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Shopping & Deals** tab only. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** spine contracts and does **not** re-implement aggregation, budgeting, cash-flow forecasting, or the merchant graph. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Shopping behavior.
>
> **Boundary with Module 1 (Rewards)**: Shopping does **not** own card-linked-offer normalization or points valuation — it **consumes** Rewards' `OfferCatalog` and reasons over it. Shopping owns **retail coupons/promo codes**, **watched-item price intelligence**, and the **buy-now-vs-wait** decision.
>
> **Boundary with Module 5 (Pay)**: Shopping does **not** own checkout card/account selection — it **consumes** Pay's `CheckoutRecommendation` (when shipped) and surfaces it alongside the coupon. Shopping owns *which coupon* to apply, not *which card* to pay with.
>
> **Boundary with Module 3 (Cash Safety)**: Shopping never overrides a safety signal. Any spend-positive recommendation (buy-now) defers to `SafeToActSignal` per the documented cross-module precedence (ux-foundations.md §10.4).

## User Scenarios & Testing *(mandatory)*

Shopping & Deals answers the question competitors ignore — *should you buy at all, and when?* — by blending retail price intelligence and coupon savings with the spine's **budget headroom, runway safety, and goal impact**. It is recommend-only: it never completes a checkout or moves money. Its trustworthiness comes entirely from grounding every "buy" in real money state and withholding when that state is missing or stale.

### User Story 1 - Auto-Coupon at Checkout with Realized-Savings Ledger (Priority: P2)

A user at an online checkout sees the single best valid coupon for that merchant surfaced, applies it themselves, and — once the purchase posts — sees the realized saving recorded and framed against their budget and goals.

**Why this priority**: It is the most immediate, self-evident payoff of the Shopping tab and is independently valuable before any price-watch history or buy/wait model exists. It delivers a concrete CAD saving on the very first use.

**Independent Test**: At a supported merchant checkout, request coupons and confirm exactly one best valid code is surfaced with its expected CAD saving and a freshness stamp; after the user confirms they used it and the purchase posts, confirm a `RealizedSavings` record is written exactly once and is reflected against the linked budget category.

**Acceptance Scenarios**:

1. **Given** a checkout at a supported merchant and ≥1 valid coupon in the feed, **When** the user requests coupons, **Then** the **single best valid** code is surfaced with its expected CAD saving, its terms (minimum spend, expiry), and a `FreshnessStamp`. *(FR-SHOP-001)*
2. **Given** several stackable/conflicting coupons, **When** the best code is chosen, **Then** the selection maximizes **expected CAD saving subject to the coupon's own validity terms** and the reasoning lists why that code beat the others. *(FR-SHOP-001; Clarification Q1)*
3. **Given** the user confirms (via a Confirm-Action sheet) that they applied the code and the purchase later posts in `TransactionStream`, **When** the saving is recorded, **Then** a `RealizedSavings` entry is written **once** (idempotent on the source event id) and tied to the merchant and budget category. *(FR-SHOP-001; FR-X-003/007)*
4. **Given** the same purchase-posted event is delivered twice (retry), **When** recording runs again, **Then** no duplicate `RealizedSavings` row and no duplicate audit event are produced. *(FR-X-003)*
5. **Given** all candidate coupons are stale beyond their freshness window, **When** the user requests coupons, **Then** no coupon is presented as live; the surface shows the Stale/Unavailable state and offers a refresh. *(FR-X-008)*
6. **Given** an fr-CA user, **When** the expected saving is displayed, **Then** it is formatted `12,50 $` (comma decimal, trailing symbol), not `$12.50`. *(FR-X-005)*

---

### User Story 2 - Price Watch & Droplist with Budget/Goal-Framed Alerts (Priority: P2)

A user adds an item to a watchlist and, when its tracked price drops, is alerted with the saving framed against the linked budget category and goal — never as a context-free "deal!" nudge.

**Why this priority**: It is the engagement backbone of the tab and the data source the buy/wait model reasons over, but US1 already delivers standalone value, so this is the second slice.

**Independent Test**: Watch an item with a known baseline price; simulate a price drop in the feed; confirm the user receives a single alert (through the Inbox digest) that states the new price, the CAD saving versus baseline, and the impact on the linked budget/goal, each carrying a freshness stamp.

**Acceptance Scenarios**:

1. **Given** a watched item with a recorded baseline, **When** its tracked price drops below the user's threshold, **Then** the user is alerted with the new price and the CAD saving framed against the linked budget category and goal. *(FR-SHOP-002)*
2. **Given** a watched item with no linked goal, **When** a drop alert is produced, **Then** the budget-category framing is still shown and the time-to-goal line is **omitted** (not shown as "no goal"). *(FR-X-004; ux-foundations.md §8.4)*
3. **Given** a price feed that is stale beyond its window, **When** the watchlist renders, **Then** the displayed price carries a Stale chip and the item is not alerted on as a "live drop". *(FR-X-008)*
4. **Given** a price alert is generated, **When** it is delivered, **Then** it routes through the Inbox digest pipeline (no standalone push) and respects the notification budget. *(FR-INB-002; ux-foundations.md §6)*
5. **Given** a currency mismatch (an item priced in USD), **When** the saving is computed, **Then** it is converted to CAD via a timestamped FX rate (arbitrary precision, half-up at the final cent); a stale FX rate flags the converted figure. *(FR-X-002/008)*

---

### User Story 3 - Buy-Now-vs-Wait Score Grounded in Budget, Runway & Goals (Priority: P2)

For an item under consideration, the user requests a buy-now-vs-wait decision and receives a score, a recommended best date, and the goal impact — computed against budget headroom and `SafeToActSignal`, favoring "wait" when there is no safe headroom.

**Why this priority**: This is the flagship differentiator of the module ("should you buy at all, and when?") and the clearest expression of Integration-First, but it depends on US2's price history and the spine's budget/runway, so it lands after them.

**Independent Test**: With a watched item, a populated `BudgetState`, and a `SafeToActSignal`, request a buy/wait decision and confirm it returns a score, a recommended best date, and the goal impact, citing price trend, budget headroom, and runway/safety — and that when budget headroom is absent or `SafeToActSignal` flags risk, "wait" is favored with the reason naming the safety/budget state.

**Acceptance Scenarios**:

1. **Given** an item under consideration with price history, **When** the buy/wait score is computed, **Then** it returns a numeric score, a recommended best date, and the goal impact, with reasoning citing price trend **and** budget headroom **and** runway/safety. *(FR-SHOP-003; FR-X-001/006)*
2. **Given** the budget has no headroom in the item's category, **When** the score runs, **Then** **"wait"** is favored and the reason references the budget/goal state. *(FR-SHOP-003; umbrella AS4)*
3. **Given** `SafeToActSignal` flags overdraft risk, **When** a "buy now" would otherwise be favored, **Then** Cash Safety **takes precedence**, "wait" is surfaced, and the Conflict Banner names both signals and the resolution rule. *(ux-foundations.md §3.1/§10.4)*
4. **Given** `BudgetState` (a primary money input) is missing or stale, **When** a buy/wait score is requested, **Then** the score is **withheld** and the user is asked to refresh — it never guesses a money input. *(Constitution VI; FR-X-008)*
5. **Given** `SafeToActSignal` is **entirely absent** (Cash Safety not connected/not yet shipped), **When** a buy/wait score is requested **and** the spine's `CashFlowForecast.shortfall_flag` is also unavailable, **Then** the score is computed on budget/goal alone, is labelled with a documented "safety signal unavailable" note, and **caps its recommendation at "wait/neutral" for any spend that would consume material budget headroom** — it never upgrades to a confident "buy now" without a safety input. *(Clarification Q4; Constitution VI documented-default boundary)*
6. **Given** a recommended best date in the future, **When** the score is shown, **Then** the date is rendered in the active locale (`3 juillet 2026` for fr-CA) and the projected saving-by-waiting is shown in CAD. *(FR-X-004/005)*

---

### Edge Cases

- **Empty / no connection**: With no accounts connected, the buy/wait score and budget framing cannot be computed; the tab shows the Empty state (first-run illustration + connect CTA), never zero-filled savings. Auto-coupon may still surface merchant coupons (no spine dependency) but cannot frame them against budget/goal until a connection exists.
- **Partial connectivity**: With some accounts connected, scores compute on the known subset and carry an "Incomplete data" chip; the Partial Data Banner names the gap (e.g. "Your credit card is not connected — budget impact may be incomplete").
- **Stale / missing money inputs**: Stale or missing `BudgetState`, `CashFlowForecast`, or `GoalState` (primary money inputs to buy/wait) → **withhold** the score and ask the user (Fresh-or-Flagged; Explainable & Auditable). Stale **price** or **FX** feed → the affected figure is flagged; a drop is not treated as live.
- **Conflicting advice (Cash Safety precedence)**: Buy-now vs `SafeToActSignal` overdraft risk → `SafeToActSignal` wins; the conflict and its resolution are surfaced via the Conflict Banner. Buy-now vs Pay's `CheckoutRecommendation` is **not** a conflict — they answer different questions (which coupon vs which card) and are shown together.
- **Multi-currency**: Foreign-priced items and foreign coupons convert to CAD via a timestamped FX rate (arbitrary precision, half-up at the final cent); a stale FX rate flags the converted figure (umbrella multi-currency edge case).
- **Idempotency / retries**: `RealizedSavings` recording and coupon-application acknowledgements are keyed on the source event id; a replayed purchase-posted or confirmation event never double-records a saving or emits a duplicate audit event (FR-X-003).
- **Coupon validity at point of use**: A coupon valid in the feed but **expired or below its minimum-spend at the moment of checkout** is not surfaced as the best code; expiry and minimum-spend terms are part of validity, not afterthoughts.
- **Realized vs expected saving divergence**: When the posted purchase shows a different saving than the coupon's expected value (partial apply, item out of stock), the `RealizedSavings` record stores the **actual** posted saving and flags the divergence, never the optimistic expected figure.
- **Watched-item baseline gaming**: A "drop" computed against a feed that just inflated the list price is suppressed; the baseline uses observed price history (not a single feed snapshot) so a fake-anchor "discount" is not alerted as a real saving.
- **Cross-user boundaries (Household)**: In a household, a request for another member's watchlist, realized-savings ledger, or buy/wait history is authorized server-side against the requester's session identity and `MemberScope`; an unauthorized cross-member read is denied and audited.
- **Email-sourced enrichment purge**: A watched item or coupon whose **sole** source was a connected promotional email is subject to the FR-X-013 email-revocation cascade — purged within the 7-day window regardless of which store now holds it. A `WatchedItems` entry derived solely from email is explicitly named in the umbrella as such an artifact.
- **Bilingual integrity**: A coupon description, alert, or buy/wait rationale missing an EN or FR string is a defect, not silently shown in one language.
- **Contract version skew**: A breaking change in a consumed spine/Rewards/Pay contract without a consumer migration disables the dependent Shopping feature (contract tests fail in CI) rather than serving on a mismatched schema.

## Clarifications

This section records decisions made autonomously to resolve material ambiguity (the spec author runs non-interactively and must not block). Items that genuinely need a product-owner decision are listed under **Open questions for the product owner**; none blocks the spec — each has a documented working default.

### Decisions taken (Session 2026-06-29)

- **Q1 — When multiple coupons are valid, how is the single "best" chosen?** → **Maximize expected CAD saving subject to each coupon's own validity terms** (minimum spend, expiry, eligibility). Stacking is only proposed when a coupon's terms explicitly permit it; FinOS never asserts a stack the merchant disallows. Reasoning lists why the chosen code beat the runners-up.
- **Q2 — What is the price-watch baseline for "drop" detection?** → **Observed price history (rolling median/trough over the tracked window)**, not a single feed snapshot, to defeat fake-anchor "discounts". The threshold is the user's set target or a default percentage below the rolling baseline.
- **Q3 — Does Shopping execute a checkout or apply the coupon itself?** → **No.** Recommend-only (Constitution IV / FR-X-003). Shopping surfaces the code and (on US1) records the realized saving **after** the user applies it and the purchase posts; it never auto-fills, auto-submits, or moves money.
- **Q4 — Buy/wait when `SafeToActSignal` is absent (Cash Safety not yet shipped).** → `SafeToActSignal` is a **secondary safety guardrail**, but buy/wait has no single named "healthy default" that is safe to assume for a spend decision. Working rule: if `SafeToActSignal` is absent, fall back to the spine's `CashFlowForecast.shortfall_flag`/`runway_days` as the safety input; if **both** are unavailable, compute on budget/goal alone, label "safety signal unavailable", and **cap the output at "wait/neutral"** for any spend consuming material budget headroom — never a confident "buy now" without a safety input. This is stricter than Rewards' silent healthy-band default because the missing input here bears directly on a spend recommendation; the boundary is recorded per Constitution VI.
- **Q5 — Are buy/wait scores written to the audit trail?** → A buy/wait **recommendation_shown** event and any user-confirmed action (coupon-used acknowledgement, watch created/removed) are written to the append-only audit trail (FR-X-007). The score itself carries its `Reasoning` so it is reproducible.

### Open questions for the product owner (non-blocking; working defaults in place)

1. **Coupon/promo-code source vendor** — concrete Canadian-coverage retail coupon feed/provider and its residency posture. *Working default*: a `CouponProvider` interface seeded with a curated Canada-first sample; vendor selected in planning and entered in the subprocessor register (mirrors Rewards' `OfferProvider`; platform NR-4). **Recommended default: proceed with the interface + curated seed.**
2. **Price-intelligence source vendor** — retail price-history/feed provider and residency posture. *Working default*: a `PriceProvider` interface seeded with a curated sample; vendor selected in planning (subprocessor register). **Recommended default: proceed with the interface + curated seed.**
3. **Staleness windows** for coupons / prices / FX. *Working default* (research.md §5): coupons 6 h, prices 24 h, FX 1 h — Canada-oriented, user-adjustable, finalized in the Module 0 ops/PIA review. **Recommended default: adopt as stated.**
4. **Whether `CheckoutRecommendation` (Pay, Module 5) is available at Shopping MVP.** Module 5 is not yet specced. *Working default*: Pay integration is **feature-checked**; until Pay ships, Shopping surfaces the coupon without the card recommendation, exactly as Rewards feature-checks `SafeToActSignal`. **Recommended default: feature-check; ship US1–US3 without hard Pay dependency.**

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-SHOP-*):

- **FR-SHOP-001 (Auto-Coupons & Codes + realized-savings ledger)**: System MUST surface, for a supported merchant/checkout, the **single best valid** retail coupon/promo code — selected to maximize expected CAD saving subject to the coupon's own validity terms (minimum spend, expiry, eligibility) — and MUST record the **realized** saving once the user confirms use and the purchase posts. Coupons carry a `FreshnessStamp`; stale coupons are flagged/withheld, never presented as live. Recording is **recommend-only and idempotent**: FinOS does not auto-apply, auto-submit, or move money; the `RealizedSavings` write is keyed on the source event id and safe to retry (FR-X-003). Expected and realized savings are computed in integer CAD cents; foreign coupons convert via a timestamped FX rate (arbitrary precision, half-up at the final cent).
- **FR-SHOP-002 (Price Watch & Droplist)**: System MUST let a user watch an item, track its price against an observed-history baseline, and alert on a drop **framed against the linked budget category and goal** (CAD saving + time-to-goal where a goal applies). Tracked prices carry a `FreshnessStamp`; a stale price is flagged and not treated as a live drop. Drop alerts route through the Inbox digest (FR-INB-002), never as standalone pushes. Foreign-priced items convert to CAD via a timestamped FX rate (stale ⇒ flagged).
- **FR-SHOP-003 (Buy-Now-vs-Wait Score)**: System MUST compute, for an item under consideration, a buy-now-vs-wait score with a **recommended best date** and **goal impact**, honoring `SafeToActSignal` and budget headroom. When budget has no headroom, the system MUST favor **"wait"** and cite the budget/goal state. When `SafeToActSignal` flags risk, Cash Safety **takes precedence** and the conflict/resolution is surfaced. `BudgetState`, `CashFlowForecast`, and `GoalState` are **primary money inputs**: when missing or stale, the score MUST be **withheld** (never guessed). When `SafeToActSignal` is absent, the system MUST fall back to `CashFlowForecast` safety signals and, if those are also absent, MUST cap output at "wait/neutral" for material spends (no confident "buy now" without a safety input). The score, best date, and projected saving-by-waiting are expressed in CAD with time-to-goal context.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-013 (Privacy/email-revocation cascade — `WatchedItems`), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility). FR-X-010 (Least privilege & threat model) applies via the Household cross-member boundary.

### Key Entities *(include if feature involves data)*

Consumed from the Spine / other modules (read-only contracts, not owned here): `BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, `TransactionStream` (purchase-posted detection) — Module 0; `SafeToActSignal`/`RunwayForecast` — Module 3 (Cash Safety); `OfferCatalog` — Module 1 (Rewards); `CheckoutRecommendation` — Module 5 (Pay, feature-checked).

Owned/provided by this module:

- **WatchedItem / WatchedItems**: A user-watched product with a canonical merchant reference, an observed-price baseline, a current tracked price (freshness-stamped), a user drop-threshold, an optional linked budget category and goal, and a source provenance (price-feed / email-inferred). **Provided** to Tasks, Pay, and Inbox.
- **CouponOffer**: A retail coupon/promo code for a merchant with terms (minimum spend, expiry, eligibility, stackable flag), an expected CAD saving, and a `FreshnessStamp`. Internal to coupon selection; the **chosen** code is surfaced in a `CouponRecommendation`.
- **CouponRecommendation**: A `Recommendation` naming the single best valid coupon for a checkout, with reasoning citing why it beat the runners-up and its expected CAD saving. (Recommend-only; the user applies it.)
- **RealizedSavings**: An append-only record of an actual saving realized on a posted purchase, tied to a merchant and budget category, with the **actual** posted saving (and a divergence flag if it differs from the coupon's expected value). **Provided** to Tasks, Pay, and Inbox. Idempotent on source event id.
- **PurchasePlan / BuyWaitScore**: A buy-now-vs-wait decision for an item: a score, a recommended best date, a projected saving-by-waiting, the goal impact, and `Reasoning` citing price trend, budget headroom, and runway/safety. **Provided** to Tasks, Pay, and Inbox.
- **AuditEvent**: Append-only records of `recommendation_shown` (buy/wait, coupon), `coupon_use_acknowledged`, `realized_savings_recorded`, `watch_created` / `watch_removed`, and denied cross-member reads (Principle VI / FR-X-007).

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: All savings, prices, thresholds, and projected saving-by-waiting are **integer minor units (CAD cents)**. FX rates are **arbitrary-precision decimal strings** on the wire (`^[0-9]+(\.[0-9]+)?$`). Coupon percentage-discount factors are arbitrary-precision decimals, never binary float. **No `float`/`double` anywhere** in coupon, price, saving, or FX math.
- **Rounding rules**: A percentage coupon saving = `price_cents × discount_fraction`, computed in arbitrary precision and rounded **half-up to the nearest CAD cent** at the final step only. Foreign prices/coupons convert via a timestamped FX rate in arbitrary precision, half-up to CAD cents. Intermediate products are never pre-rounded.
- **Currency & locale**: CAD throughout with time-to-goal context (FR-X-004); en-CA and fr-CA locale-correct formatting via `@finos/format` (fr-CA `12,50 $`). A monetary value with the wrong locale convention is a bilingual defect (FR-X-005).
- **Determinism & fixtures**: Coupon-saving, FX-conversion, and buy/wait scoring math are pure and deterministic. Mandatory fixtures: (a) a percentage-coupon cent-slippage guard (e.g. `$249.99 × 15% off = $37.50` saving, exact, no drift); (b) a multi-currency coupon valued through a fixed FX rate; (c) a realized-vs-expected divergence case where the recorded saving is the **actual** posted figure, not the optimistic expected one; (d) a buy/wait "no budget headroom ⇒ wait" branch and a "`SafeToActSignal` risk ⇒ wait (Cash Safety precedence)" branch.
- **Idempotency**: `RealizedSavings` recording, coupon-use acknowledgements, and watch create/remove are keyed on the source event id with a uniqueness constraint; a replayed event never double-records a saving or duplicates an audit event (FR-X-003).
- **Recommend-only**: Confirmed — Shopping only recommends (best coupon, buy/wait); it never completes a checkout, auto-applies a code, or moves money (FR-X-003). Every consequential step routes through a Confirm-Action sheet (ux-foundations.md §2.2).

### Security & Privacy Threat Model *(MANDATORY — Household cross-member access + email-sourced enrichment)*

This module touches **another person's financial data** (a household member's watchlist / savings ledger / buy-wait history) and ingests **email-sourced enrichment** (coupons/watched items inferred from a connected promotional email), so a threat model is mandatory (Constitution V; FR-X-010/013).

- **Assets**: A profile's `WatchedItems` (reveals purchase intent), `RealizedSavings` and `BuyWaitScore` history (reveal spend behaviour and budget pressure), and any email-inferred coupon/item enrichment.
- **Trust boundaries / actors**: The owning user; other household members under `MemberScope`; the spine (read-only provider); Rewards (`OfferCatalog` provider); external coupon/price feeds; the connected email source (email-inferred enrichment).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across household members | another member's `WatchedItems` / `RealizedSavings` / buy-wait history | authZ on every cross-member request, keyed on the **server-side session identity** and `MemberScope` — never a client-supplied `profileId`/`memberId` | Yes (UI filtering alone does NOT satisfy) |
  | Stale price/coupon presented as a live deal | `CouponRecommendation`, `WatchedItem` price | `FreshnessStamp` + flag/withhold on stale; observed-history baseline defeats fake-anchor discounts (FR-X-008; Clarification Q2) | Yes |
  | Email-sourced enrichment outliving email-access revocation | email-inferred `WatchedItems`/coupons | FR-X-013 cascade: data whose **sole** source is the email connection is purged within 7 days of revocation, regardless of store; `source`/`email_sourced`/`owner_profile_id` track provenance | Yes |
  | PII / monetary leak in logs | savings, prices, watchlists | structured logs redact PII + monetary values; append-only audit trail kept separate (FR-X-014) | Yes |
  | Incorrect money advice on degraded feed | buy/wait score | money inputs stale/missing ⇒ withhold; graceful degradation with timeouts/retries (FR-X-008/012) | Yes |

- **AuthZ enforcement**: Every cross-member read of Shopping data is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. Denied cross-member access is audited (SC-015). Kid-role accounts have no profile switcher (ux-foundations.md §10.6).
- **Data minimization, retention & revocation**: Shopping stores only what the watch/score/ledger needs. Email-sourced coupon/item enrichment is subject to the FR-X-013 email-revocation cascade and the FR-X-019 dormant-account retention bound; provenance is tracked so the purge targets exactly the email-sourced data.
- **Data residency**: All Shopping data inherits the Canadian-region residency constraint (FR-X-020); coupon/price/FX subprocessors must satisfy residency or be disclosed + agreement-backed (subprocessor register, platform §5).
- **Aggregation tokens**: **Out of scope** for Shopping — token lifecycle is owned by Module 0 (FR-CORE-007). Shopping reads spine contracts only and never handles aggregation credentials.

## UI/UX Notes *(references ux-foundations.md)*

- **States matrix (all six required for every data view — ux-foundations.md §3)**:
  - *Empty*: first-run illustration + "Connect an account" / "Add an item to watch" CTA; never zero-filled savings.
  - *Loading*: skeletons matching the watchlist/score layout; no bare spinners.
  - *Partial*: Partial Data Banner naming the unconnected account that limits budget framing; affected scores carry an "Incomplete data" chip.
  - *Stale*: price/coupon/FX past threshold shows a Stale freshness chip; a stale **money** input (budget/runway) **withholds** the buy/wait score and shows the Withheld Card with a Refresh CTA.
  - *Error/Degraded*: feed-down shows the Unavailable chip and a non-alarming retry state; never the last-known value presented as current.
  - *Withheld*: missing/stale primary money input replaces the buy/wait area with the Withheld Card stating what is missing and the CTA to fix it.
- **Components (ux-foundations.md §4)**:
  - *Recommendation Card* for the buy/wait decision and the best-coupon surface — Action layer ("Wait — better price likely by July 3"), Why layer (price trend, budget headroom, runway/safety, sources + freshness), State layer (freshness chip + withheld/incomplete badge).
  - *Confirm-Action sheet* for any consequential step (acknowledging a coupon was used, confirming a planned purchase) — exact CAD impact, the Why layer, the mandatory "not regulated financial advice" disclaimer, and a specific verb CTA (e.g. "Record this saving", never "OK").
  - *Freshness chip* on every price, coupon, and converted figure — always visible, not only inside the Why expandable.
  - *Conflict banner* when buy/wait collides with `SafeToActSignal` — names both signals, states "Cash Safety takes priority", shows the overridden buy-now card in a "Currently overridden" state.
- **Key screens**: (1) **Watchlist** — watched items with current price + freshness chip and a per-item buy/wait entry; (2) **Item / Buy-Wait detail** — the buy/wait Recommendation Card, price-trend chart, recommended best date, and goal-impact line; (3) **Checkout coupon surface** — the single best valid coupon with terms and expected CAD saving; (4) **Savings ledger** — realized savings framed by budget category and goal.
- **Notification restraint (ux-foundations.md §6)**: price-drop and best-date alerts are submitted to the **Inbox digest** (priority tier *Important*); Shopping never sends a standalone push. Items carry localized EN/FR short descriptions.
- **Locale & a11y (ux-foundations.md §7–8)**: all money/dates via `@finos/format` (fr-CA `12,50 $`, `3 juillet 2026`); WCAG 2.1 AA; localized EN/FR screen-reader labels on every interactive element and data value; Dynamic Type and reduced-motion supported; dark-mode token variants for any new tokens.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-SH-001 (Buy/wait integration is real)**: 100% of buy/wait scores attach reasoning referencing price trend, budget headroom, and runway/safety; a score that ignores an available relevant input is a defect (umbrella SC-001, FR-X-001).
- **SC-SH-002 (Cash-Safety precedence honored)**: In 100% of cases where `SafeToActSignal` flags overdraft risk, the buy/wait output favors "wait" and surfaces the conflict + resolution; 0 cases recommend "buy now" over an active safety risk (ux-foundations.md §10.4).
- **SC-SH-003 (Withhold on stale money input)**: 0 buy/wait scores are served on a stale or missing primary money input (`BudgetState`/`CashFlowForecast`/`GoalState`) without the Withheld state (umbrella SC-006).
- **SC-SH-004 (Coupon freshness safety)**: 0 coupons or tracked prices are presented as live past their staleness threshold without a visible Stale flag (umbrella SC-006).
- **SC-SH-005 (Saving exactness & idempotency)**: 0 cent-level slippage across the money-correctness fixtures; 100% of saving/price/FX math uses minor-units/arbitrary-precision (no float); a replayed purchase-posted event records a saving **at most once** (FR-X-003).
- **SC-SH-006 (Realized truth)**: 100% of `RealizedSavings` records reflect the **actual** posted saving (with a divergence flag when it differs from the expected), never the optimistic expected figure.
- **SC-SH-007 (Recommend-only)**: 0 endpoints complete a checkout, auto-apply a coupon, or move money; every consequential action routes through a Confirm-Action sheet (umbrella SC-007, FR-X-003).
- **SC-SH-008 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Shopping strings; 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-SH-009 (Notification restraint)**: 100% of price-drop/best-date alerts route through the Inbox digest; Shopping sends 0 standalone pushes (umbrella SC-009).
- **SC-SH-010 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012); a breaking consumed-schema change disables the dependent feature rather than serving on a mismatched schema.
- **SC-SH-011 (Cross-member safety)**: 0 cross-member Shopping-data exposures in API-layer authorization testing; every denied cross-member access is audited (umbrella SC-015).
- **SC-SH-012 (Email-revocation purge)**: 100% of Shopping data whose sole source was a connected email is purged within the 7-day window on email-access revocation, regardless of which store holds it (umbrella SC-013-equivalent / FR-X-013).

## Assumptions

- **Spine availability**: Module 0 exposes `BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, and `TransactionStream` as versioned, freshness-stamped contracts; Shopping consumes them and does not re-derive budget, runway, or merchant identity. Until a contract is available, the dependent Shopping behavior degrades (the score withholds rather than guesses).
- **Cash Safety dependency for precedence/safety**: `SafeToActSignal`/`RunwayForecast` (Module 3) may not exist at Shopping MVP (Module 3 is a placeholder). Until it does, Shopping uses `CashFlowForecast` safety signals and caps output at "wait/neutral" for material spends absent any safety input (Clarification Q4); the `SafeToActSignal` consumer is wired behind a feature check.
- **Rewards `OfferCatalog`**: Module 1's `OfferCatalog` (`finos:rewards/OfferCatalog/1.0.0`) is consumed to enrich the coupon surface with card-linked offers; until available, Shopping surfaces retail coupons alone.
- **Pay `CheckoutRecommendation`**: Module 5 (Pay) is not yet specced; the `CheckoutRecommendation` consumer is feature-checked (Clarification Q4-item-4). Until Pay ships, Shopping surfaces the best coupon without the card recommendation.
- **Coupon & price feeds**: Timestamped retail coupon and price-history feeds are available external sources subject to Fresh-or-Flagged, behind `CouponProvider` / `PriceProvider` interfaces; concrete Canadian-coverage vendors and their residency posture are selected in planning (subprocessor register; platform NR-4).
- **Staleness windows**: Canada-oriented defaults (coupons 6 h, prices 24 h, FX 1 h), user-adjustable, finalized in the Module 0 ops/PIA review (research.md §5).
- **Email-inferred enrichment is provenance-tracked**: Watched items/coupons inferred from a connected email carry source provenance so the FR-X-013 purge targets exactly the email-sourced data.
- **Not regulated advice**: Buy/wait and coupon recommendations are informational decision support, not regulated financial advice (surfaced to users; ux-foundations.md §8.5).

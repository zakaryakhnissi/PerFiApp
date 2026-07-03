# Feature Specification: Module 11 — Travel & Trips

**Feature Branch**: `013-module-11-travel`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 11 — Travel & Trips (Priority: P3)"; functional requirements FR-TRV-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Travel & Trips** tab only — the Automatic Itinerary Builder and Travel Stats & Carbon submodules. Module 0 (Spine) and Module 1 (Rewards) are hard dependencies: Travel **consumes** their contracts and does not re-implement aggregation, budgeting, FX-source ownership, the card knowledgebase, or points/transfer intelligence.
>
> **Boundary with Module 1 (Rewards)**: Rewards owns **points/transfer intelligence** — valuations, transfer partners, transfer bonuses, expiration, earn-paths — and the **card knowledgebase** (earn rates, perks, **travel-insurance perks**). Travel does **not** own award-flight/hotel search/booking, points valuation, or card-perk data. Travel **reads** `CardLineup` (for the insurance-gap flag) and `StatusState`, and provides trip budget/spend context **back** to Rewards' status tracking. Travel surfaces *cash* trip costs against budget; it does **not** compute cash-vs-points comparisons (that is a Rewards/Pay concern consuming Rewards' transfer-aware valuation).
>
> **Recommend-only (P3, MVP-scoped — Principle IX)**: Travel builds and reads; the only money-adjacent advice it surfaces is *informational* (over-budget warning, insurance gap). It NEVER books, pays, or moves money (FR-X-003).

## User Scenarios & Testing *(mandatory)*

Travel is a P3 Life-OS expansion. Its payoff: forward a booking confirmation and get a CAD-costed, budget-linked, FX-aware itinerary with an insurance-gap check, plus lifetime travel-spend stats. Every CAD figure is exact and freshness-stamped; nothing is booked or paid.

### User Story 1 - Itinerary built from a forwarded confirmation, costed in CAD against the travel budget (Priority: P3) 🎯 MVP

A user (who has opted into an email source) forwards a flight/hotel/car booking confirmation. Travel parses it into a structured itinerary, converts each foreign cost to CAD via a timestamped FX rate, and links the trip to the spine travel budget so the user sees the trip's CAD cost and remaining travel-budget headroom.

**Why this priority**: It is the first visible payoff of the Travel tab and the module's defining capability (umbrella Independent Test). It delivers standalone value with only Spine + an email source connected, before stats or carbon exist.

**Independent Test**: Forward a booking confirmation and confirm an itinerary is built, each cost shown in CAD via a timestamped FX rate, linked to the travel budget with a remaining-headroom figure, each value carrying a freshness stamp.

**Acceptance Scenarios**:

1. **Given** a forwarded confirmation, **When** parsing runs, **Then** an itinerary (flights/hotels/cars) is built and linked to the travel budget with FX-converted CAD costs, each carrying a `FreshnessStamp`. *(FR-TRV-001)*
2. **Given** a foreign-currency booking and a timestamped FX rate, **When** the CAD cost is computed, **Then** conversion is done in arbitrary precision and rounded half-up to CAD cents exactly once; the displayed figure matches the rounding fixture with no drift. *(FR-TRV-001 / FR-X-002)*
3. **Given** the FX rate used is stale beyond its threshold, **When** the trip cost renders, **Then** the CAD figure is flagged stale (or withheld) rather than shown as fresh, with a "Refresh" affordance. *(FR-X-008)*
4. **Given** `BudgetState` (a primary money input) is stale or missing, **When** the trip-budget view renders, **Then** the headroom figure is **withheld** and the user is asked to refresh — the itinerary's per-item costs may still show with their own freshness, but budget headroom is never guessed. *(FR-X-001 / FR-X-008)*
5. **Given** an fr-CA user, **When** a CAD trip cost is displayed, **Then** it is formatted `1 234,56 $` (comma decimal, space thousands, trailing symbol), not `$1,234.56`. *(FR-X-005)*
6. **Given** a confirmation that parses only partially (e.g. a flight recognized but a hotel line unparseable), **When** the itinerary is built, **Then** the recognized items are shown, the trip is marked **partial**, and the unparsed content is surfaced for manual entry — never silently dropped or guessed. *(Edge case)*

---

### User Story 2 - Insurance-gap flag against card travel perks (Priority: P3)

When an itinerary is built, Travel checks the user's cards (read from Rewards' `CardLineup`) for travel-insurance perks and flags any coverage gap, naming the relevant card perk where one exists.

**Why this priority**: A concrete, money-relevant safety check that builds on US1's itinerary; it is the umbrella's third acceptance scenario. P3 alongside US1 because it depends only on US1 + the consumed `CardLineup`.

**Independent Test**: With a trip built and a `CardLineup` that lacks (or includes) travel insurance, confirm the itinerary shows an insurance-gap flag (or a "covered by {card}" note), and that an indeterminate case is marked "coverage unknown" rather than assumed covered.

**Acceptance Scenarios**:

1. **Given** a trip and a card lineup with no travel-insurance perk covering it, **When** the itinerary is built, **Then** the gap is flagged with the relevant missing coverage types and a pointer to the Rewards perks vault. *(FR-TRV-002)*
2. **Given** a card whose perk covers the trip, **When** the itinerary is built, **Then** the trip shows "covered by {card product name}" (bilingual), citing the perk. *(FR-TRV-002)*
3. **Given** `CardLineup` is unavailable or coverage cannot be determined, **When** the itinerary is built, **Then** insurance status is **"unknown"** (never "covered" by assumption), and the user is prompted to verify. *(Edge case — withhold-and-ask)*
4. **Given** `CardLineup` version skew (breaking change without a Travel migration), **When** the insurance check runs, **Then** the consumer contract test fails in CI and the insurance flag is **disabled** rather than computed on a mismatched schema. *(SC-012)*

---

### User Story 3 - Lifetime travel-spend stats with cost-per-trip/day and optional carbon (Priority: P3)

The user views lifetime travel spend and cost-per-trip / cost-per-day across their trips, with an optional carbon estimate per trip, computed by matching real travel transactions and parsed itinerary costs.

**Why this priority**: Rounds out the tab with a reflective stats view; lowest of the Travel stories because it depends on a populated trip history and the merchant/transaction graph. Carbon is explicitly optional and estimate-only (MVP-lean, Principle IX).

**Independent Test**: With ≥1 trip recorded, open Travel Stats and confirm lifetime spend, cost-per-trip, and (where dates exist) cost-per-day are shown in CAD with freshness; an optional carbon estimate is shown with a coarse-confidence label, never as a precise figure.

**Acceptance Scenarios**:

1. **Given** ≥1 recorded trip, **When** stats are viewed, **Then** lifetime travel spend and cost-per-trip are shown in CAD (exact cents), each with a freshness stamp. *(FR-TRV-002)*
2. **Given** a trip with known start/end dates, **When** cost-per-day is shown, **Then** it equals trip CAD spend ÷ duration days (half-up at the final cent); a trip with unknown dates shows cost-per-trip but **omits** cost-per-day rather than dividing by an unknown duration. *(FR-TRV-002 / Edge case)*
3. **Given** carbon estimation is enabled, **When** a trip's carbon is shown, **Then** it is labelled an estimate with a low/medium confidence flag and a method note — never presented as exact, and never as a monetary value. *(FR-TRV-002)*
4. **Given** trips spanning multiple currencies, **When** lifetime spend is aggregated, **Then** each trip's already-CAD-rounded cents are summed (associative, exact); no cross-currency float arithmetic occurs. *(FR-X-002)*

---

### Edge Cases

- **Empty / no email source**: A user who has not opted into an email source sees the Empty state — an explainer of what the Travel tab does and a "Connect email" / "Add a trip manually" CTA. The tab is usable with reduced automation via manual trip entry (umbrella Email-access assumption). No zero-filled numbers.
- **Empty / no trips yet**: With an email source connected but no parsed confirmations, the Stats view shows the first-run Empty state, not "$0.00 lifetime spend".
- **Partial connectivity / partial parse**: A confirmation that parses only some segments yields a **partial** itinerary; the recognized items are shown, the trip is marked partial (Partial Data Banner), and the unparsed remainder is offered for manual entry — never silently dropped.
- **Stale FX (money input)**: A trip cost whose FX rate is past its staleness threshold is **flagged or withheld** (never shown as fresh). The trip's last-known CAD figure may be shown with a Stale chip + Refresh CTA; it is never recomputed silently on a stale rate.
- **Stale / missing `BudgetState` (primary money input)**: Trip-budget **headroom** is withheld and the user is asked to refresh; per-item itinerary costs (with their own FX freshness) may still render, but the budget comparison is never guessed.
- **Missing `CardLineup` / indeterminate coverage**: Insurance status is **"unknown"**, never "covered" — withhold-and-ask (Principle VI).
- **Conflicting advice with Cash Safety precedence**: If a Travel view ever surfaces a spend-positive suggestion (e.g. "book now to lock this fare within budget") and Cash Safety's `SafeToActSignal` flags overdraft risk, **Cash Safety takes precedence**; the conflict and resolution are surfaced via the Conflict Banner (umbrella precedence rule). Travel itself originates no money movement.
- **Multi-currency**: Every foreign cost is converted to CAD via a timestamped FX rate; a stale rate flags the converted figure. Source-currency exposure is preserved in the `currency_breakdown` so the user sees what was converted.
- **Idempotency / retries**: Re-forwarding the same confirmation (duplicate email, retry) MUST NOT create a duplicate itinerary item; itinerary writes are idempotent, keyed on a `source_event_id` derived from the confirmation's stable identity (e.g. PNR/booking reference + segment). A replayed parse does not double-count spend.
- **Conflicting / duplicate confirmations**: An amended booking (same PNR, changed times/price) **updates** the existing itinerary item rather than appending; the change is recorded in the append-only audit trail.
- **Cross-user boundaries**: In a Household, a request for another member's trips/itineraries without authorization is denied and audited; trip data is `profile_id`-scoped and enforced server-side (see Threat Model).
- **Contract version skew**: A breaking change in a consumed contract (`BudgetState`, `CardLineup`, `TransactionStream`, ...) without a Travel migration disables the dependent Travel feature (contract tests fail in CI) rather than serving on a mismatched schema.
- **Bilingual integrity**: A trip label, insurance flag, or alert missing an EN or FR translation is a defect, not silently shown in one language. (Trip/destination names entered or parsed are displayed verbatim, not translated.)
- **Email-revocation cascade**: On email-access revocation, raw confirmation content and any itinerary data whose **sole** source was the email connection are deleted within the 7-day window, regardless of which store holds it (FR-X-013). A trip also corroborated by matched transactions keeps the transaction-sourced portion; only the email-sourced enrichment is stripped.

## Clarifications

### Session 2026-06-29

Decisions made autonomously to unblock this P3 spec (no interactive session was available; each is recorded here per Principle VI and flagged where it should be confirmed in planning):

- **C1 — FX is an external feed, not a spine contract.** The spine publishes no FX contract (FX is an internal Module 0 feed feeding `TransactionStream.cad_amount`). Travel therefore consumes FX as a freshness-stamped **external feed** behind a shared `FxProvider` interface (the same approach Rewards took, research §3), not as a cross-module contract. **Recommendation/default**: reuse a single shared FX provider with Rewards; whether FX should be promoted to a shared spine-level contract is a cross-module follow-up (non-blocking).
- **C2 — Itinerary idempotency key.** Duplicate/re-forwarded confirmations are de-duplicated on a `source_event_id` derived from the booking's stable identity (booking reference / PNR + segment + date). **Recommendation/default**: PNR+segment where present; fall back to a content hash of (provider, dates, amount) when no booking reference is parseable.
- **C3 — Insurance assessment is a flag, not advice.** Travel reads `CardLineup` travel-insurance perks and flags covered / gap / unknown; it does **not** advise buying insurance or acquiring a card (not regulated advice, Principle "not-an-advisor"). Indeterminate coverage ⇒ **"unknown"**, never assumed covered.
- **C4 — Carbon is optional, estimate-only, non-money.** Carbon is a curated distance/class factor estimate with a low/medium confidence flag; it is never presented as precise and never as a monetary value. MVP ships it behind a toggle (Principle IX — lean scope).
- **C5 — Travel does not compute cash-vs-points trip comparisons.** That requires Rewards' transfer-aware valuation and is a Rewards/Pay concern; Travel surfaces *cash* trip cost vs budget only. Keeps the Rewards/Travel boundary clean.
- **C6 — Manual trip entry is first-class.** Because many users may not connect an email source (umbrella assumption), a manually-entered trip is a first-class, freshness-stamped source (user-entered freshness), not a degraded fallback.
- **C7 — `SafeToActSignal` feature-checked.** Cash Safety (Module 3) may not be shipped at Travel MVP; the overdraft-precedence consumer is wired behind a feature check. Until then, Travel surfaces only informational over-budget warnings from `BudgetState`.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-TRV-*):

- **FR-TRV-001 (Itinerary Builder, FX-aware, budget-linked)**: System MUST build itineraries (flights/hotels/cars) from forwarded/parsed booking confirmations, link each trip to the spine travel budget category, and compute each cost in CAD. Per FR-X-002, FX rates MUST be stored as arbitrary-precision decimals (never binary float); foreign-currency-to-CAD conversion MUST compute in arbitrary precision and round half-up to CAD minor units before storing or displaying; and at least one unit-test fixture **per conversion path** MUST guard against rounding drift. Each cost and the budget headroom carry a `FreshnessStamp`; stale **FX** or **`BudgetState`** (money inputs) MUST flag/withhold the affected figure (never shown as fresh). Re-forwarded/duplicate confirmations MUST be idempotent (keyed on a stable booking identity), and a parse that recognizes only some segments yields a **partial** itinerary with the remainder offered for manual entry.
- **FR-TRV-002 (Travel Stats, insurance gap, optional carbon)**: System MUST show lifetime travel spend and cost-per-trip / cost-per-day in CAD (exact cents), and MUST flag insurance gaps against card travel-insurance perks read from Rewards' `CardLineup` — naming the covering card where present, and marking indeterminate coverage **"unknown"** (never assumed covered). Carbon estimates are **optional**, labelled estimates with a coarse-confidence flag, and never presented as money. Cost-per-day MUST be omitted (not guessed) when a trip's duration is unknown. Lifetime aggregation sums already-CAD-rounded per-trip cents (associative, exact); no cross-currency float arithmetic.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): **FR-X-001** (Integration — trip costs reflect current budget/goals), **FR-X-002** (Money exactness — FX/decimal + integer cents), **FR-X-003** (Recommend, never move — Travel books/pays nothing), **FR-X-004** (CAD + time-to-goal), **FR-X-005** (Bilingual & locale-correct formatting), **FR-X-006** (Explainability — insurance/over-budget flags carry inputs+reasoning), **FR-X-007** (Audit trail — trip create/amend/manual-entry recorded), **FR-X-008** (Freshness — FX/budget stale ⇒ flag/withhold), **FR-X-010** (Least privilege & threat model — touches another person's data in Household + an email source), **FR-X-011** (Contracts & versioning), **FR-X-012** (Graceful degradation — FX/email/spine source failures), **FR-X-013** (Privacy — email-sourced data retention + revocation cascade), **FR-X-014** (Observability/redaction), **FR-X-015** (Performance ≤300 ms), **FR-X-016** (Accessibility), **FR-X-020** (Data residency, incl. email/LLM parsing subprocessor NR-6).

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, not owned here): `BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream` (Module 0); `CardLineup`, `StatusState` (Module 1 Rewards); `SafeToActSignal` (Module 3 Cash Safety, feature-checked). FX is an external freshness-stamped feed (not a contract — C1).

Owned/provided by this module:

- **Trip**: A travel plan (name, destination, dates, source = email-parsed / manual), with a `data_completeness` flag and freshness. Root of the itinerary and stats.
- **ItineraryItem**: A parsed/entered flight, hotel, or car-rental segment with original-currency cost, FX rate used, CAD cost, and provenance. Idempotency-keyed on a stable booking identity (C2).
- **TripBudget**: A trip's CAD cost envelope linked to the spine travel budget category, with per-currency FX breakdown, headroom (withheld on stale/missing `BudgetState`), and an insurance-coverage status. **Provided** to Rewards (status), Bills (trip bills), Workspace.
- **TravelSpend**: Lifetime and per-trip travel-spend stats — cost-per-trip, cost-per-day, optional carbon. **Provided** to Rewards (status), Bills, Workspace.
- **InsuranceCoverage**: A derived covered / gap / unknown assessment of a trip against `CardLineup` travel-insurance perks (FR-TRV-002).
- **CarbonEstimate**: An optional, estimate-only, non-money carbon figure with a coarse-confidence flag and method note.
- **AuditEvent**: Append-only record of trip create / itinerary amend / manual entry (Principle VI / FR-X-007).

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: FX rates stored as **arbitrary-precision decimal** (string-encoded on the wire, `^[0-9]+(\.[0-9]+)?$`); all CAD costs/spend/headroom stored as **integer minor units (cents)**. No binary floating point anywhere in cost, conversion, or aggregation math.
- **Rounding rules**: Foreign→CAD = `foreign_amount × fx_rate` computed in arbitrary precision, then **half-up to the nearest CAD cent** at the storage/display boundary only. Intermediate products are never pre-rounded. Cost-per-trip = `lifetime ÷ trip_count` and cost-per-day = `trip_spend ÷ duration_days`, each computed in arbitrary precision and rounded half-up once; division by an unknown duration is **never** performed (cost-per-day omitted instead). Lifetime spend sums already-rounded per-trip CAD cents (integer addition, associative, exact).
- **Currency & locale**: CAD throughout, with time-to-goal context where a goal applies (FR-X-004); en-CA and fr-CA locale-correct formatting via `@finos/format` (fr-CA `1 234,56 $`). Source currency preserved in `currency_breakdown`.
- **Determinism & fixtures**: Conversion and stats math are pure and deterministic. **Mandatory fixtures**: (1) **per conversion path** a foreign→CAD rounding-drift guard (e.g. `USD 1 234,56 × 1.3725 = CAD 1 694,43` exact, and a second currency path e.g. EUR); (2) a multi-currency lifetime-spend aggregation that sums per-trip CAD cents with no drift; (3) a cost-per-day fixture where duration is unknown ⇒ cost-per-day omitted (not 0, not a divide error).
- **Idempotency**: Itinerary writes (parse/re-forward/amend) are idempotent, keyed on the source event id / stable booking identity (C2); replays never duplicate an item or double-count spend (Principle IV / FR-X-003).
- **Recommend-only**: Confirmed — Travel builds, reads, flags, and warns only; it never books, pays, or moves money (FR-X-003). Carbon is non-money.

### Security & Privacy Threat Model *(MANDATORY — touches another person's data in Household, and an email source)*

- **Assets**: A profile's `Trip`/`ItineraryItem` history (destinations, dates, prices — reveals location patterns, presence-away signals, and spend), `TripBudget`/`TravelSpend`, and the **email-parsing pipeline** (booking confirmations contain PII: traveler names, addresses, partial payment data).
- **Trust boundaries / actors**: The owning user; other Household members (via `MemberScope`); the email source + parsing subprocessor (NR-6); the spine and Rewards (read-only providers); the FX feed.
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across Household members | another member's trips/itineraries | authZ on every cross-profile request keyed on the **server-side session identity**, never a client-supplied `profile_id`; Postgres RLS as defense-in-depth; denied access audited (SC-015) | Yes (UI filtering alone does NOT satisfy) |
  | Raw-email-body exfiltration / over-retention | parsed confirmations (PII) | parse, then retain **only** the derived itinerary + sender identity/classification — never raw bodies (FR-X-013); parsing subprocessor must be Canadian-region or disclosed+agreement-backed (NR-6 / FR-X-020) | Yes |
  | Email-revocation leaving orphaned email-sourced data | itinerary items, enrichments | revocation cascade deletes raw content + sole-source-email data within 7 days, regardless of store (FR-X-013) | Yes |
  | Stale-FX mis-costing presented as fresh | TripBudget CAD figures | FX `FreshnessStamp` + flag/withhold on stale money input (FR-X-008) | Yes |
  | Prompt-injection / malicious confirmation content | parser, itinerary | treat email content as untrusted input; the parser extracts structured fields only and never executes embedded instructions or follows links; out-of-range/garbage values are rejected to manual entry, not stored as cost | Yes |
  | PII / monetary leak in logs | itineraries, costs | structured logs redact PII + monetary values; audit trail separate (FR-X-014) | Yes |

- **AuthZ enforcement**: Every cross-profile read of trip/itinerary/stat data is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. The profile switcher and the "Viewing {Name}'s finances" banner follow ux-foundations §5.5.
- **Aggregation tokens out of scope**: Travel holds no aggregation or email OAuth tokens directly — email/aggregation tokens are owned by the spine / a dedicated secrets store (FR-CORE-007); Travel consumes parsed outputs and spine contracts only.
- **Data minimization, retention & revocation**: Travel stores only the structured itinerary + costs it needs. Email-sourced data obeys the FR-X-013 revocation cascade and the FR-X-019 dormant-account retention bound. No raw confirmation bodies are persisted after parsing.
- **Data residency**: All travel data and the email-parsing subprocessor inherit the Canadian-region residency constraint (FR-X-020 / NR-6); any cross-border processing is disclosed + agreement-backed before go-live (subprocessor register gate).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-T-001 (Itinerary fidelity)**: For a representative set of Canadian-relevant booking confirmations (air/hotel/car, EN/FR), ≥ 95% of recognized bookings produce an itinerary item linked to the travel budget with a CAD cost; unrecognized segments are offered for manual entry, never silently dropped.
- **SC-T-002 (FX exactness)**: 0 cent-level slippage across the money-correctness fixtures; 100% of foreign→CAD conversions use arbitrary precision + integer cents (no float); every conversion path has a guarding fixture (FR-TRV-001 / SC-008-adjacent).
- **SC-T-003 (Freshness safety)**: 0 trip CAD costs or budget-headroom figures served past their staleness threshold without a visible stale flag; stale FX / `BudgetState` money inputs flag/withhold (umbrella SC-006).
- **SC-T-004 (Integration is real)**: 100% of over-budget warnings and insurance-gap flags attach reasoning citing their inputs (budget headroom, the card perk checked); a flag that ignores an available relevant input is a defect (umbrella SC-001 / FR-X-001).
- **SC-T-005 (Insurance-gap correctness)**: 100% of trips with a determinable card travel-insurance perk show the correct covered/gap state with the covering card named; 0 trips with indeterminate coverage are shown as "covered" (always "unknown") (FR-TRV-002).
- **SC-T-006 (Recommend-only / no money moved)**: 0 money-movement endpoints in the Travel API surface; Travel books/pays nothing (umbrella SC-007 / FR-X-003).
- **SC-T-007 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Travel strings; 100% of displayed CAD costs, percentages, and dates use the active locale's conventions (fr-CA `1 234,56 $`) (umbrella SC-008).
- **SC-T-008 (Contract reliability)**: 100% of contracts Travel consumes/provides have passing consumer and provider tests in CI before release; version skew disables the dependent feature (umbrella SC-012).
- **SC-T-009 (Privacy & revocation)**: 0 raw email bodies persisted after parsing; 100% of email-access revocations purge raw content + sole-source-email itinerary data within 7 days regardless of store (umbrella SC-013 / FR-X-013).
- **SC-T-010 (Household safety)**: 0 cross-profile trip/itinerary exposures in API-layer authorization testing; every denied cross-profile access is audited (umbrella SC-015).
- **SC-T-011 (Idempotent ingestion)**: 0 duplicate itinerary items or double-counted spend across re-forwarded/retried confirmations; an amended booking updates in place (FR-X-003).
- **SC-T-012 (Performance)**: 95th-percentile module-switch into Travel renders the cached trip list/stats in ≤ 300 ms; a cache miss / stale value renders a flagged state rather than blocking on a network fetch (umbrella SC-010 / FR-X-015).

## UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

Travel is a tab in the "More" overflow (P3; ux-foundations §5.1). Every data view defines all **six states** (Empty, Loading, Partial, Stale, Error/Degraded, Withheld — §3).

- **Key screens**: (a) **Trip list** (cards per trip with CAD cost + freshness chip); (b) **Itinerary detail** (parsed segments, per-item CAD cost + FX freshness chip, insurance-status banner); (c) **Travel Stats** (lifetime spend, cost-per-trip/day, optional carbon); (d) **Add/connect** flow (email opt-in explainer per §5.4, or manual trip entry).
- **Components reused**:
  - **Recommendation Card** (§4.1) for the **over-budget warning** and **insurance-gap** flag — each with the mandatory **Why layer** listing inputs (trip CAD cost, travel-budget headroom + source/freshness; the card perk checked) and bilingual reasoning. These are informational flags, not money actions, so they need a Why layer but **no Confirm-Action sheet** (Travel executes nothing).
  - **Freshness chip** (§4.3) on every FX-converted CAD cost and every budget-headroom figure — always visible, with the Stale state showing a "Refresh" affordance.
  - **Partial Data Banner** (§3 Partial) when a confirmation parsed only partially or `BudgetState.data_completeness = partial`.
  - **Conflict Banner** (§4.4) **only** if a spend-positive Travel suggestion ever conflicts with Cash Safety's `SafeToActSignal` — Cash Safety takes precedence; the losing Travel suggestion shows "Currently overridden". (Travel originates no money movement, so this is a rare path.)
  - **Withheld Card** (§3 Withheld) when `BudgetState` (money input) is stale/missing — headroom replaced with a "Refresh budget" CTA; never a greyed-out guessed figure.
- **Confirm-Action sheet (§4.2)**: **not used** for money in MVP because Travel performs no money action. The "not regulated financial advice" disclaimer still appears where any flag could be read as advice (insurance gap), per §8.5 (first card a new user sees).
- **Locale/a11y (§7, §8, §10.7)**: all CAD costs/dates/percentages via `@finos/format` (no raw formatting); fr-CA `1 234,56 $`, non-breaking space, typographic apostrophe; bilingual screen-reader labels on every trip cost, freshness chip, and flag; WCAG 2.1 AA contrast/tap-target/reduced-motion. Trip and destination names are displayed verbatim (not translated), but all surrounding labels are bilingual.
- **Notification restraint (§6)**: any Travel alert (e.g. "insurance gap on upcoming trip") is submitted to the Inbox digest pipeline — Travel sends **no** standalone push (§6.3).

## Assumptions

- **Spine + Rewards availability**: Module 0 exposes `BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream`; Module 1 exposes `CardLineup` and `StatusState` — all versioned and freshness-stamped. Travel consumes them and does not re-implement budgeting, the card knowledgebase, or points valuation. Until a contract is available, the dependent Travel feature degrades (e.g. insurance flag shows "unknown" rather than guessing).
- **Email source is opt-in (umbrella Email-access assumption)**: Itinerary auto-build assumes the user connects an email source; the tab is fully usable (with reduced automation) via manual trip entry without it. The parsing subprocessor is a planning decision (NR-6) and must satisfy Canadian residency or be disclosed+agreement-backed.
- **FX feed (C1)**: A timestamped FX-rate feed is available behind a shared `FxProvider` (with Rewards); concrete vendor + staleness window are planning/ops decisions (NR-2, NR-4). The spine has no FX contract.
- **Cash Safety dependency (C7)**: `SafeToActSignal` (Module 3) may not exist at Travel MVP; the overdraft-precedence consumer is feature-checked. Travel surfaces only informational over-budget warnings until it ships.
- **Carbon dataset (C4)**: A curated distance/class carbon-factor table is available; estimates are coarse, confidence-flagged, and non-money.
- **Not regulated advice**: Insurance-gap and over-budget flags are informational decision support, not regulated financial advice (surfaced to users; Travel does not advise acquiring a credit product or insurance policy).
- **Staleness windows (NR-2)**: Canada-oriented FX staleness default (Rewards research §6 suggested FX ≈ 1 h); exact value confirmed in the Module 0 / ops review. Manual-entry trips carry a user-set staleness window.

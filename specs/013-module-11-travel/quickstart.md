# Quickstart & Validation: Module 11 — Travel & Trips

**Feature**: `013-module-11-travel` | **Date**: 2026-06-29

A run/validation guide proving Travel works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria. The stack is inherited from [platform-decisions.md](../_platform/platform-decisions.md); commands below are illustrative — adjust to the ratified toolchain.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `BudgetState` (`finos:spine/BudgetState/1.0.0`), `GoalState`, `MerchantGraph`, `TransactionStream`. Module 1 Rewards clients exposing `CardLineup` (`finos:rewards/CardLineup/1.0.0`) and `StatusState`. `SafeToActSignal` (Module 3) optional — its consumer is **feature-checked**.
- A shared `FxProvider` (foreign→CAD, freshness-stamped) seeded with timestamped rates for ≥2 currency paths (e.g. USD, EUR). FX is an **external feed**, not a spine contract (research §1).
- A `ConfirmationParser` (curated/regex MVP) and seeded sample confirmations (air/hotel/car, EN/FR), including one **partial-parse** sample and one **amended-booking** (same PNR) sample.
- Seeded fixtures: a curated carbon factor table; a `MerchantGraph` travel node; a `BudgetState` travel-category fixture (one fresh, one stale).

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:travel-fixtures      # fx rates (USD/EUR), sample confirmations, merchant node, budget, carbon table
```

## Validation by user story

### US1 — Itinerary built from a forwarded confirmation, costed in CAD against the travel budget (P3) 🎯 MVP

```bash
<pkg> test travel/unit/fx-conversion
<pkg> test travel/unit/idempotency
<pkg> test travel/integration/itinerary-builder
```

Expected:
- A forwarded confirmation produces an itinerary (flights/hotels/cars) linked to the travel budget; each cost shows `cad_cost_cents` via a **timestamped FX rate**, each carrying a `FreshnessStamp` (SC-T-001).
- **Money fixture (mandatory, per conversion path)**: `USD 123456 cents × 1.3725 → CAD 169443 cents` (`$1,694.43`) exact, **and** a second path (e.g. `EUR … × 1.47xx`) — zero cent slippage, computed in arbitrary precision, half-up at the final cent once (SC-T-002 / FR-X-002).
- A **stale FX** rate renders the CAD cost **flagged/withheld** with a "Refresh" affordance, never shown as fresh (SC-T-003 / FR-X-008).
- **Stale/missing `BudgetState`** (primary money input) ⇒ trip-budget **headroom WITHHELD** (Withheld Card + "Refresh budget" CTA); per-item costs may still render with their own FX freshness, but headroom is never guessed (FR-X-001 / FR-X-008).
- **Idempotency (mandatory)**: re-forwarding the same confirmation (same `source_event_id` = PNR+segment+date, content-hash fallback) does **not** create a duplicate item or double-count spend; an **amended** booking (same PNR, changed price/time) **updates in place** + writes an `itinerary_item_amended` audit event (SC-T-011 / FR-X-003).
- **Partial parse**: a confirmation where a hotel line is unparseable yields a **partial** trip (Partial Data Banner); the recognized flight is shown, the unparsed remainder is offered for manual entry — never silently dropped or guessed (Edge case).
- fr-CA locale renders `1 234,56 $` (SC-T-007 / FR-X-005).

### US2 — Insurance-gap flag against card travel perks (P3)

```bash
<pkg> test travel/unit/insurance-gap
<pkg> test travel/integration/insurance-flag
```

Expected:
- A trip + a `CardLineup` lacking travel insurance ⇒ the itinerary shows an **insurance-gap** flag with the missing coverage `gap_types` and a pointer to the Rewards perks vault; the flag carries bilingual `Reasoning` citing the card perk(s) checked (SC-T-004 / SC-T-005 / FR-TRV-002).
- A `CardLineup` whose perk covers the trip ⇒ "covered by {card product name}" (bilingual), citing the perk; `covering_card_id` is set.
- `CardLineup` **unavailable or indeterminate** ⇒ `insurance_status.state = "unknown"`, **never** `covered` by assumption; the user is prompted to verify (withhold-and-ask, SC-T-005).
- `CardLineup` **version skew** (breaking change, no Travel migration) ⇒ the consumer contract test fails in CI and the insurance flag is **disabled**, not computed on a mismatched schema (SC-T-008 / SC-012).

### US3 — Lifetime travel-spend stats with cost-per-trip/day and optional carbon (P3)

```bash
<pkg> test travel/unit/aggregation
<pkg> test travel/unit/cost-per-day
<pkg> test travel/integration/travel-stats
```

Expected:
- With ≥1 recorded trip, Stats shows lifetime spend + cost-per-trip in CAD (exact cents), each with a `FreshnessStamp`; per-trip `cost_source` ∈ {itinerary, matched_transactions, blended} (SC-T-001 / FR-TRV-002).
- **Aggregation fixture (mandatory)**: a **multi-currency** lifetime spend sums each trip's already-CAD-rounded cents (integer addition, associative, exact) — no cross-currency float arithmetic (SC-T-002 / FR-X-002).
- **Cost-per-day fixture (mandatory)**: a trip with known dates shows `cost_per_day = spend ÷ duration_days` (half-up once); a trip with **unknown dates** shows cost-per-trip but **omits** cost-per-day (not `0`, not a divide error) (FR-TRV-002 / Edge case).
- **Carbon (optional)**: when enabled, a trip's carbon shows an estimate with a low/medium `confidence` flag + `method` note — never exact, never a monetary value (FR-TRV-002).
- An empty history shows the first-run **Empty** state, not "$0.00 lifetime spend".

## Contract tests (mandatory — Principle VII / SC-T-008)

```bash
<pkg> test travel/contract/consumed   # BudgetState, GoalState, MerchantGraph, TransactionStream, CardLineup, StatusState, SafeToActSignal
<pkg> test travel/contract/provided   # TripBudget, TravelSpend
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken consumed schema **fails CI** and disables the dependent Travel feature (version-skew behavior). `SafeToActSignal`'s consumer is feature-checked (pinned `finos:cashsafety/SafeToActSignal/1.0.0`) until Cash Safety ships.

## Cross-cutting checks

- **Recommend-only (SC-T-006 / FR-X-003)**: grep the Travel API surface — there is **no** booking, payment, or money-movement endpoint; every action is a build/read or an informational flag.
- **No raw email bodies (SC-T-009 / FR-X-013)**: assert `ItineraryItem.raw_source_retained === false`; after parsing, only the derived itinerary + sender identity/classification is retained.
- **Email-revocation cascade (SC-T-009 / FR-X-013)**: revoking email access purges raw content + any itinerary data whose **sole** source was email within 7 days, regardless of store; a transaction-corroborated trip keeps its transaction-sourced portion.
- **Audit trail (Principle VI / FR-X-007)**: `trip_created` / `itinerary_item_added` / `itinerary_item_amended` / `manual_trip_entered` / `insurance_flag_shown` / `over_budget_warning_shown` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no PII (traveler names, addresses) or monetary values.
- **Cross-profile authZ (SC-T-010 / Principle V)**: API-layer IDOR test proves 0 cross-profile trip/itinerary exposure on session identity (not client `profile_id`); every denied cross-profile access is audited.
- **Prompt-injection resilience (Threat Model)**: a confirmation containing embedded instructions/links is parsed for structured fields only — no instruction is executed, no link followed; out-of-range values are rejected to manual entry, not stored as cost.
- **Performance (SC-T-012 / FR-X-015)**: module-switch into Travel renders the cached trip list/stats in ≤ 300 ms; a cache miss / stale money value renders a flagged/withheld state rather than blocking on a fetch.
- **Accessibility (FR-X-016)**: WCAG 2.1 AA, bilingual screen-reader labels on every trip cost, freshness chip, and flag; all six states defined per data view.

## Done when

All US1–US3 validations pass, the FX per-path + lifetime-aggregation + cost-per-day-omitted fixtures show zero slippage / correct omission, idempotency replays never duplicate, insurance indeterminate is `unknown` (never covered), all consumer+provider contract tests are green, and the cross-cutting checks (recommend-only, no-raw-body, revocation cascade, authZ, redaction, perf, a11y) hold.

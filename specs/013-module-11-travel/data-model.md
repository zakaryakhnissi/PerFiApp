# Phase 1 Data Model: Module 11 — Travel & Trips

**Feature**: `013-module-11-travel` | **Date**: 2026-06-29

Entities the Travel module **owns/provides**. Consumed contracts (`BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream` from Module 0; `CardLineup`, `StatusState` from Module 1; `SafeToActSignal` from Module 3) are owned elsewhere and are referenced, not defined here. FX is an external freshness-stamped feed (not a contract — see [research.md](./research.md) §1).

**Money typing convention** (Principle IV): `*_cents` fields are **integer minor units (CAD cents)**. `fx_rate` / `*_rate` fields are **arbitrary-precision decimal** (string-encoded on the wire to avoid float coercion). No field is a binary float. Foreign amounts are converted to CAD in arbitrary precision and rounded **half-up at the final cent**, exactly once.

**Freshness convention** (Principle VIII): every externally-sourced value (FX rate, parsed cost, matched transaction, budget headroom) carries a `FreshnessStamp` (`finos:common/FreshnessStamp/1.0.0`). A consumer reading `is_stale = true` on a **money** input MUST flag or withhold; a stale FX rate or stale `BudgetState` is never recomputed silently.

---

## Shared value objects (reused from Module 0 — not redefined)

- **`FreshnessStamp`** — `finos:common/FreshnessStamp/1.0.0` (source, observed_at, staleness_threshold_seconds, is_stale).
- **`Reasoning`** — `finos:common/Reasoning/1.0.0` (inputs, rationale_en, rationale_fr) on every flag/warning.
- **`MoneyCents`** — `finos:common/MoneyCents/1.0.0` (amount_cents integer, currency ISO-4217 default CAD).

---

## Owned entities

### Trip
A travel plan and the root of an itinerary + stats.

| Field | Type | Validation |
|-------|------|------------|
| trip_id | string (uuid) | required, unique per profile |
| profile_id | string (uuid) | required — scopes ownership (authZ) |
| name | string | required; displayed verbatim (not translated) |
| destination | string \| null | optional |
| start_date / end_date | date \| null | optional; both null ⇒ duration unknown (cost-per-day omitted) |
| source | enum {email_parsed, manual} | required (C6 — manual is first-class) |
| data_completeness | enum {complete, partial} | `partial` when some segments unparsed/some inputs partial |
| freshness | FreshnessStamp | required |

### ItineraryItem
A parsed/entered flight, hotel, or car-rental segment.

| Field | Type | Validation |
|-------|------|------------|
| item_id | string (uuid) | required |
| trip_id | string (uuid) | required (→ Trip) |
| type | enum {flight, hotel, car} | required |
| source_event_id | string | required — **idempotency key** (PNR/booking ref + segment + date; content-hash fallback) (C2) |
| original_currency | string (ISO-4217) | required |
| original_amount_cents | integer | ≥ 0; integer minor units of the FOREIGN currency |
| fx_rate | decimal (string) | > 0; arbitrary precision; foreign→CAD rate used |
| cad_cost_cents | integer | ≥ 0; = round_half_up(original_amount × fx_rate); ≥ 0 |
| fx_freshness | FreshnessStamp | required; stale ⇒ cad_cost flagged/withheld |
| merchant_ref | MerchantRef \| null | optional (→ `MerchantGraph`) for spend matching |
| raw_source_retained | const false | MUST be false — no raw email body persisted (FR-X-013) |

**Rule (FR-TRV-001)**: `cad_cost_cents` MUST be computed in arbitrary precision then rounded half-up once. A re-forwarded/duplicate confirmation with the same `source_event_id` **updates** the item (amended booking) or is a no-op (exact duplicate) — never appends. Replays never double-count.

### TripBudget *(provided contract — `finos:travel/TripBudget/1.0.0`)*
A trip's CAD cost envelope linked to the spine travel budget category, with FX breakdown, headroom, and insurance status.

| Field | Type | Validation |
|-------|------|------------|
| trip_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| name | string | required |
| budget_category | string | required (canonical spine `BudgetState` category, typically "travel") |
| estimated_total_cad_cents | MoneyCents | = Σ itinerary `cad_cost_cents` (integer addition, exact) |
| budgeted_cad_cents | MoneyCents | optional; allocation from spine travel budget |
| headroom_cad_cents | MoneyCents | budgeted − estimated; **WITHHELD** when `BudgetState` stale/missing (money input) |
| currency_breakdown | list<CurrencyTotal> | per-source-currency {foreign, cad, fx_rate, fx_freshness} |
| insurance_status | InsuranceCoverage | required (see below) |
| data_completeness | enum {complete, partial} | `partial` mirrors Trip/BudgetState partiality |
| freshness | FreshnessStamp | required; stale FX/budget ⇒ consumers flag/withhold |

### TravelSpend *(provided contract — `finos:travel/TravelSpend/1.0.0`)*
Lifetime and per-trip travel-spend stats.

| Field | Type | Validation |
|-------|------|------------|
| profile_id | string (uuid) | required |
| lifetime_spend_cad_cents | MoneyCents | Σ per-trip CAD cents (associative, exact) |
| trip_count | integer | ≥ 0 |
| avg_cost_per_trip_cad_cents | MoneyCents | lifetime ÷ trip_count, half-up; omitted when count = 0 (Empty state) |
| trips | list<TripStat> | per-trip {trip_id, spend_cad_cents, duration_days?, cost_per_day_cad_cents?, cost_source, carbon?} |
| data_completeness | enum {complete, partial} | `partial` on partial picture |
| freshness | FreshnessStamp | required; stale FX ⇒ flag affected figures |

**TripStat rule (FR-TRV-002)**: `cost_per_day_cad_cents` is **omitted** (not 0, not error) when `duration_days` is null/0 — never divide by an unknown duration. `cost_source` ∈ {itinerary, matched_transactions, blended}.

### InsuranceCoverage
A derived assessment of a trip against `CardLineup` travel-insurance perks (FR-TRV-002).

| Field | Type | Validation |
|-------|------|------------|
| state | enum {covered, gap, unknown} | required; **default `unknown`** — never `covered` by assumption |
| covering_card_id | uuid \| null | set iff state = covered (→ Rewards `CardLineup` card_id) |
| gap_types | list<enum> | {trip_cancellation, medical, baggage, rental_collision, flight_delay} when state = gap |
| reasoning | Reasoning | required (bilingual) — cites the card perk(s) checked |

**State rule**: `CardLineup` unavailable or coverage indeterminate ⇒ `unknown` (withhold-and-ask). Version skew on `CardLineup` ⇒ insurance flag **disabled** (contract test fails), not computed on a mismatched schema.

### CarbonEstimate
Optional, estimate-only, **non-money** carbon figure.

| Field | Type | Validation |
|-------|------|------------|
| kg_co2e | decimal (string) | ≥ 0; estimate only |
| confidence | enum {low, medium} | required — never presented as precise |
| method | string | required; method/source id (e.g. "distance_class_factor_v1") |

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {trip_created, itinerary_item_added, itinerary_item_amended, manual_trip_entered, insurance_flag_shown, over_budget_warning_shown} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| source_event_id | string \| null | for idempotent ingestion (UNIQUE with type) |
| occurred_at | timestamp (UTC) | required, immutable |

**Idempotency rule (Principle IV)**: `itinerary_item_added` / `_amended` writes are keyed on `source_event_id`; a replayed event does not double-apply or double-count.

---

## Relationships

- `Trip` 1—* `ItineraryItem`; 1—1 `TripBudget`; 1—0..1 `CarbonEstimate` (via TravelSpend trip stat).
- `TripBudget` 1—1 `InsuranceCoverage`; *—1 spine `BudgetState` category (via `budget_category`).
- `ItineraryItem` *—0..1 `MerchantGraph` node (for transaction matching).
- `TravelSpend` aggregates over all `Trip` of a profile; per-trip stats may draw on matched `TransactionStream` records.
- `InsuranceCoverage` *—* held `Card` (via `CardLineup`, read-only).
- All owned entities are scoped by `profile_id`; every cross-profile read is authZ-checked server-side (threat model).

## State transitions

- **Itinerary ingestion**: `received → parsed(complete) | parsed(partial) → linked-to-budget`. A partial parse stays `partial` until the user manually completes it; unparsed content is offered for manual entry, never stored as a guessed cost.
- **Amended booking**: same `source_event_id`, changed fields ⇒ `ItineraryItem` updated in place + `itinerary_item_amended` audit event (never a duplicate row).
- **FX/budget money input stale**: `TripBudget.headroom` → **WITHHELD** (ask user to refresh); per-item `cad_cost` → flagged stale (last-known shown with Stale chip + Refresh), never silently recomputed.
- **Insurance**: `unassessed(unknown) → assessed(covered | gap)`; reverts to `unknown` if `CardLineup` becomes unavailable.
- **`SafeToActSignal` overdraft risk** (if a spend-positive suggestion exists): Cash Safety **precedence**; conflict + resolution surfaced (Conflict Banner).
- **Email-access revocation**: email-sourced `ItineraryItem`/`Trip` data whose **sole** source was email is deleted within 7 days; a trip also corroborated by matched transactions keeps the transaction-sourced portion (FR-X-013).

## Consumed contracts (referenced, owned elsewhere)

`BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream` (Module 0); `CardLineup`, `StatusState` (Module 1 Rewards); `SafeToActSignal` (Module 3 Cash Safety, feature-checked). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine/Rewards storage. FX is consumed as an external freshness-stamped feed behind `FxProvider` (research §1), not as a contract.

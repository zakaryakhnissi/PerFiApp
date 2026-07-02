# Phase 1 Data Model: Module 1 — Rewards & Loyalty

**Feature**: `002-module-1-rewards` | **Date**: 2026-06-26

Entities the Rewards module **owns/provides**. Consumed spine contracts (`BudgetState`, `CashFlowForecast`, `CreditState`, `MerchantGraph`, `GoalState`, `SafeToActSignal`) are owned by Module 0 / Module 3 and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` fields are **integer minor units (CAD cents)**. `*_rate` fields are **arbitrary-precision decimal** (string-encoded on the wire to avoid float coercion). No field is a binary float.

---

## Shared value objects

### FreshnessStamp
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier |
| observed_at | timestamp (ISO-8601) | when the value was sourced |
| staleness_threshold_seconds | integer | per-value window (research §6) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

**Rule**: Any externally-sourced value carries a `FreshnessStamp`. A consumer that reads `is_stale = true` MUST flag or withhold (FR-X-008).

### Reasoning (Explainability — Principle VI / FR-X-006)
| Field | Type | Notes |
|-------|------|-------|
| inputs | map<string, any> | the input values that produced the result (e.g. earn_rate, budget_headroom_cents, utilization_before/after) |
| rationale_en | string | human-readable "why", English |
| rationale_fr | string | human-readable "why", French (bilingual — Principle II) |

---

## Owned entities

### Card / CardLineup
A user's cards with earn rates, perks, credits, fees, and per-card utilization. **Provided** contract.

| Field | Type | Validation |
|-------|------|------------|
| card_id | string (uuid) | required, unique per user |
| profile_id | string (uuid) | required — scopes ownership (see authZ) |
| issuer | string | required |
| product_name_en / product_name_fr | string | both required (bilingual) |
| earn_rules | list<EarnRule> | ≥ 1; category → rate |
| annual_fee_cents | integer | ≥ 0 |
| credit_limit_cents | integer | ≥ 0 (drives utilization) |
| perks | list<Perk> | may be empty |
| freshness | FreshnessStamp | required |

**EarnRule**: `{ category: string, multiplier_rate: decimal, cap_cents?: integer }`.

### PointsBalance / PointsValuation
A loyalty balance valued in CAD. **Provided** contract. (Extended per FR-REW-007..010.)

| Field | Type | Validation |
|-------|------|------------|
| program | string | required (e.g. "aeroplan") |
| profile_id | string (uuid) | required |
| points | integer | ≥ 0 |
| valuation_source | enum {aggregated, manual, user_override} | required (FR-REW-010) |
| base_rate | decimal (cents-per-point) | > 0; arbitrary precision; feed default or user-override (when `user_override`, validated server-side against sanity bounds — see Rule below) |
| effective_rate | decimal (cents-per-point) | ≥ base_rate; best transfer-aware rate (FR-REW-007) |
| cad_value_cents | integer | = round_half_up(points × effective_rate); ≥ 0 |
| expiry | PointsExpiry | optional; drives expiring-soon flag (FR-REW-009) |
| time_to_goal_contribution | TimeToGoalRef | optional; links to `GoalState` |
| freshness | FreshnessStamp | required; for `manual`, user-entered + user-set window; stale ⇒ value flagged/withheld |

**Rule (FR-REW-010 — override/manual poisoning guard)**: When `valuation_source` is `user_override` (custom `base_rate`) or `manual` (`points`), the supplied value is **validated server-side** against sanity bounds (reject out-of-range/non-sane cents-per-point and balances) before persistence; client-supplied values are never trusted as-is. The `valuation_source` tag is the **user-sourced provenance marker** that flows on the provided contract so downstream consumers (Travel/Pay) know the value is self-reported. Every override and manual entry is audited (FR-X-014). See Security & Privacy Threat Model in spec.md.

**Rule (FR-REW-001/007)**: `cad_value_cents` MUST be computed in arbitrary precision then rounded half-up once. The `effective_rate` applies the best `transfer_ratio × bonus_multiplier` across available routes, multiplied in arbitrary precision, rounded only at the final cent. Fixtures: `500000 × 1.05 cpp = 525000 cents ($5,250.00)`; `100000 pts at 1:1 route + 30% bonus → 130000 partner pts` valued with no drift.

### TransferPartner / TransferRoute
A directed transfer from a currency to a partner program. **Provided** to Travel/Pay.

| Field | Type | Validation |
|-------|------|------------|
| from_currency | string | required |
| to_program | string | required |
| transfer_ratio | decimal | > 0; arbitrary precision (e.g. "1", "1.5") |
| min_transfer | integer | ≥ 0 |
| freshness | FreshnessStamp | required |

### TransferBonus / BuyPointsPromo
Time-bounded bonus on a route, or a buy-points promotion.

| Field | Type | Validation |
|-------|------|------------|
| route_ref | {from_currency, to_program} or program | required |
| bonus_multiplier | decimal | ≥ 1; arbitrary precision (1.30 = +30%) |
| cost_per_point_cents | decimal | optional; for buy-points promos |
| worth_it | bool (derived) | buy-points cost-per-point < user effective valuation |
| window_start / window_end | date | required for bonuses |
| freshness | FreshnessStamp | required; expired/stale ⇒ NOT applied (fall back to base_rate) |

### PointsExpiry
| Field | Type | Validation |
|-------|------|------------|
| policy | enum {known, unknown, non_expiring} | required; default `unknown` (never assume `non_expiring`) |
| expires_on | date | required iff policy = known |
| at_risk_cad_cents | integer | ≥ 0; value expiring within the alert window |

### EarnPath
Informational path to a target redemption using only held cards (FR-REW-011).

| Field | Type | Validation |
|-------|------|------------|
| target_currency | string | required |
| target_points | integer | > 0 |
| steps | list<EarnStep> | each step references a held `card_id` + optional transfer route/bonus |
| informational_only | bool (const true) | MUST be true; never card-acquisition advice |
| reasoning | Reasoning | required (bilingual) |

### BestCardRecommendation
A `Recommendation` naming one card for a merchant/moment. **Provided** contract.

| Field | Type | Validation |
|-------|------|------------|
| recommendation_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| merchant_ref | MerchantRef | required (→ `MerchantGraph`) |
| recommended_card_id | string (uuid) | required; MUST NOT be a >50% hard-avoid card |
| utilization_warning | bool | true iff projected band is 30–50% |
| utilization_source | enum {credit_state, assumed_healthy_default} | `assumed_healthy_default` when CreditState was absent (FR-REW-003; Constitution VI v2.2.0) |
| reasoning | Reasoning | required — MUST cite earn rate **and** budget headroom **and** utilization effect (SC-R-002) |
| safe_to_act_deferred | bool | true iff `SafeToActSignal` overrode a spend-positive pick |
| freshness | FreshnessStamp | required |

**Selection / tiebreak (FR-REW-003)**: among eligible (non-hard-avoid) candidates, pick the **highest absolute CAD reward**, then the lowest utilization impact.

**State / guard transitions**:
- `BudgetState` (money input) stale/missing, or `CreditState` **stale** → **WITHHELD** (ask user; FR-X-001/008), never a guessed money input.
- `CreditState` **entirely absent** → proceed with `utilization_source = assumed_healthy_default` (healthy band), **silently** (Constitution VI v2.2.0 documented-default exception).
- projected utilization > 50% (per-card or aggregate) → candidate **EXCLUDED**, safer card chosen, explanation attached.
- projected utilization 30–50% → candidate allowed with `utilization_warning = true`.
- `SafeToActSignal` overdraft risk present → Cash Safety **precedence**; conflict + resolution surfaced.

### WelcomeBonus / MinSpendProgress
| Field | Type | Validation |
|-------|------|------------|
| bonus_id | string (uuid) | required |
| card_id | string (uuid) | required |
| min_spend_cents | integer | > 0 |
| spent_cents | integer | ≥ 0 |
| deadline | date | required |
| bonus_cad_value_cents | integer | ≥ 0 |
| over_budget_warning | bool | true iff meeting min-spend exceeds healthy budget headroom (FR-REW-004) |

### StatementCredit / Perk
| Field | Type | Validation |
|-------|------|------------|
| perk_id | string (uuid) | required |
| card_id | string (uuid) | required |
| credit_value_cents | integer | ≥ 0 |
| reset_date | date | required |
| usage_state | enum {unused, partial, used} | required |
| chronically_unused | bool (derived) | drives downgrade/cancel flag (FR-REW-005) |

### Offer / OfferCatalog
| Field | Type | Validation |
|-------|------|------------|
| offer_id | string (uuid) | required |
| issuer | string | required |
| merchant_ref | MerchantRef | required (→ `MerchantGraph`) |
| budget_category | string | required (ties to `BudgetState` category) |
| reward_description_en / _fr | string | both required |
| freshness | FreshnessStamp | required; stale ⇒ flag/withhold |
| activation_state | enum {available, activated} | activation record is idempotent (keyed on offer_id+profile_id) |

### StatusState
| Field | Type | Validation |
|-------|------|------------|
| program | string | required |
| profile_id | string (uuid) | required |
| tier | string | required |
| qualifying_progress | decimal (0..1) | optional |
| freshness | FreshnessStamp | required |

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {perk_marked_used, offer_activated, recommendation_shown} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp | required, immutable |

**Idempotency rule (Principle IV)**: `perk_marked_used` and `offer_activated` writes are keyed on the source event id; a replayed event does not double-apply.

---

## Relationships

- `CardLineup` 1—* `Perk`/`StatementCredit`, 1—* `WelcomeBonus`.
- `PointsValuation` *—1 `GoalState` (via `time_to_goal_contribution`); 1—* `TransferRoute` (drives `effective_rate`); 1—0..1 `PointsExpiry`.
- `TransferRoute` 1—* `TransferBonus` (time-bounded).
- `EarnPath` *—* held `Card` (via steps) and *—* `TransferRoute`.
- `BestCardRecommendation` *—1 `MerchantGraph` node; references one `Card`.
- `Offer` *—1 `MerchantGraph` node, *—1 `BudgetState` category.
- All owned entities are scoped by `profile_id`; every cross-profile read is authZ-checked server-side (threat model).

## Consumed contracts (referenced, owned elsewhere)

`BudgetState`, `CashFlowForecast`, `CreditState` (utilization bands), `MerchantGraph`, `GoalState` (Module 0); `SafeToActSignal` (Module 3). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine storage.

# Phase 1 Data Model: Module 6 — Shopping & Deals

**Feature**: `008-module-6-shopping` | **Date**: 2026-06-29

Entities the Shopping module **owns/provides**. Consumed contracts (`BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, `TransactionStream` — Module 0; `SafeToActSignal` — Module 3; `OfferCatalog` — Module 1; `CheckoutRecommendation` — Module 5) are owned elsewhere and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` and `MoneyCents.amount_cents` fields are **integer minor units (CAD cents)**. FX `*_rate` and coupon `discount_fraction` fields are **arbitrary-precision decimal** (string-encoded on the wire, `^[0-9]+(\.[0-9]+)?$`, to avoid float coercion). No field is a binary float. CAD throughout; foreign values FX-convert (arbitrary precision) and round **half-up at the final cent** before storage/display.

**Freshness convention** (Principle VIII): every externally-sourced value carries a `FreshnessStamp` (`finos:common/FreshnessStamp/1.0.0`). Stale **money** inputs (budget, runway, forecast) ⇒ dependent score **withheld**. Stale **price/coupon/FX** ⇒ the affected figure flagged; a drop is not treated as live.

---

## Shared value objects (published by Module 0, reused here)

| Object | `$id` | Use |
|--------|-------|-----|
| `FreshnessStamp` | `finos:common/FreshnessStamp/1.0.0` | freshness on every externally-sourced value |
| `MoneyCents` | `finos:common/MoneyCents/1.0.0` | every CAD money field (integer cents) |
| `Reasoning` | `finos:common/Reasoning/1.0.0` | inputs + bilingual rationale on every recommendation |

---

## Owned entities

### WatchedItem / WatchedItems
A user-watched product with a price baseline and optional budget/goal linkage. **Provided** contract (`finos:shopping/WatchedItems/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| watch_id | string (uuid) | required, unique per profile |
| profile_id | string (uuid) | required — scopes ownership (authZ) |
| merchant_ref | MerchantRef | required (→ `MerchantGraph`) |
| product_label_en / product_label_fr | string\|null | bilingual; a single-language label is a defect |
| current_price | MoneyCents | required; latest tracked price (FX-converted to CAD before store) |
| baseline_price | MoneyCents | required; rolling median/trough over the window (Clarification Q2), not a single snapshot |
| drop_threshold_cents | integer\|null | null ⇒ default % below baseline |
| iso_currency | string (ISO-4217) | default CAD |
| fx_rate | decimal string\|null | required iff iso_currency ≠ CAD; stale ⇒ converted figure flagged |
| linked_budget_category | string\|null | canonical `BudgetState` category |
| linked_goal_id | string (uuid)\|null | optional `GoalState` link; null ⇒ time-to-goal line omitted |
| source | enum {price_feed, user, email_inferred} | provenance |
| email_sourced | boolean | true ⇒ FR-X-013 purge on email revocation |
| freshness | FreshnessStamp | required; stale ⇒ price flagged, not alerted as a live drop |

### CouponOffer (internal candidate)
A candidate retail coupon evaluated during best-code selection. Not a provided contract; the **chosen** code is surfaced as a `CouponRecommendation`.

| Field | Type | Validation |
|-------|------|------------|
| coupon_id | string (uuid) | required |
| merchant_ref | MerchantRef | required (→ `MerchantGraph`) |
| code | string | required |
| discount_fraction | decimal string\|null | % coupons; null for fixed-amount |
| fixed_amount | MoneyCents\|null | fixed-amount coupons |
| minimum_spend | MoneyCents | required for validity |
| expires_on | date | required; expired ⇒ invalid candidate |
| stackable | boolean | true only if terms permit |
| freshness | FreshnessStamp | required; stale ⇒ excluded as not-live |

### CouponRecommendation
The single best valid coupon for a checkout. **Provided** contract (`finos:shopping/CouponRecommendation/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| recommendation_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| merchant_ref | MerchantRef | required |
| code | string | required; FinOS never submits it |
| expected_saving | MoneyCents | = best valid coupon's CAD saving (half-up at final cent) |
| discount_fraction | decimal string\|null | arbitrary precision; never float |
| terms | {expires_on, minimum_spend, stackable} | expiry + min-spend are part of validity |
| reasoning | Reasoning | required — why this code beat the runners-up (bilingual) |
| freshness | FreshnessStamp | required; stale ⇒ flagged/withheld |

**Selection (FR-SHOP-001 / Clarification Q1)**: among **valid** candidates (not expired, cart ≥ minimum_spend, eligible), pick the **highest expected CAD saving**; propose a stack only when each coupon's `stackable` terms permit.

### PurchasePlan / BuyWaitScore
A buy-now-vs-wait decision. **Provided** contract (`finos:shopping/PurchasePlan/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| plan_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| merchant_ref | MerchantRef | required |
| watch_id | string (uuid)\|null | optional link to a `WatchedItem` |
| decision | enum {buy_now, wait, neutral} | `buy_now` forbidden under safety risk or absent safety input for a material spend |
| score | number [0,1] | derived confidence; not a money value |
| recommended_best_date | date\|null | null when no better date predictable |
| projected_saving_by_waiting | MoneyCents | ≥ 0; 0 when waiting yields no saving |
| goal_impact | {goal_id, days_delta}\|null | null ⇒ no linked goal (line omitted) |
| safety_signal_source | enum {safe_to_act_signal, cash_flow_forecast, unavailable} | provenance of the safety input (Clarification Q4) |
| safe_to_act_deferred | boolean | true iff Cash Safety overrode a would-be buy_now |
| reasoning | Reasoning | required — MUST cite price trend **and** budget headroom **and** runway/safety |
| freshness | FreshnessStamp | required |

**State / guard transitions (FR-SHOP-003)**:
- `BudgetState`/`CashFlowForecast`/`GoalState` (money inputs) stale or missing → **WITHHELD** (ask user; never guessed).
- `BudgetState` headroom ≤ 0 in the item's category → **decision = wait**, reason cites budget/goal state.
- `SafeToActSignal` flags overdraft risk → Cash Safety **precedence**; `decision = wait`, `safe_to_act_deferred = true`, Conflict Banner shown.
- `SafeToActSignal` absent → fall back to `CashFlowForecast.shortfall_flag`/`runway_days` (`safety_signal_source = cash_flow_forecast`).
- both safety inputs absent → `safety_signal_source = unavailable`, output **capped at wait/neutral** for material spends; never a confident `buy_now` without a safety input (Clarification Q4).

### RealizedSavings
Append-only actual-saving records. **Provided** contract (`finos:shopping/RealizedSavings/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| saving_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| source_event_id | string | required, **UNIQUE** (idempotency key) |
| merchant_ref | MerchantRef | required |
| budget_category | string | required (`BudgetState` category) |
| coupon_recommendation_id | string (uuid)\|null | the coupon whose use produced it |
| expected_saving | MoneyCents | reference only |
| actual_saving | MoneyCents | authoritative — the posted figure |
| diverged | boolean | true iff actual ≠ expected (actual is recorded) |
| recorded_at | timestamp | required, immutable (append-only) |
| freshness | FreshnessStamp | freshness of the `TransactionStream` source |

**Idempotency rule (Principle IV)**: writes key on `source_event_id`; a replayed purchase-posted event records **at most once**.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {recommendation_shown, coupon_use_acknowledged, realized_savings_recorded, watch_created, watch_removed, cross_member_access_denied} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp | required, immutable |

**Idempotency**: `coupon_use_acknowledged`, `realized_savings_recorded`, and `watch_created/removed` are keyed on the source event id; a replay does not double-apply or duplicate an audit event.

---

## Relationships

- `WatchedItem` *—1 `MerchantGraph` node; *—0..1 `BudgetState` category; *—0..1 `GoalState` goal.
- `PurchasePlan` *—1 `MerchantGraph` node; *—0..1 `WatchedItem` (via `watch_id`); reads `BudgetState`/`CashFlowForecast`/`GoalState`/`SafeToActSignal`.
- `CouponRecommendation` *—1 `MerchantGraph` node; selected from many `CouponOffer` candidates; may be enriched by Rewards `OfferCatalog`.
- `RealizedSavings` *—1 `MerchantGraph` node, *—1 `BudgetState` category, *—0..1 `CouponRecommendation`; derived from a `TransactionStream` purchase-posted event.
- All owned entities are scoped by `profile_id`; every cross-member read is authZ-checked server-side (threat model).

## Consumed contracts (referenced, owned elsewhere)

`BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, `TransactionStream` (Module 0); `SafeToActSignal` (Module 3, not yet published — feature-checked); `OfferCatalog` (Module 1); `CheckoutRecommendation` (Module 5, not yet published — feature-checked). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct storage.

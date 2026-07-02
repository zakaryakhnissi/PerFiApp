# Phase 1 Data Model: Module 2 — Credit & Coaching

**Feature**: `004-module-2-credit` | **Date**: 2026-06-29

Entities the Credit module **owns/provides**. Consumed contracts (`CreditState`, `AccountState`, `CashFlowForecast`, `GoalState` from Module 0; `CardLineup` from Module 1; `SafeToActSignal` from Module 3) are owned elsewhere and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` / `MoneyCents.amount_cents` fields are **integer minor units (CAD cents)**. `utilization`, `*_apr`, `*_rate` fields are **arbitrary-precision decimal**, string-encoded on the wire (`^[0-9]+(\.[0-9]+)?$`) to defeat JSON float coercion. No field is a binary float. Compute in full precision; **round half-up to cents exactly once** at the storage/display boundary (`@finos/money`, platform-decisions §4).

**Freshness convention** (Principle VIII): every externally-sourced value carries a `FreshnessStamp` (`finos:common/FreshnessStamp/1.0.0`). A consumer reading `is_stale = true` on a **money** input MUST withhold; a stale bureau **score** is flagged. The documented-default exception does **not** apply to coaching/refinance money figures (spec Clarification C4).

---

## Shared value objects (reused from Module 0 `finos:common/*`)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
`{ source, observed_at (UTC), staleness_threshold_seconds, is_stale (derived), next_refresh_at? }`. Reused, not redefined.

### Reasoning — `finos:common/Reasoning/1.0.0`
`{ inputs (map), rationale_en, rationale_fr }`. Carries the inputs + bilingual "why" on every coaching plan and refinance signal (Constitution VI). Redacted from debug logs; recorded in full only in the audit trail.

### MoneyCents — `finos:common/MoneyCents/1.0.0`
`{ amount_cents (integer, signed), currency (default CAD) }`. Non-CAD amounts are FX-converted to CAD (arbitrary precision, half-up at the final cent) before display.

---

## Owned entities

### CreditFactors  → provided `finos:credit/CreditFactors/1.0.0`
The Credit Monitor read-model: bureau score + ranked factors. **Bureau-sourced narrative; distinct from spine `CreditState`** (spec Clarification C1).

| Field | Type | Validation |
|-------|------|------------|
| profile_id | string (uuid) | required — scopes ownership (authZ server-side) |
| household_id | string (uuid) \| null | optional; cross-member visibility gated by `MemberScope` |
| score | integer \| null | 300–900; null ⇒ Empty/Connect state (never zero-filled) |
| score_band | enum {poor, fair, good, very_good, excellent} \| null | derived from score; null when score null |
| score_source | string \| null | bureau identifier; never a raw token |
| score_delta_since_last | integer \| null | signed; informational |
| top_factors | list<CreditFactor> | may be empty (no report) |
| freshness | FreshnessStamp | required; stale ⇒ score flagged, coaching withheld |

**CreditFactor**: `{ factor_code: enum{utilization, payment_history, credit_age, credit_mix, new_inquiries, derogatory_marks, total_accounts, other}, impact: enum{positive, neutral, negative}, weight_rank?: integer≥1|null, label_en, label_fr }`. `factor_code='utilization'` is the **narrative** factor only; the authoritative figure/band is `CreditState` (C1).

### CreditCoachingPlan  → provided `finos:credit/CreditCoachingPlan/1.0.0`
A recommend-only due-date/utilization plan. **Provided** to Credit UI, Cash Safety, Pay, Bills, Household.

| Field | Type | Validation |
|-------|------|------------|
| plan_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| status | enum {active, withheld, satisfied} | required |
| withheld_reason | enum {stale_balance, missing_balance, stale_credit_state, missing_credit_state, stale_cashflow, conflicting_safe_to_act} \| null | required iff status=withheld |
| target_band | enum {healthy, optimal} | default `healthy`; `optimal` only when goal=credit-boosting |
| actions | list<CoachingAction> | empty when withheld/satisfied |
| safe_to_act_deferred | bool | true iff Cash Safety overrode (precedence) |
| reasoning | Reasoning | required (bilingual; cites balance, limit, utilization-before/after, statement date) |
| freshness | FreshnessStamp | required; oldest input governs; stale ⇒ status=withheld |

**CoachingAction**: `{ action_type: enum{pay_early, reroute_spend, request_limit_increase_consideration}, account_id (uuid → AccountState), recommended_payment?: MoneyCents (pay_early only; integer cents; never on stale input), utilization_before: decimal-string, utilization_after: decimal-string, statement_due_on?: date, time_to_goal_contribution?: string|null, label_en, label_fr }`.

### CreditBuilderPlaybook  → provided `finos:credit/CreditBuilderPlaybook/1.0.0`
An ordered, Canada-specific, bilingual builder playbook. **Provided** to Credit UI, Household.

| Field | Type | Validation |
|-------|------|------------|
| playbook_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| credit_stage | enum {building, establishing, optimizing, recovering, unknown} | default `unknown` |
| steps | list<PlaybookStep> | may be empty (no bureau data) |
| freshness | FreshnessStamp | required |

**PlaybookStep**: `{ step_code: enum{lower_utilization, keep_oldest_open, on_time_payment_streak, limit_hard_inquiries, diversify_credit_mix, consider_secured_card, consider_credit_builder_loan, dispute_report_error, age_accounts}, informational_only: const true, priority_rank: integer≥1, estimated_score_impact?: enum{high,medium,low}|null, depends_on_money_input: bool (default false), title_en, title_fr, detail_en, detail_fr }`.

### RefinanceSignals  → provided `finos:credit/RefinanceSignals/1.0.0`
Per-candidate keep/downgrade/cancel/refinance trade-offs (rewards AND score). **Provided** to Rewards, Cash Safety, Pay, Bills, Household.

| Field | Type | Validation |
|-------|------|------------|
| profile_id | string (uuid) | required |
| signals | list<RefinanceSignal> | may be empty |
| freshness | FreshnessStamp | required; oldest input governs |

**RefinanceSignal**: `{ signal_id (uuid), subject_account_id (uuid → AccountState/CardLineup), decision: enum{keep,downgrade,cancel,refinance}, status: enum{available,withheld}, withheld_reason?: enum{stale_rewards_value, missing_card_lineup, stale_credit_state, missing_credit_state, stale_balance}|null, annual_fee_delta?: MoneyCents, annual_rewards_value_delta?: MoneyCents (from CardLineup; half-up at cent), net_annual_value_delta?: MoneyCents, estimated_credit_score_impact?: enum{improves,neutral,minor_decline,notable_decline}|null, utilization_impact?: decimal-string|null, refinance_rate_apr?: decimal-string|null, reasoning: Reasoning }`.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {recommendation_shown, plan_acknowledged, refinance_signal_dismissed, playbook_step_done, cross_member_access_denied} | |
| source_event_id | string (uuid) | `UNIQUE` — idempotency key; replays never double-apply |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp (UTC) | required, immutable |

**Idempotency rule (Principle IV)**: `plan_acknowledged`, `refinance_signal_dismissed`, and `playbook_step_done` writes are keyed on `source_event_id`; a replayed event does not double-apply. **Audit rule (SC-015)**: every denied cross-member access writes a `cross_member_access_denied` event.

---

## State transitions

**CreditCoachingPlan**:
- `AccountState` balance/limit (money input) **stale/missing**, or `CreditState` utilization **stale/missing** → **`withheld`** (named reason; ask user) — the early-payment amount is **never** guessed; the documented-default exception does NOT apply (spec C4).
- `CashFlowForecast` shows the early payment would create a shortfall, OR `SafeToActSignal` flags overdraft risk → Cash Safety **precedence**: `safe_to_act_deferred=true`, conflict + resolution surfaced (Conflict Banner).
- utilization already within target band → **`satisfied`** (no action asserted).
- otherwise → **`active`** with one or more `pay_early` / `reroute_spend` actions; `pay_early.recommended_payment` brings `utilization_after` below the target band threshold.

**RefinanceSignal**:
- `CardLineup` (rewards value) or `AccountState` (balance/fee) money input **stale/missing**, or contract version-skewed → signal **`withheld`** (named reason); rewards side never fabricated.
- otherwise → **`available`** with `net_annual_value_delta` (money) **and** `estimated_credit_score_impact` (qualitative) — both sides always present (SC-C-004).

**CreditFactors**:
- bureau feed absent → score `null`, Empty/Connect state.
- bureau feed stale → last-known score + Stale chip; dependent coaching narrative flagged.
- bureau feed fresh → score + band + ranked factors shown.

---

## Relationships

- `CreditFactors` 1—1 `profile_id`; `top_factors` cross-reference `CreditState` utilization for the authoritative figure (narrative only here).
- `CreditCoachingPlan` 1—* `CoachingAction`; each action references one spine `account_id` (`AccountState`) and reasons against `CreditState` utilization/bands.
- `RefinanceSignal` *—1 `subject_account_id` (cross-referenced to Rewards `CardLineup` for fee/value and to `CreditState` for utilization/age effects).
- `CreditBuilderPlaybook` 1—* `PlaybookStep`; tailored from `CreditFactors` + `credit_stage`.
- All owned entities are scoped by `profile_id`; every cross-member read is authZ-checked server-side and denied accesses are audited (threat model).

## Consumed contracts (referenced, owned elsewhere)

| Contract | $id | Owner |
|----------|-----|-------|
| `CreditState` | `finos:spine/CreditState/1.0.0` | Module 0 |
| `AccountState` | `finos:spine/AccountState/1.0.0` | Module 0 |
| `CashFlowForecast` | `finos:spine/CashFlowForecast/1.0.0` | Module 0 |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 |
| `CardLineup` | `finos:rewards/CardLineup/1.0.0` | Module 1 (Rewards) |
| `SafeToActSignal` | `finos:cashsafety/SafeToActSignal/1.0.0` (when shipped) | Module 3 (Cash Safety) |

Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine/Rewards storage.

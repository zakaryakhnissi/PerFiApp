# Phase 1 Data Model: Module 5 — Pay & Payment Optimization

**Feature**: `007-module-5-pay` | **Date**: 2026-06-29

Entities the Pay module **owns/provides**. Consumed contracts (`BestCardRecommendation`, `CardLineup`, `PointsValuation` from Rewards; `CreditState`, `CashFlowForecast`, `BudgetState`, `GoalState`, `AccountState`, `MerchantGraph` from Module 0; `SafeToActSignal` from Cash Safety; `BillCalendar` from Bills) are owned elsewhere and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` fields are **integer minor units (CAD cents)**. Rate fields (FX, earn multiplier) consumed from providers are **arbitrary-precision decimal** (string-encoded on the wire). No field is a binary float. Reward CAD figures arrive already-valued from Rewards; Pay re-derives no points valuation.

**Freshness convention** (Principle VIII): every entity computed from an externally-sourced money input carries a `FreshnessStamp`; a stale **primary money input** (runway, budget, reward value) WITHHOLDS the dependent artifact rather than emitting it stale. The single permitted documented default is the utilization guardrail when `CreditState` is entirely absent (Constitution VI v2.2.0).

---

## Shared value objects (published by Module 0, reused here)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier (e.g. `cash_flow_forecast`, `credit_state`, `fx_feed`, `derived`) |
| observed_at | timestamp (ISO-8601, UTC) | when the underlying value was sourced |
| staleness_threshold_seconds | integer | per-value window (spine defaults, NR-2) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

### Reasoning — `finos:common/Reasoning/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| inputs | map<string, any> | reward value, runway impact, utilization before/after — the values that produced the result; redacted from debug logs, full only in the audit trail |
| rationale_en | string | human-readable "why", English |
| rationale_fr | string | human-readable "why", French (bilingual — Principle II) |

### MoneyCents — `finos:common/MoneyCents/1.0.0`
Integer minor units + ISO-4217 currency (CAD default). Foreign amounts FX-converted to CAD (arbitrary precision, half-up at the final cent) before display.

---

## Owned entities

### CheckoutRecommendation
A single safe-to-pay recommendation for a checkout moment. **Provided** contract (`finos:pay/CheckoutRecommendation/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| recommendation_id | string (uuid) | required |
| profile_id | string (uuid) | required — scopes ownership (server-side authZ) |
| merchant_ref | MerchantRef | required (→ `MerchantGraph`) |
| checkout_amount | MoneyCents | required; foreign ⇒ FX-converted to CAD before reasoning |
| recommended_method | `{ method_type: card\|account, method_id: uuid }` | required; exactly one; MUST NOT be a > 50% hard-avoid card nor a runway-breaching method |
| net_reward_value | MoneyCents | optional; reward consumed from Rewards minus known FX/fee cost, summed in integer cents |
| reward_foregone | MoneyCents | present **iff** the reward-optimal method was overridden for safety (trade-off display) |
| utilization_warning | bool | true iff projected band is 30–50%; always false for an account |
| utilization_source | enum {credit_state, assumed_healthy_default} | `assumed_healthy_default` only when `CreditState` entirely absent (Constitution VI v2.2.0) |
| runway_safe | bool | true iff checkout amount keeps `projected_lowest_balance` ≥ safety buffer (no new `shortfall_flag`) |
| safe_to_act_deferred | bool | true iff `SafeToActSignal` overrode a spend-positive pick |
| trade_off_en / trade_off_fr | string\|null | bilingual trade-off note when overridden; both or neither |
| reasoning | Reasoning | required — MUST cite reward value **and** runway impact **and** utilization effect (SC-P-002) |
| freshness | FreshnessStamp | required; stale **primary money** input ⇒ WITHHELD, never emitted stale |

**Selection / tiebreak (FR-PAY-001, Clarifications)**: among methods that are all safe (no runway breach, ≤ warn band), pick the **highest net CAD reward**; on a near-tie within `reward_tie_threshold_cents` (default 25¢) prefer the lower-utilization / higher-liquidity method (secondary guardrail, not a money-originating input).

### PaymentSchedule / ScheduledPayment
An ordered, dated set of proposed payment steps. **Provided** contract (`finos:pay/PaymentSchedule/1.0.0`). **No money is moved** — proposals/records only.

| Field | Type | Validation |
|-------|------|------------|
| schedule_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| source_event_id | string (uuid) | required — idempotency key (UNIQUE); replay never double-records |
| period_start / period_end | date | required |
| feasibility | enum {feasible, infeasible} | required; infeasible populates `shortfall` + `deferral_recommendations` |
| projected_lowest_balance | MoneyCents | optional; for feasible, ≥ safety buffer |
| shortfall | `{ shortfall_on: date, shortfall_amount: MoneyCents }` \| null | present iff infeasible |
| goal_progress_delta | MoneyCents | CAD advanced vs. naive due-date order, summed in integer cents |
| steps | list<ScheduledPayment> | ordered by `sequence_index` |
| deferral_recommendations | list<DeferralRec> | present iff infeasible; obligations ranked by criticality |
| reasoning | Reasoning | required (bilingual) |
| freshness | FreshnessStamp | required; stale runway/budget ⇒ WITHHELD |

**ScheduledPayment (step)**:
| Field | Type | Validation |
|-------|------|------------|
| step_id | string (uuid) | required |
| sequence_index | integer | ≥ 0; significant ordering |
| obligation_ref | `{ obligation_id, kind: bill\|recurring\|card_statement\|goal_contribution\|user_entered, source: bill_calendar\|user_entered }` | required |
| source_account_id | string (uuid) | required (→ `AccountState`); funds proposed only — user executes |
| amount | MoneyCents | required, integer cents |
| scheduled_date | date | required (UTC date; rendered to locale at edge) |
| projected_balance_after | MoneyCents | optional; for feasible, ≥ safety buffer |
| goal_progress_contribution | MoneyCents | CAD advanced toward a goal; zero for non-goal steps |
| goal_ref | uuid\|null | → `GoalState` goal_id; null when not goal-affecting |
| status | enum {proposed, accepted, needs_resequence} | `accepted` recorded idempotently; `needs_resequence` when a refresh made it overdraft-risky |

**DeferralRec**: `{ obligation_id, recommended_action: defer\|renegotiate\|split, rationale_en, rationale_fr }` — renegotiation handed to Bills; Pay only recommends.

### PaymentMethod (internal projection — not separately published)
The eligible methods Pay reasons over for a checkout. Derived from `CardLineup` + `AccountState`; surfaced inside reasoning, never published as its own contract.

| Field | Type | Notes |
|-------|------|-------|
| method_type | enum {card, account} | |
| method_id | string (uuid) | → `CardLineup` card_id or `AccountState` account_id |
| reward_potential_cents | integer | consumed from Rewards; reward value if used here |
| projected_utilization | decimal (string) | for cards: per-card + aggregate effect from `CreditState` (read, not recomputed) |
| projected_band | enum {optimal, healthy, warn, hard_avoid} | from `CreditState` bands; hard_avoid ⇒ excluded |
| runway_safe | bool | applying the spend keeps `projected_lowest_balance` ≥ buffer |
| liquidity_cents | integer | for accounts: available balance from `AccountState` |

### SequencerResult (internal — published portion is PaymentSchedule)
| Field | Type | Notes |
|-------|------|-------|
| feasibility | enum {feasible, infeasible} | feasible ⇒ overdraft-free ordering exists |
| ordering | list<step_id> | the chosen order |
| projected_lowest_balance | integer (cents) | ≥ buffer iff feasible |
| shortfall_on / shortfall_amount | date / integer | populated iff infeasible |
| goal_progress_delta_cents | integer | vs. naive due-date order |

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {recommendation_shown, sequence_proposed, sequence_accepted, schedule_published, cross_profile_denied} | |
| source_event_id | string (uuid) | idempotency key for accept/publish events |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp | required, immutable |

**Idempotency rule (Principle IV)**: `sequence_accepted` and `schedule_published` writes are keyed on `source_event_id`; a replayed event does not double-apply. `cross_profile_denied` is written on every denied cross-profile request (SC-P-011).

---

## State transitions

### CheckoutRecommendation (guard transitions)
- `CashFlowForecast`/`RunwayForecast` or `BudgetState` (primary **money** inputs) stale/missing, or stale reward value, or `CreditState` **stale** → **WITHHELD** (ask user; FR-X-008), never a guessed money input.
- `CreditState` **entirely absent** → proceed with `utilization_source = assumed_healthy_default` for the utilization guardrail, **silently** (Constitution VI v2.2.0 documented-default exception).
- candidate projected utilization > 50% (per-card or aggregate) → **EXCLUDED**; safer method chosen, trade-off attached.
- candidate projected utilization 30–50% → allowed with `utilization_warning = true`.
- reward-optimal method would breach runway (new `shortfall_flag`) → **EXCLUDED**; safer account chosen, `reward_foregone` populated, trade-off shown.
- `SafeToActSignal` overdraft risk present → Cash Safety **precedence**; `safe_to_act_deferred = true`; Conflict Banner surfaced.
- near-tie within `reward_tie_threshold_cents` → prefer lower-utilization / higher-liquidity method.

### PaymentSchedule (lifecycle)
- sequencer run on fresh inputs → `feasibility = feasible` with an overdraft-free ordering, **or** `feasibility = infeasible` with `shortfall` + `deferral_recommendations` (never an overdrafting plan presented as feasible).
- stale runway/budget inputs → sequence **WITHHELD**.
- user accepts via Confirm-Action sheet → each step `status: proposed → accepted`, recorded idempotently on `source_event_id`; `schedule_published` audit event; `PaymentSchedule` published to Bills (no money moved).
- duplicate acceptance (same `source_event_id`) → deduplicated; no double-record, no second audit entry.
- later spine refresh makes an accepted step overdraft-risky → that step `status → needs_resequence`; flagged for re-sequencing, never silently left to drift, never auto-executed.

---

## Relationships

- `CheckoutRecommendation` *—1 `MerchantGraph` node; references one method from `CardLineup` (card) **or** `AccountState` (account); consumes one `BestCardRecommendation` candidate, `CreditState` bands, `CashFlowForecast` runway, `BudgetState` headroom.
- `PaymentSchedule` 1—* `ScheduledPayment`; each step *—1 `AccountState` account, *—0..1 `GoalState` goal, *—1 obligation (from `BillCalendar` or user-entered).
- `PaymentSchedule` *—1 `CashFlowForecast` (feasibility basis), *—1 `GoalState` (goal-progress objective).
- All owned entities are scoped by `profile_id`; every cross-profile read/accept is authZ-checked server-side on session identity (threat model).

## Consumed contracts (referenced, owned elsewhere)

`BestCardRecommendation`, `CardLineup`, `PointsValuation` (Rewards); `CreditState`, `CashFlowForecast`, `BudgetState`, `GoalState`, `AccountState`, `MerchantGraph` (Module 0); `SafeToActSignal` (Cash Safety); `BillCalendar` (Bills). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine/module storage.

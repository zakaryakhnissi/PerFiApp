# Phase 1 Data Model: Module 4 — Bills & Subscriptions

**Feature**: `006-module-4-bills` | **Date**: 2026-06-29

Entities the Bills module **owns/provides**. Consumed spine/Cash-Safety contracts (`TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `GoalState`, `SafeToActSignal`) are owned by Module 0 / Module 3 and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` / `MoneyCents` fields are **integer minor units (CAD cents)**. Any rate/fraction (e.g. a negotiation reduction percentage) is an **arbitrary-precision decimal** (string-encoded on the wire, `^[0-9]+(\.[0-9]+)?$`). No field is a binary float. Foreign-currency subscriptions reuse the spine's already-FX-converted `cad_amount` — Bills performs no FX of its own.

**Freshness convention** (Principle VIII): every externally-derived value carries a `FreshnessStamp`. A money input read `is_stale = true` ⇒ **withhold** (the safe-to-pay date is the canonical case); a secondary figure read stale ⇒ **flag**.

---

## Shared value objects (consumed from Module 0)

- **`FreshnessStamp`** — `finos:common/FreshnessStamp/1.0.0` (`source`, `observed_at`, `staleness_threshold_seconds`, `is_stale`, optional `next_refresh_at`).
- **`MoneyCents`** — `finos:common/MoneyCents/1.0.0` (`amount_cents` integer, `currency` ISO-4217, default CAD).
- **`Reasoning`** — `finos:common/Reasoning/1.0.0` (`inputs`, `rationale_en`, `rationale_fr`) for every recommendation/Confirm-Action.

---

## Owned entities

### RecurringSeries  → provided in `SubscriptionInventory`
A detected recurring charge grouped from `TransactionStream`. **Provided** contract (`finos:bills/SubscriptionInventory/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| series_id | string (uuid) | required, unique per profile |
| profile_id | string (uuid) | required — scopes ownership (authZ) |
| merchant_ref | { merchant_id } | required → `MerchantGraph` node |
| display_name_en / display_name_fr | string | both required when surfaced (bilingual) |
| budget_category | string | optional → `BudgetState` category key |
| cadence | enum {weekly, biweekly, monthly, quarterly, semiannual, annual, irregular, unknown} | required |
| recurring_amount | MoneyCents | required; integer CAD cents (FX-converted upstream) |
| amount_is_estimated | bool | default false; true ⇒ variable-amount bill (range below) |
| amount_range_low_cents / amount_range_high_cents | integer? | optional bounds for variable bills |
| necessity | enum {essential, negotiable, nice_to_have} | required; default `nice_to_have` (C-3) |
| classification_source | enum {inferred, user_override} | default `inferred`; `user_override` wins |
| detection_state | enum {detected, confirmed, dismissed} | default `detected`; `dismissed` excluded from money math |
| monthly_impact_cents | integer | ≥ 0; cadence-normalized monthly impact |
| annualized_impact_cents | integer | = `monthly_impact_cents × 12` (exact) |
| next_charge_on | date? | null/estimated when cadence irregular/unknown |
| freshness | FreshnessStamp | required; stale `TransactionStream` ⇒ impact figures flagged |

**Rule (FR-BILL-001)**: A series is built from the spine's `is_recurring`/`is_subscription_like` hints + cadence inference. `merged_duplicate` rows are already suppressed by the spine; `suspected_duplicate` and `pending` rows are **excluded** from `monthly_impact_cents` until resolved (no double-count). `annualized = monthly × 12` is exact integer arithmetic.

### BillCalendarEntry  → provided in `BillCalendar`
An upcoming bill/charge with a runway-derived safe-to-pay date. **Provided** contract (`finos:bills/BillCalendar/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| entry_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| series_ref | { series_id } | required → `RecurringSeries` |
| merchant_ref | { merchant_id } | optional → `MerchantGraph` |
| due_on | date | required |
| due_on_is_estimated | bool | default false; true for irregular cadence |
| amount | MoneyCents | required; integer CAD cents |
| amount_is_estimated | bool | default false |
| safe_to_pay_on | date? | null when withheld — never substituted with `due_on` |
| safe_to_pay_status | enum {available, withheld, at_risk} | required |
| safe_to_pay_source | enum {cash_flow_forecast, safe_to_act_signal} | default `cash_flow_forecast` (C-1) |
| at_risk | bool | true iff `safe_to_pay_on > due_on` or `CashFlowForecast.shortfall_flag` |
| freshness | FreshnessStamp | required; stale runway ⇒ `safe_to_pay_status = withheld` |

**State / guard transitions (FR-BILL-003)**:
- `CashFlowForecast` (money input) stale/missing → `safe_to_pay_status = WITHHELD`, `safe_to_pay_on = null` (due date still shown; never guessed).
- `CashFlowForecast` fresh, runway safely covers before due → `safe_to_pay_status = AVAILABLE`, `safe_to_pay_on` set.
- `safe_to_pay_on > due_on` (or `shortfall_flag = true`) → `safe_to_pay_status = AT_RISK`, `at_risk = true`; Conflict Banner; **Cash Safety precedence**.
- `SafeToActSignal` (when shipped) flags overdraft on a pay-now → safety **overrides**; `safe_to_pay_source = safe_to_act_signal`; conflict surfaced.

### RecurringObligation  → provided in `RecurringObligations`
A single projected upcoming occurrence of a series. **Provided** contract (`finos:bills/RecurringObligations/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| obligation_id | string (uuid) | required; stable across re-projection (idempotent) |
| series_ref | { series_id } | required |
| expected_on | date | required |
| amount | MoneyCents | required; integer CAD cents |
| necessity | enum {essential, negotiable, nice_to_have} | carried from series (Pay sequencer prioritizes essentials) |
| is_estimated | bool | required; true ⇒ estimated amount/date (not a settled money input) |
| freshness | FreshnessStamp | required |

### FreeTrial  → provided in `FreeTrialExpiry`
A tracked free trial. **Provided** contract (`finos:bills/FreeTrialExpiry/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| trial_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| series_ref | { series_id } | optional (set once converted) |
| merchant_ref | { merchant_id } | required → `MerchantGraph` |
| display_name_en / display_name_fr | string | both required when surfaced |
| converts_on | date | required (predicted first paid charge) |
| converts_on_is_estimated | bool | required; true ⇒ surfaced as estimate, never confident |
| post_conversion_cost | MoneyCents | required; CAD cents that apply if kept |
| alert_window_days | integer | default 3 (C-4), user-adjustable |
| decision_state | enum {pending, keep, cancel} | default `pending`; `cancel` ⇒ guided action (never executed) |
| freshness | FreshnessStamp | required |

**Rule (FR-BILL-002)**: the keep/cancel prompt is surfaced when `converts_on − today ≤ alert_window_days`. `decision_state` writes are idempotent on `source_event_id` and audited. Unknown `converts_on` ⇒ `converts_on_is_estimated = true`.

### CancellationAction / NegotiationAction  *(module-internal — not a cross-module contract)*
A user-initiated, **guided (not executed)** cancel/negotiate action.

| Field | Type | Validation |
|-------|------|------------|
| action_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| series_ref | { series_id } | required |
| kind | enum {cancel, negotiate} | required |
| projected_monthly_savings_cents | integer | ≥ 0; estimate (C-5) |
| projected_annualized_savings_cents | integer | = monthly × 12 (cancel) or per reduction (negotiate) |
| reduction_rate | decimal string? | for negotiation; arbitrary precision (`^[0-9]+(\.[0-9]+)?$`); e.g. `0.25` |
| goal_impact_ref | { goal_id, time_to_goal_delta_days } | optional → `GoalState` (pace sourced, never recomputed) |
| script_en / script_fr | string | bilingual cancellation/negotiation script (informational; not FinOS contacting merchant) |
| outcome_state | enum {proposed, confirmed, completed, abandoned} | required |
| reasoning | Reasoning | required (cites amount, cadence, category, savings) |
| source_event_id | string (uuid) | required — idempotency key |

**Rule (FR-BILL-004 / C-5)**: savings are estimates, integer cents; a negotiation `reduction_rate` is applied in arbitrary precision, **half-up to the nearest cent once**, at the storage/display boundary only (no pre-rounding of intermediates). An `essential`-classified series is never offered cancellation (negotiation may still apply). Confirmed actions are written to the audit trail.

### BillsAuditEvent (append-only; Principle VI / FR-X-007)  *(module-internal)*

| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {trial_kept, trial_cancelled, cancellation_confirmed, negotiation_confirmed, series_classified, series_dismissed} | |
| payload | map | PII/money + merchant descriptors **redacted** in debug logs; full record only in the audit trail (FR-X-014) |
| source_event_id | string (uuid) | UNIQUE — idempotency key (replays do not double-apply) |
| occurred_at | timestamp | required, immutable (UTC) |

---

## Relationships

- `RecurringSeries` 1—* `BillCalendarEntry` (each upcoming occurrence with a due/safe-to-pay date).
- `RecurringSeries` 1—* `RecurringObligation` (forward projection over the horizon).
- `RecurringSeries` *—1 `MerchantGraph` node; *—1 `BudgetState` category; 0..1 `FreeTrial` (a trial converts into a series).
- `FreeTrial` 0..1 → `RecurringSeries` (on conversion).
- `CancellationAction`/`NegotiationAction` *—1 `RecurringSeries`; *—0..1 `GoalState` goal (time-to-goal impact).
- All owned entities are scoped by `profile_id`; every cross-profile read is authZ-checked server-side against the session identity + Household `MemberScope` (threat model).

## Consumed contracts (referenced, owned elsewhere)

`TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `GoalState` (Module 0); `SafeToActSignal` (Module 3, pending). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine storage. The umbrella's "RunwayForecast" is satisfied by `CashFlowForecast` (spec C-1).

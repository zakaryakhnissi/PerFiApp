# Phase 1 Data Model: Module 3 — Cash Safety & Autopilot

**Feature**: `005-module-3-cash-safety` | **Date**: 2026-06-29

Entities the Cash Safety module **owns/provides**. Consumed spine contracts (`CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, `CreditState`) and `BillCalendar` (Module 4) are owned elsewhere and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` / `*_amount` (MoneyCents) fields are **integer minor units (CAD cents)**. The only non-integer numerics are FX rates (consumed for conversion) which are **arbitrary-precision decimal** (string-encoded on the wire). The roundup amount is **integer-cents modular arithmetic** — no decimal, no float. No field is a binary float.

**Freshness convention** (Principle VIII): the runway and signal carry a `FreshnessStamp` inherited from the spine balance/forecast they derive from. A stale **money** input (balance/forecast) ⇒ **withhold** (the runway is a money output; no documented-default applies). `CreditState` due-date context is a **secondary guardrail**: absent ⇒ proceed without the urgency boost; stale ⇒ flag.

---

## Shared value objects (published by Module 0, reused here)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider identifier (never a token) |
| observed_at | timestamp (UTC) | when the underlying value was sourced |
| staleness_threshold_seconds | integer | per-value window (research.md) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

**Rule**: `is_stale = true` on a money input ⇒ the runway/signal **withholds** (FR-X-008; Constitution VIII).

### MoneyCents — `finos:common/MoneyCents/1.0.0`
Integer `amount_cents` + ISO-4217 `currency` (default CAD). Foreign amounts are FX-converted to CAD (arbitrary precision, half-up at the final cent) before entering any runway figure.

### Reasoning — `finos:common/Reasoning/1.0.0`
`{ inputs, rationale_en, rationale_fr }`. Every runway micro-action, `SafeToActSignal`, and `RoundupProposal` carries reasoning; a missing fr rationale is a bilingual defect (Principle II).

---

## Owned entities

### RunwayForecast
The user-facing runway. **Provided** contract (`finos:cashsafety/RunwayForecast/1.0.0`). Derived from `finos:spine/CashFlowForecast/1.0.0` — not re-aggregated.

| Field | Type | Validation |
|-------|------|------------|
| forecast_id | string (uuid) | required |
| profile_id | string (uuid) | required — scopes ownership (server-side authZ) |
| horizon_days | integer | ≥ 1; inherits the spine horizon |
| starting_balance | MoneyCents | required; net liquid basis (carries the figure that produced the runway) |
| safety_buffer | MoneyCents | required; user-adjustable floor; `runway_days` counts down to this, not 0 |
| projected_lowest_balance | MoneyCents | required |
| projected_lowest_on | date \| null | date of the lowest point |
| runway_days | integer | ≥ 0; days until projected balance crosses `safety_buffer` |
| shortfall_flag | boolean | required; true ⇒ a projected balance breaches the buffer |
| confidence | enum {high, low, insufficient} | derived from spine forecast method; `insufficient` ⇒ withhold/flag |
| points | list<{date, projected_balance}> | optional per-day series for the chart |
| micro_actions | list<MicroAction> | empty iff `shortfall_flag` is false; ranked |
| data_completeness | enum {complete, partial} | `partial` ⇒ "Incomplete data" marker |
| freshness | FreshnessStamp | required; stale ⇒ runway withheld |

**Rule (FR-CASH-001)**: a stale/missing `starting_balance` or `CashFlowForecast` ⇒ the runway is **withheld** (Withheld state), never computed on old data. The runway is a money output; there is no documented-default fallback for it.

### MicroAction
A ranked, advisory step that closes part of a predicted gap. Embedded in `RunwayForecast.micro_actions`.

| Field | Type | Validation |
|-------|------|------------|
| action_id | string (uuid) | required |
| kind | enum {move_bill_date, pause_roundup, resequence_payments, transfer_from_savings, reduce_discretionary} | required; **no** cash-advance/credit value exists (FR-CASH-002) |
| projected_gap_closed | MoneyCents | ≥ 0; integer-cents subtraction against the shortfall |
| target_ref | {ref_type, ref_id} \| null | references a bill / roundup_rule / payment_schedule / account / budget_category |
| reasoning | Reasoning | required (bilingual); cites the gap and the input it acts on |

**Composition rules (FR-CASH-002)**:
- `move_bill_date` requires `BillCalendar` (Module 4); when Bills is unshipped it is **omitted** (feature-gated graceful degradation).
- `reduce_discretionary` requires fresh `BudgetState`; when budget is stale/missing this action is **withheld** (others still surface).
- `transfer_from_savings` references the user's **own** accounts only; it is a proposal — never executed.
- `pause_roundup` references a `RoundupRule`; confirming it transitions affected `RoundupProposal`s to `superseded`.
- Ranking: descending `projected_gap_closed`, tie-broken by least user disruption (`pause_roundup`/`resequence_payments` before `transfer_from_savings`/`reduce_discretionary`).

### SafeToActSignal
The cross-module safety verdict. **Provided** contract (`finos:cashsafety/SafeToActSignal/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| signal_id | string (uuid) | required |
| profile_id | string (uuid) | required — server-side authZ |
| verdict | enum {safe, caution, unsafe, withheld} | required |
| contemplated_amount | MoneyCents | optional; present for an amount-evaluated query |
| projected_lowest_balance_after | MoneyCents | present iff amount-evaluated and not `withheld` |
| runway_days_after | integer \| null | ≥ 0; null when withheld/not amount-evaluated |
| shortfall_date | date \| null | null when `safe`/`withheld` |
| runway_ref | uuid \| null | the `RunwayForecast.forecast_id` this verdict derives from |
| precedence_rank | integer (const 1) | conflict-resolution rank; always 1 (Cash Safety overrides optimization) |
| reasoning | Reasoning | required (bilingual) |
| freshness | FreshnessStamp | required; stale money input ⇒ `verdict = withheld` |

**Verdict rule (FR-CASH-004)**: `safe` = no buffer breach; `caution` = narrows into the buffer-approach band; `unsafe` = breaches the buffer (overdraft risk) ⇒ consumers MUST show the Conflict Banner and defer; `withheld` = stale/missing money input ⇒ consumers withhold the spend recommendation. `withheld` is **never** coerced to `safe`.

### RoundupRule (owned, not exposed cross-module)
A user-defined sweep/roundup rule that drives `RoundupProposal`s.

| Field | Type | Validation |
|-------|------|------------|
| rule_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| round_to_cents | integer | ∈ {100, 500} typical (nearest $1/$5); > 0 |
| scope | enum {all_purchases, category, account} | required; optional `scope_ref` |
| destination | {destination_kind, account_ref?, goal_ref?} | `destination_kind` ∈ {debt_paydown, tfsa, savings, goal} |
| state | enum {active, paused} | `paused` set by a confirmed `pause_roundup` micro-action |

### RoundupProposal
The proposed sweep for a qualifying purchase. **Provided** contract (`finos:cashsafety/RoundupProposal/1.0.0`).

| Field | Type | Validation |
|-------|------|------------|
| proposal_id | string (uuid) | required |
| source_event_id | string (uuid) | required, **UNIQUE** — idempotency key (the trigger event) |
| profile_id | string (uuid) | required — server-side authZ |
| rule_id | string (uuid) | required (→ RoundupRule) |
| trigger_txn_ref | {transaction_id} | required (→ TransactionStream; a reference, not a body copy) |
| roundup_amount | MoneyCents | = `(round_to - (txn_amount mod round_to)) mod round_to`, integer cents; ≥ 0 |
| destination | {destination_kind, account_ref?, goal_ref?} | required |
| goal_contribution_days | integer \| null | time-to-goal contribution when goal-routed (FR-X-004) |
| status | enum {proposed, confirmed, dismissed, superseded} | FinOS never auto-advances to `confirmed` |
| confirmed_at | timestamp (UTC) \| null | set only on user confirmation |
| reasoning | Reasoning | required (bilingual) |
| freshness | FreshnessStamp | required |

**State transitions**:
- `proposed` → `confirmed` (user approves in the Confirm-Action sheet ⇒ writes ONE append-only audit event; user executes the transfer externally).
- `proposed` → `dismissed` (user declines).
- `proposed`/`confirmed` is unreachable from a replay: a duplicate `source_event_id` returns the existing proposal (idempotent; FR-CASH-003, US3 scenario 2).
- `proposed` → `superseded` (a confirmed `pause_roundup` micro-action pauses the rule under shortfall pressure).

**Roundup math rule (FR-CASH-003)**: integer-cents modular arithmetic only — `$4.30`→$1 ⇒ 70¢; `$4.00`→$1 ⇒ 0¢ (exact multiple ⇒ no sweep); `$23.40`→$5 ⇒ 160¢. No float, no rounding step. Fixture-guarded.

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| source_event_id | string (uuid) | required; UNIQUE per logical action (idempotency) |
| profile_id | string (uuid) | required |
| type | enum {roundup_confirmed, micro_action_confirmed, runway_shown, signal_served} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the append-only audit trail (FR-X-014) |
| occurred_at | timestamp (UTC) | required, immutable |

**Idempotency rule (Principle IV)**: `roundup_confirmed` / `micro_action_confirmed` writes are keyed on `source_event_id`; a replayed event does not double-apply.

---

## Relationships

- `RunwayForecast` 1—* `MicroAction` (only when `shortfall_flag`).
- `RunwayForecast` 1—1 derived-from `CashFlowForecast` (spine); references `AccountState` for the starting balance basis.
- `SafeToActSignal` *—1 `RunwayForecast` (via `runway_ref`).
- `RoundupRule` 1—* `RoundupProposal`.
- `RoundupProposal` *—1 `TransactionStream` transaction (via `trigger_txn_ref`); 0..1 `GoalState` goal (via `destination.goal_ref`).
- `MicroAction (pause_roundup)` —* `RoundupProposal` (transitions to `superseded`).
- All owned entities are scoped by `profile_id`; every cross-profile read is authZ-checked server-side against the session identity + `MemberScope` (Threat Model).

## Consumed contracts (referenced, owned elsewhere)

`CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, `CreditState` (Module 0); `BillCalendar` (Module 4, feature-gated). Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine storage. Version skew disables the dependent runway/signal (SC-012).

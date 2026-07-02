# Quickstart & Validation: Module 3 — Cash Safety & Autopilot

**Feature**: `005-module-3-cash-safety` | **Date**: 2026-06-29

A run/validation guide proving Cash Safety works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, `CreditState`. `BillCalendar` (Module 4) optional — its consumer is feature-checked (until Bills ships, `move_bill_date` is omitted).
- Seeded fixtures: a `CashFlowForecast` with a known lowest point + shortfall date, an `AccountState` net liquid balance, a qualifying-purchase `TransactionStream` event carrying a `source_event_id`, a `BudgetState` category headroom, a `GoalState` goal, and an FX rate for a foreign-currency transaction.
- Toolchain per the ratified platform plan (see [plan.md](./plan.md) Technical Context and [platform-decisions.md](../_platform/platform-decisions.md)). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:cash-safety-fixtures   # forecast, balance, txn trigger, budget, goal, fx rate
```

## Validation by user story

### US1 — Forward-looking runway with shortfall flag (P1) 🎯 MVP

```bash
<pkg> test cash-safety/unit/runway
<pkg> test cash-safety/integration/runway
```

Expected:
- The runway shows the lowest projected balance, the date it occurs, `runway_days` (counting down to the **safety buffer**, not 0), and a visible `shortfall_flag` when the projection breaches the buffer — each carrying a `FreshnessStamp` (FR-CASH-001; SC-CASH-002).
- **Freshness safety (mandatory)**: a `CashFlowForecast`/balance fixture marked **stale** renders the runway **WITHHELD** (Withheld state) with a "Refresh balance" CTA — never computed on old data. The runway is a money output; there is **no** documented-default for it (SC-CASH-005; Constitution VIII).
- A `forecast_method = insufficient_history` fixture renders the runway **low-confidence/withheld**, not a confident number.
- A **partial** account picture renders the runway on the connected subset with a Partial Data Banner + "Incomplete data" chip (never presented as complete).
- fr-CA locale renders the lowest balance and buffer as `1 234,56 $` (comma decimal, non-breaking-space thousands, trailing `$`), not `$1,234.56` (SC-CASH-006).

### US2 — Shortfall micro-actions that close the gap (P1)

```bash
<pkg> test cash-safety/unit/micro-actions
<pkg> test cash-safety/integration/micro-actions
```

Expected:
- A predicted shortfall yields ≥ 1 concrete micro-action ranked by `projected_gap_closed`, each referencing a real entity (a bill / roundup rule / payment schedule / account / budget category) with bilingual `reasoning` (FR-CASH-002).
- **No-credit invariant (mandatory)**: the `micro_actions.kind` enum has **no** cash-advance/loan/credit value; a test asserts no such action is ever emitted (FR-CASH-002; SC-CASH-003).
- **Gap-closed money fixture (mandatory)**: a micro-action whose `projected_gap_closed` exactly equals a flagged shortfall drives the verdict from `unsafe` to `safe` with zero cent drift (integer-cents subtraction).
- A `move_bill_date` action is **omitted** when Bills (P2) is unshipped; remaining kinds still close gaps (graceful degradation; FR-X-012).
- Stale/missing `BudgetState` → the `reduce_discretionary` action is **withheld** (not computed on guessed headroom); non-budget micro-actions still surface.
- A `transfer_from_savings` action moves the user's **own** funds and is a **proposal only** — routed through a Confirm-Action sheet, never executed (FR-X-003; SC-CASH-007).

### US4 — SafeToActSignal consumed by every spending module (P1)

```bash
<pkg> test cash-safety/unit/safe-to-act
<pkg> test cash-safety/integration/safe-to-act
```

Expected:
- An amount-evaluated query returns a `verdict` (`safe`/`caution`/`unsafe`/`withheld`) with `reasoning`, and for non-`withheld` amounts the `projected_lowest_balance_after` (FR-CASH-004).
- A contemplated spend that breaches the buffer returns `unsafe` with the projected lowest balance after the spend; `precedence_rank = 1` is present so consumers surface the **Conflict Banner** and defer (SC-CASH-003; ux-foundations §10.4).
- **Withhold safety (mandatory)**: a stale/missing balance returns `verdict = withheld` (never a guessed `safe`); `withheld` is never coerced to `safe` (SC-CASH-005).
- **Cross-user authZ (mandatory)**: a `SafeToActSignal` request for a `profile_id` outside the requester's `MemberScope` is **denied server-side and audited** — never served from a client-supplied identifier (FR-HH-001; SC-CASH-009).

### US3 — Rules-based roundups proposed to the user's plan (P2)

```bash
<pkg> test cash-safety/unit/roundup
<pkg> test cash-safety/integration/roundup
```

Expected:
- A qualifying purchase under an active rule produces a `RoundupProposal` with its exact integer-cents `roundup_amount`, destination, and (when goal-routed) a time-to-goal contribution in days (FR-X-004), all **proposed** (status `proposed`) — never executed.
- **Roundup money fixtures (mandatory)**: `$4.30`→$1 ⇒ **70¢**; `$4.00`→$1 ⇒ **0¢** (exact multiple yields no sweep, not a full target); `$23.40`→$5 ⇒ **160¢** — integer-cents modular arithmetic, zero slippage (SC-CASH-004).
- **FX money fixture (mandatory)**: a foreign purchase entering the projection converts with no cent drift, e.g. `USD 100.00 × 1.3725 = CAD 137.25`, half-up at the final cent (SC-CASH-004).
- **Idempotency (mandatory)**: replaying the same trigger `source_event_id` (e.g. a network retry) produces **exactly one** proposal; confirming it writes **exactly one** append-only audit event; a replayed confirmation no-ops (SC-CASH-004; FR-CASH-003).
- Approving a roundup routes through a Confirm-Action sheet whose primary CTA is specific ("Approve roundup of 2,50 $"); FinOS never auto-confirms (SC-CASH-007).
- Under shortfall pressure, a confirmed `pause_roundup` micro-action transitions affected proposals to `superseded` — the runway outranks the savings autopilot.

## Contract tests (mandatory — Principle VII / SC-CASH-008)

```bash
<pkg> test cash-safety/contract/consumed   # CashFlowForecast, AccountState, TransactionStream, BudgetState, GoalState, CreditState, BillCalendar
<pkg> test cash-safety/contract/provided   # RunwayForecast, SafeToActSignal, RoundupProposal
```

Expected:
- All consumer + provider contract tests pass; an intentionally bumped/broken consumed schema (`CashFlowForecast`, `AccountState`) **fails CI** and disables the dependent runway/signal (version-skew behavior; SC-012).
- A **provider test on `RunwayForecast.micro_actions`** asserts no cash-advance/credit `kind` is ever emitted (FR-CASH-002).
- The `SafeToActSignal` provider test asserts `precedence_rank = 1` and that a stale-money fixture yields `verdict = withheld`.

## Cross-cutting checks

- **Recommend-only & no credit (SC-CASH-007 / FR-X-003 / FR-CASH-002)**: grep the Cash Safety API surface — there is **no** money-movement endpoint and **no** credit/cash-advance origination endpoint; every action is a recommendation or a user-confirmed state write.
- **Audit trail (Principle VI)**: `roundup_confirmed` / `micro_action_confirmed` / `runway_shown` / `signal_served` produce append-only `AuditEvent`s, kept separate from debug logs; a denied cross-user access is audited.
- **Redaction (FR-X-014)**: debug logs contain no PII, balances, projected shortfalls, or roundup amounts.
- **Performance (SC-010)**: module-switch into Cash Safety and a consuming module's `SafeToActSignal` read render the cached, freshness-stamped runway in ≤ 300 ms; a cache miss/stale renders a Loading/Withheld state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA; bilingual screen-reader labels on the runway chart, micro-action cards, Conflict Banner, and Confirm-Action sheet.

## Done when

All four user-story validations pass, the roundup/FX/gap-closed money fixtures show zero slippage, idempotency replays produce exactly one proposal + one audit event, all consumer (7) + provider (3) contract tests are green, the no-credit and withhold invariants hold, and the cross-cutting checks hold.

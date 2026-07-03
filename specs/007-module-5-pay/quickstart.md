# Quickstart & Validation: Module 5 — Pay & Payment Optimization

**Feature**: `007-module-5-pay` | **Date**: 2026-06-29

A run/validation guide proving Pay works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `AccountState`, `CashFlowForecast` (canonical runway / `projected_lowest_balance` / `shortfall_flag`), `BudgetState`, `CreditState` (utilization bands), `GoalState`, `MerchantGraph`.
- Module 1 (Rewards) contract clients available (or stubbed) exposing `BestCardRecommendation`, `CardLineup`, `PointsValuation` (already-CAD-valued reward figures — Pay re-derives no points valuation).
- `SafeToActSignal` (Module 3 / Cash Safety) and `BillCalendar` (Module 4 / Bills) **optional** — their consumers are feature-checked. Until present: runway-dependent picks rely on `CashFlowForecast` (withhold if stale/missing); the sequencer uses a user-entered obligation set with no downstream calendar sync.
- Seeded fixtures: a checkout context (merchant + amount), a card lineup + account set, a `CreditState` with utilization bands, a `CashFlowForecast` with a safety buffer + projected lowest balance, an obligation+inflow set for the sequencer, and a fixed FX rate.
- Toolchain per the ratified platform stack ([platform-decisions.md](../_platform/platform-decisions.md) §2; see [plan.md](./plan.md) Technical Context). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:pay-fixtures      # merchant + amount, card lineup, accounts, credit bands, forecast, obligations, fx
```

## Validation by user story

### US1 — Safe-to-pay checkout recommendation (P1)

```bash
<pkg> test pay/unit/checkout-overlay
<pkg> test pay/integration/checkout-recommendation
```

Expected:
- The result names **exactly one** payment method (card **or** account); `reasoning.inputs` includes the reward value, runway impact (`projected_lowest_balance` after spend), and utilization before→after band; `rationale_en` and `rationale_fr` both present (SC-P-002/003).
- **Money fixture (mandatory)**: a checkout where the reward-optimal card is **rejected for a runway breach** and the safer account is chosen — `reward_foregone` asserts the **exact** reward-foregone in cents, no slippage (SC-P-007).
- **Money fixture (mandatory)**: a candidate landing in the **30–50% warn band** is recommended with `utilization_warning = true`; a candidate landing **> 50%** is **excluded** (SC-P-001).
- **Money fixture (mandatory)**: a **near-tie within `reward_tie_threshold_cents` (default 25¢)** resolves to the lower-utilization / higher-liquidity method (secondary guardrail, not a money input).
- **Money fixture (mandatory)**: a **foreign-currency** checkout converted via a fixed FX rate (arbitrary precision, half-up at the final cent **once**) enters runway/budget reasoning with **no cent drift** (SC-P-007).
- Stale/missing `CashFlowForecast`/`RunwayForecast` or `BudgetState` (primary **money** inputs) → recommendation **WITHHELD** (asks user), never guessed (SC-P-008).
- `CreditState` **entirely absent** → `utilization_source = assumed_healthy_default`, proceeds **silently** (no user-facing flag); `CreditState` present but **stale** → **flag/withhold** (FR-PAY-001; Constitution VI v2.2.0 — the only permitted documented default).
- With `SafeToActSignal` overdraft risk present → `safe_to_act_deferred = true`, Cash Safety **takes precedence**, the Conflict Banner names both signals + the resolution rule (SC-P-012; ux-foundations §3.1/§10.4).
- fr-CA locale renders `1 234,56 $` (SC-P-009).

### US2 — Monthly payment sequencer (P1)

```bash
<pkg> test pay/unit/sequencer
<pkg> test pay/integration/payment-sequencer
```

Expected:
- Over a fixed obligation+inflow set, the sequencer returns an **ordered, dated** plan; **every intermediate `projected_balance_after` is ≥ the safety buffer** and the ordering is **deterministic** (SC-P-004).
- **Money fixture (mandatory)**: the **feasible** sequencer fixture asserts every intermediate projected balance ≥ buffer and a deterministic order; `goal_progress_delta` (vs. naive due-date order) is exact in cents under summation (SC-P-004/007).
- **Money fixture (mandatory)**: an **infeasible** fixture (inflows insufficient) emits `feasibility = infeasible` — **no overdrafting plan is produced** — with the exact `shortfall_on` date + `shortfall_amount` cents and criticality-ranked `deferral_recommendations` (FR-PAY-002).
- Among two valid overdraft-free orderings differing only in goal progress, the one with greater goal progress is chosen and the Why layer cites the goal advanced and by how many days (SC-P-003; FR-X-004).
- Stale runway/budget inputs → sequence **WITHHELD** (SC-P-008).
- fr-CA renders amounts/dates locale-correctly (`28 juin 2026`, `1 234,56 $`) (SC-P-009).

### US3 — Accept a sequence & sync the bill calendar (P2)

```bash
<pkg> test pay/unit/accept-idempotency
<pkg> test pay/integration/accept-and-publish
```

Expected:
- Accepting via the Confirm-Action sheet records each `ScheduledPayment` (`status: proposed → accepted`) and publishes `PaymentSchedule`; a `sequence_accepted` + `schedule_published` append-only `AuditEvent` is written — **no money is moved** (SC-P-005; FR-PAY-003).
- **Idempotency fixture (mandatory)**: a **double-submitted** acceptance (same `source_event_id`) records **exactly once** — no double-recorded step, no second audit entry (SC-P-006).
- A later spine refresh that makes an accepted step overdraft-risky transitions that step `status → needs_resequence`, flagged for re-sequencing — never silently left to drift, never auto-executed (FR-PAY-003).
- An obligation cancellation/renegotiation is **handed to Bills** (Pay does not negotiate); the proposal + its projected goal/runway effect is recorded for audit.

## Contract tests (mandatory — Principle VII / SC-P-010)

```bash
<pkg> test pay/contract/consumed   # BestCardRecommendation, CardLineup, PointsValuation, CreditState,
                                   #   CashFlowForecast, BudgetState, GoalState, AccountState, MerchantGraph,
                                   #   SafeToActSignal (pinned), BillCalendar (pinned)
<pkg> test pay/contract/provided   # CheckoutRecommendation, PaymentSchedule
```

Expected: all consumer + provider contract tests pass against the pinned `$id`/versions (e.g. `finos:spine/CashFlowForecast/1.0.0`, `finos:rewards/BestCardRecommendation/1.0.0`, `finos:pay/CheckoutRecommendation/1.0.0`, `finos:pay/PaymentSchedule/1.0.0`); an intentionally bumped/broken consumed schema **fails CI** and disables the dependent Pay recommendation (version-skew behavior, SC-012). The pinned-not-yet-shipped `SafeToActSignal` / `BillCalendar` consumer tests are ready the moment those providers publish.

## Cross-cutting checks

- **Recommend-and-record-only (SC-P-005 / FR-X-003)**: grep the Pay API surface — there is **no** money-movement endpoint; every action is a recommendation, a proposed sequence, or a user-confirmed acceptance/record.
- **Audit trail (Principle VI)**: `recommendation_shown` / `sequence_proposed` / `sequence_accepted` / `schedule_published` / `cross_profile_denied` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Cross-profile authZ (SC-P-011 / Principle V)**: an API-layer (not UI) authorization test proves **0** cross-profile data exposure for Household multi-profile checkout/sequencing; every denied cross-profile request emits a `cross_profile_denied` audit event.
- **Redaction (FR-X-014)**: debug logs contain no PII or monetary values (balances, obligations, schedules redacted).
- **Performance (SC-010)**: module-switch into Pay renders the cached recommendation/sequence in ≤ 300 ms; cache miss/stale renders a flagged/Withheld state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual screen-reader labels on every value and CTA; per-step expandable Why is AT-navigable.
- **Conflict precedence (SC-P-012)**: every Cash-Safety/Pay conflict resolves with Cash Safety taking precedence and the Conflict Banner shown; 0 cases where a Cash-Safety-flagged spend-positive pick is surfaced as the recommendation.

## Done when

All user-story validations pass, the money fixtures (runway-breach reward-foregone, warn/hard-avoid bands, near-tie, FX conversion, feasible/infeasible sequence, idempotency replay) show zero cent slippage and exactly-once recording, all consumer+provider contract tests are green, and the cross-cutting checks hold.

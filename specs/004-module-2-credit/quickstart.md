# Quickstart & Validation: Module 2 — Credit & Coaching

**Feature**: `004-module-2-credit` | **Date**: 2026-06-29

A run/validation guide proving Credit & Coaching works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories, money fixtures, and success criteria. Stack and commands follow the ratified platform plan ([plan.md](./plan.md) Technical Context).

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `CreditState` (`finos:spine/CreditState/1.0.0`), `AccountState` (`finos:spine/AccountState/1.0.0`), `CashFlowForecast` (`finos:spine/CashFlowForecast/1.0.0`), `GoalState` (`finos:spine/GoalState/1.0.0`).
- Module 1 Rewards `CardLineup` (`finos:rewards/CardLineup/1.0.0`) client available (or stubbed) for the refinance rewards-value side. `SafeToActSignal` (`finos:cashsafety/SafeToActSignal/1.0.0`, Module 3) optional — its consumer is feature-checked (C3).
- Seeded fixtures: a curated **credit-bureau** sample (score 300–900 + ranked factors, freshness-stamped), card balances/limits/statement dates, an FX rate (for a non-CAD card), a `CardLineup` sample, and a `GoalState` with a credit-boosting goal.
- Toolchain per the platform plan (NestJS/Node backend + RN/Expo mobile; `@finos/money`, `@finos/format`; Pact; Jest; Testcontainers Postgres). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:credit-fixtures      # bureau score+factors, balances/limits, fx, card lineup, credit-boosting goal
```

## Validation by user story

### US1 — Credit Monitor: score and factors with freshness (P1)

```bash
<pkg> test credit/unit/credit-monitor
<pkg> test credit/integration/credit-monitor
```

Expected:
- Score (300–900), score band, signed delta-since-last, and ranked top factors each render with a bilingual (EN/FR) explanation and a `FreshnessStamp` (SC-C-005).
- A **stale** bureau feed renders the score as last-known with a Stale chip (last value + date) — never as current — and dependent coaching is flagged/withheld (SC-C-006).
- **No bureau feed** → Empty/Connect state ("Connect your credit profile to see your score") — never a zero-filled or invented score.
- Monitoring uses a **soft pull only** — 0 hard inquiries initiated (SC-C-011).
- fr-CA renders `12,3 %` and `28 juin 2026`; en-CA renders `12.3%` and `June 28, 2026` (SC-C-007).

### US2 — Due-Date & Utilization Coaching with a specific early-payment amount (P1) 🎯 MVP-flagship

```bash
<pkg> test credit/unit/early-payment
<pkg> test credit/unit/coaching-withhold
<pkg> test credit/integration/coaching
```

Expected:
- Coaching names a **specific early-payment amount** (integer cents) that brings the card below the target band; `reasoning.inputs` includes balance, limit, utilization-before/after, and statement date; `rationale_en` and `rationale_fr` both present (SC-C-001/SC-C-005).
- **Money fixture (mandatory) — early-payment slippage guard**: balance `$4,500.00` (450000¢), limit `$5,000.00` (500000¢), util 0.90 (hard-avoid) → pay-down below 0.30 ⇒ recommended payment = **`300000¢` ($3,000.00)** exactly, no cent drift (SC-C-003).
- **Money fixture (mandatory) — band-boundary round-up**: a balance landing utilization at exactly 0.30 requires **one more cent** paid to cross *below* healthy — proving the documented round-up rule (SC-C-003).
- **Money fixture (mandatory) — FX-converted balance**: a USD card balance converted via a fixed timestamped rate to CAD cents with no drift before the early-payment amount is computed (SC-C-003); a stale FX rate withholds the converted figure.
- Stale/missing `AccountState` balance/limit OR stale/missing `CreditState` utilization (primary money inputs) → plan **`withheld`** with a named reason; the amount is **never** guessed and the documented-default exception is **not** applied (SC-C-002; C4).
- Utilization already within the target band → `status='satisfied'`, no manufactured action.
- With a credit-boosting `GoalState`, `target_band='optimal'` (< 10%) and a time-to-goal contribution is shown (FR-X-004).
- With `SafeToActSignal` overdraft risk present → `safe_to_act_deferred=true`, Cash Safety **precedence**, conflict + resolution surfaced (Conflict Banner).
- Acting on the recommendation routes through the **Confirm-Action sheet** (exact CAD amount + disclaimer); FinOS records the confirmation only — it never moves money (SC-C-010).

### US3 — Canada-specific Credit-Builder Playbook (P2)

```bash
<pkg> test credit/integration/builder-playbook
```

Expected: for a thin-file ("building") user, an ordered set of Canada-specific steps renders highest-impact-first, each bilingual and flagged `informational_only=true`; a step whose specificity depends on a stale money input is shown generically (no number) or withheld — never with a guessed figure; any "consider a secured card / credit-builder loan" step is framed as education, not a commissioned product push.

### US4 — Refinance & Card-Lineup Optimization (rewards AND score impact) (P2)

```bash
<pkg> test credit/unit/refinance-net-delta
<pkg> test credit/integration/refinance
```

Expected:
- Each keep/downgrade/cancel/refinance signal shows **both** the rewards-value impact (from `CardLineup`) and the qualitative credit-score impact — a one-sided signal is a defect (SC-C-004).
- **Money fixture (mandatory) — refinance net-delta**: rewards-value delta `-$120.00` (downgrade loses value) minus fee saved `-$150.00` ⇒ net `+$30.00` (**3000¢**) exactly (SC-C-003).
- Cancelling a card that would raise aggregate utilization or shorten average credit age shows the projected utilization impact + `estimated_credit_score_impact` (e.g. `minor_decline`) — never hidden to make a cancel look free.
- A stale rewards-value/fee/balance/rate input **withholds** the affected signal (named reason); the rewards side is **never** fabricated.
- `CardLineup` unavailable or version-skewed → the rewards-value side is marked unavailable / the signal withheld, not invented (SC-C-008 / SC-012).

## Contract tests (mandatory — Principle VII / SC-C-008)

```bash
<pkg> test credit/contract/consumed   # CreditState, AccountState, CashFlowForecast, GoalState, CardLineup, SafeToActSignal
<pkg> test credit/contract/provided   # CreditFactors, CreditCoachingPlan, CreditBuilderPlaybook, RefinanceSignals
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken consumed schema **fails CI** and disables the dependent coaching/refinance signal (version-skew behavior, SC-012). The spine remains the single canonical `CreditState` provider — Credit publishes no competing `CreditState` (C1).

## Cross-cutting checks

- **Recommend-only (SC-C-010 / FR-X-003)**: grep the Credit API surface — there is **no** money-movement endpoint; every payment/cancel/refinance is a recommendation or a user-confirmed state write.
- **Withhold safety (SC-C-002)**: assert 0 early-payment amounts or refinance money deltas are ever emitted on a stale/missing money input; such cases render the Withheld Card.
- **Cross-member authZ (SC-C-009 / Threat Model)**: API-layer (not UI) IDOR test proves 0 cross-member credit-data exposure; a request for another member's score/factors/coaching without a `MemberScope` grant is **denied server-side and audited** (`cross_member_access_denied`); the "kid" role sees no other member's credit data.
- **Soft-pull only (SC-C-011)**: assert the module initiates 0 hard credit inquiries.
- **Audit trail (Principle VI)**: `recommendation_shown` / `plan_acknowledged` / `refinance_signal_dismissed` / `playbook_step_done` produce append-only `AuditEvent`s, idempotent on `source_event_id`, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no bureau PII, balances, or payment amounts.
- **Idempotency (FR-X-003)**: a replayed acknowledgement/dismissal event does not double-apply (`UNIQUE` on `source_event_id`).
- **Residency/retention (FR-X-020 / FR-X-013/019)**: bureau-derived data is Canadian-region; deletion/dormant cascade crypto-shreds per-subject keys; the bureau subprocessor is Canadian-region-or-disclosed (go-live gate).
- **Performance (SC-010)**: module-switch into Credit renders the cached Monitor read-model in ≤ 300 ms; cache miss/stale renders a flagged/withheld state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual screen-reader labels on every value and control; the score gauge renders its final state under reduced motion.

## Done when

All four user-story validations pass, the four money fixtures (early-payment, band-boundary, FX-converted balance, refinance net-delta) show zero cent slippage, all consumer (6) + provider (4) contract tests are green, the cross-member IDOR test shows 0 exposure with audited denials, and the cross-cutting checks hold.

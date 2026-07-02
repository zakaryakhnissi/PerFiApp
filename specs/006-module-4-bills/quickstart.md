# Quickstart & Validation: Module 4 — Bills & Subscriptions

**Feature**: `006-module-4-bills` | **Date**: 2026-06-29

A run/validation guide proving Bills works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in [tasks.md](./tasks.md); this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `TransactionStream` (with `is_recurring` hints + `cad_amount` + dedup/pending state), `MerchantGraph` (with `is_subscription_like`), `BudgetState`, `CashFlowForecast`, `GoalState`. `SafeToActSignal` (Module 3) optional — its consumer is **feature-checked** (spec C-1).
- Seeded fixtures: a `TransactionStream` with recurring charges (incl. a foreign-currency subscription and a `suspected_duplicate`/`pending` row), a curated category→necessity mapping sample, a `CashFlowForecast` (fresh + a stale variant), a `GoalState` node, and a free-trial signal.
- Toolchain per the ratified platform stack ([platform-decisions.md](../_platform/platform-decisions.md) §2): TypeScript/NestJS + RN/Expo, `@finos/money`/`@finos/format`, Pact, Jest, Testcontainers Postgres. Commands below are illustrative — adjust to the ratified scripts.

## Setup

```bash
# from repo root
pnpm install
pnpm run seed:bills-fixtures      # tx stream, merchant graph, budget, forecast, goal, trial
```

## Validation by user story

### US1 — Subscription Radar: recurring charges detected & categorized (P1) 🎯 MVP

```bash
pnpm test bills/unit/recurrence
pnpm test bills/integration/subscription-radar
```

Expected:
- Each recurring charge in `TransactionStream` appears **once** as a `RecurringSeries`, categorized **essential / negotiable / nice-to-have**, with monthly + annualized CAD impact, each carrying a `FreshnessStamp` (SC-B-001).
- **Money fixture (mandatory)**: a `$12.99`/month subscription → annualized `$155.88` (`1299 × 12 = 18 588` cents) — exact, no slippage (SC-B-004).
- **Double-count fixture (mandatory)**: a series whose underlying rows include a `suspected_duplicate`/`pending` row **excludes** those rows from `monthly_impact_cents` — the subscription is never double-counted (SC-B-004).
- **Foreign-currency fixture (mandatory)**: a USD subscription is valued in CAD from the spine's already-FX-converted `cad_amount` — Bills performs **no** FX of its own (no second rounding boundary).
- A user re-classification persists with `classification_source = user_override` and wins over the inferred default (FR-BILL-001).
- A stale `TransactionStream` renders detected amounts/impacts **flagged stale**, not shown as current (SC-B-005).
- fr-CA locale renders `12,99 $` / `155,88 $` (SC-B-006).

### US2 — Bill Calendar with runway-aware safe-to-pay dates (P1)

```bash
pnpm test bills/unit/safe-to-pay
pnpm test bills/integration/bill-calendar
```

Expected:
- Each upcoming bill shows its **due date** and a predicted **safe-to-pay date** derived from `CashFlowForecast` (FR-BILL-003).
- **Withhold check (mandatory)**: with a **stale/missing** `CashFlowForecast` (a primary money input), `safe_to_pay_status = withheld`, `safe_to_pay_on = null`, the due date still shows, and the user is told the forecast is unavailable — the date is **never guessed** (SC-B-005, Constitution VI/VIII).
- A bill whose safe-to-pay date would fall **after** its due date (or `shortfall_flag = true`) is flagged `at_risk` and the conflict is surfaced (Cash Safety precedence) — not silently shown as "pay later".
- With `SafeToActSignal` present (feature-checked), overdraft risk **overrides** the pay-timing suggestion; `safe_to_pay_source = safe_to_act_signal`; the Conflict Banner names both signals + the resolution rule.
- A bill with irregular cadence renders with an "estimated / cadence uncertain" marker, never a confident date.

### US3 — Free-Trial Guard: keep/cancel before conversion (P2)

```bash
pnpm test bills/unit/free-trial
pnpm test bills/integration/free-trial-guard
```

Expected:
- A trial with a known `converts_on` within the alert window (default 3 days, C-4) surfaces a countdown + one-tap keep/cancel prompt **before** the charge date, showing the post-conversion CAD cost (SC-B-007).
- A trial with an unknown conversion date renders `converts_on_is_estimated = true` ("conversion date estimated"), never a confident date.
- Tapping "cancel" surfaces the **guided** cancellation action (Bills does **not** cancel on the user's behalf), records the keep/cancel decision **idempotently** (replay = no-op), and writes an `AuditEvent` (SC-B-009).
- The free-trial alert routes through the **Inbox digest** pipeline with a `priority_tier` + bilingual payload — no standalone push (SC-009).

### US4 — Cancellation & Negotiation with savings & goal impact (P2)

```bash
pnpm test bills/unit/savings
pnpm test bills/integration/cancellation-negotiation
```

Expected:
- A cancellation/negotiation shows projected **monthly + annualized savings (CAD)** and the **time-to-goal** contribution via a Confirm-Action sheet **before** the user confirms (FR-BILL-004, FR-X-004).
- **Negotiation fixture (mandatory)**: reducing an `$89.99` bill by `25%` → new monthly `$67.49` (`8999 × 0.75 = 6749.25 → 6749` cents, **half-up once**) and annualized savings `$270.00` (`(8999 − 6749) × 12 = 27 000` cents) — single rounding boundary, exact annualization (SC-B-004).
- Time-to-goal impact is sourced from `GoalState` pace — **never recomputed** in Bills.
- Confirming records the action + projected savings in the append-only audit trail; the write is **idempotent** and safe to retry (SC-B-009).
- An `essential`-classified series is **never** offered cancellation (negotiation may still apply) — Bills never nudges cancelling a genuinely essential service (FR-BILL-001).
- A negotiation "help" request produces a **bilingual** script/draft as informational decision support — never represented as FinOS contacting the merchant (FR-X-003).

## Contract tests (mandatory — Principle VII / SC-B-010)

```bash
pnpm test bills/contract/consumed   # TransactionStream, MerchantGraph, BudgetState, CashFlowForecast, GoalState, SafeToActSignal
pnpm test bills/contract/provided   # SubscriptionInventory, BillCalendar, RecurringObligations, FreeTrialExpiry
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken **consumed** schema **fails CI** and disables the dependent Bills behavior (version-skew → disable, not serve on a mismatched schema, SC-012). The pending `SafeToActSignal` consumer is feature-checked: its absence degrades safe-to-pay precedence to `CashFlowForecast.shortfall_flag`, never blocks the build.

## Cross-cutting checks

- **Recommend-only (SC-B-009 / FR-X-003)**: grep the Bills API surface — there is **no** money-movement, cancellation-execution, scheduling, or merchant-contact endpoint; every action is a recommendation or a user-confirmed, guided state write.
- **Audit trail (Principle VI)**: `trial_kept` / `trial_cancelled` / `cancellation_confirmed` / `negotiation_confirmed` / `series_classified` / `series_dismissed` produce append-only `BillsAuditEvent`s keyed on `source_event_id`, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no PII, monetary values, or merchant descriptors.
- **Profile safety (SC-B-011)**: API-layer authorization tests prove 0 cross-profile bills/subscription exposure; a denied cross-profile read (via Household `MemberScope`) is **audited**; UI filtering alone does not satisfy.
- **Email-purge cascade (FR-X-013)**: an email-sourced subscription enrichment is purged within 7 days of revocation; Bills holds no copy that escapes the cascade.
- **Performance (SC-010)**: module-switch into Bills renders the cached inventory/calendar in ≤ 300 ms; cache miss/stale renders a flagged/withheld state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA; bilingual screen-reader labels on every value, chip, card, and CTA; ≥ 44×44 pt tap targets; reduced-motion countdown.

## Done when

All user-story validations pass, the money fixtures (annualize, double-count exclusion, foreign-currency reuse, half-up negotiation) show zero slippage, the safe-to-pay date is withheld (never guessed) on stale/missing runway, all consumer+provider contract tests are green, and the cross-cutting checks hold.

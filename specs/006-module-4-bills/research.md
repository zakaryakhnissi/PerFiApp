# Phase 0 Research: Module 4 — Bills & Subscriptions

**Feature**: `006-module-4-bills` | **Date**: 2026-06-29

Resolves the Bills-specific technical decisions the design depends on. **Platform-stack choices are inherited from [`specs/_platform/platform-decisions.md`](../_platform/platform-decisions.md) (ratified) and are NOT re-litigated here** — TypeScript modular monolith (NestJS + RN/Expo), `@finos/money` (integer cents + `decimal.js`), PostgreSQL `ca-central-1` schema-per-module + RLS, append-only `audit.event_log`, BullMQ ingestion workers, `@finos/format` locale rendering, Pact contract tests, all per that document. This module is one NestJS bounded context (`BillsModule`) consuming the spine via contract clients only. Module-specific vendor/source items are flagged as **OPEN (non-blocking)** and handed to planning/ops.

---

## 1. Recurrence detection & series modeling

**Decision**: Bills **owns the recurring-charge model** (grouping transactions into a `RecurringSeries`, inferring cadence/amount/next-charge-date, necessity classification) and **consumes** the spine's per-transaction `is_recurring` and per-merchant `is_subscription_like` hints from `TransactionStream` / `MerchantGraph`. It does **not** re-run merchant normalization or transaction dedup — those are the spine's. Cadence is inferred from the spacing of a merchant's transactions; too-few/irregular observations ⇒ `cadence = irregular|unknown` with estimated dates.

**Rationale**: Principle VII (single canonical spine; no duplicated normalization/dedup) + Principle IX (don't rebuild what the spine provides). The spine already de-dups and flags recurrence; Bills adds only the higher-level model nobody else owns.

**Alternatives considered**: Re-detect recurrence from raw `AccountState`/bank descriptors in Bills — rejected (duplicates spine normalization, risks divergence). Treat every `is_subscription_like` merchant as a confirmed subscription with no cadence inference — rejected (misses cadence/amount and over-reports one-offs).

---

## 2. Money arithmetic & rounding

**Decision**: Recurring amounts, monthly/annualized impacts, trial costs, and projected savings are **integer minor units (CAD cents)** via `@finos/money`. `annualized = monthly_cents × 12` is exact integer multiplication. A negotiation reduction expressed as a decimal fraction is computed in arbitrary precision (`decimal.js`) and rounded **half-up to the cent once** at the storage/display boundary. Foreign-currency subscriptions reuse the spine's already-FX-converted `cad_amount` (integer cents) — Bills performs **no** FX of its own.

**Rationale**: Constitution Principle IV (NON-NEGOTIABLE) + FR-X-002. Reusing the spine's `cad_amount` keeps one FX path (the spine's), avoiding a second rounding boundary and a divergent rate.

**Alternatives considered**: Float for impacts/savings — constitutionally prohibited. Re-FX foreign subscriptions in Bills — rejected (duplicate rate source, double rounding, drift).

---

## 3. Safe-to-pay date source (Cash Safety not yet shipped)

**Decision**: Derive the predicted **safe-to-pay date** from the spine's ratified `CashFlowForecast` (`finos:spine/CashFlowForecast/1.0.0` — `runway_days`, `projected_lowest_balance`, `projected_lowest_on`, `shortfall_flag`), which the umbrella maps to "RunwayForecast" (FR-CORE-003). Wire the richer `SafeToActSignal` **precedence override** behind a feature check, consumed once Module 3 (Cash Safety) ships its contract. A stale/missing `CashFlowForecast` (a primary money input) **withholds** the safe-to-pay date — never guessed.

**Rationale**: Spec C-1. `CashFlowForecast` is ratified today; `SafeToActSignal` has no spec yet. This mirrors how Module 1 Rewards handles its not-yet-shipped `SafeToActSignal` dependency (Rewards research §8) — independently shippable now, hardened when Cash Safety lands.

**Alternatives considered**: Block the calendar entirely until Cash Safety ships — rejected (Bills is independently shippable per its Independent Test). Guess a safe-to-pay date from balance alone without the forecast — rejected (violates Fresh-or-Flagged; a money guess).

**OPEN (non-blocking)**: exact `SafeToActSignal` `$id`/version (provisional `finos:cashsafety/SafeToActSignal/1.0.0`) confirmed when Module 3 publishes it.

---

## 4. Necessity-classification dataset

**Decision**: A **curated, versioned, Canada-first category → necessity mapping** (essential / negotiable / nice-to-have) behind a `NecessityClassifier` interface. New series default to `nice_to_have` unless the merchant category maps to a curated essential (housing/utilities/insurance/telecom-baseline) or negotiable (telecom over-baseline, gym, some insurance) list (spec C-3). Classification is **inferred** and always **user-overridable** (`user_override` wins).

**Rationale**: FR-BILL-001 (Canada-first) + Principle VII (versioned dataset caught by contract tests) + Principle VI (user override is an explainable, auditable correction over the heuristic).

**Alternatives considered**: Hard-coded category rules in code — rejected (not refreshable, no version semantics). ML-only classification for MVP — rejected (Principle IX; a curated mapping ships first, a model can swap in behind the interface later).

**OPEN (non-blocking)**: concrete Canadian category→necessity mapping + update cadence (curated in planning).

---

## 5. Free-trial detection & alert window

**Decision**: Free trials are inferred from transaction/merchant signals (e.g. a $0 / trial-marked authorization followed by a scheduled charge) and/or email signals via the spine/Inbox, behind a `TrialDetector` interface. Default alert window **3 days** before `converts_on` (user-adjustable, C-4). Unknown conversion dates ⇒ `converts_on_is_estimated = true`, surfaced as soon as detected and marked "estimated", never confident.

**Rationale**: FR-BILL-002 + Fresh-or-Flagged. A 3-day default gives time to act without nagging; estimating-not-asserting honors Principle VIII for an unknown date.

**Alternatives considered**: A single fixed window for everyone with no estimation flag — rejected (asserts a date that may be wrong). Email-only detection — rejected (many trials are visible in the transaction stream; email is one signal, subject to the FR-X-013 purge).

**OPEN (non-blocking)**: concrete trial-detection signal mix + the email-signal subprocessor (inherits platform NR-6: Canadian-region or disclosed; retains only sender identity + classifications, never raw bodies).

---

## 6. Cancellation / negotiation: guided, never executed

**Decision**: "One-tap cancellation" surfaces a **guided** action — a deep link to the merchant's known cancellation page (from a curated dataset) or a bilingual cancellation/negotiation **script/draft** — and records the user's decision/outcome. FinOS never cancels, contacts the merchant, or moves money on the user's behalf (Constitution IV / FR-X-003). Every such action routes through a Confirm-Action sheet (UX §2.2) and is written idempotently to the audit trail.

**Rationale**: Constitution IV recommend-only clause + FR-X-003 + UX §2.2. The savings/goal impact is decision support, framed as an estimate, not a guarantee or regulated advice.

**Alternatives considered**: Automated cancellation via a third-party "cancel-for-you" API — rejected (executes a consequential action on the user's behalf; out of bounds for FinOS recommend-only). Negotiation bot that contacts the merchant — rejected for the same reason.

**OPEN (non-blocking)**: coverage of the curated cancellation-deep-link / negotiation-script dataset (curated in planning).

---

## 7. Savings & goal-impact model

**Decision**: Cancellation savings = the series' recurring CAD amount, monthly and annualized (`× 12`), integer cents. Negotiation savings = `recurring_amount × reduction_rate` (arbitrary precision, half-up once). Goal impact (time-to-goal delta) is sourced from `GoalState` pace — **never recomputed** in Bills. All savings are framed as **estimates**.

**Rationale**: FR-BILL-004 + FR-X-004 (CAD + time-to-goal) + Principle I (single source of truth for goal pace). Recomputing pace in Bills would risk divergence from the spine (umbrella Integration principle).

**Alternatives considered**: Recompute time-to-goal in Bills from raw balances — rejected (duplicates spine goal math, risks divergence).

---

## 8. Staleness-threshold defaults

**Decision**: Ship Canada-oriented default staleness windows, user-adjustable (spec C-8): transactions/recurrence **24 h**; runway forecast **24 h** (inherits balance freshness); budget **24 h**; FX for foreign subscriptions **1 h** (inherited from the spine's converted `cad_amount`). The mechanism (per-value `FreshnessStamp` + threshold) is fixed; exact values confirmed in the Module 0 ops/PIA review.

**Rationale**: FR-X-008 / SC-B-005. Concrete behavior for tests now; final tuning to ops.

**OPEN (non-blocking)**: final windows confirmed in the Module 0 PIA (platform NR-2).

**Alternatives considered**: Single global threshold — rejected (FX moves far faster than a slow-moving subscription cadence).

---

## 9. Notification routing

**Decision**: All Bills alerts (free-trial converting, bill due tomorrow, at-risk bill) are emitted to the **Inbox digest pipeline** (Module 10) with a `priority_tier` and bilingual `payload`; Bills sends **no** standalone push (UX §6.3). Until Inbox ships, alerts surface in-tab only.

**Rationale**: SC-009 / FR-INB-002 / UX §6 (Inbox owns notification discipline; ≤2 money pushes/day). A module calling a push API directly is non-compliant.

**Alternatives considered**: Direct push from Bills — rejected (violates the notification budget and ownership rule).

---

## 10. Performance: ≤ 300 ms module-switch

**Decision**: Maintain a local, freshness-stamped cache of the inventory and calendar on the mobile client; detection/projection run in BullMQ workers, not on the hot path. A cache miss or stale-beyond-threshold value triggers a flagged/withheld state rather than a blocking fetch.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget (mirrors Rewards research §9).

**Alternatives considered**: Always-live recurrence detection on tab open — rejected (blows the budget); serve stale silently — rejected (Principle VIII).

---

## 11. Contract testing approach

**Decision**: Consumer-driven (Pact) contract tests for each consumed contract (`TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `GoalState`, and `SafeToActSignal` once published) and provider contract tests for each provided contract (`SubscriptionInventory`, `BillCalendar`, `RecurringObligations`, `FreeTrialExpiry`), running in CI; contracts semver'd with a deprecation window.

**Rationale**: Principle VII + FR-X-011 + SC-B-010. Version skew disables the dependent behavior (umbrella edge case) instead of serving on a mismatched schema.

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (not blocking design)

- Final Canadian category→necessity mapping + update cadence (§4).
- Cancellation-deep-link / negotiation-script dataset coverage (§6).
- Free-trial detection signal mix + email-signal subprocessor residency (§5; platform NR-6).
- Exact staleness-window and dormant-account retention values (§8; Module 0 PIA, platform NR-2 / FR-X-019).
- Confirmation of the `SafeToActSignal` `$id`/version once Module 3 (Cash Safety) publishes it (§3).

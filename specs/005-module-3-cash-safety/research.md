# Phase 0 Research: Module 3 — Cash Safety & Autopilot

**Feature**: `005-module-3-cash-safety` | **Date**: 2026-06-29

Resolves the technical decisions the Cash Safety design depends on. Platform-stack choices (language, storage, mobile framework, money library, contract tooling, audit store, residency, CI gates) are **inherited from** [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are **not** re-litigated here. This module introduces **no new external vendor** — it computes entirely on spine-provided, already-freshness-stamped data — so the open items below are parameter/tuning decisions, all non-blocking.

---

## 1. Runway derivation: consume the spine forecast, don't re-forecast

**Decision**: Cash Safety **consumes** `finos:spine/CashFlowForecast/1.0.0` (projected balances, lowest point, runway days, shortfall flag, method) and **derives** the user-facing `RunwayForecast` by applying the user-adjustable **safety buffer**, composing the ranked **micro-action plan**, and attaching the verdict semantics other modules consume. It does **not** re-aggregate balances or re-implement forecasting.

**Rationale**: Integration-First (Principle I) and the "single canonical spine" architecture (platform-decisions §3): two forecasts would diverge and produce conflicting runway numbers across modules. The spine already owns the heavy forecast query (platform-decisions NR-5).

**Alternatives considered**: Re-forecast inside Cash Safety from `AccountState` + `TransactionStream` — rejected (duplicates spine logic, divergence risk, violates the spine-isolation boundary).

---

## 2. The runway is a MONEY output (withhold on stale), not a guardrail

**Decision**: Treat the runway / `SafeToActSignal` as **money outputs**. A stale or missing starting balance or `CashFlowForecast` ⇒ **withhold** (Withheld state; `verdict = withheld`). The v2.2.0 documented-default exception (Principle VI) does **not** apply — it covers only a missing **secondary guardrail** that can never originate a money figure, which the runway plainly does.

**Rationale**: Constitution VIII ("no runway calculation on a multi-day-old balance") and the v2.2.0 exception's own carve-out (missing/stale money inputs MUST still withhold). The exemplar Rewards module applies the same line: balances/valuations withhold; only `CreditState` utilization uses the default.

**Alternatives considered**: Compute a "best-effort" runway on a stale balance with a flag — rejected (confident advice from stale data is worse than no advice; Principle VIII rationale).

---

## 3. CreditState due-date risk is the only secondary guardrail here

**Decision**: `CreditState` is consumed **only** to prioritize *which* predicted shortfall is most urgent (statement `due_date_risk` / due dates) — a secondary guardrail. **Entirely absent** ⇒ Cash Safety proceeds without the due-date urgency boost (no flag), per the v2.2.0 documented-default exception. **Present but stale** ⇒ the due-date context is flagged and not reasoned on. The runway itself never depends on credit being present.

**Rationale**: Mirrors the constitutional treatment of utilization in Rewards (secondary guardrail ⇒ default-on-absence). Due-date urgency only *re-ranks* micro-actions; it never originates a money figure, so its absence is safe to default.

**Alternatives considered**: Withhold the runway when credit is absent — rejected (over-withholds; credit is not a money input to the runway). Hard-require bureau data — rejected (most users connect accounts before credit).

---

## 4. Provided-contract set: RunwayForecast, SafeToActSignal, RoundupProposal

**Decision**: Provide three contracts: `RunwayForecast` and `SafeToActSignal` (both in the umbrella Provides list) plus `RoundupProposal` (so Habits can consume `RoundupProposals` per the Module 8 Consumes list, and so US3 has a versioned, idempotent, audited proposal object). `RoundupRule` stays **module-internal** (it is configuration, not cross-module data).

**Rationale**: Principle VII (cross-module data flows only through versioned contracts) + the umbrella Consumes/Provides links. Habits explicitly consumes `RoundupProposals`; without a published contract that link has no provider.

**Alternatives considered**: Expose `RoundupRule` cross-module — rejected (YAGNI / Principle IX; no consumer needs the rule, only the proposal). Fold roundups into `RunwayForecast` — rejected (different lifecycle, idempotency, and consumer).

---

## 5. SafeToActSignal precedence encoded as `precedence_rank = 1`

**Decision**: Encode conflict precedence **in the contract** as `precedence_rank` (const 1). Consuming modules resolve conflicts against the rank and the ux-foundations §10.4 ordering, rather than each hard-coding "Cash Safety wins."

**Rationale**: The precedence rule is constitutional/UX-canonical (umbrella "Conflicting recommendations" edge case; ux-foundations §4.4/§10.4), and putting it on the wire makes the Conflict Banner deterministic and contract-testable instead of re-implemented per consumer.

**Alternatives considered**: Leave precedence implicit and document-only — rejected (each consumer re-deriving the rule is drift-prone and not contract-testable).

---

## 6. Roundup amount: integer-cents modular arithmetic, never float

**Decision**: Compute the roundup amount as `(round_to_cents - (txn_amount_cents mod round_to_cents)) mod round_to_cents` in **integer cents** — exact, with no decimal step and no float. The outer `mod` makes an exact-multiple purchase yield `0` (no sweep), not a full target.

**Rationale**: Principle IV (NON-NEGOTIABLE). Roundup is the only money *write* path in the module; integer modular arithmetic is exact and trivially fixture-guarded (`$4.30`→$1 ⇒ 70¢; `$4.00`→$1 ⇒ 0¢; `$23.40`→$5 ⇒ 160¢).

**Alternatives considered**: Decimal subtraction then round — rejected (unnecessary; integers are already exact and avoid any rounding question). Float — constitutionally banned.

---

## 7. Idempotency: source_event_id on every write

**Decision**: Key every state write (confirmed roundup, confirmed micro-action, paused-rule transition) on the triggering `source_event_id` with a UNIQUE constraint (platform-decisions §4). A replayed trigger returns the existing proposal/record; a replayed confirmation no-ops.

**Rationale**: Principle IV ("any state FinOS writes ... MUST be idempotent and safe to retry") + umbrella US3 scenario 5. Aggregation/webhook retries are expected on the ingestion path.

**Alternatives considered**: De-dupe on `(rule_id, transaction_id, day)` — rejected (the trigger event id is the precise, provider-agnostic key already used platform-wide).

---

## 8. Graceful degradation when Bills (P2) is unshipped

**Decision**: The `move_bill_date` micro-action depends on `BillCalendar` (Module 4, P2). Wire the `BillCalendar` consumer behind a **feature check**; until Bills ships, omit `move_bill_date` from `micro_actions` — the other micro-action kinds (`pause_roundup`, `resequence_payments`, `transfer_from_savings`, `reduce_discretionary`) still close gaps.

**Rationale**: FR-X-012 (graceful degradation) + phased delivery (Cash Safety is P1, Bills is P2). Cash Safety must be independently shippable per its Independent Test.

**Alternatives considered**: Block the micro-action engine until Bills exists — rejected (breaks independent shippability and the P1 safety floor).

---

## 9. Recommend-only & no-credit enforcement

**Decision**: The `micro_actions.kind` enum is **closed** with no cash-advance/loan/credit value; `RoundupProposal.destination` and `MicroAction` are proposals routed through the Confirm-Action sheet and never executed. A **contract/provider test** asserts no cash-advance or credit-origination action is ever emitted (FR-CASH-002), and an **API-shape test** asserts no money-movement endpoint exists.

**Rationale**: Constitution IV (recommend-only) + FR-CASH-002 (no credit origination) + umbrella Out of Scope (Cash Advance Lite removed). Encoding the prohibition in the closed enum makes a regression a failing test, not a review catch.

**Alternatives considered**: An open `kind` string with a denylist — rejected (a closed enum is safer and self-documenting).

---

## 10. Performance: ≤ 300 ms runway/tab-switch

**Decision**: Maintain a locally cached, freshness-stamped `RunwayForecast` on the mobile client; the tab and consuming-module `SafeToActSignal` checks read the cached runway, refreshed in the background. A cache miss or stale-beyond-threshold value triggers the Loading/Withheld state rather than a blocking network fetch on the hot path.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget (mirrors the Rewards approach, platform-decisions §6).

**Alternatives considered**: Always-live fetch on tab open — rejected (blows the 300 ms budget); serve stale silently to hit latency — rejected (violates Principle VIII).

---

## 11. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed contract (`CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, `CreditState`, `BillCalendar`) and provider contract tests for each provided contract (`RunwayForecast`, `SafeToActSignal`, `RoundupProposal`), running in CI (Pact; platform-decisions §6). Contracts semver'd with a deprecation window; version skew disables the dependent output.

**Rationale**: Principle VII + FR-X-011 + SC-CASH-008. Includes the FR-CASH-002 "no cash-advance action" assertion as a provider test on `RunwayForecast.micro_actions`.

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (not blocking design)

- **Safety-buffer default** — concrete Canada-oriented default dollar floor for `safety_buffer` (user-adjustable). Set in the Module 0 plan / PIA (platform-decisions NR-2).
- **Balance-staleness window** — the exact `staleness_threshold_seconds` for balances that gates runway withholding (platform-decisions NR-2). The mechanism (withhold on stale) is fixed; the number is ops-tuned.
- **Roundup destination accounts** — whether `debt_paydown`/`tfsa`/`savings`/`goal` destinations map to specific user accounts requires the user's account selection at rule-creation time (UX flow detail for the plan).
- **Micro-action ranking weights** — the disruption tie-break ordering may be tuned against SC-CASH-003 (avoided-overdraft rate) in usability testing; the default ordering is fixed in data-model.md.
- **Notification thresholds** — the balance level that triggers a Critical "predicted overdraft today" Inbox alert vs an Important digest item (ux-foundations §6.1) is tuned with Inbox (Module 10).

# Feature Specification: Module 4 — Bills & Subscriptions

**Feature Branch**: `006-module-4-bills`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 4 — Bills & Subscriptions (Priority: P2)"; functional requirements FR-BILL-001..004 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Structure and quality bar mirror the gold-standard exemplar Module 1 Rewards ([specs/002-module-1-rewards/](../002-module-1-rewards/)).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Bills & Subscriptions** tab only. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** spine contracts (`TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `GoalState`) and does not re-implement aggregation, normalization, budgeting, or runway forecasting. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Bills behavior.
>
> **Recurrence detection ownership (boundary with Module 0)**: The spine already exposes per-transaction recurrence hints (`TransactionStream.transactions[].is_recurring`) and merchant subscription hints (`MerchantGraph.merchants[].is_subscription_like`). Bills **consumes** these hints and is the **owner** of the higher-level *recurring-charge model* — grouping transactions into a `RecurringSeries`, inferring cadence/amount/next-charge-date, and the essential/negotiable/nice-to-have classification. Bills does not re-run merchant normalization or transaction dedup — those are the spine's.
>
> **Boundary with Module 5 (Pay)**: Bills owns the **bill calendar, subscription inventory, free-trial guard, and cancellation/negotiation tracking**. It does **not** own payment **sequencing** across the month, the best-card/account-at-checkout decision, or scheduling logic — those are Pay, which *consumes* Bills' `BillCalendar`/`RecurringObligations` and *provides* `PaymentSchedule` back. Bills annotates each bill with a **predicted safe-to-pay date** derived from the spine runway; Pay decides the actual payment order.
>
> **Recommend-only**: FinOS never moves money (Constitution IV, FR-X-003). A "one-tap cancellation/negotiation" is a *recommendation plus a guided, user-executed action* (open the merchant's cancellation page, generate a negotiation script/draft, record the outcome) — Bills never cancels a subscription or pays a bill on the user's behalf.

## User Scenarios & Testing *(mandatory)*

Bills & Subscriptions turns the spine's raw transaction stream into a calm, actionable picture: every recurring charge surfaced and categorized by necessity and budget impact, every free trial guarded before it converts, and every due date on a calendar annotated with a runway-aware safe-to-pay date — with cancellation/negotiation savings shown in CAD and time-to-goal.

### User Story 1 - Subscription Radar: recurring charges detected & categorized (Priority: P1)

A user connects accounts and sees every recurring charge automatically detected from the transaction stream, grouped into a subscription/bill inventory, and categorized **essential / negotiable / nice-to-have** with each one's monthly and annualized budget impact in CAD.

**Why this priority**: It is the first visible payoff of the Bills tab and the foundation every other story builds on (the calendar, free-trial guard, and cancellation tracker all reason over the detected inventory). It delivers standalone value the moment one account is connected, and it is the module's Independent Test anchor.

**Independent Test**: With at least one account connected and recurring charges present in `TransactionStream`, open the Subscription Radar and confirm each detected recurring charge appears once, is categorized essential/negotiable/nice-to-have, and shows its monthly + annualized CAD impact with a freshness stamp.

**Acceptance Scenarios**:

1. **Given** recurring charges in the transaction stream, **When** the radar runs, **Then** each is listed once as a `RecurringSeries` and categorized essential / negotiable / nice-to-have with its monthly and annualized budget impact (CAD). *(FR-BILL-001)*
2. **Given** a merchant the spine flags `is_subscription_like` with a regular cadence, **When** the radar runs, **Then** it is detected as a subscription even if the user never tagged it. *(FR-BILL-001)*
3. **Given** an fr-CA user, **When** a monthly impact is displayed, **Then** it is formatted `12,99 $` (comma decimal, space thousands, trailing symbol), not `$12.99`. *(FR-X-005)*
4. **Given** a detected series whose default necessity classification is wrong for this user, **When** the user re-classifies it, **Then** the user override is persisted (tagged `classification_source = user_override`) and wins over the inferred default. *(FR-BILL-001)*
5. **Given** `TransactionStream` is stale beyond its threshold, **When** the radar renders, **Then** detected amounts/impacts are flagged stale (or the impacted figure withheld) rather than shown as current. *(FR-X-008)*
6. **Given** a series whose underlying transactions include a `suspected_duplicate` or `pending` row, **When** budget impact is computed, **Then** those rows are excluded from the money math (the spine already suppresses `merged_duplicate`), so a subscription is never double-counted. *(spine dedup edge case)*

---

### User Story 2 - Bill Calendar with runway-aware safe-to-pay dates (Priority: P1)

The user sees all upcoming bills and recurring charges on a calendar, each annotated with its due date **and** a predicted safe-to-pay date derived from the spine's runway forecast, so they know when a payment is safe without risking an overdraft.

**Why this priority**: This is the umbrella module's headline Independent Test ("see them on a bill calendar with predicted safe-to-pay dates"). It is the clearest expression of Integration-First for this module — a due date in isolation is just a reminder; a *safe-to-pay* date is grounded in real runway.

**Independent Test**: With recurring obligations detected and a fresh `CashFlowForecast` available, open the calendar and confirm each upcoming bill shows its due date and a predicted safe-to-pay date; confirm that when the runway forecast is stale or missing the safe-to-pay annotation is withheld (not guessed).

**Acceptance Scenarios**:

1. **Given** a bill with a known due date and a fresh runway forecast, **When** the calendar renders, **Then** it shows the due date **and** a predicted safe-to-pay date derived from `CashFlowForecast`. *(FR-BILL-003)*
2. **Given** the runway forecast (`CashFlowForecast`, a primary money input) is stale or missing, **When** the calendar renders, **Then** the safe-to-pay annotation is **withheld** (the bill still shows its due date) and the user is told the forecast is unavailable — it never guesses a safe-to-pay date. *(FR-X-008, Constitution VI)*
3. **Given** a bill whose safe-to-pay date would fall **after** its due date (runway can't safely cover it before it's due), **When** the calendar renders, **Then** the bill is flagged as an at-risk / shortfall bill and the conflict is surfaced (Cash Safety precedence), not silently shown as "pay later". *(FR-X-001, conflict precedence)*
4. **Given** Cash Safety's `SafeToActSignal` (when present) flags overdraft risk on a proposed pay-now action, **When** the calendar would suggest paying, **Then** `SafeToActSignal` takes precedence and the conflict + resolution are surfaced via the Conflict Banner. *(umbrella cross-module edge case)*
5. **Given** a bill with no reliable predicted due date (irregular cadence), **When** the calendar renders, **Then** it is shown with an "estimated / cadence uncertain" marker rather than a confident date. *(edge case)*

---

### User Story 3 - Free-Trial Guard: keep/cancel before conversion (Priority: P2)

The user has free trials tracked as first-class objects with a countdown to the auto-conversion date; before a trial converts to a paid charge, a one-tap keep/cancel prompt is surfaced (routed through the Inbox digest), with the post-conversion CAD cost shown.

**Why this priority**: High savings impact and a signature "guard" feature, but the inventory (US1) and a working notification path must exist first; it is independently valuable once a trial is detected.

**Independent Test**: With a free trial detected and its conversion date within the alert window, confirm a countdown and a one-tap keep/cancel prompt are surfaced before the charge date, showing the CAD cost that will apply on conversion.

**Acceptance Scenarios**:

1. **Given** a detected free trial nearing its auto-conversion date, **When** it enters the alert window, **Then** a countdown and a one-tap keep/cancel prompt are surfaced **before** the charge date, showing the post-conversion CAD cost. *(FR-BILL-002)*
2. **Given** a trial whose exact conversion date is unknown, **When** it is tracked, **Then** it is marked "conversion date estimated" with the basis for the estimate, never presented as a confident date. *(edge case)*
3. **Given** the user taps "cancel" on a trial, **When** the cancellation flow runs, **Then** Bills surfaces the guided cancellation action (it does **not** cancel on the user's behalf), records the user's keep/cancel decision idempotently, and writes an audit event. *(FR-X-003, FR-X-007)*
4. **Given** a free-trial alert, **When** it is delivered, **Then** it routes through the Inbox digest pipeline (Module 10) rather than as a standalone push, respecting the notification budget. *(SC-009, FR-INB-002)*

---

### User Story 4 - Cancellation & Negotiation with savings & goal impact (Priority: P2)

The user initiates a cancellation or negotiation on a recurring charge and sees the projected savings in CAD **and** the downstream effect on their goals (time-to-goal), before confirming; the action and its outcome are recorded for audit.

**Why this priority**: This is where the module captures real, measurable savings (umbrella SC-004: ≥10% recurring-spend reduction). It depends on the inventory (US1) and the savings/goal math, so it lands after the radar and calendar.

**Independent Test**: With a negotiable/nice-to-have subscription, initiate a cancellation/negotiation and confirm the projected monthly + annualized savings (CAD) and the time-to-goal impact are shown before the user confirms, and that confirming records the action for audit.

**Acceptance Scenarios**:

1. **Given** a cancellation or negotiation on a recurring charge, **When** the user initiates it, **Then** projected monthly + annualized savings (CAD) **and** the time-to-goal contribution are shown via a Confirm-Action sheet before the user confirms. *(FR-BILL-004, FR-X-004)*
2. **Given** the user confirms the action, **When** it completes, **Then** the action and its projected savings are recorded in the append-only audit trail; the write is idempotent and safe to retry. *(FR-BILL-004, FR-X-007, FR-X-003)*
3. **Given** a negotiation, **When** the user requests help, **Then** Bills generates a bilingual negotiation script/draft as informational decision support (never represented as FinOS contacting the merchant on the user's behalf). *(FR-X-003, not-regulated-advice framing)*
4. **Given** a subscription classified essential, **When** the user opens it, **Then** a cancellation is not recommended (negotiation may still be offered), so the module never nudges cancelling a genuinely essential service. *(FR-BILL-001, Integration-First)*
5. **Given** a confirmed cancellation, **When** the projected savings would change the goal pace, **Then** the new time-to-goal is shown, sourcing pace from `GoalState` (never recomputed here). *(FR-X-004)*

---

### Edge Cases

- **Empty / no connectivity**: With no accounts connected, the Radar and Calendar show the first-run Empty state (illustration + connect CTA), never zero-filled "you spend $0.00 on subscriptions" (UX §3 Empty).
- **Partial connectivity**: With only some accounts connected, the inventory and calendar compute on the connected subset and show the persistent Partial Data Banner; every impact figure and recommendation computed on a partial picture carries the "Incomplete data" chip — a missing card could hide subscriptions, so the picture is explicitly marked incomplete (UX §3 Partial; `BudgetState.data_completeness`/`CashFlowForecast.data_completeness = partial`).
- **Stale / missing inputs (Fresh-or-Flagged)**: Stale `TransactionStream` flags detected amounts; stale/missing `CashFlowForecast` (a primary money input to the safe-to-pay date) **withholds** the safe-to-pay annotation; stale `BudgetState` flags budget-impact figures; stale `GoalState` flags the time-to-goal line. A stale money input is never silently treated as current (FR-X-008, Constitution VIII).
- **Conflicting advice (Cash Safety precedence)**: When a bill's optimal pay timing conflicts with Cash Safety's `SafeToActSignal` (overdraft risk), `SafeToActSignal` **takes precedence**; the Conflict Banner names both signals and the resolution rule (safety overrides optimization), per UX §3.1 / §10.4. Until Cash Safety ships, Bills derives the safe-to-pay date directly from `CashFlowForecast.shortfall_flag`/`runway_days` and surfaces the at-risk flag from US2 AS3.
- **Multi-currency recurring charges**: A subscription billed in a foreign currency (e.g. a USD streaming service) is valued in CAD using the spine's timestamped FX-converted `cad_amount` from `TransactionStream`; a stale FX rate (`fx_rate` with stale freshness) flags the converted impact figure (multi-currency edge case, FR-X-008).
- **Variable-amount bills**: A recurring charge whose amount varies (e.g. a utility bill) is modeled with an amount **range/estimate** (last-known + trend), not a single confident figure; budget-impact and savings figures inherit the estimate marker and are never presented as exact.
- **Irregular / uncertain cadence**: A series whose cadence can't be confidently inferred (too few observations, irregular gaps) is surfaced with a "cadence uncertain" marker; its next-charge-date and safe-to-pay date are estimated, never confident.
- **Recurrence false positives/negatives**: A user can confirm/dismiss a detected series (`detection_state = confirmed | dismissed`); a dismissed series is excluded from the inventory and money math; the user's confirmation/dismissal is an override that wins over the heuristic (Explainable & Auditable).
- **Idempotency / retries**: Free-trial keep/cancel decisions, cancellation/negotiation outcomes, and series confirm/dismiss writes are keyed on `source_event_id` with a uniqueness constraint; a replayed event never double-applies a decision or double-counts savings (Constitution IV, FR-X-003).
- **Cross-user / multi-profile boundaries**: Bills data (`SubscriptionInventory`, `BillCalendar`) is profile-scoped; a request for another profile's bills/subscriptions without authorization (e.g. via a Household `MemberScope`) is denied server-side against the session identity and audited — UI filtering alone is non-compliant (FR-HH-001, FR-X-010; see Security & Privacy).
- **Email-sourced enrichment purge**: If a subscription or merchant enrichment was derived solely from an email source (via the spine's `MerchantGraph.email_sourced` nodes / Inbox), it is subject to the FR-X-013 email-revocation purge cascade within 7 days; Bills holds no independent copy that escapes that cascade.
- **Contract version skew**: A breaking change in a consumed spine/Cash-Safety contract without a consumer migration disables the dependent Bills behavior (the consumer contract test fails in CI) rather than serving on a mismatched schema (SC-012).
- **Bilingual integrity**: A subscription label, free-trial alert, negotiation script, or safe-to-pay annotation missing an EN or FR string is a defect, not silently shown in one language (FR-X-005).

## Clarifications

### Session 2026-06-29

These decisions were made by the spec author to remove ambiguity without blocking; they are recorded here and reflected in the requirements, data model, and contracts. Items marked **(open)** are non-blocking planning/ops inputs.

- **C-1 — Safe-to-pay source while Cash Safety (Module 3) is unshipped.** The umbrella lists Bills as consuming `RunwayForecast`/`SafeToActSignal` (Cash Safety). No ratified Cash-Safety contract exists yet. **Decision**: Bills derives the **predicted safe-to-pay date** from the spine's ratified **`CashFlowForecast`** (`finos:spine/CashFlowForecast/1.0.0` — `runway_days`, `projected_lowest_balance`, `projected_lowest_on`, `shortfall_flag`), which the umbrella explicitly maps to "RunwayForecast" (FR-CORE-003). The richer `SafeToActSignal` **precedence override** is wired behind a feature check and consumed once Cash Safety ships — mirroring how Rewards handles the same not-yet-shipped dependency. The consumed-contracts README lists `SafeToActSignal` at min version `1.0.0 (pending Module 3)`.
- **C-2 — Recurrence detection ownership.** Bills owns the recurring-charge *model* (grouping, cadence/amount inference, classification) and **consumes** the spine's `is_recurring` / `is_subscription_like` hints; it does **not** re-run merchant normalization or transaction dedup. (See Scope note.)
- **C-3 — Default necessity classification.** New series default to **`nice_to_have`** unless (a) the merchant category maps to a curated essential list (housing/utilities/insurance/telecom-baseline) → `essential`, or (b) a curated negotiable list (e.g. telecom over-baseline, gym, some insurance) → `negotiable`. The classification is **inferred** (`classification_source = inferred`) and always user-overridable (`user_override` wins). The curated category→necessity mapping is a versioned dataset (**open** — concrete mapping curated in planning).
- **C-4 — Free-trial alert window default.** Default alert window is **3 days** before the auto-conversion date (user-adjustable). Trials with an unknown conversion date are surfaced as soon as detected with an "estimated" marker. (Mirrors the Rewards 60-day expiry-window pattern; trials are shorter-fuse so the default is tighter.)
- **C-5 — Savings model.** Projected savings for a cancellation = the series' inferred recurring CAD amount projected monthly and annualized (12×) in integer cents. For a negotiation, savings = the user-entered or curated expected reduction; framed as an **estimate**, never a guarantee. All savings math is integer cents, no float.
- **C-6 — One-tap cancellation is guided, not executed.** "One-tap" surfaces the guided cancellation path (deep link to the merchant's cancellation page where known, or a bilingual cancellation/negotiation script) and records the user's decision. FinOS never cancels or contacts the merchant on the user's behalf (Constitution IV / FR-X-003). The cancellation-link/known-merchant dataset is **open** (curated in planning).
- **C-7 — Notification routing.** All Bills alerts (free-trial converting, bill due tomorrow, at-risk bill) are emitted to the **Inbox digest pipeline** (Module 10) with a `priority_tier`; Bills sends no standalone push (UX §6.3, SC-009).
- **C-8 — Staleness windows.** Provisional Canada-oriented defaults, user-adjustable, finalized in the Module 0 ops/PIA review (**open**, platform NR-2): transactions/recurrence **24 h**; runway forecast **24 h** (inherits balance freshness); budget **24 h**; FX (for foreign subscriptions) **1 h** (inherited from the spine's converted `cad_amount`).

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-BILL-*):

- **FR-BILL-001 (Subscription Radar)**: System MUST detect recurring charges from `TransactionStream` (using the spine's `is_recurring` / `is_subscription_like` hints plus cadence inference), group them into a `RecurringSeries` inventory, and categorize each **essential / negotiable / nice-to-have** with its **monthly and annualized budget impact in CAD** tied to `BudgetState` categories. Classification is inferred with a documented default (C-3) and is **user-overridable** (`user_override` wins). Per FR-X-002, all impact/amount math is integer minor units (cents) — no binary float; suspected-duplicate and pending transactions are excluded from money math so a subscription is never double-counted.
- **FR-BILL-002 (Free-Trial Guard)**: System MUST treat free trials as first-class `FreeTrial` objects with a countdown to the auto-conversion date and a **one-tap keep/cancel** surfaced **before** conversion (default alert window 3 days, C-4), showing the post-conversion CAD cost. Unknown conversion dates are marked "estimated", never presented as confident. Keep/cancel is **guided, not executed** (C-6); the decision is recorded idempotently and audited.
- **FR-BILL-003 (Bill Calendar)**: System MUST present a bill calendar annotated with **predicted safe-to-pay dates derived from the runway** (`CashFlowForecast`, C-1). When the runway forecast is stale/missing (a primary money input), the safe-to-pay annotation MUST be **withheld** (the due date still shows) — never guessed. A safe-to-pay date that would fall after the due date MUST be surfaced as an at-risk/shortfall bill (Cash Safety precedence). Each calendar entry carries a `FreshnessStamp`.
- **FR-BILL-004 (Cancellation & Negotiation savings)**: System MUST show projected **savings (CAD, monthly + annualized) and goal impact (time-to-goal)** for a cancellation or negotiation **before** the user confirms (via a Confirm-Action sheet), and MUST **audit** the action and its projected savings in the append-only trail. Savings are estimates (C-5), framed as informational decision support, never a guarantee; the action is recommend-only (FinOS never cancels/pays on the user's behalf) and the write is idempotent.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-010 (Least privilege & threat model — applies via profile-scoped bills data), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-013 (Email-revocation purge cascade), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility). Notification discipline via FR-INB-002 (Inbox digest).

### Key Entities *(include if feature involves data)*

Consumed from the Spine / Cash Safety (read-only contracts, not owned here): `TransactionStream` (recurrence source), `MerchantGraph` (merchant identity + subscription hints), `BudgetState` (category impact), `CashFlowForecast` (runway → safe-to-pay), `GoalState` (time-to-goal), `SafeToActSignal` (Cash Safety overdraft precedence — pending Module 3).

Owned/provided by this module:

- **RecurringSeries / SubscriptionInventory**: A detected recurring charge — merchant ref, inferred cadence, recurring CAD amount (or range for variable bills), necessity classification (essential/negotiable/nice-to-have), classification source, detection state (detected/confirmed/dismissed), monthly + annualized budget impact, freshness. The inventory of all series is **provided** as `SubscriptionInventory` to Cash Safety, Pay, Tasks, Shopping, Inbox.
- **BillCalendarEntry / BillCalendar**: An upcoming bill/charge with a due date, a runway-derived **predicted safe-to-pay date** (or withheld), an at-risk flag, and freshness. The calendar is **provided** as `BillCalendar` to Pay, Cash Safety, Tasks, Inbox.
- **RecurringObligation / RecurringObligations**: The forward-looking schedule of committed recurring outflows (amount + expected date per upcoming occurrence), the money-facing view Pay/Cash Safety consume for sequencing and runway. **Provided** as `RecurringObligations`.
- **FreeTrial / FreeTrialExpiry**: A tracked free trial with a conversion date (or estimate), countdown, post-conversion CAD cost, alert window, and keep/cancel decision state. **Provided** as `FreeTrialExpiry` to Inbox, Cash Safety, Tasks.
- **CancellationAction / NegotiationAction**: A user-initiated, guided (not executed) cancel/negotiate action with projected monthly + annualized savings (CAD), goal-impact reference, bilingual script/draft, outcome state, and an idempotency key. Audited.
- **BillsAuditEvent**: Append-only record of every confirmed keep/cancel/negotiate decision and every classification override (Principle VI / FR-X-007), separate from debug logs, idempotent on `source_event_id`.

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: Recurring amounts, monthly/annualized budget impacts, post-conversion trial costs, and projected savings are stored as **integer minor units (CAD cents)**. Any rate/fraction used (e.g. a negotiation reduction percentage) is an **arbitrary-precision decimal string** (`^[0-9]+(\.[0-9]+)?$`), never a binary float. Foreign-currency subscriptions use the spine's already-FX-converted `cad_amount` (integer cents) from `TransactionStream` — Bills does not perform its own FX conversion.
- **Rounding rules**: Annualized impact = `monthly_cents × 12` (exact integer multiplication, no rounding needed). A negotiation reduction applied as a decimal fraction is computed in arbitrary precision and rounded **half-up to the nearest CAD cent once**, at the storage/display boundary only; intermediate products are never pre-rounded. Variable-amount bills carry an explicit estimate marker and never present a range bound as an exact figure.
- **Currency & locale**: CAD throughout, with time-to-goal context (FR-X-004); en-CA and fr-CA locale-correct formatting (fr-CA `12,99 $`).
- **Determinism & fixtures**: Impact and savings math is pure and deterministic. Mandatory fixtures: (a) a `$12.99`/month subscription → annualized `$155.88` (`1299 × 12 = 18 588` cents) with no drift; (b) a foreign-currency subscription valued in CAD from the spine's `cad_amount` (no re-FX in Bills); (c) a negotiation that reduces a `$89.99` bill by `25%` → new monthly `$67.49` (`8999 × 0.75 = 6749.25 → 6749` cents, half-up) and annualized savings `$270.00` (`(8999 − 6749) × 12 = 27 000` cents) — verifying single half-up rounding and exact annualization; (d) a series with a `suspected_duplicate`/`pending` underlying row excluded from the impact sum (no double-count).
- **Idempotency**: Free-trial keep/cancel decisions, cancellation/negotiation outcomes, and series confirm/dismiss writes MUST be idempotent and safe to retry, keyed on `source_event_id` with a uniqueness constraint; a replayed event never double-applies a decision or double-counts savings (Constitution IV, FR-X-003).
- **Recommend-only**: Confirmed — Bills only recommends/guides a keep/cancel/negotiate/pay-timing action; it never executes a cancellation, contacts a merchant, schedules, or moves money (FR-X-003). Every consequential action routes through a Confirm-Action sheet (UX §2.2).

### Security & Privacy Threat Model *(included — profile-scoped financial data; cross-user via Household MemberScope)*

> Bills does **not** handle aggregation tokens, OAuth credentials, or secrets (those live solely in Module 0's KMS-backed store). It **does** own a derived inventory of a person's subscriptions and bills — a sensitive behavioral/spend profile — and is reachable across users via Household `MemberScope`, so a focused threat model is included (Principle V; FR-X-010 applies to profile-scoped bills data).

- **Assets**: A profile's `SubscriptionInventory`, `BillCalendar`, `FreeTrial` records, and cancellation/negotiation history. These reveal spend patterns, services used, financial stress signals (e.g. cancelling essentials), and identity-adjacent details.
- **Trust boundaries / actors**: The owning user; other Household members with a `MemberScope` grant; the spine (read-only provider); the Inbox pipeline (notification sink); curated cancellation-link/category datasets (reference data, not user data).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across profiles | another profile's `SubscriptionInventory`/`BillCalendar` | authZ on every cross-profile request, keyed on the **server-side session identity** + Household `MemberScope`, never a client-supplied `profile_id`; denied access is audited | Yes (UI filtering alone does NOT satisfy) |
  | Stale-feed mis-advice presented as fresh | safe-to-pay date, budget impact | `FreshnessStamp` + flag/withhold on stale; stale runway (money input) **withholds** the safe-to-pay date (FR-X-008) | Yes |
  | PII / monetary leak in logs | amounts, merchant names, subscriptions | structured logs **redact** PII + monetary values + merchant descriptors; the audit trail is separate (FR-X-014) | Yes |
  | Email-sourced subscription enrichment outlives consent | email-inferred series/merchant enrichment | inherits the FR-X-013 email-revocation purge cascade (7 days); Bills holds no copy that escapes it | Yes |
  | Replay of a cancel/keep decision double-applies | `FreeTrial`/`CancellationAction` state | idempotency key (`source_event_id`, UNIQUE); replays are no-ops | Yes |

- **AuthZ enforcement**: Every cross-profile read of bills/subscription data is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted as the source of truth (FR-HH-001). Kid-role profiles never expose another member's bills (UX §10.6).
- **Data minimization, retention & revocation**: Bills stores only the derived recurring-charge model and decision/audit records it needs — it keeps **no private copy** of raw transactions/balances (those stay in the spine). Email-derived enrichment is subject to the FR-X-013 cascade; dormant-account data is bounded by FR-X-019.
- **Data residency**: All bills data inherits the Canadian-region residency constraint (FR-X-020); no bills-derived PII is processed outside Canada without disclosure.

## UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab placement**: Bills is a **P2 tab** (UX §5.1): `[ Home ] [ Rewards ] [ Credit ] [ Cash Safety ] [ Bills ]`; once a 6th tab is active Bills may move under "More" per the priority order. Tab label localized: **Bills / Factures**.
- **Six-state matrix** (UX §3) — every data view (Radar, Calendar, Free-Trial Guard, Cancellation flow) defines all six:
  - **Empty**: first-run illustration + "Connect an account to find your subscriptions" CTA; never "$0.00 in subscriptions".
  - **Loading**: skeleton rows matching the inventory/calendar layout (no bare spinner).
  - **Partial**: persistent Partial Data Banner ("Showing subscriptions from {n} of your accounts — connect more for the full picture"); every impact figure carries the "Incomplete data" chip.
  - **Stale**: stale `FreshnessStamp` chip on detected amounts; **money inputs** (runway) withhold the safe-to-pay date and show the Withheld card; secondary figures show a "may be outdated" note.
  - **Error/Degraded**: Unavailable chip + non-alarming "Unable to reach {source} right now"; never the last-known runway as if current.
  - **Withheld**: when `CashFlowForecast` (money input) is stale/missing, the safe-to-pay area is replaced by the Withheld Card stating what's missing ("Connect/refresh to see safe-to-pay dates") with a Refresh CTA — never a guessed date.
- **Recommendation Card** (UX §4.1): every keep/cancel/negotiate/pay-timing suggestion is a Recommendation Card with the mandatory **Why layer** (e.g. "Recurring: $12.99/mo · Category: nice-to-have · Budget impact: −$12.99 · Annualized: $155.88 · Source: transaction stream · Updated 2h ago"), a freshness chip (always visible), and at least one CTA. The first card a first-time user sees carries the "not regulated financial advice" disclaimer.
- **Confirm-Action Sheet** (UX §4.2): every cancellation/negotiation and every "mark trial cancelled / keep" routes through a full-screen Confirm-Action sheet showing the exact-cents financial impact (monthly + annualized savings), the time-to-goal line, the Why layer, the mandatory disclaimer, and a **specific** CTA label ("Cancel subscription", "Keep trial", "Start negotiation" — never "OK"/"Confirm"). The CTA is disabled while in-flight; the handler is idempotent on `source_event_id`.
- **Freshness Chip** (UX §4.3): on every detected amount, budget impact, safe-to-pay date, and post-conversion trial cost. Stale chip is tappable to the "what this means" explainer.
- **Conflict Banner** (UX §3.1 / §4.4): shown when a bill's optimal pay timing conflicts with Cash Safety's `SafeToActSignal` (or, pre-Cash-Safety, when `CashFlowForecast.shortfall_flag` makes a safe-to-pay date fall after the due date). The banner names both signals and states the resolution rule (**Cash Safety / safety signals take precedence over Bills pay-timing optimization**); the overridden suggestion is shown with a "Currently overridden" chip and disabled CTA.
- **Money/locale formatting** (UX §8): all CAD values via `@finos/format`; fr-CA renders `12,99 $` / `155,88 $`; percentages `25 %` (fr-CA space); dates `3 juillet 2026` / `July 3, 2026`; relative countdowns "in 3 days" / "dans 3 jours".
- **Time-to-goal** (UX §8.4): cancellation/negotiation savings show the time-to-goal contribution line ("+4 days toward {goal}") sourced from `GoalState`; omitted (not "no goal") when no goal is associated.
- **Notifications** (UX §6): free-trial-converting (Important/Critical near conversion), bill-due-tomorrow (Important), at-risk-bill (Critical) are emitted to the **Inbox digest** with `priority_tier` and bilingual payloads — Bills sends no standalone push.
- **Accessibility** (UX §7): WCAG 2.1 AA; bilingual screen-reader labels on every value, chip, card, and CTA; ≥44×44 pt tap targets; Dynamic Type reflow; reduced-motion (countdown ticks fade, no spring); dark-mode tokens for any new color.
- **Key screens**: (1) **Subscription Radar** list — series grouped by necessity with monthly/annualized impact; (2) **Bill Calendar** — month view with due-date + safe-to-pay annotations and at-risk markers; (3) **Free-Trial Guard** — countdown cards with keep/cancel; (4) **Cancellation/Negotiation** flow — savings + goal impact → Confirm-Action sheet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-B-001 (Detection coverage)**: For a representative set of Canadian recurring charges in the transaction stream, ≥ 90% are detected and grouped into the inventory with a necessity classification; a recurring charge the spine flags `is_recurring`/`is_subscription_like` that is silently dropped is a defect.
- **SC-B-002 (Integration is real)**: 100% of safe-to-pay annotations are derived from `CashFlowForecast` and 100% of cancellation/negotiation flows show CAD savings **and** a time-to-goal line; a suggestion that ignores an available relevant input is a defect (umbrella SC-001, FR-X-001).
- **SC-B-003 (Explainability)**: 100% of Bills recommendations can display "why" with their inputs (amount, cadence, category, runway, freshness); ≥ 80% of usability-test users say they understand why a subscription was flagged or a pay date suggested (umbrella SC-005).
- **SC-B-004 (Money exactness)**: 0 cent-level slippage across the money-correctness fixtures; 100% of monetary math uses integer minor units / arbitrary-precision decimals (no float); 0 double-counted subscriptions from duplicate/pending rows.
- **SC-B-005 (Freshness safety)**: 0 safe-to-pay dates served on a stale/missing runway forecast without withholding; 0 detected amounts shown past their staleness threshold without a visible stale flag (umbrella SC-006).
- **SC-B-006 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Bills strings (incl. negotiation scripts); 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-B-007 (Free-trial protection)**: 100% of detected free trials with a known conversion date surface a keep/cancel prompt within the alert window **before** the charge date; 0 trials convert without a prior surfaced prompt when the conversion date was known.
- **SC-B-008 (Savings impact)**: Users who act on Subscription Radar reduce tracked recurring spend by a median of ≥ 10% within 60 days (umbrella SC-004).
- **SC-B-009 (Recommend-only & audit)**: 0 actions where FinOS cancels, schedules, or moves money on the user's behalf; 100% of confirmed cancel/keep/negotiate actions are recorded in the append-only audit trail; 100% idempotent under replay.
- **SC-B-010 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).
- **SC-B-011 (Profile safety)**: 0 cross-profile bills/subscription exposures in API-layer authorization testing; every denied cross-profile access is audited (umbrella SC-015).

## Assumptions

- **Spine availability**: Module 0 exposes `TransactionStream` (with `is_recurring` hints), `MerchantGraph` (with `is_subscription_like`), `BudgetState`, `CashFlowForecast`, and `GoalState` as versioned, freshness-stamped contracts; Bills consumes them and does not re-aggregate, re-normalize, re-budget, or re-forecast. Until a contract is available, the dependent Bills behavior degrades (e.g. safe-to-pay withholds rather than guesses).
- **Cash Safety dependency**: `SafeToActSignal`/`RunwayForecast` (Module 3) may not exist at Bills MVP; Bills derives safe-to-pay from the spine's `CashFlowForecast` and wires `SafeToActSignal` precedence behind a feature check (C-1).
- **Necessity-classification dataset**: A curated, versioned, Canada-first category→necessity mapping (essential/negotiable/nice-to-have) is curated/ingested; its exact source and update cadence are a planning decision (C-3).
- **Cancellation-link / negotiation dataset**: A curated dataset of known merchant cancellation deep-links and bilingual negotiation scripts is available; concrete coverage is a planning decision (C-6).
- **Free-trial detection**: Free trials are inferred from transaction/merchant signals (e.g. a $0 or trial-marked authorization followed by a scheduled charge) and/or email signals via the spine/Inbox; the exact detection source mix is a planning decision; unknown conversion dates are marked "estimated", never assumed.
- **Notification path**: The Inbox digest pipeline (Module 10) exists or is stubbed to receive Bills alerts; until it ships, alerts surface in-tab and no standalone push is sent (C-7).
- **Staleness windows**: Provisional defaults (C-8) are user-adjustable and finalized in the Module 0 ops/PIA review (platform NR-2).
- **Not regulated advice**: Cancellation/negotiation savings and pay-timing suggestions are informational decision support, not regulated financial advice (surfaced to users).

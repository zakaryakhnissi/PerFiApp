# Feature Specification: Module 3 — Cash Safety & Autopilot

**Feature Branch**: `005-module-3-cash-safety`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 3 — Cash Safety & Autopilot (Priority: P1)"; functional requirements FR-CASH-001..004 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Structure and quality match the gold-standard exemplar [specs/002-module-1-rewards/spec.md](../002-module-1-rewards/spec.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Cash Safety & Autopilot** tab only. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** the spine's `CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, and `CreditState`, and does **not** re-implement aggregation or cash-flow forecasting. It **derives** the user-facing runway, the cross-module safety verdict (`SafeToActSignal`), and rules-based roundup proposals on top of those spine outputs. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Cash Safety behavior.
>
> **Constitutional boundary — purely advisory, no credit**: Cash Safety is purely predictive and advisory. It **never** moves money (Constitution IV / FR-X-003) and it **never** originates, brokers, or refers a cash advance or any other credit product (FR-CASH-002; umbrella Out of Scope — "Cash Advance Lite" is removed). Every "autopilot" output (micro-actions, sweeps, roundups) is a **proposal** the user executes themselves.
>
> **Boundary with Module 0 (Spine)**: The spine owns balances and the canonical `CashFlowForecast` (projected balances, lowest point, runway days, shortfall flag). Cash Safety re-projects nothing it can read; it adds the **safety buffer**, the **micro-action plan**, the **verdict semantics** other modules consume, and the **roundup engine**.
>
> **Boundary with Module 4 (Bills) and Module 5 (Pay)**: Cash Safety proposes *moving a bill's safe-to-pay date* and *re-sequencing payments* as micro-actions, but Bills owns the bill calendar and Pay owns the payment schedule. Cash Safety hands off (`move_bill_date` → Bills; `resequence_payments` → Pay) rather than owning those surfaces.

## User Scenarios & Testing *(mandatory)*

Cash Safety is the **floor under every other recommendation**: no module should advise an action that risks an overdraft, and the runway is the shared input that makes that guarantee real. The flagship payoff is a forward-looking runway that flags a predicted shortfall **before** it causes a fee or missed payment, plus a concrete micro-action to close the gap — never a cash advance.

### User Story 1 - Forward-looking runway with shortfall flag (Priority: P1)

A user with connected accounts and known upcoming bills opens Cash Safety and sees a runway chart showing the lowest projected balance and the date it occurs, with any predicted shortfall clearly flagged before it would cause a fee.

**Why this priority**: This is the core safety primitive and the shared input every spending module checks. It is a core onboarding milestone (umbrella SC-014: a new user sees a runway within 10 minutes) and delivers standalone value even before micro-actions or roundups exist.

**Independent Test**: With accounts and upcoming bills known to the spine, open Cash Safety and confirm the runway chart shows the lowest projected balance, the date it occurs, the runway-days figure, and a visible shortfall flag when the projection breaches the safety buffer — each carrying a freshness stamp.

**Acceptance Scenarios**:

1. **Given** scheduled bills and projected inflows known to the spine, **When** the runway is computed, **Then** the chart shows the lowest projected balance, the date it occurs, the runway days remaining, and flags any predicted shortfall (umbrella US scenario 1; FR-CASH-001).
2. **Given** the balance feeding the runway is **stale** beyond its threshold, **When** the runway is requested, **Then** the runway is **withheld** (Withheld state) and a "Refresh balance" CTA is shown — it is never computed on old data (umbrella US scenario 4; Constitution VIII; SC-CASH-005).
3. **Given** an fr-CA user, **When** the lowest projected balance and safety buffer are displayed, **Then** they are formatted `1 234,56 $` (comma decimal, space thousands, trailing symbol), not `$1,234.56` (FR-X-005; SC-CASH-006).
4. **Given** only some of the user's accounts are connected (partial picture), **When** the runway renders, **Then** it computes on the connected subset and carries a persistent Partial Data Banner + an "Incomplete data" chip, never presenting the partial runway as complete.
5. **Given** the spine forecast method is `insufficient_history`, **When** the runway is requested, **Then** it is surfaced as low-confidence/withheld rather than as a confident number.

---

### User Story 2 - Shortfall micro-actions that close the gap (Priority: P1)

When the runway flags a predicted shortfall, Cash Safety proposes concrete, ranked micro-actions (move a bill, pause a roundup, re-sequence payments, transfer from the user's own savings, trim discretionary spend) that would close the predicted gap — and **never** offers or brokers a cash advance.

**Why this priority**: A flagged shortfall with no path to resolve it is anxiety, not help. The micro-action is what turns the runway from a warning into a safety mechanism (SC-CASH-003: avoided overdrafts). It is the clearest expression of the "no module advises an overdraft" guarantee.

**Independent Test**: With a predicted shortfall present, request the guard's response and confirm it returns at least one concrete micro-action whose projected gap-closed amount is shown, that the action references a real entity (a bill, a roundup rule, an account), and that **no** option is a cash advance or any credit product.

**Acceptance Scenarios**:

1. **Given** a predicted shortfall, **When** the guard responds, **Then** it proposes micro-actions (move a bill, pause a roundup, re-sequence payments, transfer from savings, reduce discretionary) ranked by how much of the gap each closes, and **never** offers, originates, or brokers a cash advance or any other form of credit (umbrella US scenario 2; FR-CASH-002).
2. **Given** a proposed micro-action, **When** the user opens it, **Then** the Recommendation Card shows the exact CAD gap it would close, the inputs and reasoning ("Why this action"), and routes any consequential step through a Confirm-Action sheet — Cash Safety never executes the action (Constitution IV; SC-007).
3. **Given** a `move_bill_date` micro-action while Bills (P2) is not yet shipped, **When** the guard responds, **Then** that micro-action is omitted and the remaining micro-action kinds still attempt to close the gap (graceful degradation; FR-X-012).
4. **Given** `BudgetState` (needed for `reduce_discretionary`) is stale or missing, **When** the guard composes micro-actions, **Then** the discretionary-trim action is withheld rather than computed on a guessed budget headroom, while non-budget micro-actions still surface.
5. **Given** a `transfer_from_savings` micro-action, **When** it is proposed, **Then** it proposes moving the user's **own** funds between the user's **own** accounts and is surfaced as a proposal only — Cash Safety does not move the funds (FR-X-003).

---

### User Story 3 - Rules-based roundups proposed to the user's plan (Priority: P2)

The user sets a roundup rule (round qualifying purchases up to the nearest $1/$5 and route the difference to debt/TFSA/savings/a goal). When a qualifying purchase posts, Cash Safety **proposes** the swept amount for routing per the plan, recorded idempotently once the user confirms — and a duplicate trigger event never double-proposes.

**Why this priority**: Roundups are the "autopilot" payoff and a key Habits-ritual input, but the runway + micro-actions (US1/US2) are the constitutional floor and ship first. Roundups are valuable only once the runway exists to safely pause them under shortfall pressure.

**Independent Test**: With a roundup rule active and a qualifying purchase posted, confirm the rounded amount is **proposed** (not executed) for routing to the planned destination with its exact integer-cents amount, that confirming it writes one append-only audit event, and that replaying the same trigger event produces no second proposal or record.

**Acceptance Scenarios**:

1. **Given** a roundup rule and a qualifying purchase, **When** the rule runs, **Then** the rounded amount is **proposed** for routing to debt/TFSA/savings/goal per the user's plan and is recorded idempotently once the user confirms (umbrella US scenario 3; FR-CASH-003).
2. **Given** a roundup proposal the user already confirmed, **When** the same trigger event arrives again (e.g. a network retry before the acknowledgement is received), **Then** no second routing is proposed or recorded — the write is keyed on `source_event_id` (umbrella US scenario 5; idempotency; Constitution IV).
3. **Given** a roundup routed to a goal, **When** the proposal renders, **Then** it shows the swept amount and its time-to-goal contribution in days (FR-X-004), formatted for the active locale.
4. **Given** a predicted shortfall and an active roundup rule, **When** the guard proposes micro-actions, **Then** a `pause_roundup` action is offered and, if confirmed, the affected roundup proposals transition to `superseded` — the runway takes precedence over the savings autopilot.
5. **Given** a roundup proposal, **When** the user reviews it, **Then** approving it routes through a Confirm-Action sheet whose primary CTA is specific ("Approve roundup of 2,50 $"), and FinOS never auto-confirms (SC-007).

---

### User Story 4 - SafeToActSignal consumed by every spending module (Priority: P1)

Any module about to recommend a spend (Pay, Bills, Shopping, Tasks, Rewards) queries Cash Safety's `SafeToActSignal`; when it flags overdraft risk, it takes precedence over the optimization recommendation and the conflict and its resolution are shown to the user.

**Why this priority**: This is the contract that makes "no module advises an overdraft" enforceable across the whole OS (FR-CASH-004; SC-001). Without it, every other module would have to re-derive runway safety independently.

**Independent Test**: With a contemplated spend that would breach the runway buffer, request `SafeToActSignal` and confirm it returns `unsafe` with the projected lowest balance after the spend; with a stale balance, confirm it returns `withheld` (never a guessed `safe`).

**Acceptance Scenarios**:

1. **Given** a contemplated spend amount, **When** a module requests `SafeToActSignal`, **Then** it returns a verdict (`safe`/`caution`/`unsafe`/`withheld`) with reasoning, and for a non-withheld amount-evaluated query, the projected lowest balance after the spend (FR-CASH-004).
2. **Given** Rewards wants a high-points (spend-positive) card but the spend would breach the runway, **When** Rewards consults `SafeToActSignal`, **Then** the signal returns `unsafe`, Cash Safety takes precedence, and the Conflict Banner names both signals and the resolution rule (umbrella "Conflicting recommendations" edge case; ux-foundations §10.4; SC-CASH-003).
3. **Given** the underlying balance/forecast is stale or missing, **When** `SafeToActSignal` is requested, **Then** the verdict is `withheld` and consuming modules withhold the dependent spend recommendation and ask the user to refresh — `withheld` is never treated as `safe` (Constitution VIII; SC-CASH-005).
4. **Given** a household member viewing another member's data, **When** `SafeToActSignal` is requested for a `profile_id` outside the requester's `MemberScope`, **Then** the request is denied server-side and audited — never served from a client-supplied identifier (FR-HH-001; SC-CASH-009).

---

### Edge Cases

- **Empty / no connection**: With no accounts connected, Cash Safety shows the first-run Empty state ("Connect an account to see your runway") — never a zero-filled "$0.00 runway" or a fabricated shortfall (ux-foundations §3 Empty; §10.1).
- **Partial connectivity**: With only some accounts connected, the runway computes on the connected subset, marks itself "Incomplete data" with the Partial Data Banner, and `SafeToActSignal` inherits `data_completeness = partial` so consumers know the verdict is on an incomplete picture. A missing high-balance account could understate runway; the partial marker is mandatory, never hidden for a cleaner number.
- **Stale / missing money inputs**: A stale starting balance or a stale `CashFlowForecast` **withholds** the runway and forces `SafeToActSignal = withheld` — no runway is computed on a multi-day-old balance (Constitution VIII; umbrella US scenario 4). The runway is a money output; there is no documented-default for it.
- **Secondary guardrail absent**: `CreditState` (used only to prioritize *which* shortfall is most urgent via due-date risk) being **entirely absent** does not block the runway — Cash Safety proceeds without the due-date urgency boost (Constitution VI v2.2.0 documented-default exception applies to this secondary guardrail, never to the balance). `CreditState` present but **stale** ⇒ the due-date context is flagged, not reasoned on.
- **Conflicting advice with Cash Safety precedence**: When any optimization signal (Rewards card, Shopping buy-now, Pay best-card) conflicts with an `unsafe`/`caution` `SafeToActSignal`, Cash Safety wins (`precedence_rank = 1`); the conflict and resolution are surfaced via the Conflict Banner, the losing card is shown "Currently overridden" with its CTA disabled (ux-foundations §4.4 / §10.4). Cash Safety never silently suppresses the other signal.
- **Idempotency / retries**: A roundup trigger event that is delivered twice (network retry before ack) produces exactly one `RoundupProposal`, keyed on `source_event_id` (UNIQUE); a confirmed proposal replayed produces no second audit event (Constitution IV; FR-CASH-003).
- **Multi-currency**: A foreign-currency account or purchase feeding the runway is FX-converted to CAD via a timestamped FX rate in arbitrary precision, rounded half-up to CAD cents before it enters the projection; a stale FX rate flags the converted figure (FR-X-002; Money Correctness). Roundup math operates on the CAD-normalized transaction amount.
- **Cash-advance temptation (constitutional)**: Under a predicted shortfall, Cash Safety MUST NOT surface a cash advance, payday-style advance, line-of-credit draw, or any credit-origination action as a "way to close the gap" — the `micro_actions.kind` enum has no such value by design (FR-CASH-002; umbrella Out of Scope).
- **Roundup vs runway**: An active roundup that would itself narrow the runway under shortfall pressure is the first thing the guard proposes to pause (`pause_roundup`) — the safety floor outranks the savings autopilot.
- **Cross-user boundaries**: A request for another profile's runway / signal / roundups without `MemberScope` authorization is denied server-side and audited (Threat Model; SC-CASH-009). Kid-role accounts never receive a profile switcher (ux-foundations §10.6).
- **Contract version skew**: A breaking change in a consumed spine contract (`CashFlowForecast`, `AccountState`) without a consumer migration disables the runway/signal (consumer contract tests fail in CI) rather than serving on a mismatched schema (SC-012).
- **Bilingual integrity**: A micro-action, verdict reasoning, or label missing an EN or FR string is a defect, not silently shown in one language (Constitution II).
- **Notification restraint**: A Critical "predicted overdraft today" alert may break through the digest cadence (ux-foundations §6.1), but Cash Safety emits it to the Inbox pipeline — it never calls a push API directly (ux-foundations §6.3).

## Clarifications

Decisions made during authoring (no blocking question was raised; the following ambiguities were resolved against the constitution, platform decisions, and the exemplar):

### Session 2026-06-29

- Q: Is the runway a money output (so it must withhold on stale balance) or a secondary guardrail (so a documented-default could apply)? → A: The runway is a **money output** (projected balances in cents). It MUST **withhold** on a stale/missing balance — the v2.2.0 documented-default exception does NOT apply to it. Only `CreditState` due-date context is a secondary guardrail here, and its absence merely drops the urgency-ranking boost.
- Q: Which contracts does Module 3 provide? → A: `RunwayForecast`, `SafeToActSignal` (both in the umbrella Provides list), plus `RoundupProposal` (required so Habits can consume `RoundupProposals` per the Module 8 Consumes list and to give US3 a versioned, idempotent, audited proposal object). Three provided contracts.
- Q: Does Cash Safety re-forecast cash flow, or consume the spine's `CashFlowForecast`? → A: It **consumes** `finos:spine/CashFlowForecast/1.0.0` and derives the user-facing runway (safety buffer + micro-actions + verdict). It does not re-aggregate or re-forecast (avoids divergence from the canonical spine; Integration-First).
- Q: How is a conflict resolved deterministically by consumers? → A: `SafeToActSignal` carries `precedence_rank = 1` (const). Consumers resolve conflicts against the rank rather than hard-coding the rule; ux-foundations §10.4 precedence ordering is the canonical reference.
- Q: What does Cash Safety do when Bills (P2) has not shipped but a `move_bill_date` action would help? → A: Omit the `move_bill_date` micro-action behind a feature check; the remaining micro-action kinds still close gaps (graceful degradation). The `BillCalendar` consumer is wired but feature-gated.
- Q: Roundup amount math — float risk? → A: Roundup amount is **integer-cents** modular arithmetic (`target - (amount mod target)`); never float. Fixture-guarded (Money Correctness).
- Q: Are concrete staleness windows / safety-buffer defaults fixed here? → A: No — these are Canada-oriented, user-adjustable defaults set in planning (umbrella deferral on staleness windows; platform-decisions NR-2). The spec fixes the **mechanism** (withhold on stale money input), not the numbers. Recorded in [research.md](./research.md) as non-blocking open items.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-CASH-*):

- **FR-CASH-001 (Forward-looking runway)**: System MUST compute and surface a forward-looking runway — the lowest projected balance, the date it occurs, runway days against a user-adjustable safety buffer, and a flagged predicted shortfall **before** it would cause a fee or missed payment. The runway is **derived** from `finos:spine/CashFlowForecast/1.0.0` (not re-aggregated). The runway is a **MONEY output**: a stale/missing starting balance or `CashFlowForecast` MUST cause the runway to be **withheld** or flagged, never computed on stale data (Constitution VIII).
- **FR-CASH-002 (Shortfall micro-actions; no credit)**: System MUST propose concrete, ranked micro-actions to close a predicted shortfall (move a bill date, pause a roundup, re-sequence payments, transfer from the user's own savings, reduce discretionary spend), each showing the exact CAD gap it closes and its reasoning. The system MUST NOT offer, originate, broker, or refer a cash advance or any other form of credit — there is no such micro-action by constitutional design (umbrella Out of Scope). Each consequential micro-action routes through a Confirm-Action sheet; FinOS never executes it (Constitution IV / FR-X-003).
- **FR-CASH-003 (Rules-based sweeps/roundups)**: System MUST support user-defined rules-based sweeps/roundups that **propose** routing the rounded amount to debt/TFSA/savings/a goal per the user's plan, recorded **idempotently** on confirmation (keyed on `source_event_id`, UNIQUE — a replayed trigger never double-applies). The roundup amount MUST be computed in **integer cents** (modular arithmetic), never float, and fixture-guarded. The confirmed proposal MUST be written to the append-only audit trail (Constitution VI). Under shortfall pressure, an active roundup MUST be pausable via a micro-action.
- **FR-CASH-004 (SafeToActSignal)**: System MUST expose a `SafeToActSignal` consumed by any module proposing spending, returning a verdict (`safe`/`caution`/`unsafe`/`withheld`) with reasoning and — for an amount-evaluated query — the projected lowest balance after the spend. The signal MUST carry documented **precedence** (`precedence_rank = 1`) so that, on conflict, it overrides optimization recommendations and the conflict/resolution is surfaced (umbrella "Conflicting recommendations" edge case). A stale/missing money input MUST yield `withheld`, never a guessed `safe`.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-013 (Email-revocation cascade — N/A here; Cash Safety holds no email-sourced data), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), FR-X-017 (MFA gates — N/A here; Cash Safety issues no tokens and moves no money). FR-HH-001 (server-side cross-user authZ) applies to every `profile_id`-scoped read in a household context.

### Key Entities *(include if feature involves data)*

Consumed from the Spine / Bills (read-only contracts, not owned here): `CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, `CreditState` (Module 0); `BillCalendar` (Module 4, feature-gated).

Owned/provided by this module (full schemas in [contracts/provided](./contracts/provided/); fields in [data-model.md](./data-model.md)):

- **RunwayForecast**: The user-facing runway — starting balance, safety buffer, projected lowest balance + date, runway days, shortfall flag, confidence, optional per-day series, and the ranked `micro_actions`. **Provided** to Pay, Bills, Shopping, Tasks, Rewards, Focus, Workspace, and the Home dashboard.
- **SafeToActSignal**: The cross-module safety verdict (`safe`/`caution`/`unsafe`/`withheld`) with the projected lowest balance after a contemplated spend, reasoning, and `precedence_rank = 1`. **Provided** to every module that proposes spending.
- **MicroAction**: A ranked, advisory step that closes part of a predicted gap (`move_bill_date`, `pause_roundup`, `resequence_payments`, `transfer_from_savings`, `reduce_discretionary`) with the exact CAD gap it closes and bilingual reasoning. Embedded in `RunwayForecast`. **No** cash-advance/credit kind exists.
- **RoundupRule**: A user-defined rule (round-to target, qualifying scope, destination, active/paused). Owned; not exposed cross-module (it drives `RoundupProposal`).
- **RoundupProposal**: The proposed sweep for a qualifying purchase — rounded amount (integer cents), destination, status (`proposed`/`confirmed`/`dismissed`/`superseded`), idempotency key, and optional time-to-goal contribution. **Provided** to Habits (`RoundupProposals`).
- **AuditEvent**: An immutable, append-only record of a confirmed roundup, a confirmed micro-action, or a `SafeToActSignal`/runway shown (Constitution VI / FR-X-007).

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: All runway balances, the safety buffer, projected lowest balance, micro-action gap-closed amounts, and roundup amounts are **integer minor units (CAD cents)**. Any FX conversion of a foreign-currency account/transaction into the projection uses an **arbitrary-precision decimal** FX rate, converted and rounded half-up to CAD cents before it enters the runway. No binary floating point anywhere in the runway, micro-action, verdict, or roundup math.
- **Rounding rules**: FX conversion = `foreign_amount × fx_rate` in arbitrary precision, **half-up to the nearest CAD cent**, once, before the value enters the projection. The **roundup amount** is pure integer-cents modular arithmetic: `roundup = (target_cents - (txn_amount_cents mod target_cents)) mod target_cents` — exact, no rounding step, no float. Micro-action `projected_gap_closed` is integer-cents subtraction against the projected lowest balance.
- **Currency & locale**: CAD throughout, with time-to-goal context on goal-routed roundups (FR-X-004); en-CA and fr-CA locale-correct formatting (fr-CA `1 234,56 $`, negative `-47,50 $`, non-breaking space before `$`). All money/number/date rendering goes through `@finos/format` (no raw formatting).
- **Determinism & fixtures**: Runway projection (over a fixed spine forecast), micro-action gap math, and roundup math are pure and deterministic. **Mandatory fixtures**: (a) roundup of a `$4.30` purchase rounded to `$1` ⇒ `70` cents, and a `$4.00` purchase rounded to `$1` ⇒ `0` cents (boundary: exact multiple yields no sweep, not a full target); (b) roundup to nearest `$5` of a `$23.40` purchase ⇒ `160` cents; (c) an FX-converted foreign purchase entering the runway with no cent drift (e.g. `USD 100.00 × 1.3725 = CAD 137.25`); (d) a micro-action whose `projected_gap_closed` exactly equals a flagged shortfall, driving the verdict from `unsafe` to `safe`; (e) an idempotency replay producing one proposal and one audit event.
- **Idempotency**: Every state Cash Safety writes on the user's behalf — confirmed roundups, confirmed micro-action acknowledgements, paused-rule transitions — is keyed on `source_event_id` with a UNIQUE constraint; replays never double-apply (Constitution IV; FR-CASH-003; US3 scenario 2).
- **Recommend-only**: Confirmed — Cash Safety only proposes runway micro-actions and roundups; it never executes a transfer, pays a bill, or moves money (FR-X-003; SC-007). `transfer_from_savings` proposes moving the user's **own** funds and is never executed by FinOS.

### Security & Privacy Threat Model *(MANDATORY — touches another person's financial data in Household contexts)*

Cash Safety holds **no aggregation tokens or credentials** (those are Module 0 / FR-CORE-007) and moves **no money**, so the catastrophic-leak surface is narrower than the spine's. The mandatory surface here is **cross-user data exposure**: in a Household, a member's runway, `SafeToActSignal`, and roundups are another person's financial data, and the constitution requires a threat model whenever a module touches that (Constitution V; FR-HH-001).

- **Assets**: A profile's `RunwayForecast` (reveals balance level, shortfall dates, spending cadence), `SafeToActSignal` verdicts (reveal overdraft proximity), and `RoundupProposal` records (reveal savings behavior and destination accounts).
- **Trust boundaries / actors**: The owning user; other household members under `MemberScope`; the spine (read-only provider of balances/forecast); consuming modules (Pay, Bills, Shopping, Tasks, Rewards) that query `SafeToActSignal`; the Inbox pipeline (receives Critical-overdraft alerts).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across household members | another member's RunwayForecast / SafeToActSignal / RoundupProposal | authZ on every `profile_id`-scoped request keyed on the validated **session identity** + `MemberScope`, never a client-supplied `profile_id`; Postgres RLS as defense-in-depth | Yes (UI filtering alone does NOT satisfy) |
  | Stale-balance "safe" verdict presented as current | SafeToActSignal, RunwayForecast | stale money input ⇒ `withheld`/withheld runway (Constitution VIII); `withheld` is never coerced to `safe` | Yes |
  | Replay / double-apply of a roundup | RoundupProposal, audit trail | idempotency key `source_event_id` (UNIQUE); confirmed-proposal replays no-op | Yes |
  | Overdraft-proximity leak to a consuming module beyond scope | SafeToActSignal | the signal is computed for the requester's authorized `profile_id` only; cross-profile queries are denied + audited | Yes |
  | PII / monetary leak in logs | balances, projected shortfalls, roundup amounts | structured logs redact PII + monetary values; append-only audit trail kept separate from debug logs (FR-X-014) | Yes |
  | Credit-origination drift (a contributor adds a "cash advance" action) | user trust / regulatory posture | enum closed with no credit kind; contract test asserts no cash-advance/credit micro-action is ever emitted (FR-CASH-002) | Yes |

- **AuthZ enforcement**: Every cross-user read of a runway/signal/roundup is enforced **server-side** against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. Denied cross-user access is **audited** (SC-CASH-009 / umbrella SC-015). A member whose scope is revoked sees the Empty state immediately, with no cached runway shown (ux-foundations §10.6).
- **Data minimization, retention & revocation**: Cash Safety stores only derived state (rules, proposals, the cached runway) and references spine entities by id — it does not copy raw balances or transaction bodies. It holds **no email-sourced data**, so the email-revocation cascade (FR-X-013) does not apply; the dormant-account retention bound (FR-X-019) and 7-day deletion (FR-X-013) apply via the platform crypto-shred mechanism.
- **Data residency**: All Cash Safety data inherits the Canadian-region residency constraint (FR-X-020); no Cash Safety data is processed outside Canada without disclosure.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-CASH-001 (Floor under every recommendation)**: 100% of spend-positive recommendations across consuming modules check `SafeToActSignal` before surfacing; a spend recommendation that ignores an available `SafeToActSignal` is a defect (umbrella SC-001 / FR-X-001).
- **SC-CASH-002 (Shortfall foresight)**: 100% of predicted shortfalls are flagged with the lowest projected balance and its date **before** the projected breach date; 0 shortfalls are surfaced only after the fact (FR-CASH-001).
- **SC-CASH-003 (Avoided overdrafts)**: Among users who follow runway micro-actions, predicted-and-confirmed shortfalls are resolved without an overdraft fee in at least **85%** of flagged cases (umbrella SC-003); 0 flagged shortfalls are ever "resolved" by an offered cash advance (FR-CASH-002).
- **SC-CASH-004 (Roundup exactness & idempotency)**: 0 cent-level errors across the roundup/FX fixtures; 100% of roundup math uses integer cents / arbitrary-precision (no float); a replayed trigger event produces exactly one proposal and one audit event.
- **SC-CASH-005 (Freshness safety)**: 0 runways or `SafeToActSignal` verdicts served on data past its staleness threshold without withholding/flagging; 0 `withheld` verdicts coerced to `safe` (umbrella SC-006; Constitution VIII).
- **SC-CASH-006 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Cash Safety strings; 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-CASH-007 (No money moved)**: 0 instances of Cash Safety moving money on a user's behalf; 100% of micro-actions and roundups require explicit per-action user execution via a Confirm-Action sheet (umbrella SC-007).
- **SC-CASH-008 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release; 0 breaking contract changes ship without a migration plan + deprecation window (umbrella SC-012).
- **SC-CASH-009 (Household safety)**: 0 cross-user runway/signal/roundup exposures in API-layer authorization testing; every denied cross-user access is audited (umbrella SC-015).
- **SC-CASH-010 (Onboarding payoff)**: A new user connecting a first institution sees a runway indicator within the umbrella's 10-minute onboarding window (contributes to umbrella SC-014).

## Assumptions

- **Spine availability**: Module 0 exposes `CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, and `CreditState` as versioned, freshness-stamped contracts; Cash Safety consumes them and does not re-aggregate or re-forecast. Until a contract is available, the dependent Cash Safety output degrades (the runway/signal withholds rather than guesses).
- **Bills dependency for one micro-action**: `BillCalendar` (Module 4, P2) may not exist at Cash Safety MVP; until it does, the `move_bill_date` micro-action is feature-gated and omitted, and the remaining micro-action kinds still close gaps.
- **Habits dependency for roundups**: Habits (Module 8, P3) consumes `RoundupProposals`; Cash Safety provides the contract regardless of Habits' availability — the roundup engine is independently valuable in the Cash Safety tab.
- **Safety-buffer & staleness defaults**: A Canada-oriented default safety buffer and balance-staleness window ship as user-adjustable defaults; their exact values are a planning decision (umbrella "default thresholds" assumption; platform-decisions NR-2). The spec fixes the mechanism (withhold on stale money input), not the numbers.
- **No new external feed**: Cash Safety introduces no new external vendor — it computes on spine-provided, already-stamped data. No new subprocessor enters the register from this module.
- **Conflict precedence is canonical**: `SafeToActSignal` precedence over optimization signals (`precedence_rank = 1`) is the constitutional/UX rule (umbrella edge case; ux-foundations §10.4), not a Cash Safety preference — consuming modules honor it.
- **Not regulated advice**: Runway micro-actions and roundup proposals are informational decision support, not regulated financial advice (surfaced to users; ux-foundations §8.5). Cash Safety originates no credit product (FR-CASH-002).

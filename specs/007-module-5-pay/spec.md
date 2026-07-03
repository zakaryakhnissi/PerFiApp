# Feature Specification: Module 5 — Pay & Payment Optimization

**Feature Branch**: `007-module-5-pay`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 5 — Pay & Payment Optimization (Priority: P2)"; functional requirements FR-PAY-001..003 and cross-cutting FR-X-001..020; Constitution v2.2.0; ratified platform stack [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Gold-standard structural exemplar: [specs/002-module-1-rewards](../002-module-1-rewards).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Pay & Payment Optimization** tab only. Pay is the **decision-point integrator**: it ties Rewards, Credit, Cash Safety, and Bills together at the moment a payment is made or sequenced. It is a **consumer** of those modules' contracts and the spine; it re-implements none of them. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated only where they bind a Pay behavior.
>
> **Boundary with Module 1 (Rewards)**: Rewards owns the per-merchant **best-card** intelligence (`BestCardRecommendation`, `CardLineup`). Pay does **not** re-rank cards on rewards alone — it *consumes* Rewards' best-card output and then applies the **safety overlay** (runway + utilization + budget) to produce a `CheckoutRecommendation` that may differ from Rewards' pick when safety dictates. Pay also reasons over **accounts** (chequing/savings/debit), which Rewards does not.
>
> **Boundary with Module 3 (Cash Safety)**: Cash Safety owns runway and the `SafeToActSignal`. Pay consumes them; it never recomputes runway. When Cash Safety flags overdraft risk, its signal has **documented precedence** over Pay's reward optimization (ux-foundations §3.1 / §10.4).
>
> **Boundary with Module 4 (Bills)**: Bills owns the `BillCalendar` and recurring-obligation inventory. Pay's sequencer *consumes* the obligation set and *provides* a `PaymentSchedule` back; on user acceptance the calendar is updated **by Bills via the published schedule contract** — Pay records the proposal, never mutates Bills' store directly.

## User Scenarios & Testing *(mandatory)*

Pay answers two daily questions a points-only tool cannot: **"which card/account is safe to pay with right now?"** and **"in what order should I pay this month's obligations so I never overdraft and still move toward my goals?"** Every answer is recommend-only — FinOS never moves money (Constitution IV; FR-X-003).

### User Story 1 - Safe-to-pay checkout recommendation (Priority: P1)

At a checkout moment, the user requests the best card/account to pay with and receives **one** recommended payment method whose reasoning cites **rewards value AND runway safety AND utilization effect** together — never rewards in a vacuum.

**Why this priority**: It is the flagship Pay decision and the clearest expression of Integration-First at the point of spend. It delivers standalone value the moment Rewards + Credit + Cash Safety contracts exist, and is independently testable at a simulated checkout.

**Independent Test**: At a simulated checkout (merchant + amount), request a recommendation and confirm exactly one payment method is named with reasoning referencing reward value, runway impact, and utilization effect, and that a method which would breach runway or push utilization past hard-avoid is not recommended.

**Acceptance Scenarios**:

1. **Given** a checkout context (merchant + amount) and connected spine + Rewards + Credit + Cash Safety state, **When** a checkout recommendation is requested, **Then** the result names **one** payment method and shows why — reward value **and** runway safety **and** utilization effect. *(FR-PAY-001)*
2. **Given** the highest-reward card would breach the runway (post-spend projected balance crosses the safety buffer), **When** the recommendation runs, **Then** a safer account is recommended instead and the trade-off (reward foregone vs. runway protected) is shown. *(FR-PAY-001; umbrella Module 5 scenario 2)*
3. **Given** the highest-reward card would push per-card or aggregate utilization above 50% (hard-avoid per `CreditState` bands), **When** the recommendation runs, **Then** that card is **not** recommended and a safer method is chosen with an explanation; a card landing in the 30–50% warn band MAY be recommended but **with a utilization warning** attached.
4. **Given** Cash Safety's `SafeToActSignal` flags overdraft risk for the checkout amount, **When** Pay would recommend a spend-positive card, **Then** Cash Safety **takes precedence**, the spend-positive pick is overridden, and the Conflict Banner names both signals and the resolution rule (ux-foundations §3.1).
5. **Given** `RunwayForecast`/`CashFlowForecast` or `BudgetState` (primary **money** inputs) is stale or missing, **When** a recommendation is requested, **Then** the recommendation is **withheld** and the user is asked to refresh — it never guesses a money input (Constitution VI; FR-X-008).
6. **Given** `CreditState` is **entirely absent** (no credit connected), **When** a recommendation is requested, **Then** Pay applies the documented healthy-band default for the utilization guardrail and proceeds **silently** (no user-facing flag), per the Constitution v2.2.0 documented-default exception; **but given** `CreditState` is present and **stale**, the recommendation flags/withholds rather than reasoning on old utilization.
7. **Given** an fr-CA user, **When** the reward value, runway impact, and any CAD figure are displayed, **Then** they are formatted `1 234,56 $` (comma decimal, non-breaking-space thousands, trailing symbol), not `$1,234.56` (FR-X-005).

---

### User Story 2 - Monthly payment sequencer (Priority: P1)

Given the month's obligations and projected inflows, the user runs the sequencer and receives a proposed **payment order** that avoids overdrafts and maximizes goal progress, with each step's date and source account shown and its effect on runway and goals explained.

**Why this priority**: It is the second flagship Pay capability and the one that turns the spine's runway forecast into a concrete, ordered plan. It is independently testable from a fixed obligation set + inflow schedule and delivers value the moment Bills' obligations and the spine's forecast exist.

**Independent Test**: With a fixed set of obligations (amounts + due dates) and a projected inflow schedule, run the sequencer and confirm it returns an ordered, dated payment plan whose every intermediate projected balance stays at or above the safety buffer, and that reordering toward goal progress never introduces a projected overdraft.

**Acceptance Scenarios**:

1. **Given** the month's obligations and projected inflows from the spine, **When** the sequencer runs, **Then** it proposes a payment order that avoids overdrafts (no intermediate projected balance breaches the safety buffer) and maximizes goal progress within that constraint. *(FR-PAY-002)*
2. **Given** no overdraft-free ordering exists for the full obligation set (inflows are insufficient), **When** the sequencer runs, **Then** it does **not** silently produce an overdrafting plan — it surfaces the shortfall, ranks obligations by criticality, and recommends which to defer/renegotiate (handing the renegotiation to Bills), with the projected shortfall date and amount shown.
3. **Given** a proposed sequence, **When** the user expands a step, **Then** its source account, scheduled date, CAD amount (exact cents), runway impact, and goal-progress contribution are shown bilingually (Recommendation Card Why layer).
4. **Given** two valid overdraft-free orderings differ only in goal progress, **When** the sequencer ranks them, **Then** it prefers the ordering with greater goal progress and the Why layer cites the goal it advanced and by how many days.

---

### User Story 3 - Accept a sequence & sync the bill calendar (idempotently, no money moved) (Priority: P2)

The user accepts a proposed payment sequence; FinOS records each scheduled item idempotently and publishes the schedule so the bill calendar updates — **without moving any money**.

**Why this priority**: Acceptance/recording is the payoff of US2 but depends on it; the sequencer is valuable read-only before acceptance exists. It is the surface where idempotency and recommend-only are most load-bearing.

**Independent Test**: Accept a proposed sequence via the Confirm-Action sheet; confirm an append-only audit record is written per scheduled item keyed on the source event id, a re-submission of the same acceptance does not double-record, and the published `PaymentSchedule` reflects the accepted items with no money-movement side effect.

**Acceptance Scenarios**:

1. **Given** an accepted sequence, **When** the user confirms it through the Confirm-Action sheet, **Then** the bill calendar updates (via the published `PaymentSchedule`) and each scheduled item is recorded **idempotently** — FinOS moves no money. *(FR-PAY-003; umbrella Module 5 scenario 4)*
2. **Given** the same acceptance is submitted twice (retry/double-tap/network replay), **When** the second submission arrives, **Then** it is deduplicated on the source event id and no scheduled item is double-recorded and no second audit entry is created for the same item.
3. **Given** an accepted scheduled item later becomes unsafe (a balance refresh makes its date overdraft-risky), **When** the spine state changes, **Then** the item is flagged for re-sequencing — FinOS never silently lets a recorded plan drift into overdraft, and it never auto-executes a payment.
4. **Given** a cancellation/renegotiation of an obligation is recommended by the sequencer, **When** the user initiates it, **Then** the action is handed to Bills (Pay does not negotiate) and the proposal + its projected goal/runway effect is recorded for audit.

---

### Edge Cases

- **Empty / no connectivity**: With no accounts connected, the Pay tab shows the Empty state (ux-foundations §3) — never a zero-filled "recommendation". A checkout request with no eligible payment method returns a Withheld Card explaining what to connect.
- **Partial connectivity**: With some accounts/cards connected but not all (e.g. cards connected but no chequing account, so runway is unknowable), the recommendation computes on the known subset, carries an "Incomplete data" chip, and **withholds** any runway-dependent pick because runway is a primary money input that cannot be computed on a partial cash picture (`CashFlowForecast.data_completeness = partial` ⇒ flag; `BudgetState`/runway absent ⇒ withhold).
- **Stale / missing money inputs**: Stale or missing `RunwayForecast`/`CashFlowForecast`, `BudgetState`, or a stale `BestCardRecommendation`/`PointsValuation` underlying the reward figure → **withhold** the dependent recommendation and ask to refresh; never guess a money input (Constitution IV/VI/VIII). The single permitted documented default is the utilization guardrail when `CreditState` is **entirely absent**.
- **Conflicting advice with Cash Safety precedence**: When Pay's reward-optimal pick conflicts with Cash Safety's `SafeToActSignal`, Cash Safety wins (precedence order in ux-foundations §10.4: Cash Safety → Credit hard-avoid → Budget headroom → Rewards/Pay optimization). The Conflict Banner is shown; the overridden pick is displayed "Currently overridden" with its CTA disabled.
- **Conflicting advice within Pay's own inputs**: When Rewards' `BestCardRecommendation` names a card but Pay's utilization/runway overlay rejects it, Pay surfaces *its own* safer pick and cites that it diverged from the Rewards pick and why (this is the safety overlay working as designed, not an error).
- **Multi-currency**: A foreign-currency checkout amount is converted to CAD via a timestamped FX rate (arbitrary precision, half-up at the final cent) before any runway/budget reasoning; a stale FX rate flags the converted figure and withholds a runway-dependent pick. Foreign-currency card surcharges (FX fees) are included in the reward-vs-cost comparison where known.
- **Idempotency / retries**: Sequence acceptance, schedule publication, and audit writes are keyed on `source_event_id` with a `UNIQUE` constraint (platform-decisions §4); replays never double-apply. The Confirm-Action CTA is disabled in-flight (ux-foundations §4.2).
- **Cross-user boundaries**: In a Household, a request to recommend/sequence on another member's accounts without the granted `MemberScope` is denied server-side on session identity (never a client-supplied `profileId`) and the denial is audited. A `CheckoutRecommendation` for `{Name}` carries the profile name into the Confirm-Action CTA (ux-foundations §5.5).
- **Contract version skew**: A breaking change in a consumed contract (`BestCardRecommendation`, `CreditState`, `CashFlowForecast`, `SafeToActSignal`, `BillCalendar`) without a consumer migration disables the dependent Pay recommendation (consumer contract test fails in CI) rather than serving on a mismatched schema (umbrella edge case, SC-012).
- **Cent-level slippage**: Reward-value-net-of-cost comparisons and goal-progress deltas across a multi-step sequence must not drift by a cent under summation; all sequence arithmetic is integer-cents (see Money Correctness).
- **Sequencer infeasibility vs. partial feasibility**: Distinguish "no overdraft-free order exists" (surface shortfall + defer recommendation) from "an order exists but goal progress is zero" (still a valid, surfaced plan). Never present an infeasible plan as feasible.
- **Dependency not yet shipped**: Cash Safety (`SafeToActSignal`/`RunwayForecast`) and Bills (`BillCalendar`) may not exist at Pay MVP; the consumers are wired behind a feature check. Until `RunwayForecast`/`CashFlowForecast` is available, a runway-dependent checkout pick **withholds** rather than guessing; until `BillCalendar` is available, the sequencer operates on a user-entered obligation set and publishes `PaymentSchedule` with no downstream calendar sync.
- **Bilingual integrity**: A recommendation, sequence step, trade-off explanation, or label missing an EN or FR string is a defect, not silently shown in one language (FR-X-005).

## Clarifications

> Per the brief, ambiguities are resolved here (never blocking). These are documented decisions; any the product owner wishes to revisit are listed in [research.md](./research.md) open items.

### Session 2026-06-29

- Q: When the reward-optimal card is safe on utilization but the **net reward advantage over the safest account is below a trivial threshold**, does Pay still surface the card? → A: **Yes, but Pay prefers the safer method on a near-tie**, mirroring Rewards' tiebreak philosophy. Concretely: among methods that are all safe (no runway breach, ≤ warn band), Pay picks the **highest net CAD reward**; when two methods' net CAD reward differs by less than a documented trivial-delta default (`reward_tie_threshold_cents`, default **25¢**, user/ops-adjustable), it prefers the lower utilization-impact / higher-liquidity method. This is a **secondary tiebreak guardrail**, not a money-originating input.
- Q: How does the sequencer "maximize goal progress" — is it an optimizer or a heuristic for MVP? → A: **A deterministic, greedy, constraint-first heuristic** for MVP (Constitution IX / YAGNI): first find any overdraft-free ordering (pay obligations by due date, earliest binding constraint first); then, among slack days, advance discretionary goal contributions as early as the runway buffer allows. No general ILP optimizer at MVP. The heuristic is pure/deterministic and fixture-tested.
- Q: What is "runway safety" precisely for the checkout overlay? → A: A method is **runway-safe for a checkout** iff, after applying the checkout amount as an outflow on the spine's projection, the `projected_lowest_balance` over the forecast horizon stays **at or above the user's safety buffer** (i.e. no new `shortfall_flag`). Pay reads this from `CashFlowForecast`/`RunwayForecast` and `SafeToActSignal`; it never recomputes the forecast.
- Q: Does Pay ever schedule/execute a payment? → A: **Never.** Pay is recommend-and-record-only (FR-X-003). "Schedule" means recording a *proposed* dated item and publishing it as a `PaymentSchedule` for the user to execute externally and for Bills to reflect in the calendar. Every consequential step routes through a Confirm-Action sheet (ux-foundations §2.2).
- Q: When `RunwayForecast` (Cash Safety alias) and the spine's `CashFlowForecast` are both notionally available, which does Pay read? → A: **`CashFlowForecast` (`finos:spine/CashFlowForecast/1.0.0`) is the canonical money source** for runway; `SafeToActSignal` (Cash Safety) is the canonical **precedence/override** signal. The umbrella "RunwayForecast" name is an alias for the spine's `CashFlowForecast` consumed by Cash Safety and Pay alike; Pay pins `CashFlowForecast` to avoid depending on a not-yet-authored Cash Safety forecast contract, and consumes `SafeToActSignal` only for precedence.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-PAY-*):

- **FR-PAY-001 (Safe checkout recommendation)**: System MUST recommend a single checkout card/account justified by **rewards value, runway safety, and utilization together**. It MUST NOT recommend a method whose projected use pushes per-card or aggregate utilization above 50% (hard-avoid per `CreditState` bands) and MUST attach a utilization warning when the projected band is 30–50%. It MUST NOT recommend a method that introduces a new runway shortfall (`shortfall_flag`) at the checkout amount; when the reward-optimal card would breach runway, a safer account MUST be recommended with the trade-off shown. Reward value is **consumed** from Rewards (`BestCardRecommendation`/`PointsValuation`/`CardLineup`), not recomputed. **Missing/stale** `CashFlowForecast`/`RunwayForecast` or `BudgetState` (primary money inputs) MUST withhold. When `CreditState` is **entirely absent**, the system MUST apply the **documented healthy-band default** for the utilization guardrail and proceed without a user-facing flag (Constitution VI v2.2.0 documented-default exception); when `CreditState` is present but **stale**, the recommendation MUST flag/withhold. Per FR-X-002, all reward-net-of-cost and impact figures are computed in integer cents / arbitrary-precision decimal — never binary float.
- **FR-PAY-002 (Monthly payment sequencer)**: System MUST generate a monthly payment sequence that **avoids overdrafts and maximizes goal progress**, ordering obligations so that no intermediate projected balance breaches the safety buffer. The objective is a deterministic constraint-first heuristic: satisfy the no-overdraft constraint first (using `CashFlowForecast` inflows and the obligation set), then maximize goal progress (advance discretionary goal contributions within available slack). When no overdraft-free ordering exists, the system MUST NOT emit an overdrafting plan — it MUST surface the shortfall (date + amount), rank obligations by criticality, and recommend deferrals/renegotiations (handed to Bills). Every sequence and step is freshness-gated: stale runway/budget inputs withhold the sequence.
- **FR-PAY-003 (Accept & sync, idempotent, no money moved)**: System MUST, on user acceptance of a sequence, record each scheduled item **idempotently** (keyed on the source event id, safe to retry) and publish a `PaymentSchedule` that syncs the bill calendar (via Bills) — **without moving any money** (FR-X-003). Every confirmed acceptance is written to the append-only audit trail with its inputs and reasoning (FR-X-007). A scheduled item that later becomes overdraft-risky after a spine refresh MUST be flagged for re-sequencing, never silently left to drift.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), FR-X-017 (Step-up MFA — N/A here: Pay performs none of the three high-risk action classes; see Threat Model). FR-X-010/FR-HH-001 (cross-user authZ) applies via Household multi-profile checkout/sequencing.

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, not owned here): `BestCardRecommendation`, `CardLineup`, `PointsValuation` (Rewards); `CreditState` (Module 0/Credit utilization bands); `CashFlowForecast`/`RunwayForecast`, `SafeToActSignal` (Module 0 spine / Cash Safety); `BudgetState`, `GoalState`, `AccountState`, `MerchantGraph` (Module 0 spine); `BillCalendar` / recurring obligations (Bills).

Owned/provided by this module:

- **CheckoutRecommendation**: A `Recommendation` naming one payment method (card **or** account) for a checkout moment, carrying the net CAD reward value, the runway impact, the utilization effect, any Cash-Safety override, and bilingual reasoning. **Provided** to Bills, Cash Safety, Shopping, and Tasks.
- **PaymentSchedule / ScheduledPayment**: An ordered, dated set of proposed payment steps (obligation → source account → date → amount) produced by the sequencer, each with runway impact and goal-progress contribution; recorded idempotently on acceptance and published to sync the bill calendar. **Provided** to Bills, Cash Safety, Shopping, and Tasks. **No money is moved** — these are proposals/records only.
- **PaymentMethod (projection)**: The set of eligible methods Pay reasons over for a checkout — a card (from `CardLineup`) or an account (from `AccountState`) — annotated with its reward potential, projected utilization effect, and liquidity. A derived/internal projection, surfaced inside reasoning, not a separately-published contract.
- **SequencerResult**: The outcome of a sequencer run — `feasible` (an overdraft-free ordering) or `infeasible` (shortfall + deferral recommendations) — with the projected lowest balance, any shortfall date/amount, and the goal-progress delta. Surfaced in the UI; the published portion is the `PaymentSchedule`.
- **AuditEvent** (append-only; Principle VI / FR-X-007): records `recommendation_shown`, `sequence_proposed`, `sequence_accepted`, `schedule_published`, and `cross_profile_denied`; idempotent writes keyed on the source event id.

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: Checkout amounts, obligation amounts, projected balances, reward values, and goal-progress deltas are **integer minor units (CAD cents)**. FX rates, card earn multipliers, and any per-point reward rate consumed from Rewards are **arbitrary-precision decimal** (string-encoded on the wire). No binary floating point anywhere in the checkout overlay, the net-reward comparison, the sequencer, or the goal-progress math. Reward value is consumed already-valued from Rewards (`BestCardRecommendation`/`PointsValuation` carry CAD cents); Pay does not re-derive points-to-CAD valuation.
- **Rounding rules**: Any reward figure Pay must combine (e.g. net reward = reward_cents − fx_fee_cents − annual-fee amortization where applicable) is summed in integer cents; where a rate must be applied (e.g. converting a foreign checkout amount via FX), the product is computed in arbitrary precision and rounded **half-up to the nearest CAD cent once**, at the boundary, before it enters any comparison or projection. Intermediate products are never pre-rounded. The `reward_tie_threshold_cents` near-tie default is **25¢**.
- **Currency & locale**: CAD throughout, with time-to-goal context on goal-affecting steps (FR-X-004); en-CA and fr-CA locale-correct formatting via `@finos/format` (fr-CA `1 234,56 $`).
- **Determinism & fixtures**: The checkout overlay, the net-reward comparison, the runway-safety test, and the sequencer heuristic are **pure and deterministic**. Mandatory fixtures: (a) a checkout where the reward-optimal card is rejected for a runway breach and the safer account is chosen, asserting the exact reward-foregone in cents; (b) a checkout where the reward-optimal card lands in the 30–50% warn band → recommended with `utilization_warning = true`; a card landing > 50% → excluded; (c) a near-tie within `reward_tie_threshold_cents` resolving to the safer method; (d) a sequencer fixture over a fixed obligation+inflow set asserting every intermediate projected balance ≥ safety buffer and a deterministic order; (e) an **infeasible** sequencer fixture asserting no overdrafting plan is emitted and the shortfall date/amount is exact; (f) a foreign-currency checkout converted via a fixed FX rate with no cent drift; (g) an idempotency-replay fixture asserting a double-submitted acceptance records exactly once.
- **Idempotency**: All state Pay writes on the user's behalf — accepted `ScheduledPayment` records, the published `PaymentSchedule`, and audit events — is keyed on `source_event_id` with a `UNIQUE` constraint and is safe to retry (Constitution IV; platform-decisions §4). A replay never double-records a scheduled item or double-publishes.
- **Recommend-only**: Confirmed — Pay only recommends a method, proposes a sequence, and **records** an accepted proposal/schedule; it never executes a payment or moves money (FR-X-003). Every consequential action routes through a Confirm-Action sheet (ux-foundations §2.2).

### Security & Privacy Threat Model *(MANDATORY — Household multi-profile checkout/sequencing touches another person's financial data)*

- **Assets**: A profile's eligible `PaymentMethod` set (cards + accounts), the `CheckoutRecommendation` and `PaymentSchedule` (which reveal balances, runway, obligations, and goal targets), and the spine/Rewards/Credit inputs they reason over. These collectively reveal a member's cash position, debt, recurring obligations, and net-worth signals.
- **Trust boundaries / actors**: The owning member; other Household members acting under granted `MemberScope`; the spine and Rewards/Credit/Cash Safety/Bills modules (read-only providers via contracts); no external feed is owned by Pay (FX is consumed, not owned). Pay holds **no** aggregation tokens, OAuth credentials, or bank secrets — those live behind Module 0's `SpineAggregationPort` and the KMS-backed secrets store (platform-decisions §5); Pay reads only derived, freshness-stamped contracts. **Step-up MFA (FR-X-017) is N/A for Pay**: it performs none of the three high-risk action classes (issuing/re-authorizing aggregation tokens, changing household roles/scopes, data export/deletion).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across Household profiles | another member's `PaymentMethod` set, `CheckoutRecommendation`, `PaymentSchedule` | authZ on every cross-profile checkout/sequence request, keyed on validated **session identity** + Household `MemberScope` — never a client-supplied `profileId`/`memberId`; Postgres RLS as defense-in-depth | Yes (UI filtering alone does NOT satisfy) |
  | Replay / double-submission of an accepted sequence | `ScheduledPayment`, `PaymentSchedule` | idempotent writes keyed on `source_event_id` with a `UNIQUE` constraint; in-flight CTA disabled | Yes |
  | Stale-forecast unsafe recommendation presented as safe | `CheckoutRecommendation`, `PaymentSchedule` | freshness gate on every money input; stale runway/budget ⇒ withhold (FR-X-008) | Yes |
  | Silent execution / money movement | user funds | recommend-only architecture; no money-movement endpoint exists; every step routes through a Confirm-Action sheet | Yes (no endpoint to abuse) |
  | PII / monetary leak in logs | balances, obligations, schedules | structured logs redact PII + monetary values; append-only audit trail kept separate (FR-X-014) | Yes |
  | Denied cross-profile access not recorded | audit completeness | every denied cross-profile request emits a `cross_profile_denied` audit event (SC-015) | Yes |

- **AuthZ enforcement**: Every cross-profile read or sequence/acceptance for another member is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. Denied access is audited.
- **Data minimization, retention & revocation**: Pay stores only its derived artifacts (recommendations, proposed/accepted schedules, audit). It keeps **no** private copy of balances, budgets, credit, or obligations — those are read from contracts. Obligation/merchant enrichments that originate from an email source are subject to the umbrella email-revocation cascade (FR-X-013) and the dormant-account retention bound (FR-X-019).
- **Data residency**: All Pay data inherits the Canadian-region residency constraint (FR-X-020); no Pay-derived PII is processed outside Canada without disclosure and an accountability/transfer agreement.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-P-001 (Safety is real)**: For a representative basket of Canadian checkouts, the recommended method **never** introduces a runway shortfall and **never** pushes utilization above the 50% hard-avoid band; a recommendation that does is a defect (umbrella SC-002).
- **SC-P-002 (Integration is real)**: 100% of checkout recommendations attach reasoning referencing reward value, runway impact, and utilization effect; a recommendation that ignores an available relevant input is a defect (umbrella SC-001, FR-X-001).
- **SC-P-003 (Explainability)**: 100% of recommendations and sequence steps can display "why" with their inputs; the trade-off (reward foregone vs. runway protected) is shown whenever the reward-optimal pick is overridden (umbrella SC-005).
- **SC-P-004 (No overdraft in any accepted sequence)**: 100% of accepted payment sequences have every intermediate projected balance at or above the safety buffer at proposal time; an emitted sequence that overdrafts is a defect (FR-PAY-002).
- **SC-P-005 (No money moved)**: 0 money-movement actions executed by FinOS; 100% of consequential actions route through a Confirm-Action sheet (umbrella SC-007, FR-X-003).
- **SC-P-006 (Idempotency)**: 0 double-recorded scheduled items or duplicate audit entries under acceptance retry/replay; 100% of acceptance writes keyed on the source event id.
- **SC-P-007 (Money exactness)**: 0 cent-level slippage across the money-correctness fixtures; 100% of monetary math uses minor-units/arbitrary-precision (no float).
- **SC-P-008 (Freshness safety)**: 0 checkout recommendations or sequences served on a stale/missing primary money input without withholding; 0 silent uses of a documented default other than the utilization guardrail when `CreditState` is absent (umbrella SC-006).
- **SC-P-009 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Pay strings; 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-P-010 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).
- **SC-P-011 (Cross-profile safety)**: 0 cross-profile data exposures in API-layer authorization testing for Household multi-profile checkout/sequencing; every denied cross-profile access is audited (umbrella SC-015).
- **SC-P-012 (Conflict precedence)**: 100% of Cash-Safety/Pay conflicts resolve with Cash Safety taking precedence and the Conflict Banner shown; 0 cases where a Cash-Safety-flagged spend-positive pick is surfaced as the recommendation (ux-foundations §3.1, §10.4).

## UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab placement**: Pay is a P2 tab; under the five-tab rule it lives in the "More"/overflow group until promoted (ux-foundations §5.1).
- **Recommendation Card (§4.1)**: The checkout recommendation renders as a Recommendation Card. Action layer: "Pay with {method}." Why layer (mandatory, expandable): reward value + source + freshness · runway impact (projected lowest balance after this spend) + freshness · utilization before→after + band. CAD-impact line shows net reward value; time-to-goal line shown when a goal is affected. The first card a new user sees carries the "not regulated financial advice" disclaimer (§8.5).
- **Confirm-Action sheet (§4.2)**: Accepting a payment sequence routes through the Confirm-Action sheet. Primary CTA is specific — "Schedule payments" / "Planifier les paiements" (never "Confirm"); in a Household member view it carries the name — "Schedule payments for {Name}". The sheet recaps each step's exact CAD amount (integer cents), source account, and effective date, shows the Why layer, and renders the mandatory disclaimer. CTA disabled in-flight; idempotent on `source_event_id`.
- **Freshness chip (§4.3)**: Every consumed value (runway, budget, utilization, reward value) carries a visible freshness chip. Stale **money** inputs (runway/budget) drive the Withheld state, not a greyed card.
- **Conflict Banner (§4.4 / §3.1 / §10.4)**: Mandatory for the Cash-Safety-vs-Pay conflict. Names both signals, states the precedence rule (Cash Safety > Credit hard-avoid > Budget > Pay optimization), surfaces the safe pick, and shows the overridden pick "Currently overridden" with its CTA disabled.
- **Six-state matrix (§3)**: All six states defined for both Pay data views:
  - *Empty*: no accounts connected → "Connect an account to get a safe payment recommendation"; no zero-filled numbers.
  - *Loading*: skeletons matching the card/sequence layout.
  - *Partial*: cards connected but no chequing → Partial Data Banner + runway-dependent picks carry the "Incomplete data" chip and withhold runway-dependent recommendations.
  - *Stale*: stale runway/budget → Withheld Card + Refresh CTA; stale utilization (secondary, present-but-stale) → flag.
  - *Error / Degraded*: spine/Cash-Safety feed down → Unavailable chip, last-known timestamp, never present last-known runway as current.
  - *Withheld*: primary money input missing/stale, or unresolved conflict → Withheld Card stating what to refresh/connect with a direct CTA; never a guessed money input.
- **Accessibility (§7)**: Bilingual screen-reader labels on every value and CTA; WCAG 2.1 AA contrast; 44×44 pt tap targets; reduced-motion and Dynamic Type honored. Sequence list is keyboard/AT-navigable with per-step expandable Why.
- **Notification restraint (§6)**: Pay sends no standalone push; a "scheduled item became overdraft-risky" alert is emitted to the Inbox digest pipeline (Module 10), priority tier Important/Critical per imminence, never a direct push.

## Assumptions

- **Spine availability**: Module 0 exposes `AccountState`, `CashFlowForecast`, `BudgetState`, `CreditState`, `GoalState`, and `MerchantGraph` as versioned, freshness-stamped contracts; Pay consumes them and does not re-aggregate or recompute runway.
- **Rewards availability**: Module 1 exposes `BestCardRecommendation`, `CardLineup`, and `PointsValuation`; Pay consumes the already-CAD-valued reward figures and does not re-derive points valuation.
- **Cash Safety dependency**: `SafeToActSignal` (Module 3) provides overdraft precedence; it may not exist at Pay MVP. Until it does, Pay enforces runway safety from `CashFlowForecast` and utilization bands from `CreditState`, and wires `SafeToActSignal` precedence behind a feature check. The umbrella "RunwayForecast" is treated as an alias of the spine `CashFlowForecast` (Clarifications).
- **Bills dependency**: `BillCalendar` / recurring-obligation inventory (Module 4) supplies the obligation set and consumes Pay's `PaymentSchedule` to update the calendar; it may not exist at Pay MVP. Until it does, the sequencer operates on a user-entered obligation set and publishes `PaymentSchedule` with no downstream calendar sync; obligation renegotiation/cancellation is handed to Bills when present.
- **FX source**: For foreign-currency checkouts, a timestamped FX feed (the same shared spine/Travel FX source noted in Rewards research) converts to CAD under Fresh-or-Flagged; concrete vendor selected in planning (NR-4).
- **Sequencer scope (MVP)**: A deterministic constraint-first greedy heuristic, not a general optimizer (Constitution IX). Optimizer upgrades are deferred until a real user need is demonstrated.
- **Safety buffer & staleness windows**: User-adjustable safety buffer and Canada-oriented staleness defaults are read from the spine / set in the Module 0 plan (NR-2); Pay does not define its own.
- **Not regulated advice**: Checkout and sequencing recommendations are informational decision support, not regulated financial advice (surfaced to users).

# Feature Specification: Module 2 — Credit & Coaching

**Feature Branch**: `004-module-2-credit`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 2 — Credit & Coaching (Priority: P1)"; functional requirements FR-CRD-001..004 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Credit & Coaching** tab only — Credit Monitor, Due-Date & Utilization Coaching, Credit Builder Actions, and Refinance & Card-Lineup Optimization. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** spine contracts and does **not** re-implement aggregation, budgeting, or the canonical `CreditState`. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Credit behavior.
>
> **Boundary with Module 0 (Spine):** the spine is the **single canonical provider** of `finos:spine/CreditState/1.0.0` — utilization, bands, due-date risk (FR-CORE-005). The umbrella's "Module 2 **Provides**: `CreditState` enrichment" is realized by Credit **feeding bureau-sourced score/factor enrichment into the spine's CreditState pipeline**, not by publishing a competing `CreditState` contract. Credit's own provided contracts are `CreditFactors` (monitor read-model), `CreditCoachingPlan`, `CreditBuilderPlaybook`, and `RefinanceSignals`. See [Clarifications](#clarifications) C1.
>
> **Boundary with Module 1 (Rewards):** Rewards owns card earn rates, perks, and rewards-value valuation (`CardLineup`). Credit **consumes** `CardLineup` for the rewards-value side of keep/downgrade/cancel/refinance trade-offs and **provides** the credit-score side. Credit never re-values points (Clarification C2).
>
> **Boundary with Module 3 (Cash Safety):** Cash Safety's `SafeToActSignal` has **documented precedence** over any spend/payment recommendation, including Credit's early-payment advice (Clarification C3).

## User Scenarios & Testing *(mandatory)*

Credit & Coaching makes credit advice inseparable from how the user actually pays and earns. It surfaces the Canadian credit score and the factors driving it, advises a **specific early-payment amount** to keep utilization healthy before a statement cuts, runs a Canada-specific credit-builder playbook, and shows the long-term **rewards-AND-score** impact of keep/downgrade/cancel/refinance decisions — always recommend-only, always grounded in the spine's real balances and limits.

### User Story 1 — Credit Monitor: score and factors with freshness (Priority: P1)

A user views their Canadian credit score and the top factors driving it, each explained bilingually and stamped with when it was last refreshed.

**Why this priority**: It is the first visible payoff of the Credit tab and the foundation every coaching and refinance recommendation reasons over. It delivers standalone value before any coaching engine exists, and contributes to the 10-minute onboarding payoff (umbrella SC-014).

**Independent Test**: With a Canadian bureau feed connected, open Credit Monitor and confirm the score, score band, and ranked top factors each render with a bilingual explanation and a freshness chip; a stale feed flags the score rather than showing it as current.

**Acceptance Scenarios**:

1. **Given** bureau credit data is available, **When** the user opens Credit Monitor, **Then** the score (300–900), score band, and ranked top factors are shown, each with a freshness timestamp and a bilingual (EN/FR) explanation. *(FR-CRD-001)*
2. **Given** the bureau feed is stale beyond its threshold, **When** Credit Monitor renders, **Then** the score is shown with a Stale chip (last-known value + date) and dependent coaching is flagged/withheld — never presented as current. *(FR-X-008)*
3. **Given** no bureau feed is connected, **When** the user opens Credit Monitor, **Then** the Empty/Connect state is shown ("Connect your credit profile to see your score") — never a zero-filled or invented score. *(ux-foundations §3 Empty)*
4. **Given** an fr-CA user, **When** the score and a factor like utilization are displayed, **Then** all values use fr-CA conventions (e.g. `12,3 %`, `28 juin 2026`), not en-CA. *(FR-X-005)*
5. **Given** a prior observation exists, **When** the score changes, **Then** a signed delta since last observation is shown (e.g. `+12`), informational only.

---

### User Story 2 — Due-Date & Utilization Coaching with a specific early-payment amount (Priority: P1)

As a statement date approaches with high utilization, the user is advised to pay early by a **specific CAD amount** that drops the card below the healthy band, optionally with spend re-routed to another card — grounded in real balances and limits from the spine, and never recommending a payment that would create an overdraft.

**Why this priority**: This is the flagship daily-value differentiator of the Credit tab and the clearest expression of Integration-First — credit advice tied to the user's actual balances, limits, statement dates, and runway. Credit utilization is also an input to Rewards, Cash Safety, and Pay (umbrella "must exist early").

**Independent Test**: With a card whose utilization is in the warn/hard-avoid band and a statement date approaching, request coaching and confirm exactly one specific early-payment amount (integer cents) is recommended that brings the card below the target band, with reasoning citing balance, limit, utilization-before/after, and statement date — and that the recommendation is withheld if a money input is stale.

**Acceptance Scenarios**:

1. **Given** a card statement date approaches with utilization above the healthy band, **When** coaching runs, **Then** the user is advised to pay early by a **specific amount** (integer cents) that drops utilization below 30%, and spend may be suggested for re-routing. *(FR-CRD-002)*
2. **Given** the user's stated goal is credit-boosting, **When** coaching runs, **Then** the plan MAY target the optimal band (< 10%) and shows the time-to-goal contribution. *(FR-CRD-002, FR-X-004)*
3. **Given** `AccountState` balances/limits or `CreditState` utilization is **stale or missing** (a primary money input), **When** coaching is requested, **Then** the plan is **withheld** (`status='withheld'`, named reason) and the user is asked to refresh — the early-payment amount is **never** guessed. *(FR-X-008, Constitution VI; the documented-default exception does NOT apply — see Clarification C4)*
4. **Given** Cash Safety's `SafeToActSignal` indicates the early payment would create an overdraft risk, **When** coaching would recommend it, **Then** Cash Safety **takes precedence**, `safe_to_act_deferred=true`, and the conflict + resolution are surfaced (Conflict Banner). *(umbrella cross-module edge case; ux-foundations §3.1/§10.4)*
5. **Given** utilization is already within the target band, **When** coaching runs, **Then** `status='satisfied'` and no action is asserted (no manufactured advice).
6. **Given** a recommended early payment, **When** the user chooses to act, **Then** it routes through the **Confirm-Action sheet** showing the exact CAD amount and the disclaimer — FinOS **never** moves the money itself. *(FR-X-003, ux-foundations §2.2)*

---

### User Story 3 — Canada-specific Credit-Builder Playbook (Priority: P2)

The user follows a dynamic, Canada-specific playbook of recommend-only steps tailored to their current credit stage and factors (lower utilization before statement, keep the oldest card open, build an on-time-payment streak, limit hard inquiries before a planned application, consider a secured card / credit-builder loan where appropriate), each explained bilingually and framed as education, not regulated advice.

**Why this priority**: High long-term value but not required for the P1 monitor + coaching payoff; the playbook reasons over the same factor data US1 surfaces, so it ships after.

**Independent Test**: For a thin-file ("building") user, open the playbook and confirm it shows an ordered, bilingual set of Canada-specific steps with `informational_only=true`, no commissioned product push, and money-dependent specifics withheld when the underlying input is stale.

**Acceptance Scenarios**:

1. **Given** the user's factors and credit stage, **When** the playbook renders, **Then** an ordered list of Canada-specific steps is shown, highest-impact first, each bilingual and flagged `informational_only`. *(FR-CRD-003)*
2. **Given** a step whose specificity depends on a money input (e.g. a concrete pay-down amount) and that input is stale, **When** the playbook renders, **Then** the step is shown generically (no number) or withheld — never with a guessed figure. *(Constitution VI)*
3. **Given** any "consider a secured card / credit-builder loan" step, **When** it is shown, **Then** it is framed as informational decision support, not regulated advice and not a commissioned recommendation to acquire a specific product. *(Constitution Quality Standards "not a registered advisor")*

---

### User Story 4 — Refinance & Card-Lineup Optimization (rewards AND score impact) (Priority: P2)

For a keep/downgrade/cancel/refinance decision on a card, the user sees the **long-term impact on both rewards value (from Rewards) and credit score (from Credit)** so the trade-off is never one-sided.

**Why this priority**: Captures real money and protects the credit file from naive cancellations (cancelling an old card can shorten average age and raise utilization). It depends on both the monitor (US1) and the Rewards `CardLineup`, so it follows the P1 stories.

**Independent Test**: For a candidate card, request the optimizer and confirm each keep/downgrade/cancel/refinance option shows the net annual money delta (rewards value minus fee, integer cents) **and** the qualitative long-term credit-score impact, with reasoning citing both sides — withheld when a money input is stale.

**Acceptance Scenarios**:

1. **Given** a keep/downgrade/cancel/refinance decision on a card, **When** the optimizer runs, **Then** it shows the long-term impact on **both** rewards value and credit score. *(FR-CRD-004)*
2. **Given** cancelling a card would raise aggregate utilization or shorten average credit age, **When** the optimizer runs, **Then** the projected utilization impact and an `estimated_credit_score_impact` (e.g. `minor_decline`) are shown — never hidden to make a cancel look free. *(FR-CRD-004)*
3. **Given** a refinance candidate, **When** it is evaluated, **Then** the candidate APR (decimal-string fraction) and the net annual money delta are shown with a freshness stamp; a stale rewards-value or rate input **withholds** that signal rather than asserting a figure. *(FR-X-008)*
4. **Given** the Rewards `CardLineup` contract is unavailable or version-skewed, **When** the optimizer runs, **Then** the rewards-value side is marked unavailable (or the signal withheld) rather than fabricated. *(SC-012)*

---

### Edge Cases

- **Empty / no connectivity**: No bureau feed connected → Credit Monitor shows the Empty/Connect state (never a zero score); no card accounts connected → coaching has no balances to act on and shows the Empty state. *(ux-foundations §3)*
- **Partial connectivity**: Some cards connected but not all → coaching/refinance compute on the connected subset and surface the **Partial Data Banner**; each plan computed on a partial picture carries an "Incomplete data" chip. Aggregate-utilization advice is explicitly marked as based on the connected subset. *(ux-foundations §3 Partial)*
- **Stale / missing money inputs**: When `AccountState` balances/limits or `CreditState` utilization is stale/missing (primary money inputs), the early-payment amount and refinance money deltas are **withheld** and the user is asked to refresh — never guessed. A **stale `CreditState`** withholds; the documented-default exception does **not** apply because the early-payment amount and the refinance deltas are **money figures** (Clarification C4).
- **Stale bureau score**: A stale score is shown as last-known with a Stale chip; coaching that depends on the score narrative is flagged. The score itself is a guardrail/narrative value, not a money figure — but coaching that asserts a payment amount still requires fresh balances/limits.
- **Conflicting advice (Cash Safety precedence)**: Credit may advise paying a card down early while Cash Safety flags an overdraft risk from that payment. `SafeToActSignal` **takes precedence**; the Conflict Banner names both signals and the resolution. Resolution order (ux-foundations §10.4): Cash Safety safety signal > Credit hard-avoid band > budget headroom > optimization. *(Clarification C3)*
- **Multi-currency**: Canadian-issued cards are CAD; a foreign-currency card balance is FX-converted via a timestamped rate (arbitrary precision, half-up at the final cent) before computing a CAD early-payment amount; a stale FX rate flags/withholds the converted figure. *(FR-X-002)*
- **Idempotency / retries**: Any state Credit writes on the user's behalf (e.g. "early-payment plan acknowledged", "refinance signal dismissed", "playbook step marked done") is keyed on the source event id with a `UNIQUE` constraint; a replayed event never double-applies. Credit moves no money, so there is no double-charge surface — but acknowledgements/audit writes are still idempotent. *(Constitution IV, FR-X-003)*
- **Cross-user boundaries**: In a Household, a request for another member's score/factors/coaching without an authorizing `MemberScope` grant is **denied server-side and audited** — never satisfied by UI filtering or a client-supplied `profile_id`. *(Threat Model; SC-015)*
- **Contract version skew**: A breaking change in a consumed contract (`CreditState`, `AccountState`, `CardLineup`, `CashFlowForecast`, `GoalState`, `SafeToActSignal`) without a consumer migration disables the dependent coaching/refinance signal (consumer contract test fails in CI) rather than serving on a mismatched schema. *(SC-012)*
- **Hard vs soft bureau pull**: Monitoring uses a **soft pull only** (no score impact); the module never triggers a hard inquiry on the user's behalf. A planned-application step in the playbook explicitly warns about hard-inquiry timing rather than initiating one.
- **Statement-date timing**: An early-payment recommendation that can no longer affect the reported utilization (statement already cut) is re-framed as "for next cycle" rather than presented as still actionable for the current statement.
- **Bilingual integrity**: A score factor, coaching action, playbook step, or refinance rationale missing an EN or FR string is a defect, not silently shown in one language. *(FR-X-005)*

## Clarifications

### Session 2026-06-29

These decisions were made by the spec author to remove ambiguity (Constitution: resolve and document, never block). Items needing a vendor/product decision are non-blocking and tracked in [research.md](./research.md).

- **C1 — `CreditState` provider boundary**: The umbrella lists Module 2 as providing "`CreditState` enrichment", but the **Spine (Module 0)** is the single canonical provider of `finos:spine/CreditState/1.0.0` (FR-CORE-005). A contract may have only one provider (Principle VII). **Decision**: Module 2 does **not** re-publish `CreditState`; it **feeds bureau-sourced score/factor enrichment into the spine's CreditState pipeline** and publishes its own monitor read-model `CreditFactors` (score + ranked factors) plus the coaching/playbook/refinance contracts. This keeps a single source of truth for utilization/bands.
- **C2 — Rewards-value sourcing for refinance**: Credit does **not** re-value points or earn rates. The rewards-value side of keep/downgrade/cancel/refinance is **consumed from Rewards `finos:rewards/CardLineup/1.0.0`** (and its valuation), and Credit provides only the score/utilization side. Prevents duplicate, divergent valuation logic.
- **C3 — Conflict precedence**: When Credit's early-payment advice conflicts with Cash Safety's `SafeToActSignal` (the payment would risk an overdraft), **Cash Safety takes precedence** (ux-foundations §10.4 order). Until Cash Safety ships, Credit still enforces `CreditState` bands and proceeds; the `SafeToActSignal` consumer is wired behind a feature check.
- **C4 — Documented-default exception does NOT apply to coaching**: In Rewards, an **entirely absent** `CreditState` may use the healthy-band documented default because utilization is a *secondary guardrail* on a card recommendation (Constitution VI v2.2.0). In Credit, utilization is the **subject being acted upon** and the early-payment recommendation produces a **money figure**. Therefore Credit **withholds** when `CreditState` (or the underlying balances/limits) is missing or stale — it never substitutes a default utilization to manufacture a payment amount.
- **C5 — Bureau pull type**: Credit monitoring uses a **soft pull only** (no score impact); the module never initiates a hard inquiry. Concrete Canadian bureau vendor (Equifax Canada / TransUnion Canada) and residency posture are an open planning item (research.md NR-CRD-1), non-blocking.
- **C6 — Score is bureau-sourced, not modeled**: Credit displays a bureau score; it does **not** compute or simulate a proprietary score. "Score impact" of a decision is qualitative/bounded (e.g. `minor_decline`), never a fabricated precise point figure.
- **C7 — Default staleness windows**: Credit-bureau score/factors default to a **24 h** staleness window (slow-moving; bureau updates are not real-time); balances/limits inherit `AccountState` freshness (typically hours). User-adjustable; exact values confirmed in the Module 0 ops/PIA review (inherits platform NR-2).

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-CRD-*):

- **FR-CRD-001 (Credit Monitor)**: System MUST display the Canadian credit score (300–900), score band, and key factors with a freshness timestamp and a bilingual (EN/FR) explanation per factor. A stale score MUST be flagged (last-known + date), never shown as current; absence MUST render the Empty/Connect state, never a zero-filled score. Monitoring MUST use a soft pull only (no score impact). Provided as `CreditFactors`.
- **FR-CRD-002 (Due-Date & Utilization Coaching)**: System MUST advise a **specific early-payment amount** (integer cents) and MAY suggest spend re-routing to keep per-card or aggregate utilization in the healthy band (< 30%) before a statement date, and MAY target the optimal band (< 10%) when the user's goal is credit-boosting. The amount MUST be computed from real `AccountState` balances/limits and the canonical `CreditState` utilization in arbitrary precision, rounded half-up once at the cent. Missing/stale balances, limits, or `CreditState` MUST **withhold** the plan (the documented-default exception does NOT apply — Clarification C4). It MUST honor Cash Safety precedence. Recommend-only — every payment is surfaced via the Confirm-Action sheet for explicit user execution (FR-X-003). Canonical bands per `CreditState` (< 10% optimal, < 30% healthy, 30–50% warn, > 50% hard-avoid; user-adjustable). Provided as `CreditCoachingPlan`.
- **FR-CRD-003 (Credit-Builder Playbook)**: System MUST provide a dynamic, Canada-specific credit-builder playbook tailored to the user's credit stage and factors, each step bilingual, ordered by impact, flagged `informational_only`, and framed as education — never regulated advice or a commissioned push to acquire a specific product. Money-dependent step specifics MUST be withheld (not guessed) when the underlying input is stale. Provided as `CreditBuilderPlaybook`.
- **FR-CRD-004 (Refinance & Card-Lineup Optimization)**: System MUST show the long-term impact of keep/downgrade/cancel/refinance decisions on **both** rewards value (consumed from Rewards `CardLineup`) and credit score (utilization + average-age effects). Money deltas MUST be integer cents (rewards value computed in arbitrary precision, half-up at the cent); APRs MUST be decimal strings; score impact MUST be qualitative/bounded, never fabricated. A stale money input (rewards value, fee, balance, rate) MUST withhold the affected signal. Recommend-only — FinOS never executes a downgrade/cancel/refinance. Provided as `RefinanceSignals`.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-010 (Least privilege & threat model — applies because Household visibility exposes another person's credit data), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-013/019 (Retention/deletion of bureau-derived data), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), FR-X-020 (Residency).

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, not owned here): `CreditState` (canonical utilization/bands/due-date risk), `AccountState` (balances/limits), `CashFlowForecast` (runway), `GoalState` (credit-boosting goal + time-to-goal), `CardLineup` (Rewards — fees/earn/value), `SafeToActSignal` (Cash Safety — overdraft precedence).

Owned/provided by this module:

- **CreditFactors**: The Credit Monitor read-model — bureau score (300–900), score band, signed delta, and ranked top factors each with a bilingual explanation and a `FreshnessStamp`. **Provided** to Credit UI and Household. (Bureau-sourced score/factor narrative; distinct from spine `CreditState`.)
- **CreditCoachingPlan**: A recommend-only plan with a specific early-payment amount (integer cents) + optional spend re-route per card, utilization-before/after, statement date, `Reasoning`, Cash-Safety-precedence flag, and a withheld status/reason. **Provided** to Credit UI, Cash Safety, Pay, Bills, Household.
- **CreditBuilderPlaybook**: An ordered, bilingual, Canada-specific set of `informational_only` builder steps tailored to credit stage/factors. **Provided** to Credit UI and Household.
- **RefinanceSignals**: Per-candidate keep/downgrade/cancel/refinance signals carrying net annual money delta (cents), qualitative credit-score impact, projected utilization impact, optional refinance APR, `Reasoning`, and a withheld status/reason. **Provided** to Rewards, Cash Safety, Pay, Bills, Household.
- **AuditEvent**: Append-only record of every confirmed action and every recommendation shown (Principle VI / FR-X-007); kept separate from debug logs.

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: Card balances, credit limits, recommended early-payment amounts, annual fees, and rewards-value/net deltas are **integer minor units (CAD cents)**. Utilization fractions, APRs, and FX rates are **arbitrary-precision decimal**, string-encoded on the wire (`^[0-9]+(\.[0-9]+)?$`). No binary floating point anywhere in coaching, refinance, or valuation math.
- **Rounding rules**: The early-payment amount = the minimum payment, in cents, that brings `balance / limit` below the target band threshold, computed in arbitrary precision then **rounded half-up to the nearest CAD cent** (and rounded **up** to the next cent only where rounding down would leave utilization fractionally above the band — documented and unit-tested). Refinance rewards-value deltas convert any non-CAD figure via a timestamped FX rate in arbitrary precision, then half-up to CAD cents. Intermediate products are never pre-rounded.
- **Currency & locale**: CAD throughout, with time-to-goal context for credit-boosting goals (FR-X-004); en-CA and fr-CA locale-correct formatting (fr-CA `1 234,56 $`, `12,3 %`).
- **Determinism & fixtures**: Coaching and refinance math are pure and deterministic. **Mandatory fixtures**: (a) **early-payment slippage guard** — card balance `$4,500.00` (450000¢), limit `$5,000.00` (500000¢) → utilization 0.90 (hard-avoid); pay-down to below 0.30 requires paying to ≤ `$1,500.00` balance ⇒ recommended payment = `300000¢` ($3,000.00) exactly, no cent drift; (b) **band-boundary fixture** — a balance that lands utilization at exactly 0.30 (warn boundary) requires one more cent paid to cross below healthy, proving the half-up/round-up boundary rule; (c) **refinance net-delta fixture** — rewards-value delta `-$120.00` (downgrade loses value) minus fee saved `-$150.00` ⇒ net `+$30.00` (3000¢) exactly; (d) **FX-converted balance fixture** — a USD card balance converted via a fixed rate to CAD cents with no drift.
- **Idempotency**: Credit writes little state; any persisted state it does write (plan acknowledgement, refinance-signal dismissal, playbook-step-done, recommendation-shown audit) MUST be idempotent and safe to retry, keyed on the source event id (`UNIQUE`). (FR-X-003, platform-decisions §4.)
- **Recommend-only**: Confirmed — Credit only recommends an early payment / a keep-downgrade-cancel-refinance decision; it **never** executes a payment, a card cancellation, or a refinance (FR-X-003). Every money action routes through the Confirm-Action sheet (ux-foundations §2.2).

### Security & Privacy Threat Model *(MANDATORY — this module ingests credit-bureau data and exposes another person's credit data in Household views)*

This module touches **credit-bureau data** (highly sensitive PII) and, via Household visibility, **another person's financial data** — so a threat model is mandatory (Constitution V, FR-X-010).

- **Assets**: A profile's bureau **credit score and report factors**, card balances/limits/utilization, statement-due risk, early-payment plans, and refinance trade-offs. Together these reveal creditworthiness, debt load, and financial stress — high-harm if leaked.
- **Trust boundaries / actors**: The owning user; other household members under `MemberScope` grants; the Household module (grants visibility); the Spine (read-only provider of `CreditState`/`AccountState`); Rewards (read-only provider of `CardLineup`); the external **credit-bureau feed** (a subprocessor); Cash Safety (`SafeToActSignal`).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc across household members | another member's score/factors/coaching | authZ on every cross-member request, keyed on the **validated session identity** + `MemberScope` — never a client-supplied `profile_id`; denied access **audited** (SC-015) | Yes (UI filtering alone does NOT satisfy) |
  | Bureau credential / pull-token theft | bureau feed access | the bureau feed is accessed only behind the spine/secrets boundary; tokens live in the **KMS-backed secrets store**, never in a DB column or logs; pull is **soft-pull only** (platform-decisions §5) | Yes |
  | Stale-feed mis-coaching presented as fresh | score, utilization, early-payment amount | freshness stamp + flag/withhold on stale money inputs (FR-X-008); coaching withholds rather than guessing (C4) | Yes |
  | Bureau PII / monetary leak in logs | score, balances, payment amounts | structured logs **redact** PII + monetary values; immutable audit trail kept separate (FR-X-014) | Yes |
  | Unbounded retention of bureau-derived data | score history, factors | retention bounded; bureau-derived data subject to the deletion/dormant cascade within the platform window (FR-X-013/019), crypto-shred of per-subject keys (platform-decisions §5) | Yes |
  | Hard-inquiry harm | the user's score | the module **never** initiates a hard pull; monitoring is soft-pull only (C5) | Yes |

- **AuthZ enforcement**: Every cross-member read of credit data is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. The "kid" household role never sees another member's credit data and has no profile switcher (ux-foundations §5.5/§10.6).
- **Data minimization, retention & revocation**: Credit stores only what the monitor/coach/optimizer needs (score, factors, derived utilization references, plan/signal records). Bureau-derived data is subject to the umbrella deletion cascade (FR-X-013) and the dormant-account retention bound (FR-X-019). Revoking a member's grant immediately removes their credit visibility (no cached data shown — ux-foundations §5.5).
- **Data residency**: All credit data — score, factors, plans, signals — inherits the Canadian-region residency constraint (FR-X-020); the bureau subprocessor MUST be Canadian-region or covered by a disclosed PIPEDA cross-border accountability agreement (research.md NR-CRD-1; subprocessor register is a go-live gate, platform-decisions §5).
- **Not regulated advice**: Credit coaching and the builder playbook are informational decision support, not regulated financial or credit-repair advice; the disclaimer is surfaced (ux-foundations §8.5).

### UI/UX Notes *(referencing [ux-foundations.md](../_platform/ux-foundations.md))*

The Credit tab is a **P1 tab** in the launch tab bar (`[ Home ] [ Rewards ] [ Credit ] [ Cash Safety ]`, ux-foundations §5.1; label "Credit / Crédit").

- **Six-state matrix (§3) — defined for every data view (Monitor, Coaching, Playbook, Refinance):**
  - **Empty** — no bureau feed / no cards connected → first-run illustration + "Connect your credit profile" CTA; never a zero-filled score or `$0.00` utilization.
  - **Loading** — skeleton matching the score gauge + factor list + card; no bare spinner.
  - **Partial** — some cards connected → Partial Data Banner naming the gap ("Your Visa is not connected — utilization may be incomplete"); each plan carries an "Incomplete data" chip.
  - **Stale** — bureau score past threshold → last-known score + Stale chip; money inputs (balance/limit) stale → dependent coaching transitions to **Withheld** in place (§10.3).
  - **Error / Degraded** — bureau feed down → Unavailable chip + non-alarming "Unable to reach your credit bureau right now — we'll try again"; never the last score shown as current.
  - **Withheld** — primary money input (balance/limit/utilization) missing or stale → **Withheld Card** with a targeted CTA ("Refresh balance" / "Connect credit account"); **never** a guessed early-payment amount, never a greyed-out fake plan.
- **Recommendation Card (§4.1)** — every coaching action, playbook step, and refinance signal renders as a Recommendation Card with the mandatory **Why layer** (inputs: balance, limit, utilization-before/after, statement date, source feeds + freshness chips) and a freshness chip top-right. The first card a new user sees carries the "not regulated financial advice" disclaimer (§8.5).
- **Confirm-Action sheet (§4.2)** — an early-payment recommendation routes through the sheet: exact CAD amount (integer cents), source account, effective date, the Why layer, the mandatory disclaimer, and a specific CTA ("Schedule this payment to review" — never "OK"/"Confirm"). FinOS never moves the money; the sheet records the user's confirmation only. CTA disabled while in-flight; handler keyed on `source_event_id` (idempotent).
- **Freshness chip (§4.3)** — on the score, on each balance/limit, and on each refinance rate; tappable when stale/unavailable; localized accessible labels.
- **Conflict Banner (§4.4 / §10.4)** — shown when Credit's early-payment advice conflicts with Cash Safety's `SafeToActSignal`; names both signals, states "Cash Safety takes priority", surfaces the winning signal above and the overridden Credit card below with a "Currently overridden" chip + disabled CTA.
- **Key screens**: Credit Monitor (score gauge + ranked factor list), Coaching (per-card early-payment cards + statement-date timeline), Builder Playbook (ordered step list), Refinance Optimizer (per-candidate keep/downgrade/cancel/refinance trade-off card). The Home/Spine tab surfaces the top Credit recommendation with a "Go to Credit" link (§5.3).
- **Notification restraint (§6)** — Credit MUST NOT push directly; a due-date/utilization alert is emitted to the **Inbox digest** with `module_id`, `event_type`, `priority_tier` (a near-statement high-utilization warning is **Important**; an imminent due-date overdraft-adjacent alert may be **Critical** via Cash Safety), and a bilingual payload.
- **Locale & a11y (§7, §8)** — all score/utilization/amount/date values render through `@finos/format` (fr-CA `1 234,56 $`, `12,3 %`, `28 juin 2026`); bilingual screen-reader labels on every value and control; WCAG 2.1 AA; Dynamic Type and reduced-motion behaviors specified (score gauge renders final state under reduced motion).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-C-001 (Specific, grounded coaching)**: 100% of early-payment recommendations cite a **specific CAD amount** derived from real spine balances/limits and the canonical `CreditState` utilization, with utilization-before/after; a recommendation that asserts an amount on a stale/missing money input is a defect (FR-CRD-002, FR-X-001).
- **SC-C-002 (Withhold safety)**: 0 early-payment amounts or refinance money deltas are ever emitted on a stale or missing money input; such cases render the Withheld state (FR-X-008, Constitution VI; C4).
- **SC-C-003 (Money exactness)**: 0 cent-level slippage across the money-correctness fixtures (early-payment, band-boundary, refinance net-delta, FX-converted balance); 100% of monetary math uses minor-units/arbitrary-precision (no float).
- **SC-C-004 (Two-sided refinance)**: 100% of keep/downgrade/cancel/refinance signals show **both** the rewards-value impact and the credit-score impact; a one-sided signal is a defect (FR-CRD-004).
- **SC-C-005 (Explainability)**: 100% of coaching/refinance recommendations can display "why" with their inputs and bilingual rationale; ≥ 80% of usability-test users say they understand why a payment amount was recommended (umbrella SC-005).
- **SC-C-006 (Freshness safety)**: 0 credit scores, utilizations, or refinance rates served past their staleness threshold without a visible stale flag (umbrella SC-006).
- **SC-C-007 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Credit strings (score factors, coaching, playbook, refinance); 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-C-008 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).
- **SC-C-009 (Cross-member safety)**: 0 cross-member credit-data exposures in API-layer authorization testing for Household visibility; every denied cross-member access is audited (umbrella SC-015).
- **SC-C-010 (Recommend-only)**: 0 money-movement endpoints in the Credit API surface; every payment/cancel/refinance is a recommendation surfaced via the Confirm-Action sheet for explicit user execution (umbrella SC-007, FR-X-003).
- **SC-C-011 (Soft-pull only)**: 0 hard credit inquiries initiated by the module; monitoring is soft-pull only (C5).
- **SC-C-012 (Onboarding payoff)**: A new user connecting a credit profile sees a populated Credit Monitor (score + at least one factor) within the umbrella's 10-minute onboarding window (contributes to umbrella SC-014).

## Assumptions

- **Spine availability**: Module 0 exposes `CreditState`, `AccountState`, `CashFlowForecast`, and `GoalState` as versioned, freshness-stamped contracts; Credit consumes them and does not re-aggregate or recompute utilization. Until a contract is available, the dependent Credit story degrades (e.g. coaching withholds rather than guesses).
- **Rewards availability**: Module 1 exposes `CardLineup` (fees, earn rules, rewards value); Credit consumes it for the rewards-value side of refinance. Until available, refinance shows the credit side and marks the rewards side unavailable rather than fabricating it.
- **Cash Safety dependency**: `SafeToActSignal` (Module 3) may not exist at Credit MVP; until it does, Credit enforces `CreditState` bands and proceeds, and overdraft-precedence conflict handling is wired behind a feature check (C3).
- **Credit-bureau source**: A Canadian bureau feed (Equifax Canada / TransUnion Canada) is available for score + factors; until then the module degrades to manual entry (umbrella Assumptions, spec line 611). Concrete vendor + residency posture is a planning decision (research.md NR-CRD-1).
- **Soft-pull monitoring**: Monitoring is soft-pull only; no hard inquiry is ever initiated by the module (C5).
- **Utilization bands**: Defaults are fixed (< 10% optimal, < 30% healthy, 30–50% warn, > 50% hard-avoid), user-adjustable, and read from `CreditState` rather than recomputed here.
- **Staleness windows**: Score/factors default to a 24 h window; balances/limits inherit `AccountState` freshness; user-adjustable; exact values confirmed in the Module 0 ops/PIA review (C7, platform NR-2).
- **Not regulated advice**: Credit coaching and the builder playbook are informational decision support, not regulated financial or credit-repair advice (surfaced to users).

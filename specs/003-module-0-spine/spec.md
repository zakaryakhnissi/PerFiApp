# Feature Specification: Module 0 — Financial Core & Data Spine

**Feature Branch**: `003-module-0-spine`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 0 — Financial Core & Data Spine (Priority: P1)"; functional requirements **FR-CORE-001..007** and cross-cutting **FR-X-001..020** (esp. FR-X-009/010/013/017/019/020); Constitution **v2.2.0**; ratified platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md).

> **Scope note**: Module 0 is the **single canonical spine** — the source of truth for accounts, balances, transactions, the merchant graph, budget, cash-flow forecast, credit state, and goals that **every other module reads from**. It owns the connection/consent flow and the swappable aggregation boundary (`SpineAggregationPort`). It **provides** the eight spine contracts (plus the three shared value objects) and **consumes only external feeds** — it never reads product-module state, so there are no circular dependencies. It is the **broadest credential/security surface in the product**, so its threat model (token lifecycle + auth/MFA + IDOR) is mandatory.
>
> **Boundary with product modules**: Module 0 does **not** make product recommendations (best card, runway micro-action, keep/cancel). It surfaces canonical state + freshness; product modules reason over it. The one spine-level computed output that resembles a recommendation is the **freshness/degradation signal** that tells consumers when to flag or withhold.

## User Scenarios & Testing *(mandatory)*

The spine makes Integration-First possible: a single source of truth for balances, budget, cash-flow, credit, and goals, each freshness-stamped and exposed only through versioned contracts, so recommendations never silently diverge between tabs. The stories below are the spine **submodules**, prioritized so the platform can ship a usable first-value path (connect → see normalized state → one downstream consumer reads it) before the heavier intelligence (forecasting, credit, goals) lands.

### User Story 1 - Account Aggregation & Connection/Consent (Priority: P1)

A user securely links a Canadian bank or card through a connection/consent flow; accounts, balances, and (per granted scope) transactions appear in the spine, each tagged with source and freshness. Each household member who connects holds an **independent consent grant + token** under their own identity, and any member can revoke their own connection without disrupting others.

**Why this priority**: Nothing else in FinOS exists without connected accounts — this is the literal entry point and the onboarding milestone (SC-014: a user connects a first institution and sees value within 10 minutes). It is also the highest-risk surface (credentials + tokens), so it must be specified and threat-modeled first.

**Independent Test**: Run the connection/consent flow against one supported Canadian institution; confirm `AccountState` populates with balances and freshness stamps, the aggregation token is stored only in the secrets store (never in a DB column or log), and revoking the connection invalidates only that member's token and cascades to provider revocation.

**Acceptance Scenarios**:

1. **Given** a user launches the connection flow with a "why we need this" explainer, **When** they grant consent for chosen scopes and authenticate at a supported Canadian institution, **Then** `AccountState` populates with accounts/balances each carrying `source` + `FreshnessStamp`, and the granted `consent_scopes` are recorded on the `ConnectionConsent` link.
2. **Given** a successful connection, **When** the link is created, **Then** the aggregation access token is written only to the KMS-backed secrets store (never a DB column beside user data, never a log), and an `onboarding/connection` audit event is written (FR-CORE-007, FR-X-007).
3. **Given** a household with two members each connected to the same institution, **When** member A is removed, **Then** **partial revocation** invalidates only member A's token (`revoked_by = household_admin_partial`) and member B's connection and data remain intact (FR-CORE-007).
4. **Given** a user revokes a connection or requests deletion, **When** revocation runs, **Then** the provider connection is revoked, the secrets-store token is destroyed (`token_destroyed = true`), and the cascade completes within the 7-day SLA (FR-X-013).
5. **Given** the chosen institution is temporarily unavailable, **When** the user attempts to connect, **Then** the flow shows the **Error state** with the provider reason and a retry CTA, and offers the **manual / statement-import fallback** so the user can still get value (Module 0 edge case; ux-foundations §10.1).
6. **Given** issuing or re-authorizing an aggregation token, **When** the action is initiated, **Then** **step-up MFA is required** and password-only is rejected (FR-X-017).

---

### User Story 2 - Transaction Normalization, Categorization & Dedup (Priority: P1)

Raw transactions from one or more feeds are normalized into canonical, categorized records, **de-duplicated** across overlapping feeds, and linked to merchant-graph nodes, exposed as `TransactionStream`.

**Why this priority**: Transactions are the substrate for budget, cash-flow, subscriptions, tax, and shopping. Without dedup, every downstream money figure double-counts; this is a money-correctness prerequisite, not a nicety.

**Independent Test**: Ingest two feeds describing the same charge; confirm they collapse into one canonical transaction (one `merged_primary`, the other `merged_duplicate` excluded from sums) linked to one merchant node, with categories and freshness stamps.

**Acceptance Scenarios**:

1. **Given** two transactions from different feeds describing the same charge, **When** normalization runs, **Then** they de-duplicate into one canonical transaction linked to one `MerchantGraph` node (Module 0 AS-2).
2. **Given** an ambiguous near-duplicate (same amount/date, different descriptor), **When** dedup runs, **Then** it is marked `suspected_duplicate` and **excluded from money math** until resolved, never silently summed.
3. **Given** a foreign-currency transaction, **When** it is normalized, **Then** `cad_amount` is computed via a **timestamped FX rate** in arbitrary precision (half-up at the final cent), with `fx_rate` recorded; a stale FX rate flags `cad_amount`.
4. **Given** a pending transaction, **When** consumers read the stream, **Then** it is marked `pending` (provisional) and is not treated as a settled money input for runway.
5. **Given** a user overrides a category, **When** the stream is re-read, **Then** `category_source = user_override` and the override persists (idempotent, keyed on the source event id).

---

### User Story 3 - Merchant Graph (Priority: P1)

Raw descriptors resolve to canonical, bilingual merchant identities that tie together rewards, subscriptions, tax tagging, and shopping, exposed as `MerchantGraph`.

**Why this priority**: It is the join key that makes cross-module intelligence coherent (Rewards offers, Subscription detection, Tax tagging all key on the same merchant). It ships alongside US2 because normalization produces and consumes it.

**Independent Test**: Feed several raw descriptors for the same brand; confirm they resolve to one `merchant_id` with a canonical name and EN/FR display names, and that an email-only-sourced node is flagged `email_sourced` so it can be purged on email revocation.

**Acceptance Scenarios**:

1. **Given** multiple raw descriptors for one brand, **When** the graph resolves them, **Then** they map to a single `merchant_id` with `canonical_name` and EN/FR display names (bilingual — no single-language leak).
2. **Given** a merchant inferred **solely** from a promotional email, **When** it is written to the graph, **Then** it carries `email_sourced = true`; **and given** the user revokes email access, **Then** that node/enrichment is purged within the 7-day window regardless of which store holds it (FR-X-013).
3. **Given** a descriptor that cannot be confidently resolved, **When** normalization runs, **Then** the transaction's `merchant_id` is left null rather than mis-attributed.

---

### User Story 4 - Budget & Cash-Flow Forecast (Priority: P1)

The spine derives category budgets with current headroom (`BudgetState`) and a forward cash-flow forecast with runway days, lowest point, and shortfall flags (`CashFlowForecast`) from normalized inflows/outflows.

**Why this priority**: Budget headroom and runway are the **primary money inputs** every spend recommendation reads (Rewards best-card withholds without them; Cash Safety is built on the forecast). The spine must own them so tabs never diverge.

**Independent Test**: With normalized transactions and balances present, confirm `BudgetState` reports per-category headroom and `CashFlowForecast` reports runway days, projected lowest balance, and a shortfall flag — and that a multi-day-old balance flags/withholds the forecast rather than computing on stale money.

**Acceptance Scenarios**:

1. **Given** normalized transactions, **When** the budget engine runs, **Then** `BudgetState` reports per-category `budgeted`/`spent`/`headroom` (integer cents) and a total headroom.
2. **Given** balances and recurring cash-flows, **When** the forecast runs, **Then** `CashFlowForecast` reports `runway_days`, `projected_lowest_balance`, `projected_lowest_on`, and `shortfall_flag`.
3. **Given** the underlying balance is stale beyond its threshold, **When** any module requests the forecast, **Then** the forecast is returned **flagged stale / withheld** — no runway calculation on a multi-day-old balance (Constitution VIII).
4. **Given** only some accounts are connected, **When** budget/forecast compute, **Then** they compute on the connected subset with `data_completeness = partial` so consumers mark recommendations incomplete-data.
5. **Given** insufficient transaction history, **When** the forecast runs, **Then** `method = insufficient_history` and consumers treat it as low-confidence (may withhold) rather than presenting a confident false forecast.

---

### User Story 5 - Credit State Intake (Priority: P1)

The spine ingests credit data (bureau score/factors where connected, plus utilization derived from card balances/limits) and exposes `CreditState` with the **canonical utilization bands** every module reasons against.

**Why this priority**: Utilization is the guardrail the flagship Rewards recommender and the Credit module depend on; the bands must be defined **once** in the spine so Rewards, Credit, and Pay never disagree.

**Independent Test**: With card balances/limits present, confirm `CreditState` reports per-card and aggregate utilization and the correct band (`optimal` < 10%, `healthy` < 30%, `warn` 30–50%, `hard_avoid` > 50%); confirm absence of bureau data does not block utilization, and that consumers may apply the documented healthy-band default only when CreditState is **entirely absent**.

**Acceptance Scenarios**:

1. **Given** connected cards with balances and limits, **When** `CreditState` computes, **Then** per-card and aggregate `utilization` (decimal-string fractions) and their `band` are reported against the canonical thresholds.
2. **Given** no credit bureau is connected, **When** `CreditState` is read, **Then** `score` is null but utilization is still computed from account balances/limits (`utilization_source = derived_from_accounts`).
3. **Given** `CreditState` is **entirely absent** (no cards, no bureau), **When** a consumer needs utilization, **Then** the consumer applies the documented healthy-band default silently (Constitution VI v2.2.0); **but given** `CreditState` is present and **stale**, the consumer flags/withholds rather than reasoning on old utilization.
4. **Given** a statement due within the at-risk window, **When** `CreditState` is read, **Then** `due_date_risk = true`.

---

### User Story 6 - Goals & Time-to-Goal (Priority: P2)

A user defines savings/debt goals; the spine computes deterministic time-to-goal, required monthly contribution, and pace status (`GoalState`), surfaced wherever a monetary value needs time-to-goal context.

**Why this priority**: Time-to-goal context is required platform-wide (FR-X-004), but the wallet/runway/credit core delivers first value before goals; goals enrich, they don't gate onboarding.

**Independent Test**: Define a goal with a target amount and date; confirm `GoalState` exposes `required_monthly_contribution`, `time_to_goal_days`, `projected_completion_date`, and a `pace_status`, and that a downstream module can read the goal's contribution context.

**Acceptance Scenarios**:

1. **Given** a goal with target amount and date, **When** it is saved, **Then** `GoalState` exposes `required_monthly_contribution` and `time_to_goal_days` (computed in arbitrary precision, half-up at the final cent) to other modules (Module 0 AS-3).
2. **Given** the current contribution pace, **When** `GoalState` is read, **Then** `pace_status` is `on_track`/`ahead`/`behind`, or `unknown` when inputs are insufficient — never a guessed pace.
3. **Given** a goal with no deadline, **When** `GoalState` computes, **Then** `required_monthly_contribution` is omitted/zero and `projected_completion_date` reflects current pace only.

---

### User Story 7 - Contract & Freshness/Degradation Layer (Priority: P1)

Every spine value is exposed **only** through a versioned, freshness-stamped contract; external-source failures degrade gracefully (timeouts/retries/circuit-breakers), retaining the last-known value marked stale without corrupting the spine; version skew disables a dependent consumer rather than serving on a mismatched schema.

**Why this priority**: This is the constitutional backbone (Principles VII + VIII). It is P1 because the value of every other story is only as trustworthy as the freshness/versioning guarantees wrapping it.

**Independent Test**: Force an external feed timeout and a contract version bump; confirm the spine retains the prior value marked stale (and logs the failure without corruption), and that a consumer on a mismatched contract version has its dependent recommendation disabled by a failing contract test.

**Acceptance Scenarios**:

1. **Given** an external feed times out, **When** aggregation runs, **Then** the prior known value is retained, marked **stale**, and the failure is logged without corrupting the spine (Module 0 AS-5; FR-X-012).
2. **Given** a balance feed older than its threshold, **When** any module requests it, **Then** it is returned marked **stale** so consumers flag/withhold (Module 0 AS-4).
3. **Given** a provider ships a breaking contract change without a consumer migration, **When** CI runs, **Then** the consumer contract test fails and the dependent recommendation is **disabled**, not served on a mismatched schema (SC-012).

---

### Edge Cases

- **Partial connectivity**: With only some institutions connected, `AccountState.connection_completeness = partial` and `BudgetState`/`CashFlowForecast` carry `data_completeness = partial`; consumers MUST surface the Partial Data Banner + incomplete-data chip (ux-foundations §3, §10.2) and never present a partial picture as complete.
- **Stale / missing feeds**: Any value past its `staleness_threshold_seconds` is returned `is_stale = true`. Stale **money** inputs (balances, transaction amounts, forecasts) ⇒ consumers **withhold**; the spine never silently serves stale money as current (Constitution VIII).
- **Duplicate transactions**: Cross-feed duplicates collapse (`merged_primary` / `merged_duplicate`); `merged_duplicate` is excluded from sums and `suspected_duplicate` is excluded from money math until the user resolves it — preventing double-counted spend/runway.
- **Multi-currency**: Foreign accounts/transactions retain their original currency and are converted to CAD via a **timestamped FX rate** (arbitrary precision, half-up at the final cent); a stale FX rate flags the converted figure (FR-X-002, multi-currency edge case).
- **Institution unavailable → fallback**: When an institution is down or unsupported, the connection flow surfaces the Error state and offers a **manual entry / statement-import** path (`ingestion_mode = manual | statement_import`); manually-entered values are first-class but carry a **user-entered freshness stamp** that goes stale after a user-set window.
- **Token revocation**: On user revocation or deletion, the provider connection is revoked, the secrets-store token destroyed, and any data whose sole source was that connection is removed within the 7-day SLA (FR-X-013).
- **Household partial revocation**: Because each member holds an **independent** consent grant + token, removing one member invalidates only that member's `link_id` (`revoked_by = household_admin_partial`); other members' connections and data are untouched (FR-CORE-007).
- **Re-auth / login-required**: When a provider link needs re-authentication (`reauth_required`), re-issuing/re-authorizing a token requires **step-up MFA** (FR-X-017); until repaired, the affected accounts retain last-known balances marked stale.
- **Disconnected account**: A `disconnected`/`revoked` account retains its last-known balance marked stale and is never shown as current; the Empty/Unavailable states apply (ux-foundations §3).
- **Contract version skew**: A breaking change to a spine contract without consumer migration disables the dependent consumer (contract tests fail in CI) rather than serving a mismatched schema.
- **Bilingual integrity**: Any spine-surfaced label (merchant display name, category, connection status) missing an EN or FR rendering is a defect, not silently shown in one language.
- **IDOR attempt**: A request for another profile's/member's spine data outside the requester's granted `MemberScope` is denied server-side against the session identity and **audited** (threat model; SC-015).

## Clarifications

### Session 2026-06-29

These are decisions made to de-risk ambiguity without blocking. Items requiring product-owner confirmation are surfaced separately in **Open Questions for the Product Owner** below.

- **Q: Does Module 0 itself emit `assumed_healthy_default` for utilization, or only consumers?** → A: **Only consumers** substitute the documented healthy-band default when `CreditState` is *entirely absent*. The spine never fabricates a utilization value; `CreditState.utilization_source` is `bureau` or `derived_from_accounts`, and the `assumed_healthy_default` enum member exists so a consumer (e.g. Rewards) can record provenance when it applies the default. Stale `CreditState` flags/withholds — the default applies only to **total absence** (consistent with Rewards FR-REW-003).
- **Q: Is the aggregation token ever part of a contract?** → A: **No, never.** `ConnectionConsent` exposes only non-secret link metadata (status, scopes, revocation facts). Tokens live solely in the KMS-backed secrets store (FR-CORE-007). This is a hard boundary, not a default.
- **Q: How are suspected (not certain) duplicate transactions handled in money math?** → A: **Excluded from sums until resolved.** `suspected_duplicate` rows are surfaced for user confirmation and never silently summed — under-counting once is safer than double-counting money (Constitution IV bias toward correctness).
- **Q: Pending transactions in runway/budget?** → A: **Provisional, excluded from settled-money inputs.** Pending amounts may change; the forecast treats `posted` as settled and surfaces pending separately (consumers decide), never letting a provisional amount drive a withhold-grade money figure.
- **Q: Default staleness windows per data class?** → A: Concrete Canada-oriented defaults are set in [research.md §7](./research.md) (balances ~6 h, transactions ~12 h, credit ~24 h, FX ~1 h, goals derived), **user-adjustable**; the mechanism (per-value `FreshnessStamp` + threshold + withhold-on-stale-money) is fixed now. Final tuning is an ops/PIA decision (platform NR-2).
- **Q: What forecast method does the spine use for MVP?** → A: **Recurring-cash-flow detection plus a trend term** (`recurring_plus_trend`), degrading to `recurring_only` then `insufficient_history`; deterministic and fixture-tested, not an opaque model (research.md §5).

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-CORE-*):

- **FR-CORE-001 (Aggregation)**: System MUST aggregate accounts, balances, and transactions from supported Canadian institutions and tag each with `source` and `FreshnessStamp`, exposed via `AccountState` / `TransactionStream`.
- **FR-CORE-002 (Normalize/categorize/dedup)**: System MUST normalize, categorize, and de-duplicate transactions into canonical records linked to `MerchantGraph` nodes; cross-feed duplicates MUST collapse and `suspected_duplicate` rows MUST be excluded from money math until resolved.
- **FR-CORE-003 (Budget & forecast)**: System MUST maintain `BudgetState` (category headroom) and `CashFlowForecast` (runway, lowest point, shortfall) derived from inflows/outflows; a stale balance input MUST flag/withhold the forecast (no runway on stale money).
- **FR-CORE-004 (Goals)**: System MUST let users define goals and MUST compute `time_to_goal` and required contributions deterministically (arbitrary precision, half-up at the final cent), exposed via `GoalState`.
- **FR-CORE-005 (Versioned contracts)**: System MUST expose `AccountState`, `TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `CreditState`, and `GoalState` (plus `ConnectionConsent` and the shared `FreshnessStamp`/`Reasoning`/`MoneyCents`) as **versioned, freshness-stamped** contracts with consumer + provider tests in CI.
- **FR-CORE-006 (Connection/consent + swappable provider)**: System MUST provide a secure connection/consent flow for linking Canadian banks/cards, isolate the aggregation provider behind `SpineAggregationPort` (swappable without changing consumers), and manage credentials/tokens per FR-X-009 (encrypted, never logged, rotatable). Institution-unavailable cases MUST offer a manual / statement-import fallback.
- **FR-CORE-007 (Token lifecycle & threat model)**: Aggregation tokens MUST be stored in a dedicated secrets store / KMS — never in an application DB column beside user data, never in logs — and rotated on session invalidation, suspected compromise, privilege demotion, and a max-age schedule. Each household member MUST hold an **independent consent grant + token** under their own identity; **partial revocation** MUST invalidate only the departing member's token. The spec MUST include a threat model enumerating (1) aggregation-token exfiltration, (2) account takeover / credential stuffing, and (3) IDOR / horizontal privilege escalation on household boundaries — each with mitigations.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness), FR-X-003 (Recommend, never move — the spine writes only idempotent state, moves no money), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), **FR-X-009 (Security)**, **FR-X-010 (Least privilege & threat model)**, FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), **FR-X-013 (Privacy/deletion cascade)**, FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), **FR-X-017 (Auth & MFA)**, **FR-X-019 (Max retention / dormant anonymization)**, **FR-X-020 (Data residency)**.

### Key Entities *(include if feature involves data)*

Owned/provided by this module (see [data-model.md](./data-model.md) and [contracts/](./contracts/README.md)):

- **Account / AccountState**: A connected account (chequing/savings/card/loan/investment) with balance (integer cents), institution, `ingestion_mode`, status, and freshness. **Provided** to all modules.
- **Transaction / TransactionStream**: A normalized, categorized, de-duplicated money movement linked to a `MerchantGraph` node, with dedup state, pending/posted status, and CAD/FX fields. **Provided** to all modules.
- **Merchant (MerchantGraph node)**: Canonical, bilingual merchant identity with provenance and an `email_sourced` flag for the deletion cascade. **Provided** to all modules.
- **BudgetState**: Per-category budgeted/spent/headroom (integer cents) with completeness. **Provided** to all modules.
- **CashFlowForecast**: Projected balances, runway days, lowest point, shortfall flag, method, freshness. **Provided** to all modules.
- **CreditState**: Score (nullable), per-card + aggregate utilization (decimal-string fractions), canonical bands (< 10 / < 30 / 30–50 / > 50), due-date risk, freshness. **Provided** to all modules — the single source of utilization.
- **GoalState**: Goals with target, current, required monthly contribution, time-to-goal, pace. **Provided** to all modules.
- **ConnectionConsent / AggregationLink**: A member's independent consent grant + connection metadata (status, scopes, revocation) — **never** the token. **Provided** to Household / onboarding / Settings.
- **FreshnessStamp / Reasoning / MoneyCents**: Shared value objects published by the spine and reused by every module.
- **AuditEvent**: Immutable, append-only record of connection/consent/revocation/state-change events (FR-X-007).

### Money Correctness *(MANDATORY — this feature computes and displays monetary values)*

- **Numeric representation**: Balances, transaction amounts, budget headroom, forecast balances, goal amounts, and credit balances/limits are **integer minor units (CAD cents)** via `MoneyCents`. FX rates, utilization fractions, and band thresholds are **arbitrary-precision decimal strings**. **No binary floating point anywhere** in any spine money path (ESLint + DB schema-lint gate per platform §4/§6).
- **Rounding rules**: All derived money (budget headroom = budgeted − spent; forecast points; required monthly contribution; FX-converted `cad_amount`) is computed in arbitrary precision and rounded **half-up to the nearest CAD cent exactly once** at the storage/display boundary. Utilization = balance/limit computed in arbitrary precision; band classification compares against decimal-string thresholds.
- **Dedup correctness**: Money sums (budget spent, forecast inflow/outflow) MUST exclude `merged_duplicate` and `suspected_duplicate` rows so no charge is double-counted. This is a money-correctness invariant, fixture-tested.
- **Currency & locale**: CAD throughout with time-to-goal context (FR-X-004); en-CA / fr-CA locale-correct formatting at the edge (`1 234,56 $`), never stored formatted.
- **Determinism & fixtures**: Normalization, dedup, budget, forecast, utilization, and time-to-goal math are pure and deterministic. Mandatory fixtures: (a) **dedup sum** — two feeds, one real charge, total spend counts it **once**; (b) **FX conversion** — a fixed foreign amount × a fixed timestamped rate → exact CAD cents with no drift; (c) **utilization band** — balance/limit at the 9.99% / 10% / 29.99% / 30% / 50% / 50.01% boundaries classify into `optimal`/`healthy`/`warn`/`hard_avoid` exactly; (d) **runway** — a known balance + recurring outflows yields the expected `runway_days` and `projected_lowest_balance`; (e) **time-to-goal** — target/current/pace yields the expected `required_monthly_contribution` and days with half-up rounding.
- **Input validation at the user-entry edge**: user-entered amounts (manual balance entry, goal `target_amount`/`current_amount`) are **range-checked before persistence** — **non-negative where the `balance_kind`/goal semantics require it** (a manual liability balance is signed by `balance_kind`, not by a free-form negative), and **bounded in magnitude** (rejected above a sane ceiling so a `Number.MAX_SAFE_INTEGER`-scale goal target or absurd manual balance cannot enter the spine). Invalid amounts are **rejected, never silently coerced or clamped**. (Computed/ingested amounts remain integer-cents-typed and bypass this edge.) Fixture-guarded in T029/T087.
- **Idempotency**: Every state the spine writes on the user's behalf (a sync upsert, a category override, a goal save, a connection/revocation record) MUST be **idempotent and safe to retry**, keyed on `source_event_id` with a `UNIQUE` constraint — a replayed aggregation webhook or retried sync never double-applies (Constitution IV, FR-X-003).
- **Recommend-only**: The spine moves **no** money and exposes **no** money-movement endpoint; it surfaces canonical state and freshness only (FR-X-003, SC-007).

### Security & Privacy Threat Model *(MANDATORY — Module 0 is the broadest credential / aggregation-token / cross-user surface in the product)*

- **Assets**: Aggregation **access tokens** (the keys to a user's entire financial life); the FinOS **authentication surface**; every profile's `AccountState`/`TransactionStream`/`CreditState`/`BudgetState`/`GoalState`; household membership and `MemberScope` grants.
- **Trust boundaries / actors**: The owning user; other household members (gated by `MemberScope`); a household admin (role changes are MFA-gated); the external aggregation provider, credit bureau, and FX feed (consumed, never trusted as authZ); the KMS-backed secrets store (token custodian, isolated from the app DB).
- **Token lifecycle (FR-CORE-007)**: tokens stored **only** in the KMS-backed secrets store, encrypted with keys the application DB cannot access; **never** in a DB column beside user data, in any contract, or in any log. **Per-household-member independent consent grant + token** under each member's own identity (no shared tokens) — the prerequisite for **partial revocation**. Rotation triggers: session invalidation, suspected compromise, privilege/role demotion, and a max-age schedule. Revocation destroys the token (`token_destroyed = true`) and cascades to the provider within the 7-day deletion SLA. The **concrete signals** that set `reauth_required_reason = suspected_compromise` / drive rotation are enumerated, not left abstract: (a) a password/passkey reset, (b) **refresh-token reuse detection** (see *Session-token controls* below), (c) an admin-initiated rotation, and (d) a provider-signaled compromise; **session invalidation** means logout, refresh-token reuse, or password/credential reset. Each named signal is rotation-test-asserted (research §2; tasks T024).
- **Session-token controls (FR-X-017, inherited from platform D10)**: the FinOS auth surface — owned by this module per FR-X-017 — uses a **short-lived access JWT (≤15 min TTL)** plus a **rotating refresh token with reuse-detection**; a detected refresh-token reuse is treated as **suspected compromise**, invalidates the session, and triggers aggregation-token rotation (closing the loop with the rotation triggers above). Session/refresh tokens are server-side-revocable and held in secure, http-only/secure server-managed storage — **never** in mobile insecure storage (e.g. plain AsyncStorage). A `refresh-token-reuse` security test exercises this (tasks T024/Phase 10).
- **MFA gates (FR-X-017)**: **step-up MFA mandatory, password-only rejected** for: (a) issuing or re-authorizing an aggregation token, (b) modifying household roles/scopes, (c) data export or deletion.
- **Threats & mitigations**:

  | # | Threat | Affected asset | Mitigation | Enforced server-side? |
  |---|--------|----------------|------------|-----------------------|
  | 1 | **Aggregation-token exfiltration** | aggregation access tokens | tokens only in KMS secrets store, never in DB/contract/logs; per-member tokens; rotation on compromise; encrypted with keys the app DB can't access; token never crosses a contract boundary | Yes |
  | 2 | **Account takeover / credential stuffing** | FinOS auth surface → entire financial picture | passkey/WebAuthn-first auth; step-up MFA on the three high-risk action classes (FR-X-017); rate-limiting + lockout on the auth endpoint; **short-lived access JWT (≤15 min) + rotating refresh token with reuse-detection** (reuse ⇒ session invalidation + suspected-compromise rotation of linked tokens); session/refresh tokens server-side-revocable, never in mobile insecure storage (platform D10) | Yes |
  | 3 | **IDOR / horizontal privilege escalation on household boundaries** | another member's spine data (`AccountState`, `TransactionStream`, `CreditState`, …) | authZ on **every** cross-user read keyed on the **validated session identity, never a client-supplied profile_id/member_id**; **no provider-supplied identifier (e.g. Plaid `item_id`/`account_id`) is accepted from the client or used to authorize a read** — all lookups key on the FinOS `account_id`/`link_id` resolved from the validated session; service-layer `MemberScope` checks **and** Postgres RLS (defense-in-depth); UI filtering alone is non-compliant; denied access is **audited** (SC-015) | Yes |
  | 4 | Stale balance presented as current → wrong runway | balances, forecast | `FreshnessStamp` + withhold-on-stale-money (FR-X-008); disconnected accounts retain last-known marked stale | Yes |
  | 5 | PII / monetary leak in logs | balances, descriptors, identity | structured logs redact PII + monetary values; raw descriptors redacted; audit trail kept separate from debug logs (FR-X-014) | Yes |
  | 6 | Email-sourced data persisting after revocation | `MerchantGraph` email-inferred nodes | `email_sourced` flag drives the 7-day deletion cascade regardless of which store holds it (FR-X-013) | Yes |
  | 7 | **Malicious statement-import / manual-entry input** (file-upload + untrusted descriptors) | statement parser, bilingual summaries that later render descriptor/merchant strings | parse statements (PDF/CSV) in a **size/entity-bounded, sandboxed parser with no external-entity resolution** (defeats XXE / zip-bomb); treat all imported descriptors/labels and user-entered strings as **untrusted** and **output-encode at the rendering edge** (defeats stored XSS in financial summaries); range-validate user-entered amounts (see Money Correctness). Partly deferred — statement-import is a fast-follow (Open Question #3) — but the control is specified now so the parser ships behind it | Yes |

- **AuthZ enforcement**: every cross-user/cross-member spine read is authorized server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. Acting identity is derived from the validated session only.
- **Data minimization, retention & revocation**: least-privilege `consent_scopes`; the spine stores only what the contracts require; **dormant-account auto-anonymization at ≤24 months of inactivity** — this is the **enforced ceiling that ships**, satisfying the constitution's maximum-retention bound at go-live; the PIA (NR-3) may **only shorten** it, never lengthen it past 24 months. The test (T098) asserts the concrete 24-month window. 7-day deletion cascade across spine + module schemas + object storage + provider token revocation (FR-X-013) via crypto-shred of per-subject keys.
- **Data residency (FR-X-020)**: all spine data + PII stored and processed in a Canadian region; the aggregation provider, credit bureau, and FX subprocessors must satisfy Canadian residency **or** be disclosed + agreement-backed before go-live (subprocessor register is a go-live gate; platform NR-1/NR-4).

## UI / UX Notes *(connection/consent + first-run flow)*

References [ux-foundations.md](../_platform/ux-foundations.md). The spine owns the **Home/Spine tab** and the **connection/consent + onboarding flow** that every module depends on for first value.

- **Onboarding flow (ux-foundations §5.4, SC-014 — 10 minutes to first value)**: (1) Welcome with **EN/FR choice as the first interaction**, applied immediately; (2) a **"Why we need this" explainer** (one localized screen, plain language, with a "Not now" defer option) **before** launching the provider Link flow; (3) the provider Link/consent flow; (4) a **skeleton loading** Home screen ("Building your financial picture…", "Connecting to {institution}…"), not a spinner; (5) a first-value Home showing at least one balance, one runway indicator, and one downstream recommendation. Onboarding completion writes an audit event. No more than 5 screens to first value. The **"not regulated financial advice"** disclaimer appears on the welcome screen.
- **Consent & scopes**: the explainer states what scopes are requested and why (least privilege, Constitution V); granted `consent_scopes` are recorded on `ConnectionConsent`. Issuing/re-authorizing a token is **MFA-gated** (FR-X-017) — the step-up is surfaced in-flow.
- **All six states defined for every spine data view (ux-foundations §3)**: **Empty** (no accounts → "Connect an account to see your balance", never zero-filled money); **Loading** (skeleton matching populated layout); **Partial** (Partial Data Banner naming the gap + incomplete-data chip on dependent figures); **Stale** (Stale freshness chip; **withhold** dependent money figures, show Refresh CTA); **Error/Degraded** (Unavailable chip + non-alarming "Unable to reach {institution} — we'll try again", **plus the manual / statement-import fallback** CTA); **Withheld** (Withheld Card naming the missing money input + a direct CTA, never a greyed-out guess).
- **Freshness chips (ux-foundations §4.3)**: every spine value (balance, transaction, forecast, utilization, goal pace) carries an always-visible freshness chip with **localized** accessible labels; stale chips are tappable to a "what this means" explainer.
- **Connection-repair UX**: `login_required` / `reauth_required` links surface a repair affordance; re-auth is MFA-gated; affected accounts show last-known balances marked stale until repaired.
- **Household / multi-profile (ux-foundations §5.5, §10.6)**: a profile switcher shows only members within the viewer's `MemberScope`; a persistent **"Viewing {Name}'s finances"** banner is shown on every screen while viewing another member; a revoked member sees the Empty state immediately (no cached data); kid roles see no switcher. Data isolation is enforced **server-side**, never by UI filtering.
- **Revocation / deletion UX**: revoking a connection or requesting export/deletion is **MFA-gated** (FR-X-017), confirms the 7-day cascade, and (for households) makes clear that **partial revocation** affects only the current member's link.
- **Bilingual & locale (ux-foundations §8)**: all spine strings EN/FR; all money/percent/date rendered via `@finos/format` (fr-CA `1 234,56 $`, utilization `12,3 %`); merchant display names and categories bilingual.
- **Accessibility (ux-foundations §7)**: WCAG 2.1 AA; bilingual screen-reader labels on every balance, chip, and CTA; 44×44 pt targets; reduced-motion and dynamic-type honored.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-S-001 (Single source of truth)**: 100% of downstream modules read balances/budget/cash-flow/credit/goals from the spine contracts; 0 product modules re-aggregate or recompute utilization independently (umbrella SC-001, Integration-First).
- **SC-S-002 (Money exactness & dedup)**: 0 cent-level slippage across the money fixtures; 0 charges double-counted across overlapping feeds; 100% of spine money uses integer cents / arbitrary-precision decimal (no float) (FR-X-002).
- **SC-S-003 (Freshness safety)**: 0 spine values served past their staleness threshold without `is_stale = true`; 0 forecasts computed on a stale balance and presented as fresh (umbrella SC-006, Constitution VIII).
- **SC-S-004 (Token isolation)**: 0 aggregation tokens present in any DB column beside user data, any contract payload, or any log; 100% of tokens reside in the KMS secrets store and are rotatable (FR-CORE-007, FR-X-009).
- **SC-S-005 (Partial revocation & deletion)**: removing one household member invalidates only that member's token in 100% of cases with 0 disruption to remaining members; 100% of verified deletion requests complete the spine + provider cascade within 7 days (FR-X-013, SC-013).
- **SC-S-006 (MFA gates)**: 100% of token issuance/re-authorization, household-role changes, and export/deletion actions require step-up MFA; 0 succeed with password-only (FR-X-017).
- **SC-S-007 (Cross-user safety / IDOR)**: 0 cross-user/cross-member spine exposures in API-layer authorization testing; every denied cross-user access is audited (umbrella SC-015).
- **SC-S-008 (Contract reliability)**: 100% of the **11 published contracts** (8 spine + 3 shared value objects) have passing consumer + provider tests in CI before release; 0 breaking changes ship without a migration plan + deprecation window (umbrella SC-012).
- **SC-S-009 (Graceful degradation)**: 100% of external-feed failures retain the last-known value marked stale and log the failure without corrupting the spine; 0 incorrect money figures produced under feed failure (FR-X-012).
- **SC-S-010 (Bilingual parity & locale)**: 0 single-language leaks in shipped spine strings; 100% of displayed money/percent/date values use the active locale's conventions (umbrella SC-008).
- **SC-S-011 (Residency)**: 100% of spine data + PII stored/processed in a Canadian region; every subprocessor (provider, bureau, FX) is disclosed + agreement-backed before go-live (umbrella SC-017, FR-X-020).
- **SC-S-012 (Onboarding payoff)**: a new user connecting a first institution sees normalized balances + one runway indicator within the 10-minute window (contributes to umbrella SC-014).

## Open Questions for the Product Owner

These are non-blocking — the spec records a documented working decision for each, but they want product-owner confirmation (relayed by the main session). Defaults below are what the spec currently assumes.

1. **Dormant-account inactivity window (FR-X-019)** — exact duration before auto-anonymization. *Committed ceiling*: **≤24 months** of inactivity ships and is test-enforced (T098), meeting the constitution's maximum-retention bound at go-live. The PIA (NR-3) may **only shorten** this, never extend it. → Confirm or shorten.
2. **Staleness windows per data class (FR-X-008, NR-2)** — *Default assumed*: balances 6 h, transactions 12 h, credit 24 h, FX 1 h (research.md §7), user-adjustable. → Confirm Canada-oriented defaults.
3. **Statement-import fallback scope** — when an institution is unavailable, is **PDF/CSV statement import** in MVP scope, or is **manual single-balance entry** sufficient for v1? *Default assumed*: manual single-balance entry in MVP; statement-import behind the same `ingestion_mode` enum, delivered as a fast-follow. → Confirm scope.
4. **Credit bureau in MVP** — is a live Canadian bureau (Equifax/TransUnion) connection in MVP scope, or does v1 derive utilization **from account balances/limits only** (score null until a bureau is added)? *Default assumed*: utilization-from-accounts in MVP; bureau score as a fast-follow (research.md §6). → Confirm.

## Assumptions

- **Platform stack is ratified**: TypeScript modular monolith, NestJS + Postgres 16 (Canadian region), Plaid behind `SpineAggregationPort`, KMS secrets store, append-only audit store — inherited from [platform-decisions.md](../_platform/platform-decisions.md); this spec does not re-decide them.
- **Provider swappability**: the concrete aggregation vendor (Plaid Canada) sits behind `SpineAggregationPort`; consumers depend only on spine contracts, never on provider types (FR-CORE-006). A vendor swap is a new adapter with zero consumer change.
- **Utilization bands are fixed defaults**: < 10% optimal, < 30% healthy, 30–50% warn, > 50% hard-avoid; user-adjustable; defined once in `CreditState` and read by all modules (no recompute).
- **FX may become a shared spine contract**: a single spine-level FX provider can serve both the spine and Travel (cross-module follow-up).
- **Goals are P2**: onboarding first-value does not depend on a goal being set; time-to-goal context enriches once a goal exists.
- **Not regulated advice**: the spine provides informational decision support only; freshness/degradation signals are not financial advice.

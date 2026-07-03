# Implementation Plan: Module 5 — Pay & Payment Optimization

**Branch**: `007-module-5-pay` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/007-module-5-pay/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Pay & Payment Optimization is the P2 **decision-point integrator** that ties Rewards, Credit, Cash Safety, and Bills together at the moment a payment is made or sequenced. It answers two daily questions a points-only tool cannot: **"which card/account is safe to pay with right now?"** (a `CheckoutRecommendation` whose reasoning cites reward value **and** runway safety **and** utilization effect together) and **"in what order should I pay this month's obligations so I never overdraft and still move toward my goals?"** (a `PaymentSchedule` from a deterministic, constraint-first sequencer). Pay is a **consumer** of `BestCardRecommendation`/`CardLineup`/`PointsValuation` (Rewards), `CreditState`/`CashFlowForecast`/`BudgetState`/`GoalState`/`AccountState`/`MerchantGraph` (Module 0 spine), `SafeToActSignal` (Cash Safety), and `BillCalendar` (Bills); it re-implements none of them and re-derives no points valuation. It is a **provider** of `CheckoutRecommendation` and `PaymentSchedule` to Bills, Cash Safety, Shopping, and Tasks. Technical approach: a recommend-and-record-only service layer applying a **safety overlay** (runway + utilization + budget) over Rewards' best-card pick, a pure/deterministic greedy sequencer, all monetary math in integer minor units / arbitrary-precision decimal, freshness-gated reads (stale money inputs withhold), idempotent acceptance writes keyed on `source_event_id`, server-side cross-profile authZ, Cash-Safety-precedence conflict resolution, and consumer+provider contract tests in CI. FinOS never moves money (Constitution IV; FR-X-003).

## Technical Context

> **Platform-stack note**: The FinOS platform stack, architecture, conventions, and CI gates are **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (v1.0.0, approved against Constitution v2.2.0). This module **inherits** them verbatim and does **not** re-decide platform choices (Constitution IX / research §1). Items below marked **[INHERITED]** come from the ratified platform; items marked **[PAY]** are decisions this plan owns. Genuinely module-specific unknowns are marked **NEEDS CLARIFICATION** and resolved in [research.md](./research.md).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10 backend, Fastify adapter) + React Native (Expo) mobile **[INHERITED — platform-decisions §2]**. Pay is one NestJS module (`PayModule`) = one bounded context.

**Primary Dependencies**: `@finos/money` (`bigint` cents + `decimal.js` string-encoded rates, half-up once), `@finos/format` (en-CA/fr-CA), `@finos/contract-*` (semver'd JSON-Schema contracts + generated types), Pact (consumer + provider contract tests), Prisma (Postgres `pay` schema) **[INHERITED]**. Spine/Rewards/Cash-Safety/Bills access is **only** via the Module 0/1/3/4 contract clients under `contracts/consumed/`, never direct DB reads **[PAY]**.

**Storage**: Pay-owned derived state only — `CheckoutRecommendation` records, proposed/accepted `ScheduledPayment` + published `PaymentSchedule`, and the append-only audit projection — in the Canadian-region PostgreSQL `pay` schema with a per-schema role + RLS **[INHERITED — platform-decisions §3]**. **No private copy** of balances/budget/credit/obligations — those are read from spine/Rewards/Bills contracts (single-canonical-spine assumption). Append-only `audit.event_log` is the audit source of truth **[INHERITED]**.

**Testing**: Unit (money fixtures, safety-overlay band logic, runway-safety predicate, sequencer feasibility/infeasibility, idempotency replay, locale), **consumer + provider contract tests** per contract, integration (per user story), all in CI **[PAY]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API **[INHERITED]**.

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped recommendation + sequence; the overlay and sequencer return within the same budget on cached spine/Rewards reads. Stale renders a flagged/Withheld state, never a blocking fetch.

**Constraints**: Money is exact (integer minor units / arbitrary-precision decimal, never float — Principle IV); every external-sourced value carries a freshness stamp and stale **money** reads are withheld (Principle VIII); recommend-and-record-only, no money movement (Principle IV / FR-X-003); idempotent acceptance writes keyed on `source_event_id` (Principle IV / platform-decisions §4); EN/FR + locale-correct formatting (Principle II); Cash-Safety `SafeToActSignal` has documented precedence over Pay optimization (ux-foundations §3.1/§10.4); cross-profile authZ enforced server-side on session identity (Principle V).

**Scale/Scope**: Per-user/per-profile checkout + monthly-sequence data (tens of obligations/methods per user typical); **3 module-owned FRs (FR-PAY-001..003)** across **3 prioritized user stories** (US1 checkout overlay P1, US2 sequencer P1, US3 accept & sync P2); 5 owned entities (2 published contracts: `CheckoutRecommendation`, `PaymentSchedule`); consumes 11 contracts (9 authored + 2 pinned-not-yet-shipped).

**NEEDS CLARIFICATION** (→ research.md open items, all non-blocking): (OI-1) Canadian-region FX vendor + residency for foreign-currency checkouts (shared with Rewards/Travel, NR-4); (OI-2) exact `SafeToActSignal` / `BillCalendar` schema shapes (owned by Modules 3/4 — pinned `$id`/version now); (OI-3) `reward_tie_threshold_cents` 25¢ default + user-adjustable safety buffer (confirmed in Module 0 ops review, NR-2); (OI-4) sequencer optimizer upgrade (deferred per Constitution IX); (OI-5) obligation criticality-ranking source for the infeasible case (finalized with Bills).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/credit/goals state? | **PASS** — the checkout overlay consumes `BestCardRecommendation`, `CreditState`, `CashFlowForecast`, `BudgetState` (+`SafeToActSignal`); the sequencer consumes `CashFlowForecast`, `GoalState`, `BillCalendar`. Ignoring an available relevant input is a defect (SC-P-002). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD + time-to-goal on goal-affecting steps; EN/FR with no single-language leaks; fr-CA `1 234,56 $` via `@finos/format` (SC-P-009). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — money fixtures, runway-safety predicate, band logic, sequencer feasibility/infeasibility, idempotency replay, stale/withhold, bilingual, and consumer+provider contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — integer CAD cents for amounts/balances/reward/goal-deltas + arbitrary-precision FX (half-up once at the cent), slippage/summation fixtures, pure/deterministic overlay + sequencer, idempotent acceptance keyed on `source_event_id`, recommend-and-record-only (no money-movement endpoint). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a MANDATORY threat model (Household multi-profile checkout/sequencing touches another member's data); cross-profile authZ enforced server-side on session identity + `MemberScope`, never client `profileId`; RLS defense-in-depth; Pay holds **no** tokens/secrets (delegated to Module 0). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — `CheckoutRecommendation`/`PaymentSchedule` carry `Reasoning` citing reward+runway+utilization (SC-P-003); confirmed acceptances written append-only (FR-PAY-003); missing/stale money inputs withhold; absent `CreditState` uses the documented healthy-band default per the v2.2.0 exception (the **only** permitted default — `utilization_source` enum). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes 11 / provides 2 versioned JSON-Schema contracts; consumer+provider tests in CI (SC-P-010); semver with migration window; version skew disables the dependent recommendation (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every consumed value carries a `FreshnessStamp`; stale **money** inputs (runway/budget/reward) withhold (SC-P-008); consumed-contract clients have timeouts/retries; FX stale withholds the runway-dependent pick. |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — recommend/record service over consumed contracts; sequencer is a deterministic greedy heuristic, **no** ILP/optimizer at MVP (research §4); no premature abstraction; P2 module stays MVP-scoped. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in logs (audit separate); Canadian-region residency inherited; no private copy of spine data (data minimization); ≤300 ms; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing surfaced on Confirm-Action sheets + first card. |

**Threat model (Principle V)** — REQUIRED here because Household multi-profile checkout/sequencing touches another member's financial data. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--household-multi-profile-checkoutsequencing-touches-another-persons-financial-data). Aggregation-token lifecycle and the three high-risk MFA action classes (FR-X-017) are **out of scope / N/A** for Pay (owned by Module 0; Pay performs none of them); Pay reads only derived, freshness-stamped contracts and holds no tokens/secrets.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and contracts preserve money-exactness (integer cents + decimal FX, half-up once), freshness-withhold on primary money inputs, idempotent acceptance, server-side cross-profile authZ, Cash-Safety precedence, and recommend-and-record-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/007-module-5-pay/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── provided/        # CheckoutRecommendation, PaymentSchedule
│   └── consumed/        # pinned $id/versions for the 11 consumed contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/pay/
    ├── domain/           # entities: CheckoutRecommendation, PaymentSchedule/ScheduledPayment,
    │                     #           PaymentMethod (projection), SequencerResult, DeferralRec
    ├── money/            # integer-cents combine (reward − fx-fee), FX half-up convert, near-tie threshold,
    │                     #           goal-progress-delta summation (no float)
    ├── services/         # checkout-overlay (safety overlay over Rewards pick), runway-safety predicate,
    │                     #           sequencer (greedy constraint-first), accept-and-publish (idempotent),
    │                     #           conflict-resolution (Cash-Safety precedence)
    ├── contracts/
    │   ├── consumed/     # typed clients for BestCardRecommendation, CardLineup, PointsValuation,
    │   │                 #           CreditState, CashFlowForecast, BudgetState, GoalState, AccountState,
    │   │                 #           MerchantGraph, SafeToActSignal (feature-checked), BillCalendar (feature-checked)
    │   └── provided/     # CheckoutRecommendation, PaymentSchedule
    └── api/              # recommend-and-record-only endpoints (recommend / propose / accept-and-publish — NO money-movement endpoint)
backend/tests/
├── contract/            # consumer + provider contract tests
├── integration/         # per user story (US1..US3) + cross-profile authZ
└── unit/                # money fixtures, overlay bands, runway-safety, sequencer, idempotency, locale

mobile/
└── src/features/pay/
    ├── checkout/         # US1 — checkout Recommendation Card + Conflict Banner
    └── sequencer/        # US2 — sequence view + US3 accept via Confirm-Action sheet
mobile/tests/            # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Pay is a self-contained backend service module (`backend/src/modules/pay/`) exposing recommend-and-record-only endpoints and the two provided contracts, plus a mobile feature module (`mobile/src/features/pay/`) organized by user story. The module never reads spine/Rewards/Bills storage directly — only the contract clients under `contracts/consumed/` — preserving the swappable-spine and module-boundary guarantees (Principle VII). The concrete repository-root layout is ratified in platform-decisions §2–§3; this plan commits the intra-module structure under the ratified NestJS backend + React Native mobile.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. The sequencer is deliberately a deterministic greedy heuristic rather than an optimizer (Constitution IX / research §4), so no complexity deviation is introduced or needs justifying.

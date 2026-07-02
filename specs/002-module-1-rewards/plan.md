# Implementation Plan: Module 1 — Rewards & Loyalty

**Branch**: `002-module-1-rewards` | **Date**: 2026-06-26 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-module-1-rewards/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Rewards & Loyalty is the flagship P1 product tab. It aggregates loyalty/points balances and a Canada-first card knowledgebase, values points in CAD with time-to-goal context (including **transfer-partner / transfer-bonus-aware** valuation and points-expiry tracking, benchmarked against PointsYeah — see [competitive-analysis-pointsyeah.md](./competitive-analysis-pointsyeah.md)), and recommends the single best card for a merchant/moment **grounded in the spine's budget headroom and credit utilization** — never points in a vacuum. The module is a **consumer** of Module 0 spine contracts (`BudgetState`, `CashFlowForecast`, `CreditState`, `MerchantGraph`, `GoalState`) and Cash Safety's `SafeToActSignal`, and a **provider** of `CardLineup`, `PointsValuation`, `BestCardRecommendation`, `OfferCatalog`, and `StatusState` to downstream modules. Technical approach: a recommend-only service layer with all monetary math in arbitrary-precision decimal / integer minor units, freshness-gated reads, server-side cross-profile authZ, and consumer+provider contract tests in CI.

## Technical Context

> **Platform-stack note**: FinOS has no committed code yet and the umbrella spec defers platform/stack to planning. Items marked **[PLATFORM — ratify in Module 0 plan]** are cross-cutting decisions that belong to the Module 0 platform plan; the values below are this module's provisional recommendation and are flagged, not locked. Items marked **[REWARDS]** are decisions this plan owns. Genuinely open questions are marked **NEEDS CLARIFICATION** and resolved in [research.md](./research.md).

**Language/Version**: TypeScript 5.x on Node 20 LTS (backend) + React Native (mobile) **[PLATFORM — ratify in Module 0 plan]**. Rationale: one language across mobile + backend, strong contract-test + decimal ecosystem.

**Primary Dependencies**: `decimal.js` (or equivalent arbitrary-precision decimal) for redemption/FX math; a JSON-Schema/OpenAPI contract layer; a consumer-driven contract-test tool (e.g. Pact) **[REWARDS]**. Spine access is via the Module 0 contract clients, not direct DB reads **[REWARDS]**.

**Storage**: Rewards-owned state (card metadata cache, perk/credit usage state, offer-activation records, valuation cache) in a Canadian-region PostgreSQL **[PLATFORM — ratify in Module 0 plan]**. No private copy of balances/budget/credit — those are read from spine contracts (umbrella "single canonical spine" assumption).

**Testing**: Unit (money fixtures, valuation, recommender band logic), **consumer + provider contract tests** per contract, integration (per user story), all in CI **[REWARDS]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a backend API **[PLATFORM — ratify in Module 0 plan]**.

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped wallet + card lineup; recommender returns within the same budget on cached spine reads.

**Constraints**: Money is exact (integer minor units / arbitrary-precision decimal, never float — Principle IV); every external-sourced value carries a freshness stamp and stale reads are flagged/withheld (Principle VIII); recommend-only, no money movement (Principle IV / FR-X-003); EN/FR + locale-correct formatting (Principle II); cross-profile authZ enforced server-side (Principle V).

**Scale/Scope**: Per-user rewards data (tens of cards/programs per user typical); **11 module-owned FRs (FR-REW-001..011)** across **6 prioritized user stories** (US6 adds transfer/redemption intelligence from the PointsYeah benchmark); ~11 owned/provided entities; provides 6 contracts; consumes 6 spine contracts.

**NEEDS CLARIFICATION** (→ research.md): (1) redemption-rate (cents-per-point) data source + update cadence; (2) FX-rate source; (3) Canada-first card-knowledgebase source (curated vs licensed feed); (4) card-linked-offer feed/source per Canadian bank; (5) staleness-threshold defaults for valuations/offers.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/credit/goals state? | **PASS** — recommender consumes `BudgetState`, `CreditState`, `CashFlowForecast`, `GoalState`, `SafeToActSignal`; ignoring an available input is a defect (SC-R-002). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD + time-to-goal everywhere; EN/FR with no single-language leaks; fr-CA `1 234,56 $` via locale formatter (SC-R-006). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — money fixtures, band logic, stale/withhold, bilingual, and contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — arbitrary-precision rates/FX + integer CAD cents, half-up rounding, slippage fixtures, idempotent writes keyed on event id, recommend-only (no money movement). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a threat model; cross-profile authZ enforced server-side on session identity, not client `profileId`; no token handling here (delegated to Module 0). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — `BestCardRecommendation` carries inputs/reasoning (SC-R-003); confirmed actions written to the append-only audit trail; missing/stale money inputs withhold, and absent `CreditState` uses the documented healthy-band default per the v2.2.0 exception (FR-REW-003). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts; consumer+provider tests in CI (SC-R-008); semver with migration window. |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — valuations/offers carry freshness stamps; stale rates flag/withhold (SC-R-005); rate/offer ingestion has timeouts/retries. |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — read/recommend service over spine contracts; no premature abstraction; P3 stories deferred. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in logs (audit separate); Canadian-region residency; ≤300 ms; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing surfaced. |

**Threat model (Principle V)** — REQUIRED here because Multi-Profile Rewards Manager touches another person's financial data. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model). Aggregation-token lifecycle is **out of scope** for Rewards (owned by Module 0 / FR-CORE-007); Rewards reads spine contracts only.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — data model and contracts preserve money-exactness, freshness, server-side authZ, and recommend-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/002-module-1-rewards/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/rewards/
    ├── domain/            # entities: PointsValuation, CardLineup, BestCardRecommendation, WelcomeBonus,
    │                      #           StatementCredit/Perk, Offer, StatusState, TransferRoute, TransferBonus,
    │                      #           PointsExpiry, EarnPath
    ├── money/             # arbitrary-precision decimal + integer-cents helpers, half-up rounding, transfer-ratio math
    ├── services/          # valuation (+transfer-aware), best-card-recommender, perks-coach, bonus-tracker,
    │                      #           offers, transfer-intelligence, expiry-alerts, earn-path
    ├── contracts/
    │   ├── consumed/      # typed clients + schemas for spine contracts (BudgetState, CreditState, ...)
    │   └── provided/      # CardLineup, PointsValuation, TransferIntelligence, BestCardRecommendation, OfferCatalog, StatusState
    └── api/               # recommend-only endpoints (no money-movement endpoints)
backend/tests/
├── contract/             # consumer + provider contract tests
├── integration/          # per user story (US1..US5)
└── unit/                 # money fixtures, valuation, utilization-band logic, idempotency

mobile/
└── src/features/rewards/
    ├── points-wallet/     # US1
    ├── best-card/         # US2
    ├── perks-coach/       # US3
    ├── bonus-tracker/     # US4
    ├── offers/            # US5
    └── transfer-intel/    # US6 (transfer partners, bonuses, expiry, earn-path)
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Rewards is a self-contained backend service module (`backend/src/modules/rewards/`) exposing recommend-only endpoints and the provided contracts, plus a mobile feature module (`mobile/src/features/rewards/`) organized by user story. The module never reads spine storage directly — only the Module 0 contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII). The concrete repository root layout is ratified in the Module 0 platform plan; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify.

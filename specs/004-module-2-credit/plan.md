# Implementation Plan: Module 2 — Credit & Coaching

**Branch**: `004-module-2-credit` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-module-2-credit/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow. Platform-level stack and CI gates are **inherited** from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (ratified) and [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md); this plan does **not** re-decide them.

## Summary

Credit & Coaching is the P1 Credit tab. It surfaces the Canadian bureau credit score and the factors driving it (each bilingual and freshness-stamped), advises a **specific early-payment amount** (integer cents) that drops a card below the healthy utilization band before a statement cuts, runs a Canada-specific credit-builder playbook, and shows the **rewards-AND-score** impact of keep/downgrade/cancel/refinance decisions — always recommend-only, always grounded in the spine's real balances, limits, and canonical `CreditState` utilization. The module is a **consumer** of Module 0 spine contracts (`CreditState`, `AccountState`, `CashFlowForecast`, `GoalState`), Rewards `CardLineup`, and Cash Safety's `SafeToActSignal`, and a **provider** of `CreditFactors`, `CreditCoachingPlan`, `CreditBuilderPlaybook`, and `RefinanceSignals`. The spine remains the **single canonical provider** of `CreditState`; Credit feeds bureau-sourced score/factor enrichment into the spine pipeline rather than re-publishing a competing `CreditState` (spec Clarification C1). Technical approach: a recommend-only service layer with all monetary math in integer minor units / arbitrary-precision decimal (never float), freshness-gated reads that **withhold** on stale/missing money inputs (the v2.2.0 documented-default exception does **not** apply to coaching/refinance money figures — C4), a mandatory credit-bureau threat model, server-side cross-member authZ, and consumer+provider contract tests in CI.

## Technical Context

> **Platform-stack note**: FinOS's stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md). This plan **inherits** it verbatim — language, datastore, mobile framework, `@finos/money`/`@finos/format`, auth/MFA, secrets/KMS, audit store, residency, and CI gates are not re-litigated here. Only genuinely **module-specific** unknowns are flagged **NEEDS CLARIFICATION** and tracked as non-blocking `NR-CRD-*` in [research.md](./research.md).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10, Fastify adapter) backend + React Native (Expo) mobile — **inherited** (platform-decisions §2).

**Primary Dependencies**: `@finos/money` (`bigint` cents + `decimal.js` rates, single `roundHalfUpToCents`), `@finos/format` (en-CA/fr-CA `Intl`), JSON-Schema contract packages + generated types, Pact (consumer+provider contract tests), Prisma (Credit schema), BullMQ (bureau-feed ingestion worker) — **inherited**. Spine/Rewards access is **only** via Module 0/Module 1 contract clients, never direct DB reads (platform-decisions §3).

**Storage**: Credit-owned state in the `credit` PostgreSQL schema (PostgreSQL 16, AWS `ca-central-1`, `ca-west-1` DR) with a per-module DB role + **RLS** on every profile/household-scoped table — **inherited** (platform-decisions §2). Credit stores only score + normalized factors + plan/signal/audit records (data-minimization; never the raw bureau report verbatim — research §8). No private copy of balances/limits/utilization — those are read from spine contracts.

**Testing**: Unit (money fixtures, early-payment rounding incl. band-boundary round-up, withhold branches, locale formatting), **consumer + provider contract tests** per contract (Pact), integration per user story (Testcontainers Postgres), mobile (RN Testing Library: component + bilingual/locale + WCAG a11y), security (API-layer cross-member IDOR + audited denials) — all in CI. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app + NestJS backend API — **inherited**.

**Project Type**: Web/mobile — backend bounded-context module (`CreditModule`) + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped Credit Monitor read-model; coaching/refinance compute on cached spine reads within the same budget, or render a flagged/withheld state rather than blocking.

**Constraints**: Money is exact (integer minor units / arbitrary-precision decimal, never float — Principle IV); every external value carries a freshness stamp and **stale/missing money inputs withhold** (the documented-default exception does NOT apply to coaching/refinance — Principle VI/VIII, C4); recommend-only, no money movement (Principle IV / FR-X-003); soft-pull only, never a hard inquiry (C5); EN/FR + locale-correct formatting (Principle II); cross-member authZ enforced server-side on session identity, never a client-supplied `profile_id` (Principle V); a credit-bureau threat model is mandatory (Principle V / FR-X-010).

**Scale/Scope**: Per-user credit data (a handful of cards/bureau profile per user typical); **4 module-owned FRs (FR-CRD-001..004)** across **4 prioritized user stories** (US1/US2 = P1, US3/US4 = P2); 5 owned/provided entities (`CreditFactors`, `CreditCoachingPlan`, `CreditBuilderPlaybook`, `RefinanceSignals`, `AuditEvent`); provides 4 contracts; consumes 6 contracts (4 spine + Rewards `CardLineup` + Cash Safety `SafeToActSignal`).

**NEEDS CLARIFICATION** (→ [research.md](./research.md), all non-blocking `NR-CRD-*`): (1) Canadian credit-bureau vendor + residency posture (NR-CRD-1); (2) refinance APR / candidate-rate feed source (NR-CRD-2); (3) curated bilingual credit-builder knowledgebase dataset (NR-CRD-3); (4) exact bureau staleness window + dormant retention, confirmed in Module 0 PIA (NR-CRD-4); (5) goal-detection of "credit-boosting" from `GoalState` to switch the coaching target band (NR-CRD-5).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/credit/goals state? | **PASS** — coaching/refinance consume `CreditState` (utilization/bands), `AccountState` (balances/limits), `CashFlowForecast` (runway), `GoalState` (credit-boosting target), `CardLineup` (rewards value), `SafeToActSignal`; an early-payment amount that ignores real balances/limits/utilization is a defect (SC-C-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD with time-to-goal on credit-boosting plans (FR-X-004); EN/FR with no single-language leaks; fr-CA `1 234,56 $`, `12,3 %`, `28 juin 2026` via `@finos/format` (SC-C-007); Canada-specific bureau (300–900) + builder playbook. |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — money/rounding fixtures, band-boundary round-up, withhold branches, FX conversion, bilingual, consumer+provider contract tests, and API-layer IDOR tests authored first and must FAIL before implementation. |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — integer CAD cents for balances/limits/payments/fees/deltas + arbitrary-precision decimal for utilization/APR/FX, half-up at the cent once (with documented band-boundary round-up), four mandatory slippage fixtures, idempotent acknowledgement writes keyed on `source_event_id` (`UNIQUE`), recommend-only — Credit moves no money, never executes a payment/cancel/refinance (SC-C-003/SC-C-010). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — credit-bureau **threat model is present and mandatory** (module ingests bureau PII and exposes another member's credit data in Household views); cross-member authZ enforced server-side on session identity + `MemberScope`, never a client `profile_id`, with audited denials (SC-C-009); bureau tokens live in the KMS-backed secrets store behind the spine boundary, never a DB column or logs; soft-pull only (no hard inquiry, C5). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — every `CreditCoachingPlan`/`RefinanceSignal` carries `Reasoning {inputs, rationale_en, rationale_fr}` (SC-C-005); confirmed actions + recommendations-shown written to the append-only audit trail (FR-X-007); missing/stale **money** inputs **withhold** with a named reason. The v2.2.0 documented-default exception is **deliberately NOT used** — the early-payment amount and refinance deltas are money figures, and utilization is the subject being acted on (Clarification C4). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:credit/*/1.0.0`); the spine stays the single canonical `CreditState` provider (C1, no duplicate provider); consumer+provider Pact tests in CI (SC-C-008); semver with migration window; version skew disables the dependent signal rather than serving on a mismatched schema (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — score/factors (24 h window), balances/limits, and refinance rates carry `FreshnessStamp`; a stale **money** input withholds the coaching/refinance figure, a stale bureau **score** is flagged as last-known (SC-C-002/SC-C-006); bureau-feed ingestion worker has mandatory timeouts/retries/rate-limits (FR-X-012). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — a read/coach/optimize service over spine + Rewards contracts; no proprietary score model (display the bureau score only, C6); no new platform abstractions; P2 stories (playbook, refinance) follow the P1 monitor + coaching MVP. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — bureau PII + monetary values redacted in debug logs (audit kept separate, FR-X-014); bureau-derived data in the deletion/dormant cascade via crypto-shred (FR-X-013/019); Canadian-region residency, bureau subprocessor Canadian-region-or-disclosed and a go-live gate (FR-X-020); ≤ 300 ms; WCAG 2.1 AA bilingual SR labels; "not regulated advice / not credit-repair" framing surfaced (ux-foundations §8.5). |

**Threat model (Principle V)** — **REQUIRED** here because the module ingests credit-bureau data (highly sensitive PII) and exposes another person's credit data via Household visibility. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--this-module-ingests-credit-bureau-data-and-exposes-another-persons-credit-data-in-household-views). Aggregation/bureau-token lifecycle and the KMS secrets store are **owned by Module 0 / the platform** (platform-decisions §5); Credit reads spine contracts and consumes the bureau feed behind that boundary, never storing a raw token.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and the four provided contracts preserve money-exactness (integer cents + decimal-string rates), freshness-withhold semantics (no documented-default on money figures), server-side cross-member authZ with audited denials, and recommend-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/004-module-2-credit/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (decisions + NR-CRD-* open items)
├── data-model.md        # Phase 1 output (owned entities + state transitions)
├── quickstart.md        # Phase 1 output (validation-by-user-story)
├── contracts/           # Phase 1 output
│   ├── provided/        # CreditFactors, CreditCoachingPlan, CreditBuilderPlaybook, RefinanceSignals (.schema.json)
│   └── consumed/        # version-pin README for CreditState/AccountState/CashFlowForecast/GoalState/CardLineup/SafeToActSignal
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/credit/
    ├── domain/            # entities: CreditFactors, CreditFactor, CreditCoachingPlan, CoachingAction,
    │                      #           CreditBuilderPlaybook, PlaybookStep, RefinanceSignals, RefinanceSignal
    ├── money/             # early-payment math (min payment to cross band threshold), half-up + band-boundary
    │                      #           round-up, FX conversion of non-CAD balances — via @finos/money (no float)
    ├── services/          # credit-monitor, coaching (early-payment), credit-builder-playbook,
    │                      #           refinance-optimizer, bureau-provider (soft-pull), safe-to-act (feature-checked)
    ├── contracts/
    │   ├── consumed/      # typed clients: credit-state, account-state, cash-flow, goal-state, card-lineup, safe-to-act
    │   └── provided/      # credit-factors, credit-coaching-plan, credit-builder-playbook, refinance-signals
    └── api/               # recommend-only endpoints (no money-movement endpoints); cross-member authZ guard
backend/tests/
├── contract/             # consumer (6) + provider (4) contract tests
├── integration/          # per user story (US1..US4) + cross-member authZ (IDOR) + redaction/audit
└── unit/                 # money fixtures, early-payment rounding, withhold branches, bands, locale

mobile/
└── src/features/credit/
    ├── credit-monitor/    # US1 (score gauge + ranked factor list)
    ├── coaching/          # US2 (per-card early-payment cards + statement-date timeline)
    ├── builder-playbook/  # US3 (ordered step list)
    └── refinance/         # US4 (per-candidate keep/downgrade/cancel/refinance trade-off card)
mobile/tests/             # component + locale/bilingual + WCAG a11y tests
```

**Structure Decision**: Web/mobile split, **inheriting** the ratified modular-monolith layout (platform-decisions §3): Credit is exactly one NestJS bounded context (`CreditModule`) under `backend/src/modules/credit/` exposing recommend-only endpoints + the four provided contracts, plus a mobile feature module (`mobile/src/features/credit/`) organized by user story. The module reads spine/Rewards state **only** through the Module 0/Module 1 contract clients under `contracts/consumed/` (never cross-schema `SELECT`), preserving the canonical-spine and swappable-aggregation boundaries (Principle VII; platform-decisions §3). The repository root layout itself is ratified in the platform plan; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (Note: the deliberate **non-use** of the v2.2.0 documented-default exception for coaching/refinance is a constitutionally-required *restriction*, not a deviation — see Clarification C4.)

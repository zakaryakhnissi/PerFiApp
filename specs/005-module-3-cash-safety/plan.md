# Implementation Plan: Module 3 — Cash Safety & Autopilot

**Branch**: `005-module-3-cash-safety` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/005-module-3-cash-safety/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Cash Safety & Autopilot is the **safety floor under every other FinOS recommendation**: no module may advise a spend that risks an overdraft, and the runway is the shared input that makes that guarantee enforceable. The module **consumes** Module 0 spine contracts (`CashFlowForecast`, `AccountState`, `TransactionStream`, `BudgetState`, `GoalState`, `CreditState`) and Bills' `BillCalendar` (feature-gated), and **derives** — never re-aggregates or re-forecasts — three things on top of the canonical spine: (1) a user-facing **`RunwayForecast`** (safety buffer + lowest projected balance + flagged shortfall + ranked micro-actions), (2) the cross-module **`SafeToActSignal`** (`safe`/`caution`/`unsafe`/`withheld`, `precedence_rank = 1`) consumed by every spending module, and (3) a rules-based **`RoundupProposal`** engine (the only money-*write* path, integer-cents modular arithmetic, idempotent on `source_event_id`, audited on confirm). It **provides** `RunwayForecast`, `SafeToActSignal`, and `RoundupProposal` to downstream modules.

Cash Safety is purely advisory: it **never moves money** and it **never originates, brokers, or refers a cash advance or any credit product** — the `micro_actions.kind` enum is closed with no credit value by constitutional design (FR-CASH-002). Technical approach: a recommend-only service layer over spine contract clients, with all monetary math in integer minor units (CAD cents) / arbitrary-precision decimal FX, runway/signal **withheld** on any stale or missing money input, `CreditState` due-date risk treated as the lone secondary guardrail (documented-default on absence, flag on stale), server-side cross-profile authZ in a Household context, and consumer + provider contract tests in CI.

## Technical Context

> **Platform-stack note**: FinOS's platform stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (Constitution v2.2.0, umbrella spec). This plan **inherits** it and does not re-decide it. Items below carry **[PLATFORM]** where the value is inherited verbatim, and **[CASH-SAFETY]** where this plan owns the module-specific choice. Genuinely module-specific open items are marked **NEEDS CLARIFICATION** and resolved (non-blocking) in [research.md](./research.md).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10, Fastify adapter) backend + React Native (Expo) mobile **[PLATFORM]** (platform-decisions §2). Cash Safety is one NestJS bounded context (`CashSafetyModule`).

**Primary Dependencies**: `@finos/money` (integer `Cents = bigint` + `decimal.js` for FX, single `roundHalfUpToCents`), `@finos/format` (en-CA/fr-CA), `@finos/contract-*` packages (JSON-Schema → generated types), Pact (consumer + provider contract tests), Prisma (Cash-Safety-owned schema), BullMQ (roundup-trigger ingestion worker) **[PLATFORM]**. Spine access is via Module 0 contract clients only, never direct DB reads **[CASH-SAFETY]**.

**Storage**: Cash-Safety-owned state — `RoundupRule`, `RoundupProposal`, the cached `RunwayForecast` projection — in the `cashsafety` PostgreSQL schema (`ca-central-1`, per-schema role + RLS) **[PLATFORM]** (platform-decisions §2/§3). Confirmed actions written to the shared append-only `audit.event_log` **[PLATFORM]**. **No private copy of balances/forecast/budget/credit** — those are read from spine contracts (Integration-First; single canonical spine). Money columns are `BIGINT` (`*_cents`); no `float`/`double`/`real` anywhere **[PLATFORM]**.

**Testing**: Unit (roundup/FX money fixtures, runway/verdict band logic, withhold/documented-default branches, idempotency replays, locale formatting), **consumer + provider contract tests** per contract, integration (per user story, Testcontainers Postgres), mobile (component + bilingual/locale + WCAG a11y), security (API-layer IDOR/authZ) — all in CI **[PLATFORM]** (platform-decisions §6). Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API **[PLATFORM]**.

**Project Type**: Web/mobile — backend bounded-context module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch and `SafeToActSignal` read (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped `RunwayForecast`; a cache miss or stale-beyond-threshold value renders the Loading/Withheld state rather than blocking on a network fetch (research §10).

**Constraints**: Money is exact (integer minor units / arbitrary-precision FX, never float — Principle IV); the runway is a **money output** so a stale/missing balance or `CashFlowForecast` **withholds** it (Principle VIII) — no documented-default for the runway; recommend-only and **no credit origination** (Principle IV / FR-X-003 / FR-CASH-002); roundup writes idempotent on `source_event_id`; EN/FR + locale-correct formatting (Principle II); cross-profile authZ enforced server-side on session identity in Household contexts (Principle V).

**Scale/Scope**: Per-user safety data (one runway, a handful of roundup rules, ongoing proposals per user). **4 module-owned FRs (FR-CASH-001..004)** across **4 prioritized user stories** (US1 runway / US2 micro-actions / US4 `SafeToActSignal` are P1; US3 roundups is P2); 6 owned/provided entities; **provides 3** contracts (`RunwayForecast`, `SafeToActSignal`, `RoundupProposal`); **consumes 7** contracts (6 spine + `BillCalendar`, feature-gated).

**NEEDS CLARIFICATION** (→ research.md, all non-blocking — the spec fixes the *mechanism*, planning/ops tunes the *numbers*): (1) Canada-oriented **safety-buffer default** dollar floor (user-adjustable); (2) **balance-staleness window** (`staleness_threshold_seconds`) that gates runway withholding (platform-decisions NR-2); (3) roundup **destination-account mapping** UX at rule-creation time; (4) micro-action **ranking/tie-break weights** (tuned against SC-CASH-003); (5) the balance level that triggers a **Critical "overdraft today"** Inbox alert vs an Important digest item (tuned with Module 10).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/credit/goals state? | **PASS** — the runway is **derived from** the spine's `CashFlowForecast` and `AccountState`; micro-actions read `BudgetState`/`CreditState`/`BillCalendar`/`GoalState`; Cash Safety re-forecasts nothing it can read (Integration-First; SC-CASH-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD throughout with time-to-goal on goal-routed roundups (FR-X-004); EN/FR with no single-language leaks; fr-CA `1 234,56 $` / `-47,50 $` via `@finos/format` (SC-CASH-006). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — roundup/FX money fixtures, verdict/band logic, withhold + documented-default branches, idempotency replays, bilingual/locale, and consumer+provider contract tests authored first (mandatory; tasks.md). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — integer CAD cents everywhere; FX in arbitrary precision, half-up once before entering the projection; roundup is pure integer-cents modular arithmetic (fixture-guarded); writes idempotent on `source_event_id` (UNIQUE); recommend-only with **no credit origination** (FR-CASH-002). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a **mandatory threat model** (Cash Safety touches another member's financial data in Household contexts); cross-profile authZ enforced server-side on session identity + `MemberScope`, never a client `profile_id`; RLS defense-in-depth; **no token/credential handling** here (owned by Module 0). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — runway, every micro-action, `SafeToActSignal`, and `RoundupProposal` carry bilingual `Reasoning`; confirmed roundups/micro-actions append to the immutable `audit.event_log`; **stale/missing money inputs withhold** the runway/signal (no default), and only absent `CreditState` due-date context uses the v2.2.0 documented-default (proceed without the urgency boost). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes 7 / provides 3 via versioned JSON-Schema contracts (`finos:cashsafety/*`); consumer+provider tests in CI (SC-CASH-008); semver with migration window; version skew **disables** the dependent runway/signal (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — runway/signal/proposal carry a `FreshnessStamp`; a stale **money** input withholds the runway and forces `verdict = withheld` (SC-CASH-005); the roundup-trigger ingestion worker has mandatory timeouts/retries; `move_bill_date` degrades gracefully when Bills is absent. |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — a derive/propose service over spine contracts; `RoundupRule` stays module-internal (no cross-module consumer); no re-forecasting; P2 roundups sequenced after the P1 safety floor; no premature abstraction. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in debug logs (audit trail separate, FR-X-014); Canadian-region residency, **no new subprocessor**; 7-day deletion / dormant retention via platform crypto-shred; ≤ 300 ms; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing surfaced (Confirm-Action sheet). |

**Threat model (Principle V)** — **REQUIRED** here because in a Household context a member's runway, `SafeToActSignal`, and roundups are another person's financial data (Constitution V; FR-HH-001). Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model--mandatory--touches-another-persons-financial-data-in-household-contexts). Aggregation-token lifecycle and money movement are **out of scope** for Cash Safety (tokens owned by Module 0 / FR-CORE-007; Cash Safety moves no money and originates no credit).

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and contracts preserve money-exactness (integer cents + once-only half-up FX), the runway-is-a-money-output withhold rule, the closed no-credit micro-action enum, idempotent roundup writes, server-side cross-profile authZ, and recommend-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/005-module-3-cash-safety/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── provided/        # RunwayForecast, SafeToActSignal, RoundupProposal (.schema.json)
│   └── consumed/        # version-pinning notes for the 6 spine + BillCalendar contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/cash-safety/
    ├── domain/            # entities: RunwayForecast, MicroAction, SafeToActSignal,
    │                      #           RoundupRule, RoundupProposal, AuditEvent (value objects)
    ├── money/             # integer-cents helpers, roundup modular arithmetic, FX half-up,
    │                      #           gap-closed subtraction (no float) — thin over @finos/money
    ├── services/          # runway-derivation, micro-action-planner, safe-to-act,
    │                      #           roundup-engine, audit, logging (redaction)
    ├── contracts/
    │   ├── consumed/      # typed clients for CashFlowForecast, AccountState, TransactionStream,
    │   │                  #           BudgetState, GoalState, CreditState, BillCalendar (feature-gated)
    │   └── provided/      # RunwayForecast, SafeToActSignal, RoundupProposal providers
    ├── ingestion/         # BullMQ roundup-trigger worker (timeouts/retries/rate-limit)
    └── api/               # recommend-only endpoints (no money-movement, no credit endpoints)
backend/tests/
├── contract/             # consumer (7) + provider (3) contract tests
├── integration/          # per user story (US1, US2, US4, US3) + cross-profile authZ
└── unit/                 # roundup/FX money fixtures, verdict/band logic, idempotency, withhold

mobile/
└── src/features/cash-safety/
    ├── runway/           # US1 (runway chart, six states, freshness)
    ├── micro-actions/    # US2 (ranked micro-action cards, Confirm-Action sheet)
    ├── safe-to-act/      # US4 (Conflict Banner surface, consumed by other tabs)
    └── roundups/         # US3 (rule setup, proposal review, Confirm-Action sheet)
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split, mirroring the Module 1 exemplar and the ratified modular-monolith layout (platform-decisions §3). Cash Safety is one self-contained NestJS bounded context (`backend/src/modules/cash-safety/`) exposing recommend-only endpoints and the three provided contracts, plus a mobile feature module (`mobile/src/features/cash-safety/`) organized by user story. The module **never reads spine storage directly** — only the Module 0 contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII; enforced by the lint-banned cross-module-import and per-schema-role gates, platform-decisions §3). The concrete repository-root layout is ratified in the Module 0 platform plan; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. Cash Safety introduces no new external vendor, no new shared abstraction, and no money-movement or credit surface; there are no complexity deviations to justify.

# Implementation Plan: Module 4 — Bills & Subscriptions

**Branch**: `006-module-4-bills` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/006-module-4-bills/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Bills & Subscriptions is the P2 tab that turns the spine's raw transaction stream into a calm, actionable picture of recurring money: every recurring charge detected and categorized **essential / negotiable / nice-to-have** with monthly + annualized CAD impact (Subscription Radar, US1); every upcoming bill on a calendar annotated with a **runway-aware safe-to-pay date** derived from the spine's `CashFlowForecast` (Bill Calendar, US2); every free trial guarded with a keep/cancel prompt **before** it converts (Free-Trial Guard, US3); and cancellation/negotiation surfaced with projected savings in CAD **and** time-to-goal impact before the user confirms (US4). The module is a **consumer** of Module 0 spine contracts (`TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `GoalState`) plus Cash Safety's `SafeToActSignal` (behind a feature check until Module 3 ships, spec C-1), and a **provider** of `SubscriptionInventory`, `BillCalendar`, `RecurringObligations`, and `FreeTrialExpiry` to downstream modules (Pay, Cash Safety, Tasks, Shopping, Inbox, Habits). Technical approach: a recommend-only NestJS bounded context (`BillsModule`) on the ratified platform stack — all monetary math in integer minor units / arbitrary-precision decimal (no float), the safe-to-pay date **withheld** when its runway money-input is stale/missing, server-side profile-scoped authZ, idempotent decision/audit writes, and consumer+provider contract tests in CI.

## Technical Context

> **Platform-stack note**: The platform stack is **ratified** in [`specs/_platform/platform-decisions.md`](../_platform/platform-decisions.md) (v1.0.0) and is **inherited, not re-decided** here. Items below marked **[INHERITED]** come from that document. Items marked **[BILLS]** are decisions this module owns. Genuinely module-specific open inputs are marked **OPEN (non-blocking)** and resolved in [research.md](./research.md) / handed to planning/ops.

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS backend) + React Native via Expo (mobile) **[INHERITED]**. One language → bit-identical money/locale math on client and server.

**Primary Dependencies**: `@finos/money` (integer cents + `decimal.js` rates), `@finos/format` (en-CA/fr-CA `Intl`), `@finos/contract-*` packages (JSON-Schema + generated types), Pact (consumer+provider contract tests), Prisma (Bills schema), BullMQ (detection/projection workers), i18next/react-i18next (mobile) **[INHERITED]**. Spine + Cash Safety access is via versioned contract clients under `contracts/consumed/`, never direct DB/storage reads **[BILLS]**.

**Storage**: Bills-owned `bills` PostgreSQL schema (`ca-central-1`, per-schema role + RLS) holding the derived recurring-charge model, free-trial records, cancellation/negotiation actions, and the Bills audit projection **[INHERITED]**. No private copy of raw transactions/balances/budget/runway/goals — those are read from spine contracts (single-canonical-spine assumption). Append-only `audit.event_log` is the immutable source of truth; Bills read-models are rebuildable projections **[INHERITED]**.

**Testing**: Unit (money fixtures, cadence/classification logic, withhold/stale branches, idempotency, locale), **consumer + provider contract tests** per contract (Pact), integration per user story (Testcontainers Postgres), mobile component + bilingual/locale + WCAG a11y — all in CI **[INHERITED]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API **[INHERITED]**.

**Project Type**: Web/mobile — backend bounded-context module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (SC-010 / FR-X-015) — met via a locally cached, freshness-stamped inventory + calendar; detection/projection run in BullMQ workers off the hot path; a cache miss / stale-beyond-threshold value renders a flagged/withheld state rather than blocking (research §10) **[BILLS within INHERITED budget]**.

**Constraints**: Money is exact (integer minor units / arbitrary-precision decimal, never float — Principle IV); the safe-to-pay date is a money-grounded annotation and is **withheld** when `CashFlowForecast` is stale/missing (Principle VIII / VI); recommend-only — no cancellation, no merchant contact, no money movement, every consequential action via a Confirm-Action sheet (Principle IV / FR-X-003); EN/FR + locale-correct formatting incl. negotiation scripts (Principle II); profile-scoped authZ enforced server-side on session identity (Principle V).

**Scale/Scope**: Per-profile recurring-charge data (tens of series/bills per profile typical); **4 module-owned FRs (FR-BILL-001..004)** across **4 prioritized user stories** (US1/US2 P1, US3/US4 P2); 6 owned entities; **provides 4** contracts (`SubscriptionInventory`, `BillCalendar`, `RecurringObligations`, `FreeTrialExpiry`); **consumes 6** contracts (5 spine + `SafeToActSignal` pending).

**OPEN (non-blocking)** (→ research.md, handed to planning/ops): (1) concrete Canadian category→necessity mapping + update cadence (§4); (2) cancellation-deep-link / negotiation-script dataset coverage (§6); (3) free-trial detection signal mix + email-signal subprocessor residency (§5, platform NR-6); (4) final staleness windows + dormant retention (§8, Module 0 PIA / NR-2 / FR-X-019); (5) `SafeToActSignal` `$id`/version once Module 3 publishes it (§3).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/credit/goals state? | **PASS** — budget impact reads `BudgetState`; safe-to-pay reads `CashFlowForecast`; time-to-goal reads `GoalState`; necessity ties to budget categories; ignoring an available input is a defect (SC-B-002). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD + time-to-goal on every savings figure; EN/FR everywhere incl. negotiation scripts; fr-CA `12,99 $` / `155,88 $` via `@finos/format` (SC-B-006). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — money fixtures, cadence/classification, withhold-on-stale-runway, idempotency, bilingual, and consumer+provider contract tests authored first (mandatory; tasks.md Phase order). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — integer CAD cents for amounts/impacts/savings; `annualized = monthly × 12` exact; negotiation `reduction_rate` arbitrary-precision, half-up once; spine `cad_amount` reused (no re-FX); decision/audit writes idempotent on `source_event_id`; recommend-only — no cancellation/contact/money-movement endpoint (SC-B-004/009). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a **MANDATORY threat model** (Bills owns a person's subscription/spend profile reachable via Household `MemberScope`); profile-scoped authZ server-side on session identity + RLS, never a client-supplied `profile_id`; denied access audited (SC-B-011). No tokens/secrets here (owned by Module 0). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — every keep/cancel/negotiate/pay-timing recommendation carries `Reasoning` (inputs + rationale_en/fr); confirmed actions + classification overrides written to append-only audit (SC-B-003). Missing/stale **money** input (runway) **withholds** the safe-to-pay date — no documented-default money substitution (none applies; the only inferred default is the non-money necessity classification, which is user-overridable, not a withhold case). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:bills/*`, `finos:spine/*`); consumer+provider Pact tests in CI; semver in `$id`; version skew disables dependent behavior (SC-B-010 / SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every series/calendar/trial figure carries a `FreshnessStamp`; stale `TransactionStream`/`BudgetState`/`GoalState` **flag**; stale/missing `CashFlowForecast` (money input) **withholds** the safe-to-pay date (SC-B-005); detection/projection workers have mandatory timeouts/retries/rate-limits. |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — P2 module at MVP scope: consumes the spine, owns only the recurring-charge model nobody else owns; `CancellationAction`/`BillsAuditEvent` kept **module-internal** (not published) since no module consumes them; ML classification deferred behind a curated-dataset interface. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money/merchant descriptors redacted in logs (audit separate, FR-X-014); email-sourced enrichment inherits the 7-day FR-X-013 purge cascade; dormant bound FR-X-019; Canadian-region residency (FR-X-020); ≤300 ms; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing on Confirm-Action sheets + first card. |

**Threat model (Principle V)** — REQUIRED here because Bills owns a derived inventory of a person's subscriptions/bills (a sensitive spend profile) reachable across users via Household `MemberScope`. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-included--profile-scoped-financial-data-cross-user-via-household-memberscope). Aggregation-token lifecycle is **out of scope** for Bills (owned by Module 0 / FR-CORE-007); Bills reads spine contracts only and holds no token/secret.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — data model ([data-model.md](./data-model.md)) and contracts ([contracts/](./contracts/)) preserve money-exactness (integer cents, half-up once), freshness/withhold (safe-to-pay), server-side profile-scoped authZ, recommend-only, and consumer+provider contract coverage; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/006-module-4-bills/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output — provided/ + consumed/ + README
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/bills/
    ├── domain/            # entities: RecurringSeries, BillCalendarEntry, RecurringObligation,
    │                      #           FreeTrial, CancellationAction/NegotiationAction, BillsAuditEvent
    ├── money/             # cents/impact/savings helpers via @finos/money (half-up once, no float, ×12 annualize)
    ├── services/          # recurrence-detector, necessity-classifier, calendar/safe-to-pay,
    │                      #           free-trial-guard, cancellation-negotiation, savings/goal-impact
    ├── workers/           # BullMQ detection + obligation-projection jobs (timeouts/retries/rate-limits)
    ├── contracts/
    │   ├── consumed/      # typed clients + version pins: TransactionStream, MerchantGraph, BudgetState,
    │   │                  #           CashFlowForecast, GoalState, SafeToActSignal (feature-checked)
    │   └── provided/      # SubscriptionInventory, BillCalendar, RecurringObligations, FreeTrialExpiry
    └── api/               # recommend-only endpoints (no money-movement / no cancellation-execution endpoint)
backend/tests/
├── contract/             # consumer + provider contract tests (Pact)
├── integration/          # per user story (US1..US4) + cross-profile authZ + redaction/audit
└── unit/                 # money fixtures, cadence/classification, withhold/stale, idempotency

mobile/
└── src/features/bills/
    ├── subscription-radar/   # US1
    ├── bill-calendar/        # US2
    ├── free-trial-guard/     # US3
    └── cancellation/         # US4 (cancellation/negotiation + Confirm-Action sheet)
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Bills is a self-contained NestJS bounded context (`backend/src/modules/bills/`) exposing recommend-only endpoints and the four provided contracts, plus a mobile feature module (`mobile/src/features/bills/`) organized by user story. The module never reads spine storage directly — only the Module 0 / Module 3 contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII); cross-module import bans, per-schema Postgres roles + RLS, and contract semver are enforced platform-wide (platform-decisions.md §3). The repository-root layout and shared `@finos/*` packages are ratified in platform-decisions.md; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (Note: `CancellationAction`/`NegotiationAction` and `BillsAuditEvent` are deliberately kept **module-internal** rather than published as cross-module contracts because no other module consumes them — a Simplicity/YAGNI choice (IX), not a deviation.)

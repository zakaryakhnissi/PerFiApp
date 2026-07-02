# Implementation Plan: Module 11 — Travel & Trips

**Branch**: `013-module-11-travel` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/013-module-11-travel/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Travel & Trips is a **P3 Life-OS expansion** tab. It turns a forwarded booking confirmation into a CAD-costed, budget-linked, FX-aware itinerary, flags any travel-insurance coverage gap against the user's cards, and surfaces lifetime travel-spend stats (cost-per-trip / cost-per-day, optional non-money carbon estimate) — and it **books, pays, and moves nothing** (recommend-only, FR-X-003). The module is a **consumer** of Module 0 spine contracts (`BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream`) and Module 1 Rewards contracts (`CardLineup`, `StatusState`), plus a feature-checked `SafeToActSignal` (Module 3 Cash Safety); and a **provider** of `TripBudget` (`finos:travel/TripBudget/1.0.0`) and `TravelSpend` (`finos:travel/TravelSpend/1.0.0`) to Rewards (status), Bills, and Workspace. FX is consumed as a freshness-stamped **external feed** behind a shared `FxProvider` (the spine publishes no FX contract — research §1). Technical approach: a build-and-read service layer with all foreign→CAD conversion in arbitrary-precision decimal rounded half-up to integer cents exactly once, freshness-gated FX/budget reads (stale money inputs flag/withhold), idempotent itinerary ingestion keyed on a stable booking identity, a no-raw-email-body parsing boundary, server-side cross-profile authZ, and consumer+provider contract tests in CI. Scope is kept deliberately lean for P3 (Principle IX): the only money-adjacent advice is *informational* (over-budget warning, insurance gap) — no money action, hence no Confirm-Action sheet.

## Technical Context

> **Platform-stack note**: FinOS's platform stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (Constitution v2.2.0). This plan **inherits** it and does not re-decide language, storage, mobile framework, money/format packages, auth, residency, or CI gates. Items marked **[INHERITED]** come from that document. Items marked **[TRAVEL]** are decisions this module owns. Genuinely module-specific open items are marked **OI-#** and resolved (or handed to planning/ops) in [research.md](./research.md); none blocks this plan (P3 / Principle IX).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS backend) + React Native via Expo (mobile) **[INHERITED — platform-decisions §2]**.

**Primary Dependencies**: `@finos/money` (integer CAD cents + `decimal.js` string-on-wire rates, single `roundHalfUpToCents`) and `@finos/format` (en-CA/fr-CA) **[INHERITED]**; a shared `FxProvider` (foreign→CAD, freshness-stamped — reused with Rewards, research §1) and a `ConfirmationParser` interface (untrusted-input boundary, no-raw-body retention, research §2) **[TRAVEL]**; Pact for consumer+provider contract tests; Prisma for the Travel schema; BullMQ workers (timeouts/retries/rate-limits) for confirmation parsing + transaction-matching ingestion **[INHERITED]**. Spine/Rewards access is via Module 0/1 contract clients, never direct DB reads **[TRAVEL]**.

**Storage**: Travel-owned state (`Trip`, `ItineraryItem`, `TripBudget`, `TravelSpend`, `InsuranceCoverage`, `CarbonEstimate` projections) in the `travel` PostgreSQL schema, `ca-central-1`, with per-schema role + RLS on every `profile_id`-scoped table **[INHERITED — platform-decisions §3/§5]**. No private copy of balances/budget/credit/transactions/card-perks — those are read from spine/Rewards contracts (single-canonical-spine assumption). **No raw email bodies persisted after parsing** (FR-X-013) **[TRAVEL]**.

**Testing**: Unit (per-conversion-path FX rounding fixtures, lifetime-aggregation, cost-per-day-omitted, idempotency replays, insurance covered/gap/unknown, locale), **consumer + provider contract tests** per contract, integration (per user story), mobile component + locale/bilingual + a11y, and API-layer cross-profile authZ/IDOR tests — all in CI **[INHERITED — platform-decisions §6]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API **[INHERITED]**.

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015 / SC-T-012) — met via a locally cached, freshness-stamped trip list + stats (TanStack Query surfacing `is_stale`); a cache miss / stale money value renders a flagged/withheld state rather than blocking on a network fetch (research §9).

**Constraints**: Money is exact (integer cents + arbitrary-precision decimal FX, half-up once, never float — Principle IV); every FX/budget value carries a freshness stamp and stale **money** inputs flag/withhold (Principle VIII); recommend-only — no booking/payment/money movement (Principle IV / FR-X-003); EN/FR + locale-correct formatting, with trip/destination names displayed verbatim (Principle II); cross-profile authZ enforced server-side on session identity (Principle V); no raw email bodies retained, email-revocation cascade within 7 days (FR-X-013); parsing subprocessor Canadian-region or disclosed+agreement-backed (FR-X-020 / NR-6).

**Scale/Scope**: Per-user trip data (tens of trips/itineraries per user typical); **2 module-owned FRs (FR-TRV-001..002)** across **3 prioritized user stories (all P3)**; ~7 owned/provided entities; **provides 2 contracts** (`TripBudget`, `TravelSpend`); **consumes 7 contracts** (`BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream`, `CardLineup`, `StatusState`, `SafeToActSignal` feature-checked) + 1 external FX feed + 1 confirmation-parsing source + 1 carbon factor table.

**Open items** (→ research.md, non-blocking — P3 / Principle IX): **OI-1** (whether FX is promoted to a shared spine-level contract); **OI-2/NR-6** (concrete confirmation-parsing subprocessor + residency); **OI-3/NR-2** (FX + manual-entry staleness windows); **OI-4/NR-4** (concrete FX vendor + residency); **OI-5** (carbon-factor dataset source/cadence); **OI-6** (`SafeToActSignal` `$id`/version confirmation once Cash Safety ships).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Flags/figures read real budget/cash-flow/credit/goals state? | **PASS** — trip costs link to `BudgetState` (headroom, over-budget flag), stats match `TransactionStream` via `MerchantGraph`, insurance reads Rewards `CardLineup`, time-to-goal from `GoalState`; ignoring an available input is a defect (SC-T-004). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — all costs CAD with time-to-goal where a goal applies; EN/FR with no single-language leaks; fr-CA `1 234,56 $` via `@finos/format`; trip/destination names displayed verbatim, surrounding labels bilingual (SC-T-007). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — per-conversion-path FX fixtures, lifetime aggregation, cost-per-day-omitted, idempotency replays, insurance unknown-default, stale/withhold, bilingual, and consumer+provider contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — FX as arbitrary-precision decimal + integer CAD cents, half-up at the final cent exactly once (per-path drift fixtures), pure/deterministic conversion + aggregation, idempotent itinerary writes keyed on `source_event_id`, and recommend-only — Travel books/pays/moves nothing (SC-T-002/006/011). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a **mandatory threat model** (touches another person's data in Household **and** an email source); cross-profile authZ enforced server-side on session identity + RLS; Travel holds no aggregation/email tokens (owned by Module 0 / secrets store); no raw email bodies retained (SC-T-009/010). |
| VI | Explainable & Auditable | Inputs + reasoning on flags; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — over-budget and insurance flags carry inputs + bilingual `Reasoning` (SC-T-004); trip create/amend/manual-entry written to the append-only audit trail; stale/missing **money** inputs (FX, `BudgetState`) **withhold**; indeterminate insurance ⇒ `unknown`, never assumed covered (no documented-default money substitution is used — see note). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via semver'd JSON-Schema contracts (`finos:travel/TripBudget/1.0.0`, `…/TravelSpend/1.0.0`); consumer+provider tests in CI (SC-T-008); version skew disables the dependent feature, not served on a mismatched schema. |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every FX-converted CAD cost + budget-headroom figure carries a `FreshnessStamp`; stale FX/`BudgetState` (money inputs) flag/withhold (SC-T-003); confirmation-parse + transaction-match ingestion has timeouts/retries/rate-limits (FR-X-012). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — P3, MVP-scoped: build/read/flag only, no money action and no Confirm-Action sheet; carbon behind a toggle; cash-vs-points comparison explicitly **out of scope** (deferred to Rewards/Pay); no premature abstraction. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in logs (audit separate); email-sourced data minimized + 7-day revocation cascade + dormant-retention bound; Canadian-region residency incl. the parsing subprocessor (NR-6); ≤300 ms; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing on the insurance-gap flag. |

**Threat model (Principle V)** — REQUIRED here because Travel touches **another person's financial data** (Household trips/itineraries) **and an email source** (booking confirmations carry PII). Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--touches-another-persons-data-in-household-and-an-email-source). Aggregation/email-OAuth **token lifecycle is out of scope** for Travel (owned by Module 0 / FR-CORE-007 / a dedicated secrets store); Travel consumes parsed outputs + spine/Rewards contracts only.

**Documented-default note (Principle VI v2.2.0)**: Travel deliberately does **not** invoke the documented-default exception. Its missing-input cases are either **money inputs** (FX, `BudgetState`) which **withhold**, or the **insurance guardrail** which resolves to an explicit `unknown` state surfaced to the user (withhold-and-ask) rather than a silent assumed-covered default. This is stricter than the exception permits and is intentional for a safety-relevant flag.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and the `TripBudget`/`TravelSpend` contracts preserve money-exactness (integer cents + decimal-string FX, half-up once), freshness (per-figure `FreshnessStamp`, money-input withhold), idempotency (`source_event_id`), insurance `unknown`-default, no-raw-body retention, server-side authZ, and recommend-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/013-module-11-travel/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── provided/        # trip-budget.schema.json, travel-spend.schema.json
│   └── consumed/        # pinned versions of consumed spine/Rewards contracts
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/travel/
    ├── domain/            # entities: Trip, ItineraryItem, TripBudget, TravelSpend,
    │                      #           InsuranceCoverage, CarbonEstimate; FreshnessStamp/Reasoning re-exports
    ├── money/             # foreign→CAD conversion (arbitrary-precision decimal × integer cents,
    │                      #           half-up once), lifetime-aggregation, cost-per-trip/day helpers
    ├── ingest/            # ConfirmationParser interface + curated/regex parser (untrusted-input
    │                      #           boundary, no-raw-body retention), idempotent itinerary writer
    ├── services/          # itinerary-builder, trip-budget (headroom/over-budget), insurance-gap,
    │                      #           travel-spend (transaction matching), carbon-estimate, manual-entry
    ├── contracts/
    │   ├── consumed/      # typed clients + pinned schemas: budget-state, goal-state, merchant-graph,
    │   │                  #           transaction-stream, card-lineup, status-state, safe-to-act (feature-checked)
    │   └── provided/      # TripBudget, TravelSpend (+ schema registry / semver loader)
    └── api/               # build/read endpoints only (NO money-movement / booking / payment endpoints)
backend/tests/
├── contract/             # consumer + provider contract tests (every consumed + provided contract)
├── integration/          # per user story (US1..US3) + cross-profile authZ/IDOR + redaction/audit + revocation
└── unit/                 # FX fixtures (per path), aggregation, cost-per-day-omitted, idempotency, insurance, locale

mobile/
└── src/features/travel/
    ├── trip-list/         # US1 (trip cards: CAD cost + freshness chip)
    ├── itinerary-detail/  # US1 + US2 (segments, per-item CAD + FX freshness, insurance-status banner)
    ├── travel-stats/      # US3 (lifetime spend, cost-per-trip/day, optional carbon)
    └── add-connect/       # email opt-in explainer + manual trip entry (six states)
mobile/tests/             # component + locale/bilingual + a11y tests (all six states per view)
```

**Structure Decision**: Web/mobile split. Travel is a self-contained backend service module (`backend/src/modules/travel/`) exposing **build/read-only** endpoints and the two provided contracts, plus a mobile feature module (`mobile/src/features/travel/`) organized by user story. The module never reads spine/Rewards storage directly — only the Module 0/1 contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII). The `ingest/` boundary enforces the no-raw-email-body rule (FR-X-013). The concrete repository root layout is ratified in the platform plan ([platform-decisions §2/§3](../_platform/platform-decisions.md)); this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (P3 scope is intentionally lean per Principle IX: no money action, no Confirm-Action sheet, carbon optional, cash-vs-points deferred to Rewards/Pay.)

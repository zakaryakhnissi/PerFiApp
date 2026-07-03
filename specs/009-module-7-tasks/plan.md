# Implementation Plan: Module 7 — Tasks & To-Dos

**Branch**: `009-module-7-tasks` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/009-module-7-tasks/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Tasks & To-Dos is a **P3 connective convenience layer** (Constitution IX): a money-aware to-do list whose differentiator is the **live link** — a task is never a dead string of text but is bound to a real spine/module entity (bill, merchant, budget, goal, payment, or module action), shows that entity's **current** contract value with its `FreshnessStamp`, and on completion propagates an **idempotent, audited status update** back to the entity's owning module. The module owns **no money source**: it reads and displays money values from consumed contracts and **never originates, computes, rounds, or moves** a money figure. It is a **consumer** of Module 0 spine contracts (`GoalState`, `MerchantGraph`, `CashFlowForecast`) and — behind a feature check, forward-declared — of `BillCalendar` (Bills), `PaymentSchedule` (Pay), and `SafeToActSignal` (Cash Safety); it is a **provider** of `TaskState` and `TaskCompletionEvent` to Habits, Inbox, Workspace, and the originating modules. Technical approach: a recommend/record-only service layer; completion + status write-back + schedule writes are idempotent (keyed on `source_event_id`, `UNIQUE`); scheduling withholds payday-aware placement when `CashFlowForecast` is stale/absent (no documented-default money path, because Tasks originates no money figure); cross-profile reads/completions are authorized server-side against the session identity + Household `MemberScope`; consumer + provider contract tests run in CI.

## Technical Context

> **Platform-stack note**: The ratified stack, conventions, and CI gates are defined in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (v1.0.0, ratified against Constitution v2.2.0) and are **INHERITED** here — never re-decided. Items marked **[TASKS]** are decisions this plan owns. Genuinely module-specific unknowns are marked **NEEDS CLARIFICATION** and resolved in [research.md](./research.md); none block design.

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10 backend, Fastify adapter) + React Native via Expo (mobile) — **inherited** (platform-decisions §2). Tasks is the `TasksModule` bounded context (one NestJS module).

**Primary Dependencies** **[TASKS]**: Prisma (Tasks schema), `@finos/money` + `@finos/format` (display pass-through only — **no** arithmetic), `@finos/contract-*` generated clients for consumed/provided schemas, Pact (consumer + provider contract tests), Jest, React Native Testing Library, BullMQ (status-write-back retry/backoff worker). Spine/other-module access is **only** via Module 0/other-module contract clients, never direct DB reads (three-layer boundary, platform-decisions §3).

**Storage**: Tasks-owned state (`Task`, `TaskLink`, `TaskSchedule`, append-only `TaskCompletionEvent`) in the `tasks` PostgreSQL 16 schema, `ca-central-1` (Montréal) primary / `ca-west-1` DR, per-schema role + RLS keyed on `auth.uid()` + Household membership — **inherited** (platform-decisions §2/§5). Tasks stores **no** copy of a linked money figure and **no** balances/tokens — only the link reference (`entity_type` + `entity_id` + `source_contract`).

**Testing**: Unit (money pass-through fixtures, deterministic scheduling, withhold-on-stale, idempotency replay, locale formatting), **consumer + provider contract tests** per contract, integration (per user story against Testcontainers Postgres), mobile (component + bilingual/locale + WCAG a11y), security (API-layer IDOR/authZ) — all in CI. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API — **inherited** (platform-decisions §2).

**Project Type**: Web/mobile — backend service module (`TasksModule`) + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (SC-010 / FR-X-015) — met by rendering from a locally cached, freshness-stamped `TaskState` projection; linked values come from cached contract reads refreshed in the background; a cache miss / stale-beyond-threshold money value renders a flagged/withheld state rather than blocking on a network fetch (research §8).

**Constraints**: Recommend/record-only — Tasks moves **no** money (Principle IV / FR-X-003); every state write (completion, status write-back, schedule) is idempotent and safe to retry (Principle IV, keyed on `source_event_id`); linked money values are read live and never copied, with the source `FreshnessStamp` — stale money flagged/withheld (Principle VIII); EN/FR + locale-correct formatting for **system** strings (user titles verbatim — Principle II / Clarifications); cross-profile authZ enforced server-side (Principle V); no `float`/`double`/`real` in any task field or display path (platform-decisions §4).

**Scale/Scope**: Per-user task data (tens–low-hundreds of tasks per profile typical); **3 module-owned FRs (FR-TASK-001..003)** across **3 prioritized user stories** (US1 live links P1, US2 idempotent audited completion P1, US3 smart scheduling P2); ~5 owned entities; provides 2 contracts (`TaskState`, `TaskCompletionEvent`); consumes 3 ratified spine contracts + 3 forward-declared (behind feature check). Deliberately lean per Constitution IX.

**NEEDS CLARIFICATION** (→ [research.md](./research.md), all non-blocking, owned by other plans/ops): (1) final $ids/versions of forward-declared `BillCalendar`/`PaymentSchedule`/`SafeToActSignal` (set when those modules are authored); (2) the exact contract operation each owning module exposes to accept an idempotent status write-back (until exposed, completion records locally + `pending_sync`); (3) per-class staleness windows (inherited from source `FreshnessStamp`, Module 0 NR-2); (4) dormant-retention / email-revocation purge windows (Module 0 PIA, NR-3/NR-6); (5) real-device ≤300 ms perf budget (Module 0 NR-7).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Behaviors read real budget/cash-flow/credit/goals state? | **PASS** — tasks link to real spine/module entities (`GoalState`, `MerchantGraph`, `BillCalendar`); scheduling consumes `CashFlowForecast` (paydays/runway); a stored private money copy instead of a live read is a defect (SC-T-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD + time-to-goal on goal-linked values (FR-X-004); all **system** strings EN/FR (user titles verbatim per Clarifications); fr-CA `1 234,56 $` / `28 juin 2026` via `@finos/format` (SC-T-007). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — money pass-through, deterministic-scheduling, withhold-on-stale, idempotency-replay, bilingual/locale, and consumer+provider contract tests authored first (mandatory; tasks.md). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — Tasks owns **no** money math (reads integer cents / decimal-string rates, never floats, never sums/re-rounds); scheduling is pure/deterministic; completion + status write-back + schedule writes are idempotent keyed on `source_event_id` (`UNIQUE`); record-only, **no money movement** (`moved_money` const false). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a **mandatory** threat model (Household multi-profile lets a task reference another person's financial data); cross-profile reads/completions + status write-backs authorized server-side on session identity + `MemberScope` (never client `profileId`), denied access audited; Tasks holds **no** credentials/tokens (Module 0 owns those). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold on missing inputs? | **PASS** — scheduling placements + suggestions carry `Reasoning` (which payday / which due date / linked freshness, SC-T-008); completions written to the append-only audit trail (FR-X-007); stale/absent `CashFlowForecast` (a **money** input) **withholds** payday-aware placement — there is **no** documented-default money path here because Tasks originates no money figure. |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:tasks/TaskState/1.0.0`, `finos:tasks/TaskCompletionEvent/1.0.0`); consumer+provider tests in CI (SC-T-010); status write-back via the owning module's contract, never a cross-schema write; version skew disables the dependent link/scheduling behavior. |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every linked external value carries its source `FreshnessStamp`; a stale **money** value is flagged/withheld (SC-T-006); stale `CashFlowForecast` withholds payday-aware placement (SC-T-005); status write-back has timeouts/retries/backoff → `pending_sync` (FR-X-012). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — thorough analysis, lean P3 surface: a money-aware to-do list over existing contracts; no new money source, no valuation/FX, no recommendation engine, no money movement; 3 FRs, 3 stories, 2 provided contracts. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — task titles/notes + linked amounts redacted in debug logs, audit trail separate (FR-X-014); Canadian-region residency (FR-X-020); email-sourced link enrichment obeys 7-day purge + dormant retention (FR-X-013/019); ≤300 ms tab-switch; WCAG 2.1 AA bilingual SR labels; money actions framed/disclaimed via the owning module's Confirm-Action sheet (not regulated advice). |

**Threat model (Principle V)** — **REQUIRED** here because Household multi-profile lets a member's task reference another person's financial data and completion writes status across a module boundary. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--household-multi-profile-lets-a-members-tasks-reference-another-persons-financial-data). Aggregation-token lifecycle is **out of scope** for Tasks (owned by Module 0 / FR-CORE-007); Tasks reads contracts only and holds no credentials.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model (no money-amount field; reference-only `TaskLink`; `moved_money` const false; `source_event_id` `UNIQUE`) and contracts (`TaskState`, `TaskCompletionEvent`) preserve money-exactness/pass-through, idempotency, freshness, server-side authZ, and recommend/record-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/009-module-7-tasks/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── README.md
│   ├── consumed/README.md
│   └── provided/{task-state,task-completion-event}.schema.json
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/tasks/
    ├── domain/            # entities: Task, TaskLink, TaskSchedule, TaskCompletionEvent, TaskState
    │                      #           (NO money-amount field — reference-only links)
    ├── services/          # task-service, link-resolver (live read of consumed contracts),
    │                      #   completion-service (idempotent + status write-back), scheduling
    │                      #   (payday-aware, withhold-on-stale), writeback-retry worker (BullMQ),
    │                      #   audit, logging-redaction
    ├── contracts/
    │   ├── consumed/      # typed clients + version pins for GoalState, MerchantGraph, CashFlowForecast;
    │   │                  #   feature-checked BillCalendar, PaymentSchedule, SafeToActSignal (forward-declared)
    │   └── provided/      # TaskState, TaskCompletionEvent (provider schema registry + semver loader)
    └── api/               # record-only endpoints (create/link/complete/schedule — NO money-movement endpoint)
backend/tests/
├── contract/             # consumer + provider contract tests (Pact)
├── integration/          # per user story (US1..US3) on Testcontainers Postgres + cross-profile authZ
└── unit/                 # money pass-through fixtures, deterministic scheduling, withhold-on-stale, idempotency replay

mobile/
└── src/features/tasks/
    ├── task-list/         # US1 (sectioned by day; linked-entity chip + freshness)
    ├── task-detail/       # US1/US2 (live-linked state, complete action, sync_status)
    ├── create-link/       # US1 (pick bill/goal/merchant/budget to link, or free-text)
    └── schedule-view/     # US3 (tasks placed across days vs paydays/due dates)
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split, inheriting the platform's modular-monolith layout. Tasks is the `TasksModule` bounded context (`backend/src/modules/tasks/`) exposing record-only endpoints and the two provided contracts, plus a mobile feature module (`mobile/src/features/tasks/`) organized by user story. The module **never** reads spine or other-module storage directly — only the contract clients under `contracts/consumed/` (three-layer boundary, platform-decisions §3) — and stores no copy of a linked money figure. The repository root layout is ratified in platform-decisions; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (Forward-declared `BillCalendar`/`PaymentSchedule`/`SafeToActSignal` are wired behind a feature check that degrades gracefully — this is required graceful degradation, FR-X-012, not added complexity.)

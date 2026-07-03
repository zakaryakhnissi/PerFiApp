# Implementation Plan: Module 13 — Workspace & Playbooks

**Branch**: `015-module-13-workspace` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/015-module-13-workspace/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Workspace & Playbooks is the P3 module that turns FinOS dashboards into **guided, living workflows**. Its two submodules — **Life Event Playbooks** and the **Personal Finance Notebook** — share one architectural invariant: Workspace is a **display-and-reference orchestration layer that performs no monetary arithmetic of its own** (SC-W-005). A Canada-specific life-event playbook (Moving, Job change, New baby, Immigration/newcomer) renders a bilingual checklist whose steps pull **live** FinOS figures *by reference* (runway from `RunwayForecast`, bills from `BillCalendar`, goal progress from `GoalState`) — never a copy-pasted number that silently rots. A Notion-style notebook embeds the same kind of live, freshness-stamped references inside free-form pages. Steps can generate task/goal **proposals** that Tasks (Module 7) and the Spine goal service materialize; Workspace owns only the **provenance link and the idempotency guarantee**, never the downstream lifecycle and never a money value.

The module is a **broad consumer** of spine/product contracts (`BudgetState`, `GoalState`, `CreditState`, `RunwayForecast`, `SafeToActSignal`, `BillCalendar`, `DocumentVault`, `TripBudget`, `TaskState`/`TaskCompletionEvents`) and a **provider** of `Playbooks` and `NotebookReferences` to Tasks, Goals (Spine), and Focus. Technical approach (all inherited from [platform-decisions.md](../_platform/platform-decisions.md)): one NestJS bounded context (`WorkspaceModule`) in the modular monolith, a render-only freshness-stamped reference cache, server-side session-scoped authZ on every read, idempotent generation keyed on a stable step provenance id, and consumer+provider contract tests in CI. The module is **single-profile** — it touches no credentials, no aggregation tokens, and no other person's finances — so a full Security & Privacy Threat Model is **not** mandatory (the boundary that keeps it out of scope is documented in the spec).

## Technical Context

> **Platform-stack note**: FinOS's platform stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (v1.0.0). This module **inherits it verbatim** and does not re-decide any platform choice (Constitution IX — no parallel stack, no drift). Items below restate the inherited value for this module's context; only genuinely **module-specific** unknowns are marked **NEEDS CLARIFICATION** and tracked in [research.md](./research.md) as non-blocking WS-NR-* items.

**Language/Version**: TypeScript 5.x on Node 20 LTS (backend) + React Native via Expo (mobile) — **inherited** (platform-decisions §2). One language → bit-identical `@finos/format` rendering of referenced figures on client and server.

**Primary Dependencies**: NestJS 10 (Fastify adapter); Prisma over PostgreSQL 16; `@finos/format` (locale rendering of referenced figures) and the `FreshnessStamp`/`Reasoning` shared value objects from `@finos/contract-common`; Pact for consumer+provider contract tests; i18next/react-i18next (mobile); TanStack Query (surfaces `FreshnessStamp.is_stale` per query). **Notably absent**: `@finos/money` arithmetic — Workspace consumes the shared `MoneyCents` *type* for render-only caching but performs **no** money math (SC-W-005), so it never calls `roundHalfUpToCents` or any arithmetic helper. **Inherited** (platform-decisions §2).

**Storage**: Workspace-owned state (playbook instances/steps, live-binding render caches, generated-item provenance, notebook pages, notebook references) in the `workspace` PostgreSQL schema with a per-schema role + RLS on every `profile_id`-scoped table — **inherited** (platform-decisions §3). Money figures are stored **only as render-only caches** (`*_amount_cents` integer, typed exactly as upstream, with the upstream `FreshnessStamp`) — Workspace holds **no money source of truth** and no copy it treats as authoritative; balances/runway/bills/goals are read from their owning contracts.

**Testing**: Unit (provenance-key determinism, freshness/withhold evaluation, locale rendering of a referenced figure, no-money-arithmetic lint gate), **consumer + provider contract tests** per contract, integration (per user story), mobile (component + bilingual/locale + WCAG a11y), all in CI — **inherited** (platform-decisions §6). Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend; Workspace is a P3 tab under the "More" overflow (ux §5.1). **Inherited**.

**Project Type**: Web/mobile — backend service module (`WorkspaceModule`) + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (SC-W-011 / FR-X-015) — met by rendering a locally cached, freshness-stamped playbook/notebook shell immediately and resolving live bindings in the background; a cache miss or stale-beyond-threshold figure renders a flagged/withheld state rather than blocking the hot path (research §8).

**Constraints**: No money computation in Workspace (SC-W-005 / Principle IV/IX — the strongest module-specific invariant); every referenced figure carries a freshness stamp and stale **money** figures are withheld at display (Principle VIII); recommend-only, no money movement, idempotent generation (Principle IV / FR-X-003); EN/FR + locale-correct formatting via `@finos/format`, user free-text rendered verbatim (Principle II); single-profile, server-side session-scoped authZ on every read (Principle V).

**Scale/Scope**: Per-user workspace data (a handful of active playbook instances + a few dozen notebook pages/references typical). **2 module-owned FRs (FR-WS-001..002)** plus the binding cross-cutting FR-X-*; **4 prioritized user stories** (US1 live playbook, US2 living notebook references — both P1; US3 idempotent generation — P2; US4 lifecycle/snooze — P3); ~9 owned/provided entities; provides 2 contracts (`Playbooks`, `NotebookReferences`); consumes 9 spine/product contracts.

**NEEDS CLARIFICATION** (→ [research.md](./research.md), all non-blocking, defaults applied): (1) WS-NR-1 template curation source/cadence (default: in-house curated seed for the four named events); (2) WS-NR-2 template breadth — fifth event in scope? (default: four named events); (3) WS-NR-3 reference-target allowlist vs. arbitrary figures (default: curated allowlist = the consumed set); (4) WS-NR-4 concrete `$id`/version of not-yet-shipped providers (default: pinned by umbrella name at min `1.0.0`); (5) WS-NR-5 step dependency/ordering model (default: flat snooze-able checklist; defer hard dependencies).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Steps/references read real budget/cash-flow/credit/goals/bills state? | **PASS** — every data-bound step and notebook reference reads a *live* upstream figure by reference (`RunwayForecast`, `BudgetState`, `GoalState`, `BillCalendar`, …); a hard-coded or copy-pasted money number is a defect (SC-W-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — Canada-specific templates; all chrome/template strings EN/FR with no single-language leaks; referenced amounts/dates render via `@finos/format` (fr-CA `1 234,56 $`, `28 juin 2026`); time-to-goal from `GoalState` (SC-W-006). User free-text is shown verbatim, never machine-translated. |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — provenance-key determinism, freshness/withhold branches, locale rendering, idempotent generation, reference-resolution failures, and consumer+provider contract tests are authored first and must FAIL before implementation (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — Workspace performs **zero** money arithmetic (SC-W-005), so no rounding point lives here; render-only caches are integer `*_cents` typed exactly as upstream (never float, never re-rounded/summed); generation is idempotent keyed on a UNIQUE provenance id; recommend-only (no money movement, no goal-balance write). A "no monetary operation in Workspace code" lint/test gate enforces this. |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — single-profile module: **no** credentials/tokens (tokens live only in Module 0's KMS store), **no** cross-profile view; every read/write scoped to session-derived identity with defense-in-depth RLS. A full threat model is **not mandatory** because the module touches no credentials, tokens, or another person's finances — boundary documented in [spec.md → Security & Privacy Posture](./spec.md#security--privacy-posture-no-full-threat-model-required); a future shared/household scope re-triggers it. |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — any step proposing a money action carries `Reasoning {inputs, rationale_en, rationale_fr}` (SC-W-007); playbook lifecycle + generation + reference events are written to the append-only audit trail (SC-W-012); missing/stale **money** figures withhold (never guessed). No documented-default is used here — Workspace originates no money figure, so the v2.2.0 secondary-guardrail exception does not apply. |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes 9 / provides 2 via versioned JSON-Schema contracts; consumer+provider Pact tests in CI (SC-W-009); semver in `$id`; a version-skewed consumed contract **disables** the dependent step/reference rather than rendering on a mismatched schema (SC-W-009 / SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every live figure carries the owning contract's `FreshnessStamp`; stale **money** ⇒ `withheld`, stale secondary ⇒ flagged `stale`, target gone ⇒ `unavailable` (SC-W-002 / SC-W-010); contract reads have timeouts/retries and degrade gracefully (FR-X-012). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — P3 orchestration layer kept lean: four curated templates (no marketplace), flat snooze-able checklist (no hard dependency engine), **no** money math duplicated here. Complexity that would re-introduce a rounding point or a cross-user surface is explicitly rejected (research §2, §5). |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in debug logs (audit separate); notebook content + provenance Canadian-region-resident, in the 7-day deletion cascade (FR-X-013) and dormant-retention bound (FR-X-019); ≤300 ms shell render; WCAG 2.1 AA bilingual SR labels; "not regulated advice" framing on any money-action Confirm-Action sheet. |

**Threat model (Principle V)** — **NOT REQUIRED** for this module. Justification: the threat-model mandate triggers only when a module touches credentials, aggregation tokens, or **another person's** financial data. Workspace touches none — it is single-profile, holds/rotates no tokens (Module 0 owns them), and exposes no cross-profile view. The enforced boundary is documented in [spec.md → Security & Privacy Posture](./spec.md#security--privacy-posture-no-full-threat-model-required), which also records the trigger that would make a full threat model mandatory if scope later expands to shared/household playbooks. Session-scoped server-side authZ + RLS still apply on every read/write.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and the `Playbooks` / `NotebookReferences` contracts preserve the no-money-computation invariant (render-only `*_cents` caches), freshness/withhold semantics, idempotent provenance-keyed generation, recommend-only, and single-profile session-scoped authZ; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/015-module-13-workspace/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── provided/        # Playbooks, NotebookReferences (this module provides)
│   └── consumed/        # README pinning the 9 consumed contracts + versions
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/workspace/
    ├── domain/           # entities: PlaybookTemplate, PlaybookInstance, PlaybookStep,
    │                     #           LiveBinding, GeneratedItem, NotebookPage, NotebookReference
    ├── reference/        # render-only reference resolution: typed pointer → upstream figure,
    │                     #           freshness/withhold evaluation, resolution-state machine
    │                     #           (NO money arithmetic — display-and-reference only)
    ├── provenance/       # stable provenance-key derivation (hash of {instance,step,kind})
    │                     #           + idempotent generation guard (UNIQUE)
    ├── services/         # playbook-runner, template-loader (versioned dataset), notebook,
    │                     #           generation (task/goal proposals), conflict (SafeToAct precedence)
    ├── contracts/
    │   ├── consumed/     # typed clients for the 9 consumed contracts (BudgetState, GoalState,
    │   │                 #           CreditState, RunwayForecast, SafeToActSignal, BillCalendar,
    │   │                 #           DocumentVault, TripBudget, TaskState/TaskCompletionEvents)
    │   └── provided/     # Playbooks, NotebookReferences provider + semver registry
    └── api/              # recommend-only endpoints (no money-movement endpoints)
backend/tests/
├── contract/            # consumer (9) + provider (2) contract tests
├── integration/         # per user story (US1..US4) + session-scoped authZ
└── unit/                # provenance-key determinism, freshness/withhold, locale render,
                         #   no-money-arithmetic gate, idempotency replays

mobile/
└── src/features/workspace/
    ├── playbooks/        # US1, US4 (live steps, six-state matrix, snooze/progress)
    └── notebook/         # US2 (pages + live inline references, six-state matrix)
mobile/tests/            # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split, **inherited** from platform-decisions §2–§3. Workspace is a self-contained NestJS bounded context (`backend/src/modules/workspace/`) exposing recommend-only endpoints and the `Playbooks` / `NotebookReferences` provided contracts, plus a mobile feature module (`mobile/src/features/workspace/`) organized by submodule (playbooks, notebook). Two module-specific directories make the invariants visible in the layout: `reference/` (the render-only resolution layer that deliberately contains **no** money arithmetic) and `provenance/` (the idempotency key + generation guard). The module never reads spine/product storage directly — only the Module 0 / product contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII). The concrete repository-root layout is ratified in platform-decisions; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. The one design choice that *removes* rather than adds complexity (Workspace performs no money arithmetic, deferring all monetary math upstream to where the fixtures already live) is recorded in [research.md §2](./research.md) and needs no deviation justification. No complexity deviations to justify.

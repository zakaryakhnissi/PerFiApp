# Implementation Plan: Module 8 — Habits & Routines

**Branch**: `010-module-8-habits` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/010-module-8-habits/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Habits & Routines is the P3 **engagement layer that sits on top of completed actions from other modules**. Its entire value proposition is **integrity**: a streak/XP advances **only** for a *real*, completed, non-reversed financial action, the module is **fully functional with the game layer disabled**, and the daily ritual pulls **live** micro-actions from Bills, Cash Safety, and Inbox. The module is a **consumer** of source-module contracts (`RoundupProposals`, `BillCalendar`, `NotificationDigest`, `TaskCompletionEvents`, `GoalState`) and a **provider** of `StreakState` and `HabitProgress` — exposed cross-user to Social **only** as a server-computed projection (no money, no account/merchant identifiers). Technical approach: an **event-sourced** streak/XP projection over the platform append-only audit store (idempotent per source event id, compensated on reversal), a freshness-gated ritual assembler that degrades gracefully on stale/absent sections, server-side cross-profile authZ on every cross-user read, and consumer+provider contract tests in CI. Per the scope and Money Correctness sections of the spec, **Habits computes no monetary value** — every CAD figure is a read-only pass-through of a source contract's `MoneyCents`, formatted via `@finos/format` unchanged. This is a P3 module: thorough analysis, lean MVP feature set (Constitution IX).

## Technical Context

> **Platform-stack note**: The ratified stack lives in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (v1.0.0) and is **inherited**, not re-decided here. Items below restate only how this module sits on that stack; genuinely module-specific unknowns are marked **NEEDS CLARIFICATION** and tracked in [research.md](./research.md) (open items HAB-OI-1..5). Items marked **[HABITS]** are decisions this plan owns.

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10 backend, Fastify adapter) + React Native via Expo (mobile) — **inherited** (platform §2). One NestJS module = the `HabitsModule` bounded context.

**Primary Dependencies**: `@finos/format` (locale display of pass-through CAD/percent/date — **no `@finos/money` arithmetic dependency**, this module does no money math); Module 0 `@finos/contract-*` clients for consumed contracts; Pact for consumer+provider contract tests; BullMQ workers for completion-event ingestion (timeouts/retries/rate-limits — platform §2). Spine and source access is via versioned contract clients, **never** direct DB reads **[HABITS]**.

**Storage**: Habits-owned state (habits, streak/XP projections, qualifying events, ritual runs, settings, audit) in the **`habits` PostgreSQL schema** (`ca-central-1`, per-schema role + RLS) — **inherited** (platform §1/§5). Streak/XP is a **rebuildable projection over the append-only event store** (platform D5), not a mutable CRUD table — this is what makes compensation a replay concern and keeps the audit trail immutable. **No private copy** of balances/budget/bills/roundup amounts — those are read from source contracts and never re-stored.

**Testing**: Unit (idempotency replays, compensation, grace-window/cadence, game-layer disable, XP-from-counts-only, pass-through-no-recompute), **consumer + provider contract tests** per contract, integration (per user story), API-layer cross-profile authZ/IDOR, mobile component + locale/bilingual + WCAG a11y — all in CI **[HABITS]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API — **inherited** (platform §2).

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped streak grid + ritual list; a cache miss/stale renders a flagged state rather than blocking on a network fetch (platform §6; research §10).

**Constraints**: **No money math** — every CAD figure is a read-only source pass-through, never recomputed/converted/re-rounded (spec Money Correctness; Principle IV satisfied trivially); idempotent state writes keyed on source event id with a `UNIQUE` constraint (Principle IV / FR-X-003); event-sourced compensation on reversal; every surfaced source value carries the **source's** freshness stamp and stale sections are flagged/withheld (Principle VIII); recommend-only — no money-movement endpoint, money items route to the **owning module's** Confirm-Action sheet (FR-X-003); cross-profile authZ enforced server-side on session identity (Principle V); projection-only cross-user exposure to Social (FR-SOC-001); EN/FR + locale-correct formatting (Principle II); notification nudges emitted to the Inbox digest pipeline only (SC-009).

**Scale/Scope**: Per-user engagement data (a handful of habits per user typical; one ritual run per local day). **2 module-owned FRs (FR-HAB-001..002)** across **3 user stories** (all P1-within-this-P3-module); ~8 owned/provided entities; **provides 2 contracts** (`StreakState`, `HabitProgress`); **consumes 5 contracts** (`RoundupProposals`, `BillCalendar`, `NotificationDigest`, `TaskCompletionEvents`, `GoalState`). Several consumed contracts may not yet be ratified by their owners — each ritual section is feature-checked and degrades gracefully (HAB-OI-1).

**NEEDS CLARIFICATION** (→ research.md open items, all non-blocking): (1) HAB-OI-1 source-contract ratification + exact-version pinning; (2) HAB-OI-2 XP-per-action and level-threshold constants; (3) HAB-OI-3 grace-window / cadence defaults confirmation in the Module 0 PIA; (4) HAB-OI-4 dormant-retention window for engagement data (Module 0 PIA); (5) HAB-OI-5 exact Social-facing projection field set (Social/M14 plan). The **integrity rules** (real-action-only, idempotent, compensable, no-money-input, projection-only) are fixed in the spec, not open.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Streaks/ritual reflect real cross-module financial state, never isolated vanity metrics? | **PASS** — streaks advance only on real consumed completion events; the ritual reads live `BillCalendar`/`RoundupProposals`/`NotificationDigest`; advancing on an app-open/view/proposal is a defect (SC-H-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — every habit name, ritual label, badge, nudge has EN+FR text; pass-through CAD/percent/date render via `@finos/format` (fr-CA `1 234,56 $`); habit→goal time-to-goal via `GoalState` (SC-H-009). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — idempotency/compensation/grace/disable/no-money-math/projection tests + consumer+provider contract tests authored first and must FAIL before implementation (tasks.md). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — module **originates no money** (computes/converts/rounds nothing); pass-through amounts carried as `MoneyCents` unchanged; XP uses integer counts only; state writes idempotent keyed on `source_event_id` (UNIQUE); recommend-only, no money-movement endpoint (SC-H-006/H-007). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a **mandatory threat model** (`HabitProgress`/`StreakState` shared cross-user to Social; kid roles); cross-profile authZ server-side on session identity, never client `profileId`; no aggregation tokens/credentials handled here (Module 0 owns them); denied cross-user reads audited (SC-H-008). |
| VI | Explainable & Auditable | Inputs + reasoning on outputs; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — every streak advance carries a bilingual `Reasoning` ("why this counted": source event + action class); advances/compensations/ritual start/complete + denied reads are append-only `AuditEvent`s; stale source sections withhold (Habits originates no money input, so the v2.2.0 documented-default exception does not apply — there is no secondary guardrail input to default). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:habits/StreakState/1.0.0`, `finos:habits/HabitProgress/1.0.0`); consumer+provider tests in CI (SC-H-010); semver with deprecation window; version skew disables the dependent section, never serves on a mismatched schema (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every ritual item/completion carries the source's `FreshnessStamp`; stale/unavailable sections flagged or withheld while the rest of the ritual proceeds; BullMQ ingestion has timeouts/retries/rate-limits (SC-H-005; research §6). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — P3 module kept lean: 3 user stories, 2 provided contracts, projection-over-event-store reuses platform D5 (no new persistence pattern); no money engine, no notification engine (delegated). |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — logs redact PII + pass-through monetary values, audit trail separate; Canadian-region residency; dormant-retention bound (FR-X-019) + email-revocation cascade (FR-X-013) for Inbox-derived items; ≤300 ms module-switch; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing (engagement only). |

**Threat model (Principle V)** — **REQUIRED** here because Habits **provides** `HabitProgress`/`StreakState` to Social (another person's data path) and is surfaced for kid household roles. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model). Habits holds **no aggregation tokens/credentials** (Module 0 owns them); its sensitive assets are engagement signals and the *links* to financial actions. Projection-only cross-user exposure (FR-SOC-001) is enforced server-side **before** transmission.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and contracts preserve no-money-origination, idempotent/compensable event-sourced streaks, projection-only cross-user provision, freshness propagation, and server-side authZ; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/010-module-8-habits/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── provided/        # StreakState, HabitProgress (projection-only schemas)
│   └── consumed/        # README pinning consumed-contract versions
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/habits/
    ├── domain/            # entities: Habit, StreakState, HabitProgress, Badge, QualifyingEvent,
    │                      #           Ritual/RitualRun, RitualItem, GameLayerSetting
    ├── projection/        # event-sourced streak/XP projection over the append-only store
    │                      #           (apply qualifying event, compensate reversal, grace/cadence eval)
    ├── services/          # streak-engine, xp-engine (integer counts only), ritual-assembler,
    │                      #           game-layer-toggle, nudge-emitter (→ Inbox digest), audit
    ├── ingestion/         # BullMQ workers consuming completion/approval/reversal events
    │                      #           (timeouts/retries/rate-limits; idempotent on source_event_id)
    ├── contracts/
    │   ├── consumed/      # typed clients for RoundupProposals, BillCalendar, NotificationDigest,
    │   │                  #           TaskCompletionEvents, GoalState (feature-checked / version-pinned)
    │   └── provided/      # StreakState, HabitProgress provider (projection computed server-side)
    └── api/               # recommend-only endpoints (no money-movement endpoints):
                           #           read streak grid / habit progress, start/advance ritual,
                           #           toggle game layer — money items delegate to source Confirm-Action
backend/tests/
├── contract/             # consumer + provider contract tests
├── integration/          # per user story (US1..US3) + cross-profile authZ/IDOR
└── unit/                 # idempotency, compensation, grace/cadence, disable, XP-from-counts, pass-through

mobile/
└── src/features/habits/
    ├── habits-home/       # US1/US3 — streak/XP/level/badge grid (game layer on)
    ├── daily-ritual/      # US2 — stepped live-item sequence (money items → source Confirm-Action sheet)
    └── game-settings/     # US3 — opt-in toggle, cadence, grace override
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Habits is a self-contained backend NestJS module (`backend/src/modules/habits/`) exposing recommend-only endpoints and the two provided projection contracts, plus a mobile feature module (`mobile/src/features/habits/`) organized by user story. The streak/XP state lives in a **`projection/` layer over the platform append-only event store** (not a mutable CRUD table) so compensation/idempotency are replay properties, and an `ingestion/` layer holds the BullMQ completion-event workers. The module **never** reads source-module storage directly — only the versioned contract clients under `contracts/consumed/` — preserving the module boundary (Principle VII). The repository-root layout is ratified in platform-decisions.md; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. The one non-trivial choice (event-sourced projection rather than a CRUD streak table) **reuses** the ratified platform pattern (platform D5) rather than introducing new complexity, and is justified by the compensation/audit-immutability requirement (FR-HAB-001 integrity). No complexity deviations to justify.

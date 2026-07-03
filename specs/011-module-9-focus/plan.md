# Implementation Plan: Module 9 — Focus & Mental Health

**Branch**: `011-module-9-focus` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/011-module-9-focus/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Focus & Mental Health is a P3 differentiated well-being tab. Its core promise: money stress is never left as a vague feeling — every short, structured **money-stress pack** ends in exactly one concrete action linked **by typed reference** to the *actual* entity causing stress (an overdue `BillCalendar` item, a tight `RunwayForecast`, a behind-pace `GoalState` goal, a hard-avoid-band `CreditState` card), and the evening **Sleep & Wind-Down** sequence converts outstanding money worries into tasks/goals *before* it tries to calm the user. A third, lean surface — a safety-prioritized **stressor inbox** — makes those stressors visible.

The module is a **consumer** of `BillCalendar` (Module 4), `RunwayForecast` (Module 3), `GoalState` and `CreditState` (Module 0) — read only to *identify* stressors — and a **provider** of the recommend-only `WellbeingAction` (`finos:focus/WellbeingAction/1.0.0`) to Tasks (Module 7) and Workspace (Module 13). It also emits low-priority digest events to Inbox (Module 10), never direct push.

**Focus originates no monetary value.** Every money figure it shows (at-risk bill amount, runway shortfall, goal gap) is read **as-provided** (integer CAD cents) from a consumed contract with that source's `FreshnessStamp`; Focus performs no arithmetic, FX, or rounding — so there is no binary float anywhere because there is no money math. A stale **money** input is withheld (figure null) and the proposed action falls back to a non-money `refresh_data` action. Technical approach: a recommend-only stressor-identification + session service over inherited platform infrastructure, idempotent worry-to-action conversion keyed on `(stressor_entity_ref, session_id)`, **private-by-default** well-being PII with server-side authZ and no cross-member exposure, no free-text distress storage, and consumer + provider contract tests in CI.

## Technical Context

> **Platform-stack note**: FinOS's platform stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (Constitution v2.2.0). This plan **inherits** it verbatim and does not re-decide any platform choice. Items below restate the inherited decision and cite the source; only genuinely module-specific open items are marked **[FOCUS — module-specific]** or **NEEDS CLARIFICATION** and resolved in [research.md](./research.md).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS backend) + React Native via Expo (mobile) — **inherited** (platform-decisions §2). One `FocusModule` NestJS bounded context.

**Primary Dependencies**: Module 0 spine + Module 3/4 **contract clients** (`contracts/consumed/`) — never direct storage reads; `@finos/format` for all en-CA/fr-CA money/date rendering; `@finos/money` types for the pass-through `*_cents` it displays (Focus calls **no** `@finos/money` arithmetic); i18next message catalogs; Pact for consumer + provider contract tests; Prisma over the `focus` Postgres schema — **inherited** (platform-decisions §2, §6).

**Storage**: Focus-owned state — `FocusSession` records (structured metadata only), `WellbeingAction` records, and stressor links — in a dedicated **`focus` PostgreSQL schema** with a per-schema role + **RLS** keyed on `auth.uid()`, in the Canadian region (`ca-central-1`) — **inherited** (platform-decisions §2). **No private copy of balances/bills/runway/goals/credit** — those are read from consumed contracts (single canonical spine). Confirmed actions and session lifecycle write to the append-only `audit.event_log` — **inherited** (platform-decisions §4). **No free-text distress field exists** (data minimization, FR-FOC-005).

**Testing**: Unit (stale-withhold fallback, locale formatting, idempotency, safety-precedence ordering), **consumer + provider contract tests** per contract, integration (per user story), mobile (component + bilingual/locale + WCAG a11y), and **API-layer cross-member authZ/IDOR** tests — all in CI — **inherited** (platform-decisions §6). Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API — **inherited** (platform-decisions §2).

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped stressor list refreshed in the background; a stale-beyond-threshold money value yields a flagged/withheld state, never a blocking network fetch on the hot path (research §9).

**Constraints**: Money is display-only and exact — Focus shows provider-owned integer-cent figures as-provided, never float, never recomputed (Principle IV); every consumed money figure carries a freshness stamp and a stale **money** input is withheld with a non-money fallback action (Principle VIII); recommend-only — no money movement and **no silent task/goal creation** (Principle IV / FR-X-003); well-being data is **private-by-default**, server-side authZ on session identity, never exposed across household members regardless of `MemberScope` (Principle V / FR-FOC-005); **no free-text distress storage** (Principle IX / data minimization); crisis resources are **signposted, not provided**; EN/FR + locale-correct formatting (Principle II).

**Scale/Scope**: Per-user well-being data (a handful of open stressors + sessions per user typical); **5 module-owned FRs (FR-FOC-001..005)** across **3 prioritized user stories** (all P3); 4 owned entities (`FocusSession`, `StressorRef`, `WellbeingAction`, `AuditEvent`); **provides 1 contract** (`WellbeingAction`); **consumes 4 contracts** (`BillCalendar`, `RunwayForecast`, `GoalState`, `CreditState`) + optionally `SafeToActSignal` for spend-precedence.

**NEEDS CLARIFICATION** (→ [research.md](./research.md) Open Items, all non-blocking): (OI-1) curated bilingual crisis-resource dataset content/source + legal review; (OI-2) curated bilingual stress-pack / wind-down support-session scripts; (OI-3) final `$id` casing of `BillCalendar`/`RunwayForecast` (owned by Modules 4/3 — Focus pins what they publish); (OI-4) tighter-end well-being retention window set in the planning-phase PIA; (OI-5) Tasks/Goals action-sink availability sequencing.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/credit/goals state? | **PASS** — stressors are identified only from real consumed contracts (`BillCalendar`, `RunwayForecast`, `GoalState`, `CreditState`); a worry is never fabricated when the source entity does not exist (FR-FOC-003, SC-F-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — all session/support/action/crisis content EN/FR with no single-language leak; every displayed money figure CAD + time-to-goal via `@finos/format` (fr-CA `1 234,56 $`) (SC-F-006). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — stale-withhold fallback, locale, idempotency, safety-precedence, contract, and cross-member-authZ tests are authored first and must fail before implementation (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — Focus originates **no** money value: it displays provider-owned integer-cent figures as-provided (no float, no arithmetic, no rounding in Focus); worry-to-action writes are idempotent (keyed on `(stressor_entity_ref, session_id)`, UNIQUE); recommend-only — no money movement and no silent task/goal creation (FR-FOC-004, SC-F-003/004). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — well-being PII is private-by-default; server-side authZ on validated session identity, never client `profileId`; **no** credentials/tokens handled here; a **focused** Security & Privacy Threat Model ships in the spec as deliberate hardening (FR-FOC-005, SC-F-007). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — every `WellbeingAction` carries bilingual `Reasoning` (stressor inputs + source + freshness) (SC-F-009); confirmations + session lifecycle write to the append-only audit trail; a stale/missing **money** input withholds the figure and falls back to a non-money action — Focus invokes **no** documented-default money substitution (it owns no money input). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes via versioned contract clients, provides `finos:focus/WellbeingAction/1.0.0`; consumer + provider tests in CI (SC-F-010); version skew on a consumed contract disables that stressor source (rest degrades). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every consumed money figure carries its source `FreshnessStamp`; a stale **money** input is withheld with a visible stale chip + non-money fallback action (SC-F-005); Focus owns no external feed, so ingestion resilience is the providers' concern (Focus degrades gracefully when a source is absent). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — P3 module kept lean: pure display pass-through (no money math), no streak/XP engine (Habits owns that), no push (Inbox owns that), **no free-text distress storage**, crisis signposted not provided; US3 stressor inbox is a thin aggregation of US1/US2. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — logs redact PII + monetary values **+ well-being signals** (audit separate); well-being PII honors the 7-day deletion cascade + dormant-retention bound (tighter-end window in PIA); Canadian-region residency; ≤ 300 ms; WCAG 2.1 AA bilingual SR labels; non-clinical + not-regulated-advice framing surfaced. |

**Threat model (Principle V)** — Focus touches **no** credentials, aggregation tokens, or another person's financial data (well-being content is private-by-default and never shared across household members), so it is **not** in the FR-X-010 mandatory-credential-threat-model set. A **focused** Security & Privacy Threat Model is nonetheless included as deliberate hardening because mental-health/well-being signals are among the most sensitive PII under PIPEDA / Québec Law 25. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model--focused--sensitive-well-being-pii-see-clarifications-for-why-a-full-credential-threat-model-is-not-compelled). Aggregation-token lifecycle is **out of scope** (owned by Module 0 / FR-CORE-007); Focus reads consumed contracts only.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and the `WellbeingAction` contract preserve money-as-display-only, freshness-withhold-on-stale, server-side private-by-default authZ, idempotent recommend-only conversion, and bilingual explainability; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/011-module-9-focus/
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
└── src/modules/focus/
    ├── domain/            # entities: FocusSession, StressorRef, WellbeingAction (+ status machine), AuditEvent
    ├── services/          # stressor-identification (safety-precedence), session (stress_pack + wind_down),
    │                      #           wellbeing-action (recommend-only + idempotent dispatch), crisis-signpost (static),
    │                      #           inbox-digest-emitter (no direct push)
    ├── contracts/
    │   ├── consumed/      # typed clients + version pins for BillCalendar, RunwayForecast, GoalState, CreditState,
    │   │                  #           SafeToActSignal (feature-checked)
    │   └── provided/      # WellbeingAction (finos:focus/WellbeingAction/1.0.0)
    └── api/               # recommend-only endpoints (no money-movement, no silent task/goal creation) + authz guard
backend/tests/
├── contract/             # consumer (BillCalendar, RunwayForecast, GoalState, CreditState) + provider (WellbeingAction)
├── integration/          # per user story (US1..US3) + cross-member authZ/IDOR
└── unit/                 # stale-withhold fallback, locale formatting, idempotency, safety-precedence ordering

mobile/
└── src/features/focus/
    ├── stressor-list/     # US3 — safety-prioritized stressor inbox
    ├── stress-pack/       # US1 — support session → one WellbeingAction → Confirm-Action
    ├── wind-down/         # US2 — worry-capture before guided wind-down; Skip; calm Empty state
    └── crisis-signpost/   # static, localized resource panel (no data entry, no transmission)
mobile/tests/             # component + locale/bilingual + a11y (WCAG 2.1 AA) tests
```

**Structure Decision**: Web/mobile split. Focus is a self-contained backend `FocusModule` (`backend/src/modules/focus/`) exposing recommend-only endpoints and the single provided `WellbeingAction` contract, plus a mobile feature module (`mobile/src/features/focus/`) organized by user story. The module never reads spine/bills/cash-safety storage directly — only the contract clients under `contracts/consumed/` — preserving the swappable-spine boundary and the per-schema RLS isolation (Principle VII; platform-decisions §3). The repository-root layout is ratified in platform-decisions §2; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (Note: the focused threat model in the spec is a *deliberate hardening choice beyond* what the constitution compels, not a complexity deviation requiring justification.)

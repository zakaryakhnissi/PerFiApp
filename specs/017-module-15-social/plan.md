# Implementation Plan: Module 15 — Social & Accountability

**Branch**: `017-module-15-social` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/017-module-15-social/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Social & Accountability is the lightest P4 product tab: small **Accountability Circles** that share *one* explicitly-chosen, **dimensionless** progress metric (`percentage_complete` / `streak_count` / `pace_status`) tied to **real** goal/habit data — never amounts, account names, or institutions. Its value is **motivation through shared accountability** with zero financial leakage. The module is a **consumer** of `GoalState` (Module 0 spine, published) and — when published — `HabitProgress`/`StreakState` (Module 9 Habits) and `MemberScope` (Module 14 Household); it is a **provider** of `CircleProgress` and `AccountabilitySignals` to Habits and Inbox. Technical approach: a **server-side projection filter** that computes a leak-proof, dimensionless projection from a granted source *before* transmission; an explicit, revocable, audited `ShareGrant` consent model; idempotent recompute-and-publish keyed on `source_event_id`; freshness-flagged (never withheld — no money input) reads; server-side cross-user authZ + RLS on every circle/membership/projection read; signals routed only through the Inbox digest (never direct push); and consumer+provider contract tests — the provider test additionally **asserting the absence of any money/account/institution field** — in CI. Because Social shares another person's finance-*derived* data across a user boundary, a **Security & Privacy Threat Model is MANDATORY** (Constitution V) and is the heart of this module. Social transmits **no monetary amount**: there is no money path, no money movement, and no money recommendation.

## Technical Context

> **Platform-stack note**: The ratified stack lives in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and is **inherited**, not re-decided here. Items below restate the inherited choice with the platform reference. Only genuinely **module-specific** decisions are marked **[SOCIAL]**; genuinely open inputs are marked **NEEDS CLARIFICATION** and resolved (non-blocking) in [research.md](./research.md).

**Language/Version**: TypeScript 5.x on Node 20 LTS (backend, NestJS 10 + Fastify) + React Native via Expo (mobile) — **inherited** (platform-decisions §2). Rationale: one language across mobile + backend; `@finos/format` shared for bilingual percentage/date rendering.

**Primary Dependencies**: Module 0 contract clients for `GoalState` (and, when published, `HabitProgress`/`StreakState`, `MemberScope`) — spine access is **via contract clients only, never direct storage** **[SOCIAL]**; `@finos/format` for fr-CA/en-CA percentage + date formatting; Pact for consumer+provider contract tests; Prisma (Postgres). No `@finos/money` / `decimal.js` money path is needed — Social emits no cent value; the one `percentage_complete` ratio is the spine's arbitrary-precision ratio transmitted as a decimal string (inherited rate-string convention, platform-decisions §4).

**Storage**: Social-owned state only — `Circle`, `CircleMembership`, `ShareGrant`, the latest derived `CircleProgress` projection per member, and `AuditEvent` — in the Canadian-region PostgreSQL `social` schema with per-schema roles + **RLS** keyed on `auth.uid()` + circle membership (**inherited**, platform-decisions §2/§5). **No** private copy of balances/budget/credit/goal amounts — only the dimensionless projection derived from `GoalState`; the `ShareGrant.source_ref_id` (the underlying goal/habit id) is stored server-side and **never exposed** in any provided contract.

**Testing**: Unit (projection-filter leak assertions, freshness flag-not-withhold, idempotent recompute/revoke, household-exclusion logic, bilingual/locale formatting), **consumer + provider contract tests** per contract (the provider test asserts no money/account/institution field), integration (per user story against a Testcontainers Postgres), security (API-layer IDOR/cross-circle authZ + audited denials, RLS policy), mobile (component + locale/bilingual + WCAG a11y) — all in CI **[SOCIAL]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API — **inherited** (platform-decisions §2).

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped circle list + per-member projection; a cache miss or stale-beyond-threshold value renders the flagged/Unavailable state rather than a blocking fetch (research §7).

**Constraints**: No monetary amount/currency/FX anywhere — leak-proof **by construction** (Principle IV / FR-SOC-001; the contract has no money field); recommend-only, no money movement, no manual-entry projection write path (Principle IV / FR-X-003 / FR-SOC-002); every projection carries a `FreshnessStamp` and stale ⇒ **flagged**, never withheld, because it is a dimensionless secondary metric with no money input (Principle VIII); cross-user authZ enforced server-side on validated session identity, never a client-supplied `circleId`/`memberId` (Principle V / FR-HH-001); household-joint goals excluded unless `MemberScope` explicitly extended (FR-SOC-001); signals route through the Inbox digest only (ux-foundations §6); EN/FR + locale-correct formatting (Principle II).

**Scale/Scope**: Small circles (cap **8** members, MVP — research §4); **2 module-owned FRs (FR-SOC-001..002)** across **3 prioritized user stories** (US1 leak-proof single-metric sharing P1; US2 real-data live updates P2; US3 audited revocation/deletion P2); ~6 owned entities; provides 2 contracts (`CircleProgress`, `AccountabilitySignals`); consumes 3 (`GoalState` published; `HabitProgress`/`StreakState`, `MemberScope` not yet published — feature-checked + safe-default).

**NEEDS CLARIFICATION** (→ research.md, all non-blocking): (OI-1) Habits `HabitProgress`/`StreakState` not yet published — habit-streak circles feature-checked, degrade to goal-based until Habits ships; (OI-2) Household `MemberScope` not yet published — safe-default exclude all household-joint goals until then; (OI-3) final 24 h staleness window confirmed in Module 0 privacy/ops review (platform NR-2); (OI-4) member cap 8 + existing-user-only invites are MVP defaults; (OI-5) dormant-circle retention/inactivity window set in the planning-phase PIA (platform NR-3).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Projections read real budget/cash-flow/credit/goals state? | **PASS** — projections are computed from real spine `GoalState` (and real `HabitProgress` when available), never invented or manually entered (FR-SOC-002 / SC-S-003); a contribute-nudge `AccountabilitySignal` is evaluated downstream against Cash Safety precedence. |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — no CAD amount is shown (none exists); all percentages/dates render via `@finos/format` (fr-CA `72,5 %`); every system label + screen-reader string is bilingual EN/FR with no single-language leak (SC-S-007). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — projection-filter leak assertions, freshness flag/Unavailable, idempotent recompute/revoke, household-exclusion, API-layer IDOR, bilingual/locale, and consumer+provider contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — Social transmits **no monetary value**: no `*_cents`/currency/FX field exists (leak-proof by construction); the one `percentage_complete` ratio is the spine's arbitrary-precision ratio as a decimal string (no float); recompute-and-publish + revoke are idempotent on `source_event_id`; recommend-only, no money movement (FR-SOC-001 / FR-X-003). The "no float in money paths" gate is vacuously satisfied. |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — **threat model MANDATORY and present** (shares another person's finance-derived data); cross-user authZ enforced server-side on validated session identity + RLS, never a client-supplied id; denied access audited (SC-S-002/SC-015); no token/credential handling here (delegated to Module 0). |
| VI | Explainable & Auditable | Inputs + reasoning; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — a projection is explained by its `shared_metric_kind` + `source_kind` + `FreshnessStamp` (what it derives from + how fresh); circle creation, share grant, revocation, owner deletion, deletion-cascade, and **denied access** are written to the append-only audit trail (FR-X-007); missing/deleted source ⇒ "no longer shared", never guessed; no money input exists to withhold or default. |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:social/CircleProgress/1.0.0`, `finos:social/AccountabilitySignals/1.0.0`); consumer+provider tests in CI with a provider no-money-field assertion (SC-S-008); version skew disables the dependent projection (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every projection carries a `FreshnessStamp`; stale ⇒ **flagged** (dimensionless secondary metric, no money input — flag, not withhold; consistent with VIII); feed-down ⇒ Unavailable with last-known timestamp, never a fabricated value (FR-X-008/012 / SC-S-006); consumed-contract reads have timeouts/retries. |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — deliberately lean P4 MVP: a privacy-controlled, server-computed read-only progress feed; **no** chat, social graph, leaderboard, public discovery, or money figures; existing-user-only invites, cap 8 (research §4). |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — debug logs redact finance-derived values + member identifiers, audit trail kept separate (FR-X-014); deletion cascades to memberships/grants/projections within 7 days + dormant anonymization (FR-X-013/019); Canadian-region residency (FR-X-020); ≤ 300 ms (research §7); WCAG 2.1 AA bilingual SR labels (FR-X-016); not-regulated-advice framing on consent sheets. |

**Threat model (Principle V)** — REQUIRED here because Social shares another person's financial-*progress* data across a user boundary (cross-user financial data). Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--social-shares-another-persons-financial-progress-data-across-a-user-boundary). Aggregation-token lifecycle is **out of scope** for Social (owned by Module 0 / FR-CORE-007); Social reads spine/Household contracts only and stores no token.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and contracts preserve leak-proof-by-construction (no money/account field), server-side projection filtering, freshness-flagging, idempotent recompute/revoke, server-side authZ + audited denials, and recommend-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/017-module-15-social/
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
└── src/modules/social/
    ├── domain/            # entities: Circle, CircleMembership, ShareGrant, CircleProgress (projection),
    │                      #           AccountabilitySignal, FreshnessStamp
    ├── projection/        # server-side projection filter: GoalState/HabitProgress → dimensionless
    │                      #           CircleProgress; leak-proof (no money/account field by construction)
    ├── services/          # circle, membership, share-grant/revoke (consent), recompute-and-publish,
    │                      #           household-exclusion, signal-emitter (→ Inbox digest), audit, redaction
    ├── contracts/
    │   ├── consumed/      # typed clients + schemas: GoalState (published); HabitProgress/StreakState,
    │   │                  #           MemberScope (feature-checked / safe-default until published)
    │   └── provided/      # CircleProgress, AccountabilitySignals
    └── api/               # read-only circle/projection endpoints + consent (grant/revoke/close) — NO
                           #           projection-write path, NO money-movement endpoint; authZ guard
backend/tests/
├── contract/             # consumer + provider contract tests (provider asserts no money/account field)
├── integration/          # per user story (US1..US3) + cross-circle/cross-member authZ (IDOR)
└── unit/                 # projection-filter leak, freshness flag/Unavailable, idempotency, household-exclusion

mobile/
└── src/features/social/
    ├── circle-list/       # US1 (create circle, choose ONE metric)
    ├── circle-detail/     # US1/US2 (member projection rows, live updates, six states)
    └── consent/           # US1/US3 (share grant + revoke Confirm-Action sheets)
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Social is a self-contained backend service module (`backend/src/modules/social/`) — one NestJS bounded context — exposing read-only circle/projection + consent endpoints and the two provided contracts, plus a mobile feature module (`mobile/src/features/social/`) organized by user story. The dedicated `projection/` layer isolates the **server-side projection filter** (the FR-SOC-001 leak-proof boundary), so leak-proofing is a single, testable seam. The module never reads spine/Household storage directly — only the Module 0/14 contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII). The concrete repository-root layout is ratified in platform-decisions; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify.

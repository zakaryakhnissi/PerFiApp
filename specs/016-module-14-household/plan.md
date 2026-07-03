# Implementation Plan: Module 14 — Household & Family

**Branch**: `016-module-14-household` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/016-module-14-household/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Household & Family is a **P3** module that makes FinOS multi-person: it owns the product's **highest-sensitivity authorization surface** and a lean **Kid Money & Allowances** submodule. It does two things: (1) define fine-grained household **roles** (`HouseholdRoles`) and per-(viewer, subject, module) **grants** (`MemberScopes`) that **every other module enforces server-side** on every cross-user request — denying and auditing unauthorized access; and (2) run chore-based allowances and kid-friendly savings goals (`KidGoals`) whose money is **integer CAD cents** and whose accruals are **idempotent and never disbursed** by FinOS. Household does **not** re-implement other modules: the Family Dashboard **composes** over their existing versioned contracts (`AccountState`, `GoalState`, `CardLineup`, `StatusState`, `HabitProgress`, …) at request time, always filtered by the viewer's `MemberScope` server-side. Technical approach: a recommend-only service layer over Module 0 spine contracts, two-layer server-side authZ (policy engine `MemberScope` checks **and** Postgres RLS), integer-cents allowance math with idempotent writes, freshness-gated dashboard reads, step-up-MFA-gated role/scope mutation, an append-only audit trail that records every membership/role/scope change **and every denied cross-user access**, and consumer+provider contract tests in CI. A **Security & Privacy Threat Model is MANDATORY** here (the module touches another person's financial data, including minors') and enumerates IDOR and horizontal privilege escalation with mitigations.

## Technical Context

> **Platform-stack note**: The FinOS stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (v1.0.0). This plan **INHERITS** it and does not re-decide platform choices. Items marked **[INHERITED]** come from that document; items marked **[HOUSEHOLD]** are decisions this plan owns; genuinely module-specific unknowns are marked **NEEDS CLARIFICATION** and tracked in the spec's [Clarifications](./spec.md#clarifications).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10, Fastify adapter) backend + React Native (Expo) mobile **[INHERITED — platform-decisions §2]**.

**Primary Dependencies**: `@finos/money` (integer cents; no rates owned here), `@finos/format` (en-CA/fr-CA locale formatting), `@finos/contract-*` packages (JSON-Schema draft 2020-12 + generated types), Pact (consumer+provider contract tests), Prisma (Postgres), a CASL/RBAC-ABAC policy engine for `MemberScope` checks **[INHERITED — platform-decisions §2, §5]**. Spine and product-module access is via Module 0 / Module 1 / Module 8 / Module 3 contract clients, never direct DB reads **[HOUSEHOLD]**.

**Storage**: Household-owned state only — membership/role edges, `MemberScope` grants, and the kid-allowance/goal ledger — in the `household` Postgres schema (PostgreSQL 16, AWS `ca-central-1` Montréal primary, `ca-west-1` Calgary DR) with per-schema DB role + **RLS** on every household-scoped table **[INHERITED — platform-decisions §2, §5]**. Household holds **no** private copy of another module's financial data; balances/goals/rewards are read from their contracts at request time **[HOUSEHOLD]**.

**Testing**: Unit (integer-cents allowance fixtures, idempotency replays, scope-resolution/least-privilege logic, locale formatting), **API-layer authZ / IDOR / horizontal-escalation tests** (server-side, never UI), RLS policy tests, **consumer + provider contract tests** per contract, integration (per user story) on a Testcontainers Postgres, mobile component + bilingual/locale + WCAG a11y — all in CI **[INHERITED — platform-decisions §6]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app + backend API **[INHERITED]**.

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met by rendering the household membership + dashboard panels from freshness-stamped projections; a missing/stale consumed panel renders a flagged Empty/Unavailable state rather than blocking on a slow upstream fetch.

**Constraints**: Server-side authZ on **every** cross-user boundary, acting identity from the validated session, never a client-supplied `member_id`/`profile_id` (Principle V / FR-HH-001); least-privilege default of `none` for any un-granted tuple; revocation effective immediately (no cached data); step-up MFA on role/scope changes and member invites/removals (FR-X-017); money is exact integer cents and **recommend-only** — no allowance disbursement (Principle IV / FR-X-003); idempotent writes keyed on `source_event_id`; every cross-user denial audited (SC-015); minors' data treated with heightened PIPEDA/Law 25 sensitivity; freshness-gated dashboard reads (Principle VIII); EN/FR + locale-correct formatting (Principle II); Canadian-region residency (FR-X-020).

**Scale/Scope**: Small households (typically 2–6 members; minors a subset); **2 module-owned FRs (FR-HH-001..002)** across **3 prioritized user stories** (US1 roles/scopes/authZ, US2 kid money & allowances, US3 Family Dashboard); 6 owned entities; provides 3 contracts (`HouseholdRoles`, `MemberScopes`, `KidGoals`); consumes 7 contracts (`AccountState`, `GoalState`, `MerchantGraph`, `ConnectionConsent`, `CardLineup`, `StatusState`, `HabitProgress`) plus a member's own `SafeToActSignal` for conflict precedence. P3 → MVP-scoped (Constitution IX).

**NEEDS CLARIFICATION** (non-blocking; defaults assumed — see [spec Clarifications](./spec.md#clarifications)): (1) adult-age transition threshold (default household-configurable, 18); (2) single `owner` + multiple `admin`s vs true co-ownership; (3) whether `teen` gets a restricted profile switcher (default none); (4) retention/exportability of a departed member's kid-allowance history.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Household suggestions read real member budget/cash-flow/credit/goals state? | **PASS** — the Family Dashboard composes over real `AccountState`/`GoalState`/`CardLineup`/`StatusState`/`HabitProgress`; any household suggestion is grounded in member state and a member's own `SafeToActSignal` takes precedence (US3, SC-H-010). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — kid goals show CAD + time-to-goal; roles, scopes, FinOS-template chore labels, and alerts are EN/FR with no single-language leaks; fr-CA `1 234,56 $` / `5,00 $` via `@finos/format` (SC-H-007). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — API-layer IDOR/escalation tests, RLS policy tests, integer-cents + idempotency fixtures, revocation-immediacy, bilingual, and consumer+provider contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Integer cents / decimal, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — allowance/goal amounts are integer CAD cents (`MoneyCents`); accrual is exact integer addition (no rounding step); time-to-goal divide done in arbitrary precision, never on money; writes idempotent on `source_event_id`; **recommend-only — FinOS disburses nothing** (FR-HH-002, SC-H-005/006). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — **MANDATORY threat model present** (IDOR + horizontal escalation enumerated); two-layer server-side authZ (policy engine + RLS) on session identity, never a client id; least-privilege default `none`; revocation immediate; step-up MFA on role/scope mutation (FR-X-017); no token/secret in any contract (`ConnectionConsent` is non-secret metadata only). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — household suggestions carry inputs+reasoning; the append-only audit trail records every membership/role/scope change, every chore completion/accrual/"paid", and **every denied cross-user access** (SC-H-011); stale/missing **money** inputs withhold (no documented-default money path; this module owns no secondary guardrail default). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — provides `HouseholdRoles`/`MemberScopes`/`KidGoals` and consumes 7 contracts via versioned JSON-Schema clients; consumer+provider tests in CI; semver in `$id`; version skew disables the dependent panel rather than serving a mismatched schema (SC-H-008). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every dashboard value carries a `FreshnessStamp`; a stale **money** input (a member's balance) withholds, a stale secondary value flags; consumed-contract reads have timeouts/retries and degrade to Empty/Unavailable (SC-H-010). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — P3 lean set: 5 roles, 3 access levels (`none`/`read`/`propose`, no write/execute), compose-not-reimplement dashboard; no premature abstraction over not-yet-shipped modules. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in logs, audit trail kept separate; minors' data heightened-sensitivity under PIPEDA/Law 25; departed-member partial revocation + dormant retention + 7-day deletion; Canadian-region residency; ≤300 ms; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing on Confirm-Action sheets. |

**Threat model (Principle V)** — **REQUIRED and MANDATORY** here: Household is the cross-user authorization surface and touches another person's financial data, including minors'. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model). It enumerates **IDOR** and **horizontal privilege escalation** as explicit attack scenarios with server-side mitigations (FR-HH-001, FR-X-010). Aggregation-token issuance/rotation is **out of scope** for Household (owned by Module 0 / FR-CORE-007); Household drives only **partial revocation** of a departing member's existing link.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and contracts preserve integer-cents money-exactness, idempotency, server-side authZ + RLS, least-privilege default, freshness gating, and recommend-only; the mandatory threat model is present; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/016-module-14-household/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # Phase 1 output (provided/ + consumed/)
└── tasks.md             # Phase 2 output (/speckit-tasks — NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/household/
    ├── domain/            # entities: Household, Member, MemberScope, KidGoal, Allowance/ChoreReward, AuditEvent
    ├── money/             # integer-cents allowance/goal helpers (addition only; no FX/points math) + time-to-goal (precision divide, never on money)
    ├── authz/             # MemberScope resolution (least-privilege default=none), policy-engine guard, RLS policy definitions, step-up-MFA gate
    ├── services/          # roles/membership, scope-grants, kid-goals, allowance-accrual (idempotent), family-dashboard composer (scope-filtered), audit
    ├── contracts/
    │   ├── consumed/      # typed clients for AccountState, GoalState, MerchantGraph, ConnectionConsent (M0), CardLineup, StatusState (M1), HabitProgress (M8), SafeToActSignal (M3)
    │   └── provided/      # HouseholdRoles, MemberScopes, KidGoals
    └── api/               # recommend-only endpoints (membership/scope mutation MFA-gated; NO money-movement endpoints)
backend/tests/
├── contract/             # consumer + provider contract tests
├── integration/          # per user story (US1..US3) on Testcontainers Postgres
├── security/             # API-layer IDOR / horizontal-escalation / revocation-race tests + RLS policy tests
└── unit/                 # integer-cents fixtures, idempotency, scope-resolution, locale formatting

mobile/
└── src/features/household/
    ├── members/          # US1 — roles & per-module scope management (MFA-gated mutations)
    ├── kid-money/         # US2 — chore allowances + kid-friendly goal tracker (kid role: no switcher)
    └── dashboard/         # US3 — Family Dashboard (scope-filtered panels, freshness chips, "Viewing {Name}" banner)
mobile/tests/             # component + locale/bilingual + a11y (WCAG 2.1 AA) tests
```

**Structure Decision**: Web/mobile split, inheriting the ratified NestJS modular monolith (one bounded context per module) + React Native (Expo) layout. Household is a self-contained backend module (`backend/src/modules/household/`) exposing recommend-only endpoints and its three provided contracts, plus a mobile feature module (`mobile/src/features/household/`) organized by user story. Authorization is a first-class intra-module concern (`authz/`): the module **defines** grants but relies on the platform's two-layer server-side enforcement (policy engine + Postgres RLS, platform-decisions §5). The module reads other modules' state **only** via the Module 0/1/8/3 contract clients under `contracts/consumed/` — never cross-schema `SELECT` — preserving the three-layer module boundary (Principle VII). The repository root layout is ratified in platform-decisions; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. The module's authorization weight is inherent to its purpose (it is FinOS's authZ surface), not gold-plating; the lean role/access-level set (5 roles, 3 levels, compose-not-reimplement) keeps it MVP-scoped (Constitution IX).

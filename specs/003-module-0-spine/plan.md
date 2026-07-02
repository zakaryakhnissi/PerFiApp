# Implementation Plan: Module 0 — Financial Core & Data Spine

**Branch**: `003-module-0-spine` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-module-0-spine/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Module 0 is the **single canonical spine** — the source of truth every other FinOS module reads from: accounts, balances, transactions, the merchant graph, budget, cash-flow forecast, credit state, and goals, each freshness-stamped and exposed **only** through versioned JSON-Schema contracts. It owns the **connection/consent flow**, the swappable aggregation boundary (`SpineAggregationPort`), and the **broadest credential/aggregation-token surface in the product**, so its threat model (token lifecycle + auth/MFA + IDOR on household boundaries) is mandatory and ships before implementation. It **provides** eight spine contracts (`AccountState`, `TransactionStream`, `MerchantGraph`, `BudgetState`, `CashFlowForecast`, `CreditState`, `GoalState`, `ConnectionConsent`) plus the three platform-canonical shared value objects (`FreshnessStamp`, `Reasoning`, `MoneyCents`) and **consumes only external feeds** (aggregation provider, credit bureau, FX) — it never reads product-module state, so there are no circular dependencies. Technical approach: a recommend-only, idempotent ingestion + normalization/dedup pipeline; all money in integer minor units / arbitrary-precision decimal (never float, rounded half-up exactly once at the cent); per-value freshness stamps with withhold-on-stale-money; aggregation tokens isolated in a KMS-backed secrets store (never a DB column, never a contract, never a log) with per-member independent grants enabling partial revocation; server-side authZ on every cross-user read keyed on the validated session identity plus Postgres RLS; an append-only audit store; and consumer + provider contract tests in CI for all eleven published contracts.

The spine makes Integration-First possible. It does **not** make product recommendations (best card, runway micro-action, keep/cancel); it surfaces canonical state + freshness, and its one computed signal that resembles a recommendation is the **freshness/degradation flag** that tells consumers when to flag or withhold.

## Technical Context

> **Platform-stack note**: The platform stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (v1.0.0, against Constitution v2.2.0) and is **inherited here, not re-opened**. Items below marked **[PLATFORM]** are taken as-given from that document. Items marked **[SPINE]** are decisions this Module 0 plan owns. Genuinely open inputs are marked **NEEDS CLARIFICATION** and resolved in [research.md](./research.md) or surfaced as product-owner questions in the spec — none blocks the plan.

**Language/Version**: TypeScript 5.x on Node 20 LTS (backend, NestJS 10 + Fastify) + React Native via Expo (mobile) **[PLATFORM — platform-decisions §2]**. One language → bit-identical money/format math on client and server.

**Primary Dependencies** **[PLATFORM unless noted]**: `@finos/money` (`bigint` cents + `decimal.js` decimal-string rates, single half-up rounder), `@finos/format` (`Intl` en-CA/fr-CA), Prisma (ORM; **[SPINE]** raw SQL/Drizzle escape hatch confirmed only for the heavy cash-flow forecast query — research §5, NR-5), JSON-Schema draft 2020-12 contract packages with generated TS types, **Pact** (consumer + provider contract tests), BullMQ (Redis) ingestion workers, AWS Secrets Manager / KMS (token custody), `i18next`. **[SPINE]** Plaid (Canada) accessed **only** via the `SpineAggregationPort` adapter — no consumer depends on Plaid types.

**Storage** **[PLATFORM — platform-decisions §2/§3]**: PostgreSQL 16 in **AWS `ca-central-1` (Montréal)** primary, **`ca-west-1` (Calgary)** DR. **[SPINE]** Module 0 owns the `spine` schema (canonical projections of all eight entities) and writes the shared `audit` schema's append-only `event_log`. Per-schema DB roles + **RLS** on every profile/household-scoped table. **Aggregation tokens are NOT in Postgres** — they live solely in the KMS-backed secrets store, keyed by `link_id`. Redis (Canadian region) for queues/rate-limits/cache holds no raw financial PII beyond short-lived job payloads.

**Testing** **[SPINE]**: Unit (mandatory money golden fixtures — dedup-sum, FX, utilization-band, runway, time-to-goal; freshness/withhold + documented-default branches; idempotency replays; locale formatting), **consumer + provider Pact tests for every one of the 11 published contracts**, integration per user story against a Testcontainers Postgres, security/IDOR tests at the **API layer** (not UI) proving 0 cross-user exposure + audited denials. Tests are mandatory and authored first (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app + NestJS backend API; the **Home/Spine tab** and the connection/consent + onboarding flow are owned here **[PLATFORM/SPINE]**.

**Project Type**: Web/mobile — backend bounded-context module (`SpineModule`) + mobile feature module + the platform-canonical contract packages.

**Performance Goals**: ≤ 300 ms cold-start / module-switch onto the Home/Spine tab (umbrella SC-010 / FR-X-015) — met by serving from a locally cached, freshness-stamped projection of `AccountState`/`BudgetState`/`CashFlowForecast`, background-refreshed by workers; a cache miss or stale-beyond-threshold value renders a **flagged/withheld** state rather than blocking the hot path (research §9). **NEEDS CLARIFICATION (NR-7)**: profile the budget on **real** mid-range Canadian devices, not only emulators.

**Constraints**: Money is exact (integer minor units / arbitrary-precision decimal, never float — Principle IV); every externally-sourced value carries a freshness stamp and stale **money** reads withhold (Principle VIII); recommend-only — the spine moves no money and exposes no money-movement endpoint (Principle IV / FR-X-003); every spine write is idempotent and safe to retry, keyed on `source_event_id` (Principle IV); EN/FR + locale-correct formatting (Principle II); aggregation tokens never in a DB column / contract / log (Principle V / FR-CORE-007); cross-user authZ enforced server-side on session identity, never a client-supplied id (Principle V); Canadian-region residency for all data + PII (FR-X-020).

**Scale/Scope**: Per-user financial data (typically a handful of institutions, tens of accounts, thousands of transactions/month per user); **7 module-owned FRs (FR-CORE-001..007)** + the cross-cutting FR-X-* suite, across **7 prioritized user stories** (US1–US5 + US7 are **P1**; US6 Goals is **P2**); 11 owned/provided entities; **provides 11 contracts** (8 spine + 3 shared value objects); **consumes only 3 external feeds** (aggregation provider, credit bureau, FX).

**NEEDS CLARIFICATION** (non-blocking; documented defaults recorded in [research.md](./research.md) and the spec's *Open Questions for the Product Owner*): (NR-1) Plaid Canada residency posture confirmed + agreement-backed before go-live; (NR-2) final staleness-window defaults per data class (working defaults: balances 6 h, transactions 12 h, credit 24 h, FX 1 h, merchant 30 d); (NR-3) dormant-account inactivity window for FR-X-019 (working assumption 24 months, set in the PIA); (NR-4) concrete Canadian credit-bureau + FX vendors and residency posture; (NR-5) per-query raw-SQL/Drizzle escape hatch for the forecast query; (NR-7) perf budget on real devices; statement-import vs manual-entry scope for the institution-unavailable fallback.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Is the spine the single real financial picture every module integrates against? | **PASS** — the spine is the single canonical source of accounts/balances/transactions/budget/cash-flow/credit/goals; product modules read it via contracts and never re-aggregate or recompute utilization (SC-S-001). |
| II | Canada-First & Bilingual | Canadian institutions; CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — Canada-first institutions/categories; CAD throughout via `MoneyCents` with time-to-goal context; merchant/category strings bilingual; en-CA `$1,234.56` / fr-CA `1 234,56 $` via `@finos/format` (SC-S-010); residency in a Canadian region (SC-S-011). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation, incl. Canadian/bilingual/multi-module edge cases? | **PASS** — money golden fixtures, dedup, freshness/withhold + documented-default branches, idempotency replays, IDOR/authZ, and consumer+provider contract tests are all authored first and must fail before implementation (tasks Phase 2+; quickstart). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Integer minor units / arbitrary-precision decimal, unit-tested half-up rounding, deterministic, idempotent, recommend-only? | **PASS** — all amounts integer CAD cents, all rates/utilization arbitrary-precision decimal strings, no float anywhere (ESLint + DB schema-lint gate); half-up once at the cent with golden fixtures; dedup excludes duplicate/suspected rows from sums; every write idempotent on `source_event_id` (UNIQUE); no money-movement endpoint (SC-S-002, recommend-only). |
| V | Security & Least Privilege | Encryption in transit/at rest; tokens never plaintext/logged/committed and rotatable; cross-user authZ; threat model present? | **PASS** — TLS + KMS-at-rest; aggregation tokens **only** in the KMS secrets store (never a DB column/contract/log), per-member, rotatable (SC-S-004); least-privilege `consent_scopes`; cross-user authZ server-side on session identity + RLS; mandatory threat model in the spec enumerating token exfiltration, account takeover/credential stuffing, and IDOR with mitigations. |
| VI | Explainable & Auditable | Inputs+reasoning surfaced; immutable append-only audit trail; withhold-or-documented-default on missing inputs? | **PASS** — degradation/freshness signals carry inputs + bilingual `Reasoning`; connection/consent/revocation/state-change events in the append-only `audit.event_log` (separate from debug logs); missing/stale **money** inputs withhold; the documented healthy-band default is applied **only by consumers** when `CreditState` is **entirely absent** (the spine never fabricates utilization) — the single non-money guardrail exception (v2.2.0). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts; consumer+provider tests; semver + migration on breaking change? | **PASS** — all 11 published contracts are versioned JSON-Schema with `$id: finos:<area>/<Name>/<semver>`; consumer + provider Pact tests in CI (SC-S-008); breaking change = major bump + migration plan + deprecation window; version skew disables the dependent consumer rather than serving a mismatched schema (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps on external values; stale flagged/withheld; ingestion resilience (timeouts/retries/circuit-breakers)? | **PASS** — every externally-sourced object carries `FreshnessStamp`; stale **money** withholds (no runway on a multi-day-old balance), stale secondary flags; ingestion has mandatory timeouts/retries/rate-limits/circuit-breakers and retains last-known-marked-stale on failure without corrupting the spine (SC-S-003, SC-S-009). |
| IX | Simplicity & YAGNI | Complexity justified; MVP scope; no premature abstraction? | **PASS** — modular monolith (one bounded context), deterministic rules-first normalization/dedup/forecast (no opaque ML for MVP), one aggregation adapter behind the port; Goals deferred to P2; statement-import behind the existing `ingestion_mode` enum as a fast-follow. |
| QS | Quality Standards | Logging redaction; PIPEDA/Law 25; retention/deletion; residency; ≤300 ms; WCAG 2.1 AA bilingual SR labels; advice framing? | **PASS** — structured logs redact PII + monetary values, audit kept separate (FR-X-014); PIPEDA + Law 25 export/delete with a 7-day crypto-shred cascade incl. provider token revocation (FR-X-013) and dormant-account auto-anonymization (FR-X-019); Canadian-region residency with a subprocessor-register go-live gate (FR-X-020); ≤ 300 ms Home/Spine tab; WCAG 2.1 AA with bilingual screen-reader labels; informational-decision-support framing (not regulated advice). |

**Threat model (Principle V)** — **REQUIRED and mandatory** here: Module 0 owns the aggregation-token lifecycle and the cross-user/household boundary. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--module-0-is-the-broadest-credential--aggregation-token--cross-user-surface-in-the-product). It enumerates (1) aggregation-token exfiltration, (2) account takeover / credential stuffing, and (3) IDOR / horizontal privilege escalation on household boundaries — each with a server-side-enforced mitigation — plus token lifecycle (KMS isolation, per-member grants, rotation triggers, partial revocation) and the FR-X-017 step-up-MFA gates (token issue/re-auth, household-role change, export/deletion).

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and the 11 contracts preserve money-exactness (integer cents / decimal strings, no float), per-value freshness with withhold-on-stale-money, token isolation (the token is a field on **no** entity or contract), server-side cross-user authZ, append-only audit, and recommend-only; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/003-module-0-spine/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output — 11 provided schemas + consumed (external) README
│   ├── provided/        # account-state, transaction-stream, merchant-graph, budget-state,
│   │                    #   cash-flow-forecast, credit-state, goal-state, connection-consent,
│   │                    #   + shared: freshness-stamp, reasoning, money-cents (JSON Schema 2020-12)
│   └── consumed/        # external feeds only (no product-module contracts) — README
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/spine/                       # SpineModule — Module 0 bounded context (NestJS)
    ├── domain/               # AccountState, Transaction, MerchantGraph node, BudgetState,
    │                         #   CashFlowForecast, CreditState, GoalState, ConnectionConsent
    ├── money/                # re-exports @finos/money (integer cents + decimal-string rates, half-up once); no float
    ├── freshness/            # FreshnessStamp + isStale; withhold-on-stale-money policy
    ├── aggregation/          # SpineAggregationPort (interface) + plaid.adapter.ts (swappable; maps feeds → contracts)
    ├── ingestion/            # idempotent sync (source_event_id UNIQUE), workers, timeouts/retries/circuit-breakers
    ├── normalization/        # descriptor cleanup, merchant resolution, categorization, FX→CAD, dedup pipeline
    ├── services/             # budget, cash-flow forecast, credit/utilization-bands, goals, degradation/freshness signal
    ├── secrets/              # KMS-backed token custody (issue/rotate/revoke); token NEVER in DB/contract/log
    ├── security/             # session-identity authZ guard + MemberScope policy + RLS wiring; MFA step-up gates
    ├── audit/                # append-only audit.event_log writer (separate from debug logs)
    ├── consent/              # connection/consent flow, ConnectionConsent lifecycle, partial revocation, deletion cascade
    ├── contracts/
    │   ├── consumed/         # external-feed adapters only (aggregation provider, bureau, FX) — never product-module state
    │   └── provided/         # the 11 published contracts (registry + semver loader + *ContractProvider)
    └── api/                  # recommend-only spine read endpoints + consent/onboarding endpoints (NO money-movement)
backend/tests/
├── contract/                # consumer + provider Pact tests for all 11 published contracts
├── integration/             # per user story (US1..US7) against Testcontainers Postgres
├── security/                # API-layer IDOR/authZ, RLS policy, token-isolation, MFA-gate tests
└── unit/                    # money golden fixtures, dedup, freshness/withhold, documented-default, idempotency, locale

packages/                                    # platform-canonical contract packages (published from the spine)
├── contract-common/         # FreshnessStamp, Reasoning, MoneyCents (the shared value objects)
└── contract-spine/          # the 8 spine contracts + generated TS types + typed clients

mobile/
└── src/features/spine/
    ├── onboarding/           # US1 — welcome (EN/FR first), "why we need this" explainer, Plaid Link, skeleton loading
    ├── home/                 # Home/Spine tab — aggregate position, runway, top per-module recommendation
    ├── accounts/             # US1 — connected accounts, connection-repair (reauth, MFA-gated), six states
    ├── consent/              # consent scopes, revocation/deletion (MFA-gated), partial-revocation messaging
    ├── household/            # US1 — profile switcher within MemberScope, "Viewing {Name}'s finances" banner
    └── goals/                # US6 — goal definition, time-to-goal context
mobile/tests/                # component + locale/bilingual + WCAG a11y tests (all six data-view states)
```

**Structure Decision**: Web/mobile split on the ratified modular monolith. Module 0 is the `SpineModule` bounded context under `backend/src/modules/spine/` plus a mobile feature module under `mobile/src/features/spine/` organized by user story. Two intra-module distinctions are load-bearing for the constitution: (1) `secrets/` (KMS token custody) is **physically separate** from `domain/` and from the `spine` Postgres schema — the aggregation token is a field on no entity, contract, or log (Principle V / FR-CORE-007); and (2) `contracts/consumed/` adapts **external feeds only** — the spine never reads product-module state, so there are no circular dependencies (Principle VII). The three shared value objects and the eight spine contracts are published as platform-canonical packages (`packages/contract-common`, `packages/contract-spine`) that every other module `$ref`s — Module 1's contracts already reference `finos:common/FreshnessStamp/1.0.0`. The concrete repository-root layout is the one ratified in [platform-decisions.md](../_platform/platform-decisions.md); this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. The two genuine sources of additional surface area (a dedicated KMS secrets store separate from the app DB, and Postgres RLS as defense-in-depth on top of service-layer authZ) are **not** YAGNI violations: both are direct, ratified requirements of Principle V / FR-CORE-007 for the product's broadest credential surface, where co-locating tokens with user data or relying on app-layer authZ alone is the catastrophic-leak / IDOR path the constitution forbids. No complexity deviations to justify.

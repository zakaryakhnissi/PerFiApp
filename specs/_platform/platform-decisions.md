# FinOS Platform Decisions (Ratified)

**Status**: Ratified · **Version**: 1.0.0 · **Date**: 2026-06-29
**Owner**: Architect / Tech Lead · **Approved against**: Constitution v2.2.0, umbrella spec `specs/001-finos-platform/spec.md`
**Audience**: every module plan (`specs/00X-module-*/plan.md`) references this document as the authority for platform-level stack, conventions, and CI gates. Items the Module 1 Rewards plan flagged as `[PLATFORM — ratify in Module 0 plan]` are ratified here.

---

## 1. Executive Summary

FinOS is built as a **single-language (TypeScript) modular monolith**: a React Native (Expo) mobile client and a NestJS (Node 20 LTS) backend deployed as one process, with **one NestJS module = one bounded context per spec module (0–15)**. Boundaries are real, not aspirational, because they are enforced at three layers — semver'd JSON-Schema contract packages (`finos:<module>/<Name>/<semver>`, matching the existing `finos:rewards/BestCardRecommendation/1.0.0`), lint-banned cross-module imports, and per-schema PostgreSQL roles plus row-level security. All money is **integer minor units (`BIGINT` cents) for amounts and arbitrary-precision `decimal.js` (string-encoded on the wire) for rates** through a single shared `@finos/money` package, rounded **half-up exactly once** at the cent boundary — never binary float. Data lives in **PostgreSQL 16 in a Canadian region (AWS `ca-central-1` Montréal, `ca-west-1` Calgary DR)**, with an **append-only event/audit store** as the immutable source of truth and rebuildable per-module read-model projections, each carrying a **`FreshnessStamp`**. Aggregation is **Plaid (Canada)** sitting entirely behind Module 0's `SpineAggregationPort` so it is swappable; aggregation tokens live in a dedicated **KMS-backed secrets store, never beside user data**. Security is server-side authZ on every cross-user boundary (identity from the validated session, never a client-supplied id), mandatory step-up MFA for the three high-risk action classes, and Canadian residency with disclosed, agreement-backed cross-border subprocessors under PIPEDA + Québec Law 25. This synthesis takes `ts-unified` as the base (one language → bit-identical money/format math on client and server, and zero rework for the already-built Module 1), grafts the **event-sourced append-only audit + crypto-shred deletion** and compile-time-branch rigor from the correctness-first proposal, and grafts **Postgres RLS** as defense-in-depth from the pragmatic-MVP proposal — while explicitly rejecting that proposal's co-located token vault.

---

## 2. Ratified Stack

| Layer | Ratified choice | Key constitutional driver |
|---|---|---|
| **Mobile** | React Native via **Expo** (managed workflow, EAS Build/Submit/Update, RN New Architecture / Hermes). State: **TanStack Query** (surfaces spine `FreshnessStamp.is_stale` per query) + **Zustand** for ephemeral UI. Nav: **expo-router** (one route group per module tab). | II, VIII, FR-X-015 |
| **Backend** | **NestJS 10** modular monolith on **Node 20 LTS**, TypeScript 5.x, **Fastify** adapter. One NestJS module per bounded context (`SpineModule` = Module 0, `RewardsModule`, …, `SocialModule`). Single deployable. **Recommend-only** API surface (propose / confirm-and-record only — no money-movement endpoints). | VII, IX, IV, FR-X-003 |
| **Datastore + region** | **PostgreSQL 16**, **AWS `ca-central-1` (Montréal)** primary, **`ca-west-1` (Calgary)** DR. Single physical DB, **one schema per bounded context** (`spine`, `rewards`, `credit`, … `social`, `audit`) with per-module DB roles + **RLS** on every user/household-scoped table. ORM: **Prisma** (drop to raw SQL/Drizzle for heavy spine forecast queries). Redis (Canadian region) for queues/rate-limits/cache — no raw financial PII beyond short-lived job payloads. | V, VII, FR-X-020, SC-017 |
| **Money representation** | `@finos/money`: **`Cents = bigint`** (integer minor units, CAD) for amounts; **`decimal.js`** (arbitrary precision, **string-encoded on the wire**, `pattern ^[0-9]+(\.[0-9]+)?$`) for rates/FX/multipliers. Single `roundHalfUpToCents(decimal): bigint`, applied **once** at the final cent. DB money columns are `BIGINT` (`*_cents`) or `NUMERIC` — **never** `float`/`double`/`real`. | IV (NON-NEGOTIABLE), FR-X-002 |
| **Auth / MFA** | Passkey/**WebAuthn-first (FIDO2)** primary; password + TOTP fallback. Short-lived access JWT (15 min) + rotating refresh token (refresh stored only in mobile **SecureStore**; server keeps a revocable session record). Global NestJS guard; authZ from validated **session identity, never a client-supplied `profileId`/`memberId`**. Policy engine (CASL/small RBAC-ABAC) for household `MemberScope`. **Step-up MFA mandatory** for: (a) issuing/re-authorizing aggregation tokens, (b) changing household roles/scopes, (c) data export/deletion. | V, FR-X-017, FR-HH-001 |
| **Aggregation** | **Plaid (Canada)** v1, accessed **only** via Module 0 `SpineAggregationPort`. One adapter (`spine/aggregation/plaid.adapter.ts`) maps account+balance → `AccountState`, transactions → `TransactionStream`, liabilities → `CreditState`, identity → member verification, each stamped with `FreshnessStamp`. Swap = new adapter, zero consumer change. Per-member independent consent grant + token. | FR-CORE-006, FR-CORE-007 |
| **Secrets / KMS** | Aggregation tokens + OAuth secrets in a **dedicated KMS-backed secrets store** (AWS Secrets Manager / KMS CMK, Canadian region) — **never** an application DB column beside user data, never in logs. Per-member tokens, rotated on session-invalidation / suspected compromise / role demotion / max-age. Encryption at rest (KMS CMK) + TLS in transit everywhere. **Per-subject field-level encryption keys** enable crypto-shred deletion. | V, FR-X-009, FR-CORE-007 |
| **Audit** | **Append-only event store** `audit.event_log` (INSERT-only DB grant; no UPDATE/DELETE; optional `prev_hash` tamper-evidence chain), **strictly separate from debug logs**. Source of truth for every confirmed action + every financial-state change. Per-module read-model projections are rebuildable by replay. Idempotent writes keyed on `source_event_id` (`UNIQUE`). Every recommendation carries `Reasoning { inputs, rationale_en, rationale_fr }`. | VI, FR-X-007 |
| **i18n / locale** | **i18next + react-i18next** (mobile) and shared message catalogs; **all** user-facing strings are keys (lint bans literals in JSX/business logic → missing translation fails CI). Formatting via **`Intl.NumberFormat`/`Intl.DateTimeFormat`** (Hermes Intl) in one `@finos/format` package: fr-CA → `1 234,56 $`, en-CA → `$1,234.56`, from the same `Cents`. | II, FR-X-005, SC-008 |
| **Hosting** | Containerized NestJS on a **Canadian-region** managed host (`ca-central-1`); RDS/Aurora Postgres + Redis + S3 (`ca-central-1`, receipts/docs) + KMS all Canadian-region. **BullMQ** (Redis) workers for ingestion (aggregation sync, FX, credit, deals, email parse) with mandatory timeouts/retries/rate-limits/circuit-breakers. Observability self-hosted or Canadian-region with PII+money redaction at the SDK boundary. | FR-X-020, FR-X-012, FR-X-014, SC-017 |

---

## 3. Architecture

### Modular monolith, one bounded context per module
One repository, one deployable, in-process contract calls, one CI. This is the **constitutionally-preferred default** (Principle VII: "NOT microservices unless justified") and the YAGNI-correct choice (IX) for an early-stage product with no committed code. Each spec module (0–15) is exactly one NestJS module / bounded context. A hot module remains extractable later **with zero consumer changes** because the boundary is already a versioned contract.

### Versioned contract packages
Cross-module data flows **only** through semver'd JSON-Schema contracts, never shared mutable state (Principle VII, FR-X-011). The monorepo (pnpm workspaces + Turborepo) holds one internally-published package per contract, each containing:
- the **JSON-Schema** (source of truth, `$id: finos:<module>/<Name>/<semver>` — e.g. `finos:rewards/BestCardRecommendation/1.0.0`, `finos:spine/AccountState/1.0.0`),
- **generated TypeScript types** (wire shape and code type cannot drift — they are generated from the schema), and
- a typed **client interface** consumed under `contracts/consumed/`; providers expose only a `*ContractProvider` under `contracts/provided/`.

Module 0 publishes the canonical shared value objects every module reuses: **`finos:common/FreshnessStamp/1.0.0`**, `finos:common/Reasoning/1.0.0`, `finos:common/MoneyCents/1.0.0`. Breaking change = major bump + migration plan + deprecation window (FR-X-011). On version skew, the dependent recommendation is **disabled**, not served on a mismatched schema (umbrella edge case, SC-012).

### Three-layer boundary enforcement
1. **Contract/package layer** — `@finos/contract-*` packages; semver in `$id`.
2. **Code layer** — ESLint `no-restricted-imports` / dependency-cruiser: a direct cross-module service/repo import **fails CI**. A module may import only its own code + shared contract/`@finos/money`/`@finos/format` packages.
3. **Data layer** — per-schema Postgres roles block cross-module SQL; product modules read spine data **via contract clients only**, never cross-schema `SELECT`.

### Spine isolation & swappable aggregation
The **spine (Module 0) is the single canonical source** of balances, budget, cash-flow, credit, and goals (umbrella "single canonical spine"). The spine **never reads product-module state** — no circular dependencies. Product modules own only their derived state. Plaid sits behind `SpineAggregationPort`; the rest of FinOS depends on `AccountState` / `TransactionStream` / `CreditState` / `GoalState` contracts, **never on Plaid types**. Cash Safety's `SafeToActSignal` has **documented precedence** when modules conflict (umbrella edge case).

---

## 4. Data Conventions

- **Money**: amounts are `BIGINT` integer minor units (`*_cents`, CAD); rates/FX/multipliers are `NUMERIC` at rest and **decimal strings on the wire** (`^[0-9]+(\.[0-9]+)?$`) to defeat JSON float coercion. **No `float`/`double`/`real` in any money path** — enforced by ESLint rule + a DB schema-lint / CHECK gate. Compute in full precision, **round half-up to cents exactly once** at the storage/display boundary via `roundHalfUpToCents`. Golden fixtures are mandatory (e.g. `500000 pts × 1.05 cpp = 525000 cents = $5 250,00`; per-path FX). (Principle IV, FR-X-002, FR-REW-001, FR-TRV-001.)
- **Time**: store all timestamps in **UTC** (`timestamptz`); format to the user's locale/timezone at the edge via `@finos/format`. fr-CA and en-CA date/number conventions are render-time, never stored.
- **Freshness**: every externally-sourced value carries `FreshnessStamp { source, observed_at, staleness_threshold_seconds, is_stale }` (`finos:common/FreshnessStamp/1.0.0`). Stale **money** inputs **withhold**; stale secondary values may be flagged. Fresh-or-Flagged is a column-level invariant on projection tables (`source`, `observed_at`, `staleness_threshold`). (Principle VIII, FR-X-008.)
- **Documented-default exception (v2.2.0)**: a single missing **secondary guardrail** input may use a *named, spec-documented* default (e.g. absent `CreditState` → `utilization_source = assumed_healthy_default`, healthy band) — never a missing **money** input, which always withholds. Encoded in contracts exactly as Rewards does (`utilization_source` enum). (Principle VI.)
- **Idempotency**: any state FinOS writes on the user's behalf (roundups, schedules, goal progress) is keyed on `source_event_id` with a `UNIQUE` constraint — replays never double-apply. (Principle IV, FR-X-003.)
- **Recommend-only**: no endpoint moves money; every money action returns a proposal the user executes externally. (FR-X-003, SC-007.)

---

## 5. Security & Residency

- **Token isolation/rotation (FR-CORE-007)**: aggregation tokens live **only** backend-side in a KMS-backed secrets store — never in the app, never in a DB column beside user data, never in logs. **Each household member holds an independent consent grant + token under their own identity**, enabling **partial revocation** when a member leaves without disrupting others. Rotation on session invalidation, suspected compromise, role/privilege demotion, and a max-age schedule.
- **Server-side authZ on every cross-user boundary (FR-HH-001)**: acting identity is derived from the validated session, **never** a client-supplied `profileId`/`memberId`; UI filtering alone is non-compliant. Enforced in two layers — a service-layer policy engine (`MemberScope` checks) **and** Postgres **RLS** keyed on `auth.uid()` + household membership (defense-in-depth; product modules must never bypass RLS with a service-role key for user-scoped reads). Denied cross-user access is **audited** (SC-015). `CircleProgress` is a server-computed projection only — never raw amounts/identifiers (FR-SOC-001).
- **MFA gates (FR-X-017)**: step-up MFA mandatory and password-only rejected for: issuing/re-authorizing aggregation tokens, changing household roles/scopes, data export/deletion. A skeleton auth threat model (account-takeover/credential-stuffing, token theft, IDOR/horizontal escalation) ships in the Module 0 spec **before** implementation.
- **Residency (FR-X-020, SC-017)**: all Canadian users' financial data + PII stored and processed in a Canadian region — Postgres, Redis, object storage, KMS, queues, logs. Every subprocessor (Plaid, credit bureau, FX feed, email/LLM parser, push, error-tracking) must satisfy Canadian residency **or** have any cross-border transfer explicitly disclosed in-app and covered by a PIPEDA accountability/transfer agreement before go-live. A **subprocessor register is a go-live gate**.
- **PIPEDA + Québec Law 25**: data export + deletion for every user; verified deletion within **7 days** (FR-X-013) cascading across spine + all module schemas + object storage + Plaid token revocation, implemented via **crypto-shred of per-subject field-level keys** + tombstone events (preserves the append-only log while rendering PII unrecoverable). Email-sourced enrichment is purged within the same window **regardless of which module's store now holds it**. Dormant-account auto-anonymization (FR-X-019) uses the same key-shred mechanism; inactivity window set in the planning-phase PIA. Logs redact PII + monetary values; audit trail kept separate (FR-X-014). FinOS is informational decision support only — not regulated advice.

---

## 6. Testing & CI Gates

**TDD is NON-NEGOTIABLE (Principle III)**: tests authored → fail → implement, Red-Green-Refactor.

Test layers:
1. **Unit** — mandatory money **golden fixtures** (cent-slippage, half-up, FX/points incl. Canadian tax/fee/interest edges), utilization-band logic (<10 optimal / <30 healthy / 30–50 warn / >50 hard-avoid), freshness/withhold + documented-default branches, idempotency replays, locale formatting (en-CA `$1,234.56` vs fr-CA `1 234,56 $`).
2. **Contract** — **Pact** consumer + provider tests for **every** cross-module contract; a breaking schema change fails the build (Principle VII, FR-X-011, SC-012).
3. **Integration** — per user story against a **Testcontainers** Postgres.
4. **Mobile** — React Native Testing Library (component + bilingual/locale + WCAG a11y assertions); Detox/Maestro for the SC-014 onboarding e2e (connect → Points Wallet + runway + one recommendation in 10 min).
5. **Security** — authZ/IDOR tests exercised at the **API layer** (not UI) proving 0 cross-user exposure + audited denials (SC-015); RLS policy tests; secret-scanning (gitleaks); dependency/SAST scanning.

**CI gates that block merge**:
- money golden fixtures pass; **no `float`/`double` money type** (lint + DB schema-lint);
- both sides of **every** changed contract pass (Pact);
- **no missing EN/FR translation key** (SC-008);
- **no banned cross-module import** (dependency-cruiser / ESLint boundary);
- **log-redaction present** on all ingestion/sync/recommendation paths;
- **threat-model link present** on any PR touching credentials / tokens / cross-user data;
- **WCAG 2.1 AA** a11y assertions pass (SC-011);
- **≤ 300 ms** cold-start / module-switch perf smoke on a mid-range device profile (FR-X-015, SC-010).

---

## 7. Decisions Log

| # | Decision | Rationale | Rejected alternatives |
|---|---|---|---|
| D1 | **TypeScript everywhere** (RN/Expo + NestJS) | One language → one `@finos/money` + `@finos/format` shared by client and server (bit-identical math + fr-CA formatting), JSON-Schema generates types consumed identically on both ends, fewest seams to get money/locale wrong; **zero rework for the already-built Module 1**, which provisionally recommended this exact stack. | Kotlin/JVM backend (strongest stdlib `BigDecimal` + sum-type exhaustiveness) — bought back in TS with `bigint`/`decimal.js` + lint/DB gates + mandatory fixtures; rejected to avoid a polyglot tax on the contract/money-sharing path. Go backend — no native decimal or sum types, pushes Principle IV/VI/VIII guarantees to test-time. Flutter client — small sharing benefit since money is server-side; rejected to keep one language. |
| D2 | **Modular monolith**, one bounded context per module | Constitutionally preferred (VII) and YAGNI (IX): hard, contract-tested, semver'd boundaries with no inter-module network/partial-failure surface; extractable later behind existing contracts. | Microservices — premature distributed complexity; rejected unless a module's scale/blast-radius later justifies extraction. |
| D3 | **Single Postgres, schema-per-module + per-schema roles + RLS** | One residency-compliant managed DB; per-schema roles + RLS make "no shared mutable state" real at the DB grant level and give IDOR-resistant server-side authZ (SC-015). | DB-per-module — deferred (YAGNI) until scale/blast-radius justifies. App-layer-only authZ — insufficient for SC-015; RLS added as defense-in-depth. |
| D4 | **Integer cents + decimal-string rates** via single `@finos/money` | Matches ratified Rewards contracts; keeps wire JSON float-safe; one rounding policy (half-up, once). | Single decimal everywhere — heavier wire, diverges from gold standard. Float money — banned by Principle IV (un-waivable). |
| D5 | **Append-only event store as audit source of truth** + rebuildable projections | An insert-only log **is** the immutable audit trail (VI/FR-X-007); projections give per-row freshness; idempotent writes key on `source_event_id`; enables crypto-shred deletion without mutating the log. | Plain CRUD + bolted-on audit table — mutable by construction, harder to prove append-only. |
| D6 | **Crypto-shred deletion** (per-subject field-level keys + tombstones) | Honors PIPEDA/Law 25 7-day erasure (FR-X-013) and dormant anonymization (FR-X-019) while preserving the append-only log. | Physical row deletion from an append-only log — contradicts immutability; rejected. |
| D7 | **Plaid (Canada) behind `SpineAggregationPort`** | Decided in project memory; isolation behind Module 0 contracts keeps it swappable (FR-CORE-006) and ready for Canada's open-banking standard via a new adapter. | Direct Plaid types in consumers — couples 16 modules to a vendor; rejected. |
| D8 | **Tokens in KMS-backed secrets store, not a DB column** | An aggregator concentrates a user's whole financial life (Principle V); co-locating tokens with user data is the catastrophic-leak path. Explicitly rejects the pragmatic-MVP's Supabase-Vault co-location while keeping its RLS idea. | Supabase Vault / pgsodium beside user data — convenient but co-located; rejected for token storage. |
| D9 | **Expo managed workflow** | Fastest path to TestFlight/Play + OTA bilingual-string fixes; Plaid Link + SecureStore are well-supported; bare-eject remains an escape hatch. | Bare RN — taken only if a native module forces it. |
| D10 | **Passkey-first + JWT access / rotating refresh + step-up MFA** | Balances statelessness with the revocation the security model demands; satisfies FR-X-017 high-risk gates. | Password-only — out of bounds for high-risk actions (FR-X-017). Server-sessions-only — chosen hybrid keeps revocability. |

### NEEDS-RATIFICATION (documented, non-blocking)

These are open inputs to be resolved in the relevant module plan / PIA; none blocks platform ratification.

- **NR-1 (Plaid Canada residency posture)**: confirm Plaid processes/stores Canadian data in-region and is covered by a PIPEDA cross-border accountability agreement before go-live; if any processing is out-of-region it must be disclosed + agreement-backed, else blocked (FR-X-020, SC-017). Owner: Module 0 plan + subprocessor register.
- **NR-2 (Staleness windows & runway buffers)**: concrete `staleness_threshold_seconds` defaults per data class (balances, FX, credit, deals, valuations) and runway buffers — Canada-oriented defaults, user-adjustable (umbrella Assumptions; Module 0 plan).
- **NR-3 (Dormant-account inactivity window)**: exact duration for FR-X-019 auto-anonymization — set in the planning-phase Privacy Impact Assessment.
- **NR-4 (Credit-bureau + FX + card-knowledgebase + offer feed vendors)**: concrete Canadian sources and their residency posture (Modules 0/1/2/11 plans; each enters the subprocessor register).
- **NR-5 (ORM escape hatch)**: Prisma is the default; the few heavy spine queries (cash-flow forecasting) may drop to raw SQL or Drizzle — confirmed per-query in the Module 0 plan, not a platform-wide flip.
- **NR-6 (Email/LLM parsing subprocessor)**: Inbox/Travel/Free-Trial parsing provider must be Canadian-region or disclosed+agreement-backed, and retain only sender identity + classifications, never raw bodies (FR-X-013); selected in the Inbox/Travel plans.
- **NR-7 (Perf budget on real devices)**: the ≤300 ms budget (FR-X-015) must be profiled on real mid-range Canadian devices, not only emulators; gate calibrated in Module 0.

---
description: "Task list for Module 0 — Financial Core & Data Spine"
---

# Tasks: Module 0 — Financial Core & Data Spine

**Input**: Design documents from `/specs/003-module-0-spine/`

**Prerequisites**: plan.md, spec.md (US1–US7), research.md, data-model.md, contracts/ (11 provided schemas)

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation. Module 0 is the broadest credential/aggregation-token surface in the product, so token-isolation, MFA-gate, IDOR, freshness, idempotency, audit, and redaction tests are mandatory (FR-CORE-007, FR-X-017, threat model).

**Stack** (ratified — [platform-decisions.md](../_platform/platform-decisions.md), [plan.md](./plan.md)): TypeScript/Node 20 NestJS backend + React Native (Expo) mobile; `@finos/money` (integer cents + `decimal.js` decimal-string rates, half-up once) and `@finos/format`; Prisma (raw SQL/Drizzle escape hatch only for the forecast query); Plaid (Canada) behind `SpineAggregationPort`; KMS-backed secrets store; append-only `audit.event_log`; Postgres RLS; Pact for contract tests; Jest + Testcontainers. Paths below assume the plan's layout.

**Organization**: Tasks grouped by user story in priority order (P1: US1, US2, US3, US4, US5, US7 → P2: US6). US1, US2, US3, US7 are MVP-critical for the spine spine-up; US6 (Goals) is P2.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US7 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create spine module structure per plan: `backend/src/modules/spine/{domain,money,freshness,aggregation,ingestion,normalization,services,secrets,security,audit,consent,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,security,unit}`, `packages/{contract-common,contract-spine}`, `mobile/src/features/spine/{onboarding,home,accounts,consent,household,goals}`, `mobile/tests/`
- [ ] T002 Initialize TypeScript/NestJS project + dependencies (`@finos/money`, `@finos/format`, `decimal.js`, Prisma, Pact, Jest, Testcontainers, BullMQ) in `backend/package.json` and Expo deps in `mobile/package.json`
- [ ] T003 [P] Configure lint/format with **no-float-money** ESLint rule + banned-cross-module-import rule (dependency-cruiser) in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest + money golden-fixture harness + Testcontainers Postgres in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests of all 11 published contracts in `backend/pact.config.ts`
- [ ] T006 [P] Configure DB schema-lint / CHECK gate rejecting `float`/`double`/`real` on any money column in `backend/db/schema-lint.config.ts` (Principle IV)

**Checkpoint**: Project builds; test runner green on an empty suite; float-money lint + schema-lint wired.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. These implement the constitutional backbone every spine entity depends on.

- [ ] T007 Implement/re-export `@finos/money` helpers (integer-cents CAD, arbitrary-precision decimal-string rates, **half-up once at the cent**, FX conversion, no float) in `backend/src/modules/spine/money/money.ts` (Principle IV)
- [ ] T008 [P] Publish the shared value objects `FreshnessStamp` / `Reasoning` / `MoneyCents` from `contracts/provided/{freshness-stamp,reasoning,money-cents}.schema.json` into `packages/contract-common/` with generated TS types (Principle VII; reused by ALL modules)
- [ ] T009 [P] Implement `FreshnessStamp` value object + `isStale` derivation + **withhold-on-stale-money** policy in `backend/src/modules/spine/freshness/freshness.ts` (Principle VIII / FR-X-008)
- [ ] T010 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) for the degradation/freshness signal in `backend/src/modules/spine/domain/reasoning.ts` (Principle VI)
- [ ] T011 [P] Implement append-only, immutable `audit.event_log` writer (INSERT-only grant, optional `prev_hash` chain, idempotent on `source_event_id` UNIQUE), kept separate from debug logs, in `backend/src/modules/spine/audit/audit.ts` (Principle VI / FR-X-007)
- [ ] T012 [P] Implement structured logging with PII + monetary-value + **token** redaction on all ingestion/sync paths in `backend/src/modules/spine/services/logging.ts` (Principle V / FR-X-014)
- [ ] T013 [P] Implement en-CA/fr-CA locale formatter usage via `@finos/format` (monetary `1 234,56 $`, percent `12,3 %`, date) in `backend/src/modules/spine/money/locale.ts` (Principle II / FR-X-005)
- [ ] T014 Implement KMS-backed secrets store adapter for aggregation-token custody — issue/rotate/revoke keyed by `link_id`, **token never returned to a contract, written to a DB column, or logged** — in `backend/src/modules/spine/secrets/token-vault.ts` (Principle V / FR-CORE-007)
- [ ] T015 Implement server-side authZ guard + `MemberScope` policy keyed on **validated session identity (never a client-supplied id)** + Postgres RLS wiring + MFA step-up gate hooks in `backend/src/modules/spine/security/authz.ts` (Principle V / FR-X-010 / FR-X-017)
- [ ] T016 [P] Implement `SpineAggregationPort` interface + Plaid (Canada) adapter mapping feeds → `AccountState`/`TransactionStream`/`CreditState`(liabilities)/`ConnectionConsent`, each `FreshnessStamp`-stamped (swappable; no Plaid types leak) in `backend/src/modules/spine/aggregation/{port.ts,plaid.adapter.ts}` (FR-CORE-006 / research §1)
- [ ] T017 [P] Implement idempotent ingestion runtime (sync upsert keyed on `source_event_id` UNIQUE; mandatory timeouts/retries/rate-limits/circuit-breakers; retain last-known-marked-stale on failure) in `backend/src/modules/spine/ingestion/ingestion.ts` (Principle IV/VIII / FR-X-012)
- [ ] T018 [P] Implement consumed external-feed adapters (aggregation provider, credit bureau, FX) — **external feeds only, never product-module state** — in `backend/src/modules/spine/contracts/consumed/` (Principle VII; no circular deps)
- [ ] T019 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) + version-skew disable behavior in `backend/src/modules/spine/contracts/provided/registry.ts` (Principle VII / SC-012)

**Checkpoint**: Foundation ready — token isolation, freshness, audit, redaction, authZ, port, idempotent ingestion, and contract registry in place. User stories can begin.

---

## Phase 3: User Story 1 — Account Aggregation & Connection/Consent (Priority: P1) 🎯 MVP

**Goal**: A user securely links a Canadian institution; accounts/balances appear in `AccountState` with source + freshness; each member holds an independent consent grant + token; tokens live only in the KMS store; partial revocation and the 7-day deletion cascade work; token issue/re-auth and export/deletion are MFA-gated.

**Independent Test**: Run the connection/consent flow against one sandbox Canadian institution; confirm `AccountState` populates with balances + freshness, the token is in the secrets store only (never a DB column/log/contract), and revoking invalidates only that member's token and cascades to provider revocation.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T020 [P] [US1] Provider contract test for `AccountState` against `contracts/provided/account-state.schema.json` in `backend/tests/contract/account-state.provider.test.ts`
- [ ] T021 [P] [US1] Provider contract test for `ConnectionConsent` (non-secret link metadata; **token is on no field**) against `contracts/provided/connection-consent.schema.json` in `backend/tests/contract/connection-consent.provider.test.ts`
- [ ] T022 [P] [US1] Consumer contract test for the aggregation provider via `SpineAggregationPort` (Plaid sandbox) in `backend/tests/contract/aggregation-provider.consumer.test.ts`
- [ ] T023 [P] [US1] **Token-isolation security test**: scan DB rows + logs + every contract payload — 0 token-shaped values; token present only in the KMS store keyed by `link_id` (SC-S-004) in `backend/tests/security/token-isolation.test.ts` (FR-CORE-007)
- [ ] T024 [P] [US1] **Token-rotation test**: rotation fires on each **named** trigger — session invalidation (logout / password-or-passkey reset / refresh-token reuse), suspected compromise (provider-signaled, admin-initiated), privilege demotion, and max-age — asserting each signal independently (not just a happy path); old token unusable after rotation in `backend/tests/security/token-rotation.test.ts` (FR-CORE-007, threat model)
- [ ] T024a [P] [US1] **Refresh-token-reuse / session-token test**: a replayed (reused) refresh token is detected, invalidates the session, and drives suspected-compromise aggregation-token rotation (closing the loop with T024); access JWT honors the ≤15 min TTL; session/refresh tokens are server-side-revocable and never read from mobile insecure storage in `backend/tests/security/session-token.test.ts` (FR-X-017, platform D10)
- [ ] T025 [P] [US1] **MFA-gate test**: issuing/re-authorizing an aggregation token requires step-up MFA; password-only rejected (SC-S-006) in `backend/tests/security/mfa-token-issue.test.ts` (FR-X-017)
- [ ] T026 [P] [US1] **Partial-revocation test**: two members on one institution; removing A revokes only A's `link_id` (`revoked_by = household_admin_partial`, `token_destroyed = true`); B untouched (SC-S-005) in `backend/tests/integration/partial-revocation.test.ts` (FR-CORE-007)
- [ ] T027 [P] [US1] **Deletion-cascade test**: revoke/deletion revokes provider connection, destroys token, completes spine + provider cascade ≤ 7 days (SC-S-005) in `backend/tests/integration/deletion-cascade.test.ts` (FR-X-013)
- [ ] T028 [P] [US1] Connection-audit + idempotency test: `connection_created`/`consent_granted` written append-only; replayed connection webhook does not double-apply (keyed on `source_event_id`) in `backend/tests/unit/connection-idempotency-audit.test.ts` (Principle IV/VI)
- [ ] T029 [P] [US1] Institution-unavailable fallback + input-hardening test: Error state + manual / statement-import path (`ingestion_mode = manual | statement_import`); manual balance carries user-entered freshness; **user-entered amounts are range-validated** (non-negative where `balance_kind` requires, bounded magnitude, no `Number.MAX_SAFE_INTEGER`-scale value) and rejected (not clamped) before persistence; **statement parser is size/entity-bounded and sandboxed** (no external-entity resolution — XXE/zip-bomb fixtures) and imported descriptors are **output-encoded** at the rendering edge (stored-XSS fixture) in `backend/tests/integration/connection-fallback.test.ts` (Module 0 edge case; threat model #7)
- [ ] T030 [P] [US1] Integration test: connection/consent flow end-to-end → `AccountState` populated with freshness in `backend/tests/integration/connection-consent.test.ts`

### Implementation for User Story 1

- [ ] T031 [P] [US1] `Account`/`AccountState` domain (balance MoneyCents, balance_kind, ingestion_mode, status, freshness) in `backend/src/modules/spine/domain/account-state.ts`
- [ ] T032 [P] [US1] `ConnectionConsent`/`AggregationLink` domain (consent_status/scopes lifecycle, reauth, revocation, **no token field**) in `backend/src/modules/spine/domain/connection-consent.ts`
- [ ] T033 [US1] Connection/consent service (least-privilege scopes, MFA-gated issue/re-auth, per-member independent grant) in `backend/src/modules/spine/consent/connection.service.ts` (depends on T014–T016, T032)
- [ ] T034 [US1] Revocation + deletion-cascade service (partial revocation, token destroy, provider revoke, 7-day crypto-shred cascade) in `backend/src/modules/spine/consent/revocation.service.ts`
- [ ] T035 [US1] Wire `AccountState` + `ConnectionConsent` provided contracts in `backend/src/modules/spine/contracts/provided/{account-state.ts,connection-consent.ts}`
- [ ] T036 [US1] Recommend-only connection/consent + accounts API endpoints (no money-movement) in `backend/src/modules/spine/api/connection.controller.ts`
- [ ] T037 [P] [US1] Mobile onboarding flow (EN/FR choice first, "why we need this" explainer, Plaid Link, skeleton loading) in `mobile/src/features/spine/onboarding/`
- [ ] T038 [P] [US1] Mobile accounts + connection-repair screens (six states; reauth MFA-gated; last-known marked stale) in `mobile/src/features/spine/accounts/`
- [ ] T039 [P] [US1] Mobile consent + revocation/deletion screens (MFA-gated; partial-revocation messaging) in `mobile/src/features/spine/consent/`

**Checkpoint**: US1 fully functional and independently testable — the connection/consent + token-isolation MVP.

---

## Phase 4: User Story 2 — Transaction Normalization, Categorization & Dedup (Priority: P1)

**Goal**: Raw transactions normalized into canonical, categorized, **de-duplicated** records linked to merchant nodes, exposed as `TransactionStream` — duplicate/suspected rows excluded from money math.

**Independent Test**: Ingest two feeds describing the same charge; confirm they collapse into one canonical transaction (one `merged_primary`, the other excluded from sums) linked to one merchant node, with categories + freshness.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T040 [P] [US2] Provider contract test for `TransactionStream` against `contracts/provided/transaction-stream.schema.json` in `backend/tests/contract/transaction-stream.provider.test.ts`
- [ ] T041 [P] [US2] **Dedup money fixture**: two feeds, one $42.00 charge → counted **once** (`4200 cents`); `merged_duplicate` and `suspected_duplicate` excluded from sums (SC-S-002) in `backend/tests/unit/dedup.test.ts` (FR-CORE-002)
- [ ] T042 [P] [US2] **FX money fixture**: fixed foreign amount × timestamped decimal-string rate → exact CAD `cad_amount` cents, half-up at final cent, no drift; stale FX flags `cad_amount` in `backend/tests/unit/fx.test.ts` (FR-X-002)
- [ ] T043 [P] [US2] Pending/posted/reversed test: `pending` is provisional, excluded from settled-money inputs in `backend/tests/unit/transaction-status.test.ts`
- [ ] T044 [P] [US2] Category-override idempotency test: `category_source = user_override` persists, replayed override does not double-apply in `backend/tests/unit/category-override.test.ts` (FR-X-003)
- [ ] T045 [P] [US2] Integration test: ingest two overlapping feeds → one canonical `TransactionStream` in `backend/tests/integration/transaction-stream.test.ts`

### Implementation for User Story 2

- [ ] T046 [P] [US2] `Transaction`/`TransactionStream` domain (amount MoneyCents, direction, status, dedup_state, cad_amount/fx_rate, category_source, freshness) in `backend/src/modules/spine/domain/transaction-stream.ts`
- [ ] T047 [US2] Normalization pipeline (descriptor cleanup, merchant resolution hook, FX→CAD half-up, category assignment) in `backend/src/modules/spine/normalization/normalize.service.ts` (research §3/§4)
- [ ] T048 [US2] Deterministic dedup engine (match key: account + signed amount + date window + normalized descriptor; exact → primary/duplicate; ambiguous → suspected_duplicate excluded from money math; decisions recorded) in `backend/src/modules/spine/normalization/dedup.service.ts` (FR-CORE-002 / Constitution IV)
- [ ] T049 [US2] Categorization service (rules-first on resolved merchant + Canada-first map; provider fallback; user override wins, idempotent) in `backend/src/modules/spine/normalization/categorize.service.ts` (research §4)
- [ ] T050 [US2] Wire `TransactionStream` provided contract in `backend/src/modules/spine/contracts/provided/transaction-stream.ts`

**Checkpoint**: US1 + US2 both independently functional — connected accounts now yield a clean, de-duplicated transaction stream.

---

## Phase 5: User Story 3 — Merchant Graph (Priority: P1)

**Goal**: Raw descriptors resolve to canonical, **bilingual** merchant identities with provenance and an `email_sourced` flag for the deletion cascade, exposed as `MerchantGraph`.

**Independent Test**: Feed several descriptors for one brand → one `merchant_id` with canonical + EN/FR display names; an email-only node is `email_sourced` so it purges on email revocation.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T051 [P] [US3] Provider contract test for `MerchantGraph` against `contracts/provided/merchant-graph.schema.json` in `backend/tests/contract/merchant-graph.provider.test.ts`
- [ ] T052 [P] [US3] Bilingual resolution test: multiple descriptors → one `merchant_id` with `display_name_en` AND `display_name_fr` (no single-language leak) in `backend/tests/unit/merchant-bilingual.test.ts` (FR-CORE-002 / Principle II)
- [ ] T053 [P] [US3] Email-sourced purge test: `email_sourced = true` node purged within 7 days on email-access revocation, regardless of store (SC-S-005) in `backend/tests/integration/merchant-email-purge.test.ts` (FR-X-013)
- [ ] T054 [P] [US3] Unresolved-descriptor test: low-confidence descriptor leaves `merchant_id` null (never mis-attributed) in `backend/tests/unit/merchant-unresolved.test.ts`

### Implementation for User Story 3

- [ ] T055 [P] [US3] `Merchant`/`MerchantGraph` node domain (canonical_name, display_name_en/fr, aliases, parent, source, email_sourced, freshness) in `backend/src/modules/spine/domain/merchant-graph.ts`
- [ ] T056 [US3] Merchant-resolution service (descriptor → canonical node; bilingual display names; provenance; null when low-confidence) in `backend/src/modules/spine/services/merchant-resolution.service.ts`
- [ ] T057 [US3] Email-sourced purge integration into the deletion cascade (T034) in `backend/src/modules/spine/services/merchant-resolution.service.ts` (FR-X-013)
- [ ] T058 [US3] Wire `MerchantGraph` provided contract in `backend/src/modules/spine/contracts/provided/merchant-graph.ts`

**Checkpoint**: US1–US3 independently functional — transactions now key on a canonical bilingual merchant graph.

---

## Phase 6: User Story 4 — Budget & Cash-Flow Forecast (Priority: P1)

**Goal**: Derive `BudgetState` (per-category headroom) and `CashFlowForecast` (runway, lowest point, shortfall) from normalized inflows/outflows; a stale balance flags/withholds the forecast.

**Independent Test**: With normalized transactions + balances, `BudgetState` reports per-category headroom and `CashFlowForecast` reports runway days, lowest balance, and shortfall flag; a multi-day-old balance flags/withholds the forecast.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T059 [P] [US4] Provider contract tests for `BudgetState` and `CashFlowForecast` against their schemas in `backend/tests/contract/budget-forecast.provider.test.ts`
- [ ] T060 [P] [US4] **Runway money fixture**: known balance + recurring outflows → expected `runway_days`, `projected_lowest_balance`, `projected_lowest_on` (integer cents) in `backend/tests/unit/runway.test.ts` (FR-CORE-003)
- [ ] T061 [P] [US4] Budget-spent fixture: `spent` excludes `merged_duplicate`/`suspected_duplicate`/`pending` rows (no double-count) in `backend/tests/unit/budget-spent.test.ts` (SC-S-002)
- [ ] T062 [P] [US4] **Stale-balance withhold test**: balance past threshold → forecast returned flagged stale / withheld (no runway on stale money) (SC-S-003) in `backend/tests/unit/forecast-stale-withhold.test.ts` (Constitution VIII)
- [ ] T063 [P] [US4] Partial-data + method test: partial connectivity → `data_completeness = partial`; thin history → `method = recurring_only`/`insufficient_history` in `backend/tests/unit/forecast-method.test.ts`
- [ ] T064 [P] [US4] Integration test: budget + cash-flow end-to-end in `backend/tests/integration/budget-cashflow.test.ts`

### Implementation for User Story 4

- [ ] T065 [P] [US4] `BudgetState` domain (per-category budgeted/spent/headroom, completeness, freshness) in `backend/src/modules/spine/domain/budget-state.ts`
- [ ] T066 [P] [US4] `CashFlowForecast` domain (runway_days, lowest balance/date, shortfall_flag, method, points[], freshness) in `backend/src/modules/spine/domain/cash-flow-forecast.ts`
- [ ] T067 [US4] Budget service (`budgeted − spent` from posted/de-duplicated transactions; excludes duplicate/suspected/pending) in `backend/src/modules/spine/services/budget.service.ts` (FR-CORE-003)
- [ ] T068 [US4] Cash-flow forecast service (`recurring_plus_trend` → `recurring_only` → `insufficient_history`; user-adjustable safety buffer; **withhold on stale balance**; raw-SQL escape hatch per NR-5) in `backend/src/modules/spine/services/cash-flow.service.ts` (research §5)
- [ ] T069 [US4] Wire `BudgetState` + `CashFlowForecast` provided contracts in `backend/src/modules/spine/contracts/provided/{budget-state.ts,cash-flow-forecast.ts}`
- [ ] T070 [P] [US4] Mobile Home/Spine tab (aggregate position, runway indicator, six states, freshness chips) in `mobile/src/features/spine/home/`

**Checkpoint**: US1–US4 independently functional — the spine now serves the primary money inputs (budget headroom + runway) every spend recommendation reads.

---

## Phase 7: User Story 5 — Credit State Intake (Priority: P1)

**Goal**: Ingest credit data (bureau score where connected + utilization from card balances/limits) and expose `CreditState` with the **canonical utilization bands** every module reasons against — defined once.

**Independent Test**: With card balances/limits, `CreditState` reports per-card + aggregate utilization and the correct band; absence of bureau data does not block utilization; the documented healthy-band default applies only when CreditState is entirely absent (consumer-side).

### Tests for User Story 5 (write first, must FAIL)

- [ ] T071 [P] [US5] Provider contract test for `CreditState` (incl. `utilization_source` enum) against `contracts/provided/credit-state.schema.json` in `backend/tests/contract/credit-state.provider.test.ts`
- [ ] T072 [P] [US5] **Utilization-band money fixture**: balance/limit at 9.99% / 10% / 29.99% / 30% / 50% / 50.01% → `optimal`/`healthy`/`warn`/`hard_avoid` exactly against decimal-string thresholds; **plus the [0,1]-unless-over-limit invariant**: a malformed provider value (`"1.5"` from a bug, or `"30"` meant as `0.30`) that is not a true over-limit ratio is **rejected**, while a genuine over-limit card (>1.0) classifies `hard_avoid`; band thresholds asserted to be in [0,1] in `backend/tests/unit/utilization-band.test.ts` (FR-CORE-005)
- [ ] T073 [P] [US5] No-bureau test: `score` null, utilization still computed (`utilization_source = derived_from_accounts`) in `backend/tests/unit/credit-no-bureau.test.ts`
- [ ] T074 [P] [US5] **Documented-default boundary test**: spine never emits `assumed_healthy_default`; present-but-stale `CreditState` → consumer flags/withholds (default applies only to total absence) in `backend/tests/unit/credit-default-boundary.test.ts` (Constitution VI v2.2.0)
- [ ] T075 [P] [US5] Due-date-risk test: statement due within at-risk window → `due_date_risk = true` in `backend/tests/unit/credit-due-date.test.ts`
- [ ] T076 [P] [US5] Integration test: credit-state end-to-end (per-card + aggregate) in `backend/tests/integration/credit-state.test.ts`

### Implementation for User Story 5

- [ ] T077 [P] [US5] `CreditState` domain (score nullable, bands decimal-string, per-card + aggregate utilization, band derivation, due_date_risk, utilization_source, freshness) in `backend/src/modules/spine/domain/credit-state.ts`
- [ ] T078 [US5] Credit-state service (utilization from account balances/limits; bureau score when connected; canonical bands defined once; **stale flags/withholds**; spine never fabricates utilization) in `backend/src/modules/spine/services/credit-state.service.ts` (research §6)
- [ ] T079 [US5] Wire `CreditState` provided contract in `backend/src/modules/spine/contracts/provided/credit-state.ts`

**Checkpoint**: US1–US5 independently functional — the single source of utilization bands is live for Rewards/Credit/Pay.

---

## Phase 8: User Story 7 — Contract & Freshness/Degradation Layer (Priority: P1)

**Goal**: Every spine value exposed only through a versioned, freshness-stamped contract; external-source failures degrade gracefully (timeouts/retries/circuit-breakers) retaining last-known-marked-stale; version skew disables the dependent consumer rather than serving a mismatched schema.

**Independent Test**: Force a feed timeout and a contract version bump; confirm the spine retains the prior value marked stale (logs failure without corruption), and a consumer on a mismatched version has its dependent recommendation disabled by a failing contract test.

### Tests for User Story 7 (write first, must FAIL)

- [ ] T080 [P] [US7] Provider contract tests for the shared value objects `FreshnessStamp` / `Reasoning` / `MoneyCents` against their schemas in `backend/tests/contract/shared-value-objects.provider.test.ts`
- [ ] T081 [P] [US7] Graceful-degradation test: feed timeout → prior value retained marked **stale**, failure logged, spine not corrupted; circuit-breaker fires (SC-S-009) in `backend/tests/integration/degradation.test.ts` (FR-X-012)
- [ ] T082 [P] [US7] Freshness-served test: any value past threshold returned `is_stale = true` so consumers flag/withhold (SC-S-003) in `backend/tests/unit/freshness-served.test.ts` (FR-X-008)
- [ ] T083 [P] [US7] **Version-skew test**: a breaking contract change without consumer migration fails the consumer contract test and **disables** the dependent recommendation (SC-012) in `backend/tests/contract/version-skew.test.ts` (FR-X-011)

#### Consumer-side contract tests for the 11 published spine contracts (SC-S-008 — close the "consumer + provider" gate)

> Each published spine contract needs a **consumer** Pact test (representative downstream module per [contracts/README.md](./contracts/README.md)) in addition to the provider tests already enumerated (T020/T021/T040/T051/T059/T071/T080/T086). These satisfy the Principle VII / SC-S-008 "consumer AND provider for 100% of spine contracts (8 provided + 3 shared)" gate that the plan marks PASS. Written first, must FAIL.

- [ ] T083a [P] [US7] Consumer contract test — **Rewards consuming `CreditState`** against `finos:spine/CreditState/1.0.0` (utilization/bands) in `backend/tests/contract/credit-state.consumer.test.ts` (Principle VII / SC-S-008)
- [ ] T083b [P] [US7] Consumer contract test — **Rewards consuming `MerchantGraph`** (bilingual names + `owner_profile_id` scoping) in `backend/tests/contract/merchant-graph.consumer.test.ts`
- [ ] T083c [P] [US7] Consumer contract test — **Rewards/Cash-Safety consuming `BudgetState`** in `backend/tests/contract/budget-state.consumer.test.ts`
- [ ] T083d [P] [US7] Consumer contract test — **Cash Safety consuming `CashFlowForecast`** (`starting_balance` now required) in `backend/tests/contract/cash-flow-forecast.consumer.test.ts`
- [ ] T083e [P] [US7] Consumer contract test — **Cash Safety/Bills consuming `AccountState`** (`currency` required) in `backend/tests/contract/account-state.consumer.test.ts`
- [ ] T083f [P] [US7] Consumer contract test — **Cash Safety/Bills consuming `TransactionStream`** (dedup_state, cad_amount/fx) in `backend/tests/contract/transaction-stream.consumer.test.ts`
- [ ] T083g [P] [US7] Consumer contract test — **Rewards/Goals consuming `GoalState`** in `backend/tests/contract/goal-state.consumer.test.ts`
- [ ] T083h [P] [US7] Consumer contract test — **Household/Settings consuming `ConnectionConsent`** (no token field; `reauth_required_reason = login_expired` disambiguated) in `backend/tests/contract/connection-consent.consumer.test.ts`
- [ ] T083i [P] [US7] Consumer contract tests — the **3 shared value objects** (`FreshnessStamp`, `Reasoning`, `MoneyCents`) consumed by a representative module in `backend/tests/contract/shared-value-objects.consumer.test.ts` (these are the `finos:common/*` contracts every module `$ref`s)

### Implementation for User Story 7

- [ ] T084 [US7] Degradation/freshness signal service (per-value freshness gating, last-known-marked-stale retention, bilingual `Reasoning` on the withhold/flag signal) in `backend/src/modules/spine/services/degradation.service.ts` (Principle VIII / FR-X-012)
- [ ] T085 [US7] Semver enforcement + version-skew disable wiring across the 11 provided contracts in `backend/src/modules/spine/contracts/provided/registry.ts` (Principle VII / SC-012)

**Checkpoint**: US1–US5, US7 independently functional — the constitutional backbone (versioning + fresh-or-flagged) wraps every spine value.

---

## Phase 9: User Story 6 — Goals & Time-to-Goal (Priority: P2)

**Goal**: A user defines savings/debt goals; the spine computes deterministic time-to-goal, required monthly contribution, and pace status (`GoalState`), surfaced wherever a monetary value needs time-to-goal context.

**Independent Test**: Define a goal with target + date; confirm `GoalState` exposes `required_monthly_contribution`, `time_to_goal_days`, `projected_completion_date`, and a `pace_status`, readable by a downstream module.

### Tests for User Story 6 (write first, must FAIL)

- [ ] T086 [P] [US6] Provider contract test for `GoalState` against `contracts/provided/goal-state.schema.json` in `backend/tests/contract/goal-state.provider.test.ts`
- [ ] T087 [P] [US6] **Time-to-goal money fixture**: target/current/pace → expected `required_monthly_contribution` + `time_to_goal_days` with half-up rounding; **plus goal input validation**: a negative or `Number.MAX_SAFE_INTEGER`-scale `target_amount`/`current_amount` is rejected (not coerced) before persistence in `backend/tests/unit/time-to-goal.test.ts` (FR-CORE-004; Money Correctness input-validation note)
- [ ] T088 [P] [US6] Pace + no-deadline test: insufficient inputs → `pace_status = unknown` (never guessed); no deadline → `required_monthly_contribution` omitted/zero in `backend/tests/unit/goal-pace.test.ts`
- [ ] T089 [P] [US6] Integration test: goal save → `GoalState` readable by a downstream consumer in `backend/tests/integration/goal-state.test.ts`

### Implementation for User Story 6

- [ ] T090 [P] [US6] `GoalState` domain (target/current/required-contribution MoneyCents, time_to_goal_days, projected_completion_date, pace_status, status, freshness) in `backend/src/modules/spine/domain/goal-state.ts`
- [ ] T091 [US6] Goals service (deterministic required-contribution + time-to-goal half-up; pace `unknown` on insufficient inputs; idempotent goal save) in `backend/src/modules/spine/services/goals.service.ts` (FR-CORE-004)
- [ ] T092 [US6] Wire `GoalState` provided contract in `backend/src/modules/spine/contracts/provided/goal-state.ts`
- [ ] T093 [P] [US6] Mobile Goals screen (goal definition, time-to-goal context, six states) in `mobile/src/features/spine/goals/`

**Checkpoint**: All user stories independently functional.

---

## Phase 10: Polish & Cross-Cutting Concerns

- [ ] T094 [P] **API-layer IDOR / horizontal-priv-esc authorization test** (server-side, not UI) proving 0 cross-user/cross-member spine exposure across `AccountState`/`TransactionStream`/`CreditState`/`BudgetState`/`GoalState`; every denied access audited (SC-S-007) in `backend/tests/security/cross-user-authz.test.ts` (Principle V / threat model)
- [ ] T095 [P] **RLS policy test**: Postgres row-level security blocks cross-profile/cross-household reads even with a direct query; product modules cannot bypass RLS with a service-role key for user-scoped reads in `backend/tests/security/rls-policy.test.ts` (platform §5)
- [ ] T096 [P] **MFA-gate coverage test**: household-role change + data export/deletion both require step-up MFA; password-only rejected (SC-S-006) in `backend/tests/security/mfa-household-export.test.ts` (FR-X-017)
- [ ] T097 [P] Log-redaction + audit-completeness test: debug logs contain no PII/monetary value/token; all connection/consent/revocation/rotation/override/goal/access-denied events append-only (Principles V, VI) in `backend/tests/integration/redaction-audit.test.ts` (FR-X-014 / FR-X-007)
- [ ] T098 [P] Dormant-account auto-anonymization test: at the **enforced ≤24-month** inactivity ceiling → crypto-shred anonymization fires (asserts the concrete 24-month window; PIA/NR-3 may only shorten it) in `backend/tests/integration/dormant-anonymization.test.ts` (FR-X-019; constitution maximum-retention bound)
- [ ] T099 [P] Residency / subprocessor-register check: spine data + PII in a Canadian region; aggregation provider + bureau + FX disclosed + agreement-backed (go-live gate, SC-S-011) in `backend/tests/integration/residency-subprocessors.test.ts` (FR-X-020)
- [ ] T100 [P] Bilingual + locale-format verification (EN/FR; fr-CA `1 234,56 $`, `12,3 %`) + WCAG 2.1 AA bilingual screen-reader labels + all six data-view states in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016)
- [ ] T101 [P] Performance check: cached, freshness-stamped Home/Spine projection module-switch ≤ 300 ms on a mid-range device profile; cache miss/stale → flagged/withheld state, not blocking fetch (NR-7 calibration) in `mobile/tests/perf-home.test.ts` (FR-X-015 / SC-010)
- [ ] T102 Threat-model mitigation verification: confirm no money-movement endpoint exists; token isolation, per-member grants, rotation triggers, partial revocation, server-side authZ + RLS, and the three FR-X-017 MFA gates are all exercised (spec Threat Model)
- [ ] T103 Run [quickstart.md](./quickstart.md) validation end-to-end (all 7 user-story checks + the 5 mandatory money fixtures + all **11 published contracts' consumer (T083a–i) + provider (T020/T021/T040/T051/T059/T071/T080/T086) tests** + the cross-cutting gates green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, KMS token vault, authZ + RLS + MFA hooks, aggregation port, idempotent ingestion, consumed external adapters, provided-contract registry).
- **User Stories (Phases 3–9)** → all depend on Foundational; then independently testable.
  - **US1** (connection/consent + tokens) is the MVP entry point; the deletion cascade (T034) is referenced by US3's email-purge (T057).
  - **US2** (normalization/dedup) feeds **US4** (budget/forecast) and **US5** (utilization derives from accounts); US2's merchant-resolution hook is satisfied by **US3**.
  - **US3** (merchant graph) ships alongside US2 (normalization produces and consumes it).
  - **US7** (versioning + freshness layer) wraps every contract; its registry (T019) is built in Foundational and finalized in US7 (T085).
  - **US6** (Goals, P2) sequences last among stories; depends on balances/cash-flow (US4) for pace inputs.
- **Polish (Phase 10)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T013, T016, T017, T018, T019 in parallel (T007 money first; T014 token vault + T015 authZ are independent security tracks).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 (security-critical) is staffed first; US2/US3 can be staffed in parallel (US3 unblocks US2's merchant hook); US4 and US5 sequence after US2; US7 and US6 follow.
- Polish: T094–T101 all in parallel.

## Parallel Example: User Story 1

```bash
# Tests first (all [P], must FAIL):
T020 AccountState provider contract test
T021 ConnectionConsent provider contract test
T022 aggregation-provider consumer contract test
T023 token-isolation security test
T024 token-rotation test
T025 MFA-gate test
T026 partial-revocation test
T027 deletion-cascade test
# Then domain models [P]:
T031 AccountState domain
T032 ConnectionConsent domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (connect a sandbox institution; `AccountState` populated with freshness; token in the KMS store only; partial revocation + MFA gates pass) → demo.

### Incremental Delivery
US1 (connection/consent + tokens) → US2 (normalization/dedup) → US3 (merchant graph) → US4 (budget/forecast — primary money inputs) → US5 (utilization bands) → US7 (versioning + freshness backbone) → US6 (Goals, P2) → Polish. Each story adds value without breaking earlier ones. The spine reaches first-value (SC-S-012: connect → normalized balances + one runway indicator in 10 min) after US4.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: arbitrary-precision decimal + integer cents, half-up at the final cent only (Principle IV) — fixtures T041 (dedup), T042 (FX), T060 (runway), T072 (utilization band), T087 (time-to-goal) guard against slippage; no `float`/`double` on any money path (T003/T006 gates).
- **Token isolation is non-negotiable**: the aggregation token is a field on no entity/contract/log (T023 proves it; FR-CORE-007).
- **Recommend-only**: no task creates a money-movement endpoint (T102 verifies).
- Every state the spine writes is idempotent on `source_event_id` (T028/T044, the ingestion runtime T017).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

---

description: "Task list for Module 11 — Travel & Trips"
---

# Tasks: Module 11 — Travel & Trips

**Input**: Design documents from `/specs/013-module-11-travel/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [platform-decisions.md](../_platform/platform-decisions.md) via [plan.md](./plan.md)): TypeScript/Node (NestJS) backend + React Native (Expo) mobile; `@finos/money` (integer CAD cents + `decimal.js` string-on-wire rates, `roundHalfUpToCents` once) and `@finos/format` (en-CA/fr-CA); PostgreSQL 16 `ca-central-1`, `travel` schema + RLS; append-only `audit.event_log`; Pact for contract tests; Jest; BullMQ workers (timeouts/retries/rate-limits) for ingestion. Paths below assume that layout.

**Organization**: Tasks grouped by user story. All three Travel stories are P3 (umbrella priority); within P3 the delivery order is US1 (MVP itinerary) → US2 (insurance gap, builds on US1) → US3 (stats, needs trip history). Each story is independently testable.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create travel module structure per plan: `backend/src/modules/travel/{domain,money,ingest,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/travel/{trip-list,itinerary-detail,travel-stats,add-connect}`, `mobile/tests/`
- [ ] T002 Wire travel module dependencies (`@finos/money`, `@finos/format`, `decimal.js`, Pact, Jest, Prisma client for the `travel` schema, BullMQ) into the workspace `package.json`(s)
- [ ] T003 [P] Configure lint/format incl. the no-float / no-cross-module-import boundary rules for `backend/src/modules/travel/` (ESLint `no-restricted-imports` + dependency-cruiser, platform-decisions §3)
- [ ] T004 [P] Configure Jest + money-fixture test harness in `backend/jest.config.ts` (FX golden fixtures)
- [ ] T005 [P] Configure Pact consumer+provider wiring for Travel's consumed/provided contracts in `backend/pact.config.ts`
- [ ] T006 [P] Define the `travel` Postgres schema with per-schema role + **RLS** on every `profile_id`-scoped table (`Trip`, `ItineraryItem`, `TripBudget`, `TravelSpend`) in `backend/src/modules/travel/prisma/schema.prisma` (platform-decisions §3/§5)

**Checkpoint**: Project builds; test runner green on an empty suite; RLS policies in place.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Implement/verify Travel money helpers (foreign→CAD via arbitrary-precision `decimal.js` × integer cents, **half-up at the final cent once**, no float; lifetime integer-cent aggregation; cost-per-trip/day division helpers) in `backend/src/modules/travel/money/money.ts` (Principle IV — reuses `@finos/money`)
- [ ] T008 [P] Re-export `FreshnessStamp` value object + `isStale` check (source, observed_at, threshold) for Travel use in `backend/src/modules/travel/domain/freshness.ts` (Principle VIII)
- [ ] T009 [P] Re-export bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) for flag explainability in `backend/src/modules/travel/domain/reasoning.ts` (Principle VI)
- [ ] T010 [P] Implement append-only, immutable `AuditEvent` writer (trip/itinerary/manual-entry/flag events; UNIQUE on `(source_event_id, type)`), kept separate from debug logs, in `backend/src/modules/travel/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T011 [P] Implement structured logging with PII (traveler names/addresses) + monetary-value redaction in `backend/src/modules/travel/services/logging.ts` (Principle V / FR-X-014)
- [ ] T012 [P] Wire en-CA/fr-CA locale formatting via `@finos/format` (CAD `1 234,56 $`, percent, date; trip names verbatim) in `backend/src/modules/travel/services/locale.ts` (Principle II / FR-X-005)
- [ ] T013 Implement server-side cross-profile authZ guard (`profile_id` scoping from session identity, never client-supplied) + RLS enforcement for trip/itinerary/stat reads in `backend/src/modules/travel/api/authz.ts` (Principle V / FR-X-010)
- [ ] T014 [P] Implement consumed contract clients with version pinning + graceful degradation (timeouts/retries) in `backend/src/modules/travel/contracts/consumed/` (`budget-state.ts`, `goal-state.ts`, `merchant-graph.ts`, `transaction-stream.ts`, `card-lineup.ts`, `status-state.ts`, `safe-to-act.ts` feature-checked) (Principle VII / FR-X-011/012)
- [ ] T015 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json` — `TripBudget`, `TravelSpend`) in `backend/src/modules/travel/contracts/provided/registry.ts` (Principle VII)
- [ ] T016 [P] Implement shared `FxProvider` interface + adapter (timestamped decimal-string rates, `FreshnessStamp`, stale-rate flag/withhold) in `backend/src/modules/travel/ingest/fx-provider.ts` (research §1 / FR-X-008)
- [ ] T017 [P] Implement `ConfirmationParser` interface + curated/regex parser as an **untrusted-input boundary** (structured fields only; no embedded-instruction execution / link-following; out-of-range ⇒ reject to manual entry; **no raw body retained**) in `backend/src/modules/travel/ingest/confirmation-parser.ts` (research §2 / FR-X-013 / Threat Model)
- [ ] T018 Implement idempotent itinerary writer keyed on `source_event_id` (PNR+segment+date, content-hash fallback; replay = no-op, amendment = update-in-place) in `backend/src/modules/travel/ingest/itinerary-writer.ts` (Principle IV / FR-X-003 / C2)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Itinerary built from a forwarded confirmation, costed in CAD against the travel budget (Priority: P3) 🎯 MVP

**Goal**: A forwarded (or manually entered) confirmation becomes a CAD-costed, FX-aware itinerary linked to the spine travel budget, with per-figure freshness, idempotent ingestion, and partial-parse handling.

**Independent Test**: Forward a confirmation → an itinerary is built, each cost shown in CAD via a timestamped FX rate, linked to the travel budget with a remaining-headroom figure, each value carrying a freshness stamp; the FX fixtures are exact; fr-CA renders `1 234,56 $`.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T019 [P] [US1] Provider contract test for `TripBudget` against `contracts/provided/trip-budget.schema.json` in `backend/tests/contract/trip-budget.provider.test.ts`
- [ ] T020 [P] [US1] Consumer contract tests for `BudgetState`, `MerchantGraph` (+ `GoalState` for time-to-goal) in `backend/tests/contract/itinerary-consumers.test.ts`
- [ ] T021 [P] [US1] **Money fixture — per conversion path**: `USD 123456¢ × 1.3725 = CAD 169443¢ ($1,694.43)` exact, plus a second path (EUR), no drift, half-up once, in `backend/tests/unit/fx-conversion.test.ts` (FR-TRV-001 / FR-X-002 / SC-T-002)
- [ ] T022 [P] [US1] Stale-FX test: a trip cost whose FX rate is past threshold is **flagged/withheld** (not fresh) with a Refresh affordance in `backend/tests/unit/fx-staleness.test.ts` (FR-X-008 / SC-T-003)
- [ ] T023 [P] [US1] Stale/missing `BudgetState` ⇒ headroom **WITHHELD** (asks to refresh); per-item costs still render with own freshness, in `backend/tests/unit/budget-withhold.test.ts` (FR-X-001 / FR-X-008)
- [ ] T024 [P] [US1] **Idempotency**: re-forwarded duplicate (same `source_event_id`) does not duplicate/double-count; amended booking updates in place + audit event, in `backend/tests/unit/itinerary-idempotency.test.ts` (FR-X-003 / SC-T-011 / C2)
- [ ] T025 [P] [US1] Partial-parse test: unparseable segment ⇒ trip marked `partial`, recognized items shown, remainder offered for manual entry (never dropped/guessed) in `backend/tests/unit/partial-parse.test.ts` (Edge case)
- [ ] T026 [P] [US1] Manual-entry first-class test (user-entered freshness/window; same FX/cents math + provided contracts) in `backend/tests/unit/manual-entry.test.ts` (C6 / FR-REW-010-analogue)
- [ ] T027 [P] [US1] fr-CA / en-CA locale formatting test for trip CAD costs (`1 234,56 $`; trip names verbatim) in `backend/tests/unit/locale-format.test.ts` (FR-X-005 / SC-T-007)
- [ ] T028 [P] [US1] Prompt-injection test: confirmation with embedded instructions/links parsed for fields only, no execution; garbage rejected to manual entry in `backend/tests/unit/parser-untrusted-input.test.ts` (Threat Model)
- [ ] T029 [P] [US1] Integration test: forward a confirmation end-to-end (build → FX-cost → budget-link → freshness) in `backend/tests/integration/itinerary-builder.test.ts`

### Implementation for User Story 1

- [ ] T030 [P] [US1] `Trip` + `ItineraryItem` domain (source, data_completeness, original/CAD cents, fx_rate, fx_freshness, `raw_source_retained=false`) in `backend/src/modules/travel/domain/trip.ts`
- [ ] T031 [P] [US1] `TripBudget` domain (estimated_total, budgeted, headroom, currency_breakdown, freshness) in `backend/src/modules/travel/domain/trip-budget.ts`
- [ ] T032 [US1] Itinerary-builder service (parse via `ConfirmationParser` → FX-convert per item half-up once → idempotent write → partial handling) in `backend/src/modules/travel/services/itinerary-builder.ts` (depends on T016–T018, T030)
- [ ] T033 [US1] Trip-budget service (link to spine `BudgetState` travel category, compute headroom, **withhold on stale/missing budget**, over-budget flag with `Reasoning`) in `backend/src/modules/travel/services/trip-budget.ts` (depends on T031)
- [ ] T034 [US1] Manual-entry service (first-class user-entered trips/items through the same FX/cents path) in `backend/src/modules/travel/services/manual-entry.ts` (C6)
- [ ] T035 [US1] Build/read API (NO booking/payment endpoint; manual-entry + amend writes idempotent + audited) in `backend/src/modules/travel/api/trips.ts`
- [ ] T036 [US1] Wire `TripBudget` provided contract output in `backend/src/modules/travel/contracts/provided/trip-budget.ts`
- [ ] T037 [P] [US1] Mobile Trip list + Itinerary detail screens (CAD costs, per-item FX freshness chip, budget headroom / Withheld Card, Partial Data Banner; all six states) in `mobile/src/features/travel/{trip-list,itinerary-detail}/`
- [ ] T038 [P] [US1] Mobile Add/connect flow (email opt-in explainer per ux-foundations §5.4 + manual trip entry; Empty state, no zero-fill) in `mobile/src/features/travel/add-connect/`

**Checkpoint**: US1 fully functional and independently testable (MVP) — itinerary built, CAD-costed, budget-linked, idempotent, freshness-safe.

---

## Phase 4: User Story 2 — Insurance-gap flag against card travel perks (Priority: P3)

**Goal**: For a built trip, check the user's cards (Rewards `CardLineup` travel-insurance perks) and flag covered / gap / unknown — naming the covering card where present, never assuming coverage.

**Independent Test**: With a trip built and a `CardLineup` that lacks (or includes) travel insurance, the itinerary shows an insurance-gap flag (or "covered by {card}"), and an indeterminate case is marked "coverage unknown" rather than assumed covered.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T039 [P] [US2] Consumer contract test for `CardLineup` (travel-insurance perks) in `backend/tests/contract/card-lineup.consumer.test.ts`
- [ ] T040 [P] [US2] Insurance-state test: no covering perk ⇒ `gap` with `gap_types` + perks-vault pointer; covering perk ⇒ `covered` + `covering_card_id`; bilingual `Reasoning` cites the perk checked, in `backend/tests/unit/insurance-gap.test.ts` (FR-TRV-002 / SC-T-004 / SC-T-005)
- [ ] T041 [P] [US2] Indeterminate/unavailable `CardLineup` ⇒ state `unknown` (**never** `covered`), user prompted to verify, in `backend/tests/unit/insurance-unknown.test.ts` (withhold-and-ask, SC-T-005)
- [ ] T042 [P] [US2] `CardLineup` version-skew ⇒ consumer contract test fails in CI and insurance flag **disabled** (not computed on mismatched schema) in `backend/tests/contract/card-lineup-skew.test.ts` (SC-T-008 / SC-012)
- [ ] T043 [P] [US2] Integration test: build a trip → derive insurance status (gap / covered / unknown) in `backend/tests/integration/insurance-flag.test.ts`

### Implementation for User Story 2

- [ ] T044 [P] [US2] `InsuranceCoverage` domain (state default `unknown`, covering_card_id, gap_types, `Reasoning`) in `backend/src/modules/travel/domain/insurance-coverage.ts`
- [ ] T045 [US2] Insurance-gap service (read `CardLineup` perks → derive covered/gap/unknown; informational only, not advice; disable on version skew) in `backend/src/modules/travel/services/insurance-gap.ts` (depends on T044)
- [ ] T046 [US2] Surface insurance status on `TripBudget` provided contract (`insurance_status`) in `backend/src/modules/travel/contracts/provided/trip-budget.ts`
- [ ] T047 [P] [US2] Mobile insurance-status banner on Itinerary detail (Recommendation Card with Why layer listing the card perk checked; "not regulated financial advice" disclaimer; bilingual; "unknown" state) in `mobile/src/features/travel/itinerary-detail/`

**Checkpoint**: US1 + US2 both independently functional — trips are insurance-aware with a withhold-on-unknown default.

---

## Phase 5: User Story 3 — Lifetime travel-spend stats with cost-per-trip/day and optional carbon (Priority: P3)

**Goal**: Lifetime travel spend + cost-per-trip / cost-per-day in CAD from matched transactions blended with itinerary costs, plus an optional non-money carbon estimate.

**Independent Test**: With ≥1 trip recorded, Travel Stats shows lifetime spend, cost-per-trip, and (where dates exist) cost-per-day in CAD with freshness; an optional carbon estimate shows a coarse-confidence label, never a precise/monetary figure.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T048 [P] [US3] Provider contract test for `TravelSpend` against `contracts/provided/travel-spend.schema.json` in `backend/tests/contract/travel-spend.provider.test.ts`
- [ ] T049 [P] [US3] Consumer contract test for `TransactionStream` (+ `MerchantGraph` travel-node matching) in `backend/tests/contract/spend-consumers.test.ts`
- [ ] T050 [P] [US3] **Aggregation fixture**: multi-currency lifetime spend sums already-CAD-rounded per-trip cents (associative, exact); no cross-currency float, in `backend/tests/unit/aggregation.test.ts` (FR-X-002 / SC-T-002)
- [ ] T051 [P] [US3] **Cost-per-day fixture**: known dates ⇒ `spend ÷ duration_days` half-up once; **unknown dates ⇒ cost-per-day omitted** (not 0, not divide error) in `backend/tests/unit/cost-per-day.test.ts` (FR-TRV-002 / Edge case)
- [ ] T052 [P] [US3] Carbon test: estimate carries `confidence` (low/medium) + `method`, never exact, **never money** in `backend/tests/unit/carbon-estimate.test.ts` (FR-TRV-002 / C4)
- [ ] T053 [P] [US3] Empty-history test: no trips ⇒ Empty state, never "$0.00 lifetime spend" in `backend/tests/unit/stats-empty.test.ts` (Edge case)
- [ ] T054 [P] [US3] Integration test: travel-spend stats end-to-end (match transactions → blend → lifetime/cost-per-trip/day) in `backend/tests/integration/travel-stats.test.ts`

### Implementation for User Story 3

- [ ] T055 [P] [US3] `TravelSpend` + `TripStat` domain (lifetime, trip_count, avg_cost_per_trip, per-trip cost_source, optional carbon) in `backend/src/modules/travel/domain/travel-spend.ts`
- [ ] T056 [P] [US3] `CarbonEstimate` domain (kg_co2e decimal-string, confidence, method; non-money) in `backend/src/modules/travel/domain/carbon-estimate.ts`
- [ ] T057 [P] [US3] Carbon-estimator service (curated distance/class factor table, feature-toggled, confidence-flagged) in `backend/src/modules/travel/services/carbon-estimate.ts` (research §5 / OI-5)
- [ ] T058 [US3] Travel-spend service (match `TransactionStream` via `MerchantGraph` within trip window; blend with itinerary; lifetime integer-cent sum; cost-per-day omit-on-unknown) in `backend/src/modules/travel/services/travel-spend.ts` (research §3, depends on T055–T056)
- [ ] T059 [US3] Wire `TravelSpend` provided contract in `backend/src/modules/travel/contracts/provided/travel-spend.ts`
- [ ] T060 [P] [US3] Mobile Travel Stats screen (lifetime/cost-per-trip/day with freshness, optional carbon with confidence label; all six states; Empty not $0.00) in `mobile/src/features/travel/travel-stats/`

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T061 [P] Consumer contract test for `StatusState` (`finos:rewards/StatusState/1.0.0`) + provide trip budget/spend context back to Rewards status tracking in `backend/tests/contract/status-state.consumer.test.ts` and `backend/src/modules/travel/services/status-context.ts` (Principle VII / spec boundary / FR-TRV-002)
- [ ] T062 [P] `SafeToActSignal` overdraft-precedence consumer behind a feature check (Conflict Banner + "Currently overridden" on any spend-positive Travel suggestion; Cash Safety precedence) in `backend/src/modules/travel/services/safe-to-act.ts` (research §7 / C7 / OI-6)
- [ ] T063 [P] Cross-profile IDOR / horizontal-priv-esc authorization test at the **API layer** (server-side, not UI) proving 0 cross-profile trip/itinerary exposure + audited denials in `backend/tests/integration/cross-profile-authz.test.ts` (SC-T-010 / Principle V)
- [ ] T064 [P] Email-revocation cascade test: raw content + sole-source-email itinerary data purged within 7 days regardless of store; transaction-corroborated portion retained, in `backend/tests/integration/email-revocation.test.ts` (SC-T-009 / FR-X-013)
- [ ] T065 [P] No-raw-body assertion + log-redaction + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (FR-X-013 / FR-X-014 / Principles V, VI)
- [ ] T066 [P] Bilingual + locale-format verification (EN/FR, fr-CA `1 234,56 $`, trip names verbatim) and WCAG 2.1 AA bilingual screen-reader labels; all six states per data view, in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-T-007)
- [ ] T067 [P] Performance check: cached trip list/stats module-switch ≤ 300 ms; stale money value ⇒ flagged/withheld state, not blocking fetch, in `mobile/tests/perf-travel.test.ts` (FR-X-015 / SC-T-012)
- [ ] T068 Threat-model mitigation verification: confirm **no** booking/payment/money-movement endpoint exists; server-side cross-profile authZ everywhere; parser untrusted-input boundary holds; subprocessor-residency open item (NR-6/OI-2) recorded for the register (spec Threat Model)
- [ ] T069 Inbox-digest submission for Travel alerts (e.g. "insurance gap on upcoming trip") — **no standalone push** (ux-foundations §6.3) in `backend/src/modules/travel/services/inbox-digest.ts`
- [ ] T070 Run [quickstart.md](./quickstart.md) validation end-to-end (all US1–US3 checks + mandatory FX/aggregation/cost-per-day fixtures + consumer+provider contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry, FxProvider, ConfirmationParser, idempotent writer).
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - **US1** (itinerary) is the MVP and provides the `Trip`/`ItineraryItem`/`TripBudget` foundation the others read.
  - **US2** (insurance) depends on US1's trip + the consumed `CardLineup`.
  - **US3** (stats) depends on a populated trip history (US1) + `TransactionStream`/`MerchantGraph`.
- **Polish (Phase 6)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation (Principle III).
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T012, T014–T017 in parallel (T007 money first; T013 authZ + T018 idempotent writer sequence after their deps).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- US2 and US3 can be staffed in parallel **after US1 lands** (both read US1's trips); US3's carbon (T056–T057) is independent of its spend service (T058).

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T019 TripBudget provider contract test
T020 BudgetState/MerchantGraph/GoalState consumer contract tests
T021 FX per-path money fixture (USD + EUR)
T022 stale-FX flag/withhold
T023 stale/missing BudgetState ⇒ headroom withheld
T024 idempotency (duplicate + amended)
T025 partial-parse
T028 parser untrusted-input
# Then domain models [P]:
T030 Trip + ItineraryItem domain
T031 TripBudget domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (itinerary built, CAD-costed, budget-linked, FX fixtures exact, idempotent, fr-CA formatted) → demo.

### Incremental Delivery
US1 (MVP itinerary) → US2 (insurance gap) → US3 (stats + carbon) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: arbitrary-precision decimal FX × integer cents, half-up at the final cent only (Principle IV) — fixtures T021 (per-path), T050 (aggregation), T051 (cost-per-day) guard against slippage / bad division.
- Recommend-only: no task creates a booking/payment/money-movement endpoint (T068 verifies); no Confirm-Action sheet is needed because Travel executes nothing.
- Privacy: T017 enforces the no-raw-body boundary; T064 verifies the 7-day email-revocation cascade (FR-X-013).
- Withhold discipline: money inputs (FX, `BudgetState`) withhold; insurance indeterminate ⇒ `unknown` (never assumed covered) — Travel uses **no** documented-default money substitution.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

---

description: "Task list for Module 2 — Credit & Coaching"
---

# Tasks: Module 2 — Credit & Coaching

**Input**: Design documents from `/specs/004-module-2-credit/`

**Prerequisites**: plan.md, spec.md (US1–US4), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) — not re-decided here): TypeScript/Node (NestJS 10, Fastify) backend + React Native (Expo) mobile; `@finos/money` (`bigint` cents + `decimal.js` rates, single `roundHalfUpToCents`) and `@finos/format` (en-CA/fr-CA `Intl`); PostgreSQL 16 (`credit` schema, per-module role + RLS, `ca-central-1`); Pact for contract tests; Jest; Testcontainers Postgres; BullMQ for bureau-feed ingestion. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US4 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create credit module structure per plan: `backend/src/modules/credit/{domain,money,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/credit/{credit-monitor,coaching,builder-playbook,refinance}`, `mobile/tests/`
- [ ] T002 Register `CreditModule` (NestJS bounded context) + `credit` Prisma schema with a per-module DB role in `backend/src/modules/credit/credit.module.ts` (platform-decisions §2/§3)
- [ ] T003 [P] Configure lint/format incl. the no-float-money + no-cross-module-import boundary rules for `credit` in `backend/.eslintrc` (platform-decisions §6)
- [ ] T004 [P] Configure Jest + money-fixture test harness (wired to `@finos/money`) in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for the consumer (6) + provider (4) contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; `credit` schema role + RLS scaffolded; test runner green on an empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement early-payment money helpers (min payment in cents to bring `(balance − payment)/limit` below the target band threshold, **half-up** at the cent with the documented **band-boundary round-up**, FX conversion of non-CAD balances, no float) in `backend/src/modules/credit/money/early-payment.ts` via `@finos/money` (Principle IV)
- [ ] T007 [P] Implement `FreshnessStamp` adapter + `isStale` check; **money inputs withhold, bureau score flags** policy in `backend/src/modules/credit/domain/freshness.ts` (Principle VIII; reuses `finos:common/FreshnessStamp/1.0.0`)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) in `backend/src/modules/credit/domain/reasoning.ts` (Principle VI; reuses `finos:common/Reasoning/1.0.0`)
- [ ] T009 [P] Implement append-only, immutable `AuditEvent` store (idempotent on `source_event_id` `UNIQUE`; `recommendation_shown`/`plan_acknowledged`/`refinance_signal_dismissed`/`playbook_step_done`/`cross_member_access_denied`), kept separate from debug logs, in `backend/src/modules/credit/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with bureau-PII + monetary-value redaction in `backend/src/modules/credit/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Implement en-CA/fr-CA locale formatter usage wrapper (monetary `1 234,56 $`, percent `12,3 %`, date `28 juin 2026`) in `backend/src/modules/credit/money/locale.ts` via `@finos/format` (Principle II / FR-X-005)
- [ ] T012 Implement server-side cross-member authZ + `profile_id`/`household_id` scoping guard (session identity + `MemberScope`, never a client-supplied id; denied access audited; "kid" role excluded) in `backend/src/modules/credit/api/authz.ts` (Principle V / FR-X-010 / SC-C-009)
- [ ] T013 [P] Implement consumed contract clients with version pinning + graceful degradation (timeouts/retries) in `backend/src/modules/credit/contracts/consumed/` (`credit-state.ts`, `account-state.ts`, `cash-flow.ts`, `goal-state.ts`, `card-lineup.ts`, `safe-to-act.ts`) (Principle VII / FR-X-011/012)
- [ ] T014 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/credit/contracts/provided/registry.ts` (Principle VII)
- [ ] T015 [P] Implement `BureauProvider` interface (soft-pull only; freshness-stamped score/factors; token accessed behind the spine/secrets boundary, never stored as a DB column) + curated Canada seed in `backend/src/modules/credit/services/bureau-provider.ts` (research §2; C5; threat model)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Credit Monitor: score and factors with freshness (Priority: P1) 🎯 MVP

**Goal**: Show the Canadian bureau score (300–900), band, signed delta, and ranked top factors — each bilingual and freshness-stamped; stale flags, absence shows Empty/Connect; soft-pull only.

**Independent Test**: With a bureau feed connected, Credit Monitor shows the score + band + ranked factors each with a bilingual explanation and freshness chip; a stale feed flags the score rather than showing it as current; no feed shows the Empty/Connect state, never a zero score.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T016 [P] [US1] Provider contract test for `CreditFactors` against `contracts/provided/credit-factors.schema.json` (`finos:credit/CreditFactors/1.0.0`) in `backend/tests/contract/credit-factors.provider.test.ts`
- [ ] T017 [P] [US1] Stale-score test: bureau feed past its 24 h window → score shown as last-known + Stale chip, dependent coaching flagged, never "current" in `backend/tests/unit/monitor-staleness.test.ts` (FR-X-008 / SC-C-006)
- [ ] T018 [P] [US1] Empty-state + soft-pull test: no feed → `score=null` Empty/Connect (never zero-filled); monitoring initiates 0 hard inquiries in `backend/tests/unit/monitor-empty-softpull.test.ts` (FR-CRD-001 / SC-C-011)
- [ ] T019 [P] [US1] Bilingual factor + fr-CA formatting test (each factor has `label_en`/`label_fr`; `12,3 %`, `28 juin 2026`; no single-language leak) in `backend/tests/unit/monitor-bilingual-locale.test.ts` (FR-X-005 / SC-C-007)
- [ ] T020 [P] [US1] Integration test: open Credit Monitor end-to-end (score + ≥1 factor + freshness) in `backend/tests/integration/credit-monitor.test.ts` (SC-C-012)

### Implementation for User Story 1

- [ ] T021 [P] [US1] `CreditFactors`/`CreditFactor` domain (score 300–900, band, signed delta, ranked factors, freshness; narrative utilization references `CreditState`, never recomputed) in `backend/src/modules/credit/domain/credit-factors.ts` (C1/C6)
- [ ] T022 [US1] Credit-monitor service (bureau read via `BureauProvider`, band derivation, stale-flag/Empty handling, delta-since-last) in `backend/src/modules/credit/services/credit-monitor.ts` (depends on T015, T021)
- [ ] T023 [US1] Wire `CreditFactors` provided contract output in `backend/src/modules/credit/contracts/provided/credit-factors.ts`
- [ ] T024 [US1] Credit Monitor read-only API (no money movement; cross-member authZ via T012) in `backend/src/modules/credit/api/monitor.ts`
- [ ] T025 [P] [US1] Mobile Credit Monitor screen (score gauge + ranked factor list, freshness chips, Empty/Stale states, reduced-motion final-state gauge) in `mobile/src/features/credit/credit-monitor/`

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Due-Date & Utilization Coaching (Priority: P1)

**Goal**: A specific early-payment amount (integer cents) that drops a card below the target band before a statement cuts, grounded in real balances/limits/utilization; withholds on stale/missing money inputs; honors Cash Safety precedence; recommend-only.

**Independent Test**: With a warn/hard-avoid card and an approaching statement date, coaching returns exactly one specific early-payment amount that crosses below the band, with reasoning citing balance/limit/util-before-after/statement date; it withholds if a money input is stale.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T026 [P] [US2] Provider contract test for `CreditCoachingPlan` (`finos:credit/CreditCoachingPlan/1.0.0`, incl. `status`/`withheld_reason`/`safe_to_act_deferred`) in `backend/tests/contract/credit-coaching-plan.provider.test.ts`
- [ ] T027 [P] [US2] Consumer contract tests for `CreditState`, `AccountState`, `CashFlowForecast`, `GoalState` in `backend/tests/contract/coaching-consumers.test.ts`
- [ ] T028 [P] [US2] **Money fixture — early-payment slippage guard**: balance `450000¢` / limit `500000¢` (util 0.90) → payment to below 0.30 = **`300000¢` ($3,000.00)** exactly, no drift, in `backend/tests/unit/early-payment.test.ts` (FR-CRD-002 / SC-C-003)
- [ ] T029 [P] [US2] **Money fixture — band-boundary round-up**: a balance landing util at exactly 0.30 requires **one more cent** paid to cross *below* healthy (proves the documented round-up rule) in `backend/tests/unit/band-boundary.test.ts` (SC-C-003)
- [ ] T030 [P] [US2] **Money fixture — FX-converted balance**: a USD card balance converted via a fixed timestamped rate to CAD cents with no drift before the early-payment math; stale FX → withhold, in `backend/tests/unit/fx-balance.test.ts` (FR-X-002 / SC-C-003)
- [ ] T031 [P] [US2] Withhold tests: stale/missing `AccountState` balance/limit OR stale/missing `CreditState` → `status='withheld'` with named reason, amount **never** guessed, documented-default **not** applied, in `backend/tests/unit/coaching-withhold.test.ts` (FR-X-008 / Constitution VI / C4 / SC-C-002)
- [ ] T032 [P] [US2] `target_band` test: credit-boosting `GoalState` → `optimal` (< 10%) + time-to-goal; satisfied case → `status='satisfied'`, no action, in `backend/tests/unit/coaching-target-band.test.ts` (FR-CRD-002 / FR-X-004 / NR-CRD-5)
- [ ] T033 [P] [US2] `SafeToActSignal` overdraft precedence test: `safe_to_act_deferred=true`, conflict + resolution surfaced (feature-checked) in `backend/tests/unit/coaching-safe-to-act.test.ts` (C3 / ux-foundations §10.4)
- [ ] T034 [P] [US2] Integration test: request coaching for a high-utilization card with an approaching statement date in `backend/tests/integration/coaching.test.ts` (SC-C-001)

### Implementation for User Story 2

- [ ] T035 [P] [US2] `CreditCoachingPlan`/`CoachingAction` domain (status, withheld_reason, target_band, util-before/after, statement date, reasoning, freshness) in `backend/src/modules/credit/domain/credit-coaching-plan.ts`
- [ ] T036 [US2] Coaching service (early-payment via T006, reads `CreditState`/`AccountState`/`CashFlowForecast`/`GoalState`, withhold-on-stale-money, optimal-band on credit-boosting goal, reroute-spend) in `backend/src/modules/credit/services/coaching.ts` (depends on T006, T013, T035)
- [ ] T037 [US2] `SafeToActSignal` consumer integration (Cash Safety precedence; feature-checked until Module 3 ships) in `backend/src/modules/credit/services/safe-to-act.ts` (C3)
- [ ] T038 [US2] Wire `CreditCoachingPlan` provided contract in `backend/src/modules/credit/contracts/provided/credit-coaching-plan.ts`
- [ ] T039 [US2] Coaching API (recommend-only; `plan_acknowledged` write idempotent on `source_event_id`; no money movement) in `backend/src/modules/credit/api/coaching.ts`
- [ ] T040 [P] [US2] Mobile Coaching screen (per-card early-payment Recommendation Cards + Why layer + statement-date timeline; Confirm-Action sheet with exact CAD + disclaimer; Withheld Card; Conflict Banner) in `mobile/src/features/credit/coaching/` (ux-foundations §2.2/§4.1/§4.4)

**Checkpoint**: US1 + US2 both independently functional (P1 payoff complete).

---

## Phase 5: User Story 3 — Canada-specific Credit-Builder Playbook (Priority: P2)

**Goal**: An ordered, bilingual, Canada-specific builder playbook tailored to credit stage/factors, every step `informational_only`, money-dependent specifics withheld (not guessed) when stale, never a commissioned product push.

**Independent Test**: For a thin-file ("building") user, the playbook shows ordered Canada-specific steps with `informational_only=true`, no product push, and money-dependent specifics withheld when the underlying input is stale.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T041 [P] [US3] Provider contract test for `CreditBuilderPlaybook` (`finos:credit/CreditBuilderPlaybook/1.0.0`) in `backend/tests/contract/credit-builder-playbook.provider.test.ts`
- [ ] T042 [P] [US3] Playbook test: ordered by `priority_rank`, every step `informational_only=true`, bilingual (`title_en`/`title_fr`/`detail_en`/`detail_fr`), no single-language leak, no commissioned push for secured-card/builder-loan steps in `backend/tests/unit/playbook.test.ts` (FR-CRD-003 / SC-C-007)
- [ ] T043 [P] [US3] Money-dependent step staleness test: a step depending on a stale money input is shown generically (no number) or withheld — never a guessed figure, in `backend/tests/unit/playbook-money-dependent.test.ts` (Constitution VI / C4)

### Implementation for User Story 3

- [ ] T044 [P] [US3] `CreditBuilderPlaybook`/`PlaybookStep` domain (credit_stage, ordered steps, `informational_only`, `depends_on_money_input`) in `backend/src/modules/credit/domain/credit-builder-playbook.ts`
- [ ] T045 [P] [US3] `BuilderKnowledgebase` versioned, bilingual, Canada-specific dataset loader (secured cards, builder loans, on-time-payment, hard-inquiry timing) in `backend/src/modules/credit/services/builder-knowledgebase.ts` (research §NR-CRD-3)
- [ ] T046 [US3] Credit-builder-playbook service (tailor steps from `CreditFactors` + credit stage; withhold money-dependent specifics on stale input) in `backend/src/modules/credit/services/credit-builder-playbook.ts` (depends on T044, T045)
- [ ] T047 [US3] Wire `CreditBuilderPlaybook` provided contract in `backend/src/modules/credit/contracts/provided/credit-builder-playbook.ts`
- [ ] T048 [P] [US3] Mobile Builder Playbook screen (ordered step list, bilingual, informational framing + not-regulated-advice note) in `mobile/src/features/credit/builder-playbook/`

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Refinance & Card-Lineup Optimization (Priority: P2)

**Goal**: For keep/downgrade/cancel/refinance, show **both** the rewards-value impact (from Rewards `CardLineup`) and the qualitative credit-score impact; integer-cents money deltas; withhold on stale money inputs; recommend-only.

**Independent Test**: For a candidate card, each option shows the net annual money delta (integer cents) **and** the qualitative score impact with reasoning citing both sides; withheld when a money input is stale or `CardLineup` is unavailable/skewed.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T049 [P] [US4] Provider contract test for `RefinanceSignals` (`finos:credit/RefinanceSignals/1.0.0`) in `backend/tests/contract/refinance-signals.provider.test.ts`
- [ ] T050 [P] [US4] Consumer contract test for `CardLineup` (`finos:rewards/CardLineup/1.0.0`) in `backend/tests/contract/refinance-cardlineup.consumer.test.ts`
- [ ] T051 [P] [US4] **Money fixture — refinance net-delta**: rewards-value delta `-$120.00` minus fee saved `-$150.00` ⇒ net **`+3000¢` ($30.00)** exactly, no drift, in `backend/tests/unit/refinance-net-delta.test.ts` (FR-CRD-004 / SC-C-003)
- [ ] T052 [P] [US4] Two-sided + cancel-impact test: every signal shows rewards-value **and** `estimated_credit_score_impact`; a cancel that raises aggregate utilization / shortens average age surfaces `utilization_impact` + score impact (never hidden) in `backend/tests/unit/refinance-two-sided.test.ts` (FR-CRD-004 / SC-C-004)
- [ ] T053 [P] [US4] Withhold / version-skew test: stale rewards-value/fee/balance/rate → signal `withheld`; `CardLineup` unavailable or version-skewed → rewards side unavailable / signal withheld, never fabricated, in `backend/tests/unit/refinance-withhold.test.ts` (FR-X-008 / SC-C-008 / SC-012)
- [ ] T054 [P] [US4] Integration test: request the optimizer for a candidate card in `backend/tests/integration/refinance.test.ts`

### Implementation for User Story 4

- [ ] T055 [P] [US4] `RefinanceSignals`/`RefinanceSignal` domain (decision, status, net/fee/rewards-value deltas in cents, qualitative score impact, utilization impact, APR decimal-string, reasoning) in `backend/src/modules/credit/domain/refinance-signals.ts`
- [ ] T056 [P] [US4] Refinance APR / candidate-rate provider interface (Canadian-region-or-disclosed; informational, never commissioned) in `backend/src/modules/credit/services/refinance-rate-provider.ts` (research §NR-CRD-2)
- [ ] T057 [US4] Refinance-optimizer service (rewards side from `CardLineup`, score/utilization/average-age side in Credit, net-delta half-up at cent, withhold-on-stale) in `backend/src/modules/credit/services/refinance-optimizer.ts` (depends on T013, T055, T056)
- [ ] T058 [US4] Wire `RefinanceSignals` provided contract in `backend/src/modules/credit/contracts/provided/refinance-signals.ts`
- [ ] T059 [US4] Refinance API (recommend-only; `refinance_signal_dismissed` write idempotent on `source_event_id`; no cancel/refinance execution) in `backend/src/modules/credit/api/refinance.ts`
- [ ] T060 [P] [US4] Mobile Refinance Optimizer screen (per-candidate keep/downgrade/cancel/refinance trade-off card with both rewards-value and score impact, Why layer, freshness chips, Withheld Card) in `mobile/src/features/credit/refinance/`

**Checkpoint**: All user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T061 [P] Multi-member credit visibility: API-layer IDOR / horizontal-priv-esc authorization test (server-side, not UI) proving 0 cross-member exposure + audited `cross_member_access_denied`; "kid" role sees no other member's credit data, in `backend/tests/integration/cross-member-authz.test.ts` (SC-C-009 / Principle V / Threat Model)
- [ ] T062 [P] Idempotency test: replayed `plan_acknowledged` / `refinance_signal_dismissed` / `playbook_step_done` events do not double-apply (`UNIQUE` on `source_event_id`) in `backend/tests/integration/idempotency.test.ts` (FR-X-003)
- [ ] T063 [P] Verify bureau-PII/monetary log redaction (no score/balance/payment leak) + audit-trail completeness (`recommendation_shown` on every shown card) across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T064 [P] Retention/residency test: bureau-derived data honors the deletion (FR-X-013, ≤7 days) + dormant-anonymization (FR-X-019) crypto-shred cascade; bureau subprocessor Canadian-region-or-disclosed in `backend/tests/integration/retention-residency.test.ts` (FR-X-020 / threat model)
- [ ] T065 [P] Bilingual + locale-format verification (EN/FR, `1 234,56 $`, `12,3 %`, `28 juin 2026`) and WCAG 2.1 AA bilingual screen-reader labels across Credit screens in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-C-007)
- [ ] T066 [P] Performance check: cached Credit Monitor module-switch ≤ 300 ms; stale → flagged/withheld state, not blocking fetch, in `mobile/tests/perf-monitor.test.ts` (FR-X-015 / SC-010)
- [ ] T067 Threat-model mitigation tasks: confirm no money-movement endpoint exists; soft-pull only (0 hard inquiries); bureau tokens never in a DB column or logs; server-side cross-member authZ enforced everywhere (spec Threat Model / SC-C-010/SC-C-011)
- [ ] T068 Run [quickstart.md](./quickstart.md) validation end-to-end (all four user-story checks + the four mandatory money fixtures + consumer/provider contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (early-payment money, freshness/withhold policy, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry, bureau provider).
- **User Stories (Phases 3–6)** → all depend on Foundational; then independently testable.
  - US2 (coaching) reasons over `CreditFactors`-adjacent narrative but reads canonical `CreditState`/`AccountState` directly; it does **not** depend on US1's read-model and can ship alongside it.
  - US4 (refinance) consumes Rewards `CardLineup`; until available it shows the credit side and marks the rewards side unavailable (degrades gracefully).
  - US3 (playbook) tailors from `CreditFactors` (US1 domain) but degrades to generic steps; can follow US1.
- **Polish (Phase 7)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation (Constitution III).
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T007–T011, T013, T014, T015 in parallel (T006 early-payment money first; T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1/US3 can be staffed in parallel with US2; US4 sequences after its `CardLineup` consumer is wired.

## Parallel Example: User Story 2

```bash
# Tests first (all [P]):
T026 CreditCoachingPlan provider contract test
T027 coaching consumer contract tests (CreditState/AccountState/CashFlow/GoalState)
T028 early-payment slippage fixture (450000¢/500000¢ → 300000¢)
T029 band-boundary round-up fixture
T030 FX-converted balance fixture
T031 coaching withhold (stale/missing money input → withheld, no guess)
T032 target-band (credit-boosting → optimal) + satisfied
T033 SafeToActSignal overdraft precedence
# Then domain model, then service:
T035 CreditCoachingPlan/CoachingAction domain
T036 coaching service
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (Credit Monitor with bilingual score + factors + freshness, Empty/Stale states, soft-pull) → demo.

### Incremental Delivery
US1 (MVP monitor) → US2 (flagship early-payment coaching) → US3 (builder playbook) → US4 (two-sided refinance) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money math: integer CAD cents + arbitrary-precision decimal (utilization/APR/FX), half-up at the final cent only, with the documented band-boundary round-up (Principle IV) — fixtures T028/T029/T030/T051 guard against slippage.
- **Withhold, never default**: stale/missing money inputs withhold coaching/refinance figures; the v2.2.0 documented-default exception does **not** apply here (Clarification C4) — T031/T043/T053 enforce this.
- Recommend-only: no task creates a money-movement endpoint, a card-cancellation executor, or a hard-pull (T067 verifies).
- The spine stays the single canonical `CreditState` provider; Credit publishes no competing `CreditState` (C1).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

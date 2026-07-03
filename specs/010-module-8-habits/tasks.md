---

description: "Task list for Module 8 — Habits & Routines"
---

# Tasks: Module 8 — Habits & Routines

**Input**: Design documents from `/specs/010-module-8-habits/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [platform-decisions.md](../_platform/platform-decisions.md); intra-module layout per [plan.md](./plan.md)): TypeScript/Node NestJS backend + React Native (Expo) mobile; `@finos/format` for locale display (this module does **no** money arithmetic, so **no** `@finos/money` rounding); BullMQ ingestion workers; Pact for contract tests; Jest; Testcontainers Postgres (`habits` schema + RLS). Paths below assume that layout.

**Organization**: Tasks grouped by user story. All three stories are **P1-within-this-P3-module**; they are sequenced US1 → US2 → US3 in spec priority order for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create habits module structure per plan: `backend/src/modules/habits/{domain,projection,services,ingestion,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/habits/{habits-home,daily-ritual,game-settings}`, `mobile/tests/`
- [ ] T002 Register `HabitsModule` (NestJS) + dependencies (`@finos/format`, Pact, Jest, BullMQ client) in `backend/src/modules/habits/habits.module.ts` and `backend/package.json` / `mobile/package.json`
- [ ] T003 [P] Configure lint/format incl. the **no-money-arithmetic** boundary rule (ban `@finos/money` arithmetic + decimal/float math in habits paths) in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest + Testcontainers Postgres (`habits` schema, per-schema role + RLS) test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite; RLS-enabled `habits` schema provisions in Testcontainers.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement the append-only **event-store projection base** (apply event → rebuildable read model; replay) reusing the platform event store (platform D5) in `backend/src/modules/habits/projection/event-store.ts` (Principle VI / FR-X-007)
- [ ] T007 [P] Implement `FreshnessStamp` propagation helper + `isStale` check (propagates the **source's** stamp; Habits invents no freshness) in `backend/src/modules/habits/domain/freshness.ts` (Principle VIII)
- [ ] T008 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) for "why this counted" in `backend/src/modules/habits/domain/reasoning.ts` (Principle VI / FR-X-006)
- [ ] T009 [P] Implement append-only, immutable `AuditEvent` store (streak_advanced, streak_compensated, xp_awarded, ritual_started, ritual_completed, cross_user_read_denied), kept separate from debug logs, in `backend/src/modules/habits/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with PII + **pass-through monetary value** redaction in `backend/src/modules/habits/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Implement pass-through CAD/percent/date display via `@finos/format` (locale-correct, **no arithmetic** — surfaces source `MoneyCents` unchanged) in `backend/src/modules/habits/services/format-passthrough.ts` (Principle II/IV / FR-X-005)
- [ ] T012 Implement server-side cross-profile authZ + `profile_id` scoping guard (session identity, never client-supplied id; kid-role no-switcher) in `backend/src/modules/habits/api/authz.ts` (Principle V / FR-X-010)
- [ ] T013 [P] Implement consumed contract clients with version pinning + graceful degradation / feature-check (timeouts/retries) for `RoundupProposals`, `BillCalendar`, `NotificationDigest`, `TaskCompletionEvents`, `GoalState` in `backend/src/modules/habits/contracts/consumed/` (Principle VII/VIII / FR-X-011/012; HAB-OI-1)
- [ ] T014 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) with a **projection-only guard** (reject any money/account/merchant/source_ref field) in `backend/src/modules/habits/contracts/provided/registry.ts` (Principle VII / FR-SOC-001)
- [ ] T015 [P] Implement BullMQ ingestion worker scaffold (consumes completion/approval/reversal events; mandatory timeouts/retries/rate-limits; idempotent dispatch keyed on `source_event_id`) in `backend/src/modules/habits/ingestion/completion-worker.ts` (Principle VIII / FR-X-012)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Streaks & XP advance only for real financial actions (Priority: P1-within-P3) 🎯 MVP

**Goal**: Streaks/XP advance only for real, completed, non-reversed financial actions; advances are idempotent on the source event id and compensated on reversal; XP derives from integer counts only.

**Independent Test**: With the game layer enabled and a habit tied to "approve a roundup", a real approval event increments the streak by 1 and raises XP with a bilingual reason; a non-qualifying event advances nothing; a redelivered event does not double-count; a reversal compensates the advance.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T016 [P] [US1] Consumer contract tests for `RoundupProposals`, `BillCalendar`, `NotificationDigest`, `TaskCompletionEvents` (completion/approval/reversal shapes, min v1.0.0) in `backend/tests/contract/completion-events.consumer.test.ts`
- [ ] T017 [P] [US1] Provider contract test for `StreakState` (projection-only — money/account/merchant/source_ref field ⇒ FAIL) against `contracts/provided/streak-state.schema.json` in `backend/tests/contract/streak-state.provider.test.ts`
- [ ] T018 [P] [US1] Real-vs-non-real advance test: approved roundup advances; app-open/view/**proposed-but-unapproved** roundup advances nothing, in `backend/tests/unit/streak-real-action.test.ts` (FR-HAB-001 / SC-H-001)
- [ ] T019 [P] [US1] **Idempotency fixture (mandatory)**: same `source_event_id` redelivered → advance applied at most once (no double-count) in `backend/tests/unit/idempotency.test.ts` (FR-X-003 / SC-H-002)
- [ ] T020 [P] [US1] **Compensation fixture (mandatory)**: reversal/void of a prior `source_event_id` decrements the exact advance; resets streak if reversed day was the most recent qualifying day; compensation itself idempotent, in `backend/tests/unit/compensation.test.ts` (FR-HAB-001 / SC-H-003)
- [ ] T021 [P] [US1] **XP-integrity fixture (mandatory)**: XP is a deterministic function of integer event/streak counts only; a money amount can never be an XP input (type/test-rejected) in `backend/tests/unit/xp-from-counts.test.ts` (SC-H-007)
- [ ] T022 [P] [US1] Grace/cadence test: daily cadence + 6-hour grace preserves a 23:50→00:10 local completion; missing beyond grace resets to 0, in `backend/tests/unit/grace-cadence.test.ts` (research §4)
- [ ] T023 [P] [US1] Integration test: real approval event → streak grid reflects advance + bilingual reason, in `backend/tests/integration/streak-advance.test.ts`

### Implementation for User Story 1

- [ ] T024 [P] [US1] `Habit` + `QualifyingEvent` domain (action_class→consumed-event mapping, `source_event_id` UNIQUE per (profile,habit), compensated flag) in `backend/src/modules/habits/domain/habit.ts`
- [ ] T025 [P] [US1] `StreakState` + `HabitProgress` + `Badge` domain (integer counts; no monetary field) in `backend/src/modules/habits/domain/streak.ts`
- [ ] T026 [US1] Streak projection (apply qualifying event, grace/cadence evaluation, reset; **compensate** on reversal) over the event store in `backend/src/modules/habits/projection/streak-projection.ts` (depends on T006, T024, T025)
- [ ] T027 [US1] XP/level engine (integer counts only — fixed XP per qualifying action + streak-length bonus; level = XP thresholds; **no money input**) in `backend/src/modules/habits/services/xp-engine.ts` (HAB-OI-2)
- [ ] T028 [US1] Streak engine service (validate qualifying event via consumed client, idempotent advance keyed on `source_event_id`, emit `streak_advanced`/`xp_awarded`/`streak_compensated` audit + bilingual `Reasoning`) in `backend/src/modules/habits/services/streak-engine.ts` (depends on T026, T027)
- [ ] T029 [US1] Wire `StreakState` provided contract output (projection-only) in `backend/src/modules/habits/contracts/provided/streak-state.ts`
- [ ] T030 [P] [US1] Mobile Habits Home screen (streak/XP/level/badge grid; localized SR labels; reduced-motion fade) in `mobile/src/features/habits/habits-home/`

**Checkpoint**: US1 fully functional and independently testable (MVP) — streaks advance only for real actions, idempotently, compensably.

---

## Phase 4: User Story 2 — Daily cross-module ritual of live micro-actions (Priority: P1-within-P3)

**Goal**: A daily ritual that pulls live items from Bills/Cash Safety/Inbox, each with source + freshness, routes money items to the owning module's Confirm-Action sheet, degrades gracefully on stale/absent sections, and respects Cash Safety precedence.

**Independent Test**: With one due bill, one pending roundup, and one unread digest item, the ritual presents exactly those live items with source + freshness; a money item routes to the source Confirm-Action sheet; a stale section is flagged/withheld while the rest runs; no live items → "all clear".

### Tests for User Story 2 (write first, must FAIL)

- [ ] T031 [P] [US2] Live-assembly test: ritual presents exactly the live `BillCalendar`/`RoundupProposals`/`NotificationDigest` items, each with `source_module` + `FreshnessStamp`; no fabricated/zero-filled items, in `backend/tests/unit/ritual-assembler.test.ts` (FR-HAB-002 / SC-H-005)
- [ ] T032 [P] [US2] **Money pass-through fixture (mandatory)**: a roundup item surfaces the source `MoneyCents` **unchanged** via `@finos/format` (en-CA `$12.34` / fr-CA `12,34 $`); no rounding/conversion by Habits, in `backend/tests/unit/money-passthrough.test.ts` (SC-H-007)
- [ ] T033 [P] [US2] Graceful-degradation test: a stale/unavailable source section is flagged/withheld (not dropped, not fresh) while remaining sections proceed, in `backend/tests/unit/ritual-degradation.test.ts` (FR-X-008 / FR-X-012 / SC-H-005)
- [ ] T034 [P] [US2] Cash Safety precedence test: an item conflicting with `SafeToActSignal` shows Conflict Banner state, Cash Safety wins, streak does not advance by overriding safety, in `backend/tests/unit/ritual-conflict.test.ts` (research §7; UX §3.1)
- [ ] T035 [P] [US2] Ritual idempotency test: run is unique per `(profile, local_day)`; replayed completion does not double-award, in `backend/tests/unit/ritual-idempotency.test.ts` (SC-H-002)
- [ ] T036 [P] [US2] "All clear" empty-state test: no live items → positive all-clear state, never zero-filled, in `backend/tests/unit/ritual-all-clear.test.ts` (US2 AS4)
- [ ] T037 [P] [US2] Integration test: start ritual end-to-end with a live bill + roundup + digest item, in `backend/tests/integration/daily-ritual.test.ts`

### Implementation for User Story 2

- [ ] T038 [P] [US2] `Ritual`/`RitualRun`/`RitualItem` domain (`(profile,local_day)` UNIQUE; `money_passthrough` read-only; `completion_state` {pending,completed,withheld,conflict}) in `backend/src/modules/habits/domain/ritual.ts`
- [ ] T039 [US2] Ritual-assembler service (read live consumed contracts behind feature checks; attach source + freshness; flag/withhold stale section; emit Conflict on Cash Safety override; "all clear" when empty) in `backend/src/modules/habits/services/ritual-assembler.ts` (depends on T013, T038)
- [ ] T040 [US2] Ritual API (read-only assembly; advance/complete idempotent per `run_id`/`local_day`; money items **delegate** to the owning module's Confirm-Action flow — no Habits executor, no money endpoint) in `backend/src/modules/habits/api/ritual.ts` (FR-X-003 / SC-H-006)
- [ ] T041 [US2] Wire ritual-completion → `daily_ritual` habit advance (idempotent per `run_id`; only when game layer enabled) into the streak engine in `backend/src/modules/habits/services/streak-engine.ts`
- [ ] T042 [P] [US2] Mobile Daily Ritual screen (stepped live items; Freshness chip per item; money item opens **source** Confirm-Action sheet; Conflict Banner; Partial Data Banner; six-state matrix) in `mobile/src/features/habits/daily-ritual/`

**Checkpoint**: US1 + US2 both independently functional — the ritual runs on live cross-module items with graceful degradation and safety precedence.

---

## Phase 5: User Story 3 — Game layer fully disable-able (Priority: P1-within-P3)

**Goal**: Turning the game layer off keeps the entire module (and the ritual) working with zero game UI; re-enable resumes streaks from a documented baseline; kid roles see only their own data.

**Independent Test**: Disable the game layer → streaks/XP/levels/badges disappear, the ritual still assembles and completes, no other module changes; re-enable → streaks resume from 0, XP/level preserved; a kid role has no switcher.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T043 [P] [US3] Provider contract test for `HabitProgress` (projection-only — includes `game_layer_enabled`; money/account/merchant field ⇒ FAIL) against `contracts/provided/habit-progress.schema.json` in `backend/tests/contract/habit-progress.provider.test.ts`
- [ ] T044 [P] [US3] Disable test: game layer off ⇒ 0 game UI elements render and 0 advances computed, while the ritual + real micro-actions remain fully functional, in `backend/tests/unit/game-layer-disable.test.ts` (FR-HAB-001 / SC-H-004)
- [ ] T045 [P] [US3] Re-enable baseline test: streaks resume from 0; XP/level preserved; **no** retroactive back-fill from history, in `backend/tests/unit/game-layer-reenable.test.ts` (research §5)
- [ ] T046 [P] [US3] Kid-role test: kid sees only own habits/goals; **no** profile switcher; no other member's data (server-enforced), in `backend/tests/integration/kid-role-scope.test.ts` (UX §10.6; threat model)
- [ ] T047 [P] [US3] Integration test: toggle game layer off→on and verify ritual continuity + baseline resume, in `backend/tests/integration/disable-game-layer.test.ts`

### Implementation for User Story 3

- [ ] T048 [P] [US3] `GameLayerSetting` domain (per-profile enabled, ritual_cadence, grace_seconds_override) in `backend/src/modules/habits/domain/game-setting.ts`
- [ ] T049 [US3] Game-layer-toggle service (disable hides all game UI signals + halts advances; re-enable resumes streaks from 0, preserves XP/level; emits audit) in `backend/src/modules/habits/services/game-layer-toggle.ts`
- [ ] T050 [US3] Wire `HabitProgress` provided contract output (projection-only; carries `game_layer_enabled`) in `backend/src/modules/habits/contracts/provided/habit-progress.ts`
- [ ] T051 [US3] Game-layer guard in streak engine + ritual habit advance (no advance when disabled) in `backend/src/modules/habits/services/streak-engine.ts`
- [ ] T052 [P] [US3] Mobile Game-layer Settings screen (opt-in toggle, cadence, grace override; kid-role hides switcher) in `mobile/src/features/habits/game-settings/`

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T053 [P] Nudge emitter: streak/ritual nudges emitted to the **Inbox digest pipeline** (`module_id`, `event_type`, `priority_tier` Informational/Important, bilingual payload, `expires_at`) — **no** standalone push, in `backend/src/modules/habits/services/nudge-emitter.ts` (SC-009 / SC-H-011)
- [ ] T054 [P] Cross-profile authZ / IDOR / horizontal-priv-esc test at the **API layer** (not UI) proving 0 cross-user habit-data exposure + audited denials, in `backend/tests/integration/cross-profile-authz.test.ts` (SC-H-008 / Principle V)
- [ ] T055 [P] Social projection test: `StreakState`/`HabitProgress` are computed **server-side before transmission** to expose only streak/level/%/badge — no raw amounts/identifiers/`source_ref`, in `backend/tests/integration/social-projection.test.ts` (FR-SOC-001 / SC-H-008)
- [ ] T056 [P] Verify log redaction (no PII / pass-through monetary leak) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI)
- [ ] T057 [P] Retention/revocation test: Inbox-derived ritual enrichment obeys the email-revocation cascade (FR-X-013); dormant habit/streak/ritual history obeys the retention bound + crypto-shred (FR-X-019), in `backend/tests/integration/retention-revocation.test.ts`
- [ ] T058 [P] Bilingual + locale-format verification (EN/FR habit/ritual/badge/nudge strings, no single-language leak; pass-through fr-CA `1 234,56 $`) and WCAG 2.1 AA bilingual screen-reader labels in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-H-009)
- [ ] T059 [P] Performance check: cached streak grid / ritual list module-switch ≤ 300 ms; stale/miss → flagged state, not blocking fetch, in `mobile/tests/perf-habits.test.ts` (FR-X-015 / SC-010)
- [ ] T060 Threat-model mitigation tasks: confirm no money-movement endpoint and no money arithmetic exist; server-side cross-profile authZ + projection-only Social exposure enforced everywhere (spec Threat Model)
- [ ] T061 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory idempotency/compensation/XP-integrity/money-pass-through fixtures + consumer+provider contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (event-store projection base, freshness, reasoning, audit, redaction, format-passthrough, authZ, consumed-contract clients, provided-contract registry, ingestion worker).
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US2 (ritual) reuses US1's streak engine for the `daily_ritual` habit advance (T041) but the ritual itself assembles and completes without the game layer; US2 can be demoed before US1's game UI.
  - US3 (disable) guards US1's streak engine + US2's ritual habit advance (T051); sequence US3 after US1/US2 exist to guard.
- **Polish (Phase 6)** → depends on all three stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → projection/services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T007–T011, T013, T014, T015 in parallel (T006 event-store base first; T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) projection/services.
- After Foundational, US1's domain (T024/T025) and US2's domain (T038) can be staffed in parallel; the streak engine (T028) and ritual assembler (T039) sequence after their domains.
- Polish: T053–T059 in parallel.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T016 completion-events consumer contract tests
T017 StreakState provider (projection-only) contract test
T018 real-vs-non-real advance
T019 idempotency fixture
T020 compensation fixture
T021 XP-from-counts fixture
T022 grace/cadence
# Then domain models [P]:
T024 Habit + QualifyingEvent domain
T025 StreakState + HabitProgress + Badge domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (streaks advance only for real actions, idempotent, compensable; idempotency + compensation + XP-integrity fixtures green) → demo.

### Incremental Delivery
US1 (MVP — integrity core) → US2 (daily ritual) → US3 (disable-ability) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- **No money math**: this module computes no monetary value — the mandatory money fixtures are the **money pass-through** (T032) and **XP-from-counts** (T021) tests, which guard against any recompute/conversion or money-into-XP leak (Principle IV satisfied by originating no money figure).
- Idempotency + compensation (T019/T020) are this module's primary Principle-IV obligation: every advance is keyed on `source_event_id` (UNIQUE) and is exactly-once in effect.
- Recommend-only: no task creates a money-movement endpoint; money items delegate to the owning module's Confirm-Action sheet (T040, T060 verify).
- Projection-only cross-user exposure (T017/T043/T055): provided contracts carry no money/account/merchant/source_ref field.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

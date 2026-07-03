---

description: "Task list for Module 15 — Social & Accountability"
---

# Tasks: Module 15 — Social & Accountability

**Input**: Design documents from `/specs/017-module-15-social/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited, per [plan.md](./plan.md) / [platform-decisions.md](../_platform/platform-decisions.md)): TypeScript/Node (NestJS 10 + Fastify) backend + React Native (Expo) mobile; `@finos/format` for fr-CA/en-CA percentage + date formatting; Prisma (Postgres `social` schema + RLS); Pact for contract tests; Jest. **No `@finos/money`/`decimal.js` money path** — Social emits no cent value; the one `percentage_complete` ratio is the spine's arbitrary-precision ratio as a decimal string. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create social module structure per plan: `backend/src/modules/social/{domain,projection,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/social/{circle-list,circle-detail,consent}`, `mobile/tests/`
- [ ] T002 Initialize the Social NestJS module + dependencies (`@finos/format`, Pact, Jest, Prisma) wired into `backend/package.json` and `mobile/package.json`
- [ ] T003 [P] Configure lint/format incl. the **no-cross-module-import** boundary rule (Social may import only its own code + shared contract/`@finos/format` packages) in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest test harness (leak-proof + idempotency fixture helpers) in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests, incl. the provider **no-money-field** assertion hook, in `backend/pact.config.ts`

**Checkpoint**: Project builds; test runner green on an empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T006 Implement the **server-side projection filter** (GoalState/HabitProgress → dimensionless `CircleProgress`; emits ONLY `percentage_complete` `0..1` decimal string / `streak_count` int / `pace_status` enum; **no amount/account/institution field by construction**) in `backend/src/modules/social/projection/projection-filter.ts` (FR-SOC-001 — the leak-proof boundary)
- [ ] T007 [P] Implement `FreshnessStamp` value object + `isStale` check (source, observed_at, threshold; default 24 h) with **flag-not-withhold** semantics (no money input) in `backend/src/modules/social/domain/freshness.ts` (Principle VIII)
- [ ] T008 [P] Implement bilingual `display_label` / `short_description` value object (label_en + label_fr, both required) in `backend/src/modules/social/domain/bilingual-label.ts` (Principle II / FR-X-005)
- [ ] T009 [P] Implement append-only, immutable `AuditEvent` store (circle_created, share_granted, share_revoked, circle_closed, deletion_cascade, access_denied; idempotency-keyed on `source_event_id` UNIQUE), kept separate from debug logs, in `backend/src/modules/social/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T010 [P] Implement structured logging with finance-derived-value + member-identifier redaction in `backend/src/modules/social/services/logging.ts` (Principle V / FR-X-014)
- [ ] T011 [P] Implement en-CA/fr-CA locale formatter wiring for percentage (`60,0 %`) + date via `@finos/format` in `backend/src/modules/social/domain/locale.ts` (Principle II / FR-X-005)
- [ ] T012 Implement server-side cross-user authZ guard + RLS scoping (validated session identity + circle membership, never a client-supplied `circleId`/`memberId`; denied access audited) in `backend/src/modules/social/api/authz.ts` (Principle V / FR-HH-001 / SC-015)
- [ ] T013 [P] Implement consumed contract clients with version pinning + graceful degradation (timeouts/retries): `goal-state.ts` (published); `habit-progress.ts` + `member-scope.ts` **feature-checked / safe-default** until published, in `backend/src/modules/social/contracts/consumed/` (Principle VII / FR-X-011/012)
- [ ] T014 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/social/contracts/provided/registry.ts` (Principle VII)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Create a circle and share ONE metric, nothing else (Priority: P1) 🎯 MVP

**Goal**: Create a circle around one goal/habit, choose exactly ONE dimensionless metric, and have members see only that metric — never amounts, accounts, institutions, or any other goal; household-joint goals excluded by default.

**Independent Test**: Create a circle, set the metric to `percentage_complete`, add a member, and confirm the member's view shows only a percentage + a non-financial label, with **no** monetary amount, account/institution identifier, or other owner goal in the API response or rendered view.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T015 [P] [US1] Provider contract test for `CircleProgress` against `contracts/provided/circle-progress.schema.json`, **asserting the absence** of any `*_cents`/`currency`/`amount`/`account*`/`institution*` field in every response, in `backend/tests/contract/circle-progress.provider.test.ts` (FR-SOC-001 / SC-S-001)
- [ ] T016 [P] [US1] Consumer contract test for `GoalState` (ratio + pace_status) in `backend/tests/contract/goal-state.consumer.test.ts` (FR-SOC-002)
- [ ] T017 [P] [US1] **Leak-proof / percentage-string fixture**: spine ratio `3000/5000` → projection `percentage_complete = "0.6"` (string-encoded `0..1`, no float, no reconstructable amount); renders `60.0%` / `60,0 %`, in `backend/tests/unit/projection-leak.test.ts` (FR-SOC-001 / SC-S-001)
- [ ] T018 [P] [US1] Amount-metric rejection test: configuring an amount-bearing `shared_metric_kind` is rejected (no amount field exists) in `backend/tests/unit/metric-kind-validation.test.ts` (FR-SOC-001)
- [ ] T019 [P] [US1] Household-exclusion test: a household-joint goal without extended `MemberScope` is **totally excluded** (no projection, no placeholder, no inferable existence; safe-default until `MemberScope` published) in `backend/tests/unit/household-exclusion.test.ts` (FR-SOC-001 / SC-S-005)
- [ ] T020 [P] [US1] Bilingual `display_label` rendering test (label_en + label_fr both present; no single-language leak) in `backend/tests/unit/label-bilingual.test.ts` (FR-X-005 / SC-S-007)
- [ ] T021 [P] [US1] Integration test: create circle → choose one metric → add member → render member view end-to-end in `backend/tests/integration/create-circle-share-one-metric.test.ts`

### Implementation for User Story 1

- [ ] T022 [P] [US1] `Circle` domain (circle_id, owner, name verbatim, single `shared_metric_kind`, `source_kind`, `member_cap` 2..8, status) in `backend/src/modules/social/domain/circle.ts`
- [ ] T023 [P] [US1] `CircleMembership` domain (role, `share_state` present_not_sharing/sharing/revoked; unique (circle_id, member_id)) in `backend/src/modules/social/domain/circle-membership.ts`
- [ ] T024 [P] [US1] `ShareGrant` domain (single metric from single source, `source_ref_id` stored server-side/never exposed, `household_scope_extended`) in `backend/src/modules/social/domain/share-grant.ts`
- [ ] T025 [US1] Circle + membership service (create, invite-by-code existing-user-only, cap 8, join-without-share = present_not_sharing) in `backend/src/modules/social/services/circle.ts` (depends on T022–T024)
- [ ] T026 [US1] Share-grant service (explicit consent; reject amount metrics; reject household-joint goal unless scope extended — safe-default exclude; audited) in `backend/src/modules/social/services/share-grant.ts` (FR-SOC-001)
- [ ] T027 [US1] Read-only circle/projection API (NO projection-write path, NO money-movement endpoint; authZ-guarded) in `backend/src/modules/social/api/circle.ts`
- [ ] T028 [US1] Wire `CircleProgress` provided contract output through the projection filter in `backend/src/modules/social/contracts/provided/circle-progress.ts`
- [ ] T029 [P] [US1] Mobile Circle List + Create-Circle screens (choose ONE metric; six states incl. Empty "Create a circle" / "Créer un cercle"; bilingual) in `mobile/src/features/social/circle-list/`
- [ ] T030 [P] [US1] Mobile Consent (share-grant) Confirm-Action sheet (recaps *what becomes visible*, disclaimer, precise CTA "Share my progress" / "Partager ma progression"; no money-impact block) in `mobile/src/features/social/consent/`

**Checkpoint**: US1 fully functional and independently testable (MVP) — leak-proof single-metric sharing.

---

## Phase 4: User Story 2 — Live updates from real progress, never manual entry (Priority: P2)

**Goal**: The shared projection updates automatically from real `GoalState`/`HabitProgress`; no member can type a fake number; stale ⇒ flagged, feed-down ⇒ Unavailable.

**Independent Test**: Advance the underlying `GoalState.current_amount` (real spine update) and confirm the projection recomputes from that real value within the freshness window; confirm no API path lets a member set the projection.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T031 [P] [US2] No-write-path test: any client POST/PUT of a projection value is rejected (projections server-derived only) in `backend/tests/unit/no-projection-write.test.ts` (FR-SOC-002 / FR-X-003)
- [ ] T032 [P] [US2] **Recompute idempotency fixture (mandatory)**: a redelivered spine change (same `source_event_id`) does not double-apply and yields an identical projection in `backend/tests/unit/recompute-idempotency.test.ts` (FR-X-003)
- [ ] T033 [P] [US2] Freshness test: source stale (> 24 h) → projection **flagged** (stale chip + "Updated {date}"), NOT withheld; feed-down → **Unavailable** + last-known timestamp, never fabricated, in `backend/tests/unit/projection-freshness.test.ts` (FR-X-008/012 / SC-S-006)
- [ ] T034 [P] [US2] Source-deleted-mid-session test: referenced goal/habit disappears → projection row → "no longer shared", owner prompted, never a guessed value, in `backend/tests/unit/source-deleted.test.ts` (six-state matrix / FR-X-001)
- [ ] T035 [P] [US2] Integration test: real `GoalState` advance → projection recompute end-to-end in `backend/tests/integration/live-updates.test.ts`

### Implementation for User Story 2

- [ ] T036 [P] [US2] `CircleProgress` projection domain (dimensionless metric union + member_ref.is_self + freshness) in `backend/src/modules/social/domain/circle-progress.ts`
- [ ] T037 [US2] Recompute-and-publish service (idempotent on `source_event_id`; recomputes from real spine/Habits change events; no manual entry) in `backend/src/modules/social/services/recompute.ts` (FR-SOC-002)
- [ ] T038 [US2] Spine/Habits change-stream subscriber (feature-checked Habits; timeouts/retries; stale/feed-down state mapping) in `backend/src/modules/social/services/change-subscriber.ts` (FR-X-008/012)
- [ ] T039 [P] [US2] Mobile Circle Detail screen (member projection rows; live updates; all six states — Empty/Loading/Partial/Stale/Error/“no longer shared”; freshness chip on every row) in `mobile/src/features/social/circle-detail/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Revoke sharing and disappear from the circle, audited (Priority: P2)

**Goal**: A sharing member can revoke at any time; their projection is removed from every peer's view immediately (no cached copy survives); revocation, owner-side close, and member-side deletion are audited and cascade.

**Independent Test**: As a sharing member, revoke; confirm the projection vanishes from peers' views (including cached client state) and an audit event records actor + circle + timestamp.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T040 [P] [US3] Revocation test: revoke removes the projection from all peers' views (server omits; client must not render revoked cached projection) + audited in `backend/tests/integration/revoke.test.ts` (FR-SOC-002 / FR-X-007 / SC-S-004)
- [ ] T041 [P] [US3] Revoke idempotency test: revoking an already-revoked share is a no-op success, no duplicate audit event, in `backend/tests/unit/revoke-idempotency.test.ts` (data-model state transitions)
- [ ] T042 [P] [US3] Owner close/delete test: closing a circle tears down all share grants + projections (no orphan survives) in `backend/tests/integration/circle-close.test.ts` (FR-SOC-002)
- [ ] T043 [P] [US3] Deletion-cascade test: a member data-deletion request cascades to memberships, grants, projections within the 7-day SLA + audited in `backend/tests/integration/deletion-cascade.test.ts` (FR-X-013/019 / SC-S-009)

### Implementation for User Story 3

- [ ] T044 [US3] Revocation service (immediate server-side projection removal; idempotent; audited; invalidate cached projections) in `backend/src/modules/social/services/revoke.ts` (FR-SOC-002)
- [ ] T045 [US3] Owner circle-close + teardown service (revoke all grants, tear down all projections) in `backend/src/modules/social/services/circle-close.ts`
- [ ] T046 [US3] Deletion-cascade handler (crypto-shred/tombstone of memberships/grants/projections within 7 days; dormant-account anonymization) in `backend/src/modules/social/services/deletion-cascade.ts` (FR-X-013/019)
- [ ] T047 [P] [US3] Mobile Revoke / Close-Circle Confirm-Action sheets (recaps *what becomes hidden*; precise CTA "Stop sharing" / "Cesser de partager", "Close circle" / "Fermer le cercle"; disclaimer) in `mobile/src/features/social/consent/`

**Checkpoint**: US1–US3 independently functional — the full create/share/update/revoke consent lifecycle.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T048 [P] Implement `AccountabilitySignals` provided contract + signal-emitter to the **Inbox digest** pipeline (peer_milestone / streak_at_risk / circle_closed / share_revoked; never `critical`, never direct push) in `backend/src/modules/social/services/signal-emitter.ts` and `contracts/provided/accountability-signals.ts` (SC-S-010 / ux-foundations §6); provider contract test asserts no money/account field
- [ ] T049 [P] API-layer cross-circle / cross-member IDOR authorization test (server-side, not UI; 0 cross-user exposure; denied access audited) + RLS policy test in `backend/tests/integration/cross-user-authz.test.ts` (SC-S-002 / SC-015 / Principle V)
- [ ] T050 [P] Verify log redaction (no finance-derived value / member-identifier leak) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T051 [P] Bilingual + locale-format verification (EN/FR, fr-CA `72,5 %`) and WCAG 2.1 AA bilingual screen-reader labels on projection rows + consent sheets in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-S-007)
- [ ] T052 [P] Performance check: cached circle list/projections module-switch ≤ 300 ms; stale/miss → flagged/Unavailable state, not blocking fetch, in `mobile/tests/perf-social.test.ts` (FR-X-015 / SC-010)
- [ ] T053 Threat-model mitigation verification: no projection-write path; no money-movement endpoint; server-side cross-user authZ + audited denials; household-joint exclusion total; revoked-member cached-projection not rendered (spec Threat Model)
- [ ] T054 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + leak-proof/percentage-string/idempotency fixtures + consumer+provider contract tests green, incl. the provider no-money-field assertion)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (projection filter, freshness, bilingual label, audit, redaction, locale, authZ + RLS, consumed-contract clients, provided-contract registry). The **projection filter (T006)** is the leak-proof boundary and must land first.
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US2 (live updates) recomputes the projection produced by US1's filter — sequence US2 after US1.
  - US3 (revocation) acts on grants/projections created in US1 — sequence US3 after US1; US2 and US3 are otherwise independent and can be staffed in parallel.
- **Polish (Phase 6)** → depends on all three stories (signals, authZ, redaction/audit, a11y, perf, threat-model verification).

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005 in parallel.
- Foundational: T007–T011, T013, T014 in parallel (T006 projection filter first; T012 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US2 and US3 can be staffed in parallel by different developers once US1 lands.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T015 CircleProgress provider contract test (no-money-field assertion)
T016 GoalState consumer contract test
T017 leak-proof / percentage-string fixture (3000/5000 → "0.6")
T018 amount-metric rejection
T019 household-exclusion
T020 bilingual display_label
# Then domain models [P]:
T022 Circle domain
T023 CircleMembership domain
T024 ShareGrant domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (leak-proof single-metric circle; no amount/account/institution on the wire; bilingual; household-joint goals excluded) → demo.

### Incremental Delivery
US1 (MVP) → US2 (real-data live updates) → US3 (audited revocation/deletion) → Polish (signals, authZ, redaction/audit, a11y, perf, threat-model). Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- **No money path**: Social emits no cent value; the leak-proof fixture (T017) and the provider no-money-field assertion (T015/T048) guard FR-SOC-001 structurally.
- **Recommend-only / no manual entry**: no task creates a money-movement endpoint or a projection-write path (T031 + T053 verify).
- **Freshness**: stale projection is **flagged, not withheld** (dimensionless secondary metric, no money input) — T033 guards this.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

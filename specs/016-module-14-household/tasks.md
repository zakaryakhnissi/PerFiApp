---

description: "Task list for Module 14 — Household & Family"
---

# Tasks: Module 14 — Household & Family

**Input**: Design documents from `/specs/016-module-14-household/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Because Household is FinOS's authorization surface, the **API-layer IDOR / horizontal-escalation tests** and **RLS policy tests** are first-class and written before implementation. Each user story's failing tests are written before its implementation.

**Stack** (ratified — see [plan.md](./plan.md) Technical Context and [platform-decisions.md](../_platform/platform-decisions.md)): TypeScript/Node (NestJS 10) backend + React Native (Expo) mobile; `@finos/money` integer cents (no rates owned here); `@finos/format` for en-CA/fr-CA; Prisma + Postgres (`household` schema, RLS); CASL/RBAC-ABAC policy engine for `MemberScope`; Pact for contract tests; Jest; Testcontainers Postgres for integration. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2 → P3 within the module) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create household module structure per plan: `backend/src/modules/household/{domain,money,authz,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,security,unit}`, `mobile/src/features/household/{members,kid-money,dashboard}`, `mobile/tests/`
- [ ] T002 Initialize the module within the ratified NestJS monolith (`HouseholdModule`) + wire `mobile/src/features/household/` route group; declare deps on `@finos/money`, `@finos/format`, `@finos/contract-*`, Pact, Jest, Prisma in `backend/package.json` / `mobile/package.json`
- [ ] T003 [P] Configure lint/format incl. the banned-cross-module-import rule (dependency-cruiser) and the no-float-money lint in `backend/.eslintrc`
- [ ] T004 [P] Configure Jest + integer-cents money-fixture harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`
- [ ] T006 [P] Provision the `household` Postgres schema + per-schema DB role with **RLS enabled** on every household-scoped table in `backend/prisma/household.schema.prisma` (platform-decisions §5)

**Checkpoint**: Project builds; test runner green on an empty suite; `household` schema migrates with RLS on.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete. The authorization foundation (T012–T014) is the highest-risk surface in FinOS and blocks every story.

- [ ] T007 Implement integer-cents allowance/goal money helpers (exact integer addition for accrual; time-to-goal divide in arbitrary precision, **never on money**; no float) in `backend/src/modules/household/money/money.ts` (Principle IV)
- [ ] T008 [P] Implement / reuse `FreshnessStamp` value object + `isStale` check for consumed dashboard values in `backend/src/modules/household/domain/freshness.ts` (Principle VIII)
- [ ] T009 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) for household-level suggestions in `backend/src/modules/household/domain/reasoning.ts` (Principle VI)
- [ ] T010 [P] Implement the append-only, immutable `AuditEvent` store (membership/role/scope changes, chore/accrual/paid, **and `cross_user_access_denied`**), kept separate from debug logs, in `backend/src/modules/household/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T011 [P] Implement structured logging with PII + monetary-value (incl. kid amounts) redaction in `backend/src/modules/household/services/logging.ts` (Principle V / FR-X-014)
- [ ] T012 Implement `MemberScope` resolution: per-(viewer, subject, module) lookup with **default = none** (least privilege), explicit-`none` deny override, immediate revocation, expired-grant → `none`, in `backend/src/modules/household/authz/scope-resolver.ts` (FR-HH-001 / Constitution V)
- [ ] T013 Implement the server-side authZ guard: acting identity from the **validated session**, never a client-supplied `member_id`/`profile_id`; policy-engine `MemberScope` check on every cross-user request; deny → audit `cross_user_access_denied`, in `backend/src/modules/household/authz/authz.guard.ts` (FR-HH-001 / Principle V)
- [ ] T014 [P] Implement Postgres **RLS policies** (defense-in-depth) keyed on `auth.uid()` + household membership for all household-scoped tables in `backend/src/modules/household/authz/rls.policies.sql` (platform-decisions §5)
- [ ] T015 [P] Implement the step-up-MFA gate for role/scope mutations and member invites/removals in `backend/src/modules/household/authz/mfa-gate.ts` (FR-X-017)
- [ ] T016 [P] Implement en-CA/fr-CA locale formatter usage (monetary `1 234,56 $`/`5,00 $`, percent, date) via `@finos/format` in `backend/src/modules/household/money/locale.ts` (Principle II / FR-X-005)
- [ ] T017 [P] Implement consumed contract clients with version pinning + graceful degradation (timeouts/retries; absent module → Empty/Unavailable) in `backend/src/modules/household/contracts/consumed/` (`account-state.ts`, `goal-state.ts`, `merchant-graph.ts`, `connection-consent.ts`, `card-lineup.ts`, `status-state.ts`, `habit-progress.ts`, `safe-to-act.ts`) (Principle VII / FR-X-011/012)
- [ ] T018 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/household/contracts/provided/registry.ts` (Principle VII)

**Checkpoint**: Foundation ready — authZ + RLS + audit + money + locale + consumed clients in place; user stories can begin.

---

## Phase 3: User Story 1 — Fine-grained roles & per-module visibility (Priority: P1 within module) 🎯 MVP

**Goal**: A household owner adds members, assigns roles + per-module scopes; each member sees exactly what they were granted, enforced server-side on every cross-user request and audited on denial.

**Independent Test**: Add a second member with read-only access to exactly one module; confirm at the **API layer** they see that data and nothing else; confirm an un-granted module/member read (incl. supplying another `profile_id`) is denied and audited.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T019 [P] [US1] Provider contract test for `HouseholdRoles` against `contracts/provided/household-roles.schema.json` (carries no money, no secret) in `backend/tests/contract/household-roles.provider.test.ts`
- [ ] T020 [P] [US1] Provider contract test for `MemberScopes` against `contracts/provided/member-scopes.schema.json` (carries no money, no secret) in `backend/tests/contract/member-scopes.provider.test.ts`
- [ ] T021 [P] [US1] **API-layer IDOR test**: a request supplying another member's `member_id`/`profile_id` is denied; identity derives from session; denial audited — in `backend/tests/security/idor.test.ts` (FR-HH-001 / SC-H-001/003 / SC-015)
- [ ] T022 [P] [US1] **Horizontal-escalation test**: `adult`/`teen` cannot change roles/scopes; mutation needs `admin`/`owner` + step-up MFA; `owner` non-removable/non-demotable — in `backend/tests/security/horizontal-escalation.test.ts` (FR-HH-001 / FR-X-017 / SC-H-012)
- [ ] T023 [P] [US1] **Least-privilege test**: any un-granted (viewer, subject, module) tuple resolves to `none`; explicit `none` overrides — in `backend/tests/unit/scope-resolution.test.ts` (SC-H-002)
- [ ] T024 [P] [US1] **Revocation-immediacy / race test**: a revoked viewer's next request is denied with no cached data; revocation audited — in `backend/tests/security/revocation-race.test.ts` (SC-H-004)
- [ ] T025 [P] [US1] **RLS policy test**: cross-user/cross-household `SELECT` is blocked at the DB layer even if the service guard is bypassed — in `backend/tests/security/rls.test.ts` (platform-decisions §5)
- [ ] T026 [P] [US1] fr-CA role/scope label + CAD-in-scope formatting test (`1 234,56 $`, no single-language leak) in `backend/tests/unit/roles-scopes-locale.test.ts` (SC-H-007)
- [ ] T027 [P] [US1] Integration test: add member → assign role+scope → enforce visibility end-to-end on Testcontainers Postgres in `backend/tests/integration/roles-scopes.test.ts`

### Implementation for User Story 1

- [ ] T028 [P] [US1] `Household` + `Member`/`Membership` domain (roles enum, status, guardian relationships, one-`owner` invariant) in `backend/src/modules/household/domain/household.ts`
- [ ] T029 [P] [US1] `MemberScope`/`Grant` domain (none/read/propose; subject-controlled; guardian-over-minor exception) in `backend/src/modules/household/domain/member-scope.ts`
- [ ] T030 [US1] Roles/membership service (invite/join/suspend/leave; one-owner + last-admin protection; minor age-up) — all mutations MFA-gated + audited — in `backend/src/modules/household/services/membership.ts` (depends on T028, T012–T015)
- [ ] T031 [US1] Scope-grants service (grant/revoke; least-privilege default; immediate revocation; departed-member grants → none) — MFA-gated + audited — in `backend/src/modules/household/services/scope-grants.ts` (depends on T029, T012–T015)
- [ ] T032 [US1] Wire `HouseholdRoles` + `MemberScopes` provided contract outputs in `backend/src/modules/household/contracts/provided/household-roles.ts` and `member-scopes.ts`
- [ ] T033 [US1] Recommend-only household API: member/role/scope mutation endpoints (MFA-gated; NO money-movement endpoint) with the authZ guard applied in `backend/src/modules/household/api/members.ts`
- [ ] T034 [P] [US1] Mobile Members & Scopes screens (role/scope management, MFA step-up prompt, bilingual labels, WCAG SR labels) in `mobile/src/features/household/members/`

**Checkpoint**: US1 fully functional and independently testable (MVP) — server-side authZ + audit + RLS proven at the API layer.

---

## Phase 4: User Story 2 — Chore-based allowances & kid-friendly goals (Priority: P2 within module)

**Goal**: A guardian sets a chore-based allowance linked to a kid goal; completing a chore accrues the exact cents and advances the goal; the kid (constrained role) sees only their own tracker.

**Independent Test**: Set up a chore-allowance linked to a kid goal, mark a chore complete, confirm the allowance accrues by the exact reward, the goal advances by the same exact cents, and the `kid` sees only their own updated tracker (no switcher).

### Tests for User Story 2 (write first, must FAIL)

- [ ] T035 [P] [US2] Provider contract test for `KidGoals` (amounts are `MoneyCents` integer cents; no float) in `backend/tests/contract/kid-goals.provider.test.ts`
- [ ] T036 [P] [US2] Consumer contract test for `GoalState` (KidGoal mirrored for time-to-goal) in `backend/tests/contract/goal-state.consumer.test.ts`
- [ ] T037 [P] [US2] **Money fixture**: `$2.50` chore ×4 → exactly `1000` cents, no drift, in `backend/tests/unit/allowance-money.test.ts` (FR-HH-002 / SC-H-005)
- [ ] T038 [P] [US2] **Goal-advance fixture**: goal target `5000` / saved `1000` + `$5.00` chore → exactly `1500` cents (never `1499`/`1501`) in `backend/tests/unit/goal-advance.test.ts` (FR-HH-002 / SC-H-005)
- [ ] T039 [P] [US2] **Idempotency fixture**: replayed chore-completion (same `source_event_id`) does NOT double-accrue (accrual + goal-advance + "paid") in `backend/tests/unit/idempotency.test.ts` (FR-X-003 / SC-H-005)
- [ ] T040 [P] [US2] Habits-link test: a chore linked to a streak advances it from the **real** completion event only (never a manual bump) in `backend/tests/unit/chore-habit-link.test.ts` (FR-HH-002)
- [ ] T041 [P] [US2] **fr-CA money fixture**: `1000` cents renders `10,00 $` (not `$10.00`); FinOS-template chore labels in French in `backend/tests/unit/kid-money-locale.test.ts` (SC-H-007)
- [ ] T042 [P] [US2] `kid`-role isolation test: sees only own goals/habits, **no** profile switcher, no other member's finances in `backend/tests/security/kid-isolation.test.ts` (SC-H-009)
- [ ] T043 [P] [US2] Integration test: chore completion → accrual → goal advance → kid tracker end-to-end in `backend/tests/integration/kid-money.test.ts`

### Implementation for User Story 2

- [ ] T044 [P] [US2] `KidGoal` domain (target/saved integer cents, time-to-goal null-when-unknown, status) in `backend/src/modules/household/domain/kid-goal.ts`
- [ ] T045 [P] [US2] `Allowance`/`ChoreReward` domain (bilingual chore label, reward cents, cadence, links to kid goal + habit, accrued/paid ledger) in `backend/src/modules/household/domain/allowance.ts`
- [ ] T046 [US2] Kid-goals service (advance saved amount by exact cents; mirror to `GoalState`; time-to-goal precision divide, never on money) in `backend/src/modules/household/services/kid-goals.ts` (depends on T044, T007)
- [ ] T047 [US2] Allowance-accrual service (idempotent accrual keyed on `source_event_id`; advance linked goal; advance linked habit on real event; "marked paid" records a real-world hand-over — **no disbursement**) in `backend/src/modules/household/services/allowance.ts` (depends on T045, T046, T010)
- [ ] T048 [US2] Wire `KidGoals` provided contract output (to Goals/Spine + Habits) in `backend/src/modules/household/contracts/provided/kid-goals.ts`
- [ ] T049 [P] [US2] Mobile Kid Money screens: kid-friendly goal tracker + chore list (kid role: **no switcher**); "marked paid" routes through a **Confirm-Action sheet** with the not-regulated-advice disclaimer in `mobile/src/features/household/kid-money/`

**Checkpoint**: US1 + US2 both independently functional — exact-cents allowances, idempotent, kid-isolated, recommend-only.

---

## Phase 5: User Story 3 — Family Dashboard composed over consented data (Priority: P3 within module)

**Goal**: A member opens a Family Dashboard surfacing, per member, only the module data that member granted — each within scope, freshness-stamped, attributed, degrading gracefully.

**Independent Test**: With two members granting the viewer `read` on different modules, open the dashboard; confirm each panel shows only granted modules, each value carries a freshness chip, the "Viewing {Name}" attribution is unambiguous, and an unshipped/stale panel shows Empty/Unavailable — not fabricated data.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T050 [P] [US3] Consumer contract tests for `AccountState`, `MerchantGraph`, `ConnectionConsent` (M0), `CardLineup`, `StatusState` (M1), `HabitProgress` (M8), and `SafeToActSignal` (`finos:cashsafety/SafeToActSignal/1.0.0`, M3 — conflict precedence) in `backend/tests/contract/dashboard-consumers.test.ts`
- [ ] T051 [P] [US3] Scope-filtered composition test: each member panel shows **only** granted modules, filtered **server-side before transmission** in `backend/tests/integration/dashboard-scope-filter.test.ts` (FR-HH-001 / SC-H-001)
- [ ] T052 [P] [US3] Freshness/withhold test: stale **money** input (member balance) withholds; stale **secondary** value flags with a stale chip in `backend/tests/unit/dashboard-freshness.test.ts` (Principle VIII / SC-H-010)
- [ ] T053 [P] [US3] Graceful-degradation test: an unshipped/down consumed module → Empty/Unavailable, **0 zero-filled/fabricated** figures in `backend/tests/unit/dashboard-degradation.test.ts` (FR-X-012 / SC-H-010)
- [ ] T054 [P] [US3] Cash-Safety conflict-precedence test: a household suggestion conflicting with a member's `SafeToActSignal` → Conflict Banner, Cash Safety wins in `backend/tests/unit/dashboard-conflict.test.ts` (ux-foundations §3.1, §10.4)
- [ ] T055 [P] [US3] Integration test: multi-member dashboard with mixed scopes end-to-end in `backend/tests/integration/family-dashboard.test.ts`

### Implementation for User Story 3

- [ ] T056 [P] [US3] Dashboard panel domain (per-member, per-module panel with freshness + state: empty/loading/partial/stale/error/withheld) in `backend/src/modules/household/domain/dashboard-panel.ts`
- [ ] T057 [US3] Family-dashboard composer service: read consumed contracts via clients, apply `MemberScope` filter **server-side**, attach freshness, degrade absent modules, defer to `SafeToActSignal` on conflict in `backend/src/modules/household/services/family-dashboard.ts` (depends on T017, T012, T056)
- [ ] T058 [US3] Dashboard API (read-only; scope-filtered; recommend-only) with the authZ guard applied in `backend/src/modules/household/api/dashboard.ts`
- [ ] T059 [P] [US3] Mobile Family Dashboard screens: per-member panels with freshness chips, six-state matrix, persistent **"Viewing {Name}'s finances"** banner + one-tap "Back to my finances", Conflict Banner, bilingual + WCAG SR labels in `mobile/src/features/household/dashboard/`

**Checkpoint**: All three user stories independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T060 [P] Departed-member flow: **partial revocation** destroys only the leaver's `link_id` token (others untouched, FR-CORE-007); scopes over others → none; others' grants removed; all audited — test in `backend/tests/security/member-leaves.test.ts`
- [ ] T061 [P] Deletion / dormant retention: departed/deleted-member household data purged within 7 days (FR-X-013) / anonymized at the dormant bound (FR-X-019), cascading across household + modules holding derived state, in `backend/tests/integration/retention-deletion.test.ts`
- [ ] T062 [P] Verify log redaction (no PII / member balances / kid amounts) + audit-trail completeness (incl. every `cross_user_access_denied`) across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / SC-H-011)
- [ ] T063 [P] Social-inference mitigation: a kid/member who is also a circle member exposes only the server-computed `CircleProgress`, never household-scoped data (FR-SOC-001) in `backend/tests/security/social-projection.test.ts`
- [ ] T064 [P] Residency check: household data (incl. minors') stays in a Canadian region; no out-of-region processing without disclosure + PIPEDA agreement (FR-X-020) in `backend/tests/integration/residency.test.ts`
- [ ] T065 [P] Bilingual + locale-format verification (EN/FR; fr-CA `1 234,56 $` / `5,00 $`) and WCAG 2.1 AA bilingual screen-reader labels across Household screens in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016)
- [ ] T066 [P] Performance check: membership + cached dashboard panels module-switch ≤ 300 ms; slow/stale upstream → flagged Empty/Unavailable, not a blocking fetch, in `mobile/tests/perf-dashboard.test.ts` (FR-X-015 / SC-010)
- [ ] T067 Threat-model mitigation sweep: confirm no money-movement/disbursement endpoint exists; server-side authZ + RLS enforced on every cross-user path; every spec Threat Model row (IDOR, horizontal escalation, revocation race, minor over-exposure, departed-member token, Social inference, log leak, token-in-contract) has a passing test
- [ ] T068 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory money/idempotency fixtures + API-layer authZ + contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, **authZ + scope resolution + RLS + MFA gate**, locale, consumed clients, provided registry). The authZ foundation (T012–T015) is the highest-risk surface and must land first.
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US2 (kid money) depends on US1's role model (a `kid` is a constrained member) — sequence US2 after US1.
  - US3 (dashboard) depends on US1's scope layer and degrades gracefully for any not-yet-shipped consumed module — sequence US3 after US1; US2 and US3 are then independent of each other.
- **Polish (Phase 6)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation — including the **API-layer authZ tests** for US1.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T011, T014–T017 in parallel (T007 money first; T012/T013 scope-resolver + guard are sequential and gate the security tests).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 must land first (it gates US2/US3); then US2 and US3 can be staffed in parallel by different developers.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T019 HouseholdRoles provider contract test
T020 MemberScopes provider contract test
T021 API-layer IDOR test
T022 horizontal-escalation test
T023 least-privilege scope-resolution test
T024 revocation-immediacy/race test
T025 RLS policy test
T026 fr-CA role/scope locale test
# Then domain models [P]:
T028 Household + Member domain
T029 MemberScope domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (server-side authZ proven at the API layer: zero cross-user exposure, every denial audited, least-privilege default, immediate revocation) → demo. US1 is the module's reason to exist and is independently shippable on just the spine + role/scope layer.

### Incremental Delivery
US1 (authZ MVP) → US2 (kid money & allowances) → US3 (Family Dashboard) → Polish. Each story adds value without breaking earlier ones; US3 degrades gracefully for any consumed module not yet shipped.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing. The **API-layer IDOR/escalation tests** and **RLS tests** are non-negotiable for this module — UI filtering is never a substitute.
- `[P]` = different files, no incomplete-task deps.
- Money math: integer CAD cents, exact integer addition for accrual, time-to-goal divide in arbitrary precision (never on money) — fixtures T037/T038 guard against drift, T039 guards idempotency (Principle IV).
- Recommend-only: no task creates a money-movement / disbursement endpoint; "paid" records a real-world hand-over via a Confirm-Action sheet (T067 verifies, FR-X-003).
- Server-side authZ everywhere: acting identity from the validated session, never a client-supplied `member_id`/`profile_id`; two layers (policy engine + RLS); every denial audited.
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

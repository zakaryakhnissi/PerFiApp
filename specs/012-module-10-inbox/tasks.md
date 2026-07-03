---

description: "Task list for Module 10 — Inbox & Notifications"
---

# Tasks: Module 10 — Inbox & Notifications

**Input**: Design documents from `/specs/012-module-10-inbox/`

**Prerequisites**: plan.md, spec.md (US1–US4), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (INHERITED from [platform-decisions.md](../_platform/platform-decisions.md), confirmed in [plan.md](./plan.md)): TypeScript/Node (NestJS 10) backend + React Native (Expo) mobile; **BullMQ (Redis)** workers for ingestion/assembly/dispatch; `@finos/format` for locale rendering (Inbox **carries but never computes** money); Pact for contract tests; Jest; Testcontainers Postgres. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order: US1/US2 P1-within-module → US3/US4 P2-within-module) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US4 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create inbox module structure per plan: `backend/src/modules/inbox/{domain,ingestion,pipeline,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/inbox/{digest,breakthrough,email-cleanup,preferences}`, `mobile/tests/`
- [ ] T002 Initialize TypeScript project + dependencies (NestJS, BullMQ, `@finos/format`, Pact, Jest, Testcontainers) in `backend/package.json` and `mobile/package.json`
- [ ] T003 [P] Configure lint/format incl. banned cross-module imports + banned raw number formatting + banned float money in `backend/.eslintrc` and `mobile/.eslintrc`
- [ ] T004 [P] Configure Jest + relay/format-fixture test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`
- [ ] T006 [P] Provision BullMQ (Redis) test instance + stubbed Expo/EAS push transport (records dispatches, no APNs/FCM) in `backend/tests/support/push-stub.ts`

**Checkpoint**: Project builds; test runner green on an empty suite; worker harness boots.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Implement `MoneyCents` carry-only value object + ingest guard that **rejects/flags** a money value given as a binary float or bare number outside `MoneyCents` (no arithmetic, no FX) in `backend/src/modules/inbox/domain/money-cents.ts` (Principle IV / Clarifications Q3)
- [ ] T008 [P] Implement relayed `FreshnessStamp` value object + `isStale` passthrough (Inbox relays source verbatim, never re-derives) in `backend/src/modules/inbox/domain/freshness.ts` (Principle VIII)
- [ ] T009 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) in `backend/src/modules/inbox/domain/reasoning.ts` (Principle VI)
- [ ] T010 [P] Implement append-only, immutable `AuditEvent` store (types: digest_dispatched, breakthrough_delivered, critical_suppressed, unsubscribe_confirmed, cross_user_routing_denied), kept separate from debug logs, in `backend/src/modules/inbox/services/audit.ts` (Principle VI / FR-X-007 / FR-INB-008)
- [ ] T011 [P] Implement structured logging with PII + monetary-value redaction and **raw-email-body exclusion** in `backend/src/modules/inbox/services/logging.ts` (Principle V / FR-X-014 / FR-X-013)
- [ ] T012 [P] Implement en-CA/fr-CA locale rendering wrapper over `@finos/format` (monetary `1 234,56 $`, percent, date, relative time) in `backend/src/modules/inbox/services/format.ts` (Principle II / FR-X-005)
- [ ] T013 Implement server-side cross-profile / `MemberScope` authZ guard (routing + reads on validated session identity, never client-supplied `profileId`/`memberId`; `action_url` allowlisted to `^finos://`) in `backend/src/modules/inbox/api/authz.ts` (Principle V / Threat Model / SC-I-010)
- [ ] T014 [P] Implement consumed spine contract clients with version pinning + graceful degradation (timeouts/retries) in `backend/src/modules/inbox/contracts/consumed/` (`transaction-stream.ts`, `merchant-graph.ts`, `connection-consent.ts`) (Principle VII / FR-X-011/012)
- [ ] T015 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/inbox/contracts/provided/registry.ts` (Principle VII)
- [ ] T016 Implement idempotent ingestion primitive + dedup key (unique on `source_event_id`; `dedup_key = hash(module_id, event_type, subject_hash)` within 24 h) in `backend/src/modules/inbox/ingestion/idempotency.ts` (FR-INB-007 / Principle IV)
- [ ] T017 [P] Scaffold BullMQ worker pipeline (alert-ingest, digest-assembly, push-dispatch) with mandatory timeouts/retries/rate-limits/circuit-breakers in `backend/src/modules/inbox/pipeline/` (FR-X-012 / platform §6)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Unified Money Digest (Priority: P1 within module) 🎯 MVP

**Goal**: Consolidate every source module's actionable alerts into one (at most two) bilingual, sorted, deduplicated, budget-respecting daily digest.

**Independent Test**: Emit `ModuleAlertEvent`s from ≥ 2 modules within a window; assembly yields one (≤ two) push(es) listing the highest-priority item, every item actionable, sorted Critical → Important → Informational, dedup'd, with over-budget items queued (not dropped), in the active locale.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T018 [P] [US1] Provider contract test for `ModuleAlertEvent` (ingestion envelope; both EN+FR + CTA required; `action_url ^finos://`; `cad_amount` is `MoneyCents`) against `contracts/provided/module-alert-event.schema.json` in `backend/tests/contract/module-alert-event.provider.test.ts`
- [ ] T019 [P] [US1] Provider contract test for `NotificationDigest` against `contracts/provided/notification-digest.schema.json` in `backend/tests/contract/notification-digest.provider.test.ts`
- [ ] T020 [P] [US1] Tiering + safety-precedence ordering test (Critical → Important → Informational, then `safe_to_act` > `credit_hard_avoid` > `budget_headroom` > `optimization`; safety never below optimization) in `backend/tests/unit/ordering.test.ts` (FR-INB-004)
- [ ] T021 [P] [US1] Dedup test: same (`module_id`, `event_type`, `subject_hash`) within 24 h collapses to one item in `backend/tests/unit/dedup.test.ts` (SC-I-005)
- [ ] T022 [P] [US1] Budget test: budget (default 2) spent → further Important alert **queued** to next digest, never dropped, still in-app visible in `backend/tests/unit/budget.test.ts` (FR-INB-003 / SC-I-001)
- [ ] T023 [P] [US1] **Display/relay money fixture (mandatory)**: `cad_amount = 123456` renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA); a float/bare-number money value is **rejected/flagged** in `backend/tests/unit/money-relay-format.test.ts` (SC-I-004 / Clarifications Q3 / Principle IV)
- [ ] T024 [P] [US1] Bilingual-integrity test: an alert whose `payload` lacks `text_en` **or** `text_fr` **or** a CTA is **rejected** by the assembler in `backend/tests/unit/bilingual-reject.test.ts` (FR-INB-005 / SC-I-004)
- [ ] T025 [P] [US1] Idempotent assembly test: replayed assembly (same `digest_id`) produces no duplicate digest, no double-counted budget in `backend/tests/unit/assembly-idempotency.test.ts` (FR-INB-007 / SC-I-009)
- [ ] T026 [P] [US1] Integration test: emit alerts from 2+ modules → one (≤ two) digest, cadence-aware, in active locale in `backend/tests/integration/digest-assembly.test.ts`

### Implementation for User Story 1

- [ ] T027 [P] [US1] `InboxItem` domain (tier, safety_class, dedup_key, bilingual text, CTA, carried `cad_amount`, state, freshness, audit_ref) in `backend/src/modules/inbox/domain/inbox-item.ts`
- [ ] T028 [P] [US1] `NotificationDigest` domain (window, ordered items, `budget_consumed`, dispatch_state, freshness) in `backend/src/modules/inbox/domain/notification-digest.ts`
- [ ] T029 [US1] `ModuleAlertEvent` ingest validator (schema + in-process emitter identity, never client `module_id`; rejects/audits malformed/unauthenticated) in `backend/src/modules/inbox/ingestion/alert-validator.ts` (depends on T016) (FR-INB-005 / Threat Model)
- [ ] T030 [US1] Tiering + safety-precedence ordering service in `backend/src/modules/inbox/services/ordering.ts` (FR-INB-004)
- [ ] T031 [US1] Budget service (per-day money-push budget, queue-not-drop over-budget, in-app always visible) in `backend/src/modules/inbox/services/budget.ts` (FR-INB-003)
- [ ] T032 [US1] Digest assembler (normalize → dedup → order → budget → bilingual bundle), idempotent on `digest_id`, in `backend/src/modules/inbox/services/digest-assembler.ts` (depends on T029–T031) (FR-INB-002/007)
- [ ] T033 [US1] Wire alert-ingest + digest-assembly BullMQ workers in `backend/src/modules/inbox/pipeline/{alert-ingest.worker.ts,digest-assembly.worker.ts}`
- [ ] T034 [US1] Wire `ModuleAlertEvent` + `NotificationDigest` provided contract outputs in `backend/src/modules/inbox/contracts/provided/{module-alert-event.ts,notification-digest.ts}`
- [ ] T035 [US1] Read-only digest/items API (cached, freshness-stamped; no push API exposed to other modules) in `backend/src/modules/inbox/api/digest.ts`
- [ ] T036 [P] [US1] Mobile Inbox tab digest screen (sorted items, verb CTAs, freshness chips, locale-formatted CAD, badge with localized SR label) in `mobile/src/features/inbox/digest/`

**Checkpoint**: US1 fully functional and independently testable (platform-protective MVP).

---

## Phase 4: User Story 2 — Critical Breakthrough Alerts (Priority: P1 within module)

**Goal**: A time-sensitive safety alert breaks through the digest cadence immediately, respects the critical ceiling (1/day, excess coalesced), honors safety precedence, never amplifies stale money, and is never silently dropped.

**Independent Test**: Emit a `critical` alert with `expires_at` within the day → immediate breakthrough push bypassing cadence, counted against the ceiling; a 2nd critical is coalesced; a stale-money critical is flagged not pushed; a push-disabled critical is still in-app + audited.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T037 [P] [US2] Breakthrough test: `critical` + `expires_at` within day → immediate push bypassing digest cadence in `backend/tests/unit/breakthrough.test.ts` (SC-I-002)
- [ ] T038 [P] [US2] Critical-ceiling + coalescing test: 2nd critical same day coalesced into one breakthrough ("N urgent money alerts"), ordered by `safety_class`; each critical individually in-app in `backend/tests/unit/critical-ceiling.test.ts` (SC-I-003 / Clarifications Q2)
- [ ] T039 [P] [US2] Safety-precedence conflict test: Cash Safety `safe_to_act` vs Rewards `optimization` same moment → safety first + breakthrough; loser marked `overridden` ("see safety alert first"), never dropped in `backend/tests/unit/conflict-precedence.test.ts` (ux-foundations §3.1/§10.4)
- [ ] T040 [P] [US2] Stale-money relay test: critical with `freshness.is_stale = true` on a money input → flagged, **not** pushed; source withhold/flag relayed verbatim, nothing fabricated in `backend/tests/unit/stale-money-no-push.test.ts` (Clarifications Q4 / FR-X-008)
- [ ] T041 [P] [US2] No-silent-drop test: Critical tier push disabled → alert still surfaced in-app + suppression **audited** in `backend/tests/unit/critical-suppression-audit.test.ts` (Clarifications Q5 / SC-I-002)
- [ ] T042 [P] [US2] Expired-alert test: `expires_at` passed before delivery → dropped from push, shown expired/struck-through in-app in `backend/tests/unit/expired-alert.test.ts` (Edge Cases)
- [ ] T043 [P] [US2] Integration test: breakthrough end-to-end (immediate dispatch, ceiling, coalescing, audit) in `backend/tests/integration/breakthrough.test.ts`

### Implementation for User Story 2

- [ ] T044 [US2] Breakthrough + critical-ceiling service (bypass cadence iff `critical_pushes_today < ceiling`; coalesce excess; stale-money never elevated; expired dropped) in `backend/src/modules/inbox/services/breakthrough.ts` (FR-INB-003/005)
- [ ] T045 [US2] Conflict resolver (safety_class precedence ordering; mark loser `overridden`, set `overridden_by`, never drop) in `backend/src/modules/inbox/services/conflict-resolver.ts` (FR-INB-004)
- [ ] T046 [US2] Push-dispatch worker (idempotent on `digest_id`; budget + ceiling enforced before handoff; suppression-by-preference still surfaces critical in-app + audits) in `backend/src/modules/inbox/pipeline/push-dispatch.worker.ts` (FR-INB-007/008 / Clarifications Q5)
- [ ] T047 [P] [US2] Mobile breakthrough surfacing (immediate in-app prominent indicator + push; expired struck-through; conflict banner) in `mobile/src/features/inbox/breakthrough/`

**Checkpoint**: US1 + US2 both independently functional (digest + safety breakthrough).

---

## Phase 5: User Story 3 — Email Subscription Clean-Up (impulse-spend-first) (Priority: P2 within module)

**Goal**: List promotional senders impulse-spend-first, propose-confirm-execute unsubscribe (never silent), retain sender identity + classification only (never raw bodies), and cascade-delete email-sourced data within 7 days of revocation.

**Independent Test**: With email connected, senders are listed impulse-first with "why first" reasoning; unsubscribe is a confirmed `UnsubscribeAction`; the store holds no raw body; revocation purges email-sourced data within 7 days; feed/parser failure degrades gracefully.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T048 [P] [US3] Provider contract test for `UnsubscribeAction` against `contracts/provided/unsubscribe-action.schema.json` in `backend/tests/contract/unsubscribe-action.provider.test.ts`
- [ ] T049 [P] [US3] Consumer contract tests for `TransactionStream`, `MerchantGraph`, `ConnectionConsent` in `backend/tests/contract/spine-consumers.test.ts`
- [ ] T050 [P] [US3] Impulse-ranking test: senders ordered impulse-first via spend signal; fallback to curated heuristic marks picture incomplete (`signal_source = curated_heuristic`); "why first" `Reasoning` bilingual for 100% of senders in `backend/tests/unit/impulse-rank.test.ts` (SC-I-006 / FR-INB-001)
- [ ] T051 [P] [US3] Recommend-never-execute test: unsubscribe stays `proposed` until explicit confirmation; execution idempotent on `action_id`; no silent unsubscribe in `backend/tests/unit/unsubscribe-confirm.test.ts` (SC-I-012 / Clarifications Q6)
- [ ] T052 [P] [US3] **Raw-body non-retention test (mandatory)**: after parsing, store/cache/log hold **0** raw bodies — only sender identity + classification in `backend/tests/unit/no-body-retention.test.ts` (SC-I-007 / FR-X-013)
- [ ] T053 [P] [US3] **Revocation cascade test**: revoking email access deletes all `email_sourced = true` rows + email-only enrichment within 7 days, regardless of store in `backend/tests/integration/revocation-cascade.test.ts` (SC-I-008 / FR-X-013)
- [ ] T054 [P] [US3] Graceful-degradation test: email feed/parser timeout → Error/Unavailable state + backoff retry; partial list never shown as complete in `backend/tests/unit/email-degradation.test.ts` (FR-X-012)
- [ ] T055 [P] [US3] Integration test: email clean-up end-to-end (connect → rank → confirm unsubscribe → audit) in `backend/tests/integration/email-cleanup.test.ts`

### Implementation for User Story 3

- [ ] T056 [P] [US3] `PromotionalSender` domain (identity + classification + impulse_score + `email_sourced`; **no body field**) in `backend/src/modules/inbox/domain/promotional-sender.ts` (FR-X-013)
- [ ] T057 [P] [US3] `UnsubscribeAction` domain (action enum, impulse_rank, reasoning, execution_state, confirmed_at) in `backend/src/modules/inbox/domain/unsubscribe-action.ts`
- [ ] T058 [P] [US3] `EmailParserPort` interface + adapter that parses transiently and **discards raw bodies** (retain identity + classification only) in `backend/src/modules/inbox/services/email-parser-port.ts` (research §4 / NR-6 / FR-X-013)
- [ ] T059 [P] [US3] `ImpulseRanker` (spend signal from `TransactionStream`/`MerchantGraph`; curated-heuristic fallback marks Partial; bilingual reasoning) in `backend/src/modules/inbox/services/impulse-ranker.ts` (FR-INB-001 / SC-I-006)
- [ ] T060 [US3] Unsubscribe service (propose → user-confirm → execute, idempotent on `action_id`; audited on confirm) in `backend/src/modules/inbox/services/unsubscribe.ts` (Clarifications Q6 / SC-I-012)
- [ ] T061 [US3] Revocation-cascade handler (on `ConnectionConsent` revoke → crypto-shred/tombstone all `email_sourced` data within 7 days) in `backend/src/modules/inbox/services/revocation-cascade.ts` (FR-X-013 / platform D6)
- [ ] T062 [US3] Wire `UnsubscribeAction` provided contract in `backend/src/modules/inbox/contracts/provided/unsubscribe-action.ts`
- [ ] T063 [P] [US3] Mobile Email Clean-Up screen (sender list impulse-first, "why first", unsubscribe/roll-up/keep, Confirm-Action sheet with not-regulated-advice disclaimer) in `mobile/src/features/inbox/email-cleanup/`

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: User Story 4 — Notification Preferences & Quiet Controls (Priority: P2 within module)

**Goal**: Tier-push opt-in/out, digest cadence, quiet hours, and per-source mute — subject to the non-suppressible-safety invariant (critical safety always at least in-app, suppression audited).

**Independent Test**: Change tier-push/cadence/quiet/mute and emit alerts of each tier; delivery honors preferences while a critical safety alert remains at least in-app and its suppression is audited.

### Tests for User Story 4 (write first, must FAIL)

- [ ] T064 [P] [US4] Provider contract test for `NotificationPreference` against `contracts/provided/notification-preference.schema.json` in `backend/tests/contract/notification-preference.provider.test.ts`
- [ ] T065 [P] [US4] Preferences test: Informational "in-app only" → no push; quiet hours defer non-critical; muted source suppresses non-critical push in `backend/tests/unit/preferences.test.ts` (FR-INB-006 / Clarifications Q5)
- [ ] T066 [P] [US4] Non-suppressible-safety invariant test: `non_suppressible_safety` cannot be false; a critical safety alert from a muted/push-disabled source is still surfaced in-app + suppression audited in `backend/tests/unit/non-suppressible-safety.test.ts` (FR-INB-006 / SC-I-002)
- [ ] T067 [P] [US4] Integration test: preferences end-to-end across tiers/cadence/quiet/mute in `backend/tests/integration/preferences.test.ts`

### Implementation for User Story 4

- [ ] T068 [P] [US4] `NotificationPreference` domain (tier_push, cadence, quiet_hours, muted_sources, budget_limit, critical_ceiling, `non_suppressible_safety` const true) in `backend/src/modules/inbox/domain/notification-preference.ts`
- [ ] T069 [US4] Preferences service (apply tier/cadence/quiet/mute at dispatch; enforce non-suppressible-safety; audit suppression) in `backend/src/modules/inbox/services/preferences.ts` (FR-INB-006)
- [ ] T070 [US4] Wire `NotificationPreference` provided contract in `backend/src/modules/inbox/contracts/provided/notification-preference.ts`
- [ ] T071 [P] [US4] Mobile Notification Preferences screen (tier toggles, cadence, quiet hours, per-source mute; localized) in `mobile/src/features/inbox/preferences/`

**Checkpoint**: All four user stories independently functional.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T072 [P] Cross-user / IDOR authorization test (API-layer, not UI): 0 cross-user alert/digest exposure; routing on session identity + `MemberScope`; denied attempts audited in `backend/tests/integration/cross-user-authz.test.ts` (SC-I-010 / Principle V / Threat Model)
- [ ] T073 [P] Anti-phishing test: every item/push `action_url` matches `^finos://`; an alert with an external URL is rejected in `backend/tests/unit/action-url-allowlist.test.ts` (Threat Model)
- [ ] T074 [P] Spoofed/malformed-alert test: schema-invalid or unauthenticated-emitter `ModuleAlertEvent` rejected + audited in `backend/tests/unit/alert-injection.test.ts` (Threat Model)
- [ ] T075 [P] Verify log redaction (no PII / monetary value / raw email body) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014 / FR-X-013)
- [ ] T076 [P] Recommend-only verification: no money-movement endpoint and no push API exposed to other modules (they emit `ModuleAlertEvent` only) in `backend/tests/integration/recommend-only.test.ts` (FR-X-003 / SC-I-012)
- [ ] T077 [P] Bilingual + locale-format verification (EN/FR, fr-CA `1 234,56 $`, percent, date) and WCAG 2.1 AA bilingual screen-reader labels incl. Inbox-badge label in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-011)
- [ ] T078 [P] Performance check: cached Inbox-tab module-switch ≤ 300 ms; assembly/dispatch off the hot path; cache miss → skeleton, not blocking fetch in `mobile/tests/perf-inbox.test.ts` (FR-X-015 / SC-010)
- [ ] T079 [P] Residency / subprocessor-register check: email-parser + push subprocessors satisfy Canadian residency or are disclosed + agreement-backed; register is a go-live gate in `backend/tests/integration/residency-register.test.ts` (FR-X-020 / SC-I-013)
- [ ] T080 Threat-model mitigation review: confirm every Threat Model row is enforced server-side (IDOR, body non-retention, revocation cascade, residency, redaction, spoofed-alert, non-suppressible-safety, deep-link allowlist) (spec Threat Model)
- [ ] T081 Run [quickstart.md](./quickstart.md) validation end-to-end (all four user-story checks + mandatory display/relay fixtures + body non-retention + contract tests green)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money-carry guard, freshness relay, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry, idempotency primitive, worker pipeline scaffold).
- **User Stories (Phases 3–6)** → all depend on Foundational; then independently testable.
  - US2 (breakthrough) builds on US1's assembler/dispatch primitives; sequence US2 after US1.
  - US3 (email clean-up) is independent of US1/US2 (email is opt-in; FR-INB-001 ⟂ FR-INB-002) and can be staffed in parallel after Foundational.
  - US4 (preferences) refines dispatch behavior from US1/US2; sequence after US1 (and US2 for the critical-suppression invariant).
- **Polish (Phase 7)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → pipeline/worker wiring → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T012, T014, T015, T017 in parallel (T007 money-carry first; T013 authZ, T016 idempotency independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, **US3 can be staffed in parallel** with US1/US2 (email path is independent); US2 sequences after US1, US4 after US1/US2.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T018 ModuleAlertEvent provider contract test
T019 NotificationDigest provider contract test
T020 tiering + safety-precedence ordering
T021 dedup (24h window)
T022 budget queue-not-drop
T023 display/relay money fixture ($1,234.56 / 1 234,56 $; float rejected)
T024 bilingual-reject (missing EN/FR/CTA)
T025 idempotent assembly
# Then domain models [P]:
T027 InboxItem domain
T028 NotificationDigest domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (one bilingual sorted digest, dedup'd, budget-respecting, display fixture exact) → demo. This is the platform-protective MVP: once US1 ships, other modules can emit alerts and **no module pushes directly**.

### Incremental Delivery
US1 (digest MVP) → US2 (safety breakthrough) → US3 (email clean-up) → US4 (preferences) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- **Money is carried, never computed** (Principle IV / Clarifications Q3): the only "money" tasks are relay/format fixtures (T023) and the ingest float-rejection guard (T007) — no half-up rounding or FX fixture is owned here.
- **Recommend-only**: no task creates a money-movement endpoint or a direct push API for other modules (T076 verifies); unsubscribe is the sole consequential action and is propose-confirm-idempotent.
- **No raw email body** is ever persisted (T052) and email-sourced data is purged within 7 days of revocation (T053, T061).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

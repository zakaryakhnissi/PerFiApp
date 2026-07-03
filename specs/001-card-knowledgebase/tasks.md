# Tasks: Card Knowledgebase & Best Card Recommender

**Input**: Design documents from `/specs/001-card-knowledgebase/`

**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md, quickstart.md

**Tests**: Test tasks for `packages/money` and `packages/recommender` are MANDATORY and
precede implementation (Constitution Principle V). API contract tests are included per
the plan's contracts; UI tests are limited to the acceptance flows in quickstart.md.

**Organization**: Grouped by user story so each story is independently implementable and
testable.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: US1 (recommendation, P1), US2 (browse, P2), US3 (wallet, P3)

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Monorepo skeleton matching plan.md's structure

- [ ] T001 Create pnpm workspace: root `package.json`, `pnpm-workspace.yaml` (apps/*, packages/*), strict root `tsconfig.base.json`
- [ ] T002 [P] Scaffold Expo app (TypeScript strict) in `apps/mobile/`
- [ ] T003 [P] Scaffold NestJS app in `apps/api/` with `docker-compose.yml` for PostgreSQL 16
- [ ] T004 [P] Configure ESLint + Prettier at root, including the no-float-money lint rule (ban `parseFloat`/float literals in `packages/money` consumers) per research.md R2
- [ ] T005 [P] Create empty package skeletons with strict tsconfig + Jest config: `packages/money/`, `packages/recommender/`, `packages/kb-schema/`, `packages/i18n/`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared packages and data every story depends on. **T006–T008 are the
Principle V fail-first gate for money math — no implementation before these exist and fail.**

- [ ] T006 Write failing rounding tests in `packages/money/test/rounding.test.ts`: half-even at .5-cent boundaries for cashback path (`cents × bps / 10_000`) and points path (`points × milliCents / 1_000`), zero/negative/non-integer rejection
- [ ] T007 Write failing Money type tests in `packages/money/test/money.test.ts`: integer-cents construction, CAD literal, basis-point and milli-cent conversions from data-model.md value types
- [ ] T008 Verify T006–T007 fail (no implementation yet), then implement `packages/money/src/` (Money, RateBps, PointValueMilliCents, round_half_even) until green — commit tests before implementation
- [ ] T009 [P] Implement `packages/kb-schema/src/`: zod schemas for BilingualText, Card, RewardProgram, SpendCategory (fixed 10-enum), KnowledgebaseSnapshot, Wallet per data-model.md
- [ ] T010 [P] Implement `packages/i18n/`: `en-CA.json` + `fr-CA.json` resources, generated key type, and a `check-keys` script failing on divergent key sets (FR-013 gate)
- [ ] T011 Author initial curated data in `data/knowledgebase/`: ≥10 cards across ≥3 issuers + reward programs + 10 category labels, validating against kb-schema (expand to SC-004's 30/5 in T031)
- [ ] T012 Implement `apps/api/src/seed/`: validate `data/knowledgebase/*` with kb-schema and load into PostgreSQL; expose `pnpm --filter api seed`

**Checkpoint**: money package green (test-first), schemas + seed data exist — user story
work can begin

---

## Phase 3: User Story 1 — Get the best card for a purchase (Priority: P1) 🎯 MVP

**Goal**: On-device deterministic ranking with transparent, localized math

**Independent Test**: Wallet with two cards of different grocery rates → recommendation
for $100.00 groceries shows $2.00 vs $1.50 with explanations, in both languages
(quickstart scenario 3)

### Tests for User Story 1 (MANDATORY — financial logic, fail-first per Principle V)

- [ ] T013 [US1] Write failing oracle-table tests in `packages/recommender/test/oracle.test.ts`: ≥12 hand-computed cases per contracts/recommender.md (cashback, points, default valuation, ties, per-$100 basis, zero-bonus category) asserting exact cents
- [ ] T014 [P] [US1] Write failing fast-check property tests in `packages/recommender/test/properties.test.ts`: determinism C1, wallet-permutation C2, tie-break totality C5
- [ ] T015 [P] [US1] Write failing behavior tests in `packages/recommender/test/behavior.test.ts`: C4 fee-sunk, C6 bonus-else-base, C7 default-valuation disclosure, C8 cap disclosure, C9 invalid amount error, C10 missingCardIds
- [ ] T016 [US1] Verify T013–T015 all fail, then implement `packages/recommender/src/rankCards.ts` until the full suite is green — commit tests before implementation

### Implementation for User Story 1

- [ ] T017 [P] [US1] Add explanation i18n keys (rate applied, valuation, fee-sunk, default-valuation, cap disclosures) to `packages/i18n/en-CA.json` and `fr-CA.json`
- [ ] T018 [US1] Build recommendation screen in `apps/mobile/src/screens/Recommend.tsx`: category picker (10 categories), optional amount input with localized validation (C9), ranked results with expected value via `Intl.NumberFormat` and rendered explanation
- [ ] T019 [US1] Wire screen to `packages/recommender` + cached snapshot in `apps/mobile/src/store/recommend.ts`; empty-wallet state routes to wallet flow (US3 dependency is a stub link at this point)
- [ ] T020 [US1] Add jest-expo acceptance test in `apps/mobile/src/screens/__tests__/Recommend.test.tsx` covering spec US1 scenarios 1–4 (incl. language switch)

**Checkpoint**: US1 fully functional with a hand-seeded wallet fixture — the MVP moment

---

## Phase 4: User Story 2 — Browse the card knowledgebase (Priority: P2)

**Goal**: Bilingual KB browsing/filtering, served versioned from the API, cached on device

**Independent Test**: Quickstart scenario 4 — list, filters, detail view, language toggle

- [ ] T021 [P] [US2] Contract e2e tests in `apps/api/test/kb.e2e-spec.ts`: knowledgebase-api.md invariants 1–5 (bilingual completeness, resolvable refs, consistent kbVersion, integer-only payloads, valid dataAsOf) + filter params
- [ ] T022 [US2] Implement API endpoints in `apps/api/src/{cards,programs,categories}/`: GET /v1/cards (+filters, ETag), /v1/cards/:id, /v1/reward-programs, /v1/spend-categories, /v1/kb-version per contract
- [ ] T023 [US2] Implement KB cache store in `apps/mobile/src/store/kb.ts`: fetch, zod-validate, persist snapshot with kbVersion, refresh when /v1/kb-version is newer, offline read path
- [ ] T024 [P] [US2] Build KB list screen with search + no-fee/bonus-category filters in `apps/mobile/src/screens/CardList.tsx`
- [ ] T025 [P] [US2] Build card detail screen (all FR-001 fields, dataAsOf, cap disclosures) in `apps/mobile/src/screens/CardDetail.tsx`

**Checkpoint**: KB browsable offline after first sync, in both languages

---

## Phase 5: User Story 3 — Manage my wallet (Priority: P3)

**Goal**: On-device wallet the recommender ranks

**Independent Test**: Quickstart scenario 5 — add/remove, empty state, ranking reflects wallet

- [ ] T026 [US3] Implement wallet store in `apps/mobile/src/store/wallet.ts`: AsyncStorage, zod-validated versioned payload, idempotent add/remove, missing-card surfacing (data-model.md)
- [ ] T027 [US3] Build wallet screen (add from KB search, remove, "no longer listed" state) in `apps/mobile/src/screens/Wallet.tsx`
- [ ] T028 [US3] Replace T019's stub: empty-wallet recommendation state now routes into the real wallet flow; jest-expo test for spec US3 scenarios 1–3 in `apps/mobile/src/screens/__tests__/Wallet.test.tsx`

**Checkpoint**: All three stories independently green

---

## Phase 6: Polish & Cross-Cutting

- [ ] T029 [P] Wire CI: money/recommender/kb-schema tests, API e2e, i18n key-parity check, KB data validation as required jobs in `.github/workflows/ci.yml`
- [ ] T030 [P] Recommendation performance check: <50 ms for a 10-card wallet (plan.md goal) as a test in `packages/recommender/test/perf.test.ts`
- [ ] T031 Expand `data/knowledgebase/` to ≥30 cards across the 5 largest issuers (SC-004), bilingual fields complete
- [ ] T032 Run quickstart.md scenarios 1–6 end-to-end (incl. airplane-mode offline pass) and record results in `specs/001-card-knowledgebase/quickstart-results.md`

---

## Dependencies

- Phase 1 → Phase 2 → user stories. **US1 (Phase 3) depends only on Phases 1–2** (uses a
  wallet fixture until US3). US2 needs T009/T011/T012. US3 needs T009 only.
- Strict orderings: T006/T007 → T008; T013/T014/T015 → T016; T021 before T022 merges;
  T019 → T028. US2 and US3 are independent of each other and can proceed in parallel
  after Phase 2.

## Parallel Example (after Phase 2 checkpoint)

```text
Developer/agent A: T013–T020 (US1 — recommender TDD then UI)
Developer/agent B: T021–T025 (US2 — API + browse)
Developer/agent C: T026–T027 (US3 — wallet store/screen; T028 waits on T019)
```

## Implementation Strategy

MVP = Phases 1–3 (US1 with fixture wallet + seed KB). Ship-shaped increment after each
story checkpoint. Test-first commits for T006–T008 and T013–T016 are non-negotiable and
reviewable in history (failing-test commit precedes implementation commit).

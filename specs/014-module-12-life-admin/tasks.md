---

description: "Task list for Module 12 — Life Admin & Docs"
---

# Tasks: Module 12 — Life Admin & Docs

**Input**: Design documents from `/specs/014-module-12-life-admin/`

**Prerequisites**: plan.md, spec.md (US1–US3), research.md, data-model.md, contracts/

**Tests**: MANDATORY for FinOS — Constitution Principle III (Test-First) is NON-NEGOTIABLE and Principle VII requires consumer+provider contract tests in CI. Each user story's failing tests are written before its implementation.

**Stack** (inherited from [platform-decisions.md](../_platform/platform-decisions.md) via [plan.md](./plan.md)): TypeScript/Node (NestJS 10, Fastify) backend + React Native (Expo) mobile; integer cents via `@finos/money` (no rate/rounding math here), `@finos/format` for fr-CA; Prisma on the `lifeadmin` Postgres schema with RLS; S3 + KMS (`ca-central-1`) per-subject envelope encryption for bytes; BullMQ for the reminder job; Pact for contract tests; Jest. Paths below assume that layout.

**Organization**: Tasks grouped by user story (priority order P1 → P2) for independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: parallelizable (different files, no incomplete-task deps)
- **[Story]**: US1..US3 (user-story phases only)

---

## Phase 1: Setup (Shared Infrastructure)

- [ ] T001 Create lifeadmin module structure per plan: `backend/src/modules/lifeadmin/{domain,money,storage,services,contracts/consumed,contracts/provided,api}`, `backend/tests/{contract,integration,unit}`, `mobile/src/features/lifeadmin/{receipt-vault,warranty,document-wallet}`, `mobile/tests/`
- [ ] T002 Initialize the NestJS `LifeAdminModule` + dependencies (`@finos/money`, `@finos/format`, Prisma, Pact, BullMQ, Jest) wired into the modular monolith in `backend/src/modules/lifeadmin/lifeadmin.module.ts`
- [ ] T003 [P] Configure lint/format incl. **no-float-money** and **no banned cross-module import** boundary rules in `backend/.eslintrc` (Principle IV / VII)
- [ ] T004 [P] Configure Jest + money-fixture test harness in `backend/jest.config.ts`
- [ ] T005 [P] Configure Pact broker/CI wiring for consumer+provider contract tests in `backend/pact.config.ts`
- [ ] T006 [P] Define the `lifeadmin` Prisma schema (RLS on every `profile_id`-scoped table; append-only grant on the audit table — no UPDATE/DELETE; `*_cents` BIGINT, never float) in `backend/src/modules/lifeadmin/lifeadmin.prisma`

**Checkpoint**: Project builds; test runner green on an empty suite.

---

## Phase 2: Foundational (Blocking Prerequisites)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [ ] T007 Implement integer-cents helpers (exact-equality comparison, big-ticket `≥` floor check; **NO rate/FX/rounding math** — this module owns none, asserted by test) in `backend/src/modules/lifeadmin/money/money.ts` (Principle IV)
- [ ] T008 [P] Implement `FreshnessStamp` value object + `isStale` check (source, observed_at, threshold) in `backend/src/modules/lifeadmin/domain/freshness.ts` (Principle VIII)
- [ ] T009 [P] Implement bilingual `Reasoning` value object (inputs, rationale_en, rationale_fr) in `backend/src/modules/lifeadmin/domain/reasoning.ts` (Principle VI)
- [ ] T010 [P] Implement append-only, immutable `AuditEvent` store (document_viewed/exported/shared/share_revoked/deleted/ambiguity_resolved/reminder_emitted), kept separate from debug logs, in `backend/src/modules/lifeadmin/services/audit.ts` (Principle VI / FR-X-007)
- [ ] T011 [P] Implement structured logging with PII + monetary-value + document-title + OCR-text redaction in `backend/src/modules/lifeadmin/services/logging.ts` (Principle V / FR-X-014)
- [ ] T012 [P] Implement en-CA/fr-CA locale formatter integration (monetary `1 234,56 $`, date) via `@finos/format` in `backend/src/modules/lifeadmin/money/locale.ts` (Principle II / FR-X-005)
- [ ] T013 Implement server-side cross-profile authZ guard + `profile_id` scoping (session identity, never client-supplied id) + RLS enforcement in `backend/src/modules/lifeadmin/api/authz.ts` (Principle V / FR-X-010)
- [ ] T014 [P] Implement consumed spine contract clients with version pinning + graceful degradation (timeouts/retries; version-skew disables auto-linking) in `backend/src/modules/lifeadmin/contracts/consumed/` (`transaction-stream.ts`, `merchant-graph.ts`) (Principle VII / FR-X-011/012)
- [ ] T015 [P] Implement provided-contract schema registry + semver loader (from `contracts/provided/*.schema.json`) in `backend/src/modules/lifeadmin/contracts/provided/registry.ts` (Principle VII)
- [ ] T016 [P] Implement Canadian-region object-storage adapter (`StorageRef`: object_key + `kms_envelope_per_subject` + `ca-central-1`; per-request, per-grant, short-lived signed-URL minting; DB never holds bytes/URLs/credentials) in `backend/src/modules/lifeadmin/storage/object-store.ts` (Principle V / FR-X-009/020, research §1)
- [ ] T017 [P] Implement crypto-shred deletion (per-subject key-shred + tombstone, preserving the append-only log) + email-sourced purge cascade hook in `backend/src/modules/lifeadmin/services/deletion.ts` (FR-X-013/019, platform-decisions §5)

**Checkpoint**: Foundation ready — user stories can begin.

---

## Phase 3: User Story 1 — Receipt → transaction auto-linking (Priority: P1) 🎯 MVP

**Goal**: Upload a receipt and auto-link it to the matching spine transaction by exact integer-cent amount + merchant + date; surface ambiguity for user confirmation; never guess or silently tie-break.

**Independent Test**: With ≥1 account connected (so `TransactionStream` is populated), upload a receipt matching exactly one posted transaction; confirm it links with matched amount/date/merchant + freshness; the `4799 == 4799 != 4800` fixture is exact; two equal candidates surface as `ambiguous_pending`; fr-CA renders `1 234,56 $`.

### Tests for User Story 1 (write first, must FAIL)

- [ ] T018 [P] [US1] Provider contract test for `ReceiptLinks` against `contracts/provided/receipt-links.schema.json` in `backend/tests/contract/receipt-links.provider.test.ts`
- [ ] T019 [P] [US1] Consumer contract tests for `TransactionStream` + `MerchantGraph` (pinned versions; pending/duplicate exclusion semantics) in `backend/tests/contract/spine-consumers.test.ts`
- [ ] T020 [P] [US1] Money fixture: exact integer-cent equality — `4799` matches `cad_amount=4799`, does NOT match `4800`; no float/percentage tolerance, in `backend/tests/unit/money-fixtures.test.ts` (FR-DOC-001 / SC-D-002)
- [ ] T021 [P] [US1] Ambiguity fixture: two posted `cad_amount=4799` same-merchant same-day transactions ⇒ `ambiguous_pending`, both surfaced, neither auto-links, in `backend/tests/unit/receipt-match-ambiguity.test.ts` (umbrella AS-4 / SC-D-001)
- [ ] T022 [P] [US1] Candidate-eligibility test: `pending`/`merged_duplicate`/`suspected_duplicate` excluded; only `posted` + `dedup_state ∈ {unique, merged_primary}` eligible, in `backend/tests/unit/receipt-candidate-eligibility.test.ts` (FR-DOC-001 / SC-D-002)
- [ ] T023 [P] [US1] Stale-feed test: stale `TransactionStream` ⇒ link **flagged** (`is_stale=true`), "Refresh transactions" affordance, never silently `matched`, in `backend/tests/unit/receipt-stale-flag.test.ts` (FR-X-008 / SC-D-007)
- [ ] T024 [P] [US1] Unmatched + manual-link test: 0 candidates ⇒ `unmatched` (stored/searchable); user manual-link ⇒ `user_confirmed`, audited, in `backend/tests/unit/receipt-unmatched.test.ts` (FR-DOC-001)
- [ ] T025 [P] [US1] Idempotency test: replayed match write keyed on `(profile_id, document_id, transaction_id)` does not double-link; re-upload (same upload id / content hash) folds onto existing document, in `backend/tests/unit/receipt-idempotency.test.ts` (FR-X-003)
- [ ] T026 [P] [US1] fr-CA formatting test: `123456` cents ⇒ `1 234,56 $`; foreign-currency original labelled with ISO code, in `backend/tests/unit/receipt-locale.test.ts` (FR-X-005 / SC-D-008)
- [ ] T027 [P] [US1] Integration test: upload receipt → auto-link end-to-end in `backend/tests/integration/receipt-vault.test.ts`

### Implementation for User Story 1

- [ ] T028 [P] [US1] `Document` + `ReceiptLink` domain (match_state, match_method, candidate_transaction_ids, receipt_amount integer cents, reasoning, freshness, amount_source incl. provisional `ocr`) in `backend/src/modules/lifeadmin/domain/receipt-link.ts`
- [ ] T029 [US1] Receipt-matcher service (exact integer-cent + merchant + date against posted/non-duplicate rows; ≥2 ⇒ `ambiguous_pending`; 0 ⇒ `unmatched`; stale ⇒ flag; bilingual reasoning) in `backend/src/modules/lifeadmin/services/receipt-matcher.ts` (depends on T028, T014)
- [ ] T030 [US1] Document-store service (upload via client upload id, content-hash dedup, `StorageRef` via object-store adapter; metadata only in DB) in `backend/src/modules/lifeadmin/services/document-store.ts` (depends on T016)
- [ ] T031 [US1] Receipt/link API (read + manual-link + ambiguity-resolution writes idempotent; ambiguity resolution audited; NO money-movement endpoint) in `backend/src/modules/lifeadmin/api/receipts.ts`
- [ ] T032 [US1] Wire `ReceiptLinks` provided contract output in `backend/src/modules/lifeadmin/contracts/provided/receipt-links.ts`
- [ ] T033 [P] [US1] Mobile Receipt Vault screen (upload, link with matched amount/date/merchant + freshness chip, **ambiguity disambiguation Recommendation Card** with expandable Why listing candidates, six-state matrix incl. Empty/Partial/Stale/Withheld) in `mobile/src/features/lifeadmin/receipt-vault/` (ux-foundations §3/§4.1)

**Checkpoint**: US1 fully functional and independently testable (MVP).

---

## Phase 4: User Story 2 — Warranty storage with expiry reminders (Priority: P1)

**Goal**: Store a warranty against a big-ticket purchase and emit idempotent expiry-reminder intents to the Inbox digest at the important tier, with bilingual summaries and no duplicates on replay.

**Independent Test**: Store a warranty with an expiry date; confirm a 30-day-offset reminder is created, routed to Tasks/Inbox at the important tier with a bilingual summary; the `49999 < 50000` big-ticket boundary triggers the extra 7-day reminder; re-saving creates no duplicate; editing the expiry cancels and re-schedules.

### Tests for User Story 2 (write first, must FAIL)

- [ ] T034 [P] [US2] Provider contract test for `WarrantyReminders` against `contracts/provided/warranty-reminders.schema.json` in `backend/tests/contract/warranty-reminders.provider.test.ts`
- [ ] T035 [P] [US2] Big-ticket boundary fixture: `purchase_amount=49999` below, `50000` at/above `$500.00` floor (boundary `≥`); big-ticket adds the 7-day final reminder, in `backend/tests/unit/big-ticket-floor.test.ts` (FR-DOC-001)
- [ ] T036 [P] [US2] Reminder idempotency test: generation keyed on `(warranty_id, offset_days)`; re-save / job re-run creates no duplicate, in `backend/tests/unit/warranty-reminder-idempotency.test.ts` (FR-X-003 / SC-D-003)
- [ ] T037 [P] [US2] Edit/cancel test: editing `expires_on` cancels prior reminders and re-schedules (no orphaned fire); deleting the warranty cancels all reminders, in `backend/tests/unit/warranty-reschedule.test.ts`
- [ ] T038 [P] [US2] Reminder routing + tier test: reminders emitted to the Inbox digest at the **important** tier (never **critical**, never direct push), bilingual `localized_summary {en, fr}`, in `backend/tests/unit/warranty-reminder-routing.test.ts` (ux-foundations §6 / SC-D-003)
- [ ] T039 [P] [US2] Computed-expiry reasoning test: `computed_from_term` (`purchase_date + term_months`) states the computed basis in EN + FR, in `backend/tests/unit/warranty-computed-expiry.test.ts` (FR-X-006)
- [ ] T040 [P] [US2] Integration test: store warranty → reminder emitted (single + big-ticket) in `backend/tests/integration/warranty.test.ts`

### Implementation for User Story 2

- [ ] T041 [P] [US2] `Warranty` + `Reminder` domain (coverage_kind, expires_on, expiry_source, term_months, reminder offsets/tier/status, bilingual summary) in `backend/src/modules/lifeadmin/domain/warranty.ts`
- [ ] T042 [US2] Warranty-reminder service + scheduled BullMQ job (idempotent on `(warranty_id, offset_days)`; 30-day default + 7-day big-ticket; cancel/re-schedule on edit; emit to Inbox digest) in `backend/src/modules/lifeadmin/services/warranty-reminder.ts` (depends on T041, T007)
- [ ] T043 [US2] Warranty API (store/edit/delete idempotent; NO money-movement endpoint) in `backend/src/modules/lifeadmin/api/warranties.ts`
- [ ] T044 [US2] Wire `WarrantyReminders` provided contract in `backend/src/modules/lifeadmin/contracts/provided/warranty-reminders.ts`
- [ ] T045 [P] [US2] Mobile Warranty screen (store warranty, expiry + reminder display, computed-basis reasoning, six-state matrix) in `mobile/src/features/lifeadmin/warranty/`

**Checkpoint**: US1 + US2 both independently functional.

---

## Phase 5: User Story 3 — Important Document Wallet with audited sharing (Priority: P2)

**Goal**: File documents into structured categories; control who can view/export each one with least-privilege, server-side-enforced, audited sharing; revocation is immediate.

**Independent Test**: File a document, grant another profile `view`, switch to that profile and see exactly that document (nothing else); an `export` on a `view`-only grant is denied server-side + audited; export by an authorized grantee records who/what/when; revoking a grant hides the document immediately with no cached copy.

### Tests for User Story 3 (write first, must FAIL)

- [ ] T046 [P] [US3] Provider contract test for `DocumentVault` against `contracts/provided/document-vault.schema.json` in `backend/tests/contract/document-vault.provider.test.ts`
- [ ] T047 [P] [US3] Capability test: `view` grant does NOT confer `export` (`view ⊉ export`); neither confers write/delete; signed URL minted only for an `export` grant, in `backend/tests/unit/sharing-capability.test.ts` (FR-DOC-002 / SC-D-005)
- [ ] T048 [P] [US3] Visibility test: `private` doc requested by another profile by id ⇒ denied server-side against session identity (not UI filtering); `household_scoped` honors `MemberScope`, in `backend/tests/unit/sharing-visibility.test.ts` (FR-X-010)
- [ ] T049 [P] [US3] Revocation test: revoked grant ⇒ document immediately invisible, no cached copy shown, in `backend/tests/unit/sharing-revocation.test.ts` (ux-foundations §10.6)
- [ ] T050 [P] [US3] **API-layer IDOR / horizontal-priv-esc** test (server-side, not UI): 0 cross-profile document exposures; every denied access audited, in `backend/tests/integration/cross-profile-authz.test.ts` (SC-D-005 / Principle V / SC-015)
- [ ] T051 [P] [US3] Bilingual rendering test: category + document-type + sharing-control labels render EN/FR (no single-language leak), in `backend/tests/unit/document-bilingual.test.ts` (FR-X-005 / SC-D-008)
- [ ] T052 [P] [US3] Email-sourced purge cascade test: `email_sourced=true` doc purged within 7 days of email-access revocation regardless of store (crypto-shred + tombstone); upload copy retained if also user-uploaded, in `backend/tests/integration/email-sourced-purge.test.ts` (FR-X-013 / SC-D-009)
- [ ] T053 [P] [US3] Integration test: file → share `view` → switch profile → export-denied → authorized export audited in `backend/tests/integration/document-wallet.test.ts`

### Implementation for User Story 3

- [ ] T054 [P] [US3] `SharingGrant` domain (visibility {private, household_scoped, explicit_grant}; Grant {grantee, capability view|export, expires_at}) in `backend/src/modules/lifeadmin/domain/sharing.ts`
- [ ] T055 [US3] Sharing/authZ service (server-side grant checks at request time; `view ⊉ export`; per-grant short-lived signed-URL minting; every view/export/share/revoke/denial audited) in `backend/src/modules/lifeadmin/services/sharing.ts` (depends on T013, T016, T010)
- [ ] T056 [US3] Document-wallet API (categories, share/revoke; export routes through Confirm-Action sheet contract; NO money-movement endpoint) in `backend/src/modules/lifeadmin/api/documents.ts`
- [ ] T057 [US3] Wire `DocumentVault` provided contract (metadata + capability-scoped grants only — never raw bytes/credentials) in `backend/src/modules/lifeadmin/contracts/provided/document-vault.ts`
- [ ] T058 [P] [US3] Mobile Document Wallet screen (categories, **Confirm-Action sheet** for export/share with disclaimer + "Share document with {Name}" CTA, "Viewing {Name}'s finances" banner, six-state matrix) in `mobile/src/features/lifeadmin/document-wallet/` (ux-foundations §4.2/§5.5/§10.6)

**Checkpoint**: US1–US3 independently functional.

---

## Phase 6: Polish & Cross-Cutting Concerns

- [ ] T059 [P] Verify log redaction (no PII / monetary value / document title / OCR text leak) + audit-trail completeness across all services in `backend/tests/integration/redaction-audit.test.ts` (Principles V, VI / FR-X-014)
- [ ] T060 [P] Crypto-shred + dormant-account retention test: delete key-shreds the per-subject object key (bytes unrecoverable) + writes a tombstone (audit retained); dormant-account documents key-shredded per FR-X-019, in `backend/tests/integration/crypto-shred.test.ts` (FR-X-013/019)
- [ ] T061 [P] Residency verification: documents, metadata, and any OCR processing occur in a Canadian region; any subprocessor processing data outside Canada is disclosed + agreement-backed, in `backend/tests/integration/residency.test.ts` (FR-X-020 / SC-D-010)
- [ ] T062 [P] Bilingual + locale-format verification (EN/FR, fr-CA `1 234,56 $`) and WCAG 2.1 AA bilingual screen-reader labels (documents, chips, sharing controls; link state = icon+color+text) in `mobile/tests/a11y-locale.test.ts` (Principle II / FR-X-016 / SC-011)
- [ ] T063 [P] Performance check: cached document/receipt metadata list module-switch ≤ 300 ms; document open mints signed URL server-side without blocking the list; stale → flagged, not blocking, in `mobile/tests/perf-vault.test.ts` (FR-X-015 / SC-010)
- [ ] T064 Threat-model mitigation tasks: confirm no money-movement endpoint exists; server-side cross-profile authZ + RLS enforced everywhere; signed URLs short-lived/per-grant/never stored; `email_sourced` purge cascade wired (spec Threat Model)
- [ ] T065 Run [quickstart.md](./quickstart.md) validation end-to-end (all user-story checks + mandatory money fixtures + consumer/provider contract tests green + 0 cross-profile exposures)

---

## Dependencies & Execution Order

- **Setup (Phase 1)** → no deps.
- **Foundational (Phase 2)** → depends on Setup; **BLOCKS all user stories** (money, freshness, reasoning, audit, redaction, locale, authZ, consumed-contract clients, provided-contract registry, object-store + signed URLs, crypto-shred deletion).
- **User Stories (Phases 3–5)** → all depend on Foundational; then independently testable.
  - US1 (receipt matching) and US2 (warranties) are both P1 and independent — either can ship first; both reuse the shared `Document` store and audit/freshness foundation.
  - US3 (P2) reuses the `Document` store but adds the sharing/authZ surface; sequence after US1/US2 deliver the core MVP.
- **Polish (Phase 6)** → depends on all targeted stories.

### Within Each User Story

- Tests (mandatory) written and FAILING before implementation.
- Domain models → services → contract wiring → API → mobile.

## Parallel Opportunities

- Setup: T003, T004, T005, T006 in parallel.
- Foundational: T008–T012, T014–T017 in parallel (T007 money first; T013 authZ independent).
- Each story's `[P]` test tasks run in parallel; `[P]` domain models run in parallel before their (sequential) services.
- After Foundational, US1 and US2 can be staffed in parallel by different developers; US3 sequences after the MVP stories.

## Parallel Example: User Story 1

```bash
# Tests first (all [P]):
T018 ReceiptLinks provider contract test
T019 TransactionStream + MerchantGraph consumer contract tests
T020 exact integer-cent equality fixture (4799 == 4799 != 4800)
T021 ambiguity fixture (two equal candidates ⇒ ambiguous_pending)
T022 candidate eligibility (pending/duplicate excluded)
T023 stale-feed flag
T024 unmatched + manual link
T025 idempotency
T026 fr-CA formatting
# Then domain models [P]:
T028 Document + ReceiptLink domain
```

## Implementation Strategy

### MVP First (User Story 1 only)
1. Phase 1 Setup → 2. Phase 2 Foundational → 3. Phase 3 US1 → **STOP & VALIDATE** (upload a receipt; exact-equality auto-link; ambiguity surfaced; stale flagged; fr-CA formatting) → demo.

### Incremental Delivery
US1 (MVP receipt auto-linking) → US2 (warranty reminders, also P1) → US3 (document wallet + audited sharing, P2) → Polish. Each story adds value without breaking earlier ones.

## Notes

- Tests are mandatory (Constitution III); verify they FAIL before implementing.
- `[P]` = different files, no incomplete-task deps.
- Money: integer CAD cents; **no rate/FX/rounding math** in this module — matching is **exact integer-cent equality** (no float tolerance). Fixtures T020 (equality), T021 (ambiguity), T035 (big-ticket boundary), T026 (fr-CA format) guard the money path.
- Recommend-only: no task creates a money-movement endpoint (T064 verifies); a warranty reminder is informational, not a money action.
- Security: every cross-profile read/export is authZ-checked server-side on session identity + RLS, never client `profile_id`; `view ⊉ export`; denied access audited (T050).
- Commit after each task or logical group; stop at any checkpoint to validate a story independently.

# Implementation Plan: Module 12 — Life Admin & Docs

**Branch**: `014-module-12-life-admin` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/014-module-12-life-admin/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Life Admin & Docs is a **P3** product tab that turns the shoebox of receipts, warranties, and important papers into a structured, searchable vault wired to the user's real transactions. It does three lean things: (1) **auto-links uploaded receipts to the matching spine transaction** using exact integer-cent amount equality + merchant + calendar date (never a guessed or silent tie-break), (2) **stores warranties and emits idempotent expiry-reminder intents** through the Inbox digest, and (3) **files important documents into categories with least-privilege, server-side-enforced, audited sharing**. The module is a **consumer** of Module 0 spine contracts (`TransactionStream`, `MerchantGraph`) and a **provider** of `DocumentVault`, `ReceiptLinks`, and `WarrantyReminders` to downstream modules (Workspace, Tasks, Inbox, Travel). Technical approach: a recommend-only, store-and-remind service layer with no money arithmetic of its own (amounts are integer cents compared by exact equality against the spine's already-converted `cad_amount`), freshness-gated matching, Canadian-region per-subject-encrypted object storage with crypto-shred deletion, server-side cross-profile authZ + RLS, and consumer+provider contract tests in CI. Per Constitution IX the analysis is thorough but the feature set is deliberately MVP-scoped — no OCR-heavy extraction pipeline, no e-signature, no cloud-drive sync, no public links, no money movement (see spec Non-Goals).

## Technical Context

> **Platform-stack note**: FinOS's platform stack is **ratified** in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (Constitution v2.2.0, umbrella spec). This plan **inherits** that stack and does **not** re-decide it. Items below restate the inherited choice with its driver; genuinely module-specific open items are marked **[NEEDS CLARIFICATION → research.md]** and are documented, non-blocking.

**Language/Version**: TypeScript 5.x on Node 20 LTS (backend) + React Native via Expo (mobile) — **inherited** (platform-decisions §2). Rationale: one language across mobile + backend; bit-identical `@finos/money`/`@finos/format` and JSON-Schema-generated contract types.

**Primary Dependencies**: NestJS 10 (Fastify adapter) module under the modular monolith; Prisma for the `lifeadmin` Postgres schema; `@finos/money` (integer cents — used here only for storage/comparison, no rounding step), `@finos/format` (fr-CA `1 234,56 $`); the JSON-Schema contract layer + Pact for consumer/provider tests; BullMQ (Redis) for the scheduled reminder job; AWS S3 + KMS (`ca-central-1`) per-subject envelope encryption for document bytes — all **inherited** (platform-decisions §2). Spine access is via Module 0 contract clients, never direct DB reads.

**Storage**: Life-Admin-owned state (document metadata, receipt links, warranties + reminders, sharing grants, audit events) in the **`lifeadmin`** schema of the single Canadian-region PostgreSQL 16 (`ca-central-1`), with per-schema role + **RLS** on every `profile_id`-scoped table — **inherited** (platform-decisions §2/§3). Document **bytes** live in S3 `ca-central-1` with per-subject KMS-envelope keys; the DB stores only an `object_key`, never bytes, signed URLs, or storage credentials (research §1). No private copy of transactions/merchants — those are read from spine contracts.

**Testing**: Unit (exact-equality match, ambiguity, big-ticket boundary, reminder idempotency, locale formatting), **consumer + provider contract tests** per contract, integration (per user story incl. API-layer IDOR/authZ), mobile (component + bilingual/locale + WCAG a11y) — all in CI. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a backend API — **inherited** (platform-decisions §2).

**Project Type**: Web/mobile — backend service module + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a cached, freshness-stamped document/receipt metadata list; document open mints a signed URL server-side without blocking the list render; matching runs on cached spine reads.

**Constraints**: Money is exact (integer minor units, never float — Principle IV) and this module performs **no rate/FX/rounding math of its own** (it compares against the spine's already-rounded `cad_amount`); every spine-derived value carries a freshness stamp and a stale `TransactionStream` flags the link (Principle VIII); recommend-only — store/link/remind, no money movement (Principle IV / FR-X-003); EN/FR + locale-correct formatting (Principle II); cross-profile authZ enforced server-side on session identity + RLS, never client `profile_id` (Principle V); documents encrypted at rest with per-subject keys enabling crypto-shred deletion in a Canadian region (Principle V / FR-X-013/019/020).

**Scale/Scope**: Per-user document data (tens to low-hundreds of documents per user typical); **2 module-owned FRs (FR-DOC-001..002)** across **3 prioritized user stories**; 5 owned/provided entities (Document, ReceiptLink, Warranty/Reminder, SharingGrant, AuditEvent); **provides 3 contracts** (`DocumentVault`, `ReceiptLinks`, `WarrantyReminders`); **consumes 2 spine contracts** (`TransactionStream`, `MerchantGraph`).

**NEEDS CLARIFICATION** (→ [research.md](./research.md) open items, all documented/non-blocking): (NR-DOC-1) OCR/parse subprocessor selection — whether to ship OCR in MVP and, if so, a Canadian-region-or-disclosed vendor; (NR-DOC-2) big-ticket floor + final-reminder offset — default $500.00 / 7 days applied; (NR-DOC-3) max file size + accepted MIME types — default 20 MB / `{jpeg, png, heic, pdf}` applied; (NR-DOC-4) dormant-account retention window — inherits the platform-wide FR-X-019 window (Module 0 PIA, platform NR-3).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Behavior computed against real budget/cash-flow/credit/goals/transactions state? | **PASS** — receipt auto-linking is computed against the live spine `TransactionStream`/`MerchantGraph`; a receipt is filed against the user's real purchase, never in isolation (FR-DOC-001, SC-D-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — CAD throughout; all labels, categories, and reminder summaries EN/FR with no single-language leaks; amounts/dates via `@finos/format` fr-CA `1 234,56 $` (SC-D-008). Time-to-goal applies only where a doc/warranty is goal-tied (rare; omitted otherwise per ux-foundations §8.4). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — exact-equality match, ambiguity, big-ticket boundary, reminder idempotency, stale-flag, bilingual, and consumer+provider contract tests authored first and must FAIL before implementation (tasks.md Phase order). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Integer-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — amounts are integer CAD cents; matching is **exact integer-cent equality** (no float/percentage tolerance); the module owns **no rate/FX/rounding** path; uploads/links/reminders are idempotent (`upload_id`; `(profile_id,document_id,transaction_id)`; `(warranty_id,offset_days)`); store/link/remind only — **no money movement** (FR-DOC-001/002, FR-X-003). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — spec carries a **mandatory threat model** (sharing touches another person's documents/financial data); files encrypted at rest (KMS per-subject) + TLS in transit; signed URLs minted per-request/per-grant, never stored; cross-profile authZ enforced **server-side on session identity + RLS**, never client `profile_id`; `view ⊉ export`; denied access audited (FR-DOC-002, FR-X-009/010, SC-D-005). |
| VI | Explainable & Auditable | Inputs + reasoning; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — every auto-link/ambiguity prompt and warranty-expiry derivation carries inputs + bilingual `Reasoning` (SC-D-004); every view/export/share/revoke/delete and ambiguity resolution written to the append-only audit trail (SC-D-006); a stale/missing money input (transaction feed) **flags/withholds** the link rather than guessing — no documented-default money substitution is taken here (the module computes no money figure). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:lifeadmin/{DocumentVault,ReceiptLinks,WarrantyReminders}/1.0.0`; consumes `finos:spine/{TransactionStream,MerchantGraph}/1.0.0`); consumer+provider Pact tests in CI (SC-D-011); semver with migration window; version skew **disables auto-linking**, not served on a mismatched schema. |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every receipt link carries a `FreshnessStamp` reflecting the matched `TransactionStream`; a stale feed flags the link and offers "Refresh transactions" (SC-D-007); spine reads have timeouts/retries and degrade gracefully (storage retried; matching withheld, not wrong — FR-X-012). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — store/link/remind service over spine contracts; no OCR-heavy pipeline, no e-signature, no cloud sync, no public links, no money math (spec Non-Goals); OCR layers in behind an existing provisional `amount_source='ocr'` path with no schema change. |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — ingestion/match logs redact PII + monetary values + OCR text, audit trail separate (FR-X-014); email-sourced 7-day purge cascade (FR-X-013) + dormant-account key-shred (FR-X-019); all documents/metadata/OCR processed in a Canadian region, any OCR subprocessor disclosed+agreement-backed (FR-X-020, SC-D-010); ≤300 ms via cached metadata; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing on the share Confirm-Action sheet. |

**Threat model (Principle V)** — REQUIRED here because Important Document Wallet sharing touches another person's documents and financial data (identity/tax/insurance documents + transaction-revealing receipt links). Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--document-sharing-touches-another-persons-documentsfinancial-data). Aggregation-token lifecycle is **out of scope** for Life Admin (owned by Module 0 / FR-CORE-007); this module reads spine contracts and stores user-supplied files only.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — data model and contracts preserve exact-integer money, freshness-gated matching, server-side authZ + RLS, crypto-shred residency, and recommend-only (store/link/remind); no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/014-module-12-life-admin/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (provided/ + consumed/)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/lifeadmin/
    ├── domain/            # entities: Document, ReceiptLink, Warranty, Reminder, SharingGrant,
    │                      #           AuditEvent; value objects: FreshnessStamp, MoneyCents (re-export), Reasoning
    ├── money/             # integer-cents helpers + exact-equality comparison + big-ticket floor check
    │                      #   (NO rate/FX/rounding math — this module owns none)
    ├── storage/           # StorageRef + Canadian-region object-store adapter; per-request signed-URL minting
    ├── services/          # receipt-matcher, warranty-reminder (BullMQ job), sharing/authZ, document-store,
    │                      #           crypto-shred deletion + email-sourced purge cascade
    ├── contracts/
    │   ├── consumed/      # typed clients + pinned schemas for TransactionStream, MerchantGraph
    │   └── provided/      # DocumentVault, ReceiptLinks, WarrantyReminders
    └── api/               # store/link/remind/share endpoints (NO money-movement endpoints) + authz guard
backend/tests/
├── contract/             # consumer (TransactionStream, MerchantGraph) + provider (3 provided) tests
├── integration/          # per user story (US1..US3) incl. API-layer cross-profile authZ/IDOR
└── unit/                 # exact-match, ambiguity, big-ticket boundary, reminder idempotency, locale

mobile/
└── src/features/lifeadmin/
    ├── receipt-vault/     # US1 (upload, auto-link, ambiguity disambiguation card)
    ├── warranty/          # US2 (store warranty, expiry reminders)
    └── document-wallet/   # US3 (categories, sharing/export with audited access)
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Life Admin is a self-contained backend NestJS module (`backend/src/modules/lifeadmin/`) exposing store/link/remind/share endpoints (no money-movement endpoints) and the three provided contracts, plus a mobile feature module (`mobile/src/features/lifeadmin/`) organized by user story. The module never reads spine storage directly — only the Module 0 contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII). Document bytes never enter the `lifeadmin` schema; only an `object_key` reference is stored, with bytes in Canadian-region per-subject-encrypted object storage. The repository-root layout is ratified in platform-decisions; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (P3 scope discipline is satisfied by the spec Non-Goals: no OCR pipeline, no e-signature, no cloud sync, no public links, no money math.)

# Quickstart & Validation: Module 12 — Life Admin & Docs

**Feature**: `014-module-12-life-admin` | **Date**: 2026-06-29

A run/validation guide proving Life Admin & Docs works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `TransactionStream` (`finos:spine/TransactionStream/1.0.0`) and `MerchantGraph` (`finos:spine/MerchantGraph/1.0.0`). Until available, auto-linking degrades to manual linking; document storage is unaffected.
- Canadian-region object storage (S3 `ca-central-1`) + per-subject KMS keys available (or stubbed) per platform-decisions §2/§5.
- Inbox digest pipeline available (or stubbed); until then, reminders persist in-module and back-fill later (never direct push).
- Seeded fixtures: posted `TransactionStream` rows (incl. a same-amount/same-merchant/same-day pair for the ambiguity case), a `MerchantGraph` node, and sample receipt/warranty/document uploads.
- Toolchain per platform-decisions (TypeScript/Node + React Native, Prisma, Pact, BullMQ, Jest). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:lifeadmin-fixtures      # transactions (incl. ambiguity pair), merchant node, sample docs
```

## Validation by user story

### US1 — Receipt → transaction auto-linking (P1 within module)

```bash
<pkg> test lifeadmin/unit/receipt-match
<pkg> test lifeadmin/integration/receipt-vault
```

Expected:
- A receipt whose amount/date/merchant match exactly **one** posted transaction links to that transaction; the `ReceiptLink.reasoning.inputs` cite the matched amount, date, and merchant, with `rationale_en` and `rationale_fr` both present, and the link carries a `FreshnessStamp` (SC-D-001/004).
- **Money fixture (mandatory — exact equality)**: receipt `4799` cents matches a transaction `cad_amount = 4799` and does **NOT** match `4800` — exact integer-cent equality, no float/percentage tolerance (SC-D-002).
- **Money fixture (mandatory — ambiguity)**: two posted transactions of `cad_amount = 4799` at the same merchant on the same date both surface as `candidate_transaction_ids`; the link state is `ambiguous_pending` and neither auto-links (umbrella AS-4 / SC-D-001).
- A receipt with **0** candidates is `unmatched` (stored + searchable, "Link manually" offered), never a guessed match.
- `pending`, `merged_duplicate`, and `suspected_duplicate` transactions are **excluded** as candidates (SC-D-002).
- A **stale** `TransactionStream` renders the link **flagged** (freshness `is_stale = true`) with a "Refresh transactions" CTA — never asserted as a confident match (SC-D-007).
- fr-CA locale renders a receipt amount `123456` cents as `1 234,56 $` (SC-D-008).

### US2 — Warranty storage with expiry reminders (P1 within module)

```bash
<pkg> test lifeadmin/unit/warranty-reminders
<pkg> test lifeadmin/integration/warranty
```

Expected:
- A stored warranty with an expiry date generates an expiry reminder at the default **30-day** offset, emitted to the **Inbox digest** at the **important** tier (never critical, never a direct push), with a bilingual `localized_summary {en, fr}` (SC-D-003).
- **Money fixture (mandatory — big-ticket boundary)**: `purchase_amount = 49999` cents is **below** and `50000` is **at/above** the `$500.00` default floor (boundary is `≥`); the big-ticket warranty additionally schedules the **7-day** final reminder.
- **Idempotency**: re-saving the same warranty or re-running the reminder job does **not** create a duplicate reminder — generation is idempotent on `(warranty_id, offset_days)` (SC-D-003 / FR-X-003).
- Editing `expires_on` **cancels** the prior reminder and re-schedules to the new date (no orphaned reminder fires on the old date).
- A warranty whose expiry is `computed_from_term` (`purchase_date + term_months`) states the computed basis in `reasoning` (FR-X-006), in EN and FR.

### US3 — Important Document Wallet with audited sharing (P2 within module)

```bash
<pkg> test lifeadmin/unit/sharing-capability
<pkg> test lifeadmin/integration/document-wallet
<pkg> test lifeadmin/integration/cross-profile-authz
```

Expected:
- A document filed in a category, shared with another profile at `view` capability, is visible to **exactly** that profile (and nothing else) when it switches in; an **export** attempt on a `view`-only grant is **denied server-side** and the denial is audited (`view ⊉ export`, SC-D-005).
- A `private` document requested by another profile by id is **denied server-side** against the requester's session identity (not UI filtering), and the denial is audited (SC-D-005).
- A revoked grant makes the document immediately invisible to the previously-granted profile with **no cached copy** shown (ux-foundations §10.6).
- An export mints a **short-lived, per-grant, server-side** signed URL (never stored in the DB) and records who exported what and when in the append-only audit trail (SC-D-006).
- Type labels and sharing-control labels render bilingually (no single-language leak, SC-D-008).

## Mandatory money fixtures (Principle IV)

This module owns **no rate/FX/rounding math**; its money fixtures verify **exact integer-cent** behavior (no float tolerance):

1. **Exact-equality match**: `4799 == 4799` matches; `4799 != 4800` does not.
2. **Ambiguity**: two `4799`-cent same-merchant same-day transactions ⇒ both surface, neither auto-links.
3. **Big-ticket floor**: `49999` below, `50000` at/above `$500.00` (`≥`).
4. **fr-CA formatting**: `123456` cents ⇒ `1 234,56 $` (en-CA ⇒ `$1,234.56`).

```bash
<pkg> test lifeadmin/unit/money-fixtures
```

## Contract tests (mandatory — Principle VII / SC-D-011)

```bash
<pkg> test lifeadmin/contract/consumed   # TransactionStream, MerchantGraph
<pkg> test lifeadmin/contract/provided   # DocumentVault, ReceiptLinks, WarrantyReminders
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken **consumed** schema **fails CI** and **disables auto-linking** (version-skew behavior) while manual document storage — which has no spine dependency — keeps working.

## Cross-cutting checks

- **Recommend-only (FR-X-003)**: grep the Life Admin API surface — there is **no** money-movement endpoint; every action is a document store, a link assertion, a reminder intent, or a user-confirmed share.
- **Audit trail (Principle VI / FR-X-007)**: `document_viewed` / `document_exported` / `document_shared` / `share_revoked` / `document_deleted` / `ambiguity_resolved` / `reminder_emitted` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no PII, monetary values, document titles, or OCR text.
- **Crypto-shred deletion (FR-X-013/019)**: deleting a document key-shreds its per-subject object key (bytes unrecoverable) + writes a tombstone, preserving the append-only audit log; an email-sourced document is purged within 7 days of email-access revocation regardless of store; dormant-account documents are key-shredded.
- **Residency (FR-X-020 / SC-D-010)**: all documents, metadata, and any OCR processing occur in a Canadian region; any subprocessor processing data outside Canada is disclosed + agreement-backed.
- **Performance (SC-010)**: module-switch into Life Admin renders the cached document/receipt metadata list in ≤ 300 ms; document open mints a signed URL server-side without blocking the list.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual screen-reader labels on documents, chips, and sharing controls; link state conveyed by icon + color + text (never color alone).

## Done when

All user-story validations pass, the money fixtures show exact integer-cent behavior (no slippage, no float tolerance), all consumer+provider contract tests are green, 0 cross-profile exposures occur in API-layer authZ testing, and the cross-cutting checks hold.

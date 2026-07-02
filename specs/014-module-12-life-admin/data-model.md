# Phase 1 Data Model: Module 12 — Life Admin & Docs

**Feature**: `014-module-12-life-admin` | **Date**: 2026-06-29

Entities the Life Admin & Docs module **owns/provides**. Consumed spine contracts (`TransactionStream`, `MerchantGraph`) are owned by Module 0 and are referenced, not defined here.

**Money typing convention** (Principle IV): `*_cents` fields and `MoneyCents.amount_cents` are **integer minor units (CAD cents)**. **This module has no rate/multiplier fields** — it stores, links, and reminds; it performs no FX or valuation arithmetic. No field is a binary float.

**Freshness** (Principle VIII): every value derived from the spine (a receipt match) carries a `FreshnessStamp`; pure user-uploads carry `source = 'user_entered'`. A consumer that reads `is_stale = true` on a link MUST flag it (FR-X-008).

---

## Shared value objects (reused from Module 0, not redefined)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider id (e.g. `derived`, `user_entered`, `ocr`); never a token/secret |
| observed_at | timestamp (UTC) | when the value/match was produced |
| staleness_threshold_seconds | integer | per-value window (research §6) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |

### MoneyCents — `finos:common/MoneyCents/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| amount_cents | integer | integer minor units; signed; **never** float/decimal-string for an amount |
| currency | string (ISO-4217) | default `CAD`; foreign amounts are reference-only here |

### Reasoning — `finos:common/Reasoning/1.0.0` (Explainability — Principle VI / FR-X-006)
| Field | Type | Notes |
|-------|------|-------|
| inputs | map<string, any> | the values that produced the result (e.g. receipt_amount_cents, receipt_date, merchant_id, candidate_count) |
| rationale_en | string | human-readable "why", English |
| rationale_fr | string | human-readable "why", French (bilingual — Principle II) |

---

## Owned entities

### Document / DocumentVault — provided `finos:lifeadmin/DocumentVault/1.0.0`
A stored file's metadata + encrypted-storage reference. The bytes live in Canadian-region object storage; the DB holds only metadata + an `object_key`.

| Field | Type | Validation |
|-------|------|------------|
| document_id | string (uuid) | required, unique |
| profile_id | string (uuid) | required — scopes ownership; authZ from session, RLS-enforced |
| category | enum {receipt, warranty, insurance_policy, tax_document, identity_document, contract, statement, medical, legal, other} | required (FR-DOC-002) |
| title | string | required, non-empty |
| document_type_key | string | optional; i18n key → EN/FR labels at edge (no single-language leak) |
| storage_ref | StorageRef | required (object_key + encryption=`kms_envelope_per_subject` + region=`ca-central-1`) |
| amount | MoneyCents | optional; receipt total in integer cents |
| amount_source | enum {ocr, user_entered, linked_transaction, none} | default `none`; `ocr` is **provisional**, user-confirmable, never a settled figure |
| document_date | date | optional |
| merchant_ref | {merchant_id} | optional → `MerchantGraph` node |
| receipt_link_ref | string (uuid) | optional → `ReceiptLink` |
| warranty_ref | string (uuid) | optional → `Warranty` |
| source | enum {user_upload, ocr, email_inferred} | default `user_upload` |
| email_sourced | boolean | default false; true ⇒ FR-X-013 purge cascade |
| sharing | Sharing | required; default `visibility=private` |
| created_at | timestamp (UTC) | required |
| freshness | FreshnessStamp | required |

**StorageRef**: `{ object_key: string, encryption: 'kms_envelope_per_subject', region: 'ca-central-1', content_type?: string, byte_size?: integer }`. The DB **never** stores bytes, signed URLs, or storage credentials; signed URLs are minted per-request, per-grant, server-side.

### Sharing / SharingGrant (FR-DOC-002, least privilege)
| Field | Type | Validation |
|-------|------|------------|
| visibility | enum {private, household_scoped, explicit_grant} | default `private` |
| grants | list<Grant> | empty unless `explicit_grant` (or household_scoped via MemberScope) |

**Grant**: `{ grantee_profile_id: uuid, capability: 'view'|'export', granted_at: timestamp, expires_at?: timestamp }`. `view ⊉ export`; neither confers write/delete. Enforced server-side; every use audited.

### ReceiptLink / ReceiptLinks — provided `finos:lifeadmin/ReceiptLinks/1.0.0`
A link between a receipt document and a canonical spine transaction. An **assertion**, never a transaction mutation.

| Field | Type | Validation |
|-------|------|------------|
| link_id | string (uuid) | required; idempotency key (UNIQUE on profile_id+document_id+transaction_id) |
| profile_id | string (uuid) | required |
| document_id | string (uuid) | required → receipt Document |
| transaction_id | string (uuid) | null until matched/confirmed → `TransactionStream` |
| match_state | enum {matched, ambiguous_pending, unmatched, user_confirmed, user_rejected} | required |
| match_method | enum {amount_date_merchant, amount_date, ocr_reference, manual} | required |
| candidate_transaction_ids | list<uuid> | non-empty iff `ambiguous_pending` |
| match_confidence | number 0..1 | optional; informational only (ambiguity resolved by user, not threshold) |
| receipt_amount | MoneyCents | integer cents; compared by **exact integer equality** to transaction `cad_amount` |
| reasoning | Reasoning | required (bilingual) |
| resolved_by | enum {system, user} | `user` for confirmed/rejected ambiguities |
| resolved_at | timestamp | optional |
| created_at | timestamp (UTC) | required |
| freshness | FreshnessStamp | required; reflects matched `TransactionStream` freshness; stale ⇒ flag |

**Match rule (FR-DOC-001)**: candidate = a `posted` transaction with `dedup_state ∈ {unique, merged_primary}` whose `cad_amount` equals `receipt_amount.amount_cents` (exact integer) AND same `merchant_id` AND same calendar date. `pending`/`merged_duplicate`/`suspected_duplicate` excluded. ≥2 candidates ⇒ `ambiguous_pending` (no auto-link, AS-4). 0 candidates ⇒ `unmatched`.

### Warranty / WarrantyReminders — provided `finos:lifeadmin/WarrantyReminders/1.0.0`
A warranty on a big-ticket purchase + its idempotent reminder intents.

| Field | Type | Validation |
|-------|------|------------|
| warranty_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| document_id | string (uuid) | required → warranty Document |
| item_name | string | optional |
| linked_transaction_id | string (uuid) | optional → big-ticket purchase |
| purchase_amount | MoneyCents | optional; integer cents; drives big-ticket classification (≥ floor) |
| coverage_kind | enum {manufacturer, extended, credit_card_purchase_protection, store, other} | required |
| purchase_date | date | optional |
| expires_on | date | required |
| expiry_source | enum {user_entered, ocr, computed_from_term} | default `user_entered` |
| term_months | integer ≥ 0 | required iff `computed_from_term` |
| reminders | list<Reminder> | generated idempotently |
| source | enum {user_upload, ocr, email_inferred} | default `user_upload` |
| email_sourced | boolean | default false |
| created_at | timestamp (UTC) | required |

**Reminder**: `{ reminder_id: uuid (UNIQUE on warranty_id+offset_days), fire_on: date (= expires_on − offset_days), offset_days: integer, priority_tier: 'important'|'informational', status: 'scheduled'|'emitted'|'dismissed'|'cancelled', localized_summary: {en, fr} }`. Default offsets: **30 days**, plus a **7-day** final reminder when `purchase_amount ≥ big-ticket floor` ($500.00 default). Always **important** tier (never **critical**, reserved for cash-safety).

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required (acting identity from session) |
| type | enum {document_viewed, document_exported, document_shared, share_revoked, document_deleted, ambiguity_resolved, reminder_emitted} | |
| target_id | string (uuid) | document_id / link_id / warranty_id as applicable |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp | required, immutable |

**Idempotency rule (Principle IV)**: document uploads keyed on a client upload id; `ReceiptLink` writes on `(profile_id, document_id, transaction_id)`; reminders on `(warranty_id, offset_days)`. A replayed event/job does not double-apply.

---

## State transitions

**ReceiptLink.match_state**:
- new receipt → run match → `matched` (exactly 1 candidate) · `ambiguous_pending` (≥2) · `unmatched` (0).
- `ambiguous_pending` —user picks→ `user_confirmed` (transaction_id set, audited) · —user dismisses→ `user_rejected`.
- `unmatched` —user links manually→ `user_confirmed`.
- stale `TransactionStream` at match time → link produced but **flagged** (freshness.is_stale = true); never silently `matched`.
- late-posting third candidate after a `user_confirmed` → does NOT override the user's choice; surfaced as a new optional review, not a re-ambiguation of the resolved link.

**Reminder.status**: `scheduled` → `emitted` (handed to Inbox digest) → `dismissed` (user). Editing `expires_on` → existing reminders `cancelled` and re-scheduled (no orphaned fire). Deleting the warranty → all reminders `cancelled`.

**Document lifecycle**: `created` → (optional) `shared`/`share_revoked` → `deleted` (crypto-shred object key + tombstone; audit retained). Email-sourced documents also transition to `deleted` on email-access revocation within 7 days (FR-X-013).

---

## Relationships

- `Document` 1—0..1 `ReceiptLink` (receipts) and 1—0..1 `Warranty` (warranties).
- `Warranty` 1—* `Reminder` (idempotent on offset).
- `ReceiptLink` *—1 `TransactionStream` transaction (referenced, never mutated); *—0..1 `MerchantGraph` node (via the receipt's `merchant_ref`).
- `Document` *—* other profiles via `SharingGrant` (least-privilege, audited).
- All owned entities are scoped by `profile_id`; every cross-profile read/export is authZ-checked server-side + RLS (threat model).

## Consumed contracts (referenced, owned elsewhere)

`TransactionStream` (`finos:spine/TransactionStream/1.0.0`), `MerchantGraph` (`finos:spine/MerchantGraph/1.0.0`) — Module 0. Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine storage or cross-schema `SELECT`. Module 12 never writes to either.

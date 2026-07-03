# Phase 0 Research: Module 12 — Life Admin & Docs

**Feature**: `014-module-12-life-admin` | **Date**: 2026-06-29

Resolves the technical decisions the Life Admin design depends on. **Platform-stack choices (language, datastore, mobile framework, auth, KMS, object storage, queues) are inherited from [platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here.** This module flags only genuinely module-specific unknowns as documented, non-blocking open items (Constitution: never block).

---

## 1. Document storage: references, not bytes (inherits platform)

**Decision**: Store document **metadata + an encrypted-storage reference** (`object_key`) in the `lifeadmin` Postgres schema; store the file bytes in **Canadian-region object storage (S3 `ca-central-1`)** with **per-subject KMS-envelope encryption**, exactly as platform-decisions §2/§5 ratifies. Signed download URLs are minted **per-request, per-grant, server-side**; the DB never holds bytes, signed URLs, or storage credentials.

**Rationale**: Inherits the ratified residency (FR-X-020) and crypto-shred deletion (FR-X-013/019) mechanisms; keeps the DB row small for the ≤300 ms list budget (FR-X-015); per-subject keys make deletion a key-shred, preserving the append-only audit log (platform-decisions D6).

**Alternatives considered**: Bytes-in-DB (bytea) — rejected (bloats rows, no per-object key, hurts list latency). Co-located/un-encrypted object store — rejected (residency + Principle V).

---

## 2. Receipt → transaction matching strategy

**Decision**: Match on **exact integer-cent amount equality AND merchant AND same calendar date** against **posted, non-duplicate** `TransactionStream` rows (`status='posted'`, `dedup_state ∈ {unique, merged_primary}`). Exactly one candidate ⇒ auto-link; ≥2 ⇒ `ambiguous_pending` surfaced for user confirmation (umbrella AS-4); 0 ⇒ `unmatched`. Amounts compared as integer cents — **never** a float or percentage tolerance.

**Rationale**: FR-DOC-001 + Principle IV (exact money). The canonical hard case (two equal-amount, same-merchant, same-day transactions) is explicitly NOT auto-resolved; a confidence threshold alone would risk a wrong, money-relevant link. Excluding `pending`/duplicate rows prevents linking to provisional or double-counted transactions (consumed-contract semantics).

**Alternatives considered**: Fuzzy/ML matching with a confidence threshold — rejected for MVP (Constitution IX; risks silently wrong links on the equal-candidate case). Float tolerance on amount — rejected (Principle IV). Including pending transactions — rejected (they are provisional; the spine flags them not-settled).

---

## 3. OCR for receipt field extraction — optional, provisional

**Decision**: OCR is an **optional enrichment**, not a requirement. The matching path works from **user-entered or OCR-suggested** amount/date/merchant; an OCR value is tagged `amount_source='ocr'`, **provisional and user-confirmable**, never treated as a settled money figure. MVP can ship with manual entry only; OCR layers in behind the same provisional path with no schema change.

**Rationale**: Constitution IX (lean P3 scope) + Principle IV (no guessed money input). Decoupling OCR from the contract means the module is independently shippable and the OCR vendor decision does not block US1.

**Open item**: OCR/parse subprocessor selection (see NR-DOC-1).

**Alternatives considered**: OCR-required pipeline — rejected (heavy for P3, vendor-blocking). Trusting OCR amounts as settled — rejected (Principle IV/VI: provisional until confirmed).

---

## 4. Warranty expiry reminders via the Inbox digest

**Decision**: Generate reminder **intents** idempotently on `(warranty_id, offset_days)` and **emit them to the Inbox digest pipeline** (ux-foundations §6) at the **important** tier (never **critical**, reserved for cash-safety). Default offsets: **30 days** before expiry, plus a **7-day** final reminder when `purchase_amount ≥` the big-ticket floor. Reminder generation runs as a scheduled BullMQ job (platform-decisions §2) with the idempotency key preventing duplicates on replay.

**Rationale**: ux-foundations §6.3 (modules MUST NOT push directly; emit to Inbox), FR-X-003 (idempotent writes). Important-tier framing matches "actionable within 24h/soon" without stealing the critical budget.

**Alternatives considered**: Direct push from Life Admin — rejected (violates notification restraint §6). Non-idempotent cron — rejected (duplicate reminders on retry, FR-X-003).

---

## 5. Sharing & authorization model

**Decision**: Sharing is **`private` / `household_scoped` / `explicit_grant`** with **least-privilege capabilities (`view` / `export`)**, enforced **server-side** against the validated session identity **and** Postgres RLS (defense-in-depth, platform-decisions §5). A signed download URL is minted only for an `export` grant, short-lived and scoped to one document + grantee. Every view/export/share/revoke/denial is audited. **No public/anonymous links** in MVP.

**Rationale**: FR-DOC-002 + FR-X-010 + SC-015. UI filtering alone is non-compliant; the threat model's IDOR and capability-escalation rows are mitigated only by server-side authZ + capability checks. Public links would create an unauthenticated exfiltration path for identity/tax documents — out of scope.

**Alternatives considered**: UI-only filtering — rejected (FR-X-010). Single "shared" boolean without capabilities — rejected (can't separate view from export, the AS-2 case). Public links — Non-Goal.

---

## 6. Staleness-threshold & reminder-offset defaults

**Decision**: Ship Canada-oriented defaults, user-adjustable: **receipt-match freshness** inherits the `TransactionStream` staleness window from Module 0 (a stale transaction feed flags the link); **warranty reminder offsets** default to **30 days** (+ **7 days** for big-ticket ≥ $500.00). The mechanism (per-link `FreshnessStamp`, per-reminder offset) is fixed now; exact window tuning confirmed in the Module 0 privacy/ops review (platform NR-2).

**Rationale**: FR-X-008 + SC-D-007. Provides concrete, testable behavior now while leaving final tuning to ops; reuses the spine's freshness rather than inventing a Life-Admin-specific window for transaction data.

**Alternatives considered**: A separate Life-Admin transaction-staleness window — rejected (would diverge from the spine's single source of truth).

---

## 7. Email-sourced document purge cascade

**Decision**: A document/warranty whose **sole** source is a connected email is tagged `email_sourced=true` with the owning `profile_id`; on email-access revocation it is purged within the **7-day** window via crypto-shred + tombstone, **regardless of which store now holds it** (FR-X-013), reusing the platform purge cascade (platform-decisions §5, NR-6). A document the user also uploaded directly keeps the upload copy; only email-sourced enrichment is stripped.

**Rationale**: FR-X-013 (email-revocation cascade) + Principle V. Tagging at write time is the only way the purge can target exactly the right records later.

**Alternatives considered**: Purge-by-scan at revocation time — rejected (unreliable; the explicit `email_sourced` flag is the spec-mandated mechanism).

---

## 8. Contract testing approach

**Decision**: Consumer-driven contract tests (Pact) for each consumed spine contract (`TransactionStream`, `MerchantGraph`) and provider contract tests for each provided contract (`DocumentVault`, `WarrantyReminders`, `ReceiptLinks`), running in CI; contracts semver'd with a deprecation window. Version skew **disables auto-linking** (the spine-dependent capability) while document storage (no spine dependency) keeps working.

**Rationale**: Principle VII + FR-X-011 + SC-D-011. Pinning the consumed schema means a breaking spine change fails CI rather than producing wrong links.

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (documented, non-blocking)

- **NR-DOC-1 (OCR/parse subprocessor)**: whether to ship OCR in MVP and, if so, a Canadian-region-or-disclosed vendor that retains only confirmed structured fields, never raw images beyond processing (FR-X-020, mirrors platform NR-6). Default: ship manual-entry MVP; OCR as a fast-follow.
- **NR-DOC-2 (Big-ticket floor + final-reminder offset)**: default $500.00 / 7 days applied; confirm in the plan (product-owner question 1).
- **NR-DOC-3 (Max file size + accepted MIME types)**: default 20 MB / `{jpeg, png, heic, pdf}` applied; confirm as a platform/ops setting (product-owner question 2).
- **NR-DOC-4 (Dormant-account retention window)**: inherits the platform-wide FR-X-019 window set in the Module 0 PIA (platform NR-3); no module-specific override.

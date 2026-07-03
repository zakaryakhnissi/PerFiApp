# Feature Specification: Module 12 — Life Admin & Docs

**Feature Branch**: `014-module-12-life-admin`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 12 — Life Admin & Docs (Priority: P3)"; functional requirements FR-DOC-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Structure and quality bar matched to the gold-standard exemplar [specs/002-module-1-rewards](../002-module-1-rewards/).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Life Admin & Docs** tab only — the **Receipt & Warranty Vault** and the **Important Document Wallet**. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** `TransactionStream` and `MerchantGraph` and does not re-implement aggregation or merchant normalization. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated only where they bind a Life Admin behavior.
>
> **Priority discipline (Constitution IX)**: Module 12 is **P3**. The analysis below is thorough, but the feature set is deliberately lean: store documents, link receipts to transactions, remind on warranty expiry, control sharing with audited access. No OCR-heavy auto-extraction pipeline, no document e-signature, no cloud-drive sync, and no money movement are in MVP scope (see Non-Goals).
>
> **Boundary with Module 13 (Workspace)**: Life Admin owns the **document store, receipt links, and warranty reminders**. It does **not** own life-event playbooks or the personal-finance notebook — those are Workspace, which *consumes* `DocumentVault` to reference documents inside a returns/claims playbook.
>
> **Boundary with Module 10 (Inbox)**: Life Admin **emits** reminder intents; it never sends a push notification directly. All warranty-expiry alerts route through the Inbox digest pipeline (ux-foundations §6).

## User Scenarios & Testing *(mandatory)*

Life Admin & Docs turns the shoebox of receipts, warranties, and important papers into a structured, searchable vault wired to the user's real transactions — so a receipt finds its purchase automatically, a warranty warns the user before it lapses, and sharing a document is deliberate and auditable.

### User Story 1 - Receipt → transaction auto-linking (Priority: P1 within this module)

A user uploads (photographs) a receipt and it is automatically linked to the matching transaction in the spine, so the receipt is filed against the real purchase without manual searching.

**Why this priority**: It is the first visible payoff of the module and the foundation every downstream value (returns, claims, warranty linking, Workspace playbooks) builds on. It delivers standalone value the moment one account is connected and one receipt is uploaded. It is the module's Independent Test in the umbrella.

**Independent Test**: With at least one account connected (so `TransactionStream` is populated), upload a receipt whose amount/date/merchant match exactly one transaction; confirm the receipt links to that transaction and the link shows the matched amount, date, merchant, and a freshness stamp.

**Acceptance Scenarios**:

1. **Given** an uploaded receipt and a single matching transaction, **When** matching runs, **Then** the receipt links to the corresponding `TransactionStream` transaction and the link's reasoning cites the matched amount, date, and merchant.
2. **Given** a receipt that could match **two transactions of equal amount at the same merchant on the same day**, **When** matching runs, **Then** the system does **not** silently auto-link to either; it sets the link to `ambiguous_pending`, surfaces both candidates for user confirmation, and records the chosen resolution in the audit trail. *(umbrella AS-4)*
3. **Given** a receipt with no matching transaction (cash purchase, or transaction not yet posted), **When** matching runs, **Then** the link state is `unmatched` (never a guessed/forced match) and the receipt is still stored and searchable, with a "Link manually" affordance.
4. **Given** the `TransactionStream` feed is stale beyond its threshold, **When** matching runs, **Then** the resulting link is **flagged** (it does not assert a confident match against multi-day-old transactions) and a "Refresh transactions" CTA is shown.
5. **Given** an fr-CA user, **When** a receipt amount is displayed, **Then** it is formatted `1 234,56 $` (comma decimal, space thousands, trailing symbol), not `$1,234.56`.

---

### User Story 2 - Warranty storage with expiry reminders (Priority: P1 within this module)

A user stores a warranty against a big-ticket purchase and gets a reminder before it expires, surfaced via Tasks and the Inbox digest, so coverage is used before it lapses.

**Why this priority**: Warranty lapse is a concrete, recurring money loss the module prevents; it is the second umbrella acceptance scenario and the bridge to returns/claims playbooks in Workspace. It is independently valuable once a document can be stored.

**Independent Test**: Store a warranty with an expiry date against a big-ticket item; confirm an expiry reminder is created at the configured offset, routed to Tasks/Inbox, with a bilingual summary — and that re-saving the same warranty does not create a duplicate reminder.

**Acceptance Scenarios**:

1. **Given** a big-ticket purchase, **When** a warranty with an expiry date is stored, **Then** an expiry reminder is created at the default offset (research §6) and surfaced via Tasks and the Inbox digest.
2. **Given** a stored warranty whose reminder was already emitted, **When** the warranty is saved again (or the reminder job re-runs), **Then** no duplicate task/alert is created — reminder generation is idempotent on `(warranty_id, offset_days)`. *(FR-X-003)*
3. **Given** a warranty whose expiry date is edited, **When** the change is saved, **Then** the prior reminder is cancelled and re-scheduled to the new date (no orphaned reminder fires on the old date).
4. **Given** a warranty whose expiry is computed from `purchase_date + term_months`, **When** the term is shown, **Then** the reasoning states the computed basis (FR-X-006), and the reminder summary is present in both EN and FR.

---

### User Story 3 - Important Document Wallet with audited sharing (Priority: P2 within this module)

A user files important documents (insurance policies, tax slips, identity documents, contracts) into structured categories and controls who can view or export each one; every access is audited.

**Why this priority**: The wallet is valuable once the receipt/warranty vault exists; it raises the module from "receipts" to "life admin" and is the most privacy-sensitive surface (it touches another person's documents when shared — see Threat Model). It is P2 because US1/US2 deliver the core MVP first.

**Independent Test**: File a document in a category, grant another profile `view` access, switch to that profile and confirm exactly that document is visible (and nothing else), then export it and confirm an audit event records who exported what and when.

**Acceptance Scenarios**:

1. **Given** a stored document, **When** the user exports or shares it, **Then** access respects the configured sharing controls and the action is recorded in the append-only audit trail. *(umbrella AS-3)*
2. **Given** a document shared with another profile at `view` capability, **When** that profile attempts to **export** it, **Then** the export is **denied** server-side (capability is least-privilege; `view` does not imply `export`) and the denied attempt is audited. *(FR-X-010, SC-015)*
3. **Given** a document with `private` visibility, **When** another profile requests it by id, **Then** the request is denied server-side against the requester's session identity — not by UI filtering — and the denial is audited.
4. **Given** a document was shared and the grant is later revoked, **When** the previously-granted profile reopens the wallet, **Then** the document is no longer visible and no cached copy is shown (revocation is immediate, ux-foundations §10.6 pattern).
5. **Given** a tax/identity document, **When** it is displayed, **Then** its type label and any UI chrome are shown bilingually (EN/FR) with no single-language leaks.

---

### Edge Cases

- **Empty / no connection**: With no account connected, `TransactionStream` is empty — receipt **storage** still works (user-upload has no spine dependency), but auto-linking shows the **Empty** state for the link area ("Connect an account to auto-file receipts"), never a zero-filled or guessed link. The document wallet is fully usable offline-of-spine.
- **Partial connectivity**: With only some accounts connected, a receipt may match a transaction on a connected account or find no candidate on a not-yet-connected one. The link area carries the **Partial Data Banner** and matched links carry an "Incomplete data" chip; an `unmatched` receipt offers "Connect more accounts" rather than asserting a false match.
- **Stale / missing inputs (Fresh or Flagged)**: A stale `TransactionStream` flags the link and offers refresh; matching never runs confident auto-link logic on multi-day-old transactions. `MerchantGraph` staleness degrades merchant-name display to `canonical_name` but does not block storage.
- **Ambiguous match (the canonical case)**: Two equal-amount transactions at the same merchant on the same day → `ambiguous_pending`, both candidates surfaced, user confirms, resolution recorded + audited. The system never breaks the tie silently. A third candidate appearing later (late-posting) re-opens ambiguity rather than overriding a user's prior confirmation.
- **Conflicting advice with Cash Safety precedence**: Life Admin produces **no spend recommendation** — it stores and reminds. A warranty reminder is informational ("important" tier) and never a money action; it therefore never conflicts with `SafeToActSignal`. If a reminder is later wired to a Workspace returns/claims action that implies spending, that action (owned downstream) honors `SafeToActSignal` precedence — Life Admin itself surfaces no Conflict Banner.
- **Multi-currency**: A foreign-currency receipt is matched against the transaction's `cad_amount` (the spine's timestamped FX-converted CAD value), compared by **exact integer-cent equality** — never a float tolerance. The original-currency amount is stored on the document for the user's reference; the module performs **no FX math of its own** (it has no rate inputs).
- **Idempotency / retries**: Receipt-match writes are keyed on `(profile_id, document_id, transaction_id)`; warranty reminders on `(warranty_id, offset_days)`; document uploads on a client-supplied upload id. A retried upload or a replayed matching/reminder job never creates a duplicate document, link, or reminder (FR-X-003).
- **Duplicate upload**: Re-uploading the same receipt (same upload id, or detected duplicate by content hash) is folded onto the existing document rather than creating a second copy.
- **Cross-user boundaries**: Every read/export of a document or link is authZ-checked server-side against the session identity and any Household `MemberScope`; a client-supplied `profile_id` is never trusted. A denied cross-profile access is audited (see Threat Model, SC-015).
- **Email-sourced documents**: A warranty/receipt PDF whose **sole** source is a connected email is tagged `email_sourced = true`; on email-access revocation it is purged within the 7-day window regardless of which store now holds it (FR-X-013). A document the user also uploaded directly retains the upload copy; only the email-sourced enrichment is stripped.
- **Deletion / dormancy**: A document deletion crypto-shreds its per-subject object key (file unrecoverable) and writes a tombstone, preserving the append-only audit log (platform-decisions §5). Dormant-account auto-anonymization (FR-X-019) uses the same key-shred mechanism.
- **Large file / unsupported type**: An over-limit or unsupported upload is rejected with a localized error (ux-foundations Error state), never silently truncated.
- **Bilingual integrity**: A reminder summary, category label, or sharing-control label missing an EN or FR rendering is a defect, not silently shown in one language.

## Clarifications

This module resolves its own ambiguities (Constitution: never block) and records them here. Items requiring product-owner confirmation are listed under **Open questions for the product owner** below; none blocks authoring.

### Session 2026-06-29 (decisions made)

- Q: Does Module 12 perform OCR to auto-extract amount/date/merchant from a receipt image? → A: **MVP supports OCR as an optional, provisional enrichment**, not a requirement. The matching path works from **user-entered or OCR-suggested** amount/date/merchant; an OCR value is `amount_source = 'ocr'` and is **provisional/user-confirmable**, never treated as a settled money figure. A licensed OCR/parse subprocessor (if used) must satisfy Canadian residency or be disclosed (FR-X-020, NR-6 pattern). This keeps US1 shippable with manual entry and lets OCR layer in without schema change.
- Q: What is the default warranty-expiry reminder offset when the user sets none? → A: **30 days before expiry**, user-adjustable; an additional **7-day** final reminder is emitted for warranties valued (purchase_amount) above a "big-ticket" floor. Both route through the Inbox digest at the **important** tier (never **critical**, which is reserved for cash-safety, ux-foundations §6.1).
- Q: What is the match key for receipt→transaction auto-linking? → A: **exact integer-cent amount equality AND same merchant AND same calendar date** (within the transaction's local date). Two or more candidates on this key → `ambiguous_pending` (AS-4). Amount is compared as integer cents, never with a float/percentage tolerance.
- Q: Are `pending` transactions eligible match candidates? → A: **No.** Only `posted` transactions with `dedup_state ∈ {unique, merged_primary}` are candidates; `pending`, `merged_duplicate`, and `suspected_duplicate` rows are excluded so a receipt never links to a provisional or duplicate row.
- Q: Can a document be shared outside the user's household (a public link)? → A: **No public links in MVP.** Sharing is `private`, `household_scoped` (per Household `MemberScope`), or `explicit_grant` to a named profile, each least-privilege (`view` vs `export`) and audited. Public/anonymous sharing is a Non-Goal.

### Open questions for the product owner (non-blocking; documented defaults applied)

1. **Big-ticket floor for the extra 7-day reminder** — default applied: **CAD $500.00** (50000 cents). *Options: $250 / $500 / $1,000 / user-set. Recommended: $500, user-adjustable.*
2. **Max document file size / accepted types** — default applied: **20 MB**, types `{jpeg, png, heic, pdf}`. *Recommended as a platform/ops setting; confirm in the plan.*
3. **OCR subprocessor** — whether to ship OCR in MVP at all, and if so the Canadian-region-or-disclosed vendor. *Recommended: ship manual-entry MVP; OCR as a fast-follow behind the same `amount_source='ocr'` provisional path.*

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-DOC-*):

- **FR-DOC-001 (Receipt & warranty linking)**: System MUST auto-link uploaded receipts to matching transactions and warranties to big-ticket items with expiry reminders. Matching MUST use exact integer-cent amount equality plus merchant plus calendar date against **posted, non-duplicate** `TransactionStream` rows; two or more equal candidates MUST NOT be auto-linked but surfaced as `ambiguous_pending` for user confirmation with the resolution recorded (umbrella AS-4). A receipt with no candidate is `unmatched`, never a guessed match. Warranty expiry reminders MUST be generated idempotently on `(warranty_id, offset_days)` and routed through the Inbox digest (never a direct push). Stale `TransactionStream` MUST flag the link rather than assert a confident match (FR-X-008).
- **FR-DOC-002 (Document wallet & audited access)**: System MUST store important documents with structured categories, export/sharing controls, and audited access. Sharing MUST be least-privilege (`view`/`export`), enforced **server-side** against the session identity (UI filtering alone is non-compliant), and **every** view/export/share/denial MUST be recorded in the append-only audit trail. Stored files MUST be encrypted at rest in a Canadian region with per-subject keys enabling crypto-shred deletion. Document type and control labels MUST be bilingual (EN/FR).

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)):

- **FR-X-001 (Integration)** — receipt linking is computed against current spine `TransactionStream`/`MerchantGraph`.
- **FR-X-002 (Money exactness)** — receipt/warranty amounts are integer minor units; amount matching is exact integer-cent equality. **No binary float anywhere.** The module has **no rate/FX math of its own.**
- **FR-X-003 (Recommend, never move + idempotency)** — Life Admin moves no money; document/link/reminder writes are idempotent and safe to retry.
- **FR-X-004 (CAD + time-to-goal)** — amounts shown in CAD; time-to-goal applies only where a document/warranty is tied to a goal (rare; omitted otherwise per ux-foundations §8.4).
- **FR-X-005 (Bilingual & locale-correct formatting)** — all labels EN/FR; amounts/dates via `@finos/format` (fr-CA `1 234,56 $`).
- **FR-X-006 (Explainability)** — every auto-link and warranty-expiry derivation carries inputs + bilingual reasoning.
- **FR-X-007 (Audit trail)** — every document view/export/share/delete and every ambiguity resolution recorded append-only, separate from debug logs.
- **FR-X-008 (Freshness)** — links carry a `FreshnessStamp` reflecting the matched `TransactionStream`; stale ⇒ flag.
- **FR-X-009 (Security)** — documents encrypted in transit + at rest; per-subject keys; no secret in logs.
- **FR-X-010 (Least privilege & threat model)** — sharing touches another person's documents/financial data ⇒ **threat model mandatory** (below); authZ server-side on every cross-user boundary.
- **FR-X-011 (Contracts & versioning)** — `DocumentVault`/`WarrantyReminders`/`ReceiptLinks` are semver'd with consumer+provider tests; consumed spine contracts pinned.
- **FR-X-012 (Graceful degradation)** — spine/storage failures degrade gracefully (storage retried; matching withheld, not wrong).
- **FR-X-013 (Privacy / email-sourced purge)** — email-sourced documents purged within 7 days on email-access revocation regardless of store.
- **FR-X-014 (Observability/redaction)** — ingestion/match logs redact PII + monetary values; audit trail separate.
- **FR-X-015 (Performance)** — vault list and document open meet the ≤300 ms module-switch budget via cached metadata.
- **FR-X-016 (Accessibility)** — WCAG 2.1 AA; bilingual screen-reader labels on documents, chips, and controls.
- **FR-X-019 (Maximum retention)** — dormant-account documents auto-anonymized via key-shred.
- **FR-X-020 (Data residency)** — all documents + metadata stored/processed in a Canadian region; any OCR subprocessor disclosed + agreement-backed.

### Key Entities *(include if feature involves data)*

Consumed from the Spine (read-only contracts, not owned here): `TransactionStream` (`finos:spine/TransactionStream/1.0.0`), `MerchantGraph` (`finos:spine/MerchantGraph/1.0.0`).

Owned/provided by this module (full fields in [data-model.md](./data-model.md)):

- **Document / DocumentVault**: A stored file's metadata — category, title, optional amount (integer cents), document date, merchant ref, storage ref (encrypted, Canadian-region), source, and sharing controls. **Provided** to Workspace, Tasks, Inbox, Travel.
- **ReceiptLink / ReceiptLinks**: A link between a receipt document and a `TransactionStream` transaction with a match state (matched / ambiguous_pending / unmatched / user_confirmed / user_rejected), method, candidate set, and bilingual reasoning. **Provided** to Tasks, Inbox, Workspace, Travel.
- **Warranty / WarrantyReminders**: A warranty against a big-ticket purchase with coverage kind, expiry date/source, and idempotent reminder intents (each with a bilingual summary and Inbox priority tier). **Provided** to Tasks, Inbox, Workspace.
- **SharingGrant**: A least-privilege, optionally-expiring grant (`view`/`export`) of a document to another profile; enforced server-side; every use audited.
- **AuditEvent**: Append-only record of document view/export/share/delete and ambiguity resolution (Principle VI / FR-X-007).

### Money Correctness *(MANDATORY — this feature stores and displays monetary values)*

- **Numeric representation**: Receipt totals, warranty purchase amounts, and the big-ticket floor are **integer minor units (CAD cents)** (`MoneyCents.amount_cents`). The module stores foreign-currency original amounts as integer minor units in their currency for reference but performs **no FX conversion of its own** — it compares against the spine's already-converted `cad_amount`. **There are no rate/multiplier fields in this module.** No binary float in any path.
- **Rounding rules**: The module performs **no monetary arithmetic that requires rounding** (it stores, links, and reminds). Matching is **exact integer-cent equality** between a receipt amount and a transaction's `cad_amount` — never a float or percentage tolerance. Any "big-ticket" comparison is integer-cent `≥` against the floor. Because there is no rate math, there is no half-up rounding step owned here; all CAD figures it displays come pre-rounded from the spine or from exact user-entered cents.
- **Currency & locale**: CAD throughout; en-CA and fr-CA locale-correct formatting via `@finos/format` (fr-CA `1 234,56 $`). Foreign-currency original amounts are labelled with their ISO currency for reference only.
- **Determinism & fixtures**: Matching and big-ticket classification are pure and deterministic. Mandatory fixtures: (a) **exact-equality match** — receipt `4799` cents matches transaction `cad_amount = 4799` and does **not** match `4800`; (b) **ambiguity** — two transactions of `cad_amount = 4799` at the same merchant on the same date both surface as candidates and neither auto-links; (c) **big-ticket floor** — `49999` cents is below and `50000` is at/above the `$500.00` default floor (boundary is `≥`); (d) **fr-CA formatting** — `123456` cents renders `1 234,56 $`.
- **Idempotency**: Document uploads keyed on a client upload id; receipt-match writes on `(profile_id, document_id, transaction_id)`; reminders on `(warranty_id, offset_days)`. Replays never double-apply (Principle IV, FR-X-003).
- **Recommend-only**: Confirmed — Life Admin stores, links, and reminds; it never executes any payment or moves money (FR-X-003). A warranty reminder is informational, not a money action.

### Security & Privacy Threat Model *(MANDATORY — Document sharing touches another person's documents/financial data)*

- **Assets**: A profile's `DocumentVault` (receipts, warranties, **insurance policies, tax slips, identity documents, contracts**), the underlying encrypted files, and the `ReceiptLinks` that tie documents to specific transactions (revealing purchase history and amounts). Identity/tax/insurance documents are among the most sensitive PII in FinOS.
- **Trust boundaries / actors**: The owning user; other profiles granted `view`/`export` via sharing or Household `MemberScope`; the spine (read-only provider of transactions/merchants); Canadian-region object storage + KMS; an optional OCR subprocessor; the Inbox pipeline (receives reminder intents, not documents).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc — reading another profile's document by id | DocumentVault, files | authZ on every read/export keyed on **server-side session identity**, never a client-supplied `profileId`; Postgres RLS as defense-in-depth | Yes (UI filtering alone does NOT satisfy) |
  | Capability escalation — a `view`-only grantee downloads/exports the file | document file | capability check (`view` ⊉ `export`); signed download URL minted **only** for an `export` grant, short-lived, per-request | Yes |
  | Stale grant / revocation bypass — revoked grantee still sees cached doc | DocumentVault | grants checked at request time; revocation immediate; no client cache of another profile's documents (ux-foundations §10.6) | Yes |
  | File at rest exposure | encrypted files | KMS-envelope, per-subject keys, Canadian region; crypto-shred on delete (FR-X-013/019) | Yes |
  | PII leak in logs (amounts, doc titles, OCR text) | balances, document content | structured logs redact PII + monetary values + OCR text; audit trail separate (FR-X-014) | Yes |
  | OCR subprocessor exfiltration / out-of-region processing | document images, extracted PII | subprocessor Canadian-region or disclosed + agreement-backed (FR-X-020); retains classification/metadata, not raw images beyond processing | Yes (procurement + go-live gate) |
  | Email-sourced document persists after revocation | email-inferred docs | `email_sourced` flag drives 7-day purge cascade regardless of store (FR-X-013) | Yes |
  | Signed-URL leakage / replay | document file | URLs short-lived, single-use where feasible, scoped to one document + grantee; access audited | Yes |

- **AuthZ enforcement**: Every cross-profile read/export/share of a document is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. A `view` grant never confers `export`; neither confers write/delete. Denied access is **audited** (SC-015 pattern).
- **Audit**: Every document view, export, share-grant, share-revoke, delete, and every ambiguous-match resolution is written to the append-only audit trail with actor, target document/link id, and timestamp — separate from debug logs (FR-X-007/014).
- **Data minimization, retention & revocation**: The vault stores only document metadata + the encrypted file + minimal extracted fields the user confirms. Email-sourced documents obey the FR-X-013 revocation cascade; all documents obey the dormant-account retention bound (FR-X-019), both via crypto-shred. OCR text is retained only as confirmed structured fields, not as raw extracted blobs.
- **Data residency**: All documents, metadata, links, and any OCR processing inherit the Canadian-region residency constraint (FR-X-020); no document or extracted PII is processed outside Canada without explicit disclosure + a PIPEDA accountability/transfer agreement.

## UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab & screen anatomy**: Life Admin appears in the "More" overflow (P3, ux-foundations §5.1) with localized label **Docs**. The primary screen follows the standard Module Screen Anatomy (§5.2): nav bar, conditional Partial Data Banner, the document/receipt list (each value + freshness chip), and reminder cards.
- **Six-state matrix (§3) — defined for every data view**:
  - **Empty**: no documents → first-run illustration + "Add your first document" / "Connect an account to auto-file receipts" CTA; never zero-filled.
  - **Loading**: skeleton list rows matching populated layout; shimmer (reduced-motion: fade).
  - **Partial**: some accounts connected → Partial Data Banner on the link area; matched links carry an "Incomplete data" chip; `unmatched` receipts offer "Connect more accounts".
  - **Stale**: `TransactionStream` past threshold → link area shows the Stale freshness chip + "Refresh transactions" CTA; document storage itself is unaffected.
  - **Error / Degraded**: storage or spine unreachable → Unavailable chip + non-alarming "Unable to reach {source} — we'll try again"; never assert a match in this state.
  - **Withheld**: receipt matching cannot run on a stale money input → the auto-link area shows the Withheld Card ("Refresh transactions to auto-file this receipt"), with the receipt still stored. (No money figure is ever guessed.)
- **Components used**:
  - **Recommendation Card (§4.1)** — the **ambiguous-match disambiguation** is rendered as a Recommendation Card: action ("Confirm which purchase this receipt belongs to"), an expandable **Why** layer listing the candidate transactions (amount, date, merchant, freshness), and a state layer. Resolution is a user confirmation, not a money action, so it does **not** require a Confirm-Action sheet — but it **is** audited.
  - **Confirm-Action sheet (§4.2)** — used for **export/share** of a document (a consequential action): recaps the document, the grantee, the capability, and shows the disclaimer; primary CTA "Share document with {Name}" / "Partager le document avec {Name}", never "OK". (No money figure; the financial-impact block is replaced by the grant summary.)
  - **Freshness chip (§4.3)** — on every receipt link and any spine-sourced value; stale chip is tappable to the explainer.
  - **Conflict Banner (§4.4)** — **not used**: Life Admin produces no optimization signal that can conflict with Cash Safety (see Edge Cases). The checklist item is satisfied by this explicit "no conflict surface" statement.
- **Notification restraint (§6)**: warranty-expiry reminders are emitted to the **Inbox digest** at the **important** tier (never **critical**); Life Admin sends no standalone push.
- **Household/multi-profile (§5.5, §10.6)**: when viewing another member's docs (per `MemberScope`), the persistent "Viewing {Name}'s finances" banner is shown; revoked scope shows the Empty state immediately, no cached docs.
- **Accessibility (§7)**: documents, chips, and sharing controls have localized EN/FR screen-reader labels; tap targets ≥44×44 pt; dynamic type and reduced-motion honored; no info by color alone (link state = icon + color + text).
- **Money/locale (§8)**: all amounts via `@finos/format`; fr-CA `1 234,56 $`; foreign-currency reference amounts labelled with ISO code.
- **Disclaimer (§8.5)**: the "not regulated financial advice" disclaimer appears on the export/share Confirm-Action sheet.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-D-001 (Auto-link accuracy)**: For receipts with exactly one exact-equality candidate (amount+merchant+date) in posted transactions, ≥ 95% link to the correct transaction without manual intervention; **0** silent auto-links occur when ≥ 2 equal candidates exist (umbrella AS-4).
- **SC-D-002 (No false money match)**: 0 receipts link to a `pending`, `merged_duplicate`, or `suspected_duplicate` transaction; 100% of amount comparisons use exact integer-cent equality (no float tolerance).
- **SC-D-003 (Warranty protection)**: 100% of stored warranties with an expiry date generate an expiry reminder at the configured offset, surfaced via the Inbox digest before expiry; 0 duplicate reminders from replays (idempotent on `(warranty_id, offset_days)`).
- **SC-D-004 (Explainability)**: 100% of auto-links and ambiguity prompts can display "why" with their inputs (amount, date, merchant, candidates) in EN and FR.
- **SC-D-005 (Sharing safety)**: 0 cross-profile document exposures in API-layer authorization testing; 0 `export` actions succeed on a `view`-only grant; every denied access is audited (umbrella SC-015).
- **SC-D-006 (Audited access)**: 100% of document view/export/share/delete actions and ambiguity resolutions are recorded in the append-only audit trail (FR-X-007).
- **SC-D-007 (Freshness safety)**: 0 receipt links asserted as confident matches against a `TransactionStream` past its staleness threshold without a visible stale flag (umbrella SC-006).
- **SC-D-008 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Life Admin strings (labels, reminder summaries, categories); 100% of displayed amounts/dates use the active locale's conventions (umbrella SC-008).
- **SC-D-009 (Privacy cascade)**: 100% of email-sourced documents are purged within 7 days of email-access revocation regardless of store (FR-X-013); dormant-account documents are key-shredded per the retention bound (FR-X-019).
- **SC-D-010 (Residency)**: 100% of documents, metadata, and any OCR processing occur in a Canadian region; any subprocessor processing data outside Canada is disclosed + agreement-backed before go-live (umbrella SC-017).
- **SC-D-011 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).

## Assumptions

- **Spine availability**: Module 0 exposes `TransactionStream` and `MerchantGraph` as versioned, freshness-stamped contracts; Life Admin consumes them and does not re-aggregate or re-normalize merchants. Until a contract is available, auto-linking degrades to manual linking; document storage is unaffected.
- **Object storage + KMS**: Canadian-region encrypted object storage (S3 `ca-central-1`) with per-subject KMS keys is provided by the platform (platform-decisions §2/§5); Life Admin stores references, never bytes, in its DB schema.
- **Inbox availability for reminders**: Warranty reminders are emitted to the Inbox digest pipeline (ux-foundations §6); until Inbox ships, reminders are persisted and surfaced in-module (Tasks/in-app) and back-filled to Inbox when available — they are never sent as direct pushes.
- **OCR is optional**: Receipt amount/date/merchant may be user-entered; OCR is a provisional enrichment (`amount_source='ocr'`) layered behind the same path, with a Canadian-region-or-disclosed subprocessor selected in planning. The module ships its MVP without requiring OCR.
- **No money movement**: Life Admin is a vault and reminder surface; it never executes payments, returns, or claims — those are downstream (Workspace) actions that honor Cash Safety precedence.
- **Staleness windows**: Canada-oriented defaults (research §6), user-adjustable; final tuning in the Module 0 privacy/ops review.
- **Not regulated advice**: Warranty/expiry reminders are informational decision support, not regulated financial advice (surfaced on the share Confirm-Action sheet).

## Non-Goals (Constitution IX — P3 stays MVP-scoped)

- **No money movement**: no returns/refund initiation, no claim filing, no payment — Life Admin reminds; downstream modules act.
- **No life-event playbooks or notebook** — those are Module 13 (Workspace), which consumes `DocumentVault`.
- **No public/anonymous document sharing** — sharing is private, household-scoped, or named explicit grants only.
- **No e-signature, document editing, or PDF generation** — the vault stores and serves; it does not author documents.
- **No cloud-drive (Google Drive/Dropbox) sync** in MVP.
- **No heavy OCR/ML extraction pipeline** — OCR, if present, is an optional provisional enrichment, not a parsing platform.
- **No FX or valuation math** — Life Admin owns no rate inputs; foreign amounts are compared against the spine's already-converted `cad_amount`.

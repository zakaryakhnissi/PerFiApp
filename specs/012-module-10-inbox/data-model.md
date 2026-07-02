# Phase 1 Data Model: Module 10 — Inbox & Notifications

**Feature**: `012-module-10-inbox` | **Date**: 2026-06-29

Entities the Inbox module **owns/provides**. Consumed contracts (`TransactionStream`, `MerchantGraph`, `ConnectionConsent` from Module 0; the shared value objects `MoneyCents`/`FreshnessStamp`/`Reasoning`; and the `ModuleAlertEvent` envelope every source module emits) are referenced, not redefined here.

**Money typing convention** (Principle IV): Inbox **carries but never computes** money. Any `*cad_amount` is a `finos:common/MoneyCents/1.0.0` value — **integer minor units (CAD cents)** — produced and half-up-rounded by the *emitting* module. Decimal fractions Inbox does own (e.g. impulse score) are **arbitrary-precision decimal**, string-encoded on the wire (`^[0-9]+(\.[0-9]+)?$`). No field is a binary float (spec Clarifications Q3).

**Freshness convention** (Principle VIII): every relayed/externally-sourced value carries a `FreshnessStamp`. Inbox relays the source's `is_stale` verbatim; a stale-**money** alert is flagged and **never** elevated to a push (FR-INB-005, Clarifications Q4).

---

## Shared value objects (referenced, owned by Module 0)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
`source`, `observed_at` (UTC), `staleness_threshold_seconds`, `is_stale` (derived), optional `next_refresh_at`. Relayed on every item.

### Reasoning — `finos:common/Reasoning/1.0.0`
`inputs`, `rationale_en`, `rationale_fr`. Used for "why this sender is impulse-first" / "why critical".

### MoneyCents — `finos:common/MoneyCents/1.0.0`
`amount_cents` (integer), `currency` (ISO-4217, default CAD). Carried, never recomputed/converted by Inbox.

---

## Owned entities

### ModuleAlertEvent (ingested envelope — provided contract `finos:inbox/ModuleAlertEvent/1.0.0`)
The standardized inbound alert every source module emits. Inbox **consumes/validates** it (no module pushes directly — ux-foundations §6.3).

| Field | Type | Validation |
|-------|------|------------|
| source_event_id | string (uuid) | required, **unique** — idempotency key; replays never duplicate (FR-INB-007) |
| module_id | string | required; authenticated in-process emitter identity, never client-supplied |
| profile_id | string (uuid) | required; routing re-validated server-side on session identity + MemberScope (Threat Model) |
| event_type | string | required; part of dedup key |
| priority_tier | enum {critical, important, informational} | required |
| safety_class | enum {safe_to_act, credit_hard_avoid, budget_headroom, optimization, none} | default `none`; drives precedence ordering (FR-INB-004) |
| subject_ref | {subject_hash, ref_kind?} | required; opaque — Inbox never dereferences source domain objects |
| payload | {text_en, text_fr, cta{label_en,label_fr,action_url}, cad_amount?, time_to_goal_note_*?} | both EN+FR and a CTA required or the assembler **rejects** the alert (FR-INB-005); `action_url` MUST match `^finos://` (anti-phishing) |
| reasoning | Reasoning | optional, recommended for recommendation-type alerts (FR-X-006) |
| expires_at | timestamp (UTC) | optional; past-expiry ⇒ dropped from push, shown expired in-app |
| freshness | FreshnessStamp | required; relayed verbatim; stale-money ⇒ flag + no push |

**Rule**: `cad_amount` MUST be `MoneyCents` (integer). An alert carrying a money value as a float/bare number is rejected/flagged (defends Principle IV at the boundary).

### InboxItem (owned)
A normalized, deduplicated, prioritized alert as it appears in the Inbox tab and inside a digest.

| Field | Type | Validation |
|-------|------|------------|
| item_id | string (uuid) | required |
| source_event_id | string (uuid) | required; idempotency lineage to the originating alert |
| profile_id | string (uuid) | required; scopes ownership (authZ) |
| module_id | string | required |
| tier | enum {critical, important, informational} | required (from `priority_tier`) |
| safety_class | enum {…} | default `none` |
| dedup_key | string | required = hash(module_id, event_type, subject_hash); collapses duplicates within 24 h (SC-I-005) |
| text_en / text_fr | string | both required (bilingual) |
| cta | {label_en, label_fr, action_url} | required; `action_url` `^finos://` |
| cad_amount | MoneyCents | optional; carried, rendered via `@finos/format`, never recomputed |
| state | enum {active, queued, delivered, expired, dismissed, overridden} | required |
| overridden_by | string (uuid) \| null | set when `state = overridden` (lost a conflict to a higher safety_class) |
| freshness | FreshnessStamp | required; relayed; stale-money ⇒ flagged, not pushed |
| audit_ref | string (uuid) \| null | append-only audit linkage (FR-X-007) |

### NotificationDigest (owned — provided contract `finos:inbox/NotificationDigest/1.0.0`)
A bundled set of `InboxItem`s for one delivery window.

| Field | Type | Validation |
|-------|------|------------|
| digest_id | string (uuid) | required, **unique** — idempotency key for dispatch (FR-INB-007) |
| profile_id | string (uuid) | required; reads authZ-checked server-side |
| window | enum {morning, evening, breakthrough} | required; default cadence evening-only (Clarifications Q1) |
| title_en / title_fr | string | both required (bilingual) |
| items | list<InboxItem> | ≥ 1; ordered Critical → Important → Informational, then by `safety_class` precedence |
| budget_consumed | {money_pushes_today, critical_pushes_today, budget_limit, critical_ceiling} | enforces SC-009: money ≤ budget_limit (default 2), critical ≤ ceiling (default 1) |
| coalesced_critical_count | integer \| null | for breakthrough: # criticals coalesced into one push (Clarifications Q2) |
| dispatch_state | enum {assembled, dispatched, acknowledged, suppressed_by_preference, failed} | required; failed ⇒ idempotent retry on digest_id |
| audit_ref | string (uuid) \| null | dispatch audit linkage |
| freshness | FreshnessStamp | required (source = `derived`) |

### UnsubscribeAction (owned — provided contract `finos:inbox/UnsubscribeAction/1.0.0`)
A proposed-then-confirmed unsubscribe / roll-up / keep decision. **Recommend-never-execute** (Clarifications Q6).

| Field | Type | Validation |
|-------|------|------------|
| action_id | string (uuid) | required, **unique** — idempotency key |
| profile_id | string (uuid) | required |
| sender_ref | {sender_id, display_name, domain?, category?, email_sourced} | required; **identity + classification only**, never raw bodies (FR-X-013) |
| action | enum {unsubscribe, roll_up, keep} | required |
| impulse_rank | {score (decimal string 0..1), rank, signal_source} | required; `signal_source = curated_heuristic` ⇒ incomplete picture (Partial) |
| reasoning | Reasoning | required (bilingual "why first", SC-I-006) |
| execution_state | enum {proposed, user_confirmed, executing, completed, failed, cancelled} | required; never past `proposed` without explicit user confirmation |
| confirmed_at | timestamp (UTC) \| null | set on confirmation (audited) |
| audit_ref | string (uuid) \| null | audit linkage |
| freshness | FreshnessStamp | required (source = `email_parser`/`derived`) |

### PromotionalSender (owned)
A detected promotional sender — **sender identity + classification only**.

| Field | Type | Validation |
|-------|------|------------|
| sender_id | string | required, unique per profile |
| profile_id | string (uuid) | required |
| display_name | string | required |
| domain | string | optional |
| category | string | optional (e.g. retail, travel, food_delivery) |
| impulse_score | decimal (string-encoded, 0..1) | optional; from `TransactionStream`/`MerchantGraph` or curated heuristic |
| email_sourced | boolean | default true; drives the 7-day revocation cascade (FR-X-013) |
| merchant_ref | MerchantRef \| null | optional link to a `MerchantGraph` node |
| freshness | FreshnessStamp | required |

**Rule (FR-X-013)**: raw message bodies are **never** persisted. On email-access revocation, all rows where `email_sourced = true` (and any email-only enrichment elsewhere) are deleted within 7 days, regardless of which store holds them.

### NotificationPreference (owned — provided contract `finos:inbox/NotificationPreference/1.0.0`)
Per-user push/cadence/quiet/mute controls.

| Field | Type | Validation |
|-------|------|------------|
| profile_id | string (uuid) | required |
| tier_push | {critical, important, informational} booleans | required; informational default false (in-app only) |
| cadence | enum {morning, evening, both} | default `evening` (Clarifications Q1) |
| quiet_hours | {start_local HH:MM, end_local HH:MM} \| null | optional |
| muted_sources | list<module_id> | default [] |
| budget_limit | integer | default 2 (SC-009) |
| critical_ceiling | integer | default 1 (Clarifications Q2) |
| non_suppressible_safety | boolean (const true) | **invariant** — cannot be false; critical safety alerts always surfaced in-app, suppression audited (FR-INB-006, Clarifications Q5) |
| updated_at | timestamp (UTC) \| null | audited on change |

### AuditEvent (append-only; Principle VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | string (uuid) | required |
| profile_id | string (uuid) | required |
| type | enum {digest_dispatched, breakthrough_delivered, critical_suppressed, unsubscribe_confirmed, cross_user_routing_denied} | |
| payload | map | PII/money **redacted** in debug logs; full record only in the append-only audit trail (FR-X-014) |
| occurred_at | timestamp (UTC) | required, immutable |

**Idempotency rule (Principle IV)**: digest assembly, push dispatch, and unsubscribe execution are keyed on `source_event_id` / `digest_id` / `action_id`; a replayed event never double-applies, double-sends, or double-counts the budget (FR-INB-007).

---

## State transitions

### InboxItem
- `active` → **`queued`** when the daily push budget is exhausted (held to next digest, **never dropped**; in-app visible).
- `active`/`queued` → **`delivered`** on successful digest/breakthrough dispatch.
- any → **`expired`** when `expires_at` passes before delivery (dropped from push, struck-through in-app).
- `active` → **`dismissed`** on user dismiss (session-scoped for banners; persistent for items).
- `active` → **`overridden`** when a higher `safety_class` item wins a same-moment conflict (shown "see safety alert first", CTA-deferred; `overridden_by` set) — Inbox never silently drops the loser (ux-foundations §10.4).

### NotificationDigest dispatch
- `assembled` → `dispatched` → `acknowledged` (happy path).
- `assembled` → **`suppressed_by_preference`** when push is withheld per `NotificationPreference`; **critical safety items remain surfaced in-app** and the suppression is **audited** (Clarifications Q5) — no silent drop.
- `dispatched` → **`failed`** on delivery error → idempotent retry with backoff (FR-X-012), keyed on `digest_id`.

### UnsubscribeAction execution
- `proposed` → **`user_confirmed`** ONLY via an explicit Confirm-Action sheet (recommend-never-execute, Clarifications Q6).
- `user_confirmed` → `executing` → `completed` (idempotent on `action_id`); `executing` → `failed` → retry with backoff.
- `proposed`/`user_confirmed` → `cancelled` on user dismiss.

### Budget / breakthrough guards
- money pushes/day reaching `budget_limit` (default 2) → further non-critical alerts **queued** to next digest.
- a `critical` alert bypasses the digest cadence (breakthrough) **iff** `critical_pushes_today < critical_ceiling`; further criticals are **coalesced** into the single breakthrough push ("N urgent money alerts"), ordered by `safety_class` precedence (Clarifications Q2).
- a stale-**money** alert ⇒ flagged, **never** elevated to a push (Clarifications Q4).

---

## Relationships

- `ModuleAlertEvent` 1—1 `InboxItem` (after normalization/dedup; duplicates collapse via `dedup_key`).
- `NotificationDigest` 1—* `InboxItem` (a digest bundles many items for one window).
- `InboxItem` *—1 `NotificationDigest` (an item belongs to at most one delivered digest, plus in-app visibility).
- `UnsubscribeAction` *—1 `PromotionalSender`.
- `PromotionalSender` *—0..1 `MerchantGraph` node (impulse ranking; email-sourced enrichment cascade).
- `NotificationPreference` 1—1 `profile_id`.
- All owned entities are scoped by `profile_id`; every cross-profile read/route is authZ-checked **server-side** on session identity + `MemberScope` (Threat Model), and a denied cross-user routing attempt is audited.

## Consumed contracts (referenced, owned elsewhere)

`TransactionStream`, `MerchantGraph`, `ConnectionConsent` (Module 0); shared value objects `MoneyCents`, `FreshnessStamp`, `Reasoning` (Module 0); `ModuleAlertEvent` as emitted by every source module. Accessed only through versioned contract clients (`contracts/consumed/`), never via direct spine/source storage.

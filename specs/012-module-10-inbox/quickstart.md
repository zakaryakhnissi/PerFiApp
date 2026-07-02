# Quickstart & Validation: Module 10 — Inbox & Notifications

**Feature**: `012-module-10-inbox` | **Date**: 2026-06-29

A run/validation guide proving Inbox works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `TransactionStream`, `MerchantGraph`, `ConnectionConsent`, and the shared value objects `MoneyCents`, `FreshnessStamp`, `Reasoning`.
- A test harness that emits `ModuleAlertEvent`s (the provided ingestion envelope) from ≥ 2 simulated source modules (e.g. Bills + Cash Safety + Rewards), with controllable `priority_tier`, `safety_class`, `expires_at`, `freshness`, and bilingual `payload`.
- A BullMQ (Redis) test instance for the ingestion / digest-assembly / push-dispatch workers; a stubbed Expo/EAS push transport that records dispatches without hitting APNs/FCM.
- A stubbed `EmailParserPort` returning sender identity + classification only (never raw bodies) for US3.
- Toolchain per the ratified platform plan ([platform-decisions.md](../_platform/platform-decisions.md)); commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:inbox-fixtures      # source-module alert fixtures, sender list, merchant nodes, prefs
```

## Validation by user story

### US1 — Unified Money Digest (P1 within module) 🎯 MVP

```bash
<pkg> test inbox/unit/ordering
<pkg> test inbox/unit/budget
<pkg> test inbox/integration/digest-assembly
```

Expected:
- Emitting actionable alerts from ≥ 2 modules within a window yields **one** (at most two) daily digest push(es); the body lists the highest-priority item; every section carries a verb CTA (SC-I-001/004).
- Items are sorted **Critical → Important → Informational**, then by `safety_class` precedence (FR-INB-004).
- **Dedup**: two alerts with the same (`module_id`, `event_type`, `subject_hash`) within 24 h collapse to **one** `InboxItem` (SC-I-005).
- **Budget**: with the budget (default 2) spent, a further Important alert is **`queued` to the next digest, never dropped**; it remains visible in-app (FR-INB-003, SC-I-001).
- **Display/relay fixture (mandatory)**: a `cad_amount` of `123456` cents renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA) via `@finos/format` — carried, never recomputed (SC-I-004, Clarifications Q3).
- **Cadence**: with cadence `evening`, no morning push is sent; eligible items roll into the evening digest (FR-INB-006, Clarifications Q1).

### US2 — Critical Breakthrough Alerts (P1 within module)

```bash
<pkg> test inbox/unit/breakthrough
<pkg> test inbox/integration/breakthrough
```

Expected:
- A `critical` alert with `expires_at` within the day is **delivered immediately**, bypassing the digest cadence (SC-I-002).
- **Critical ceiling (default 1/day)**: a second critical the same day is **coalesced** into the single breakthrough push ("2 urgent money alerts" / "2 alertes financières urgentes"), ordered by `safety_class` precedence; each critical is still individually visible in-app (SC-I-003, Clarifications Q2).
- **Safety precedence**: a Cash Safety `safe_to_act` critical and a Rewards `optimization` alert for the same moment → safety ordered first and gets breakthrough; the optimization item is marked `overridden` ("see safety alert first"), **never silently dropped** (ux-foundations §3.1/§10.4).
- **Stale-money never amplified**: a critical alert whose source `freshness.is_stale = true` on a money input is shown with the Stale chip and is **not** elevated to a push; Inbox relays the source's withhold/flag verbatim and fabricates nothing (Clarifications Q4, FR-X-008).
- **No silent drop**: with push disabled for the Critical tier, the alert is still surfaced in-app with a prominent indicator and the suppression is **audited** (SC-I-002, Clarifications Q5).

### US3 — Email Subscription Clean-Up (impulse-spend-first) (P2 within module)

```bash
<pkg> test inbox/unit/impulse-rank
<pkg> test inbox/integration/email-cleanup
```

Expected:
- With an email source connected, promotional senders are listed with **unsubscribe / roll-up / keep**, ordered **impulse-spend-trigger-first** using `TransactionStream`/`MerchantGraph`; the "why first" `Reasoning` is displayable bilingually for 100% of ranked senders (SC-I-006, FR-INB-001).
- When the spend signal is unavailable, ranking falls back to the **curated heuristic** and the picture is marked **incomplete** (Partial state); `impulse_rank.signal_source = curated_heuristic`.
- **Recommend-never-execute**: selecting "unsubscribe" produces an `UnsubscribeAction` (`execution_state = proposed`); only an explicit **Confirm-Action sheet** advances it to `user_confirmed` → executed; execution is **idempotent on `action_id`** — no silent unsubscribe (SC-I-012, Clarifications Q6).
- **Body non-retention (mandatory)**: after parsing, the store holds **only** sender identity + classification — **0 raw message bodies** in any durable store, cache, or log (SC-I-007, FR-X-013).
- **Revocation cascade**: revoking email access deletes all `email_sourced = true` rows and any email-only enrichment within **7 days**, regardless of which store holds it (SC-I-008, FR-X-013).
- **Graceful degradation**: email feed / parser timeout shows the Error/Unavailable state and retries with backoff; a partial sender list is never presented as complete (FR-X-012).

### US4 — Notification Preferences & Quiet Controls (P2 within module)

```bash
<pkg> test inbox/integration/preferences
```

Expected:
- Setting Informational to "in-app only" → no push; the item appears only in the Inbox tab (FR-INB-006).
- Quiet hours defer a non-critical push to the next allowed window; a critical breakthrough still delivers but respects the critical ceiling (Clarifications Q5).
- Muting a source suppresses its non-critical pushes (shown muted in-app); a **critical safety alert from a muted source is still surfaced in-app** — the `non_suppressible_safety` invariant holds and any suppression is audited (FR-INB-006, SC-I-002).

## Contract tests (mandatory — Principle VII / SC-I-011)

```bash
<pkg> test inbox/contract/consumed   # TransactionStream, MerchantGraph, ConnectionConsent, MoneyCents, FreshnessStamp, Reasoning
<pkg> test inbox/contract/provided   # ModuleAlertEvent, NotificationDigest, UnsubscribeAction, NotificationPreference
```

Expected:
- All consumer + provider contract tests pass.
- The **`ModuleAlertEvent` provider verification** passes; each emitting source module runs a **consumer** test against the published envelope, so an emitter on a breaking major **fails CI** rather than mis-assembling at runtime (research §10).
- An intentionally bumped/broken consumed schema **fails CI** and **disables** the dependent path (version-skew behavior, SC-012).

## Cross-cutting checks

- **Recommend-only (SC-I-012 / FR-X-003)**: grep the Inbox API surface — there is **no** money-movement endpoint and **no** push API exposed to other modules (they emit `ModuleAlertEvent` only); the single consequential action (unsubscribe) is propose-confirm-idempotent.
- **Money carried, never computed (Clarifications Q3 / Principle IV)**: an alert carrying a money value as a **float or bare number** outside `MoneyCents` is **rejected/flagged** at ingest; Inbox performs no rounding or FX.
- **Idempotency (SC-I-009 / FR-INB-007)**: replayed ingestion (same `source_event_id`), retried assembly (same `digest_id`), and re-confirmed unsubscribe (same `action_id`) never duplicate a digest, double-count the budget, or re-send an acknowledged push.
- **Audit trail (Principle VI)**: `digest_dispatched` / `breakthrough_delivered` / `critical_suppressed` / `unsubscribe_confirmed` / `cross_user_routing_denied` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no PII (sender identity, merchant names) or monetary values; **no raw email body** anywhere in logs.
- **Cross-user safety (SC-I-010 / Principle V)**: API-layer authorization testing shows **0** cross-user alert/digest exposures; routing keyed on validated session identity + `MemberScope`, never a client id; every denied cross-user routing attempt is audited.
- **Anti-phishing (Threat Model)**: every `action_url` in an item/push matches `^finos://`; an alert carrying an external URL is rejected.
- **Performance (SC-010)**: opening the Inbox tab renders the cached, freshness-stamped item list in ≤ 300 ms; assembly/dispatch run server-side off the hot path; a cache miss shows the Loading skeleton, not a blocking fetch.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual screen-reader labels (incl. the localized Inbox-badge label "3 unread money updates" / "3 mises à jour financières non lues"); reduced-motion and Dynamic Type honored.
- **Residency (SC-I-013 / FR-X-020)**: Inbox data + email-parsing + push subprocessors satisfy Canadian residency or are disclosed + agreement-backed; the subprocessor register is a go-live gate.

## Done when

All four user-story validations pass, the display/relay fixtures render exactly (en-CA `$1,234.56` / fr-CA `1 234,56 $`), no raw email body is persisted, all consumer+provider contract tests are green, and the cross-cutting checks (recommend-only, idempotency, audit, redaction, cross-user safety, residency) hold.

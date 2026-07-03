# Phase 0 Research: Module 10 — Inbox & Notifications

**Feature**: `012-module-10-inbox` | **Date**: 2026-06-29

Resolves the Inbox-specific technical decisions the design depends on. **Platform-stack choices (language, datastore, region, auth, queues, i18n/format, money package, audit store) are inherited verbatim from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here.** Only genuinely module-specific decisions and open vendor items are recorded, with documented (non-blocking) flags.

---

## 0. Inherited from platform-decisions.md (not re-decided)

- **Stack**: TypeScript everywhere; NestJS modular monolith, one bounded context = `InboxModule`; React Native (Expo) client with `expo-router` Inbox route group. (D1, D2)
- **Money**: `@finos/money` (`Cents = bigint`, decimal-string rates); Inbox **carries but never computes** money (spec Clarifications Q3) — so it owns no rounding policy, only the relay/render rule. (D4)
- **Audit**: append-only `audit.event_log`, separate from debug logs, idempotent on `source_event_id`. (D5)
- **Queues**: BullMQ (Redis) workers for ingestion, digest assembly, and dispatch, with mandatory timeouts/retries/rate-limits/circuit-breakers. (Platform §2 Hosting, §6)
- **i18n/format**: `i18next` + `@finos/format` (`Intl.*`); fr-CA `1 234,56 $`, en-CA `$1,234.56`; lint bans literal strings and raw number formatting. (D-i18n)
- **Security/residency**: server-side authZ on session identity (never client `profileId`); Postgres RLS; KMS-backed secrets; Canadian region; PIPEDA + Law 25; 7-day crypto-shred deletion. (D3, D8, §5)

---

## 1. Notification budget & breakthrough model

**Decision**: A single Inbox-owned **push budget**: default **≤ 2 money-related pushes/day** delivered as an **evening** consolidated digest (Important + Informational rollup), plus headroom for **at most one critical breakthrough/day**. Morning digest **off by default** (user-enable). Excess Important alerts are **queued to the next digest, never dropped**; excess criticals are **coalesced** into the single breakthrough push ("N urgent money alerts").

**Rationale**: SC-009 (median ≤ 2/day, criticals still same-day) + ux-foundations §6.1 tiering. A strict budget plus a single coalesced breakthrough channel is the YAGNI-minimal mechanism that satisfies restraint without delaying safety alerts (Constitution IX, Integration-First).

**Alternatives considered**: Per-module budgets — rejected (re-introduces sprawl; modules would compete). Unlimited criticals — rejected (a flood defeats the budget; coalescing preserves the safety guarantee without spam). Real-time per-alert push — rejected (violates SC-009).

---

## 2. Alert ingestion contract & emitter authenticity

**Decision**: Every source module emits a uniform `finos:inbox/ModuleAlertEvent/1.0.0` envelope to a BullMQ ingestion queue; **no module calls a push API directly** (ux-foundations §6.3). Inbox validates each event's schema and **in-process emitter identity** (the NestJS module identity, not a client-supplied `module_id`) and rejects/audits malformed or unauthenticated events. Ingestion is **idempotent on `source_event_id`**; dedup is keyed on (`module_id`, `event_type`, `subject_hash`, 24 h).

**Rationale**: Principle VII (schema-defined contracts, no shared mutable state) + FR-INB-007 idempotency + Threat Model (spoofed-alert injection). Publishing the envelope as a *provided* contract lets every emitter conform to one shape and lets provider/consumer contract tests catch skew (SC-012).

**Alternatives considered**: Direct in-process method calls per module — rejected (no schema boundary, no contract tests, no uniform dedup/budget). Each module owning its own push — rejected (constitutionally forbidden by the notification mandate).

---

## 3. Impulse-spend ranking source

**Decision**: Rank promotional senders impulse-spend-trigger-first using **`TransactionStream` + `MerchantGraph` spend signals** (frequency/recency/amount of purchases from a sender's mapped merchant), behind an `ImpulseRanker` interface. When the spend signal is unavailable (no spine connection or unmapped sender), fall back to a **curated promotional-category heuristic** and mark the ranking picture **incomplete** (Partial state). The "why first" reasoning is always displayable (bilingual, FR-X-006).

**Rationale**: FR-INB-001 ("prioritizing impulse-spend triggers") + Integration-First (FR-X-001) — ranking grounded in the user's real spend, not a generic spam score. Explainability (SC-I-006) requires a transparent ranking input.

**Alternatives considered**: Generic spam/promotional score only — rejected (ignores the user's real impulse pattern; not Integration-First). LLM-only inference from bodies — rejected (raw-body retention forbidden, FR-X-013; bodies are parsed transiently and discarded).

---

## 4. Email parsing & raw-body non-retention

**Decision**: Parse promotional email behind an `EmailParserPort` interface that **retains only sender identity + classification/metadata — never raw message bodies** (FR-INB-001, FR-X-013). Bodies are parsed **transiently** in the worker and discarded; nothing durable (DB, cache, log, audit) ever holds a raw body. Email-sourced rows carry `email_sourced = true` to drive the **7-day revocation deletion cascade** regardless of which store holds them.

**Rationale**: FR-X-013 (only sender identity + derived classifications retained; revocation cascade in 7 days) + Threat Model (raw-body exfiltration is the most sensitive asset). Crypto-shred + tombstone (platform D6) renders email-sourced data unrecoverable on revocation while preserving the append-only audit log.

**Alternatives considered**: Persist parsed bodies for re-classification — rejected (violates FR-X-013). Client-side parsing — rejected (inconsistent, harder to enforce non-retention + residency).

**Open item (non-blocking — platform NR-6)**: concrete email-parsing subprocessor. MUST be Canadian-region or disclosed + PIPEDA-agreement-backed (FR-X-020); enters the subprocessor register before go-live. The `EmailParserPort` interface and the no-raw-body rule are fixed now.

---

## 5. Recommend-never-execute for unsubscribe

**Decision**: Unsubscribe / roll-up is a **propose → user-confirm → execute** flow: Inbox surfaces an `UnsubscribeAction` (`execution_state = proposed`), the user confirms via a **Confirm-Action sheet**, and only then does Inbox attempt the unsubscribe and record it **idempotently** (keyed on `action_id`). Inbox **never** auto-unsubscribes silently.

**Rationale**: Extends the constitution's recommend-never-execute stance (Principle IV / FR-X-003, ux-foundations §2.2) to consequential **non-money** actions: an unsubscribe is irreversible enough to warrant explicit consent, and the audit trail records the confirmed action (FR-X-007).

**Alternatives considered**: One-tap auto-unsubscribe — rejected (silent consequential action; no audit consent). Bulk unsubscribe without per-sender confirm — rejected (same reason; a single bulk Confirm-Action sheet listing senders is the acceptable batched form).

---

## 6. Push-delivery subprocessor & residency

**Decision**: Deliver pushes via the managed **Expo/EAS push pipeline → APNs/FCM** (platform D9). The dispatch worker enforces the budget and idempotency (keyed on `digest_id`) before handing off to the push provider; delivery failures retry with backoff (FR-X-012).

**Rationale**: Platform-inherited mobile stack (Expo managed workflow, D9). Centralizing dispatch in one worker is what makes the ≤ 2/day budget and the critical ceiling enforceable.

**Open item (non-blocking)**: the push provider's data-residency posture (device tokens, payload transit) enters the **subprocessor register** before go-live (FR-X-020). Payloads carry no PII/money beyond the localized item text already shown to the user; tokens are not financial PII but are residency-scoped.

---

## 7. Staleness handling (relay, not re-derive)

**Decision**: Inbox **relays** each source alert's `FreshnessStamp` verbatim and the source's withhold/flag decision. It performs **no** freshness re-derivation on money values. A relayed **stale-money** alert is shown with the Stale chip and is **not** elevated to a push; a stale **secondary** alert may still surface flagged. Inbox's own derived artifacts (digest assembly) carry a `derived` freshness stamp.

**Rationale**: Principle VIII + Clarifications Q3/Q4 — money correctness and freshness of the underlying figure are the emitting module's responsibility; Inbox's duty is to never *amplify* a stale-money figure into a confident push.

**Alternatives considered**: Inbox re-checking freshness against the spine — rejected (duplicates source logic, risks divergence, and Inbox holds no money input of its own).

---

## 8. Conflict ordering & Cash-Safety precedence

**Decision**: When two alerts conflict for the same moment, Inbox orders by the **platform safety-precedence hierarchy** (Cash Safety `safe_to_act` > Credit `credit_hard_avoid` > `budget_headroom` > `optimization`), carried on `ModuleAlertEvent.safety_class`. The safety alert is ordered first and gets breakthrough priority; the loser is marked `overridden` ("see safety alert first"), **never silently dropped** (ux-foundations §10.4).

**Rationale**: Umbrella conflict edge case + ux-foundations §3.1/§10.4. Until Cash Safety ships, Inbox orders by `priority_tier` and the available `safety_class` values.

**Alternatives considered**: Drop the lower-priority alert — rejected (loses information; constitution requires surfacing both with the resolution).

---

## 9. Performance: ≤ 300 ms tab/module switch

**Decision**: The Inbox tab renders from a **locally cached, freshness-stamped** list of `InboxItem`s; digest assembly and dispatch run **server-side in BullMQ workers**, off the UI hot path. Opening the tab never blocks on assembly. A cache miss shows the Loading skeleton, not a blocking fetch.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced via the chip, never hidden to hit latency.

**Alternatives considered**: Assemble on tab open — rejected (blows the budget and couples UI latency to source-module availability).

---

## 10. Contract testing approach

**Decision**: **Provider** contract tests for each provided contract (`ModuleAlertEvent`, `NotificationDigest`, `UnsubscribeAction`, `NotificationPreference`) and **consumer** contract tests for each consumed spine contract (`TransactionStream`, `MerchantGraph`, `ConnectionConsent`) and the shared value objects, via Pact in CI (platform §6). Because every source module is a producer of `ModuleAlertEvent`, each emitting module runs a **consumer** test against Inbox's published envelope; Inbox runs the **provider** verification — so an emitter on a breaking major fails CI rather than mis-assembling at runtime.

**Rationale**: Principle VII + FR-X-011 + SC-I-011. Version skew **disables**/rejects the path rather than serving on a mismatched schema (SC-012).

**Alternatives considered**: Validate only at runtime ingest — rejected (catches skew too late; no provider-side guarantee). Integration tests only — rejected (slow, doesn't pin the schema).

---

## Open items handed to planning/ops (documented, non-blocking)

- **NR-6 (email-parsing subprocessor)**: concrete Canadian-region (or disclosed + agreement-backed) parser retaining only sender identity + classifications (FR-X-013, FR-X-020). Owner: Inbox plan + subprocessor register.
- **Push-delivery residency**: APNs/FCM-via-Expo data-residency posture for device tokens + payload transit — subprocessor register before go-live (FR-X-020).
- **Default thresholds**: exact digest cadence, budget (≤ 2), and critical ceiling (1) confirmed in planning (Clarifications Q1/Q2); ship as user-adjustable Canada-oriented defaults.
- **Dormant-account retention**: inactivity window for email-sourced sender data auto-anonymization set in the planning-phase PIA (FR-X-019).
- **Impulse-ranking signal weights**: the frequency/recency/amount weighting in `ImpulseRanker` tuned in planning; the interface and the spend-signal source are fixed now.

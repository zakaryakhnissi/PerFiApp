# Feature Specification: Module 10 — Inbox & Notifications

**Feature Branch**: `012-module-10-inbox`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 10 — Inbox & Notifications (Priority: P2)"; functional requirements FR-INB-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md) (esp. §6 Notification Restraint).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Inbox & Notifications** tab and the **platform notification budget** only. Module 0 (Financial Core & Data Spine) is a hard dependency for transaction-derived enrichment and connection metadata; this module **consumes** spine and other-module contracts and does not re-implement aggregation, budgeting, credit, or any source module's domain logic. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind an Inbox behavior.
>
> **Platform authority**: Notification discipline is a *platform-level* concern. Per ux-foundations §6, **no other module may send a standalone push notification** — every module alert is submitted to the Inbox digest pipeline. This module is the single owner of the push surface and the ≤ 2/day money-notification budget (SC-009).
>
> **Boundary with source modules**: Inbox does **not** author the substance of any alert — it does not decide that a trial is converting, that runway is short, or that a deal exists. Source modules (Bills, Cash Safety, Shopping, Credit, Rewards, Tasks, Habits, Travel, Docs, Social, …) own that intelligence and emit a localized, freshness-aware `ModuleAlertEvent`. Inbox owns **prioritization, deduplication, budgeting, bilingual digest assembly, breakthrough/critical routing, delivery, and the email-subscription clean-up surface**.

## User Scenarios & Testing *(mandatory)*

Inbox is the P2 module that standardizes the notification surface every other module pushes into — preventing alert sprawl as P2/P3/P4 modules add events — and gives the user a single bilingual, actionable daily digest plus a promotional-email clean-up tool that targets impulse-spend senders first.

### User Story 1 - Unified Money Digest (Priority: P1 within this module)

A user receives, at most once or twice a day, a single bilingual digest that consolidates every module's actionable money alert — sorted by priority — instead of scattered notifications from each module.

**Why this priority**: This is the platform-protective core of the module (SC-009). It must exist before any other module ships a P2/P3 push, because the constitution and ux-foundations forbid modules from pushing directly. Standardizing the digest early is what prevents alert sprawl. It delivers standalone value the moment one source module emits an alert.

**Independent Test**: Emit `ModuleAlertEvent`s from two or more source modules within a digest window, run digest assembly, and confirm the user receives exactly one (or at most two) push notifications for the day whose body lists the highest-priority item, with every item actionable and rendered in the user's active locale.

**Acceptance Scenarios**:

1. **Given** actionable alerts from multiple modules within a digest window, **When** the digest is assembled, **Then** the user receives one (at most two) daily digest push notifications, every section is actionable (carries a verb CTA), and all text is in the user's active language (en-CA / fr-CA). *(FR-INB-002, SC-009)*
2. **Given** the user opens the digest push, **When** the Inbox tab opens, **Then** items are sorted Critical → Important → Informational, each with a verb CTA ("Review" / "Examiner", "Go to Bills" / "Aller aux factures", "Dismiss" / "Ignorer"). *(ux-foundations §6.2)*
3. **Given** an fr-CA user, **When** any digest item shows a monetary value, **Then** it is formatted `1 234,56 $` (comma decimal, non-breaking-space thousands, trailing symbol), not `$1,234.56`. *(FR-X-005, SC-008)*
4. **Given** two source modules emit the same logical alert (same `module_id` + `event_type` + same subject within 24 h), **When** the digest is assembled, **Then** the items are deduplicated into one item. *(ux-foundations §6.3)*
5. **Given** the user has set their digest cadence to evening-only, **When** the assembly runs, **Then** no morning push is sent and all eligible items roll into the evening digest. *(FR-INB-002)*
6. **Given** the daily money-notification budget (2) is already spent on Important pushes, **When** a further Important alert arrives, **Then** it is held for the next digest (it is queued, not dropped) rather than breaching the budget. *(SC-009)*

---

### User Story 2 - Critical Breakthrough Alerts (Priority: P1 within this module)

A genuinely time-sensitive, safety-relevant alert (e.g. predicted overdraft today, aggregation-token expiry, free-trial converting tonight) breaks through the digest cadence and reaches the user immediately, while still respecting an absolute critical-per-day ceiling.

**Why this priority**: The whole point of a notification budget is undermined if a safety alert is delayed into a digest. Breakthrough is the safety valve that lets the budget be strict elsewhere. It is the realization of the constitution's Integration-First + Cash-Safety-precedence stance at the notification layer.

**Independent Test**: Emit a `ModuleAlertEvent` with `priority_tier = critical` and an `expires_at` within the day; confirm it is delivered as an immediate push that bypasses the digest cadence, is counted against the critical ceiling (at most 1/day), and is not deferred.

**Acceptance Scenarios**:

1. **Given** a critical, time-sensitive alert (e.g. predicted overdraft today), **When** it arrives, **Then** it is delivered immediately as a push that bypasses the digest cadence. *(FR-INB-002, ux-foundations §6.1)*
2. **Given** a critical alert has already broken through today, **When** a second critical alert arrives, **Then** the system applies the critical ceiling (at most 1 critical push/day) and routes the second into the next digest unless it is itself higher-precedence per the safety hierarchy. *(SC-009, Clarifications Q2)*
3. **Given** a Cash Safety `SafeToActSignal`-derived critical alert and a Rewards optimization alert reference the same moment, **When** both are eligible, **Then** the Cash Safety safety alert takes precedence in ordering and breakthrough (safety > optimization), per the platform conflict-resolution rule. *(ux-foundations §3.1, §10.4)*
4. **Given** a critical alert whose source `freshness.is_stale = true` on a **money** input, **When** Inbox evaluates it, **Then** Inbox does not fabricate or upgrade the alert — it relays the source module's withhold/flag decision and never presents stale money data as live. *(FR-X-008, Clarifications Q4)*
5. **Given** the user has disabled push for the Critical tier in preferences, **When** a critical alert arrives, **Then** it is still surfaced in-app in the Inbox tab with a prominent indicator, and the suppression decision is recorded — Inbox never silently drops a safety alert. *(Clarifications Q5)*

---

### User Story 3 - Email Subscription Clean-Up (impulse-spend first) (Priority: P2 within this module)

A user who opts into connecting an email source sees promotional senders listed with unsubscribe / roll-up / keep options, ordered so the senders that most trigger impulse spending appear first; after parsing, only sender identity and classification are retained — never raw message bodies.

**Why this priority**: High user value and a differentiator, but it depends on an opt-in email connection that many users will not grant, and on a parsing subprocessor selected in planning. The digest (US1) and breakthrough (US2) deliver the platform-protective MVP first; clean-up is layered on.

**Independent Test**: With an email source connected, run clean-up and confirm promotional senders are listed with unsubscribe / roll-up / keep actions ordered impulse-spend-trigger-first, that selecting unsubscribe produces an `UnsubscribeAction` proposal the user confirms (Inbox never auto-unsubscribes silently), and that after parsing the store holds only sender identity + classification, not raw bodies.

**Acceptance Scenarios**:

1. **Given** a connected inbox, **When** clean-up runs, **Then** promotional senders are listed with unsubscribe / roll-up / keep options, ordered with impulse-spend triggers first. *(FR-INB-001)*
2. **Given** a promotional sender flagged as a strong impulse-spend trigger (e.g. a retailer the user frequently purchases from per `TransactionStream`/`MerchantGraph`), **When** the list is ranked, **Then** that sender appears above lower-impact senders, and the "why first" reasoning is shown (bilingual). *(FR-INB-001, FR-X-006)*
3. **Given** the user selects "unsubscribe" for a sender, **When** they proceed, **Then** Inbox surfaces a Confirm-Action sheet and only acts on explicit confirmation — it never silently unsubscribes (recommend-never-execute applies to non-money consequential actions too). *(ux-foundations §2.2, FR-X-003 spirit)*
4. **Given** parsing has completed for a message, **When** the result is stored, **Then** only sender identity and derived classification/metadata are retained — the raw message body is discarded. *(FR-INB-001, FR-X-013)*
5. **Given** the user revokes email access, **When** revocation is processed, **Then** all raw email content and any data whose sole/primary source was the email connection (including Inbox-held sender classifications) are deleted within the 7-day window. *(FR-X-013, Threat Model)*
6. **Given** the email source feed is down or the parsing subprocessor times out, **When** clean-up is requested, **Then** the surface degrades gracefully (shows the Error/Unavailable state, retries with backoff) and never presents a partial sender list as complete. *(FR-X-012, States Matrix)*

---

### User Story 4 - Notification Preferences & Quiet Controls (Priority: P2 within this module)

A user controls which tiers may push, their digest cadence (morning / evening / both), quiet hours, and per-source mute, with the constraint that safety-critical alerts are always at least surfaced in-app.

**Why this priority**: Preference control is what makes the budget humane and trustworthy, but the default budget already satisfies SC-009 without it; it refines rather than enables the MVP.

**Independent Test**: Change tier-push preferences, cadence, and quiet hours, then emit alerts of each tier and confirm delivery honors the preferences while critical alerts remain at least in-app surfaced.

**Acceptance Scenarios**:

1. **Given** the user sets Informational to "in-app only", **When** an Informational alert arrives, **Then** no push is sent and the item appears only in the Inbox tab. *(ux-foundations §6.1)*
2. **Given** the user sets quiet hours, **When** a non-critical push would fall in that window, **Then** it is deferred to the next allowed window; a critical breakthrough still delivers but respects the critical ceiling. *(Clarifications Q5)*
3. **Given** the user mutes a specific source module, **When** that module emits a non-critical alert, **Then** it is suppressed from push and shown muted in-app; critical safety alerts from that source are still surfaced in-app. *(Clarifications Q5)*

---

### Edge Cases

- **Empty / no connectivity**: No email connected and no source alerts yet → Inbox shows the first-run Empty state ("Connect an email to clean up promos" + "Your money updates will appear here"), never a zero-filled or fake digest. With email refused, US1/US2 still function on module alerts (email is opt-in; FR-INB-002 is independent of FR-INB-001).
- **Partial connectivity**: Some source modules emit alerts but others are not yet shipped/connected → the digest is assembled from the available subset and carries the Partial Data Banner / "Incomplete picture" note; Inbox never implies completeness it cannot guarantee.
- **Stale / missing inputs**: Inbox itself originates no money figures. It relays each source alert's `freshness` and the source's own withhold/flag decision verbatim. A source alert carrying a **stale money** input that the source did not withhold is treated as suspect: Inbox flags it stale and does not elevate it to a push (Fresh-or-Flagged; the source, not Inbox, owns the money correctness — but Inbox refuses to amplify a stale-money alert).
- **Conflicting advice with Cash Safety precedence**: When two source alerts conflict for the same moment (e.g. Rewards "use this card" vs Cash Safety "overdraft risk"), Inbox orders the **safety** alert first and applies breakthrough to it; the optimization alert is digest-relegated and tagged "see safety alert first". Inbox enforces the platform precedence hierarchy (Cash Safety `SafeToActSignal` > Credit hard-avoid > Budget > optimization) in ordering, never silently dropping the lower-priority one. *(ux-foundations §10.4)*
- **Multi-currency**: Any monetary value inside a digest item is rendered via `@finos/format` for the active locale; a foreign amount is shown only as the source module already converted it to CAD (Inbox does not convert). A non-CAD raw amount with no source CAD conversion is shown with its currency and flagged, never silently treated as CAD.
- **Idempotency / retries**: Digest assembly and push dispatch are **idempotent**, keyed on `source_event_id` for each ingested alert and on a `digest_id` for each dispatch. A retried assembly or a redelivered push never produces a duplicate digest, never double-counts the daily budget, and never re-sends a push already acknowledged. Dedup is keyed on (`module_id`, `event_type`, `subject_hash`, 24 h window).
- **Cross-user boundaries**: Alerts and digests are strictly scoped to the owning `profile_id`, derived from the validated session — never a client-supplied id. In a Household, a member only receives alerts for data their `MemberScope` grants; an alert about another member's finances is never routed to a user without scope, and a denied cross-user routing attempt is audited (IDOR/horizontal-escalation defense — see Threat Model).
- **Budget pressure**: When more Important alerts exist than the daily budget allows, lower-priority Important items roll to the next digest (queued, never dropped); the user can always see the full backlog in-app. The budget caps *push* volume, not in-app visibility.
- **Breakthrough flood**: A burst of critical alerts is capped at the critical ceiling (Clarifications Q2); excess criticals are coalesced into one breakthrough push naming the count ("2 urgent money alerts" / "2 alertes financières urgentes"), still bypassing the digest but never spamming.
- **Expired alert**: An alert whose `expires_at` has passed before delivery is dropped from push and shown as expired/struck-through in-app (e.g. a "trial converts tonight" alert that arrives after conversion), never delivered as if still actionable.
- **Email-sourced enrichment cascade**: A merchant/sender classification derived **only** from email is purged on email revocation within 7 days, regardless of which store now holds it (FR-X-013); where a sender also has a non-email source (e.g. a known `MerchantGraph` node), only the email-sourced enrichment is stripped.
- **Bilingual integrity**: A digest item, sender label, or CTA missing an EN or FR string is a defect (the assembler rejects an alert whose `payload` lacks both `text_en` and `text_fr` rather than shipping a single-language item).

## Clarifications

### Session 2026-06-29

- Q1: Default digest cadence and budget when the user hasn't configured them? → A: **Default ≤ 2 money-related pushes/day** (SC-009): one **evening** consolidated digest (Important + Informational rollup) plus headroom for **at most one** Critical breakthrough. Morning digest is **off by default**, user-enable. (Aligns with ux-foundations §6.)
- Q2: Critical-tier ceiling and behavior on a burst of criticals? → A: **At most 1 critical breakthrough push/day**; additional criticals within the day are **coalesced into that single breakthrough** ("N urgent money alerts") rather than each sending its own push. Ordering within the coalesced push follows the safety precedence hierarchy. In-app, every critical is individually visible.
- Q3: Does Inbox ever originate or convert a monetary value? → A: **No.** Inbox is a pure relay/orchestrator of source-module alerts. It performs **no money arithmetic and no FX conversion**; it only *renders* CAD values the source already computed, via `@finos/format`. Therefore the Money Correctness section is **display-only** (no rounding/fixtures owned here) — money correctness is owned upstream by the emitting module.
- Q4: How does Inbox treat a source alert whose money input is stale? → A: Inbox **relays** the source's `freshness` verbatim and the source's withhold/flag decision. It will **not elevate a stale-money alert to a push** and will display it with the Stale chip. Inbox never re-derives or "freshens" a money figure.
- Q5: When the user disables push for a tier (incl. Critical) or sets quiet hours/mute, can a safety-critical alert be fully suppressed? → A: **No silent drop of safety alerts.** Push may be suppressed per preference, but a Critical safety alert is **always surfaced in-app** with a prominent indicator, and the suppression is recorded in the audit trail. Non-critical tiers may be fully push-suppressed.
- Q6: Unsubscribe execution model? → A: **Recommend-never-execute applies to consequential non-money actions too.** Inbox proposes an `UnsubscribeAction`; the user confirms via a Confirm-Action sheet; only then does Inbox attempt the unsubscribe (and records it idempotently). Inbox **never** auto-unsubscribes silently.
- Q7: Email-parsing subprocessor? → A: **Open item (non-blocking)** — inherits platform NR-6: the parser must be Canadian-region or disclosed + agreement-backed, and retain only sender identity + classifications, never raw bodies (FR-X-013). Vendor selected in planning; the `EmailParserPort` interface and retention rule are fixed now.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-INB-*):

- **FR-INB-001 (Email subscription clean-up, impulse-spend-first)**: System MUST, for a user who opts into an email source, detect promotional senders and offer **unsubscribe / roll-up / keep** per sender, **prioritizing senders that trigger impulse spending** (ranked using `TransactionStream`/`MerchantGraph` spend signals where available). After parsing, the system MUST retain **only sender identity and derived classification/metadata — never raw message-body content** (FR-X-013). Unsubscribe is **recommend-never-execute**: Inbox proposes an `UnsubscribeAction`, the user confirms, and only then is it attempted and recorded idempotently. On email-access revocation, all raw email content and any Inbox data whose sole/primary source was the email connection MUST be deleted within the 7-day window (FR-X-013).
- **FR-INB-002 (Unified money digest with critical breakthrough)**: System MUST consolidate module alerts into **at most one or two daily bilingual, actionable digests**, sorted by priority (Critical → Important → Informational), deduplicated within a 24 h window, while allowing **critical, time-sensitive alerts to break through** the digest cadence. **No other module may send a standalone push** (ux-foundations §6); every alert flows through this pipeline. The median money-related push volume MUST be ≤ 2/day (SC-009) with critical alerts still delivered the same day.

Module-owned, derived from ux-foundations §6 and the platform notification mandate (operationalizing FR-INB-002):

- **FR-INB-003 (Notification budget enforcement)**: System MUST enforce a per-user daily push budget (default ≤ 2 money-related pushes/day) with an absolute **critical ceiling** (default 1 critical breakthrough/day, additional criticals coalesced). Over-budget non-critical alerts MUST be **queued to the next digest, never dropped**; in-app visibility is never budget-limited.
- **FR-INB-004 (Tiering & ordering)**: System MUST classify every ingested alert into Critical / Important / Informational per the source's `priority_tier`, and MUST order conflicting alerts by the platform safety-precedence hierarchy (Cash Safety `SafeToActSignal` > Credit hard-avoid > Budget headroom > optimization). A safety alert MUST never be ordered below an optimization alert.
- **FR-INB-005 (Bilingual, actionable, freshness-aware items)**: System MUST reject any ingested alert whose `payload` lacks **both** `text_en` and `text_fr` or lacks an action CTA, and MUST render every monetary value through `@finos/format` for the active locale. Every item MUST carry the source `freshness`; a stale-money alert MUST be flagged and MUST NOT be elevated to a push (FR-X-008).
- **FR-INB-006 (Preferences & quiet controls)**: System MUST let the user set tier-push opt-in/out, digest cadence (morning/evening/both), quiet hours, and per-source mute, **subject to** the invariant that a Critical safety alert is always at least surfaced in-app and its suppression audited (no silent drop).
- **FR-INB-007 (Idempotent ingestion, assembly & dispatch)**: System MUST ingest each `ModuleAlertEvent` idempotently keyed on `source_event_id`, deduplicate on (`module_id`, `event_type`, `subject_hash`, 24 h), and dispatch each digest idempotently keyed on `digest_id` — a retry never double-sends, double-counts the budget, or duplicates a digest (FR-X-003 idempotency clause).
- **FR-INB-008 (Audit & redaction)**: System MUST write an append-only audit event for every digest dispatched, every breakthrough delivered, every suppression of a critical alert, every confirmed unsubscribe, and every denied cross-user routing attempt. Debug logs MUST redact PII and monetary values; the audit trail is kept separate (FR-X-007, FR-X-014).

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration — alerts reflect real spine/module state), FR-X-003 (Recommend, never move — unsubscribe & any action are propose-confirm; idempotent writes), FR-X-004 (CAD + time-to-goal in items where applicable), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability — "why this sender first", "why this is critical"), FR-X-007 (Audit trail), FR-X-008 (Freshness relayed), FR-X-009/010 (Security, least privilege & threat model — email connection + cross-user routing), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation of email/push feeds), FR-X-013 (Privacy — email body non-retention, revocation cascade), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), FR-X-020 (Data residency — parser & push subprocessors).

### Key Entities *(include if feature involves data)*

Consumed (read-only / event-ingested, not owned here): `ModuleAlertEvent` (the inbound alert envelope every source module emits — see Cross-Module Links), `TransactionStream` + `MerchantGraph` (Module 0; impulse-spend ranking signal), `ConnectionConsent` (Module 0; email-link status where the email connection is modeled as a consent), and the substance-bearing source contracts referenced by alerts (`BillCalendar`/`FreeTrialExpiry` from Bills, `RunwayForecast`/`SafeToActSignal` from Cash Safety, `DealRadar`/`WatchedItems` from Shopping, `CreditState` from Credit/Spine, `TaskState` from Tasks, etc.). Inbox treats these as *opaque references* carried by the alert; it does not re-implement their logic.

Owned/provided by this module:

- **ModuleAlertEvent (ingested envelope)**: The standardized inbound event a source module emits to the pipeline: `module_id`, `event_type`, `priority_tier`, bilingual `payload` (`text_en`, `text_fr`, optional `cad_amount` as `MoneyCents`, `action_url`), `subject_ref`, optional `expires_at`, `source_event_id`, and `freshness`. Inbox **consumes** this; it is defined as a provided *ingestion* contract so every module emits a uniform shape.
- **InboxItem**: A normalized, deduplicated, prioritized alert as it appears in the Inbox tab and digest: derived `tier`, `dedup_key`, localized text, CTA, source `freshness`, `state` (active / queued / delivered / expired / dismissed / overridden), and `audit_ref`. **Owned.**
- **NotificationDigest**: A bundled set of `InboxItem`s for a delivery window with `digest_id`, `profile_id`, `window` (morning/evening), ordered items, `budget_consumed`, and dispatch state. **Provided** to Habits (daily ritual), Shopping (impulse signals), Tasks.
- **UnsubscribeAction**: A proposed (then user-confirmed) unsubscribe/roll-up/keep decision for a promotional sender, with `sender_ref`, `action` (unsubscribe / roll_up / keep), `impulse_rank`, `reasoning` (bilingual "why first"), and idempotent execution state. **Provided** to Shopping (impulse signals), Tasks.
- **PromotionalSender**: A detected promotional sender retained as **sender identity + classification only** (display name, domain, category, impulse-spend score) — **never raw message bodies** (FR-INB-001, FR-X-013). Carries an `email_sourced` flag driving the revocation cascade. **Owned.**
- **NotificationPreference**: Per-user tier-push opt-in, cadence, quiet hours, per-source mute — with the non-suppressible-safety invariant. **Owned.**
- **AuditEvent (append-only)**: Records digest dispatch, breakthrough delivery, critical-suppression, confirmed unsubscribe, and denied cross-user routing (FR-X-007). **Owned.**

### Money Correctness *(display-only — this module RELAYS but does not COMPUTE monetary values; see Clarifications Q3)*

> Inbox originates **no** money figures and performs **no** money arithmetic or FX conversion. The Money-Is-Exact obligations on the *values* (integer minor units, arbitrary-precision rates, half-up rounding, slippage fixtures) are owned by the **emitting** module. This section records the constraints Inbox MUST honor when it *carries and renders* those values.

- **Numeric representation (carried, not computed)**: A monetary value inside a `ModuleAlertEvent.payload.cad_amount` MUST be carried as `finos:common/MoneyCents/1.0.0` (integer `amount_cents`, ISO-4217 `currency`, default CAD). Inbox MUST reject (or flag) any alert that carries a money value as a binary float or a bare number outside `MoneyCents` (defends Principle IV at the boundary).
- **No conversion / no re-derivation**: Inbox MUST NOT convert currencies, re-round, or recompute any monetary value. It renders exactly what the source provided. A non-CAD amount is displayed with its currency and flagged unless the source already supplied a CAD conversion.
- **Display / locale**: All monetary values in items and digests are rendered through `@finos/format` for the active locale (en-CA `$1,234.56`; fr-CA `1 234,56 $`) — no raw formatting, no `$` prefix on fr-CA (FR-X-005, SC-008). Time-to-goal context is shown when the source alert carries it (FR-X-004).
- **Determinism & fixtures (display fixtures only)**: The owned fixtures are *formatting/relay* fixtures, not arithmetic: (a) a `cad_amount` of `123456` cents renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA); (b) an alert lacking both `text_en` and `text_fr` is **rejected** by the assembler; (c) an alert carrying a float money value is **rejected/flagged**. No half-up rounding fixture is owned here (no arithmetic occurs).
- **Idempotency**: All state Inbox writes on the user's behalf (digest assembly, push dispatch, unsubscribe execution, budget accounting) is idempotent and safe to retry, keyed on `source_event_id` / `digest_id` (FR-X-003, FR-INB-007).
- **Recommend-only**: Confirmed — Inbox moves no money and executes no money action. Unsubscribe is the only consequential action it performs, and only after explicit user confirmation (FR-X-003 spirit).

### Security & Privacy Threat Model *(MANDATORY — this module touches an email connection and routes alerts that may concern another person's financial data)*

- **Assets**:
  - **Email connection + parsed sender data** (`PromotionalSender`, classifications). Reveals shopping habits and impulse-spend patterns; the raw email body is the most sensitive and is **never retained** post-parse.
  - **Alert payloads & digests** — bilingual descriptions that can embed CAD amounts, merchant names, runway/overdraft signals, trial conversions: a leak exposes spend patterns and financial distress signals.
  - **Notification preferences** — quiet hours/mute reveal behavioral patterns.
- **Trust boundaries / actors**: the owning user; other Household members and their `MemberScope` grants; source modules (trusted emitters, but their alerts are validated at ingest); the external email source + parsing subprocessor; the push-delivery subprocessor; the spine (read-only provider for impulse-spend ranking).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc — a user receives/reads another member's alert or digest | `InboxItem`, `NotificationDigest`, alert payloads | Routing & read authZ keyed on validated **session identity** + Household `MemberScope`; never a client-supplied `profileId`/`memberId`; denied cross-user routing **audited** (SC-015) | Yes (UI filtering alone does NOT satisfy) |
  | Raw email body retention / exfiltration | email message bodies | Bodies are parsed transiently and **discarded**; only sender identity + classification persist (FR-INB-001, FR-X-013); body never written to any durable store or log | Yes |
  | Email-sourced data outliving revocation | `PromotionalSender`, email-derived enrichments anywhere | `email_sourced` flag drives a 7-day deletion cascade on revocation **regardless of which store holds it** (FR-X-013) | Yes |
  | Parser/push subprocessor processes data outside Canada | email content, alert payloads | Subprocessor MUST be Canadian-region or disclosed + PIPEDA-agreement-backed before go-live; enters the subprocessor register (FR-X-020, NR-6, NR-? push) | Yes (go-live gate) |
  | PII / monetary leak in logs | alert payloads, CAD amounts, sender identity | Structured logs redact PII + monetary values; audit trail kept separate (FR-X-014) | Yes |
  | Spoofed / malformed alert injected into the pipeline | digest integrity, budget | Ingest validates `ModuleAlertEvent` schema + emitter authenticity (in-process module identity, not a client); malformed/unauthenticated events rejected and audited | Yes |
  | Silent suppression of a safety alert (availability threat to the user) | critical alerts | Non-suppressible-safety invariant: critical safety alerts are always surfaced in-app and any push-suppression is audited (FR-INB-006, Clarifications Q5) | Yes |
  | Notification-channel phishing surface (deep-link abuse) | user trust | `action_url` restricted to an allowlisted in-app deep-link scheme; no arbitrary external URLs in pushes | Yes |

- **AuthZ enforcement**: Every routing/read of an alert or digest is enforced server-side against the requester's session identity and Household `MemberScope`; no client-supplied identifier is trusted. Email-connection actions (connect / revoke) are MFA-gated where they re-issue/re-authorize an aggregation/email token (FR-X-017).
- **Data minimization, retention & revocation**: Inbox stores only what the digest and clean-up need (sender identity + classification, normalized item text, preferences, audit). Raw email bodies are never persisted. Email-sourced data is subject to the 7-day revocation cascade (FR-X-013) and the dormant-account retention bound (FR-X-019).
- **Data residency**: All Inbox data and the email-parsing + push-delivery subprocessors inherit the Canadian-region residency constraint (FR-X-020); any cross-border processing is disclosed and agreement-backed, and listed in the subprocessor register before go-live.

### UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Owned surfaces**: the **Inbox tab** (digest list — the only tab permitted a numeric badge per §5.1), the **digest push notification** (§6.2 format), the **Email Clean-Up** screen (sender list with unsubscribe/roll-up/keep), the **Notification Preferences** screen, and the platform-wide **digest pipeline** every other module emits into (§6.3).
- **Components reused** (not re-invented): **Recommendation Card** for any item that is itself a recommendation surfaced in the Inbox; **Confirm-Action sheet** for the unsubscribe action (verb CTA "Unsubscribe from {sender}" / "Se désabonner de {sender}", with the not-regulated-advice disclaimer where a money action is implied); **Freshness chip** on every item carrying a source-fed value (relayed from the alert's `freshness`); **Conflict banner** when two source alerts disagree for the same moment (safety-precedence ordering, §3.1, §10.4).
- **Six-state matrix** (§3) for the Inbox tab and Email Clean-Up view:
  - **Empty** — first-run: "Your money updates will appear here" + "Connect an email to clean up promotional senders"; never a fake/zero-filled digest.
  - **Loading** — skeleton digest rows matching populated layout (no bare spinner).
  - **Partial** — Partial Data Banner when only a subset of source modules are emitting; items computed on a partial picture carry the "Incomplete data" chip.
  - **Stale** — a relayed item past its source staleness window shows the Stale chip; a stale-**money** item is shown flagged and is **not** pushed (Withheld for push, visible in-app).
  - **Error / Degraded** — email feed / parser / push subprocessor down: Unavailable chip, non-alarming "Unable to reach {source} — we'll try again", last-known timestamp; never present a partial sender list as complete.
  - **Withheld** — when a critical alert references a missing/stale money input the source withheld, Inbox shows the source's withhold state, not a fabricated value.
- **Notification restraint (§6)**: default **evening** consolidated digest + at most **one** critical breakthrough/day (Clarifications Q1/Q2); title "N money updates" / "N mises à jour financières"; tap opens the Inbox tab (not a specific module); items sorted Critical → Important → Informational; each item has a verb CTA.
- **Locale & a11y**: all strings, item text, CTAs, and screen-reader labels localized EN/FR (a single-language item is a defect, FR-INB-005); monetary values via `@finos/format` (fr-CA `1 234,56 $`); WCAG 2.1 AA, ≥ 44×44 pt tap targets, reduced-motion and Dynamic Type honored (§7); the Inbox-tab badge has a localized accessible label ("3 unread money updates" / "3 mises à jour financières non lues").

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-I-001 (Notification restraint)**: Median money-related **push** notifications per user per day ≤ 2, with critical alerts still delivered the same day (umbrella SC-009). 0 modules other than Inbox send a standalone push in shipped builds.
- **SC-I-002 (Breakthrough reliability)**: 100% of `critical` alerts within their `expires_at` window are delivered the same day (push or, if push-suppressed by preference, surfaced in-app), and 0 critical safety alerts are silently dropped (Clarifications Q5).
- **SC-I-003 (Critical ceiling)**: ≤ 1 critical breakthrough push/day per user; excess criticals coalesced into that single push with an accurate count (Clarifications Q2).
- **SC-I-004 (Actionable & bilingual)**: 100% of digest items carry a verb CTA and both EN and FR text; 0 single-language items in shipped builds; 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-I-005 (Dedup)**: 0 duplicate items in a digest for the same (`module_id`, `event_type`, `subject`) within a 24 h window.
- **SC-I-006 (Impulse-first ordering)**: For a connected inbox, promotional senders ranked impulse-spend-trigger-first match the ranking signal in ≥ 90% of evaluated cases, with the "why first" reasoning displayable for 100% of ranked senders (FR-INB-001, FR-X-006).
- **SC-I-007 (Email body non-retention)**: 0 raw email message bodies persisted after parsing; 100% of parsed results retain only sender identity + classification (FR-INB-001, FR-X-013).
- **SC-I-008 (Revocation cascade)**: 100% of email-sourced Inbox data is deleted within 7 days of email-access revocation, regardless of which store holds it (FR-X-013).
- **SC-I-009 (Idempotency)**: 0 duplicate digests, double-counted budget entries, or re-sent acknowledged pushes under ingestion/assembly/dispatch retries (FR-INB-007).
- **SC-I-010 (Cross-user safety)**: 0 cross-user alert/digest exposures in API-layer authorization testing; every denied cross-user routing attempt is audited (umbrella SC-015).
- **SC-I-011 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer + provider tests in CI before release (umbrella SC-012).
- **SC-I-012 (Recommend-never-execute)**: 0 silent unsubscribes; 100% of unsubscribe actions are user-confirmed via a Confirm-Action sheet and recorded idempotently (FR-INB-001, FR-X-003 spirit).
- **SC-I-013 (Residency)**: 100% of Inbox data and the email-parsing + push subprocessors satisfy Canadian residency or are disclosed + agreement-backed before go-live (umbrella SC-017, FR-X-020).

## Assumptions

- **Email is opt-in**: Email Subscription Clean-Up (FR-INB-001) assumes the user connects an email source; the Unified Money Digest (FR-INB-002) and breakthrough (US2) function fully **without** email, on module alerts alone (umbrella "Email access" assumption). The two submodules are independently shippable.
- **Source modules emit, never push**: Every other module submits a `ModuleAlertEvent` to this pipeline and **never** calls a push API directly (ux-foundations §6.3). Inbox is the single owner of the push surface. Source modules own the substance and money correctness of their alerts; Inbox owns prioritization, budgeting, dedup, assembly, and delivery.
- **Source modules own money correctness**: Any CAD amount in an alert is computed and rounded by the emitting module per Principle IV; Inbox carries and renders it but never recomputes (Clarifications Q3).
- **Impulse-spend ranking signal**: Ranking senders impulse-first uses `TransactionStream`/`MerchantGraph` spend signals from the spine where available; absent that signal, ranking falls back to a curated promotional-category heuristic and marks the picture incomplete.
- **Email-parsing subprocessor**: A Canadian-region (or disclosed + agreement-backed) email-parsing provider that retains only sender identity + classifications is selected in planning (platform NR-6); the `EmailParserPort` interface and the no-raw-body retention rule are fixed now.
- **Push-delivery subprocessor**: A push provider (e.g. APNs/FCM via an Expo/managed pipeline) subject to the residency/disclosure constraint is selected in planning; its residency posture enters the subprocessor register before go-live (FR-X-020).
- **Default thresholds**: Default digest cadence (evening-only), default budget (≤ 2 money pushes/day), and default critical ceiling (1/day) ship as Canada-oriented, user-adjustable defaults; exact values confirmed in planning (Clarifications Q1/Q2).
- **Cash Safety precedence**: The platform conflict hierarchy (Cash Safety `SafeToActSignal` > Credit hard-avoid > Budget > optimization) governs Inbox ordering/breakthrough; until Cash Safety ships, Inbox still orders by `priority_tier` and the available hierarchy.
- **Not regulated advice**: Digest items and clean-up suggestions are informational decision support, not regulated financial advice (surfaced to users).

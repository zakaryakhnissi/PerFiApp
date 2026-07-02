# Implementation Plan: Module 10 — Inbox & Notifications

**Branch**: `012-module-10-inbox` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/012-module-10-inbox/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Inbox & Notifications is the P2 module that owns the **platform notification surface** and the **≤ 2 money-pushes/day budget** (SC-009): every other module emits a uniform, bilingual, freshness-aware `ModuleAlertEvent` into Inbox's ingestion pipeline and **no module pushes directly** (ux-foundations §6.3). Inbox normalizes, deduplicates, prioritizes (by tier and the platform safety-precedence hierarchy), assembles **one evening consolidated digest** plus **at most one critical breakthrough/day**, and delivers it — queueing over-budget items rather than dropping them. It also offers an opt-in **Email Subscription Clean-Up** surface that ranks promotional senders **impulse-spend-first** (using `TransactionStream`/`MerchantGraph` signals), retains **only sender identity + classification — never raw bodies** (FR-X-013), and treats unsubscribe as **recommend-never-execute** (propose → user-confirm → idempotent execute). The module is a **consumer** of Module 0 spine contracts (`TransactionStream`, `MerchantGraph`, `ConnectionConsent`) and the shared value objects (`MoneyCents`, `FreshnessStamp`, `Reasoning`), and a **provider** of `ModuleAlertEvent` (the ingestion envelope every source module conforms to), `NotificationDigest`, `UnsubscribeAction`, and `NotificationPreference`. Technical approach: a relay/orchestration service layer that **carries but never computes** money (Clarifications Q3), freshness-relayed reads (stale-money is flagged, never pushed), server-side cross-profile/`MemberScope` authZ on routing and reads, idempotent ingestion/assembly/dispatch keyed on `source_event_id`/`digest_id`/`action_id`, and consumer+provider contract tests in CI.

## Technical Context

> **Platform-stack note**: FinOS has a ratified platform stack in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) (Constitution v2.2.0). This plan **INHERITS** that stack verbatim and does not re-decide it. Items below carry **[INHERITED]** where the choice is the platform default, **[INBOX]** where this plan owns an intra-module decision, and **NEEDS CLARIFICATION** only for genuinely module-specific open vendor items (resolved in [research.md](./research.md), all non-blocking).

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10, Fastify adapter) backend + React Native (Expo, expo-router) mobile **[INHERITED — platform §2]**.

**Primary Dependencies**: `@finos/format` (locale rendering of carried CAD values — Inbox owns no money math), `@finos/money` types (carry `MoneyCents`, never compute), `i18next`/`react-i18next` (bilingual catalogs), **BullMQ (Redis)** workers for alert ingestion, digest assembly, and push dispatch with mandatory timeouts/retries/rate-limits/circuit-breakers, **Pact** for consumer+provider contract tests, JSON-Schema (draft 2020-12) contract layer, **Expo/EAS push pipeline → APNs/FCM** for delivery **[INHERITED — platform §2/§6]**. Spine + source access is via versioned contract clients, never direct storage **[INBOX]**.

**Storage**: Inbox-owned state — `InboxItem`, `NotificationDigest`, `UnsubscribeAction`, `PromotionalSender` (sender identity + classification only), `NotificationPreference`, and the append-only `audit.event_log` projection — in the per-module `inbox` Postgres 16 schema with per-schema role + RLS, in a Canadian region (`ca-central-1`) **[INHERITED — platform §2 Datastore]**. **No raw email bodies are ever persisted** (FR-X-013); no private copy of spend/budget/credit state — those are read from spine contracts. Email-sourced rows carry `email_sourced = true` driving the 7-day crypto-shred revocation cascade **[INBOX]**.

**Testing**: Unit (display/relay fixtures, tiering + safety-precedence ordering, budget/breakthrough/coalescing, dedup, idempotency replays, impulse-ranking, locale formatting), **consumer + provider contract tests** per contract, integration (per user story) against a Testcontainers Postgres, mobile (component + bilingual/locale + WCAG a11y), security (API-layer IDOR/cross-user routing + audited denials) — all in CI **[INHERITED — platform §6]**. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API + BullMQ workers **[INHERITED — platform §2]**.

**Project Type**: Web/mobile — backend bounded-context module (`InboxModule`) + worker pipeline + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met because the Inbox tab renders from a **locally cached, freshness-stamped** `InboxItem` list; assembly/dispatch run server-side in BullMQ workers off the UI hot path; a cache miss shows the Loading skeleton, never a blocking fetch (research §9).

**Constraints**: Money is carried, never computed — `cad_amount` is `MoneyCents` (integer minor units) produced by the emitting module; an alert carrying a float/bare-number money value is rejected/flagged at the ingest boundary (Principle IV, Clarifications Q3). Every relayed value carries the source `FreshnessStamp`; a stale-**money** alert is flagged and **never** elevated to a push (Principle VIII, Clarifications Q4). Recommend-only: Inbox moves no money; unsubscribe is the only consequential action and is propose-confirm-idempotent (Principle IV / FR-X-003, Clarifications Q6). EN/FR + locale-correct formatting; the assembler rejects any alert lacking both `text_en` and `text_fr` or a CTA (Principle II / FR-INB-005). Cross-profile/`MemberScope` authZ enforced server-side on session identity, never a client id; denied cross-user routing audited (Principle V). Raw email bodies never persisted; email-sourced data purged within 7 days of revocation (FR-X-013).

**Scale/Scope**: Per-user notification data (a daily digest of a handful to tens of items typical; tens–hundreds of promotional senders for a connected inbox); **8 module-owned FRs (FR-INB-001..008)** across **4 prioritized user stories** (US1 digest + US2 breakthrough are P1-within-module and platform-protective; US3 email clean-up + US4 preferences are P2-within-module); ~7 owned/provided entities; provides 4 contracts; consumes 3 spine contracts + 3 shared value objects + the `ModuleAlertEvent` envelope as emitted by every source module.

**NEEDS CLARIFICATION** (→ [research.md](./research.md), all non-blocking): (1) email-parsing subprocessor (platform NR-6 — Canadian-region or disclosed + agreement-backed, sender-identity-only retention); (2) push-delivery subprocessor residency posture (device tokens + payload transit → subprocessor register); (3) exact default digest cadence / budget / critical-ceiling values (ship as user-adjustable Canada-oriented defaults); (4) dormant-account inactivity window for email-sourced sender auto-anonymization (planning-phase PIA, FR-X-019); (5) impulse-ranking signal weights (frequency/recency/amount) — the interface and signal source are fixed now, weights tuned in planning.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Alerts/ordering reflect real spine/module state? | **PASS** — digests assemble from real source-module `ModuleAlertEvent`s; impulse ranking is grounded in real `TransactionStream`/`MerchantGraph` spend (FR-INB-001); ordering honors the platform safety-precedence hierarchy; ignoring an available signal is a defect (FR-X-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — the assembler **rejects** any alert lacking both `text_en` and `text_fr` (FR-INB-005); all CAD rendered via `@finos/format` (fr-CA `1 234,56 $`); time-to-goal relayed when the source carries it (SC-I-004). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — relay/format fixtures, tiering + safety-precedence, budget/breakthrough/coalescing, dedup, idempotency, impulse-ranking, bilingual, and consumer+provider contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — Inbox **carries but never computes** money (Clarifications Q3): `cad_amount` is `MoneyCents` (integer minor units), a float/bare-number money value is rejected/flagged at ingest (defends IV at the boundary); no rounding/FX owned here (owned upstream by the emitter); ingestion/assembly/dispatch/unsubscribe are idempotent (keys `source_event_id`/`digest_id`/`action_id`); recommend-only — no money movement. |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — **threat model is MANDATORY and present** (email connection + cross-user alert routing); routing/read authZ on validated session identity + `MemberScope`, never a client id, with denied cross-user routing audited (SC-I-010); `action_url` allowlisted to `^finos://` (anti-phishing); raw email bodies never persisted; aggregation/email-token re-auth MFA-gated (FR-X-017); secrets/KMS handling inherited from Module 0. |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — "why this sender first"/"why critical" carry `Reasoning` (FR-X-006); append-only audit for digest dispatch, breakthrough, critical-suppression, confirmed unsubscribe, and denied cross-user routing (FR-INB-008); a stale-money alert is flagged and withheld from push, never fabricated/freshened (Clarifications Q4). **No documented-default exception is invoked** — Inbox originates no money figure and so never substitutes a default for a missing money input. |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via semver'd JSON-Schema contracts (`finos:inbox/*`, `finos:spine/*`, `finos:common/*`); consumer+provider Pact tests in CI for every contract, including each source module's consumer test against the published `ModuleAlertEvent` envelope (SC-I-011); version skew **disables** the path (SC-012). |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — every relayed item carries the source `FreshnessStamp`; a stale-money alert is flagged and **not** pushed (FR-INB-005, Clarifications Q4); ingestion/assembly/dispatch and email/push feeds degrade gracefully with timeouts/retries/backoff (FR-X-012). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — a single relay/orchestration pipeline over a uniform envelope; one budget + one coalesced breakthrough channel (no per-module budgets); email clean-up layered after the platform-protective digest MVP; P2 module kept lean (Clarifications resolve scope to four user stories). |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in debug logs, audit trail separate (FR-X-014); raw email bodies non-retained, 7-day revocation cascade + dormant-account bound (FR-X-013/019); Canadian-region residency for Inbox data + parser + push subprocessors, register as a go-live gate (FR-X-020); ≤ 300 ms cached tab; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing on consequential actions. |

**Threat model (Principle V)** — **REQUIRED and present** here because Inbox touches an **email connection** and **routes alerts that may concern another Household member's financial data**. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--this-module-touches-an-email-connection-and-routes-alerts-that-may-concern-another-persons-financial-data) (§ "Security & Privacy Threat Model"). Aggregation/email-token lifecycle and KMS secret storage are **inherited from Module 0** (FR-CORE-007); Inbox enforces routing/read authZ and the email-body non-retention + revocation cascade.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — the data model and contracts preserve money-carried-not-computed, freshness relay (stale-money withheld from push), server-side cross-profile/`MemberScope` authZ, recommend-never-execute unsubscribe, raw-body non-retention, and idempotent ingestion/assembly/dispatch; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/012-module-10-inbox/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── provided/        # module-alert-event, notification-digest, unsubscribe-action, notification-preference
│   └── consumed/        # TransactionStream, MerchantGraph, ConnectionConsent + shared value objects (README)
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/inbox/
    ├── domain/            # entities: InboxItem, NotificationDigest, UnsubscribeAction,
    │                      #           PromotionalSender, NotificationPreference, AuditEvent;
    │                      #           value objects: FreshnessStamp (relayed), Reasoning, MoneyCents (carried)
    ├── ingestion/         # ModuleAlertEvent validator (schema + in-process emitter identity),
    │                      #           idempotent ingest (source_event_id), dedup (module_id+event_type+subject_hash, 24h)
    ├── pipeline/          # BullMQ workers: alert-ingest, digest-assembly, push-dispatch
    │                      #           (timeouts/retries/rate-limits/circuit-breakers)
    ├── services/          # tiering+safety-precedence ordering, budget/breakthrough/coalescing,
    │                      #           digest assembler, impulse-ranker, email-parser-port,
    │                      #           unsubscribe (propose→confirm→execute), preferences,
    │                      #           audit (append-only), logging (PII/money redaction)
    ├── contracts/
    │   ├── consumed/      # typed clients + schemas: TransactionStream, MerchantGraph, ConnectionConsent
    │   │                  #           + shared MoneyCents/FreshnessStamp/Reasoning
    │   └── provided/      # ModuleAlertEvent (ingestion envelope), NotificationDigest,
    │                      #           UnsubscribeAction, NotificationPreference
    └── api/               # recommend-only endpoints: read digest/items, set preferences,
                           #           propose/confirm unsubscribe (no push API exposed to other modules,
                           #           no money-movement endpoint); server-side authZ guard
backend/tests/
├── contract/             # consumer + provider contract tests (Pact)
├── integration/          # per user story (US1..US4) + cross-user authZ
└── unit/                 # relay/format fixtures, ordering, budget/coalescing, dedup, idempotency, impulse-rank

mobile/
└── src/features/inbox/
    ├── digest/           # US1 — Inbox tab digest list (the only badge-bearing tab, §5.1)
    ├── breakthrough/     # US2 — critical breakthrough surfacing (in-app + push)
    ├── email-cleanup/    # US3 — sender list, unsubscribe/roll-up/keep, Confirm-Action sheet
    └── preferences/      # US4 — tier-push, cadence, quiet hours, per-source mute
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split on the ratified modular monolith. Inbox is one NestJS bounded context (`backend/src/modules/inbox/`, = `InboxModule`) exposing recommend-only endpoints and the four provided contracts, a **BullMQ worker pipeline** for ingestion/assembly/dispatch (the latency- and budget-critical path, kept off the UI hot path), plus a mobile feature module (`mobile/src/features/inbox/`) organized by user story. The module never reads spine or source-module storage directly — only the Module 0 contract clients under `contracts/consumed/` and the published `ModuleAlertEvent` envelope — preserving the no-shared-mutable-state boundary (Principle VII). **No module pushes directly**: the push surface is Inbox-internal (dispatch worker), and other modules reach it only by emitting the `ModuleAlertEvent` provided contract (ux-foundations §6.3). The repository-root layout and per-schema Postgres roles/RLS are ratified in platform-decisions.md; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. (The BullMQ worker pipeline is the platform-ratified ingestion mechanism, not a new abstraction; the uniform `ModuleAlertEvent` envelope replaces N per-module push integrations with one contract, reducing rather than adding complexity — Principle IX.)

# Quickstart & Validation: Module 15 — Social & Accountability

**Feature**: `017-module-15-social` | **Date**: 2026-06-29

A run/validation guide proving Social works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

> **Money note**: Social transmits **no monetary amount** — there is no money path. The "money fixtures" below are therefore **anti-money / leak-proof fixtures**: they assert that no amount/currency/account/institution field ever appears on the wire, and that the one `percentage_complete` ratio is a string-encoded `0..1` value, never a float or a reconstructable amount.

## Prerequisites

- Module 0 spine contract client available (or stubbed) exposing `GoalState` (`finos:spine/GoalState/1.0.0`). `HabitProgress`/`StreakState` (Module 9 Habits) and `MemberScope` (Module 14 Household) are **not yet published** — habit-streak circles are feature-checked and degrade to goal-based circles; household-joint goals use the **safe default (excluded)** until `MemberScope` ships.
- Seeded fixtures: a `GoalState` test node (with `current_amount`/`target_amount` so the spine yields a `0..1` ratio + `pace_status`), two+ test member identities, and one household-joint goal (for the exclusion test).
- Toolchain per platform-decisions (see [plan.md](./plan.md) Technical Context). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:social-fixtures      # goal node, members, one household-joint goal
```

## Validation by user story

### US1 — Create a circle and share ONE metric, nothing else (P1) 🎯 MVP

```bash
<pkg> test social/unit/projection-filter
<pkg> test social/integration/create-circle-share-one-metric
```

Expected:
- A circle is created with exactly **one** `shared_metric_kind`; the owner's `ShareGrant` is recorded and **audited** (SC-S-001 / FR-SOC-001).
- A member's circle view shows **only** the chosen projection (`percentage_complete` / `streak_count` / `pace_status`) + a non-financial bilingual `display_label` — and **no** amount, account name, institution name, or any other goal of the owner anywhere in the API response or rendered view.
- **Leak-proof fixture (mandatory)**: the `CircleProgress` response is asserted to contain **no** `*_cents`, `currency`, `amount`, `account*`, or `institution*` field (provider contract test, SC-S-001).
- **Percentage fixture (mandatory)**: a spine ratio `3000/5000` is transmitted as the decimal string `"0.6"` (string-encoded, `^(0(\.[0-9]+)?|1(\.0+)?)$`) and renders `60.0%` (en-CA) / `60,0 %` (fr-CA) via `@finos/format` — never a float, never a reconstructed `$3,000` (SC-S-001/SC-S-007).
- Configuring an amount-bearing metric (e.g. "$3,000 of $5,000") is **rejected** — money amounts are not a valid `shared_metric_kind` (the contract has no amount field) (FR-SOC-001).
- **Household exclusion**: a household-joint goal whose `MemberScope` was not extended to the circle is **totally excluded** — no projection, no placeholder row, no inferable existence (SC-S-005 / FR-SOC-001).

### US2 — Live updates from real progress, never manual entry (P2)

```bash
<pkg> test social/unit/recompute-idempotency
<pkg> test social/integration/live-updates
```

Expected:
- Advancing the underlying `GoalState.current_amount` (a real spine update) recomputes `CircleProgress` from that **real** value within the freshness window (SC-S-003 / FR-SOC-002).
- **No write path**: any client attempt to POST/PUT a projection value is **rejected** — projections are server-derived only (SC-S-003 / FR-X-003).
- **Idempotency fixture (mandatory)**: a redelivered spine change event (same `source_event_id`) does **not** double-apply and yields the identical projection (no divergence) (FR-X-003).
- A **stale** source (past the 24 h window) renders the projection with a **stale freshness chip** + "Updated {date}" — **flagged, not withheld** (dimensionless secondary metric) (SC-S-006 / FR-X-008).
- A **feed-down** source renders the **Unavailable** state with the last-known timestamp — never a fabricated or zero-filled projection (FR-X-012, six-state matrix).

### US3 — Revoke sharing and disappear from the circle, audited (P2)

```bash
<pkg> test social/integration/revoke
<pkg> test social/integration/deletion-cascade
```

Expected:
- A member who revokes has their projection **removed from all peers' views immediately** (server omits it; clients must not render a revoked member's cached projection), and the revocation is **audited** (actor, circle_id, timestamp) (SC-S-004 / FR-SOC-002 / FR-X-007).
- **Revoke idempotency**: revoking an already-revoked share is a no-op success — no duplicate audit event (data-model state transitions).
- Owner-side circle close/delete tears down **all** share grants + projections — no orphaned projection survives (FR-SOC-002).
- A full member **data-deletion** request cascades to all circle memberships, share grants, and projections within the **7-day** SLA and is audited (SC-S-009 / FR-X-013/019).

## Contract tests (mandatory — Principle VII / SC-S-008)

```bash
<pkg> test social/contract/consumed   # GoalState (published); HabitProgress/StreakState, MemberScope (pinned; feature-checked/safe-default until published)
<pkg> test social/contract/provided   # CircleProgress, AccountabilitySignals
```

Expected:
- All consumer + provider contract tests pass.
- The **provider** test for `CircleProgress` and `AccountabilitySignals` additionally **asserts the absence** of any money/currency/account/institution field in every response (FR-SOC-001 leak-proof guarantee).
- An intentionally bumped/broken consumed schema (`GoalState`) **fails CI** and **disables** the dependent circle projection (version-skew behavior, SC-012) rather than rendering on a mismatched schema.

## Cross-cutting checks

- **Cross-user safety (SC-S-002 / SC-015)**: API-layer (not UI) authorization tests prove **0** cross-circle / cross-member exposures; a request for a circle/projection the requester is not an authorized member of is **denied server-side and audited**. A client-supplied `circleId`/`memberId` is never trusted — identity comes from the validated session; RLS policy tests confirm DB-level isolation.
- **Recommend-only / no manual entry (FR-X-003 / FR-SOC-002)**: grep the Social API surface — there is **no** money-movement endpoint and **no** projection-write endpoint; every mutating call is consent (grant/revoke/close) or server-derived recompute.
- **Audit trail (Principle VI)**: `circle_created` / `share_granted` / `share_revoked` / `circle_closed` / `deletion_cascade` / `access_denied` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no finance-derived values or member identifiers.
- **Notification restraint (SC-S-010 / SC-009)**: Social emits **0** standalone push notifications; 100% of circle signals route through the Inbox digest pipeline (`AccountabilitySignals`, never `critical` tier).
- **Performance (SC-010)**: module-switch into Social renders the cached circle list/projections in ≤ 300 ms; a cache miss/stale renders the flagged/Unavailable state rather than a blocking fetch.
- **Accessibility (SC-011)**: WCAG 2.1 AA; bilingual EN/FR screen-reader labels on every interactive element and projection value (e.g. "Maple's goal is 72% complete, updated 2 hours ago" / "L'objectif de Maple est complété à 72 %, actualisé il y a 2 heures").

## Done when

All user-story validations pass, the leak-proof + percentage-string + idempotency fixtures hold with zero amount/account leakage, all consumer+provider contract tests are green (including the provider no-money-field assertion), the API-layer authZ tests show 0 cross-user exposure with audited denials, and the cross-cutting checks hold.

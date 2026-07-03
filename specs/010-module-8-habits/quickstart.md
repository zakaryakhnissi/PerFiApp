# Quickstart & Validation: Module 8 — Habits & Routines

**Feature**: `010-module-8-habits` | **Date**: 2026-06-29

A run/validation guide proving Habits works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

> **No-money-math note**: This module computes **no** monetary value. There is no `@finos/money` rounding fixture to author here; instead, the mandatory money check is a **pass-through fixture** proving a source `MoneyCents` amount is surfaced **unchanged** (never re-rounded/converted) and an **XP-from-integer-counts-only** fixture proving no money amount ever enters streak/XP math (SC-H-007). These stand in for the money golden fixtures other modules carry.

## Prerequisites

- Module 0 + source-module contract clients available (or feature-checked/stubbed at the *transport* layer — never with fabricated business data): `RoundupProposals` (Cash Safety/M3), `BillCalendar` (Bills), `NotificationDigest` (Inbox/M10), `TaskCompletionEvents` (Tasks/M7), `GoalState` (Spine/M0). Any unshipped source ⇒ its ritual section is feature-checked off and the ritual degrades gracefully (HAB-OI-1).
- Seeded fixtures: one due bill, one **approved** roundup event (with `MoneyCents` pass-through), one unread digest item, one completed task event, one **reversal/void** event referencing a prior qualifying event, and a `GoalState` test node.
- Toolchain per [platform-decisions.md](../_platform/platform-decisions.md) §2/§6 (NestJS + Expo, Pact, Jest, BullMQ, Testcontainers Postgres). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
pnpm install
pnpm run seed:habits-fixtures      # bill, approved-roundup, digest item, task event, reversal event, goal node
```

## Validation by user story

### US1 — Streaks & XP advance only for real financial actions (P1-within-P3)

```bash
pnpm test habits/unit/streak-engine
pnpm test habits/unit/idempotency
pnpm test habits/unit/compensation
pnpm test habits/integration/streak-advance
```

Expected:
- A real **approved**-roundup completion event advances the tied habit's `current_streak` by 1 and raises `xp`; `last_qualified_on` is set; a bilingual `Reasoning` records *which source event + action class* counted (SC-H-001; FR-X-006).
- A non-qualifying event (app-open, screen view, a **proposed-but-unapproved** roundup) advances **nothing** (SC-H-001).
- **Idempotency fixture (mandatory)**: the same `source_event_id` redelivered → streak/XP advance applied **at most once** (no double-count) (SC-H-002 / FR-X-003).
- **Compensation fixture (mandatory)**: a reversal/void referencing a prior `source_event_id` decrements the exact advance it produced and resets the streak if the reversed day was the most recent qualifying day; compensation is itself idempotent (SC-H-003).
- **XP-integrity fixture (mandatory)**: XP is a deterministic function of **integer event/streak counts only** — injecting a money amount into the XP path is rejected by type/test; no money amount is ever an XP input (SC-H-007).
- Daily cadence + 6-hour grace: a qualifying action at 23:50 local then 00:10 next-day local keeps the streak; missing beyond grace resets to 0 (research §4).

### US2 — Daily cross-module ritual of live micro-actions (P1-within-P3)

```bash
pnpm test habits/unit/ritual-assembler
pnpm test habits/integration/daily-ritual
```

Expected:
- With ≥1 due bill, ≥1 pending roundup, ≥1 unread digest item, the ritual presents **exactly those live items**, each labelled with its `source_module` and a `FreshnessStamp` (SC-H-005; FR-HAB-002).
- **Money pass-through fixture (mandatory)**: a roundup ritual item shows the source `MoneyCents` **unchanged** through `@finos/format` (en-CA `$12.34` / fr-CA `12,34 $`); the displayed value is byte-for-byte the source amount — Habits performs **no** rounding/conversion (SC-H-007).
- A money item routes through the **owning module's** Confirm-Action sheet — there is **no** Habits-owned executor and **no** approximate figure (SC-H-006; FR-X-003; UX §2.2).
- A **stale/unavailable** source section is **flagged/withheld** (not silently dropped, not shown as fresh); the rest of the ritual still runs on available sections (SC-H-005 / FR-X-008 / FR-X-012).
- A ritual item conflicting with Cash Safety `SafeToActSignal` shows the **Conflict Banner**, Cash Safety takes precedence, and the streak does **not** advance by overriding safety (research §7; UX §3.1/§10.4).
- **No live items** today → positive **"all clear"** empty state, never fabricated/zero-filled items (US2 AS4).
- A replayed ritual completion does not double-award (run idempotent per `(profile, local_day)`) (SC-H-002).

### US3 — Game layer fully disable-able (P1-within-P3)

```bash
pnpm test habits/unit/game-layer-toggle
pnpm test habits/integration/disable-game-layer
```

Expected:
- With the game layer **disabled**: 0 game UI elements render (streak/XP/level/badge), the daily ritual still assembles and completes its real financial micro-actions, and no other module changes behavior (SC-H-004; FR-HAB-001).
- On **re-enable**: active-habit streaks resume from **0**; XP/level preserved at last value — no retroactive back-fill of streaks from un-gamified history (research §5; spec Clarifications).
- A **kid** household role sees only its own habits/goals, with **no** profile switcher and no other member's data (UX §10.6; threat model).

## Contract tests (mandatory — Principle VII / SC-H-010)

```bash
pnpm test habits/contract/consumed   # RoundupProposals, BillCalendar, NotificationDigest, TaskCompletionEvents, GoalState
pnpm test habits/contract/provided   # StreakState, HabitProgress (projection-only)
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken **consumed** schema **fails CI** and **disables** the dependent ritual section / streak rule (version-skew behavior, SC-012); the **provided** `StreakState`/`HabitProgress` schemas validate as **projection-only** — a money/account/merchant/source-ref field added to either provided contract fails the provider test (FR-SOC-001).

## Cross-cutting checks

- **Recommend-only (SC-H-006 / FR-X-003)**: grep the Habits API surface — there is **no** money-movement endpoint; every money item delegates to the owning module's Confirm-Action sheet.
- **No money origination (SC-H-007)**: grep the Habits source — no rounding/FX/decimal arithmetic on monetary values; no `@finos/money` arithmetic import in the streak/XP/ritual paths; pass-through amounts are surfaced unchanged.
- **Audit trail (Principle VI / FR-X-007)**: `streak_advanced` / `streak_compensated` / `xp_awarded` / `ritual_started` / `ritual_completed` / `cross_user_read_denied` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Cross-user authZ (SC-H-008 / Principle V)**: API-layer (not UI) IDOR/horizontal-priv-esc test proves 0 cross-user habit-data exposure; Social receives only the server-computed projection (no raw amounts/identifiers/`source_ref`); every denied cross-user access is audited.
- **Redaction (FR-X-014)**: debug logs contain no PII and no pass-through monetary values.
- **Notification restraint (SC-H-011 / SC-009)**: 0 standalone pushes from Habits; streak/ritual nudges are emitted to the Inbox digest pipeline with `module_id`, `event_type`, `priority_tier`, and bilingual payload.
- **Retention/revocation (FR-X-013 / FR-X-019)**: Inbox-derived ritual enrichment obeys the email-revocation cascade; dormant habit/streak/ritual history obeys the retention bound + crypto-shred.
- **Performance (SC-010 / FR-X-015)**: module-switch into Habits renders the cached streak grid/ritual list in ≤ 300 ms; cache miss/stale renders a flagged state rather than blocking.
- **Accessibility & locale (SC-H-009 / SC-011 / FR-X-016)**: WCAG 2.1 AA, bilingual screen-reader labels on every interactive element; pass-through CAD/percent/date render via `@finos/format` (fr-CA `1 234,56 $`); reduced-motion replaces streak-celebration animation with a fade.

## Done when

All three user-story validations pass, the idempotency / compensation / XP-integrity / money-pass-through fixtures hold with zero double-counts and zero recomputed amounts, all consumer+provider contract tests are green, the provided contracts validate as projection-only, and the cross-cutting checks hold.

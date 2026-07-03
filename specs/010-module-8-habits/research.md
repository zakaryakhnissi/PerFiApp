# Phase 0 Research: Module 8 — Habits & Routines

**Feature**: `010-module-8-habits` | **Date**: 2026-06-29

Resolves Habits-specific design decisions. **Platform-stack choices are inherited from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here** (TypeScript modular monolith, NestJS module per bounded context, PostgreSQL `ca-central-1`, append-only event store, `@finos/money` + `@finos/format`, Pact contract tests, BullMQ workers, Inbox digest pipeline). Items genuinely open for this module are flagged as documented, non-blocking open items at the end.

---

## 1. Money posture: this module computes no money

**Decision**: Habits performs **no** valuation, conversion, or rounding. Any CAD figure shown (a roundup amount, a bill amount) is a **read-only pass-through** of the source contract's `MoneyCents`, formatted via `@finos/format` unchanged. XP/streak math uses **integer counts only**; a monetary amount is never an XP input.

**Rationale**: Constitution IV is satisfied trivially when the module originates no money figure — and this keeps the engagement layer from ever inheriting a money-input-staleness obligation. The money obligations (exact cents, half-up, FX) live entirely in the source modules (Cash Safety, Bills) per the single-canonical-spine boundary (platform §3).

**Alternatives considered**: Re-display a "tidied" amount in Habits — rejected (would duplicate money logic and risk drift/double-rounding). Roll a CAD value into XP (e.g. "+1 XP per $10 saved") — rejected (makes the game layer depend on a money input, violating the simplicity and money-integrity posture; XP stays count-based).

---

## 2. "Real financial action" definition & event ingestion

**Decision**: A streak/XP advance is accepted **only** from a verified, consumed **completion/approval** event: `TaskCompletionEvents` (completed money task), an **approved** `RoundupProposals` item, a **reviewed/paid** `BillCalendar` obligation, a **cleared** `NotificationDigest` item. Ingested via BullMQ workers (platform §2 hosting) with mandatory timeouts/retries; each advance is keyed on the source `source_event_id` (UNIQUE) for exactly-once effect.

**Rationale**: FR-HAB-001 ("real financial actions") + umbrella Acceptance Scenario 4 (idempotent retries). At-least-once delivery is the norm for cross-module events; the idempotency key makes redelivery safe. Proposals (un-approved) and UI events never qualify.

**Alternatives considered**: Advance on any module *interaction* — rejected (rewards app-opening, defeats the integrity core). Poll source state instead of consuming events — rejected (no clean idempotency anchor, racy, heavier).

---

## 3. Reversal / compensation model

**Decision**: A consumed **reversal/void** event referencing a prior `source_event_id` **compensates** the exact advance it produced (decrement XP/streak; reset streak if the reversed day was the most recent qualifying day). Compensation is itself idempotent. Implemented as a derived projection over the append-only event store (platform §3, D5) so the log stays immutable and the streak is rebuildable by replay.

**Rationale**: FR-HAB-001 integrity ("advance only for real actions") implies an action that did not hold must not leave a streak behind. The event-sourced projection makes compensation a replay concern rather than a destructive mutation.

**Alternatives considered**: Ignore reversals (streaks drift from reality) — rejected. Hard-delete the advance row — rejected (contradicts the append-only audit store, platform D5/D6).

---

## 4. Streak cadence & grace window

**Decision**: Streaks evaluate against the user's **local calendar day** (profile timezone; UTC stored, rendered at edge — platform §4) with a **6-hour grace** into the next day. Missing beyond the grace resets the streak to 0. Default fixed for MVP; user-adjustable later via `GameLayerSetting.grace_seconds_override`.

**Rationale**: A finance habit completed at 23:50 vs 00:10 should not arbitrarily break a streak; the grace absorbs midnight-boundary and timezone-edge cases (spec Edge Cases). Deterministic and unit-testable against fixtures.

**Alternatives considered**: UTC-day boundary (confuses users in their local evening) — rejected. No grace (fragile, punishes near-midnight completions) — rejected.

---

## 5. Game-layer enable/disable & re-enable baseline

**Decision**: The game layer is a per-profile **opt-in** toggle (`GameLayerSetting.enabled`). Disabled ⇒ all game UI hidden and no advances computed, while the daily ritual and every real financial micro-action remain fully functional. On **re-enable**, active-habit streaks **resume from 0**; XP/level is **preserved** at its last value — no retroactive back-fill of streaks from un-gamified history.

**Rationale**: FR-HAB-001 NON-NEGOTIABLE ("MUST function fully with the game layer disabled"); the no-back-fill rule prevents inflated streaks and is documented so users aren't surprised (spec Clarifications).

**Alternatives considered**: Back-fill streaks from historical events on re-enable — rejected (fabricates a streak the user never experienced). Discard XP on disable — rejected (punishes a privacy/preference choice).

---

## 6. Ritual assembly & graceful degradation

**Decision**: The daily ritual assembles **live** items by reading the consumed contracts at run time (`BillCalendar`, `RoundupProposals`, `NotificationDigest`, optionally `TaskCompletionEvents` for "complete a task" prompts). Each section is wired behind an availability/feature check; a stale or unavailable section is **flagged/withheld** (UX six-state) while the rest of the ritual proceeds. A run is idempotent per (profile, local_day). No fabricated/zero-filled items.

**Rationale**: FR-HAB-002 (live items) + FR-X-008 (fresh-or-flagged) + FR-X-012 (graceful degradation). Mirrors how Rewards feature-checks `SafeToActSignal` until Cash Safety ships.

**Alternatives considered**: Cache a snapshot of items and replay it (risks stale/duplicate actions) — rejected. Block the whole ritual if any one section is down — rejected (fails graceful degradation; the user can still clear the live sections).

---

## 7. Cash Safety precedence in the ritual

**Decision**: A ritual item that implies spending MUST respect Cash Safety's `SafeToActSignal`. If surfacing/acting on an item would conflict with an overdraft/safety flag, the **Conflict Banner** is shown and Cash Safety **takes precedence** (UX §3.1, §10.4); the streak does not advance by overriding safety. Wired behind a feature check until Cash Safety ships.

**Rationale**: Umbrella conflict-resolution rule (safety > optimization/engagement). A gamified nudge must never push an unsafe spend to "keep a streak".

**Alternatives considered**: Let the streak win (nudge the spend anyway) — rejected outright (safety precedence is non-negotiable).

---

## 8. Cross-user exposure to Social (projection-only)

**Decision**: `HabitProgress`/`StreakState` are **provided** as **server-computed projections** — streak count, level, %, badge names — with **no** monetary value, account name, merchant, or `source_ref`. The projection is computed **before** transmission to Social; cross-user authZ is enforced server-side on session identity + `MemberScope` + RLS (platform §5). Denied cross-user reads are audited.

**Rationale**: FR-SOC-001 + Constitution V. Habits is a cross-user data path the moment Social consumes it; the projection-only constraint is fixed now even though Social (P4) ships later.

**Alternatives considered**: Provide raw `HabitProgress` and let Social filter — rejected (UI/consumer-side filtering is non-compliant; the provider must compute-out sensitive fields server-side).

---

## 9. Notification routing (Inbox digest only)

**Decision**: Streak/ritual nudges are **emitted to the Inbox digest pipeline** (UX §6) with `module_id`, `event_type`, `priority_tier` (Informational for streaks; Important only for a time-sensitive ritual item), and a bilingual payload. Habits **never** calls a push API directly.

**Rationale**: SC-009 / FR-INB-002 notification restraint; Inbox owns the daily budget and dedup. Keeps the engagement layer from becoming a notification-spam source.

**Alternatives considered**: Direct push for streak celebrations — rejected (violates notification restraint and the ≤2/day budget).

---

## 10. Persistence & performance

**Decision**: Habits-owned state (habits, streak/XP projections, qualifying events, ritual runs, settings) in the `habits` Postgres schema (`ca-central-1`) with per-schema role + RLS (platform §1/§5); streak/XP as a rebuildable projection over the append-only event store (platform D5). Ritual list and streak grid are served from a local, freshness-stamped cache on the client for the ≤300 ms module-switch budget (FR-X-015); a cache miss/stale renders a flagged state rather than blocking on a network fetch.

**Rationale**: Inherits platform §1/§3/§6. The projection + cache pattern matches the Rewards performance approach without violating fresh-or-flagged.

**Alternatives considered**: Plain CRUD streak table (mutable, harder to compensate/audit) — rejected (use the event-sourced projection). Always-live ritual fetch on tab open — rejected (blows the 300 ms budget).

---

## 11. Contract testing approach

**Decision**: Consumer-driven (Pact) contract tests for each consumed contract (`TaskCompletionEvents`, `RoundupProposals`, `BillCalendar`, `NotificationDigest`, `GoalState`) and provider contract tests for each provided contract (`HabitProgress`, `StreakState`), in CI; contracts semver'd with a deprecation window. Version skew disables the dependent ritual section / projection rather than serving on a mismatched schema.

**Rationale**: Principle VII + FR-X-011 + SC-012. Because several consumed contracts may not be ratified yet, the consumer tests are authored against min version 1.0.0 and pin exact versions once published (consumed/README).

**Alternatives considered**: Integration tests against live source modules only — rejected (slow, doesn't pin the schema, no provider-side guarantee).

---

## Open items handed to planning/ops (documented, non-blocking)

- **HAB-OI-1 (Source-contract ratification)**: `RoundupProposals` (Cash Safety/M3), `BillCalendar` (Bills), `NotificationDigest` (Inbox/M10), and `TaskCompletionEvents` (Tasks/M7) schemas are referenced at min version 1.0.0 but may not yet be authored by their owning modules. Pin exact versions in consumer tests when published; until then the dependent ritual section is disabled (never stubbed with fabricated data). Owner: each source module's plan.
- **HAB-OI-2 (XP/level constants)**: exact XP-per-action and level thresholds are an MVP tuning detail; the integrity rules (real-action-only, idempotent, compensable, no-money-input) are fixed. Owner: Habits plan.
- **HAB-OI-3 (Grace window / cadence defaults)**: 6-hour grace + local-day boundary are MVP defaults; final values + user-adjustability confirmed in the Module 0 ops/PIA review (consistent with platform NR-2 staleness/buffer tuning). Owner: Module 0 plan / Habits plan.
- **HAB-OI-4 (Dormant retention for engagement data)**: the dormant-account retention bound (FR-X-019) applies to habit/streak/ritual history; the inactivity window is set in the planning-phase PIA (platform NR-3). Owner: Module 0 PIA.
- **HAB-OI-5 (Social projection scope)**: the exact fields in the Social-facing projection (beyond streak/level/%/badge) are finalized when Social (P4) is specced; the projection-only + no-money constraint (FR-SOC-001) is fixed now. Owner: Social (Module 14) plan.

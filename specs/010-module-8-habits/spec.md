# Feature Specification: Module 8 — Habits & Routines

**Feature Branch**: `010-module-8-habits`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 8 — Habits & Routines (Priority: P3)"; functional requirements FR-HAB-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Habits & Routines** tab only — an **opt-in** game layer (streaks/XP earned only for *real* financial progress) and a **daily cross-module ritual** that bundles micro-actions from other modules. Module 0 (Spine) and the source modules (Tasks, Cash Safety, Bills, Inbox) are dependencies: Habits **consumes** their contracts and **never** re-implements bill detection, roundup proposing, task completion, or notification assembly, and **never computes a money figure of its own**. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated only where they bind a Habits behavior.
>
> **Boundary with Tasks (Module 7)**: Habits does **not** own tasks. It reacts to `TaskCompletionEvents`. A ritual micro-action that *creates* work routes to Tasks; Habits only references it.
>
> **Boundary with Inbox (Module 10)**: Habits does **not** send notifications. Streak/ritual nudges are emitted to the Inbox digest pipeline (UX foundations §6, FR-INB-002 / SC-009). Habits never calls a push API directly.
>
> **Boundary with Social (Module 14/P4)**: Habits **provides** `HabitProgress`/`StreakState` to Social, but only the **server-computed projection** (streak count, level, percentage) is ever exposed cross-user — never raw financial amounts or account identifiers (FR-SOC-001).

## User Scenarios & Testing *(mandatory)*

Habits is an **engagement layer that sits on top of completed actions from other modules** (umbrella "Why this priority"). Its entire value proposition is integrity: a streak/XP advances **only** for a *real* financial action, the app is **fully functional with the game layer disabled**, and the daily ritual pulls **live** items from Bills, Cash Safety, and Inbox. It is a P3 module — thorough analysis, lean MVP feature set (Constitution IX).

### User Story 1 - Streaks & XP advance only for real financial actions (Priority: P1 within this P3 module)

A user with the game layer enabled completes a real financial action (e.g. approves a roundup, marks a bill reviewed, completes a money task) and sees the tied habit's streak and XP advance — and sees that nothing advances for non-real or simulated actions.

**Why this priority**: This is the integrity core of the module (FR-HAB-001). Without it, the game layer is a vanity meter that rewards opening the app. Every downstream story (ritual, Social sharing) depends on streaks being *earned*.

**Independent Test**: With the game layer enabled and one habit tied to "approve a roundup", deliver a real `RoundupProposals` approval event and confirm the linked habit's streak increments by one and XP increases; then deliver a non-qualifying event (e.g. a UI tap with no completed financial action) and confirm no advance.

**Acceptance Scenarios**:

1. **Given** the game layer is enabled and a habit tied to a real action class, **When** a real financial action of that class is completed (a consumed completion/approval event arrives), **Then** the tied habit's streak and XP advance. *(FR-HAB-001)*
2. **Given** the game layer is enabled, **When** an event that is *not* a completed real financial action occurs (app open, screen view, a *proposed* but un-approved roundup), **Then** no streak/XP advances. *(FR-HAB-001)*
3. **Given** a real financial action that has **already** advanced a streak, **When** the same underlying event is delivered again (network retry, at-least-once redelivery), **Then** the streak and XP advance **at most once** (idempotent), keyed on the source event id. *(umbrella Acceptance Scenario 4)*
4. **Given** a habit with a daily cadence, **When** the user completes the qualifying action two days in a row, **Then** the streak length is 2; **when** a qualifying day is missed beyond the grace window, **Then** the streak resets per the documented grace rule (see Clarifications).
5. **Given** a source completion event whose underlying action was later **reversed/voided** within the same period (e.g. a roundup approval undone), **When** the reversal is consumed, **Then** the corresponding streak/XP advance is **compensated** (rolled back) so the streak reflects only actions that actually held. *(integrity — Clarifications)*

---

### User Story 2 - Daily cross-module ritual of live micro-actions (Priority: P1 within this P3 module)

A user starts the daily ritual and is walked through a short, bundled set of **live** micro-actions sourced from other modules — bills to review (Bills), roundups to approve (Cash Safety), notifications to clear (Inbox) — confirming each through that module's own confirm-action flow.

**Why this priority**: This is the second half of the module's reason to exist (FR-HAB-002) and the umbrella Independent Test. It turns scattered cross-module to-dos into one habit-forming sequence.

**Independent Test**: With at least one due bill (`BillCalendar`), one pending roundup (`RoundupProposals`), and one unread digest item (`NotificationDigest`), start the ritual and confirm it presents exactly those live items, each with its source module and freshness, and that completing an item advances the ritual and (if game layer enabled) the tied habit.

**Acceptance Scenarios**:

1. **Given** the daily ritual, **When** the user starts it, **Then** it presents **live** bills to review, roundups to approve, and notifications to clear, each labelled with its source module and a freshness stamp. *(FR-HAB-002)*
2. **Given** a ritual item that implies a money action (approve a roundup, schedule a bill payment), **When** the user acts on it, **Then** the action routes through the **owning module's Confirm-Action sheet** — Habits never executes money and never shows an approximate figure (FR-X-003; UX §2.2).
3. **Given** a source feed for a ritual section is **stale or unavailable**, **When** the ritual assembles, **Then** that section is **flagged/withheld** (not silently dropped, not shown as fresh) and the rest of the ritual still runs on the available sections (FR-X-008, FR-X-012).
4. **Given** the user has **no** live items today (all bills paid, no roundups, inbox clear), **When** the ritual starts, **Then** it shows a positive "all clear" empty state rather than fabricated or zero-filled items.
5. **Given** the game layer is enabled, **When** the user completes the ritual, **Then** the ritual-completion habit advances; **given** it is disabled, **Then** the ritual still runs and completes with no game UI. *(FR-HAB-001/002)*

---

### User Story 3 - Game layer fully disable-able (Priority: P1 within this P3 module)

A user turns the game layer off and the entire module — and the ritual — keeps working with zero game UI, and the rest of FinOS is unaffected.

**Why this priority**: A NON-NEGOTIABLE umbrella requirement (FR-HAB-001: "MUST function fully with the game layer disabled"). Gamification must never become load-bearing for a financial task.

**Independent Test**: Disable the game layer; confirm streaks/XP/levels/badges disappear from the UI, the daily ritual still assembles and completes its real financial micro-actions, and no other module changes behavior.

**Acceptance Scenarios**:

1. **Given** the game layer is disabled, **When** any real financial action completes, **Then** functionality is unaffected and **no** game UI (streak, XP, level, badge) appears. *(umbrella Acceptance Scenario 3)*
2. **Given** the game layer is re-enabled later, **When** the user views Habits, **Then** streak/XP state **resumes from a documented baseline** (see Clarifications) — historical real actions are not retroactively gamified into inflated streaks.
3. **Given** a kid household role (UX §10.6), **When** they open Habits, **Then** they see only their own goals/habits with no profile switcher and no other member's financial data.

---

### Edge Cases

- **Empty / no connectivity**: With no source modules connected (no Bills, no Cash Safety, no Inbox), the ritual shows the first-run empty state and the game layer has no qualifying events to advance — no fabricated streaks. With partial connectivity, the ritual runs on the connected subset and shows the Partial Data Banner (UX §3).
- **Stale / missing inputs**: A ritual section whose source contract is stale/unavailable is flagged or withheld; a streak that depends on a freshness-stamped completion event does **not** advance on a stale event. No money figure is ever recomputed here, so there is no "stale money input" of this module's own — but a surfaced item carrying a money value (a roundup amount, a bill amount) shows the source's freshness chip and is withheld if that money input is stale (Cash Safety / Bills precedence rules apply).
- **Conflicting advice with Cash Safety precedence**: A ritual must never nudge a spend-positive action that Cash Safety's `SafeToActSignal` flags as unsafe. If a surfaced item would conflict, the **Conflict Banner** is shown and Cash Safety takes precedence (UX §3.1, §10.4); the streak for that item does not advance by overriding safety.
- **Idempotency / retries**: All consumed completion events are at-least-once; every streak/XP advance is keyed on the **source event id** and is exactly-once in effect (umbrella Acceptance Scenario 4). A replayed ritual completion does not double-award.
- **Reversal / compensation**: A consumed action that is later reversed/voided compensates the streak/XP it produced (US1 AS5) — the game layer must reflect only actions that held.
- **Cross-user boundaries**: `HabitProgress`/`StreakState` provided to Social expose **only** the server-computed projection (streak count, level, % complete) — never raw amounts, account names, or institution identifiers (FR-SOC-001). A request for another user's habit detail without authorization is denied and audited (see Threat Model).
- **Multi-currency**: Habits performs **no** currency math. Any money value shown inside a ritual item is a read-only pass-through already CAD-normalized by its source module; Habits never converts or re-rounds it.
- **Time zone / cadence boundaries**: Daily streaks are evaluated against the user's local day boundary (profile timezone, platform-decisions §4: stored UTC, rendered at edge). A grace window prevents a streak loss from a late-night completion crossing midnight (see Clarifications).
- **Bilingual integrity**: Every habit name, ritual label, badge, and nudge has EN and FR text; a single-language leak is a defect (FR-X-005).
- **Game-layer abuse**: Streaks cannot be advanced by repeatedly toggling or re-submitting; only a *new* qualifying source event id advances a streak. XP is derived from streak/event facts, never client-asserted.

## Clarifications

### Session 2026-06-29 (decisions made by the spec author; non-blocking)

- **Q: What exactly counts as a "real financial action" that may advance a streak/XP?** → **A**: Only a **completed, non-reversed** action delivered as a consumed completion/approval event: `TaskCompletionEvents` (a completed money task), an **approved** `RoundupProposals` item (approval — not the mere proposal), a **reviewed/paid** `BillCalendar` obligation, and a **cleared/actioned** `NotificationDigest` item. App opens, screen views, and *proposed-but-unconfirmed* actions never qualify (FR-HAB-001).
- **Q: Daily-streak grace window?** → **A**: A streak is preserved if the qualifying action lands within the **same local calendar day, plus a 6-hour grace** into the next day (covers late-night completions). Missing beyond the grace resets the streak to 0. User-adjustable later; fixed default for MVP.
- **Q: Re-enable baseline after the game layer was off?** → **A**: On re-enable, streaks **resume from zero** for active habits and XP/level is preserved at its last value (no retroactive back-fill of streaks from history). Documented so users aren't surprised; avoids inflating streaks from un-gamified history.
- **Q: Reversal handling?** → **A**: A consumed reversal/void event referencing a prior source event id **compensates** the exact streak/XP advance that event produced (decrement, and reset the streak if the reversed day was the streak's most recent qualifying day). Compensation is itself idempotent.
- **Q: XP/level formula scope for MVP?** → **A**: XP is a simple, deterministic integer derived from qualifying events and streak length (e.g. fixed XP per qualifying action + a small streak-length bonus); levels are XP thresholds. No money is ever an XP input. Exact constants are a planning detail; the *integrity* rules (real-action-only, idempotent, compensable) are fixed here.
- **Q: Does any ritual section originate a money figure?** → **A**: **No.** Every monetary value in the ritual is a read-only pass-through from the source contract (`RoundupProposals` amount, `BillCalendar` amount), already CAD-normalized and freshness-stamped by its owner. Habits computes no money (so it has no money-rounding obligation of its own; see Money Correctness).

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-HAB-*):

- **FR-HAB-001 (Real-action gamification, fully disable-able)**: System MUST advance streaks/XP **only** for real, completed, non-reversed financial actions (per the Clarifications definition), keyed on the **source event id** so an advance is **idempotent** and **exactly-once in effect** (FR-X-003 idempotency; umbrella Acceptance Scenario 4). The system MUST be **fully functional with the game layer disabled** — every real financial micro-action (including the daily ritual) MUST work with no game UI present. A reversed/voided source action MUST **compensate** the streak/XP it produced.
- **FR-HAB-002 (Daily cross-module ritual)**: System MUST provide a daily ritual that pulls **live** micro-actions from **Bills** (`BillCalendar`), **Cash Safety** (`RoundupProposals`), and **Inbox** (`NotificationDigest`). Each item MUST carry its source module and a `FreshnessStamp`; a stale/unavailable source section MUST be flagged or withheld (never silently dropped, never shown as fresh) while the rest of the ritual proceeds. Any item implying a money action MUST route through the **owning module's** Confirm-Action flow — Habits **never** executes money (FR-X-003) and **never** recomputes a money figure.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)):
FR-X-001 (Integration — streaks reflect real financial actions, the ritual reads real module state), FR-X-003 (Recommend/idempotent, never move money — applies to streak/XP writes and ritual money items), FR-X-004 (CAD + time-to-goal — pass-through only, via source contracts; `GoalState` ties a habit to a goal's time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability — a streak advance carries *why it counted*: which source event), FR-X-007 (Audit trail — streak/XP advances and reversals are append-only events), FR-X-008 (Freshness — ritual sections + completion events), FR-X-010 (Least privilege & threat model — `HabitProgress`/`StreakState` shared cross-user to Social), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation — partial/stale sources), FR-X-013 (Email-sourced data revocation cascade — any Inbox-derived enrichment surfaced in a ritual obeys it), FR-X-014 (Observability/redaction), FR-X-015 (Performance ≤ 300 ms), FR-X-016 (Accessibility), FR-X-019 (Dormant-account retention bound), FR-X-020 (Canadian residency).

### Key Entities *(include if feature involves data)*

Consumed from other modules (read-only contracts, not owned here): `TaskCompletionEvents` (Tasks/M7), `RoundupProposals` (Cash Safety/M3), `BillCalendar` (Bills), `NotificationDigest` (Inbox/M10), `GoalState` (Spine/M0).

Owned/provided by this module:

- **Habit**: An opt-in, user- or template-defined habit tied to a **real action class** (e.g. "approve a roundup", "review a bill", "complete the daily ritual"), with a cadence (daily/weekly), bilingual name/description, and an enabled flag. Owned; not directly provided cross-module.
- **StreakState**: The current and longest streak length for a habit, last qualifying date, grace status. **Provided** to Social and Inbox (projection only — no money).
- **HabitProgress**: A user's aggregate game-layer state — XP, level, per-habit streaks, badges earned — and the **game-layer-enabled** flag. **Provided** to Social and Inbox (projection only — no money).
- **QualifyingEvent**: An immutable record linking a consumed `source_event_id` (+ source module + action class) to the streak/XP advance it produced — the **explainability + idempotency** key. Drives compensation on reversal.
- **Ritual / RitualRun**: A daily ritual definition and a dated run instance bundling live items from the consumed contracts; each item references its source, freshness, and completion state. A RitualRun is **idempotent** per (profile, local-day).
- **RitualItem**: One micro-action in a run — `{ source_module, source_ref, kind (bill_review | roundup_approve | notification_clear | task_complete), display_en/fr, freshness, money_passthrough? (read-only, source-owned), completion_state }`. `money_passthrough` is never computed here.
- **GameLayerSetting**: Per-profile opt-in toggle and preferences (cadence, grace window override).
- **AuditEvent**: Append-only record of streak/XP advance, reversal/compensation, ritual start/complete, and any denied cross-user habit read (Principle VI / FR-X-007).

### Money Correctness *(this module computes NO monetary values — see scope)*

This module **does not compute, convert, round, or originate any monetary value**. It is included for completeness and to make the boundary explicit:

- **No money math**: Habits performs no valuation, no FX, no rounding. Any CAD figure shown in a ritual item (a roundup amount, a bill amount) is a **read-only pass-through** from the source contract (`RoundupProposals`, `BillCalendar`), already integer-cents and CAD-normalized and freshness-stamped by its owner. Habits MUST NOT re-render it with its own arithmetic; it passes the source value to `@finos/format` for locale display unchanged (FR-X-002 / FR-X-005).
- **No money in XP**: XP/level/streak math uses **only integer event/streak counts** — never a monetary amount as an input. This keeps the game layer from ever depending on a money figure (avoids the Principle IV money-input-staleness obligation entirely for the game layer).
- **Idempotency (Principle IV / FR-X-003)**: Every state Habits writes on the user's behalf — a streak/XP advance, a ritual-completion record, a compensation — is keyed on the **source event id** with a uniqueness constraint and is safe to retry; a replayed event never double-applies. This is the module's primary Principle-IV obligation.
- **Recommend-only**: Habits **never** moves money and **never** executes a money action; ritual money actions route to the owning module's Confirm-Action sheet (FR-X-003, UX §2.2).
- **Stale-money deference**: When a ritual item carries a source money value whose source freshness is stale, Habits defers to the source module's flag/withhold decision and surfaces the source's freshness chip — it never presents a stale source amount as fresh.

### Security & Privacy Threat Model *(MANDATORY — HabitProgress/StreakState are shared cross-user to Social, and kid household roles exist)*

This module touches **another person's data path**: it **provides** `HabitProgress`/`StreakState` to Social (Accountability Circles) and is surfaced for kid household roles. A threat model is therefore required (Constitution V, FR-X-010). Habits holds **no aggregation tokens or credentials** (those are Module 0's); its sensitive assets are behavioral/engagement signals and the *links* to financial actions.

- **Assets**: A profile's habits, streaks, XP/level, badges, and `QualifyingEvent` records (which reference, but do not duplicate, financial actions in other modules); ritual run history (which money micro-actions a user did/skipped — a behavioral signal).
- **Trust boundaries / actors**: The owning user; **circle members** in Social (must see only the projection); **household members** (per `MemberScope`); **kid roles** (own data only, no switcher — UX §10.6); the source modules (read-only providers); the Inbox digest pipeline (Habits emits to it, never pushes directly).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc — reading another user's habit detail | StreakState, HabitProgress, ritual history | authZ on every cross-user request keyed on **server-side session identity**, never a client-supplied `profileId`/`memberId` (platform §5) | Yes (UI filtering alone does NOT satisfy) |
  | Over-exposure to Social — leaking financial detail through the circle | ritual money pass-throughs, account/merchant names | only the **server-computed projection** (streak count, level, %) is transmitted to Social; raw amounts/identifiers are computed-out **before** transmission (FR-SOC-001) | Yes |
  | Kid role seeing other members' finances | other members' data | kid role sees only own habits/goals; **no profile switcher** rendered; enforced by `MemberScope` + RLS | Yes |
  | Streak/XP forgery (client asserts an advance) | StreakState, HabitProgress | advances accepted **only** from a verified consumed `source_event_id`; XP derived server-side from event/streak facts, never client-supplied | Yes |
  | Replay / double-award | StreakState, XP | idempotency on `source_event_id` (UNIQUE); compensation on reversal (FR-X-003) | Yes |
  | PII / behavioral leak in logs | ritual history, qualifying events | structured logs redact PII + any pass-through monetary values; append-only audit trail kept separate (FR-X-014) | Yes |
  | Email-sourced ritual enrichment outliving consent | Inbox-derived ritual items | obey the umbrella email-revocation cascade (FR-X-013) and dormant-account retention bound (FR-X-019) | Yes |

- **AuthZ enforcement**: Every cross-user / cross-profile read of habit data is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted. Denied cross-user access is **audited** (SC-015 pattern).
- **Data minimization, retention & revocation**: Habits stores only engagement state and event *references*, never copies of financial amounts or account identifiers. Ritual items derived solely from an email source obey the email-revocation cascade (FR-X-013); dormant-account state obeys the retention bound + crypto-shred mechanism (FR-X-019, platform §5).
- **Data residency**: All habit data inherits the Canadian-region residency constraint (FR-X-020); no habit-derived signal is processed outside Canada without disclosure.

### UI / UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab**: "Habits / Habitudes" (UX §5.1 label list), added in the P3 phase; shown in the tab bar / "More" list per priority order. Not shown if the game layer is disabled *and* the user has no ritual configured (no empty placeholder tabs — UX §5.1).
- **Key screens**:
  1. **Habits Home** — streaks/XP/level/badges grid (game layer on) following the Module Screen Anatomy (UX §5.2). Each streak/badge is a focusable unit with a localized SR label.
  2. **Daily Ritual** — a stepped sequence of `RitualItem`s; each item that implies a money action presents the **owning module's Confirm-Action sheet** (UX §4.2, §2.2), never a Habits-owned executor. Each item carries a **Freshness chip** (UX §4.3).
  3. **Game-layer Settings** — opt-in toggle (FR-HAB-001 disable-able), cadence, grace window.
- **Components used**: **Freshness chip** on every ritual item and any pass-through value (UX §4.3); **Confirm-Action sheet** — *delegated to the source module* for money items (UX §4.2); **Conflict banner** when a ritual item conflicts with Cash Safety `SafeToActSignal` (UX §3.1, §4.4 — Cash Safety precedence); **Partial Data Banner** when only some source modules are connected (UX §3 Partial). A streak/badge is **not** a Recommendation Card (it is not advice); but any *nudge* ("approve this roundup to keep your streak") that surfaces a money action MUST surface that action through the source module's Recommendation Card + Confirm-Action sheet — Habits adds the streak context, not a competing executor.
- **Six-state matrix (UX §3)** applied to the **Daily Ritual** view and the **Streaks** view:
  - **Empty**: first-run — explains the ritual/game layer + connect CTA; "all clear" positive empty when no live items (US2 AS4). Never zero-filled streaks.
  - **Loading**: skeleton of the ritual list / streak grid (no lone spinner).
  - **Partial**: some source modules connected — Partial Data Banner; ritual runs on the connected subset.
  - **Stale**: a source section past threshold — stale chip on that section; the section's money item withholds per its source's rule; the rest of the ritual proceeds.
  - **Error/Degraded**: a source feed down — Unavailable chip, non-alarming message, last-known timestamp; never fabricate items.
  - **Withheld**: a ritual money item whose **source** money input is stale/missing — the source's Withheld Card is surfaced; Habits never guesses a money value.
- **Locale & a11y (UX §4, §7, §8)**: all habit names, ritual labels, badges, and nudges are EN/FR with localized SR labels; any pass-through CAD value renders via `@finos/format` for the active locale (fr-CA `1 234,56 $`); reduced-motion replaces streak-celebration animation with a fade; tap targets ≥ 44×44 pt; dark-mode token variants for any new tokens.
- **Notification restraint (UX §6)**: streak/ritual nudges are **emitted to the Inbox digest pipeline** with `module_id`, `event_type`, `priority_tier` (Informational for streaks; Important only for a time-sensitive ritual item like a bill due tomorrow), and bilingual payload — Habits **never** sends a standalone push (SC-009).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-H-001 (Real-action integrity)**: 100% of streak/XP advances are traceable to a verified consumed `source_event_id` for a completed, non-reversed real financial action; 0 advances from app-opens, views, or un-confirmed proposals (FR-HAB-001).
- **SC-H-002 (Idempotency)**: 0 double-counts across redelivered/retried source events and re-submitted ritual completions; every advance is exactly-once in effect, keyed on the source event id (umbrella Acceptance Scenario 4).
- **SC-H-003 (Compensation correctness)**: 100% of reversed/voided source actions compensate the exact streak/XP they produced; 0 streaks reflect an action that did not hold.
- **SC-H-004 (Disable-ability)**: With the game layer disabled, 100% of real financial micro-actions (incl. the daily ritual) remain fully functional and 0 game UI elements render (FR-HAB-001; umbrella Acceptance Scenario 3).
- **SC-H-005 (Live ritual)**: 100% of ritual items are live items sourced from `BillCalendar` / `RoundupProposals` / `NotificationDigest`; 0 fabricated or zero-filled items; a stale/unavailable section is flagged/withheld, never shown as fresh (FR-HAB-002, FR-X-008).
- **SC-H-006 (Recommend-only)**: 0 money-movement endpoints in the Habits surface; 100% of ritual money actions route through the owning module's Confirm-Action sheet (FR-X-003, SC-007).
- **SC-H-007 (No money math)**: 0 monetary values computed/converted/rounded by this module; 100% of displayed CAD figures are unmodified source pass-throughs formatted via `@finos/format` (Money Correctness scope).
- **SC-H-008 (Cross-user safety)**: 0 cross-user habit-data exposures in API-layer authZ testing; Social receives only the server-computed projection (no raw amounts/identifiers); every denied cross-user access is audited (FR-SOC-001, SC-015 pattern).
- **SC-H-009 (Bilingual parity & locale)**: 0 single-language leaks in shipped Habits strings; 100% of pass-through CAD/percent/date values use the active locale's conventions (FR-X-005, SC-008).
- **SC-H-010 (Contract reliability)**: 100% of consumed/provided contracts have passing consumer + provider tests in CI before release; a breaking change in a consumed contract disables the dependent ritual section rather than serving on a mismatched schema (FR-X-011, SC-012).
- **SC-H-011 (Notification restraint)**: 0 standalone pushes from Habits; 100% of streak/ritual nudges are emitted to the Inbox digest pipeline within the daily budget (SC-009).

## Assumptions

- **Source-module availability**: Bills, Cash Safety (Module 3), Inbox (Module 10), and Tasks (Module 7) expose versioned, freshness-stamped completion/state contracts (`BillCalendar`, `RoundupProposals`, `NotificationDigest`, `TaskCompletionEvents`). At MVP some may not be shipped; each ritual section is wired behind a feature/availability check and the ritual degrades gracefully (runs on available sections), mirroring how Rewards feature-checks `SafeToActSignal`.
- **Contract maturity**: `RoundupProposals`, `BillCalendar`, `NotificationDigest`, and `TaskCompletionEvents` schemas may not yet be ratified by their owning modules; this spec consumes them at **min version 1.0.0** and pins exact versions in consumer contract tests once published (see [contracts/consumed/README.md](./contracts/consumed/README.md)). Until a provider exists, the dependent ritual section is disabled — never stubbed with fabricated data.
- **No money origination**: Confirmed module-wide — Habits computes no money; every CAD figure is a source pass-through. This removes any money-rounding/FX obligation from this module (the obligation lives in the source modules).
- **Game layer is opt-in and non-load-bearing**: Per FR-HAB-001, no financial task ever depends on the game layer being enabled.
- **Social is P4**: `HabitProgress`/`StreakState` are *provided* now (versioned contracts) but their cross-user consumption is realized when Social (Module 14/P4) ships; the projection-only constraint (FR-SOC-001) is fixed now regardless.
- **Cadence/grace/XP constants**: The local-day boundary + 6-hour grace and the XP constants are MVP defaults (Clarifications), user-adjustable later; the integrity rules (real-action-only, idempotent, compensable, no-money-input) are fixed.
- **Not regulated advice**: Habits surfaces engagement nudges and bundles others' recommendations; it offers no financial advice of its own (Constitution "not regulated advice").

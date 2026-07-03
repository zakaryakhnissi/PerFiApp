# Quickstart & Validation: Module 9 — Focus & Mental Health

**Feature**: `011-module-9-focus` | **Date**: 2026-06-29

A run/validation guide proving Focus works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Consumed contract clients available (or stubbed) exposing `BillCalendar` (Module 4), `RunwayForecast` (Module 3), `GoalState` and `CreditState` (Module 0). `SafeToActSignal` (Module 3) optional — its consumer is feature-checked for spend-precedence.
- Action sinks available (or stubbed): Tasks (Module 7) accepts a `create_task` request; the Spine accepts a `create_goal` request. Until Tasks ships, a confirmed `create_task` may target a Spine goal or be queued (research OI-5).
- Seeded fixtures: a `BillCalendar` with one overdue bill (carrying an at-risk amount in cents), a behind-pace `GoalState` goal, a `RunwayForecast` (one fresh, one stale variant), a `CreditState` with one hard-avoid-band card, plus the bilingual crisis-resource and stress-pack/wind-down static datasets.
- Toolchain per the ratified platform plan ([plan.md](./plan.md) Technical Context; [platform-decisions.md](../_platform/platform-decisions.md)). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:focus-fixtures      # bill (overdue), goal (behind), runway (fresh+stale), credit (hard-avoid), content datasets
```

## Validation by user story

### US1 — Money-Stress Pack pairs support with a concrete linked action (P3) 🎯 Independent Test

```bash
<pkg> test focus/unit/stress-pack-action
<pkg> test focus/integration/stress-pack
```

Expected:
- A stress pack about the overdue bill presents short support content **and** produces **exactly one** `WellbeingAction` linked by typed reference (`bill:{bill_id}`) to that bill — never a free-text-only "action" (SC-F-001).
- The `WellbeingAction` is recommend-only: nothing is created until the user confirms via a Confirm-Action sheet; on confirmation a `create_task` request is dispatched to Tasks and an append-only `AuditEvent` (`wellbeing_action_confirmed`) is written (SC-F-004).
- **Idempotency fixture (mandatory)**: re-running the same session / re-submitting the confirmation for the same `(stressor_entity_ref, session_id)` creates **at most one** task — zero duplicates (SC-F-003).
- **Stale-money fixture (mandatory)**: with a stale `RunwayForecast` (multi-day-old balance), the pack does **not** assert the runway figure as current — `money_input_state = stale_withheld`, `money_figure_cents = null`, `action_type = refresh_data` (a non-money concrete action), and support is still offered (SC-F-005).
- **Locale fixture (mandatory)**: a consumed at-risk amount renders `1 234,56 $` for fr-CA and `$1,234.56` for en-CA **from the same provider cents** via `@finos/format`; all session/support/action content shows in French with no single-language leak (SC-F-006).

### US2 — Evening Wind-Down converts worries into tasks/goals before calming (P3)

```bash
<pkg> test focus/unit/wind-down-order
<pkg> test focus/integration/wind-down
```

Expected:
- With ≥1 open money worry, the worry-capture step is presented **before** the guided wind-down begins (SC-F-002).
- Confirming a worry converts it into a `WellbeingAction` (task/goal) linked to its entity via Confirm-Action; the captured worry is marked resolved-to-action.
- Explicitly **skipping** the capture step still proceeds to the guided wind-down (offered, never forced) and records the skip so the worry is re-offered next session — not silently dropped.
- A worry already converted to a still-open task/goal is shown as **already-captured** (with a link to the existing item) and is **not** offered as a new conversion — no duplicate (SC-F-003).
- With **no** open worries, the capture step shows a calm "nothing outstanding" Empty state and proceeds directly — never a zero-filled or alarming view.

### US3 — Stressor inbox: prioritized by safety (P3)

```bash
<pkg> test focus/unit/stressor-precedence
<pkg> test focus/integration/stressor-list
```

Expected:
- With multiple stressor types present, the list is ordered by the documented safety-first precedence: **(1) Cash Safety / runway → (2) Credit hard-avoid → (3) Budget/Bills → (4) behind-pace Goals** (ux-foundations §10.4); each item carries a freshness chip.
- A stressor whose source feed is **stale** shows a stale chip and its money figure is flagged/withheld — never presented as live.
- A stressor source that is entirely **unavailable** (feed down or module not yet shipped) contributes **no** stressors (Unavailable state for that source) — the list never fabricates a stressor and never blocks on the missing source.

## Contract tests (mandatory — Principle VII / SC-F-010)

```bash
<pkg> test focus/contract/consumed   # BillCalendar, RunwayForecast, GoalState, CreditState (+ SafeToActSignal feature-checked)
<pkg> test focus/contract/provided   # WellbeingAction (finos:focus/WellbeingAction/1.0.0)
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken consumed schema **fails CI** and **disables that stressor source** (version-skew behavior) while the rest of Focus degrades gracefully.

## Cross-cutting checks

- **Recommend-only (FR-FOC-004 / FR-X-003)**: grep the Focus API surface — there is **no** money-movement endpoint and **no** path that creates a task/goal without explicit user confirmation; every action is a recommendation or a user-confirmed, idempotent state write.
- **Well-being privacy (SC-F-007 / FR-FOC-005)**: API-layer authorization tests (not UI) prove **0** cross-member exposures of `FocusSession`/`WellbeingAction`/stressor data; well-being content is excluded from every cross-member view regardless of `MemberScope`; the household profile switcher does not expose another member's Focus content; every denied access is audited.
- **Data minimization (SC-F-008)**: schema inspection confirms **0** free-text distress fields persisted; only structured session metadata + entity references are stored; well-being records honor the 7-day deletion cascade and the dormant-retention bound.
- **Audit trail (Principle VI / FR-X-007)**: `session_started`, `session_completed`, `wellbeing_action_proposed`, `wellbeing_action_confirmed`, `worry_skipped` produce append-only `AuditEvent`s, kept separate from debug logs; `wellbeing_action_confirmed` writes are idempotent (keyed on the idempotency key).
- **Redaction (FR-X-014)**: debug logs contain no PII, no monetary values, and **no well-being signals**.
- **Crisis signpost (FR-FOC-005)**: the crisis panel is a static, localized resource view — no data entry, no transmission, no escalation path exists.
- **Notification discipline (ux-foundations §6)**: any wind-down reminder is submitted to the Inbox digest pipeline as a low-priority/Informational item with **no** distress detail — Focus calls no push API directly.
- **Performance (SC-010)**: module-switch into Focus renders the cached, freshness-stamped stressor list in ≤ 300 ms; cache miss/stale renders a flagged/withheld state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA; bilingual screen-reader labels on the Recommendation Card, Why toggle, freshness chip, and Confirm-Action CTA; reduced-motion honored on wind-down/skeleton animations; tap targets ≥ 44 × 44 pt.

## Done when

All three user-story validations pass, the mandatory idempotency / stale-money / locale fixtures hold (zero duplicate tasks, zero stale-money-shown-as-fresh, correct fr-CA `1 234,56 $`), all consumer + provider contract tests are green, and the cross-cutting checks (recommend-only, well-being privacy, data minimization, audit, redaction, crisis signpost) hold.

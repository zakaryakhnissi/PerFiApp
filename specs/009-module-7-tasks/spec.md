# Feature Specification: Module 7 — Tasks & To-Dos

**Feature Branch**: `009-module-7-tasks`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 7 — Tasks & To-Dos (Priority: P3)"; functional requirements FR-TASK-001..003 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Structured to match the gold-standard exemplar [specs/002-module-1-rewards](../002-module-1-rewards/).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Tasks & To-Dos** tab only. Module 0 (Financial Core & Data Spine) is a hard dependency: this module **consumes** spine contracts (`GoalState`, `MerchantGraph`, `CashFlowForecast`) and does not re-implement aggregation, budgeting, scheduling, or billing. It also consumes other product modules' contracts (`BillCalendar` from Bills, `PaymentSchedule` from Pay) where present. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Tasks behavior.
>
> **Why P3 / Simplicity (Constitution IX)**: Tasks is a **connective convenience layer**, not a foundational money engine. The analysis here is thorough, but the feature set is deliberately lean: a money-aware to-do list with live links to the entities behind each task, completion that updates the linked entity's status idempotently, and scheduling that respects paydays and due dates. It does **not** introduce a new money source, a new recommendation engine, or any money movement. Where it touches money, it **reads** spine/other-module values for display and scheduling — it never originates a money figure.

## User Scenarios & Testing *(mandatory)*

Tasks turns financial concerns into to-dos linked to the data behind them — a bill, merchant, budget, or goal — and schedules them around paydays and due dates so that completing a task **actually updates financial status** (e.g. a bill marked handled). The differentiator versus a generic to-do app is the **live link**: a Tasks item is never a dead string of text; it is bound to a real spine/module entity, and its completion propagates an idempotent, audited status update to the originating module.

### User Story 1 - Money-aware tasks with live links (Priority: P1)

A user creates a task linked to a specific financial entity — a bill, merchant, budget line, goal, or another module's actionable item — and the task carries a **live link** to that entity: it shows the entity's current state (amount, due date, freshness) and stays in sync as that state changes.

**Why this priority**: It is the defining capability of the module and the prerequisite for everything else. A plain unlinked checklist delivers no FinOS value; the live link is what makes a task "money-aware." It is independently valuable even before scheduling or status write-back exist.

**Independent Test**: Create a task from a bill (or goal), open the task, and confirm it displays the linked entity's current amount/due-date with a freshness stamp, and that the displayed values update when the underlying contract changes — without the task storing its own private copy of the money figure.

**Acceptance Scenarios**:

1. **Given** a bill or goal, **When** a task is created from it, **Then** the task carries a live link (entity type + id + source contract version) to that entity. *(FR-TASK-001)*
2. **Given** a linked task, **When** the linked entity's contract value changes (e.g. the bill amount or goal target updates), **Then** the task reflects the **current** value on next read — it does not display a stale private copy of the money figure. *(FR-TASK-001, FR-X-001)*
3. **Given** a linked entity value sourced from an external feed, **When** the task displays that value, **Then** it carries the entity's `FreshnessStamp`; a stale **money** value is flagged/withheld rather than shown as current. *(FR-X-008)*
4. **Given** an fr-CA user, **When** a task shows a linked monetary value or due date, **Then** it is formatted `1 234,56 $` / `28 juin 2026`, not `$1,234.56` / `June 28, 2026`. *(FR-X-005, SC-008)*
5. **Given** a user creates a free-text task with no financial link, **When** it is saved, **Then** it is allowed as an ordinary unlinked to-do (no money-aware behavior, no status write-back) — the module degrades to a plain checklist item gracefully.

---

### User Story 2 - Completion updates the linked entity's status (idempotently & audited) (Priority: P1)

When a money-aware task is checked off, the **linked entity's status is updated** in its owning module (e.g. a bill is marked handled, a goal contribution acknowledged) — exactly once, recorded in the append-only audit trail, and safe to retry.

**Why this priority**: This is the second half of the core value proposition: closing the loop so that completing a task is not cosmetic but actually changes financial state. It is the highest-risk behavior in the module (it writes status across a module boundary) and therefore must be idempotent and audited from day one (Constitution IV/VI).

**Independent Test**: Mark a bill-linked task complete and confirm the bill's status updates to handled (via the owning module's contract, not a direct write); then re-deliver the same completion event (simulating a retry) and confirm the status update and the audit event each occur **at most once**.

**Acceptance Scenarios**:

1. **Given** a money-aware task linked to a bill, **When** it is checked off, **Then** the linked bill's status updates (e.g. marked handled) through the owning module's contract, and an append-only audit event is recorded. *(FR-TASK-002, FR-X-007)*
2. **Given** a money-aware task already marked complete, **When** a duplicate completion event arrives (e.g. a network retry), **Then** the linked entity's status is updated **at most once** and no duplicate side-effect or audit event is produced — keyed on the source completion event id. *(FR-TASK-002, FR-X-003; umbrella Acceptance Scenario 4)*
3. **Given** a task whose completion would imply a money action with downstream financial consequence (e.g. "pay this bill"), **When** the user checks it off, **Then** Tasks **records the task as done** but does **not** move money — any money action routes through the owning module's Confirm-Action flow; Tasks is recommend/record-only. *(FR-X-003, Constitution IV)*
4. **Given** a completion whose status write-back to the owning module fails or times out, **When** the failure is detected, **Then** the task records a **pending-sync** state, the write-back is retried with backoff, and the task is not silently shown as fully reconciled until the owning module confirms. *(FR-X-012)*
5. **Given** `SafeToActSignal` (Cash Safety) flags overdraft risk for a task that proposes spending, **When** the task is surfaced or completed, **Then** Cash Safety takes precedence: the spend-implying completion is held/flagged and the conflict + resolution are surfaced; the non-money "mark done" still works. *(umbrella cross-module precedence; UX Conflict Banner)*

---

### User Story 3 - Smart scheduling around paydays & due dates (Priority: P2)

The user's tasks are distributed across suitable days, factoring **paydays** and **bill due dates** so that money-aware tasks land when the user can actually act on them (e.g. a "pay rent" task is scheduled after the next payday and before the predicted-unsafe window).

**Why this priority**: High convenience value and the second submodule (Smart Scheduling), but US1+US2 already deliver an independently shippable money-aware task list. Scheduling consumes `CashFlowForecast` (paydays / runway) and `BillCalendar`/`PaymentSchedule` (due dates), so it depends on those contracts being present — making it appropriately P2.

**Independent Test**: With several tasks and a known next payday (from `CashFlowForecast`) and bill due dates (from `BillCalendar`), run scheduling and confirm money-aware tasks are placed on suitable days — pay-implying tasks after the next inflow and before the predicted-shortfall date — and that the schedule degrades gracefully (no scheduling, tasks left manual) when the inputs are stale/absent rather than guessing a date.

**Acceptance Scenarios**:

1. **Given** several tasks and known paydays/due dates, **When** scheduling runs, **Then** tasks are distributed to suitable days factoring paydays and bill dates. *(FR-TASK-003; umbrella Acceptance Scenario 3)*
2. **Given** a pay-implying task and a `CashFlowForecast` showing a predicted shortfall before the next payday, **When** scheduling runs, **Then** the task is placed **after** the next projected inflow and **before** the predicted-shortfall window where possible, with the reasoning shown (which payday / which due date drove the placement). *(FR-X-006)*
3. **Given** `CashFlowForecast` is **stale or absent** (a freshness-stamped money input that drives payday/runway), **When** scheduling is requested, **Then** payday-aware placement is **withheld** and tasks fall back to their own due date (or remain unscheduled) — scheduling never guesses a payday/runway from stale data. *(FR-X-008, Constitution VI)*
4. **Given** a bill due date is missing or its source contract is unavailable, **When** scheduling runs, **Then** the task is scheduled on a best-effort basis from any present inputs and the gap is surfaced (Partial state) — it is not dropped silently.
5. **Given** the user manually reschedules a task, **When** scheduling re-runs, **Then** the user's manual placement is respected (not overwritten) unless the user opts back into auto-scheduling.

---

### Edge Cases

- **Empty / no connectivity**: With no accounts connected and no other-module data, the Tasks tab shows the **Empty** first-run state (illustration + "Add a task" / "Connect an account to link tasks"), never zero-filled or fabricated linked values. A purely manual unlinked task list still works offline.
- **Partial connectivity**: When some source modules are connected but not all (e.g. Bills present, Pay absent), money-aware tasks compute on the known subset; tasks whose links require an absent module show an **Incomplete data** chip and the **Partial Data Banner** names the gap; scheduling proceeds best-effort on present inputs.
- **Stale / missing money inputs**: A linked **money** value (bill amount, goal target/contribution, runway/payday) that is past its freshness threshold is **flagged or withheld**, never shown as current; scheduling that depends on a stale `CashFlowForecast` withholds payday-aware placement (US3 AS-3). Tasks never originates a money figure, so there is no documented-default money path here.
- **Conflicting advice (Cash Safety precedence)**: When a task proposes spending but `SafeToActSignal` flags overdraft risk, **Cash Safety takes precedence** (umbrella precedence rule, UX §10.4): the spend-implying action is held, the **Conflict Banner** names both signals and the resolution, and the plain "mark done" remains available. Tasks never overrides a safety signal.
- **Multi-currency**: A linked entity carrying a non-CAD amount (e.g. a foreign bill or a foreign-program goal) is displayed in CAD via the owning contract's timestamped FX conversion; a stale FX-converted figure is flagged. Tasks does not perform its own FX math — it displays the owning module's already-converted CAD value (Money Correctness §).
- **Idempotency / retries**: Completion events are keyed on a `source_event_id` with a `UNIQUE` constraint; a replayed completion updates the linked entity and writes an audit event **at most once** (US2 AS-2). Status write-back to the owning module is itself idempotent and retried with backoff on failure (US2 AS-4).
- **Cross-user / multi-profile boundaries**: In a Household, a request to read or complete another profile's task is authorized **server-side against the session identity** and the Household `MemberScope` — never a client-supplied `profileId`. A denied cross-profile access is **audited** (see Threat Model). A kid-role profile sees only its own tasks; no profile switcher.
- **Orphaned / deleted linked entity**: If a task's linked entity is deleted or its source contract is removed (e.g. a bill is removed, or the program is disconnected), the task transitions to an **orphaned-link** state — it is preserved as an unlinked to-do with a "link no longer available" note rather than silently deleted or left pointing at a dead reference. Completing an orphaned-link task performs **no** status write-back.
- **Contract version skew**: A breaking change in a consumed contract (`GoalState`, `BillCalendar`, etc.) without a consumer migration **disables** the dependent link/scheduling behavior (consumer contract test fails in CI) rather than reading/writing on a mismatched schema; the task degrades to an unlinked item until the consumer migrates (umbrella edge case, SC-012).
- **Forward-declared dependencies (Bills/Pay not yet shipped)**: `BillCalendar` (Module 4) and `PaymentSchedule` (Module 5) are **P2 modules not yet authored**; their consumer clients are wired **behind a feature check**. Until those provider contracts are ratified, bill-/payment-linked tasks and payday-vs-due-date scheduling degrade gracefully (link unavailable / best-effort scheduling), exactly as Rewards wired `SafeToActSignal` ahead of Cash Safety. See [contracts/consumed/README.md](./contracts/consumed/README.md).
- **Bilingual integrity**: A task surfaced to the user with a label, status, or scheduling-reason string missing an EN or FR translation is a defect, not silently shown in one language. (User-authored free-text task titles are displayed verbatim and are **not** translated — see Clarifications.)
- **Notification restraint**: Task reminders/nudges are submitted to the **Inbox digest pipeline** (Module 10) and never sent as standalone pushes from Tasks (UX §6; SC-009).

## Clarifications

### Session 2026-06-29

- Q: Does completing a money-aware task ever move money? → A: **No.** Tasks is record/recommend-only (FR-X-003, Constitution IV). Completion records the task as done and propagates a **status** update to the owning module; any actual money action (pay, transfer, roundup) routes through that module's Confirm-Action sheet and the user executes it.
- Q: When a money-aware task is completed but the status write-back to the owning module fails, what is the user-visible state? → A: A **pending-sync** state on the task; the write-back is retried with backoff; the task is not shown as fully reconciled until the owning module confirms (US2 AS-4). The "done" checkbox is honored locally and idempotently reconciled.
- Q: Are user-authored free-text task titles translated EN↔FR? → A: **No.** User-authored titles/notes are displayed **verbatim** (like a `GoalState.name`), not machine-translated. Only **system-generated** labels, statuses, and scheduling-reason strings must be bilingual (no single-language leaks).
- Q: What scheduling inputs drive payday-aware placement, and what happens if they are stale? → A: Paydays/runway from `CashFlowForecast` and due dates from `BillCalendar`/`PaymentSchedule`. If `CashFlowForecast` (a freshness-stamped money input) is **stale/absent**, payday-aware placement is **withheld** and the task falls back to its own due date or remains unscheduled — never a guessed payday (US3 AS-3, Constitution VI). There is no documented-default money path because Tasks originates no money figure.
- Q: Does Tasks consume `SafeToActSignal` directly, or rely on the owning module? → A: Tasks consumes `SafeToActSignal` (Cash Safety) **directly behind a feature check** so that any spend-implying task surfaces the overdraft-precedence conflict even before the owning module's flow is reached, consistent with the umbrella rule that "every module that proposes spending checks `SafeToActSignal`."
- Q: How are duplicate completion events de-duplicated? → A: By a client-generated **`source_event_id`** on the completion, persisted with a `UNIQUE` constraint; replays are no-ops for both the status write-back and the audit event (US2 AS-2; platform-decisions §4 idempotency).

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-TASK-*):

- **FR-TASK-001 (Money-aware live links)**: System MUST allow a task to be linked to a **bill, merchant, budget, or goal** (and to other modules' actionable items where a contract exists), with a **live link** — the task references the entity by type + id + source contract version and reflects the entity's **current** contract value on read, never storing a private copy of a money figure. A linked external-sourced value MUST carry the entity's `FreshnessStamp`; a stale **money** value is flagged/withheld (FR-X-008). Unlinked free-text tasks are permitted and behave as plain to-dos.
- **FR-TASK-002 (Completion updates linked status, idempotently & audited)**: System MUST update the linked entity's status in its **owning module** when a money-aware task is completed (e.g. a bill marked handled) — through that module's contract, never a direct cross-module write. The update and its append-only audit event MUST be **idempotent**, keyed on the completion `source_event_id`: a replayed completion applies the status change and writes the audit event **at most once** (FR-X-003, FR-X-007). Completion MUST NOT move money (FR-X-003); a failed write-back enters a **pending-sync** retry state (FR-X-012).
- **FR-TASK-003 (Smart scheduling around paydays & due dates)**: System MUST schedule tasks factoring **paydays** (from `CashFlowForecast`) and **bill/due dates** (from `BillCalendar`/`PaymentSchedule`), placing pay-implying tasks after the next projected inflow and before a predicted-shortfall window where possible, and attaching the scheduling reasoning (which payday / which due date) per FR-X-006. When `CashFlowForecast` is **stale/absent**, payday-aware placement MUST be **withheld** (fall back to the task's due date or leave unscheduled) — never guessed (FR-X-008, Constitution VI). A user's manual reschedule MUST be respected over auto-scheduling.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness — display/read only here), FR-X-003 (Recommend/record, never move money), FR-X-004 (CAD + time-to-goal context on linked values), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability of scheduling/links), FR-X-007 (Append-only audit trail of completions), FR-X-008 (Freshness), FR-X-010 (Least privilege & threat model — via Household multi-profile), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation of status write-back & ingestion), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), FR-X-018/SC-009 (notification restraint via Inbox digest).

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, not owned here): `GoalState`, `MerchantGraph`, `CashFlowForecast` (Module 0 spine); `BillCalendar` (Module 4 Bills, forward-declared), `PaymentSchedule` (Module 5 Pay, forward-declared), `SafeToActSignal` (Module 3 Cash Safety, forward-declared, behind feature check).

Owned/provided by this module:

- **Task**: A user to-do with title/notes (verbatim, not translated), status, scheduled date, optional priority, and an optional **TaskLink**. The core owned entity. **Provided** to Habits, Inbox, Workspace, Focus, Docs, and the originating modules.
- **TaskLink**: A live link binding a task to a financial entity — `entity_type` (bill / merchant / budget / goal / payment / module_action), `entity_id`, and the `source_contract` id+version. Drives status write-back and live-value display. Holds **no** copy of a money figure (read from the source contract).
- **TaskCompletionEvent**: An append-only, idempotent record (keyed on `source_event_id`) that a task was completed, carrying the link write-back outcome (`synced` / `pending_sync` / `no_op_orphaned`) and `Reasoning`. **Provided** to Habits (streaks/XP), Inbox, and the originating module. The source-of-truth signal that "a real financial action happened."
- **TaskSchedule**: The computed placement of a task (`scheduled_date`, `placement_source` = payday_aware / due_date / manual / unscheduled) with `Reasoning` citing the payday/due-date that drove it; freshness-stamped because it depends on `CashFlowForecast`.
- **TaskState**: The aggregate provided view of a profile's tasks + their link/sync status, freshness-stamped. **Provided** to Habits, Inbox, Workspace, and originating modules (umbrella Provides list).

### Money Correctness *(MANDATORY — this feature touches monetary values)*

> Tasks **reads and displays** monetary values from other modules' contracts and **never originates, computes, or moves** a money figure. There is no valuation, FX, interest, or rounding math owned by this module. The correctness obligations below therefore concern (a) faithful pass-through of exact money values and (b) idempotent state writes.

- **Numeric representation**: Any money value a task displays is read from a consumed contract as **integer minor units (cents)** for amounts and **decimal strings** for rates/multipliers (per `finos:common/MoneyCents/1.0.0`). Tasks MUST NOT coerce these to binary float, sum them, or re-round them. No `float`/`double`/`real` in any task field or display path (platform-decisions §4; enforced by the no-float lint + DB schema-lint gate).
- **Rounding rules**: None owned here — Tasks performs **no** monetary arithmetic. It renders the owning module's already-rounded CAD cents via `@finos/format` for the active locale (fr-CA `1 234,56 $`). If a linked value would require arithmetic (e.g. summing several linked bills), that sum MUST be requested from the owning module's contract, not computed in Tasks.
- **Currency & locale**: CAD throughout, with time-to-goal context where a task links to a `GoalState` goal (FR-X-004); en-CA and fr-CA locale-correct formatting (fr-CA `1 234,56 $`, `28 juin 2026`). Foreign amounts are displayed only after the owning contract's timestamped FX conversion to CAD; a stale conversion is flagged.
- **Determinism & fixtures**: Scheduling placement is pure and deterministic given its inputs (tasks, paydays, due dates) — the same inputs always yield the same schedule. Mandatory fixtures: (a) a **pass-through fixture** proving a linked bill amount of `123456` cents renders exactly `$1,234.56` (en-CA) / `1 234,56 $` (fr-CA) with no float drift; (b) a **stale-input fixture** proving payday-aware scheduling withholds when `CashFlowForecast.freshness.is_stale = true`; (c) a deterministic placement fixture (fixed tasks + payday + due date → fixed schedule).
- **Idempotency** (the load-bearing money-safety property here): every state Tasks writes on the user's behalf — completion records, status write-backs, schedule writes — MUST be **idempotent and safe to retry**, keyed on the `source_event_id` with a `UNIQUE` constraint. A replayed completion MUST NOT double-update a linked entity, double-advance a downstream streak, or write a duplicate audit event (FR-TASK-002, US2 AS-2, platform-decisions §4). Mandatory fixture: a replayed `TaskCompletionEvent` applies exactly once.
- **Recommend/record-only**: Confirmed — Tasks records completion and propagates status; it **never** executes a payment or moves money (FR-X-003). Any money action surfaced by a task routes through the owning module's Confirm-Action sheet for explicit, per-action user execution.

### Security & Privacy Threat Model *(MANDATORY — Household multi-profile lets a member's tasks reference another person's financial data)*

> Tasks does **not** hold credentials or aggregation tokens (those live only in Module 0's KMS-backed secrets store, platform-decisions §5). The threat surface here is **cross-user authorization** in a Household: a task's `TaskLink` can reference another profile's bill/goal/payment, and task completion writes status across module boundaries.

- **Assets**: A profile's `Task` / `TaskLink` set (which reveals what bills, goals, and merchants a person is dealing with — a sensitive financial-behavior signal), `TaskCompletionEvent` history, and the cross-module status write-backs a completion triggers.
- **Trust boundaries / actors**: The owning user; other Household members under `MemberScope`; the owning modules (Bills/Pay/Goals) that accept status write-backs; the spine (read-only provider); kid-role profiles (own tasks only, no switcher).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc — reading or completing another profile's task | another profile's `Task`/`TaskLink`/completion history | authZ on every cross-profile request keyed on the **server-side session identity** + Household `MemberScope` — never a client-supplied `profileId`; denied access is audited | Yes (UI filtering alone does NOT satisfy — SC-015) |
  | Forged status write-back — a task completing against a linked entity the user does not own | another profile's bill/goal status | the status write-back authorizes against the **link owner's** scope at the owning module's contract boundary, not the requester's claim; cross-profile write-backs are denied + audited | Yes |
  | Replay / double-apply of a completion | linked entity status, downstream streaks, audit trail | idempotency key (`source_event_id`, `UNIQUE`); replays are no-ops (FR-TASK-002) | Yes |
  | Stale linked-value shown as current | a linked money value (bill amount, goal target) | the value carries the source `FreshnessStamp`; stale money flagged/withheld (FR-X-008) | Yes |
  | PII / monetary leak in logs | task titles (may contain merchant/amount hints), linked amounts | structured logs redact PII + monetary values; the append-only audit trail is kept separate (FR-X-014) | Yes |
  | Orphaned-link dangling reference after entity deletion / email-revocation purge | merchant-linked task derived from email-sourced enrichment | on source deletion the link transitions to **orphaned** (no write-back); email-sourced enrichment is purged within the 7-day window (FR-X-013) regardless of which store holds it | Yes |

- **AuthZ enforcement**: Every cross-profile read or completion of a task is enforced server-side against the requester's session identity and the Household `MemberScope`; no client-supplied identifier is trusted as the source of truth. `CircleProgress`-style exposure does not apply (Tasks provides no social projection), but any Habits/Social consumer of `TaskCompletionEvents` receives only the completion signal, never raw linked amounts.
- **Data minimization, retention & revocation**: Tasks stores only task metadata, links (id + contract ref, **not** the money value), schedule, and completion records — never balances, tokens, or copies of linked money figures. Merchant-linked enrichment derived solely from an email source is subject to the umbrella email-revocation cascade (FR-X-013) and the dormant-account retention bound (FR-X-019); on revocation the affected links orphan and the enrichment is purged.
- **Data residency**: All task data inherits the Canadian-region residency constraint (FR-X-020); no task-derived PII is processed outside Canada without disclosure and a PIPEDA accountability/transfer agreement.

## UI/UX Notes *(per [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab & label**: Tasks ships as a P3 tab (UX §5.1 label "Tasks / Tâches"), reached via the "More" overflow once >5 tabs are active. Icon + localized label; active/inactive states per §5.1.
- **Six-state matrix (UX §3)** — every Tasks data view defines all six:
  - **Empty**: first-run illustration + "Add a task" / link CTA; never zero-filled. A plain manual task list works with no connections.
  - **Loading**: skeleton task rows matching populated layout; no bare spinner; shimmer at 60 fps (reduced-motion: fade).
  - **Partial**: when some source modules are connected (e.g. Bills present, Pay absent), show the **Partial Data Banner** naming the gap; tasks needing an absent module carry the **Incomplete data** chip.
  - **Stale**: a linked external value past its threshold shows the **Stale freshness chip**; a stale **money** input withholds the dependent behavior (e.g. payday-aware scheduling → Withheld) and offers a Refresh CTA; secondary inputs flag with a "may be outdated" note.
  - **Error / Degraded**: a failed status write-back or unreachable owning module shows the **Unavailable** chip and a non-alarming "Unable to reach {module} — we'll try again", with the last-known state; never shows the linked value as if current.
  - **Withheld**: payday-aware scheduling with a missing/stale `CashFlowForecast` shows the **Withheld Card** (states what is missing + a "Refresh" CTA) — never a guessed schedule, never a greyed-out fake schedule.
- **Components**:
  - **Recommendation Card** (UX §4.1) for any surfaced suggestion (e.g. a suggested scheduled date, or "this task implies a spend — see Cash Safety"): mandatory **Why layer** listing inputs (which payday, which due date, the linked entity's freshness) + reasoning; freshness chip always visible.
  - **Confirm-Action sheet** (UX §4.2): Tasks itself moves no money, so a money action a task points to is confirmed in the **owning module's** sheet (with its disclaimer + exact CAD cents). Where a Tasks action is consequential to financial state (status write-back that marks a real obligation handled), the recap + Why layer are shown before the user confirms; the CTA is specific ("Mark rent handled" / "Marquer le loyer comme réglé"), never "OK".
  - **Freshness chip** (UX §4.3) on every linked external value (bill amount, goal target, runway-derived schedule), always visible, with localized SR labels.
  - **Conflict Banner** (UX §4.4) when a spend-implying task conflicts with `SafeToActSignal`: names both signals, states Cash Safety precedence, disables the spend-implying CTA, keeps plain "mark done" available.
- **Key screens**: (1) **Task list** (sectioned by scheduled day; each row shows linked-entity chip + freshness); (2) **Task detail** (live-linked entity state, schedule with Why, complete action); (3) **Create/link task** (pick a bill/goal/merchant/budget to link, or free-text); (4) **Schedule view** (tasks placed across days relative to paydays/due dates).
- **Locale & a11y**: all system labels/statuses/scheduling-reasons bilingual EN/FR (user titles verbatim); all money/dates via `@finos/format` (no raw formatting); WCAG 2.1 AA, ≥44×44 pt targets, localized screen-reader labels both languages, Dynamic Type + reduced-motion behaviors specified, dark-mode token variants for any new tokens.
- **Notifications**: task reminders go to the **Inbox digest** (UX §6); Tasks sends no standalone push (SC-009).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-T-001 (Live link integrity)**: 100% of money-aware tasks display the linked entity's **current** contract value (no stale private copy); a task showing a money figure it stored locally instead of reading from the source contract is a defect (FR-TASK-001, FR-X-001).
- **SC-T-002 (Status write-back correctness)**: 100% of completed money-aware tasks update the linked entity's status through the owning module's contract; 0 direct cross-module writes.
- **SC-T-003 (Idempotency)**: 0 double-applied status updates, double-counted downstream streaks, or duplicate audit events across replayed completion events in idempotency-replay tests (FR-TASK-002, SC adjacent to umbrella Acceptance Scenario 4).
- **SC-T-004 (No money movement)**: 0 task completions move money; every money action a task references routes through the owning module's Confirm-Action flow (FR-X-003, SC-007).
- **SC-T-005 (Scheduling safety)**: 0 schedules place a pay-implying task on a stale/guessed payday; when `CashFlowForecast` is stale/absent, payday-aware placement is withheld 100% of the time (FR-TASK-003, FR-X-008).
- **SC-T-006 (Freshness safety)**: 0 linked money values served past their staleness threshold without a visible stale flag (umbrella SC-006).
- **SC-T-007 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped **system** Tasks strings; 100% of displayed monetary values and dates use the active locale's conventions (umbrella SC-008). User-authored titles are exempt (displayed verbatim).
- **SC-T-008 (Explainability)**: 100% of scheduled placements and surfaced suggestions can display "why" with their inputs (which payday / due date / linked freshness) (umbrella SC-005).
- **SC-T-009 (Profile safety)**: 0 cross-profile task reads/completions in API-layer authorization testing; every denied cross-profile access is audited (umbrella SC-015).
- **SC-T-010 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release; version skew disables the dependent link/scheduling behavior rather than reading/writing on a mismatched schema (umbrella SC-012).
- **SC-T-011 (Graceful degradation)**: 100% of bill-/payment-linked behaviors degrade gracefully (link unavailable / best-effort scheduling) when Bills (Module 4) or Pay (Module 5) is not yet shipped, with no crash and no fabricated link value.

## Assumptions

- **Spine availability**: Module 0 exposes `GoalState`, `MerchantGraph`, and `CashFlowForecast` as versioned, freshness-stamped contracts (all `1.0.0`); Tasks consumes them and does not re-implement them. Until a consumed contract is available, the dependent Tasks behavior degrades (link unavailable / scheduling best-effort) rather than guessing.
- **Bills & Pay are forward dependencies**: `BillCalendar` (Module 4) and `PaymentSchedule` (Module 5) are **P2 modules not yet authored**; their contracts have no ratified provider schema at this module's authoring time. Their consumer clients are wired **behind a feature check** and bill-/payment-linked behavior degrades gracefully until they ship — mirroring how Rewards wired `SafeToActSignal` ahead of Cash Safety. The umbrella spec is the authority for their names/owners/Provides lists.
- **Cash Safety precedence**: `SafeToActSignal` (Module 3) provides the overdraft-precedence signal every spending-proposing module checks; until Cash Safety ships, spend-implying tasks still "mark done" but cannot surface the overdraft conflict — the consumer is wired behind a feature check.
- **Owning-module status write-back**: Each owning module (Bills, Pay, Goals/Spine) exposes a contract operation to accept an idempotent status update (e.g. "mark bill handled") authorized against the link owner's scope. Where a module does not yet expose such an operation, the completion records locally and enters pending-sync until the operation exists.
- **No new money source**: Tasks introduces no new external feed, no valuation, and no FX. All money values are read from owning contracts; all freshness comes from the source `FreshnessStamp`.
- **Idempotency keys**: Completion events carry a client-generated `source_event_id`; the platform's append-only audit store and `UNIQUE`-keyed idempotency (platform-decisions §4) back the at-most-once guarantee.
- **Staleness windows**: Tasks inherits per-class staleness thresholds from the source contracts' `FreshnessStamp` (set Canada-first in Module 0 research, user-adjustable); it does not define its own thresholds.
- **Not regulated advice**: Scheduling suggestions and money-aware nudges are informational decision support, not regulated financial advice (surfaced to users via the owning module's Confirm-Action disclaimer where a money action is involved).

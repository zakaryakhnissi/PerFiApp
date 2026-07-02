# Feature Specification: Module 9 — Focus & Mental Health

**Feature Branch**: `011-module-9-focus`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 9 — Focus & Mental Health (Priority: P3)"; functional requirements FR-FOC-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Gold-standard exemplar: [specs/002-module-1-rewards/](../002-module-1-rewards/).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Focus & Mental Health** tab only — the well-being layer that pairs short, structured money-stress sessions with concrete actions, and runs an evening wind-down that converts outstanding money worries into tasks/goals first. Module 0 (Spine), Module 3 (Cash Safety), and Module 4 (Bills) are upstream dependencies: this module **consumes** their contracts to *identify stressors* and does **not** re-implement runway, budgeting, credit ingestion, or bill detection. It **provides** `WellbeingActions` (proposed tasks/goals) to Tasks (Module 7) and Workspace (Module 13). Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Focus behavior.
>
> **Boundary with Module 7 (Tasks) and the Spine (Goals)**: Focus **identifies** worries and **proposes** an actionable task or goal as a `WellbeingAction`; it does **not** own task scheduling, task lifecycle, or goal computation. The actual task is created/owned by Tasks; the actual goal is created/owned by the Spine. Focus holds only the *link* between a stressor and the wellbeing-proposed action plus the session record. A `WellbeingAction` is a recommend-only proposal: nothing is created until the user confirms.
>
> **Boundary with Module 8 (Habits) and Module 10 (Inbox)**: Focus is not a streak/XP engine (Habits) and does not send push notifications (Inbox owns notification discipline; Focus emits at most digest events). Wind-down reminders, if any, are submitted to the Inbox digest pipeline — Focus never pushes directly.
>
> **Not clinical care**: Focus provides supportive, non-clinical, informational well-being content tied to the user's real money situation. It is **not** therapy, diagnosis, or crisis intervention, and it is not regulated financial advice. A crisis-resource signpost is shown but Focus does not provide crisis counselling (see Edge Cases & Clarifications).

## User Scenarios & Testing *(mandatory)*

Focus is a P3 differentiated well-being layer. Its core promise: money stress is never left as a vague feeling — every session ends in a concrete, linked action against the *actual* entity causing stress (an overdue bill, a tight runway, a behind-pace goal, a high-utilization card), and the evening sequence clears worries into tasks/goals *before* it tries to calm the user. It computes no new money figures; it reads stressors the spine and downstream modules already own and turns them into supported action.

### User Story 1 - Money-Stress Pack pairs support with a concrete linked action (Priority: P3)

A user feeling money stress starts a short, structured session (a "pack") about a specific stressor. The pack offers brief emotional-support content **and** ends by proposing one concrete action linked to the underlying entity (e.g. "Set a reminder to pay the {Hydro} bill due {date}" linked to that `BillCalendar` item).

**Why this priority**: This is the module's flagship behavior and its umbrella Independent Test. It delivers standalone value with only one stressor source connected, and it is the clearest expression of FR-FOC-001 (every session pairs support with a concrete linked action). It is P3 because it depends on Bills/Cash Safety/Goals existing to source real stressors.

**Independent Test**: With at least one stressor source connected (e.g. a `BillCalendar` with an overdue bill), start a stress pack about that bill and confirm the session both presents short support content **and** produces exactly one `WellbeingAction` linked to that specific bill, recommend-only, with bilingual reasoning and a freshness stamp.

**Acceptance Scenarios**:

1. **Given** an identified stressor (an overdue/soon-due bill, a tight runway, a behind-pace goal, or a hard-avoid-band card), **When** a stress pack runs, **Then** it presents a short support session **and** generates exactly one concrete `WellbeingAction` linked by reference to that underlying entity.
2. **Given** the proposed `WellbeingAction`, **When** the user confirms it through a Confirm-Action sheet, **Then** a task/goal-creation request is dispatched to Tasks/Spine (recommend-only — Focus never creates the task silently) and the confirmation is recorded in the append-only audit trail.
3. **Given** a stress pack that already created a linked action for a stressor, **When** the same session is re-run or the confirmation is re-submitted (e.g. a network retry), **Then** a duplicate task/goal is **not** created for that stressor (idempotent, keyed on the stressor reference + session id).
4. **Given** a stressor whose underlying money input is **stale or missing** (e.g. `RunwayForecast` computed on a multi-day-old balance), **When** the pack would cite a money figure (at-risk amount, runway days), **Then** that figure is flagged/withheld and the session still offers support and a *non-money* concrete action (e.g. "refresh your balance") rather than asserting a stale money figure as current.
5. **Given** an fr-CA user, **When** a stressor's monetary context is shown (e.g. at-risk amount on a bill), **Then** it is formatted `1 234,56 $` (comma decimal, space thousands, trailing symbol), and all session/support content and the action label are shown in French with no single-language leak.

---

### User Story 2 - Evening Wind-Down converts worries into tasks/goals before calming (Priority: P3)

In the evening Sleep & Wind-Down sequence, before the guided calming portion begins, the system surfaces the user's outstanding money worries (open stressors) and converts each — with the user's confirmation — into a task or goal, so the user goes into wind-down with worries captured rather than circling.

**Why this priority**: Realizes FR-FOC-002 directly and is the second submodule (Sleep & Wind-Down). It is independently testable and valuable once US1's stressor-identification exists, so it sits at the same P3 priority but is sequenced after US1's action-creation machinery is in place.

**Independent Test**: Trigger the evening wind-down with at least one open money worry; confirm that the worry-capture step is presented **before** the guided wind-down, that confirming a worry dispatches a `WellbeingAction` (task/goal) linked to its entity, and that the guided wind-down only begins after the capture step is completed or explicitly skipped.

**Acceptance Scenarios**:

1. **Given** the evening wind-down and one or more open money worries, **When** it runs, **Then** the worry-capture step is presented **before** the guided wind-down begins.
2. **Given** the worry-capture step, **When** the user confirms a worry, **Then** it is converted into a `WellbeingAction` (task/goal) linked to its underlying entity (recommend-only, via Confirm-Action), and the captured worry is marked resolved-to-action.
3. **Given** the user explicitly skips the capture step, **When** they skip, **Then** the guided wind-down still proceeds (capture is offered, never forced), and the skip is recorded so the same worry is re-offered next session rather than silently dropped.
4. **Given** a worry already converted to a task/goal in a prior session that is still open, **When** the next wind-down runs, **Then** that worry is shown as *already captured* (with a link to the existing task/goal) and is **not** offered as a new conversion (idempotent — no duplicate task/goal).
5. **Given** no open money worries (all clear), **When** wind-down runs, **Then** the capture step shows a calm "nothing outstanding" state (Empty state) and proceeds directly to the guided wind-down — never a zero-filled or alarming view.

---

### User Story 3 - Stressor inbox: see what's weighing on you, prioritized by safety (Priority: P3)

The user opens Focus and sees a prioritized list of their current money stressors (open worries) sourced from real data — overdraft/runway risk first, then credit hard-avoid, then bills, then behind-pace goals — each with a one-tap path into a relevant stress pack or a direct action.

**Why this priority**: Lowest of the three Focus stories. It is a convenience surface that aggregates what US1/US2 already identify; the module is fully valuable without it for MVP, but it makes stressor identification visible and is the natural Focus tab landing view. Kept lean per Principle IX.

**Independent Test**: With multiple stressor types present, open Focus and confirm the stressor list is ordered by the documented safety-first precedence (Cash Safety/runway → Credit hard-avoid → Budget/Bills → Goals), each item carries a freshness chip, and each offers a path to a pack or action.

**Acceptance Scenarios**:

1. **Given** multiple open stressors across sources, **When** the Focus tab opens, **Then** they are listed in the documented precedence order (runway/Cash-Safety first), each carrying a freshness chip.
2. **Given** a stressor whose source feed is stale, **When** the list renders, **Then** that item shows a stale chip and any money figure is flagged/withheld rather than presented as live.
3. **Given** a stressor source is entirely unavailable (e.g. Cash Safety not yet shipped, or feed down), **When** the list renders, **Then** that source's stressors are simply absent (Unavailable state for that source) — the list never fabricates a stressor and never blocks on the missing source.

---

### Edge Cases

- **Empty / no connectivity**: With no accounts connected and no stressor sources available, the Focus tab shows the first-run Empty state explaining what Focus does — never zero-filled "0 worries" framed as data. A user may still start a *generic* (non-data-linked) support session, but no `WellbeingAction` linked to a money entity is fabricated when there is no entity.
- **Partial connectivity**: With some sources connected (e.g. Bills but not Cash Safety), stressors are computed from the connected subset; the stressor list and any wind-down capture show the Partial Data Banner and an "Incomplete picture" chip; absent-source stressors are simply not shown (not guessed).
- **Stale / missing money inputs (Fresh or Flagged)**: When `RunwayForecast`, `BillCalendar` amounts, `GoalState` figures, or `CreditState` are stale/absent, any *money figure* Focus would surface is flagged/withheld (never shown as fresh). A stressor can still be surfaced *qualitatively* ("a bill is coming due") and paired with a refresh/non-money action, but a stale **money value** is never asserted as current (Constitution IV/VIII).
- **Conflicting advice with Cash Safety precedence**: If a wellbeing-proposed action would imply spending (rare — most Focus actions are reminders/captures, not spends) and Cash Safety's `RunwayForecast`/`SafeToActSignal` flags overdraft risk, the safety signal takes precedence; Focus must not propose an action that contradicts Cash Safety, and any conflict is surfaced via the Conflict Banner with Cash Safety winning (umbrella precedence; ux-foundations §3.1/§4.4/§10.4).
- **Idempotency / retries**: Confirming a worry-to-action twice (double tap, retry, re-run of the same session) creates at most one task/goal per (stressor reference + session id). The dedup key is the stressor's canonical entity reference (e.g. `bill:{bill_id}` / `goal:{goal_id}` / `runway:{profile_id}:{period}` / `card:{account_id}`) combined with the originating session id, persisted with a UNIQUE constraint (platform-decisions §4).
- **Cross-user boundaries**: Focus is single-user; mental-health/well-being data is highly sensitive. Every read of a profile's stressors, sessions, or wellbeing actions is authZ-checked server-side against the validated session identity — never a client-supplied `profileId` (FR-HH-001). In a Household, a member's Focus/well-being content is **never** visible to another member regardless of `MemberScope` (well-being content is private-by-default; see Threat Model). Kid accounts use an age-appropriate, restricted Focus surface (no money-stress framing); the household profile switcher does not expose another member's Focus content.
- **Multi-currency**: Focus computes no FX itself. Where a consumed money figure is a foreign-currency-derived CAD value carrying its own freshness (e.g. a goal/bill valued via the spine's timestamped FX), Focus displays it as-provided with its freshness chip; a stale FX-derived figure is flagged like any other stale money input.
- **Worry resolved out-of-band**: If the underlying stressor resolves itself (bill paid, runway recovers, goal back on pace) before the user acts on a captured worry, the worry/`WellbeingAction` is marked resolved (not deleted) and is not re-offered; the resolution is reflected on next compute from the source contract (Focus owns no authoritative money state, so it always defers to the source).
- **Crisis / acute distress signposting**: Focus is non-clinical. If a user indicates acute distress, Focus surfaces a static, localized crisis-resource signpost (e.g. provincial/national help lines) and does **not** attempt counselling, store free-text journaling of distress, or transmit such content to any other module. (See Clarifications.)
- **Bilingual integrity**: Any session content, support copy, stressor label, action label, or crisis signpost missing an EN or FR translation is a defect, not silently shown in one language (FR-X-005).
- **Contract version skew**: A breaking change in a consumed contract (`BillCalendar`, `GoalState`, `RunwayForecast`, `CreditState`) without a consumer migration disables that stressor source (contract test fails in CI) rather than computing on a mismatched schema; the rest of Focus degrades gracefully (umbrella edge case).

## Clarifications

Decisions made by the spec author to remove ambiguity (non-blocking). Where a product owner may wish to override, this is flagged; defaults are chosen to be constitution-safe and MVP-lean (Principle IX).

### Session 2026-06-29

- Q: Does Focus compute any new monetary values? → A: **No.** Focus surfaces money figures that consumed contracts already own (at-risk bill amount, runway shortfall, behind-pace goal gap), each carrying its provider's `FreshnessStamp`. Focus performs **no FX, no valuation, no arithmetic that originates a money figure**. This keeps it a pure pass-through display consumer; the Money Correctness section is therefore "display + withhold-on-stale" only. *(Recommended default; constitution-safe.)*
- Q: Is a full credential/aggregation-token threat model mandatory? → A: **No** — Focus touches **no** credentials or aggregation tokens and **no other person's financial data** (well-being content is private-by-default and never shared across household members). It is therefore not in the FR-X-010 "must ship a credential threat model" set. **However**, because mental-health/well-being signals are among the most sensitive PII under PIPEDA/Québec Law 25, this spec includes a **focused privacy threat model** (private-by-default, no cross-member exposure, no free-text distress storage, crisis-signpost-only) as a deliberate hardening choice, not because the constitution compels it.
- Q: How are stressors prioritized when several exist? → A: Follow the umbrella/ux-foundations safety-first precedence: **(1) Cash Safety / runway risk → (2) Credit hard-avoid band → (3) Budget/Bills due → (4) behind-pace Goals** (ux-foundations §10.4). Focus reuses this ordering rather than inventing its own.
- Q: What is the dedup key for worry-to-action idempotency? → A: `(stressor_entity_ref, session_id)` with a UNIQUE constraint; a replay or re-run produces at most one `WellbeingAction` per stressor per session. *(Mirrors platform `source_event_id` idempotency, §4.)*
- Q: Does Focus store free-text journaling of the user's emotional state? → A: **No for MVP.** Focus stores only structured session metadata (which pack, which stressor reference, outcome = action-created / skipped / resolved) — **not** free-text descriptions of distress. This minimizes the most sensitive data class (Principle IX + data minimization). Free-text journaling is explicitly out of MVP scope and would require a privacy re-review if added later.
- Q: Crisis intervention? → A: **Out of scope.** Focus is non-clinical. It shows a static, localized crisis-resource signpost and stops there; it does not counsel, escalate, or notify anyone. The signpost content/source (e.g. Talk Suicide Canada / provincial lines) is a curated, versioned, bilingual static dataset — a planning/legal item, non-blocking.
- Q: Can Focus push notifications (e.g. wind-down reminder)? → A: **No direct push.** Any wind-down reminder is submitted to the Inbox digest pipeline as a low-priority/Informational item (ux-foundations §6); Focus never calls a push API directly.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-FOC-*):

- **FR-FOC-001 (Stress pack → concrete linked action)**: System MUST pair each money-stress session with **exactly one** concrete action linked **by reference** to the underlying entity that caused the stress (a `BillCalendar` item, a `GoalState` goal, a `RunwayForecast`/Cash-Safety signal, or a `CreditState` hard-avoid card). The proposed action is a **recommend-only** `WellbeingAction`: nothing is created until the user confirms it through a Confirm-Action sheet; on confirmation a task/goal-creation request is dispatched to Tasks (Module 7) / Spine (goals) and the confirmation is audited (FR-X-007). The linkage MUST be a typed entity reference, never a free-text copy of the figure. When the stressor's money input is stale/missing, the pack MUST still pair support with a *non-money* concrete action and MUST NOT assert a stale money figure (FR-X-008).
- **FR-FOC-002 (Wind-down converts worries first)**: System MUST, in the evening Sleep & Wind-Down sequence, surface outstanding money worries and offer to convert each into a task/goal **before** the guided wind-down begins. Conversion is recommend-only (Confirm-Action) and idempotent: a worry already converted to a still-open task/goal MUST be shown as already-captured and MUST NOT produce a duplicate (keyed on `(stressor_entity_ref, session_id)`). The capture step MUST be **offered, never forced** — an explicit skip proceeds to wind-down and re-offers the worry next session rather than dropping it.

Module-specific derived requirements (added by this spec to make FR-FOC-001/002 testable; MVP-scoped per Principle IX):

- **FR-FOC-003 (Stressor identification, safety-prioritized)**: System MUST identify open money stressors from consumed contracts and order them by the documented safety-first precedence (Cash Safety/runway → Credit hard-avoid → Budget/Bills → Goals). Each surfaced stressor MUST carry the source's `FreshnessStamp`; a stale source's money figures MUST be flagged/withheld and an unavailable source's stressors MUST be omitted (never fabricated). Focus MUST compute **no new money value** — it reads figures the source contracts already own (display pass-through).
- **FR-FOC-004 (Recommend-only, never executes)**: System MUST NOT move money and MUST NOT create a task/goal silently. Every `WellbeingAction` is surfaced for explicit per-action user confirmation; the dispatched creation request is idempotent and safe to retry (FR-X-003).
- **FR-FOC-005 (Privacy of well-being data)**: System MUST treat Focus session records, stressor links, and `WellbeingAction` records as private-by-default and MUST enforce server-side authZ on every access keyed on the validated session identity; well-being content MUST NOT be exposed to another household member regardless of `MemberScope` (FR-X-010, FR-HH-001). System MUST store only structured session metadata — **not** free-text distress journaling — and MUST signpost (not provide) crisis resources.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration), FR-X-002 (Money exactness — applies to any displayed figure), FR-X-003 (Recommend, never move), FR-X-004 (CAD + time-to-goal), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability), FR-X-007 (Audit trail), FR-X-008 (Freshness), FR-X-010 (Least privilege — applies via well-being-data privacy, see Threat Model), FR-X-011 (Contracts & versioning), FR-X-012 (Graceful degradation), FR-X-013 (Privacy/PIPEDA/Law 25 — well-being data is sensitive PII), FR-X-014 (Observability/redaction), FR-X-015 (Performance), FR-X-016 (Accessibility), FR-X-019 (Maximum retention), FR-X-020 (Data residency).

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, not owned here): `BillCalendar` (Module 4 Bills), `RunwayForecast` (Module 3 Cash Safety), `GoalState` (Module 0 Spine), `CreditState` (Module 0 Spine). Optionally `SafeToActSignal` (Module 3) when present, for conflict precedence on any spend-implying action.

Owned/provided by this module:

- **FocusSession**: A single stress-pack or wind-down session: type (`stress_pack` | `wind_down`), the stressor(s) it addressed (by reference), outcome per stressor (`action_proposed` | `action_confirmed` | `skipped` | `already_captured` | `resolved`), timestamps. Stores **structured metadata only** — no free-text distress content. Owned, not provided externally.
- **Stressor / StressorRef**: A typed reference to an underlying entity causing money stress (`bill` | `runway` | `goal` | `credit_card`), its source contract, a stale/withheld flag, and the optional *provider-owned* money figure (displayed pass-through with its freshness). Derived from consumed contracts; not persisted as authoritative money state.
- **WellbeingAction**: A **recommend-only** proposal to create a task or goal linked to a stressor, carrying bilingual reasoning, the typed `StressorRef`, an `informational`/non-clinical flag, an idempotency key `(stressor_entity_ref, session_id)`, and a `FreshnessStamp` (inherited from the stressor's source). **Provided** to Tasks (Module 7) and Workspace (Module 13). Nothing is created until user-confirmed.
- **AuditEvent** (append-only; Principle VI / FR-X-007): records `wellbeing_action_proposed`, `wellbeing_action_confirmed`, `worry_skipped`, `session_started`/`session_completed`; PII/well-being content redacted from debug logs, full record only in the audit trail; confirmation writes keyed on the idempotency key.

### Money Correctness *(MANDATORY — this feature displays monetary values it does not compute)*

- **Numeric representation**: Focus **originates no monetary value**. Every money figure it shows (at-risk bill amount, runway shortfall, goal gap, card balance) is read **as-provided** from a consumed contract where it is already **integer minor units (CAD cents)** or a contract-owned decimal-string. Focus performs **no arithmetic, no FX, no rounding** on money. There is therefore no binary float in Focus's money path because Focus has no money math.
- **Rounding rules**: Not applicable — Focus does not compute or round money. Any rounding occurred in the provider (Spine/Cash Safety/Bills) before the value crossed the contract boundary. Display formatting is delegated to `@finos/format` (en-CA `$1,234.56` / fr-CA `1 234,56 $`); Focus never formats a money value ad hoc.
- **Currency & locale**: CAD throughout, with time-to-goal context where a goal applies (FR-X-004); en-CA and fr-CA locale-correct formatting via `@finos/format` (fr-CA `1 234,56 $`).
- **Determinism & fixtures**: Focus's stressor-prioritization and idempotency logic are pure and deterministic. Mandatory fixtures: (a) a stale-money-input case proving a stale `RunwayForecast`/`BillCalendar` figure is **flagged/withheld**, not shown as fresh, and the pack falls back to a non-money action; (b) a locale fixture proving a consumed at-risk amount renders `1 234,56 $` for fr-CA and `$1,234.56` for en-CA from the same provider cents; (c) an idempotency fixture proving a re-run of the same session for the same `StressorRef` yields at most one `WellbeingAction`/task-goal.
- **Idempotency**: Worry-to-action creation requests are idempotent and safe to retry, keyed on `(stressor_entity_ref, session_id)` with a UNIQUE constraint; replays never double-create (FR-X-003, platform-decisions §4).
- **Recommend-only**: Confirmed — Focus only proposes an action; it never executes a payment, moves money, or creates a task/goal without explicit user confirmation (FR-X-003).

### Security & Privacy Threat Model *(focused — sensitive well-being PII; see Clarifications for why a full credential threat model is not compelled)*

Focus touches **no** credentials, **no** aggregation tokens, and **no other person's financial data** — so it is not in the FR-X-010 mandatory-credential-threat-model set. This focused model is included as deliberate hardening because mental-health/well-being signals are among the most sensitive PII under PIPEDA / Québec Law 25.

- **Assets**: A profile's `FocusSession` records (which stressors, outcomes), `WellbeingAction` records, and the *fact* that a user is experiencing money stress — all of which reveal sensitive emotional/financial state. The consumed money figures (at-risk amounts, runway) are owned by upstream modules; Focus holds only references and pass-through display copies.
- **Trust boundaries / actors**: The owning user; other household members (who MUST NOT see this user's Focus content); the spine and downstream modules (read-only providers); Tasks/Workspace (recipients of confirmed `WellbeingAction`s); Inbox (recipient of digest events only).
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc to another profile's well-being data | `FocusSession`, `WellbeingAction`, stressor links | authZ on every read keyed on validated session identity — never a client-supplied `profileId`; well-being content is **private-by-default**, excluded from `MemberScope` cross-member visibility entirely | Yes (UI filtering alone does NOT satisfy) |
  | Household member infers another's distress | the *fact* of stress; session outcomes | Focus content is omitted from the household profile switcher and from any cross-member view, regardless of scope; kid accounts get a restricted surface | Yes |
  | Sensitive free-text distress leaks / over-retention | emotional state journaling | **Not stored** — MVP stores structured metadata only; no free-text distress capture (data minimization, Principle IX) | Yes (by design — no such field exists) |
  | PII / well-being leak in logs | session/stressor records | structured logs redact PII, monetary values, **and** well-being signals; audit trail separate from debug logs (FR-X-014) | Yes |
  | Well-being signal leaks to Inbox/Tasks beyond the confirmed action | digest events, `WellbeingAction` payload | only the user-confirmed action's minimal payload (action label + entity ref) crosses to Tasks/Workspace; digest events carry no distress detail (ux-foundations §6.3) | Yes |
  | Crisis content mishandled | crisis signpost | static localized signpost only; Focus does not store, transmit, or escalate distress disclosures | Yes (no escalation path exists) |

- **AuthZ enforcement**: Every read/write of Focus data is enforced server-side against the requester's validated session identity; no client-supplied identifier is trusted (FR-HH-001). Denied cross-user access is audited (SC-015 analogue).
- **Data minimization, retention & revocation**: Focus stores the minimum — structured session metadata and entity references — never free-text distress. Well-being records are subject to the umbrella 7-day deletion cascade (FR-X-013) and the dormant-account maximum-retention bound (FR-X-019). Because well-being data is especially sensitive, its retention window SHOULD be set at the tighter end in the planning-phase PIA (non-blocking planning item).
- **Data residency**: All Focus data inherits the Canadian-region residency constraint (FR-X-020); no well-being PII is processed outside Canada without disclosure and an accountability/transfer agreement.

## UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **States (six-state matrix, §3)** — every Focus data view defines all six:
  - **Empty**: first-run Focus tab and the "nothing outstanding" wind-down state — optimistic, explains what Focus does; never "0 worries" framed as data. Generic support session still startable.
  - **Loading**: skeleton stressor list / session shell (no bare spinner; shimmer respects reduced-motion → fade).
  - **Partial**: some stressor sources connected — Partial Data Banner ("Showing stressors from {connected sources}") + "Incomplete picture" chip on the list.
  - **Stale**: a stressor's source feed past threshold — stale freshness chip on the item; its money figure withheld (money input) with a Refresh CTA; the qualitative stressor may still be shown.
  - **Error / Degraded**: a source unavailable — Unavailable chip; non-alarming copy ("Unable to reach {source} right now"); the stressor is simply omitted, no fabricated figure.
  - **Withheld**: the Withheld Card replaces a money figure when a primary money input is stale/missing — states what's missing ("Refresh balance to see runway") with a direct CTA; never a greyed-out guess.
- **Components**:
  - **Recommendation Card (§4.1)**: each proposed `WellbeingAction` is rendered as a Recommendation Card — Action layer (e.g. "Set a reminder to pay {Hydro} due {date}"), Why layer (the stressor inputs + source + freshness + bilingual reasoning), State layer (freshness chip + Withheld/Incomplete chips). A `WellbeingAction` with no Why layer is a defect.
  - **Confirm-Action sheet (§4.2)**: confirming a worry-to-action (creating a task/goal) routes through the Confirm-Action sheet with the specific CTA ("Create reminder" / "Créer un rappel", "Add to goals" / "Ajouter aux objectifs"), the "not regulated financial advice" disclaimer, and an idempotent in-flight-disabled CTA. Focus never has a silently-executing button.
  - **Freshness chip (§4.3)**: every consumed money figure and every stressor carries a freshness chip, always visible, with localized accessible labels.
  - **Conflict Banner (§3.1/§4.4)**: if a wellbeing action would imply spending and Cash Safety flags risk, the Conflict Banner names both signals, states Cash-Safety precedence, and shows the held action with a "Currently overridden" chip.
- **Key screens**:
  1. **Focus tab / Stressor list** (US3) — safety-prioritized stressor list, each with a freshness chip and a path to a pack or action. Follows Module Screen Anatomy (§5.2): nav bar → Partial/Conflict banners (conditional) → stressor list → up to 3 `WellbeingAction` cards without scroll.
  2. **Money-Stress Pack** (US1) — short support session ending in one Recommendation Card → Confirm-Action sheet.
  3. **Evening Wind-Down** (US2) — worry-capture step (Recommendation Cards per worry, each via Confirm-Action) presented **before** the guided wind-down; explicit Skip; calm Empty state when clear.
  4. **Crisis signpost** — static, localized resource panel; no data entry, no transmission.
- **Locale & a11y (§4.4, §7, §8)**: all session/support/action/crisis content bilingual EN/FR with no single-language leak; all money via `@finos/format` (fr-CA `1 234,56 $`); WCAG 2.1 AA; localized screen-reader labels for the card, Why toggle, freshness chip, and Confirm-Action CTA; reduced-motion honored on wind-down/skeleton animations; tap targets ≥ 44×44 pt.
- **Notification restraint (§6)**: any wind-down reminder is an Informational digest item submitted to Inbox — Focus sends no direct push.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-F-001 (Action pairing)**: 100% of completed money-stress packs end with **exactly one** concrete `WellbeingAction` linked by typed reference to the underlying entity; a session that ends with no linked action (when a stressor exists) or a free-text-only "action" is a defect (FR-FOC-001).
- **SC-F-002 (Worries-first wind-down)**: 100% of evening wind-downs with ≥1 open worry present the worry-capture step **before** the guided wind-down; 0 wind-downs begin the guided portion ahead of offering capture (FR-FOC-002).
- **SC-F-003 (Idempotent conversion)**: 0 duplicate tasks/goals created across session re-runs/retries for the same `(stressor_entity_ref, session_id)`; an already-captured worry is never re-offered as new.
- **SC-F-004 (Recommend-only)**: 0 tasks/goals created without explicit user confirmation; 0 money movements (Focus never executes — FR-X-003).
- **SC-F-005 (Freshness safety)**: 0 stale money figures shown as fresh; 100% of stale/withheld money inputs surface a visible stale chip and fall back to a non-money action or Withheld Card (FR-X-008, umbrella SC-006).
- **SC-F-006 (Bilingual parity & locale)**: 0 single-language leaks in shipped Focus strings (sessions, actions, crisis signpost); 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008).
- **SC-F-007 (Well-being privacy)**: 0 cross-member exposures of Focus/well-being data in API-layer authorization testing; well-being content is excluded from every cross-member view regardless of `MemberScope`; every denied access is audited (umbrella SC-015 analogue).
- **SC-F-008 (Data minimization)**: 0 free-text distress fields persisted in MVP; Focus stores structured session metadata only; well-being records honor the 7-day deletion cascade and dormant-retention bound (FR-X-013/019).
- **SC-F-009 (Explainability)**: 100% of `WellbeingAction`s can display "why" with their stressor inputs and bilingual reasoning (umbrella SC-005).
- **SC-F-010 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).

## Assumptions

- **Upstream availability**: Modules 0/3/4 expose `GoalState`, `CreditState`, `RunwayForecast`, and `BillCalendar` as versioned, freshness-stamped contracts. Until a given contract is available, that stressor source simply contributes no stressors (Focus degrades, never guesses). Focus is independently shippable with even one source connected (its Independent Test uses `BillCalendar`).
- **Tasks/Goals as action sinks**: Module 7 (Tasks) and the Spine (Goals) accept a creation request derived from a confirmed `WellbeingAction`; Focus holds only the link, not the task/goal lifecycle. Until Tasks ships, a confirmed `WellbeingAction` may target a Spine goal or be queued; the recommend-only, idempotent contract is fixed now.
- **Cash Safety precedence**: `SafeToActSignal`/`RunwayForecast` (Module 3) provide overdraft-risk precedence for any spend-implying action; until Cash Safety ships, Focus avoids proposing spend-implying actions (most Focus actions are reminders/captures, not spends).
- **Crisis-resource dataset**: A curated, versioned, bilingual static crisis-resource signpost (Canadian national/provincial lines) is provided; its exact content/source is a planning/legal item (non-blocking). Focus never provides counselling.
- **No free-text journaling in MVP**: Structured session metadata only; free-text emotional journaling is out of MVP scope and would require a privacy re-review (Principle IX).
- **Not clinical / not regulated advice**: Focus is non-clinical, informational well-being support and is not regulated financial advice; both are surfaced to users.
- **Staleness windows**: Focus inherits the spine's per-class staleness thresholds for the money figures it displays; it sets none of its own (it owns no external feed). Exact windows are the Module 0 / PIA concern (platform NR-2).

# Feature Specification: Module 13 — Workspace & Playbooks

**Feature Branch**: `015-module-13-workspace`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 13 — Workspace & Playbooks (Priority: P3)"; functional requirements FR-WS-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Workspace & Playbooks** tab only — its two submodules **Life Event Playbooks** and **Personal Finance Notebook**. Module 0 (Financial Core & Data Spine) and several product modules are hard dependencies: Workspace **consumes** their contracts (broad read access) and **does not** re-implement aggregation, budgeting, runway, bills, documents, or trip costing. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated here only where they bind a Workspace behavior.
>
> **Boundary with Tasks (Module 7) and Spine Goals**: Workspace **generates** tasks and goals from playbook steps and notebook actions, but does **not** own the task queue or the goal ledger. A generated task is a `WorkspaceTask` *proposal* that Tasks (Module 7) materializes; a generated goal is a proposal the Spine's goal service materializes. Workspace owns the **provenance link** (which playbook step produced which task/goal) and the idempotency guarantee, not the downstream lifecycle.
>
> **Boundary with Household (Module 14)**: This module is **single-user / single-profile**. It does **not** view another person's finances and does **not** issue, hold, or rotate aggregation credentials. All money it shows is the **owning user's own** data, read by reference from spine/product contracts. A full Security & Privacy Threat Model (Principle V) is therefore **not mandatory** here; the boundary that keeps it out of scope is documented in [Security & Privacy Posture](#security--privacy-posture-no-full-threat-model-required).

## User Scenarios & Testing *(mandatory)*

Workspace is the P3 module that turns FinOS from a set of dashboards into **guided, living workflows**. A life event (move, job change, new baby, immigration) starts a Canada-specific **playbook** whose checklist steps pull *live* FinOS data instead of static text; a Notion-style **notebook** lets the user write plans whose embedded FinOS figures (runway, a goal balance, a bill total) **stay current automatically** with a freshness stamp — never a copy-pasted number that silently rots.

### User Story 1 - Life-event playbook wired to live data (Priority: P1)

A user facing a life event starts a Canada-specific playbook and gets a checklist whose individual steps reference **live** FinOS figures (current runway, relevant bills, a goal's progress) rather than static prose.

**Why this priority**: It is the headline payoff of the module and the umbrella Independent Test for Module 13 ("Start a 'moving' playbook and confirm its checklist references live FinOS data rather than static text"). It delivers standalone value the moment one playbook template and read access to a few spine/product contracts exist.

**Independent Test**: Start the "moving" playbook with a connected spine; confirm at least one step renders a live figure (e.g. current runway days and the next month's bill total) carrying a `FreshnessStamp`, and that no step shows a hard-coded money number.

**Acceptance Scenarios**:

1. **Given** a selected life event, **When** a playbook starts, **Then** a Canada-specific checklist is generated and individual steps pull live FinOS data (each live figure carries a freshness stamp). *(FR-WS-001)*
2. **Given** a playbook step that binds to a **money** input (e.g. runway days from `RunwayForecast`, a goal balance from `GoalState`) whose source is **stale** beyond its threshold, **When** the step renders, **Then** the figure is shown flagged-stale (or withheld) with a refresh affordance — never presented as fresh. *(FR-X-008, Constitution VIII)*
3. **Given** an fr-CA user, **When** a step renders a CAD figure or date, **Then** it is locale-formatted (`1 234,56 $`, `28 juin 2026`), and the step's title and body are in French with no single-language leak. *(FR-X-005, Constitution II)*
4. **Given** a step whose required source contract is **entirely absent** (e.g. Bills/`BillCalendar` not yet connected), **When** the playbook renders, **Then** the step degrades to a Partial/Empty state naming the missing connection with a "Connect Bills" affordance — it is **not** silently dropped and **not** zero-filled. *(FR-X-012, ux six-state matrix)*

---

### User Story 2 - Living notebook references that never go stale (Priority: P1)

A user writes a free-form notebook page (e.g. "Should we buy the car?") and embeds **live references** to FinOS figures (runway, a goal balance, a bill total). The embedded numbers update automatically and always show their freshness — there is no copy-paste of a number that later misleads.

**Why this priority**: It is the second umbrella acceptance scenario for Module 13 ("a notebook figure stays current automatically and carries a freshness timestamp") and the clearest expression of Integration-First in this module. It is independently shippable from playbooks.

**Independent Test**: Insert a `NotebookReference` to current runway into a page; change the underlying spine value (or its freshness); confirm the page re-renders the new value and the updated freshness chip without any manual edit, and that a stale underlying value flags the inline reference.

**Acceptance Scenarios**:

1. **Given** a notebook page that references a FinOS figure, **When** the underlying figure changes, **Then** the page shows the current value automatically (no manual copy-paste) with a freshness timestamp. *(FR-WS-002)*
2. **Given** an embedded reference whose underlying **money** value is stale, **When** the page renders, **Then** the inline reference is shown flagged-stale (or withheld) with a refresh affordance, never as a confident fresh number. *(FR-X-008)*
3. **Given** an embedded reference to a figure the user **no longer has access to** (e.g. the connection was removed, or the referenced goal was archived/deleted), **When** the page renders, **Then** the reference resolves to an explicit "no longer available" state — never a stale cached number and never a silent blank. *(FR-X-008, edge cases)*
4. **Given** an fr-CA user editing a page, **When** an inline reference renders, **Then** the value uses fr-CA conventions and the freshness chip label is in French. *(FR-X-005)*

---

### User Story 3 - Idempotent task/goal generation from playbook steps (Priority: P2)

A playbook step can generate a task or a goal; re-running the same step (a retry, a re-open, a sync replay) does **not** create a duplicate task or goal for that step.

**Why this priority**: It is the third umbrella acceptance scenario for Module 13 and the correctness backbone that makes playbooks safe to re-enter. It is P2 because US1/US2 deliver a usable, valuable module first; this hardens the write path.

**Independent Test**: Run a playbook step that generates a task and a goal; re-run the identical step; confirm exactly one task and one goal exist for that step (keyed on the step's stable provenance id), and that a second run is a no-op that still returns the existing references.

**Acceptance Scenarios**:

1. **Given** a playbook step that generates a task or goal, **When** the same step is re-run, **Then** it does not create a duplicate task/goal for that step (idempotent generation keyed on the step provenance id). *(FR-WS-001, FR-X-003)*
2. **Given** a generated task that Tasks (Module 7) later marks complete, **When** the playbook re-renders, **Then** the step reflects the completion state from `TaskCompletionEvents` — Workspace does not own or override the task's lifecycle.
3. **Given** a generated **goal** proposal, **When** it is materialized, **Then** it flows through the Spine's goal service (Workspace never writes a goal balance or money figure directly), and the playbook keeps only the provenance link.
4. **Given** two concurrent generation requests for the same step (double-tap, retry storm), **When** they are processed, **Then** the unique provenance key admits exactly one materialization and the other request returns the same references (no double-apply). *(Constitution IV idempotency)*

---

### User Story 4 - Playbook progress, snooze, and completion (Priority: P3)

A user works a playbook over days/weeks: marking steps done, snoozing steps that depend on a future event, and seeing overall progress; completing the playbook is recorded.

**Why this priority**: Lifecycle polish that makes a multi-week life event manageable. P3 because the module is already valuable with US1–US3; this is YAGNI-bounded (no gold-plating — no collaboration, no templates marketplace).

**Independent Test**: Mark several steps done and snooze one to a future date; confirm progress reflects only completed steps, the snoozed step reappears after its date, and completing all steps writes a `playbook_completed` audit event.

**Acceptance Scenarios**:

1. **Given** a playbook in progress, **When** the user marks steps done or snoozes a step, **Then** progress reflects the current state and a snoozed step reappears at/after its snooze date.
2. **Given** all required steps complete, **When** the playbook is completed, **Then** a `playbook_completed` event is written to the append-only audit trail. *(FR-X-007)*
3. **Given** a step's underlying figure later changes (e.g. runway worsens), **When** the user re-opens the playbook, **Then** the figure re-renders live — completion of a step does not freeze its referenced figure as a stale snapshot.

---

### Edge Cases

- **Empty / no connectivity**: A playbook started before any account is connected renders each data-bound step in the **Empty** state ("Connect an account to populate this step") with a connect CTA — never zero-filled money and never a fabricated figure. The notebook still allows free text; references inserted while empty render as **Unavailable** until the source connects.
- **Partial connectivity**: With some sources connected (e.g. spine + Goals but not Bills), data-bound steps that resolve render live; steps needing a missing source render **Partial** with a per-step "Connect {module}" affordance and an Incomplete-data chip. A playbook is never blocked wholesale by one missing source.
- **Stale / missing money inputs**: Any referenced **money** figure (runway, goal balance, bill total, trip budget) past its staleness threshold is **flagged or withheld** at the point of display, with a refresh affordance; Workspace never re-displays a stale money number as if current (Constitution VIII). Workspace performs **no money computation** of its own — it surfaces upstream figures by reference, so it never "guesses" a money value.
- **Conflicting advice with Cash Safety precedence**: When a playbook step's suggested action would imply spending and `SafeToActSignal` (Cash Safety) flags overdraft/safety risk, the step surfaces the **Conflict Banner** and the safety signal **takes precedence** — Workspace defers to Cash Safety and shows the conflict + resolution rather than urging the spend. Workspace is a downstream orchestrator and never overrides a safety signal.
- **Multi-currency**: Workspace displays whatever currency the upstream contract provides (CAD by default; FX-converted CAD where the source already converted, e.g. `TripBudget`). It performs no FX conversion itself; a source figure marked stale-FX is flagged at display.
- **Idempotency / retries**: Task/goal generation is keyed on a **stable step provenance id** (`{playbook_instance_id, step_id, generation_kind}`); replays, double-taps, and sync retries never double-create. A generation request that finds an existing materialization returns the existing reference (no-op).
- **Cross-user boundaries**: This module is single-profile. Every read of spine/product data is scoped to the **session-derived profile identity** (never a client-supplied id); there is no cross-profile playbook or notebook view here. Household sharing of finances is Module 14's surface, not this module's.
- **Reference resolution failures**: A `NotebookReference` whose target was deleted/archived, whose connection was revoked, or whose contract version skewed resolves to an explicit **Unavailable / no-longer-available** state — never a silently cached stale value, never a blank, never a placeholder zero.
- **Contract version skew**: A breaking change in a consumed contract without a Workspace migration disables the dependent step/reference (consumer contract test fails in CI) rather than rendering on a mismatched schema (umbrella edge case, SC-012). The affected step/reference shows Unavailable with a "needs update" note.
- **Bilingual integrity**: A playbook step, notebook chrome label, alert, or freshness label missing an EN or FR string is a defect — never shown in one language. User free-text notebook content is shown verbatim and is **not** machine-translated.
- **Notebook content is not financial advice**: Free-text the user writes is theirs; Workspace adds the "informational decision support, not regulated financial advice" framing on any step that proposes a money action (routed through the Confirm-Action sheet) but does not police the user's own notes.

## Clarifications

### Session 2026-06-29

These are decisions made by the spec author to remove ambiguity without blocking (Constitution: resolve and document). Items that genuinely need product/owner input are listed under [Open Questions](#open-questions-non-blocking).

- **Q: Does Workspace compute any monetary value itself?** → **A: No.** Workspace is a **display-and-reference** layer: every money figure it shows is read by reference from an upstream contract that already computed it in exact cents/decimal (spine/Cash Safety/Bills/Travel/Goals). Workspace stores **references**, not copies of money values. This keeps it out of the money-compute path while still binding it to Principle IV's display/locale rules. A [Money Correctness](#money-correctness-display-by-reference-no-computation) section is included on those grounds.
- **Q: How are generated tasks/goals de-duplicated?** → **A:** Keyed on a **stable step provenance id** = `{playbook_instance_id, step_id, generation_kind}`, enforced with a `UNIQUE` constraint on the materialization record (mirrors the platform `source_event_id` idempotency convention). Re-runs are no-ops that return the existing reference.
- **Q: Catalog of life-event playbooks for MVP?** → **A:** Ship a curated, versioned, bilingual set of **four** Canada-specific templates — **Moving**, **Job change**, **New baby**, **Immigration / newcomer to Canada** — matching the umbrella's named events. The template set is a **versioned dataset** (like the Rewards card-knowledgebase) so a step-schema change is caught by contract tests. New templates are added without code changes.
- **Q: Does a `NotebookReference` cache the last value for offline display?** → **A:** It may cache the **last-known value plus its `FreshnessStamp`** for fast render, but a cached value is governed by Fresh-or-Flagged exactly as any other external value: past threshold it renders flagged-stale/withheld, never as fresh. On reference-resolution failure it renders Unavailable, never the cached number as if current.
- **Q: Are playbook steps that imply spending allowed to act?** → **A: No** money movement (FR-X-003). A step that proposes a money action surfaces a **Recommendation Card** and routes any confirmation through the **Confirm-Action sheet**; the user executes externally. Steps defer to `SafeToActSignal` precedence on conflict.
- **Q: Single-user or household-aware?** → **A:** **Single-profile** for this module (see scope boundary). No cross-profile views; household finance sharing is Module 14. This removes the mandatory full threat model while keeping server-side, session-scoped authZ on every read.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-WS-*):

- **FR-WS-001 (Life-event playbooks wired to live data)**: System MUST generate **Canada-specific** life-event playbooks (Moving, Job change, New baby, Immigration/newcomer) whose checklist steps pull **live** FinOS data by reference (e.g. current runway from `RunwayForecast`, relevant bills from `BillCalendar`, a goal's progress from `GoalState`) rather than static text. Each live figure MUST carry a `FreshnessStamp`; a stale **money** figure MUST be flagged/withheld at display (FR-X-008). A step that generates a task or goal MUST do so **idempotently**, keyed on a stable step provenance id, so re-running the step never duplicates the task/goal (FR-X-003 idempotency). Generated tasks are proposed to Tasks (Module 7); generated goals are proposed to the Spine goal service — Workspace never writes a money value or a goal balance directly (FR-X-003 recommend-only).
- **FR-WS-002 (Living notebook references)**: System MUST provide a notebook whose embedded references to FinOS figures **stay current automatically** (no manual copy-paste) and carry a freshness stamp; a reference whose underlying money value is stale MUST render flagged/withheld, and a reference whose target is deleted/revoked/version-skewed MUST resolve to an explicit Unavailable state (never a stale cached number, never a silent blank). All reference rendering uses locale-correct formatting via the platform formatter (FR-X-005).

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): FR-X-001 (Integration — every step/reference reads real spine/product state), FR-X-003 (Recommend, never move — no money movement; idempotent generated state), FR-X-004 (CAD + time-to-goal context on displayed figures), FR-X-005 (Bilingual & locale-correct formatting), FR-X-006 (Explainability — any step that proposes an action carries inputs + reasoning), FR-X-007 (Append-only audit trail for playbook lifecycle + generation events), FR-X-008 (Freshness — flag/withhold stale figures), FR-X-011 (Versioned contracts; consumer+provider tests), FR-X-012 (Graceful degradation when a source is missing/down), FR-X-014 (Observability/redaction — no PII/money in debug logs), FR-X-015 (Performance ≤300 ms), FR-X-016 (Accessibility — WCAG 2.1 AA, bilingual SR labels). FR-X-013 (deletion cascade) and FR-X-019 (dormant retention) apply to notebook content and provenance records.

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, owned elsewhere; referenced, not defined here): `BudgetState`, `GoalState`, `CreditState` (Module 0); `RunwayForecast`, `SafeToActSignal` (Module 3, Cash Safety); `BillCalendar` (Module 4, Bills); `DocumentVault` (Module 12, Docs); `TripBudget` (Module 11, Travel). Generated-state targets: `TaskState` / `TaskCompletionEvents` (Module 7, Tasks) and the Spine goal service.

Owned/provided by this module:

- **PlaybookTemplate**: A curated, versioned, bilingual Canada-specific life-event template (steps, data bindings, generation specs). A **dataset**, not user data.
- **PlaybookInstance**: A user's running instance of a template (status, progress, started/completed timestamps). **Owned**, scoped by `profile_id`.
- **PlaybookStep / StepBinding**: A step within an instance; a `StepBinding` declares which upstream contract figure the step reads (e.g. `RunwayForecast.runway_days`) and how it renders. Drives the live, freshness-stamped figure.
- **WorkspaceTask / WorkspaceGoalProposal**: A task or goal **proposal** generated from a step, carrying a stable provenance id and the downstream reference once materialized. **Provided** (as part of `Playbooks`) to Tasks and the Spine goal service.
- **NotebookPage**: A user-authored page (free text + embedded references). **Owned**, scoped by `profile_id`.
- **NotebookReference**: An embedded, auto-refreshing reference to an upstream FinOS figure (target contract + path + last-known value + `FreshnessStamp` + resolution state). **Provided** as `NotebookReferences`.
- **Playbooks (provided contract)**: The published view of a user's playbook instances + steps + generated task/goal provenance, consumed by Tasks, Goals (Spine), and Focus.
- **NotebookReferences (provided contract)**: The published set of live references a user's notebook holds, consumed by Focus (and any module that wants to know which figures the user is actively watching).
- **AuditEvent**: Append-only record of playbook lifecycle (`playbook_started`, `step_completed`, `playbook_completed`), generation (`task_generated`, `goal_proposed`), and reference lifecycle (`reference_created`, `reference_unavailable`). (Principle VI / FR-X-007.)

### Money Correctness *(display-by-reference; no computation)*

This module **displays** monetary values but **does not compute** any. The section is included because Principle IV's display/locale/idempotency clauses still bind it.

- **Numeric representation**: Workspace **never** stores a money value as its own source of truth. Every money figure it shows is held as a **reference** to an upstream contract whose value is already integer minor units (cents) for amounts and decimal-string for rates. A `NotebookReference`/`StepBinding` may cache the last-known value **for render only**, typed exactly as the upstream contract types it (integer `*_cents`), with its `FreshnessStamp` — never a binary float, never a re-typed/rounded copy.
- **Rounding rules**: **None performed here.** Workspace does no arithmetic on money. It MUST NOT sum, convert, or re-round upstream figures; if a derived total is needed it is requested from the owning module's contract (e.g. a bill total from `BillCalendar`), never computed in Workspace. This keeps the single-rounding-point invariant (Principle IV) wholly upstream.
- **Currency & locale**: All displayed amounts, percentages, and dates render through the platform `@finos/format` package for the active locale (en-CA `$1,234.56`, fr-CA `1 234,56 $`, fr-CA dates `28 juin 2026`). No raw number formatting in Workspace UI (FR-X-005, SC-008). Time-to-goal context (FR-X-004) is shown wherever a referenced figure has a goal association, sourced from `GoalState`.
- **Determinism & fixtures**: The only "math" Workspace owns is **provenance-key derivation** and **freshness evaluation**, both pure and deterministic. Mandatory fixtures: (a) a `StepBinding` to a stale runway figure renders flagged-stale, not fresh; (b) the same money value renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA) from one integer-cents reference; (c) a provenance-key fixture proving `{instance, step, kind}` produces a stable key so a replay is a no-op.
- **Idempotency**: Task/goal generation is keyed on the stable step provenance id with a `UNIQUE` constraint; replays/double-taps/sync retries never double-create (Constitution IV). Notebook reference creation is likewise idempotent per `{page_id, target}`.
- **Recommend-only**: Confirmed — Workspace proposes tasks/goals and surfaces money actions for **explicit user execution** via the Confirm-Action sheet; it **never** moves money or writes a balance (FR-X-003).

### Security & Privacy Posture *(no full threat model required)*

A full Security & Privacy Threat Model (Principle V) is **mandatory only** when a module touches credentials, aggregation tokens, or **another person's** financial data. Workspace touches **none** of these, and that boundary is enforced, not assumed:

- **No credentials/tokens**: Workspace issues, holds, and rotates **no** aggregation tokens or secrets. It reads spine/product figures **only** through versioned contract clients; tokens live solely in Module 0's KMS-backed store (FR-CORE-007, platform-decisions §5). No contract Workspace consumes or provides carries a token or secret.
- **Single-profile only**: Workspace exposes **no** cross-profile view. Every read of spine/product data and every write of playbook/notebook/provenance state is scoped to the **session-derived profile identity** — never a client-supplied `profileId` (platform-decisions §5; server-side authZ, defense-in-depth RLS on Workspace-owned tables). Household finance sharing is Module 14's surface.
- **Data minimization & residency**: Workspace stores **references and provenance**, not copies of financial data, minimizing what it holds. Notebook free text and provenance records are Canadian-region-resident (FR-X-020) and subject to the deletion cascade (FR-X-013, within 7 days) and dormant-account retention bound (FR-X-019). A notebook reference derived from an email-sourced figure inherits the email-revocation cascade.
- **Observability**: Structured logs on render/generation paths redact PII and monetary values; the append-only audit trail is kept separate from debug logs (FR-X-014).
- **If scope later expands** (e.g. shared/household playbooks in a future phase), a full threat model becomes mandatory **before** that work — recorded here as the trigger.

### UI/UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab**: "Workspace / Espace" — a P3 tab living under the "More" overflow (ux §5.1). Module screen follows the standard anatomy (ux §5.2): nav bar, conditional Partial/Conflict banners, scrollable body, tab bar.
- **Six-state matrix (ux §3)** — every data view defines all six:
  - **Empty**: A playbook step or notebook reference with no connected source shows the first-run empty state with a "Connect {module}" CTA — never zero-filled money (ux §3, §10.1).
  - **Loading**: Skeletons matching the step/page layout; no bare spinners (ux §3).
  - **Partial**: Steps resolving on a partial picture show the **Partial Data Banner** and an Incomplete-data chip; the banner names the missing source ("Connect Bills to complete this step") (ux §3, §10.2).
  - **Stale**: A referenced figure past threshold shows the **Stale freshness chip**; money inputs withhold the figure and show a Refresh CTA (ux §3, §3.1).
  - **Error / Degraded**: A source down/timeout shows the **Unavailable** chip and a non-alarming retry state; never the last-known money value as if current (ux §3, §10.3).
  - **Withheld**: A stale/missing **money** figure replaces the inline value/step figure with the **Withheld** treatment + a direct CTA ("Refresh runway", "Connect Bills") — never a guessed or greyed number (ux §3).
- **Recommendation Card (ux §4.1)**: Any playbook step that proposes an action (e.g. "Move your emergency buffer up — your runway after the move is N days") renders as a Recommendation Card with the mandatory **Why layer** (inputs: the referenced figures + their sources + freshness; reasoning EN/FR) and an always-visible freshness chip.
- **Confirm-Action sheet (ux §4.2)**: Any step proposing a **money action** (e.g. "Schedule the deposit toward your moving goal") routes through the full-screen Confirm-Action sheet with the exact-cents impact, the Why layer, and the mandatory "not regulated financial advice" disclaimer; the primary CTA is verb+object ("Schedule deposit"), never "Confirm". Workspace never silently executes.
- **Freshness chip (ux §4.3)**: Every live step figure and every inline notebook reference carries a freshness chip, always visible (Fresh/Aging/Stale/Unavailable), with localized SR labels.
- **Conflict Banner (ux §4.4 / §10.4)**: When a spend-implying step conflicts with `SafeToActSignal`, the Conflict Banner names both signals, states that **Cash Safety takes precedence**, and shows the overridden step in a "Currently overridden" state with its CTA disabled.
- **Accessibility (ux §7)**: WCAG 2.1 AA; bilingual screen-reader labels on every step, reference, chip, and CTA; Dynamic Type reflow; reduced-motion (notebook/step transitions instant, skeleton shimmer → fade); tap targets ≥ 44×44 pt.
- **Bilingual (ux §2.4, §8)**: All Workspace chrome, template step text, and chips are EN/FR with no single-language leaks; user free-text notebook content renders verbatim (not translated). Money/dates via `@finos/format`; fr-CA edge cases (non-breaking space before `$`, typographic apostrophe) handled by the formatter (ux §10.7).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-W-001 (Live, not static)**: 100% of data-bound playbook steps and notebook references render the **live** upstream figure with a `FreshnessStamp`; **0** steps/references display a hard-coded or copy-pasted money number (umbrella Module 13 Independent Test; FR-WS-001/002).
- **SC-W-002 (Freshness safety)**: **0** referenced **money** figures are shown past their staleness threshold without a visible stale flag or withhold (umbrella SC-006; FR-X-008).
- **SC-W-003 (Idempotent generation)**: For any playbook step generating a task/goal, re-running it yields exactly **one** task and **one** goal for that step across arbitrary replays/concurrency; **0** duplicates (FR-WS-001; Constitution IV).
- **SC-W-004 (Recommend-only)**: **0** money-movement endpoints in the Workspace API surface; every money action is surfaced via a Confirm-Action sheet for explicit user execution (umbrella SC-007; FR-X-003).
- **SC-W-005 (No money computation)**: **0** monetary arithmetic operations (sum/convert/round) performed in Workspace code; every money figure is read by reference from an owning contract (this module's Money Correctness invariant; Principle IV/IX).
- **SC-W-006 (Bilingual parity & locale formatting)**: **0** single-language leaks in shipped Workspace chrome/template strings; 100% of displayed monetary values, percentages, and dates use the active locale's conventions (umbrella SC-008; FR-X-005).
- **SC-W-007 (Explainability)**: 100% of action-proposing steps can display a "why" with their referenced inputs and reasoning (umbrella SC-005; FR-X-006).
- **SC-W-008 (Conflict precedence)**: In 100% of cases where a spend-implying step conflicts with `SafeToActSignal`, Cash Safety's signal takes precedence and the conflict + resolution are surfaced; **0** steps urge a spend the safety signal flags (umbrella conflict edge case).
- **SC-W-009 (Contract reliability)**: 100% of contracts this module consumes/provides have passing consumer + provider contract tests in CI before release; a version-skewed consumed contract disables the dependent step/reference rather than rendering on a mismatched schema (umbrella SC-012; FR-X-011).
- **SC-W-010 (Reference integrity)**: 100% of `NotebookReference`s whose target is deleted/revoked/version-skewed resolve to an explicit Unavailable state; **0** render a stale cached number as if current or a silent blank (FR-X-008).
- **SC-W-011 (Performance)**: Module-switch into Workspace renders the cached playbook/notebook shell in ≤ 300 ms; a cache miss/stale figure renders a flagged state rather than blocking on a network fetch (umbrella SC-010; FR-X-015).
- **SC-W-012 (Audit completeness)**: 100% of playbook lifecycle and generation events (`playbook_started`, `step_completed`, `playbook_completed`, `task_generated`, `goal_proposed`) are written to the append-only audit trail, kept separate from debug logs (FR-X-007/014).

## Assumptions

- **Spine + product availability**: Module 0 exposes `BudgetState`, `GoalState`, `CreditState`; Cash Safety exposes `RunwayForecast` and `SafeToActSignal`; Bills exposes `BillCalendar`; Docs exposes `DocumentVault`; Travel exposes `TripBudget` — all as versioned, freshness-stamped contracts. Until a given contract is available, the dependent step/reference degrades to Partial/Empty/Unavailable (per the six-state matrix), never guesses, and never blocks the whole playbook.
- **Tasks + Goal service availability**: Tasks (Module 7) materializes `WorkspaceTask` proposals and emits `TaskCompletionEvents`; the Spine goal service materializes `WorkspaceGoalProposal`s. Until present, generated proposals are persisted with provenance and surfaced as "pending materialization" — the idempotency key still guarantees no duplicates when the downstream lands.
- **Playbook template source**: A curated, versioned, bilingual Canada-specific template dataset (Moving, Job change, New baby, Immigration/newcomer) is authored/ingested; its exact curation/update cadence is a planning decision. New templates require no code change.
- **No money computation in Workspace**: All monetary figures are computed upstream; Workspace displays them by reference. This is an architectural invariant, not a convenience.
- **Single-profile scope**: Workspace is single-user for this phase; household/shared playbooks (and the threat model they would require) are out of scope and explicitly deferred.
- **Staleness windows**: Per-figure staleness thresholds are inherited from the owning contract's `FreshnessStamp` (Workspace does not set its own money-staleness policy); the notebook-reference cache obeys the same threshold. Canada-oriented defaults are set in the relevant owning module's research/ops review (platform NR-2).
- **Not regulated advice**: Action-proposing steps are informational decision support, not regulated financial advice (surfaced via the Confirm-Action disclaimer).

## Open Questions *(non-blocking)*

Recorded for the main session to put to the product owner; none blocks authoring (defaults chosen above are used until answered).

1. **Template breadth for MVP** — default: ship the four named Canada events (Moving, Job change, New baby, Immigration/newcomer). Confirm whether a fifth (e.g. *Separation/divorce* or *Bereavement/estate*) is in P3 scope or deferred. *Recommended default: the four named events; defer others.*
2. **Notebook reference target allowlist** — default: references may target the consumed contracts listed here (runway, goal balance, bill total/calendar, trip budget, budget headroom, credit utilization, a document link). Confirm whether arbitrary product-module figures are referenceable in MVP or a curated allowlist only. *Recommended default: curated allowlist (the consumed set), expanded per demand.*
3. **Snooze/lifecycle depth (US4)** — default: per-step done/snooze + instance progress + completion audit. Confirm whether step dependencies/ordering (a step blocked until a prior step completes) is in MVP or deferred. *Recommended default: flat checklist with optional snooze; defer hard dependencies.*
4. **Generated-goal authorship** — default: a generated goal is a *proposal* the user confirms before the Spine materializes it (no silent goal creation). Confirm this matches the desired UX vs. auto-creating with an undo. *Recommended default: explicit confirm before materialize.*

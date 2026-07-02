# Quickstart & Validation: Module 13 — Workspace & Playbooks

**Feature**: `015-module-13-workspace` | **Date**: 2026-06-29

A run/validation guide proving Workspace works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

> **Money note**: Workspace performs **no** monetary arithmetic (SC-W-005). The mandatory "money fixtures" below therefore validate **display-by-reference** correctness — that a referenced integer-cents figure renders correctly per locale and that a stale money figure is withheld — not a computation. There is no rounding/summation fixture here because Workspace owns no rounding point (that invariant lives upstream).

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `BudgetState`, `GoalState`, `CreditState`. Cash Safety (`RunwayForecast`, `SafeToActSignal`), Bills (`BillCalendar`), Docs (`DocumentVault`), Travel (`TripBudget`), and Tasks (`TaskState`/`TaskCompletionEvents`) clients are feature-checked — when a provider is not yet shipped, its dependent step/reference degrades to Partial/Empty/Unavailable (never blocks the whole playbook).
- Seeded fixtures: the curated bilingual four-template dataset (Moving, Job change, New baby, Immigration/newcomer), a `RunwayForecast` test figure (fresh + stale variants), a `GoalState` goal, a `BillCalendar` total, and a `Spine goal service` / `Tasks` stub that records materializations.
- Toolchain per the ratified [platform-decisions.md](../_platform/platform-decisions.md) (TypeScript/Node + NestJS + Prisma/Postgres + Pact + Jest + React Native Testing Library). Commands below are illustrative — adjust to the ratified scripts.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:workspace-fixtures     # four templates, runway (fresh+stale), goal, bill total, downstream stubs
```

## Validation by user story

### US1 — Life-event playbook wired to live data (P1) 🎯 MVP

```bash
<pkg> test workspace/unit/live-binding
<pkg> test workspace/integration/playbook-moving
```

Expected:
- Starting the "Moving" playbook generates a Canada-specific bilingual checklist; **≥1 step renders a live figure** (current runway days + next-month bill total), each carrying a `FreshnessStamp` (SC-W-001).
- **Money fixture (mandatory, display-by-reference)**: a `LiveBinding` to `RunwayForecast.runway_days` and to a `BillCalendar` total renders the **upstream integer-cents** value verbatim — **0** hard-coded/copy-pasted money numbers in any step (SC-W-001/005).
- A `RunwayForecast`/bill total marked **stale** renders the figure **withheld** with a Refresh CTA — never as fresh (SC-W-002).
- A step whose source contract is **entirely absent** (Bills not connected) renders **Partial/Empty** naming the missing connection with a "Connect Bills" affordance — not silently dropped, not zero-filled (FR-X-012).
- fr-CA locale renders the same integer-cents figure as `1 234,56 $` and the date as `28 juin 2026`; step title/body in French with no single-language leak (SC-W-006).

### US2 — Living notebook references that never go stale (P1)

```bash
<pkg> test workspace/unit/notebook-reference
<pkg> test workspace/integration/notebook-references
```

Expected:
- Inserting a `NotebookReference` to current runway renders the live value + freshness chip; changing the underlying spine value (or its freshness) **re-renders automatically** with no manual edit (SC-W-001 / FR-WS-002).
- **Money fixture (mandatory, display-by-reference)**: one integer-cents reference renders `$1,234.56` (en-CA) and `1 234,56 $` (fr-CA) from the **same** cached value — proving locale render, not re-computation (SC-W-006).
- A reference whose underlying **money** value is stale renders flagged-`withheld` with a refresh affordance — never a confident fresh number (SC-W-002).
- A reference whose target was **deleted/archived/revoked or version-skewed** resolves to explicit **`unavailable`** ("no longer available") — never a stale cached number, never a silent blank (SC-W-010), and writes a `reference_unavailable` audit event.
- Reference creation is idempotent per `{page_id, target_contract, value_path}` — re-embedding the same figure does not duplicate it.

### US3 — Idempotent task/goal generation from playbook steps (P2)

```bash
<pkg> test workspace/unit/provenance-key
<pkg> test workspace/integration/generation-idempotency
```

Expected:
- **Provenance-key fixture (mandatory)**: `hash({instance_id, step_id, generation_kind})` is **stable** — the same inputs always yield the same `provenance_id`, so a replay is a no-op (SC-W-003).
- Running a step that generates a task and a goal, then re-running the **identical** step, leaves exactly **one** task and **one** goal for that step (UNIQUE provenance key); the second run returns the existing references (SC-W-003).
- **Concurrent** generation (double-tap / retry storm) admits exactly one materialization; the other request returns the same references — no double-apply (Constitution IV idempotency).
- A generated **goal** flows through the Spine goal service (Workspace never writes a goal balance or money value); Workspace keeps only the provenance link.
- A generated task later marked complete by Tasks (Module 7) is reflected from `TaskCompletionEvents` — Workspace does not own/override the task lifecycle.

### US4 — Playbook progress, snooze, and completion (P3)

```bash
<pkg> test workspace/integration/playbook-lifecycle
```

Expected:
- Marking steps done and snoozing one to a future date: progress reflects only completed steps; the snoozed step reappears at/after its `snoozed_until` date.
- Completing all required steps writes a `playbook_completed` event to the append-only audit trail (SC-W-012).
- Re-opening the playbook re-renders each step's figure **live** — completing a step does **not** freeze its referenced figure as a stale snapshot.

## Contract tests (mandatory — Principle VII / SC-W-009)

```bash
<pkg> test workspace/contract/consumed   # BudgetState, GoalState, CreditState, RunwayForecast, SafeToActSignal,
                                          # BillCalendar, DocumentVault, TripBudget, TaskState/TaskCompletionEvents
<pkg> test workspace/contract/provided    # Playbooks, NotebookReferences
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken **consumed** schema **fails CI** and disables the dependent step/reference (renders `unavailable` with a "needs update" note), never rendering on a mismatched schema (version-skew behavior, SC-W-009 / SC-012). Not-yet-shipped providers are pinned by umbrella name at min `1.0.0` and feature-checked.

## Cross-cutting checks

- **No money computation (SC-W-005)**: grep/lint the Workspace source — **0** monetary arithmetic operations (no sum/convert/round of `*_cents`); the only "math" is provenance-key derivation and freshness evaluation, both pure. A CI lint gate fails on any money arithmetic in `modules/workspace/`.
- **Recommend-only (SC-W-004 / FR-X-003)**: grep the Workspace API surface — there is **no** money-movement endpoint and **no** goal-balance write; every money action routes through a Confirm-Action sheet for explicit user execution.
- **Conflict precedence (SC-W-008)**: a spend-implying step conflicting with `SafeToActSignal` surfaces the **Conflict Banner**, sets `safe_to_act_deferred = true`, marks the step `overridden`, and shows Cash Safety taking precedence — **0** steps urge a flagged spend.
- **Audit trail (SC-W-012 / Principle VI)**: `playbook_started` / `step_completed` / `playbook_completed` / `task_generated` / `goal_proposed` / `reference_created` / `reference_unavailable` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs on render/generation paths contain no PII or monetary values.
- **Performance (SC-W-011 / SC-010)**: module-switch into Workspace renders the cached playbook/notebook shell in ≤ 300 ms; cache miss/stale renders a flagged/withheld state rather than blocking on a network fetch.
- **Accessibility (SC-W-006 / FR-X-016)**: WCAG 2.1 AA; bilingual screen-reader labels on every step, reference, freshness chip, and CTA; Dynamic Type reflow; reduced-motion (instant step/notebook transitions, skeleton shimmer → fade).

## Done when

All four user-story validations pass, the display-by-reference money fixtures render correctly per locale and withhold stale money figures, the provenance-key fixture proves stable idempotency, all 9 consumer + 2 provider contract tests are green, and the cross-cutting checks hold — including the **no-money-arithmetic** lint gate (the module-specific invariant).

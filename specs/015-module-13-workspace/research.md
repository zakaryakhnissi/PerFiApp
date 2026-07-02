# Phase 0 Research: Module 13 — Workspace & Playbooks

**Feature**: `015-module-13-workspace` | **Date**: 2026-06-29

Records the Phase 0 decisions this module's design depends on. **Platform-stack choices (language, datastore, mobile framework, auth, residency, CI gates) are inherited verbatim from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here.** This module is a P3 orchestration layer; per Principle IX it stays MVP-scoped — thorough analysis, lean feature set. Genuinely module-specific vendor/source unknowns are flagged as non-blocking open items.

---

## 1. Inheritance from platform decisions (not re-decided)

**Decision**: Workspace is one NestJS bounded context (`WorkspaceModule`) in the modular monolith, TypeScript end-to-end, one Postgres schema (`workspace`) with per-schema role + RLS, money via `@finos/money` and formatting via `@finos/format`, append-only `audit.event_log`, contracts as semver'd JSON-Schema packages with Pact consumer+provider tests, Canadian-region hosting. All inherited from platform-decisions §2–§7.

**Rationale**: Constitution IX (no re-litigation, no parallel stack) and platform-decisions' explicit role as the single authority every module plan references. Re-deciding here would create drift.

**Alternatives considered**: None — re-opening platform choices in a P3 module is out of bounds.

---

## 2. Workspace owns no money computation (architectural invariant)

**Decision**: Workspace performs **zero** monetary arithmetic. Every money figure it shows (runway, goal balance, bill total, budget headroom, trip budget) is read **by reference** from the owning contract, which already computed it in exact cents/decimal. Workspace caches a last-known value **for render only**, typed exactly as upstream (integer `*_cents`), with the upstream `FreshnessStamp` — never re-rounded, summed, or FX-converted.

**Rationale**: Constitution IV (single rounding point, no float) is best honored by keeping all money math upstream where the fixtures already live; duplicating any arithmetic in an orchestration layer would create a second place for cent-slippage. Constitution IX (YAGNI) — Workspace's value is *binding live data into workflows*, not computing it. This makes SC-W-005 ("0 monetary operations in Workspace") a verifiable lint/test gate.

**Alternatives considered**: Letting Workspace sum bill totals or convert a trip budget for display — **rejected**; that re-introduces money math (and a rounding point) outside the owning module's fixtures, violating IV and IX. If a derived total is genuinely needed, it is requested from the owning contract.

---

## 3. Live-data binding model (steps & notebook references)

**Decision**: A step's `LiveBinding` and a notebook's `NotebookReference` are **typed pointers** — `{ target_contract ($id), value_path }` — into a consumed contract, resolved at render through the contract client. Each carries the upstream `FreshnessStamp` and a `resolution_state` (live / stale / withheld / unavailable). A cached value is allowed for fast render but is governed by Fresh-or-Flagged exactly like any other external value.

**Rationale**: FR-WS-001/002 require figures that "stay current automatically" with freshness — a pointer + freshness model satisfies this without copying (and silently rotting) data. Pinning the `$id` (with semver) means a provider's breaking change is caught by the consumer contract test and the binding disables (SC-W-009) rather than rendering on a mismatched schema.

**Alternatives considered**: Snapshot-and-store the figure into the page/step — **rejected** (the umbrella explicitly contrasts this module against "copy-paste" static numbers; a snapshot is exactly the stale-number failure mode). Live fetch with no cache — rejected for the ≤300 ms budget; cache + flag-on-stale is the platform pattern (platform-decisions §2, Rewards research §9).

---

## 4. Idempotent task/goal generation

**Decision**: Generation is keyed on a **stable provenance id** = hash of `{playbook_instance_id, step_id, generation_kind}`, enforced with a `UNIQUE` constraint on the `GeneratedItem` record (mirrors the platform `source_event_id` idempotency convention, platform-decisions §4). A replay, double-tap, or sync retry that hits an existing key is a no-op returning the existing reference. Generated tasks are **proposed** to Tasks (Module 7); generated goals are **proposed** to the Spine goal service — Workspace never writes a goal balance or any money value.

**Rationale**: The third umbrella acceptance scenario for Module 13 ("re-running a step does not create a duplicate task/goal") and Constitution IV (idempotent, safe-to-retry state). Keying on the step's stable identity (not a request id) makes idempotency hold across process restarts and across the wait for a not-yet-shipped downstream.

**Alternatives considered**: Dedupe by content hash of the generated task — rejected (two legitimately-different tasks from one step would collide, and a step whose figure changed would spuriously re-create). Let Tasks dedupe — rejected (pushes Workspace's correctness guarantee into another module; Workspace owns the provenance).

---

## 5. Life-event playbook templates: curated, versioned, bilingual dataset

**Decision**: Ship a curated, **versioned**, bilingual Canada-specific template dataset behind a `PlaybookTemplate` loader, seeded for the four umbrella-named events — **Moving, Job change, New baby, Immigration/newcomer to Canada**. The template (and its step schema) is versioned like the Rewards card-knowledgebase so a step-schema change is caught by contract tests; new templates require no code change.

**Rationale**: FR-WS-001 (Canada-specific) + Principle VII (versioned) + Principle IX (lean MVP set, the four named events, not an open marketplace). Canada-specificity (e.g. immigration/newcomer credit-building, ROE on job change, provincial utility transfers on a move) is curated content, not computed logic.

**Alternatives considered**: Free-form user-authored playbooks only — rejected (loses the curated Canada-first value that is the point). A template marketplace / sharing — rejected for MVP (YAGNI; also would pull in cross-user surface + a threat model).

---

## 6. Conflict resolution: Cash Safety precedence

**Decision**: When a playbook step proposes a spend-implying action and `SafeToActSignal` (Cash Safety) flags overdraft/safety risk, the step is held (`state = overridden`, `safe_to_act_deferred = true`) and the **Conflict Banner** surfaces the resolution — **Cash Safety always takes precedence** (ux §4.4 / §10.4). When Cash Safety is not yet shipped, the binding to `SafeToActSignal` is feature-checked and the step proceeds without the override (degrading gracefully), still recommend-only.

**Rationale**: Umbrella "Conflicting recommendations" edge case + ux precedence ladder (safety > optimization). Workspace is a downstream orchestrator and must never override a safety signal.

**Alternatives considered**: Let Workspace resolve conflicts by its own heuristic — rejected (the precedence rule is platform-level and non-negotiable). Suppress one signal silently — rejected (ux §3.1 forbids silent suppression).

---

## 7. Notebook reference resolution failures

**Decision**: A `NotebookReference`/`LiveBinding` whose target is deleted/archived, whose connection was revoked, or whose contract version skewed resolves to an explicit `unavailable` state (with a `reference_unavailable` audit event) — never a cached number rendered as if current, never a silent blank. A stale **money** target resolves to `withheld`; a stale non-money target to `stale` (flagged).

**Rationale**: FR-X-008 + SC-W-010 + ux six-state matrix. The whole premise of the module is that referenced figures never silently mislead; the failure modes must be explicit UI states, not degradations to a stale value.

**Alternatives considered**: Render last-known value with a small caveat — rejected for money figures (violates Fresh-or-Flagged withhold rule). Drop the reference silently — rejected (a disappearing number in a user's plan is itself misleading).

---

## 8. Performance: ≤ 300 ms module-switch

**Decision**: Maintain a local, freshness-stamped cache of the user's playbook instances + notebook page shells; render the cached shell immediately on tab switch and resolve live bindings in the background. A cache miss or stale-beyond-threshold figure renders a flagged/withheld state rather than blocking the hot path on a network fetch.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget (same pattern as Rewards research §9).

**Alternatives considered**: Always-live fetch of every binding on tab open — rejected (a playbook with many bindings would blow the budget); serve stale silently to hit latency — rejected (violates Principle VIII).

---

## 9. Contract testing approach

**Decision**: Consumer-driven (Pact) contract tests for each consumed contract (`BudgetState`, `GoalState`, `CreditState`, `RunwayForecast`, `SafeToActSignal`, `BillCalendar`, `DocumentVault`, `TripBudget`, `TaskState`/`TaskCompletionEvents`) and provider contract tests for each provided contract (`Playbooks`, `NotebookReferences`), running in CI; contracts semver'd with a deprecation window. Version skew disables the dependent step/reference (umbrella edge case) instead of rendering on a mismatched schema.

**Rationale**: Principle VII + FR-X-011 + SC-W-009. Several consumed providers are not yet shipped; their consumer tests are wired against the umbrella-declared names at min 1.0.0 and finalized when the owning module ships its `$id` (see consumed/README.md note).

**Alternatives considered**: Integration tests against live providers only — rejected (slow, doesn't pin the schema, and many providers don't exist yet).

---

## Open items handed to planning/ops (non-blocking)

- **WS-NR-1 (Template curation source & cadence)**: who authors/maintains the curated bilingual Canada-specific playbook dataset (in-house content vs. a content partner), and its update cadence. Owner: Workspace plan. *Default until resolved: in-house curated seed for the four named events.*
- **WS-NR-2 (Template breadth)**: whether a fifth life-event template (e.g. separation/divorce, bereavement/estate) is in P3 scope. Owner: product owner (spec Open Question 1). *Default: the four named events.*
- **WS-NR-3 (Reference target allowlist)**: whether notebook references may target arbitrary product-module figures or only the curated consumed set. Owner: product owner (spec Open Question 2). *Default: curated allowlist = the consumed set.*
- **WS-NR-4 (Not-yet-shipped provider `$id`s)**: finalize the concrete `$id`/version of `RunwayForecast`, `SafeToActSignal`, `BillCalendar`, `DocumentVault`, `TripBudget`, `TaskState`/`TaskCompletionEvents` when the owning module specs ship; wire Workspace's consumer tests then. Owner: respective module plans. *Non-blocking: pinned by umbrella name at min 1.0.0 today.*
- **WS-NR-5 (Step dependency model)**: whether steps support hard ordering/dependencies in MVP or a flat snooze-able checklist. Owner: product owner (spec Open Question 3). *Default: flat checklist with snooze; defer hard dependencies (YAGNI).*

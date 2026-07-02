# Phase 0 Research: Module 9 — Focus & Mental Health

**Feature**: `011-module-9-focus` | **Date**: 2026-06-29

Resolves the design decisions Module 9 depends on. **Platform-stack choices are inherited from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here** (TypeScript modular monolith, NestJS `FocusModule` bounded context, PostgreSQL `focus` schema + per-schema role + RLS, `@finos/money`/`@finos/format`, append-only `audit.event_log`, i18next, Canadian-region residency). This file records only the Focus-specific decisions, each as Decision / Rationale / Alternatives, and flags genuinely module-specific open items as non-blocking.

---

## 1. Focus owns no money math (pure display pass-through)

**Decision**: Focus **originates no monetary value**. It reads provider-owned money figures (at-risk bill amount, runway shortfall, behind-pace goal gap) from consumed contracts as **integer cents**, displays them via `@finos/format`, and performs **no arithmetic, FX, or rounding**. Stale money inputs are withheld (figure set null), never asserted as fresh.

**Rationale**: Principle IV/VIII + FR-X-002/008. The most damaging fintech defect class (float money, stale-as-fresh) is avoided entirely by Focus never doing money math. The Money Correctness section is therefore "display + withhold-on-stale" only. (Constitution IX — the simplest correct design.)

**Alternatives considered**: Recompute at-risk amounts/runway inside Focus — rejected (duplicates spine/Cash-Safety logic, risks divergence, introduces a money path where none is needed). Display stale figures to keep the UI populated — rejected (violates Principle VIII).

---

## 2. Stressor identification reuses the safety-first precedence

**Decision**: Stressors are identified from consumed contracts and ordered by the documented safety-first precedence: **(1) Cash Safety / runway risk → (2) Credit hard-avoid band → (3) Budget/Bills due → (4) behind-pace Goals** (ux-foundations §10.4). Focus reuses this ordering verbatim rather than inventing its own.

**Rationale**: Umbrella + ux-foundations conflict-precedence. Reusing the platform ordering keeps Focus consistent with every other module's conflict handling and means a single source of truth for "what matters most" (Integration-First).

**Alternatives considered**: A Focus-specific stressor weighting — rejected (divergence from platform precedence; gold-plating, Principle IX).

---

## 3. Action linkage by typed entity reference, not free-text

**Decision**: Each `WellbeingAction` links to its stressor by a **typed canonical entity reference** (`bill:{bill_id}`, `goal:{goal_id}`, `runway:{profile_id}:{period}`, `card:{account_id}`) — never by copying the money figure or a free-text description. The created task/goal carries the same link back.

**Rationale**: FR-FOC-001 ("linked to the underlying entity") + Principle VI (reproducible reasoning). A typed reference keeps the action live (resolves with the source) and supports idempotent dedup.

**Alternatives considered**: Free-text "pay your hydro bill" with no link — rejected (not testable as "linked", goes stale, can't dedup).

---

## 4. Idempotency key for worry-to-action conversion

**Decision**: Worry-to-action creation is idempotent, keyed on `(stressor_entity_ref, session_id)` with a UNIQUE constraint; a replay/re-run/double-tap creates at most one task/goal. An already-converted, still-open worry surfaces as `already_captured` and is not re-offered.

**Rationale**: FR-X-003 + platform-decisions §4 (`source_event_id` idempotency). Directly satisfies the umbrella Acceptance Scenario 3 (no duplicate task/goal) and SC-F-003.

**Alternatives considered**: Key on session only — rejected (would dedup across distinct stressors in one session). Key on stressor only — rejected (would block a legitimately re-raised worry in a later session after the prior task was completed/closed).

---

## 5. Recommend-only via Confirm-Action; no silent task/goal creation

**Decision**: No task/goal is created until the user confirms the `WellbeingAction` through a Confirm-Action sheet (ux-foundations §4.2). Focus dispatches the creation request to Tasks (Module 7) / Spine (goals) only on confirmation; the confirmation is audited.

**Rationale**: FR-X-003 (recommend, never move) + ux-foundations §2.2. Even though Focus moves no money, creating a task/goal is a downstream-consequential action and is treated with the same confirm-then-record discipline.

**Alternatives considered**: Auto-create tasks from worries during wind-down — rejected (violates recommend-only discipline and the "offered, never forced" wind-down rule, FR-FOC-002).

---

## 6. Privacy posture: private-by-default well-being data, no free-text distress

**Decision**: Focus session records, stressor links, and `WellbeingAction`s are **private-by-default** well-being PII: authZ server-side on every access, **excluded from every cross-household-member view regardless of `MemberScope`**, redacted from debug logs (PII + money + well-being signals), and subject to the 7-day deletion cascade + dormant-retention bound. MVP stores **structured session metadata only — no free-text distress journaling**. Crisis situations are **signposted** (static localized resources), never counselled/escalated.

**Rationale**: Mental-health/well-being signals are among the most sensitive PII under PIPEDA / Québec Law 25. Focus touches no credentials/tokens/another person's data, so a full FR-X-010 credential threat model is not compelled — but data minimization + cross-member privacy is a deliberate hardening choice (Principle V/IX + FR-X-013/014). The focused threat model lives in spec.md.

**Alternatives considered**: Free-text mood journaling in MVP — rejected (creates the most sensitive data class for marginal MVP value; deferred pending privacy re-review). Sharing Focus content under household `MemberScope` — rejected (well-being content is private even from otherwise-authorized household members). In-app crisis counselling — rejected (out of scope; non-clinical product).

---

## 7. Notification discipline: digest-only, no direct push

**Decision**: Any wind-down reminder is submitted to the **Inbox digest pipeline** as a low-priority/Informational item (ux-foundations §6). Focus never calls a push API directly and carries no distress detail in digest payloads.

**Rationale**: Inbox owns notification discipline (SC-009, ux-foundations §6.3); Focus emitting events (not pushes) keeps the ≤2/day budget intact and avoids interrupt-driven stress.

**Alternatives considered**: Direct wind-down push from Focus — rejected (violates notification restraint; alert sprawl).

---

## 8. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed contract (`BillCalendar`, `RunwayForecast`, `GoalState`, `CreditState`) and a provider contract test for `WellbeingAction`, running in CI; contracts semver'd. Version skew on a consumed contract **disables that stressor source** (the rest of Focus degrades), per the umbrella edge case.

**Rationale**: Principle VII + FR-X-011 + SC-F-010. Focus depends only on a small documented field set per source, so most provider changes are non-breaking for Focus.

**Alternatives considered**: Live integration against each provider only — rejected (slow, doesn't pin the schema, no provider-side guarantee for `WellbeingAction`).

---

## 9. Performance: ≤ 300 ms tab open

**Decision**: The Focus tab renders from a locally-cached, freshness-stamped stressor list refreshed in the background; a cache miss / stale-beyond-threshold value yields a flagged/withheld state rather than a blocking network fetch on the hot path.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget. Mirrors the Rewards approach (research §9).

**Alternatives considered**: Always-live fetch on tab open — rejected (blows the 300 ms budget); serve stale silently — rejected (violates Principle VIII).

---

## Open items handed to planning/ops (documented, non-blocking)

- **OI-1 (Crisis-resource dataset)**: Concrete Canadian national/provincial crisis-resource content/source for the signpost (curated, versioned, bilingual). Legal/clinical review of the wording. Non-blocking; does not affect contracts.
- **OI-2 (Stress-pack / wind-down content)**: The curated bilingual support-session scripts (non-clinical), versioned as a static dataset; EN/FR parity is a CI gate. Content authoring is a product/clinical-review item.
- **OI-3 (`BillCalendar` / `RunwayForecast` namespace casing)**: Final `$id` casing for the Bills and Cash Safety contracts is owned by Modules 4/3; Focus pins whatever they publish. Focus reads only documented fields, so casing has no design impact.
- **OI-4 (Well-being retention window)**: The tighter-end retention bound for well-being records (vs the general dormant bound, FR-X-019) is set in the planning-phase PIA (platform NR-3 analogue).
- **OI-5 (Tasks/Goals action sink availability)**: Until Module 7 (Tasks) ships, a confirmed `create_task` action may target a Spine goal or be queued; the recommend-only, idempotent `WellbeingAction` contract is fixed now regardless of sink availability.

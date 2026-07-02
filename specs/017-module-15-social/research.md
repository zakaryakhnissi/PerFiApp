# Phase 0 Research: Module 15 — Social & Accountability

**Feature**: `017-module-15-social` | **Date**: 2026-06-29

Resolves the module-specific unknowns for Social. Platform-stack choices (language, datastore, mobile framework, auth, residency, CI gates) are **inherited** from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are **not** re-litigated here. Only genuinely module-specific decisions are recorded.

---

## 1. Projection model: dimensionless, server-computed, leak-proof by construction

**Decision**: A shared circle metric is a **server-side-computed, dimensionless projection** — one of `percentage_complete` (a `0..1` decimal-string ratio), `streak_count` (integer), or `pace_status` (enum). The provided `CircleProgress` contract has **no amount/currency/account/institution field**, so a raw money value is structurally impossible to transmit. The projection is computed by a server-side filter from the granted source *before* transmission.

**Rationale**: FR-SOC-001 demands "expose nothing else from a member's finances" and that `CircleProgress` be a server-computed projection, never raw amounts/identifiers. Making leak-proofing **structural** (no field exists) rather than procedural (remember to strip it) is the strongest mitigation and is directly testable by a provider contract test that asserts the absence of money/identifier fields. Inherits the platform decimal-string-on-the-wire convention (platform-decisions §4) for the one ratio.

**Alternatives considered**: Share a rounded amount band (e.g. "$2k–$3k") — rejected (still a money leak, infers net worth/behavior). Client-side projection from raw data — rejected (the client would receive raw amounts, defeating the guarantee; FR-SOC-001 mandates server-side filtering before transmission).

---

## 2. Real-data integrity: no member-set projections

**Decision**: Projections are **server-derived only** from real `GoalState`/`HabitProgress`. There is **no API write path** for a member to set their own projection value. The circle view recomputes idempotently from spine/Habits change events (keyed on `source_event_id`).

**Rationale**: FR-SOC-002 ("update shared circle views from real goal/habit data … not manual entry"). A manual-entry path would let a member fabricate progress — the integrity failure that distinguishes Social from a vanity tracker. Idempotent recompute (platform-decisions §4) ensures retries never double-apply.

**Alternatives considered**: Allow optional manual progress with a "self-reported" badge — rejected (FR-SOC-002 forbids manual entry; a badge does not restore trust and complicates the privacy surface).

---

## 3. Staleness window for circle projections

**Decision**: Default **24 h** staleness window per projection, user-adjustable. A stale projection is **flagged** (stale chip + "Updated {date}"), never withheld. A source feed-down yields the **Unavailable** state with the last-known timestamp — never a fabricated value.

**Rationale**: FR-X-008 + Constitution VIII. The projection is a **dimensionless secondary metric** with **no money input**, so stale ⇒ flag (not withhold); a goal/habit does not change minute-to-minute, so 24 h matches its real cadence. Final value is confirmed in the Module 0 privacy/ops review (platform NR-2) — the *mechanism* (per-value `FreshnessStamp` + threshold) is fixed now.

**Alternatives considered**: Withhold stale projections — rejected (over-strict; no money input is at risk, and withholding a streak count helps no one). A single global threshold — already owned by the platform freshness convention; 24 h is the Social-specific default.

---

## 4. Invite, consent, and circle-size model (MVP)

**Decision**: **Invite-by-code/link to existing FinOS users only** — no public discovery, no external/email invitees, no friend graph. The invitee must **explicitly accept and choose their own metric to share** (membership without a ShareGrant = "present, not sharing"). Member cap **8**.

**Rationale**: Simplicity / YAGNI (Constitution IX) and the umbrella "small groups" framing. Existing-user-only invites keep the cross-user privacy surface minimal and avoid building identity/discovery infrastructure for a P4 module. Explicit per-member share-and-accept makes consent unambiguous and audit-friendly (FR-SOC-002).

**Alternatives considered**: Public/discoverable circles — rejected (large privacy/abuse surface, out of scope for P4). Email/SMS invitees — rejected (pulls in email subprocessor + consent complexity; deferrable). Larger groups (e.g. 50) — rejected for MVP (accountability is a *small*-group dynamic; larger fan-out enlarges the privacy surface).

---

## 5. Household-joint-goal exclusion

**Decision**: A goal jointly owned with a household member is **excluded** from circle projections unless that household member's `MemberScope` was **explicitly extended** to the circle. The exclusion is **total** — not even a placeholder row — so a circle peer cannot infer the household partner's existence or cadence. Until `MemberScope` (Module 14) is published, Social applies the **safe default: exclude all household-joint goals**.

**Rationale**: FR-SOC-001 explicitly requires excluding `GoalState` entries originating from or jointly owned with household members whose scope was not extended, so peers "cannot infer a household partner's existence or contribution cadence." A total exclusion (vs. a masked placeholder) is the only inference-proof option. Inherits the platform server-side-authZ + RLS model (platform-decisions §5).

**Alternatives considered**: Show a masked "shared with household" placeholder — rejected (reveals the partner's existence, an inference leak). Allow joint goals by default — rejected (violates FR-SOC-001).

---

## 6. Notification routing: Inbox digest, never direct push

**Decision**: Circle signals (`AccountabilitySignals`) are emitted to the **Inbox digest pipeline** (and to Habits); Social **never** calls a push API directly. Social signals are at most `important` tier (digest push, bundled), never `critical`.

**Rationale**: ux-foundations §6 / SC-009 (Inbox owns notification budget and restraint; ≤ 2 money notifications/user/day). Social has no time-sensitive safety event, so it never warrants the `critical` tier. Dedup is handled by the Inbox pipeline (same circle + signal_type + subject within 24 h = one item).

**Alternatives considered**: Direct push from Social — rejected (violates notification restraint and the platform "module must not call push directly" rule).

---

## 7. Performance: ≤ 300 ms tab open

**Decision**: Cache the circle list and the latest dimensionless projection per member on the mobile client (freshness-stamped); the circle view renders from cache, with projections recomputed server-side in the background and pushed via the spine/Habits change stream. A cache miss or stale-beyond-threshold value renders the flagged/Unavailable state rather than a blocking fetch on the hot path.

**Rationale**: FR-X-015 / SC-010 (≤ 300 ms) without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit latency. Projections are tiny (a ratio/integer/enum + label), so caching is cheap.

**Alternatives considered**: Always-live fetch on tab open — rejected (risks the 300 ms budget); serve stale silently — rejected (violates Principle VIII).

---

## 8. Contract testing approach

**Decision**: Consumer-driven contract tests for each consumed contract (`GoalState`; `HabitProgress`/`StreakState` and `MemberScope` once published) and provider contract tests for each provided contract (`CircleProgress`, `AccountabilitySignals`), running in CI. The provider test additionally **asserts the absence** of any money/account/institution field in every response (FR-SOC-001). Contracts semver'd with a deprecation window.

**Rationale**: Principle VII + FR-X-011 + SC-S-008. The leak-proof guarantee (FR-SOC-001) is only as good as the test that enforces it — hence the explicit no-money-field assertion. Version skew disables the dependent projection (umbrella edge case) rather than rendering on a mismatched schema.

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, doesn't pin the schema, no provider-side leak assertion).

---

## Open items handed to planning/ops (documented, non-blocking)

- **OI-1 (Habits dependency)**: `HabitProgress`/`StreakState` (Module 9 Habits) is **not yet specced/published**. Habit-streak circles are feature-checked and degrade to goal-based circles until Habits ships. Owner: Habits plan + Social plan feature flag. *Inherits the umbrella phasing (P3 Habits before P4 Social).*
- **OI-2 (MemberScope dependency)**: `MemberScope` (Module 14 Household) schema is **not yet published**; Social pins a min version and applies the safe-default exclusion until then. Owner: Household plan.
- **OI-3 (Staleness window final value)**: 24 h default confirmed in the Module 0 privacy/ops review (platform NR-2).
- **OI-4 (Member cap & invite model)**: cap of 8 and existing-user-only invites are MVP defaults; a user-adjustable cap and richer invite flows are post-MVP, gated by product.
- **OI-5 (Dormant-circle retention)**: dormant-account anonymization (FR-X-019) applies to circle data; the exact inactivity window is set in the planning-phase PIA (platform NR-3).

# Feature Specification: Module 15 — Social & Accountability

**Feature Branch**: `017-module-15-social`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 15 — Social & Accountability (Priority: P4)"; functional requirements FR-SOC-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0; platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md); UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Structured to match the gold-standard exemplar [Module 1 — Rewards](../002-module-1-rewards/spec.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Social & Accountability** tab only — small **Accountability Circles** that share *one* explicitly-chosen progress metric tied to real goal/habit data. Module 0 (Spine), Module 9 (Habits — *not yet specced*), and Module 14 (Household) are dependencies: this module **consumes** their contracts and does not re-implement goals, habit/streak tracking, or the household authorization model. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated only where they bind a Social behavior.
>
> **P4 / Simplicity boundary (Constitution IX)**: This is the last, lightest module. MVP scope is deliberately lean: **a circle is a privacy-controlled, server-computed read-only progress feed** — not a chat product, not a social network, not a leaderboard with money figures. There is **no** money movement, **no** raw amount sharing, **no** free-form messaging, **no** friend graph, **no** public discovery. Thorough analysis, minimal surface.
>
> **Money boundary**: Social **never** displays or transmits a member's monetary amount, account name, or institution name to another member. The only money-adjacent value a circle exposes is a **derived, dimensionless projection** (percentage complete, streak count, on-track/behind status) computed server-side *before* transmission. Because Social handles another person's financial data, a **Security & Privacy Threat Model is MANDATORY** (Constitution V) and is the heart of this spec.

## User Scenarios & Testing *(mandatory)*

Social is the final intelligence/social layer (P4). Its value is **motivation through shared accountability** without ever leaking a member's financial detail. Every story is gated by an explicit, revocable per-member share grant and renders only a server-computed projection.

### User Story 1 - Create a circle and share ONE metric, nothing else (Priority: P1 *within this module*)

A user creates an accountability circle around one of their savings goals (or a habit streak), invites a few people, and explicitly chooses the single progress metric to share. Members see only that metric — never amounts, account names, institutions, or any other goal.

**Why this priority**: This is the module's reason to exist and its core privacy guarantee (FR-SOC-001). It is independently valuable: a circle with one shared metric and zero leakage is a complete, shippable product even before live updates or revocation flows are polished. It is also the highest-risk surface (cross-user financial data), so it must be correct first.

**Independent Test**: Create a circle around a goal, set the shared metric to "percentage complete", add a member, and confirm that member's circle view shows only a percentage and the goal's display name — and that no monetary amount, account identifier, institution name, or any other goal of the owner is present anywhere in the API response or the rendered view.

**Acceptance Scenarios**:

1. **Given** a user with a goal, **When** they create a circle and choose the shared metric, **Then** the circle is created with exactly one `shared_metric_kind` and the owner's explicit share grant is recorded (audited). *(FR-SOC-001)*
2. **Given** a circle member viewing the circle, **When** the view renders, **Then** only the chosen projection (percentage complete / streak count / pace status) and a non-financial display label are shown — **never** a raw amount, account name, institution name, or another of the owner's goals. *(FR-SOC-001)*
3. **Given** an fr-CA member, **When** the projection renders, **Then** percentages use fr-CA conventions (`72,5 %`, space before `%`) and dates use fr-CA formats, via `@finos/format`. *(FR-X-005)*
4. **Given** the owner is **also** a household member with a jointly-owned goal, **When** the circle projection is computed, **Then** it excludes any `GoalState` entry originating from or jointly owned with a household member whose `MemberScope` was not explicitly extended to the circle — so circle members cannot infer a household partner's existence or contribution cadence. *(FR-SOC-001)*
5. **Given** an attempt to add a metric that exposes an amount (e.g. "$3,000 of $5,000"), **When** the circle is configured, **Then** the configuration is rejected — money amounts are not a valid `shared_metric_kind` (the contract has no amount field). *(FR-SOC-001, Money Correctness)*

---

### User Story 2 - Live updates from real progress, never manual entry (Priority: P2 *within this module*)

When the underlying goal or habit advances from **real** financial progress (a real contribution, a real habit-advancing action), the circle's shared projection updates automatically. A member cannot type a fake number to look good.

**Why this priority**: Authenticity is the product's integrity guarantee (FR-SOC-002) and what separates it from a vanity tracker. It builds directly on US1 but is separable: US1 can ship with periodic recomputation before real-time push is tuned.

**Independent Test**: Advance the underlying `GoalState.current_amount` (via a real spine update) and confirm the circle projection recomputes from that real value within the freshness window — and confirm there is no API path that lets a member set the projection directly.

**Acceptance Scenarios**:

1. **Given** real progress on the underlying goal/habit, **When** `GoalState` or `HabitProgress` changes, **Then** the circle's `CircleProgress` projection recomputes from that real value (not manual entry). *(FR-SOC-002)*
2. **Given** there is no write path for a member to set their own projection, **When** any client attempts to POST a projection value, **Then** the request is rejected — projections are server-derived only. *(FR-SOC-002, FR-X-003)*
3. **Given** the source `GoalState`/`HabitProgress` is **stale** beyond its freshness window, **When** the circle view renders, **Then** the projection carries a **stale freshness chip** and shows "last updated {date}" rather than presenting an old value as current. *(FR-X-008)*
4. **Given** the source contract feed is **down/unavailable**, **When** the circle view renders, **Then** the member sees the Unavailable state with the last-known timestamp — never a fabricated or zero-filled projection. *(FR-X-012, six-state matrix)*

---

### User Story 3 - Revoke sharing and disappear from the circle, audited (Priority: P2 *within this module*)

A member who shared their progress can revoke at any time. On revocation, their projection is removed from every member's circle view immediately, no cached copy survives, and the revocation is recorded in the audit trail.

**Why this priority**: Revocability is the consent backbone (FR-SOC-002) and a PIPEDA/Law 25 expectation (FR-X-013). It is the third leg of the privacy guarantee and independently testable.

**Independent Test**: As a sharing member, revoke; confirm the member's projection vanishes from other members' circle views (including any cached client state) and that an audit event records the revocation with actor, circle, and timestamp.

**Acceptance Scenarios**:

1. **Given** a sharing member, **When** they revoke their share, **Then** their projection is removed from the circle for all other members and the revocation is audited (actor, circle_id, timestamp). *(FR-SOC-002, FR-X-007)*
2. **Given** a member whose share was revoked, **When** another member's client holds a cached circle view, **Then** the revoked member's projection is **not** shown — the server omits it and the client must not display stale cached data for a revoked member. *(FR-SOC-002, Threat Model)*
3. **Given** a full data-deletion request from a member (FR-X-013), **When** it is processed, **Then** all of that member's circle memberships, share grants, and derived projections are deleted within the 7-day SLA and the deletion is audited. *(FR-X-013, FR-X-019)*
4. **Given** the circle **owner** leaves or deletes the circle, **When** they do so, **Then** every member's share grant for that circle is revoked and all derived projections are torn down (no orphaned projection survives). *(FR-SOC-002)*

---

### Edge Cases

Think-hard enumeration across empty/partial connectivity, staleness, conflicts, multi-currency, idempotency/retries, and cross-user boundaries:

- **Empty circle / no members**: A circle with only its owner shows the Empty state ("Invite people to share progress"), never a zero-filled projection grid. A circle whose every member has revoked collapses to the Empty state for the owner.
- **Partial connectivity**: If the owner's underlying goal source is connected but an invited member never connected accounts (no `GoalState`), that member simply has **no projection to share** — the circle shows them as "not sharing yet", never a fabricated 0%. The Partial Data Banner is shown when some members share and others have not yet connected.
- **Stale source input**: A stale `GoalState`/`HabitProgress` projection is **flagged** (stale chip + "last updated {date}"), not withheld — because the projection is a **dimensionless secondary metric**, not a money figure. (Contrast: a money input would withhold. There is no money input here by construction.) Still, a stale projection is never presented as fresh (FR-X-008).
- **Missing source input**: If a goal referenced by a circle is deleted or its `GoalState` entry disappears, the circle entry transitions to "no longer shared" and the owner is prompted to pick a new metric or close the circle — never a guessed value.
- **Conflicting advice with Cash Safety precedence**: Social produces **no money recommendation and no money action**, so it never originates a conflict with Cash Safety's `SafeToActSignal`. If a circle nudge ever suggests "contribute to your goal" (an `AccountabilitySignal` routed to Inbox/Habits), and Cash Safety flags overdraft risk, **Cash Safety takes precedence** and the nudge is suppressed/deferred per the umbrella precedence rule and ux-foundations §10.4. Social emits the signal; the consuming module (Habits/Inbox) applies precedence — Social never overrides safety.
- **Multi-currency**: Projections are **dimensionless** (percentage / streak count / pace status), so there is no currency on the wire and no FX in this module. If an underlying goal is denominated in a foreign currency, the **percentage** is still currency-free (current/target ratio computed by the spine in arbitrary precision); Social transmits only the ratio, never converted amounts. No FX path exists in Social.
- **Idempotency / retries**: Recompute-and-publish of a projection is **idempotent**, keyed on `source_event_id` (the spine/Habits change event id) — a redelivered update never double-applies or produces a different projection. Revocation is idempotent: revoking an already-revoked share is a no-op that still returns success and does not emit a duplicate audit event.
- **Cross-user boundaries (the central risk)**: Any request to read a circle the requester is not an authorized member of, or to read another member's projection beyond what they granted, is **denied server-side and audited** (FR-SOC-001, FR-HH-001, SC-015). UI filtering alone is non-compliant. A `circleId`/`memberId` supplied by the client is never trusted as the source of truth; identity comes from the validated session.
- **Household leakage vector**: A user who is both a household member and a circle member MUST NOT leak household-scoped data through the circle. The projection computation explicitly excludes goals jointly owned with household members whose `MemberScope` was not extended to the circle (FR-SOC-001), so a circle peer cannot infer a household partner's existence, contribution cadence, or amounts.
- **Kid accounts**: Per ux-foundations §10.6, kid household roles have no profile switcher and limited scope; a kid account may participate only in circles their household scope permits, and never shares household-joint goals.
- **Bilingual integrity**: A circle name is user-entered and displayed verbatim (not translated), but every **system** label, status, metric name, and screen-reader string is bilingual EN/FR — a single-language leak is a defect (FR-X-005).
- **Inbox notification discipline**: Circle nudges/celebrations route through the Inbox digest pipeline (`AccountabilitySignals`), never as standalone push (ux-foundations §6); Social never calls a push API directly.
- **Contract version skew**: A breaking change in a consumed contract (`GoalState`, `HabitProgress`, `MemberScope`) without a consumer migration disables the dependent circle projection (consumer contract test fails in CI) rather than rendering on a mismatched schema (umbrella edge case, SC-012).

## Clarifications

Decisions made by the author to keep the module unblocked (Constitution: resolve ambiguity and document). Each carries a recommended default; any the product owner wishes to overturn can be folded back.

### Session 2026-06-29

- Q: What `shared_metric_kind` values are allowed in MVP? → A: **`percentage_complete` (goal % toward target), `streak_count` (habit streak length), and `pace_status` (on_track / ahead / behind / unknown, mirroring `GoalState.pace_status`)**. All are **dimensionless** — no amount, no currency. Raw-amount sharing is explicitly **out of scope** and structurally impossible (no amount field in the contract).
- Q: How are members invited / how does join consent work in MVP? → A: **Invite-by-code/link to existing FinOS users only** (no public discovery, no external/email invitees in MVP — Simplicity IX). The invitee must **explicitly accept and choose their own metric to share**; membership without a share grant means "present but not sharing". No friend graph is built.
- Q: What is the maximum circle size for MVP? → A: **8 members** (a small accountability group, per the umbrella "small groups" framing). Keeps the projection fan-out and privacy surface small; user-adjustable cap is a post-MVP item.
- Q: Does Social send notifications? → A: **No direct push.** Social emits `AccountabilitySignals` (e.g. "a circle peer hit a milestone", "your streak is at risk") to the **Inbox digest pipeline** and to Habits; Inbox owns notification budget/restraint (SC-009, ux-foundations §6).
- Q: Staleness behavior for a circle projection — flag or withhold? → A: **Flag** (stale chip), never withhold, because the projection is a **dimensionless secondary metric** with **no money input** (Money Correctness). This is consistent with Constitution VIII (stale *money* withholds; stale secondary flags). There is, by construction, no money input that could force a withhold here.
- Q: Default staleness window for a circle projection? → A: **24 h** (inherits the goal/habit cadence; user goals do not change minute-to-minute). User-adjustable; final value confirmed in the Module 0 privacy/ops review (NR-2). Recorded as a documented default.
- Q: Can a member share a household-joint goal? → A: **No by default.** A goal jointly owned with a household member is excluded from circle projections unless that household member's `MemberScope` is explicitly extended to the circle (FR-SOC-001). This is the safe default; an explicit extension flow is a post-MVP consideration.
- Q: Is there any money movement or money recommendation in Social? → A: **No.** Social is read-only progress sharing. It writes only its own circle/membership/share-grant state and derived projections (all idempotent). It surfaces motivational signals but never a money action; any "contribute" nudge is an `AccountabilitySignal` that the consuming module evaluates against Cash Safety precedence.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-SOC-*):

- **FR-SOC-001 (Single-metric, leak-proof sharing)**: System MUST share only the explicitly chosen progress metric within a circle and MUST expose nothing else from a member's finances. The shared `CircleProgress` MUST be a **server-side-computed projection** (percentage complete, streak count, or pace status) — **never** raw monetary amounts, account identifiers, or institution names — filtered **before** transmission. Allowed `shared_metric_kind` values are restricted to the dimensionless set (`percentage_complete`, `streak_count`, `pace_status`); the contract has **no amount field**, so a raw amount is structurally impossible to transmit. For a user who is simultaneously a household member and a circle member, the projection MUST NOT leak any household-scoped data the circle was not explicitly granted, and MUST exclude any `GoalState` entry originating from or jointly owned with a household member whose `MemberScope` has not been explicitly extended to the circle.
- **FR-SOC-002 (Real-data updates & audited revocation)**: System MUST update shared circle views from **real** goal/habit data (consumed `GoalState`/`HabitProgress`), never from manual entry — there MUST be no write path for a member to set their own projection. The system MUST remove a member's data from the circle on **revocation**, immediately and across all members' views (including invalidating cached copies), and MUST record the revocation in the immutable, append-only audit trail (actor, circle, timestamp). Owner-side circle deletion MUST tear down all share grants and projections; member-side data-deletion (FR-X-013) MUST cascade to circle memberships, share grants, and projections within the 7-day SLA.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)):
FR-X-001 (Integration — projections are computed from real spine/Habits state, never invented), FR-X-003 (Recommend, never move — Social moves no money and writes only idempotent derived state), FR-X-005 (Bilingual & locale-correct formatting — percentages/dates via `@finos/format`), FR-X-006 (Explainability — a projection shows what it is derived from and its freshness), FR-X-007 (Audit trail — circle creation, share grant, revocation, deletion are audited), FR-X-008 (Freshness — every projection carries a `FreshnessStamp`; stale ⇒ flagged), FR-X-010 (Least privilege & threat model — MANDATORY; cross-user financial data), FR-X-011 (Contracts & versioning — consumer/provider contract tests), FR-X-012 (Graceful degradation — feed-down shows Unavailable, never a fabricated value), FR-X-013 (Privacy/deletion cascade within 7 days), FR-X-014 (Observability/redaction — no PII/monetary value in debug logs), FR-X-015 (Performance ≤ 300 ms), FR-X-016 (Accessibility — bilingual screen-reader labels), FR-X-019 (Dormant-account retention bound), FR-X-020 (Canadian data residency). FR-X-002/FR-X-004 (money exactness / CAD + time-to-goal) **do not apply directly** to Social's own output because Social transmits no monetary amount; the underlying ratio is computed exactly by the spine.

### Key Entities *(include if feature involves data)*

Consumed from other modules (read-only contracts, not owned here): `GoalState` (Module 0/Spine — real goal progress), `HabitProgress` / `StreakState` (Module 9/Habits — *not yet published*; consumed when available, degrade gracefully until then), `MemberScope` (Module 14/Household — authorization scope and household-joint-goal exclusion).

Owned/provided by this module:

- **Circle**: An accountability group scoped to one shared challenge (a goal or habit), with a name (user-entered, displayed verbatim), a single `shared_metric_kind`, a member cap, and an owner. **Owned** here; not provided as a cross-module contract (internal).
- **CircleMembership**: A member's presence in a circle and their role (owner / member). Membership without a share grant = "present, not sharing".
- **ShareGrant**: A member's explicit, revocable consent to share **one** metric derived from **one** source (a specific `goal_id` or habit) into a specific circle. The consent record audited on grant and revoke; the keystone of FR-SOC-001/002.
- **CircleProgress**: The server-computed, dimensionless **projection** a member shares — `percentage_complete` | `streak_count` | `pace_status` — with a `FreshnessStamp` and a non-financial display label. **Provided** to Habits and Inbox. Contains **no** amount, account, or institution.
- **AccountabilitySignal**: A motivational, bilingual signal (peer-milestone, streak-at-risk, circle-closed) emitted to the Inbox digest pipeline and Habits — never a standalone push, never a money action. **Provided** to Habits and Inbox.
- **AuditEvent**: An immutable, append-only record of circle creation, share grant, revocation, owner deletion, and denied cross-user access (FR-X-007/SC-015). Idempotent, keyed on `source_event_id`.

### Money Correctness *(this feature transmits NO monetary value)*

This section is included to make the boundary explicit (the exemplar's Money Correctness section is adapted, not copied, because Social handles no money output).

- **No monetary values transmitted**: Social's only shared outputs are **dimensionless** projections (`percentage_complete` as a decimal-string ratio `0..1`, `streak_count` as an integer, `pace_status` as an enum). There is **no amount, currency, or FX** anywhere in any provided contract — enforced structurally (the schema has no money field) and by the platform "no float in money paths" gate (vacuously satisfied: there is no money path).
- **Percentage representation**: `percentage_complete` is computed by the **spine** as `current_amount / target_amount` in arbitrary precision and transmitted as a **decimal string** (`^(0(\.[0-9]+)?|1(\.0+)?)$`, i.e. `0..1`) to defeat JSON float coercion — mirroring the platform rate-string convention (platform-decisions §4). Social does **not** recompute money; it consumes the spine's exact ratio and never reverse-engineers an amount from it.
- **Rounding**: Display rounding of a percentage for the UI (e.g. `72,5 %`) happens at the render edge via `@finos/format`; the stored/transmitted ratio retains full precision. No half-up money rounding occurs in Social because no cent value is produced.
- **Idempotency**: Every projection recompute-and-publish and every revocation is **idempotent**, keyed on `source_event_id`; replays never double-apply or diverge (FR-X-003, platform-decisions §4).
- **Recommend-only / no money movement**: Confirmed — Social executes no payment, proposes no money action, and exposes no money-movement endpoint (FR-X-003). Any "contribute to your goal" nudge is an `AccountabilitySignal` evaluated downstream against Cash Safety precedence.

### Security & Privacy Threat Model *(MANDATORY — Social shares another person's financial-progress data across a user boundary)*

This is the module's central concern: Social is, by definition, cross-user sharing of finance-derived data. Per Constitution V and FR-X-010, a threat model is mandatory.

- **Assets**:
  - A member's **`CircleProgress` projection** (percentage / streak / pace) — finance-*derived*, so even dimensionless it reveals savings discipline and behavior.
  - **Membership graph** (who is in a circle with whom) — a social-relationship inference asset.
  - **ShareGrant** records (who shares what, since when) — consent provenance.
  - **The exclusion guarantee itself** — the absence of household-joint-goal data is an asset; leaking the *existence* of an excluded goal is a breach.

- **Trust boundaries / actors**: The sharing member (owner); other circle members (authenticated FinOS users, but **untrusted** with respect to each other's finances); the Household module's `MemberScope`; the spine and Habits (read-only providers); the Inbox pipeline (downstream consumer of signals). Circle members are NOT in each other's trust boundary — the projection filter is the boundary.

- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | IDOR / horizontal priv-esc: reading a circle or member projection you aren't authorized for | another member's `CircleProgress`, membership graph | authZ on every circle/projection read keyed on **validated session identity**, never a client-supplied `circleId`/`memberId`; RLS on circle/membership tables keyed on `auth.uid()` + membership; denied access **audited** (SC-015) | **Yes** (UI filtering alone is NON-compliant) |
  | Over-sharing: a circle exposing an amount, account, or extra goal beyond the single granted metric | `CircleProgress`, raw finances | **server-side projection filter** computes the dimensionless metric *before* transmission; the contract has **no amount/account/institution field** (defense by construction); a provider contract test asserts the response carries no money/identifier field (FR-SOC-001) | **Yes** |
  | Household-joint-goal leak: inferring a household partner's existence/cadence via a circle | excluded `GoalState` entries, exclusion guarantee | projection computation **excludes** goals jointly owned with household members whose `MemberScope` is not extended to the circle; the exclusion is total (not even a "hidden" placeholder) so existence cannot be inferred (FR-SOC-001) | **Yes** |
  | Stale-revocation leak: a revoked member's projection lingering in a peer's cached view | revoked `CircleProgress` | revocation removes the projection server-side immediately; server omits revoked members; clients MUST NOT render a revoked member's cached projection; short projection TTL (FR-SOC-002) | **Yes** |
  | Manual-entry spoofing: a member faking progress to look good | integrity of `CircleProgress` | **no write path** for a member to set their projection; projections are **server-derived only** from real `GoalState`/`HabitProgress` (FR-SOC-002) | **Yes** |
  | Notification abuse / over-notification via circles | user attention (SC-009) | circle signals route through the **Inbox digest** (rate-limited, deduplicated); Social cannot call a push API directly (ux-foundations §6) | **Yes** |
  | PII / behavior leak in logs | projections, membership | structured logs **redact** finance-derived values and member identifiers; audit trail kept separate (FR-X-014) | **Yes** |
  | Deletion non-compliance: residual circle data after a member deletes their account | memberships, share grants, projections | deletion cascades to all circle data within the **7-day** SLA via crypto-shred/tombstone; dormant-account anonymization (FR-X-019) applies (FR-X-013) | **Yes** |

- **AuthZ enforcement**: Every circle/membership/projection read and every share-grant/revoke is authorized server-side against the requester's **validated session identity** and circle membership (and, for household-joint goals, the `MemberScope`). No client-supplied identifier is trusted. Denied cross-user access is audited (SC-015). This mirrors FR-HH-001 and the platform §5 server-side-authZ + RLS model.
- **Data minimization, retention & revocation**: Social stores only circles, memberships, share grants, and the latest derived projection per member — **never** raw amounts or account data. Revocation and deletion cascade per FR-X-013/FR-X-019. Anything derived solely from an email source (not expected in Social) would still obey the email-revocation cascade.
- **Data residency**: All Social data inherits the Canadian-region residency constraint (FR-X-020); no Social-derived data is processed outside Canada without disclosure and a PIPEDA accountability agreement.

### UI / UX Notes *(references [ux-foundations.md](../_platform/ux-foundations.md))*

- **Tab & IA**: Social is a P4 tab, appearing under "More" (ux-foundations §5.1; label "Social", localized). Module screen follows the §5.2 anatomy: nav bar → conditional Partial Data Banner → primary view (circle list / circle detail with member projection rows) → no Recommendation Cards in MVP (Social produces no money recommendation).
- **Six-state matrix (§3) — all six defined**:
  - **Empty**: no circles → first-run illustration + "Create a circle" / "Créer un cercle"; a circle with only the owner → "Invite people to share progress". Never zero-filled projection rows.
  - **Loading**: skeleton rows matching the projection-list layout (no bare spinners).
  - **Partial**: some members sharing, others "not sharing yet" → persistent Partial Data Banner; non-sharing members shown as a neutral "not sharing yet" row, never a fabricated 0%.
  - **Stale**: a member's projection past its 24 h window → **Stale freshness chip** + "Updated {date}" (flagged, not withheld — dimensionless secondary metric).
  - **Error / Degraded**: source feed down → Unavailable chip + last-known timestamp; never a fabricated projection.
  - **Withheld**: not generally reached in Social (no money input to withhold); reserved for the case where a referenced goal/habit source is **deleted** mid-session → the projection row shows "no longer shared" with a CTA to pick a new metric or close the circle.
- **Components**:
  - **Freshness chip (§4.3)** on every projection row — always visible, bilingual accessible labels.
  - **Confirm-Action sheet (§4.2)** on consent-changing actions (create share grant, **revoke**, delete circle) — these are consequential consent actions; the sheet recaps *what is shared/stopped*, shows the disclaimer, and uses a precise CTA ("Share my progress" / "Partager ma progression", "Stop sharing" / "Cesser de partager"). No money-impact block (there is no amount) — instead a clear "what becomes visible / hidden" recap.
  - **No Recommendation Card / no Conflict Banner** in MVP (Social surfaces no money recommendation and originates no Cash-Safety conflict). If a future `AccountabilitySignal` nudge is rendered, it routes through Inbox, where the Conflict/precedence rules apply.
- **Locale & a11y (§§7–8)**: percentages render `72.5%` (en-CA) / `72,5 %` (fr-CA) via `@finos/format`; dates per §8.3; every interactive element and projection value has a localized EN/FR screen-reader label (e.g. "Maple's goal is 72% complete, updated 2 hours ago" / "L'objectif de Maple est complété à 72 %, actualisé il y a 2 heures"); WCAG 2.1 AA, 44×44 pt targets, dynamic type, reduced-motion (§7).
- **Privacy banner**: in any household-overlapping context, the §10.6 "Viewing {Name}'s finances" rule does not apply (Social never shows a member's finances — only their projection); but the circle detail clearly labels whose projection each row is, and a member's own row is distinguished from peers'.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-S-001 (Zero leakage)**: 0 instances of a circle response or rendered view containing a raw monetary amount, account identifier, or institution name; 100% of shared values are the chosen dimensionless projection (umbrella FR-SOC-001).
- **SC-S-002 (Cross-user safety)**: 0 cross-circle/cross-member data exposures in **API-layer** authorization testing; 100% of denied cross-user accesses are audited (umbrella SC-015).
- **SC-S-003 (Real-data integrity)**: 100% of projections are server-derived from real `GoalState`/`HabitProgress`; 0 API paths allow a member to set their own projection (FR-SOC-002).
- **SC-S-004 (Revocation completeness)**: 100% of revocations remove the member's projection from all other members' views (including cached) within the freshness TTL, and 100% are audited (FR-SOC-002/FR-X-007).
- **SC-S-005 (Household non-leakage)**: 0 circle projections expose or allow inference of a household-joint goal whose `MemberScope` was not extended to the circle (FR-SOC-001).
- **SC-S-006 (Freshness safety)**: 0 projections served past their staleness threshold without a visible stale chip (umbrella SC-006).
- **SC-S-007 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Social strings; 100% of displayed percentages and dates use the active locale's conventions (umbrella SC-008).
- **SC-S-008 (Contract reliability)**: 100% of contracts Social consumes/provides have passing consumer and provider tests in CI before release (umbrella SC-012).
- **SC-S-009 (Deletion compliance)**: 100% of member data-deletion requests cascade to circle memberships, share grants, and projections within the 7-day SLA (umbrella SC-013).
- **SC-S-010 (Notification restraint)**: 0 standalone push notifications emitted by Social; 100% of circle signals route through the Inbox digest (umbrella SC-009).

## Assumptions

- **Spine availability**: Module 0 exposes `GoalState` as a versioned, freshness-stamped contract; Social consumes it and does not re-implement goals or compute amounts. Until a contract is available, the dependent circle metric degrades (shows "not sharing yet" / Unavailable) rather than guessing.
- **Habits dependency (not yet specced)**: `HabitProgress` / `StreakState` (Module 9 Habits — a P3 module **not yet authored**) are consumed when available. Until Habits ships, Social supports **goal-based** circles only (`percentage_complete`, `pace_status` from `GoalState`); habit-streak circles are wired behind a feature check and degrade gracefully. This is a documented, non-blocking dependency.
- **Household dependency**: Module 14 (Household) provides `MemberScope` (the household authorization model). Social consumes it to enforce the household-joint-goal exclusion (FR-SOC-001). The Household contract directory exists but its `MemberScope` schema is **not yet published**; Social's consumer contract test pins the min version and, until published, defaults to the **safe behavior** (exclude all household-joint goals from circles).
- **Invite model**: Existing-FinOS-user-only invite-by-code/link in MVP; no public discovery, no external/email invitees (Simplicity IX).
- **No money movement**: Social is advisory/social only; it moves no money and exposes no money-movement endpoint (constitutional, not a v1 limitation).
- **Staleness window**: 24 h default for circle projections (documented default; user-adjustable; final value in the Module 0 privacy/ops review, platform NR-2).
- **Not regulated advice**: Circle nudges are informational/motivational decision support, not regulated financial advice (surfaced to users).

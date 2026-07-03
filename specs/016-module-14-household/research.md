# Phase 0 Research: Module 14 — Household & Family

**Feature**: `016-module-14-household` | **Date**: 2026-06-29

Resolves the Household-specific technical decisions the design depends on. **Platform-stack choices** (language, datastore, mobile framework, auth/MFA, audit store, residency) are **ratified in [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md)** and are **inherited, not re-litigated** here. This module is **P3** and stays MVP-scoped (Constitution IX): thorough analysis, lean feature set. Items requiring a vendor/source or a product decision are flagged as **non-blocking open items** at the end.

---

## 1. Authorization enforcement model (the module's core risk)

**Decision**: Define roles (`HouseholdRoles`) and per-(viewer, subject, module) grants (`MemberScopes`) as **data contracts**, and enforce them with the **ratified two-layer mechanism**: a service-layer policy engine (`MemberScope` checks, CASL/small RBAC-ABAC) **plus** Postgres **RLS** keyed on `auth.uid()` + household membership (platform-decisions §5). The acting identity always derives from the **validated session**, never a client-supplied `member_id`/`profile_id`. Default for any un-granted tuple is **none** (least privilege). IDOR and horizontal privilege escalation are exercised by **API-layer** authZ tests (not UI), with every denial audited (SC-H-001/003, umbrella SC-015).

**Rationale**: FR-HH-001 mandates server-side enforcement on every cross-user request and explicitly names IDOR + horizontal escalation in the threat model. Reusing the platform's policy-engine + RLS gives defense-in-depth without inventing a parallel mechanism (Principle V; platform-decisions §5, D3). RLS makes "no shared mutable state" real at the DB grant level.

**Alternatives considered**: UI-layer filtering only — **rejected** (explicitly non-compliant with FR-HH-001). App-layer policy checks without RLS — rejected (insufficient for SC-015's zero-exposure bar; RLS is the defense-in-depth net). A bespoke ACL service — rejected (YAGNI; the platform engine + RLS suffice for MVP).

---

## 2. Role set & access-level granularity

**Decision**: MVP roles = **owner, admin, adult, teen, kid** (5). Access levels per (viewer, subject, module) = **none / read / propose** with **no** write/execute level. `owner` is singular and non-removable by others; `admin` manages members/roles/scopes (MFA-gated); `kid` is constrained (no switcher, own-data-only).

**Rationale**: FR-HH-001 (fine-grained roles) and FR-HH-002 (kid money) need a role for guardianship and a constrained minor role, but not more (Constitution IX). Omitting a write/execute level is a **constitutional consequence**, not a feature gap: no member can move another's money (FR-X-003). `propose` cleanly maps to the recommend-only model — a viewer may surface a proposal the subject still executes.

**Alternatives considered**: Two roles (admin/member) only — rejected (cannot express guardianship or kid constraints). A full custom-permission matrix per action — rejected (gold-plating for P3; the per-module read/propose grant is sufficient and testable). Adding a `write` level — rejected (would violate recommend-only).

---

## 3. Compose-over-contracts vs. re-implement

**Decision**: Household **composes a dashboard over other modules' existing contracts** at request time, filtered by `MemberScope` server-side; it holds **no private copy** of another module's state. The umbrella's "consumes all module states, gated by the household authorization layer" is realized as: read each granted module's contract client → apply scope filter server-side → return.

**Rationale**: Principles VII (no shared mutable state) and I (single canonical spine). Re-implementing or caching other modules' state would duplicate logic and create divergence + a second leak surface. Composition keeps Household thin and lets it degrade gracefully when a module is unshipped (FR-X-012).

**Alternatives considered**: A household-owned aggregate read-model copying each module's data — rejected (duplication, staleness, larger blast radius). Direct cross-schema SQL — rejected (banned by the three-layer boundary, platform-decisions §3).

---

## 4. Allowances as tracked ledger, not money movement

**Decision**: Model allowance **accrual** and **"marked paid"** as **integer-cents ledger figures and records of real-world hand-overs** — FinOS disburses nothing. Accrual on chore completion is integer-cents addition; "paid" routes through a Confirm-Action sheet (with the not-regulated-advice disclaimer) recording a guardian's real-world action. All writes are idempotent, keyed on `source_event_id`.

**Rationale**: FR-X-003 / Constitution IV (recommend-only, idempotent). Integer-cents addition is exact and associative — no rounding step, no float, no drift (Money Correctness fixtures). The Confirm-Action sheet is the ratified UX for any consequential action (ux-foundations §2.2).

**Alternatives considered**: An actual disbursement/transfer integration — rejected (constitutionally prohibited money movement). Float dollars for "kid-friendly" simplicity — rejected (Principle IV is un-waivable; `$2.50 ×4` must be exactly `$10.00`).

---

## 5. Freshness windows for household-owned & consumed values

**Decision**: Household-owned state (`HouseholdRoles`, `MemberScopes`, `KidGoals`) is FinOS-derived (`source = derived`) and effectively fresh on write, but is still `FreshnessStamp`-stamped for uniform consumer handling; a revocation is **never** governed by a cached freshness window — it takes effect immediately server-side. Consumed module values (balances via `AccountState`, etc.) carry their **owning module's** freshness; Household surfaces them with the freshness chip and withholds stale **money** inputs (ux-foundations §3). Concrete staleness defaults for consumed values are owned by their source modules (platform-decisions NR-2), not by Household.

**Rationale**: FR-X-008 / Constitution VIII. Authorization correctness (revocation) must be immediate and is orthogonal to data freshness; conflating them would risk serving cached grants (the revocation-race threat). Household does not own external feeds, so it sets no new staleness defaults.

**Alternatives considered**: Treating scope grants as a cacheable freshness-windowed value — rejected (a revocation must be immediate; SC-H-004). Household defining its own staleness windows for consumed data — rejected (those belong to the owning modules).

---

## 6. Partial revocation when a member leaves

**Decision**: When a member leaves, revoke **only that member's** independent aggregation consent/token (their `link_id`, crypto-shredded) while leaving every other member's token intact (FR-CORE-007); set their scopes over others to `none`; remove others' grants over them; audit all changes. Departed-member history is retained under the dormant bound (FR-X-019) and purged on deletion within 7 days (FR-X-013).

**Rationale**: FR-CORE-007 mandates per-member independent grants precisely so a departure does not disrupt others. Consuming `ConnectionConsent` (non-secret link metadata) lets Household drive the repair/revocation UX without ever touching a token (platform-decisions §5, D8).

**Alternatives considered**: Re-authorizing the whole household on a single departure — rejected (disrupts every member; defeats the independent-grant design). Hard-deleting history immediately — rejected (breaks the append-only audit trail; deletion is via crypto-shred + tombstone, platform-decisions D6).

---

## 7. Minor privacy & the `kid` role

**Decision**: The `kid` role is enforced server-side to **own-data-only** with **no profile switcher** (ux-foundations §10.6); guardian visibility into a minor is explicit and **non-reciprocal** (a kid never sees a guardian). A kid who is also a Social circle member exposes only the server-computed `CircleProgress`, excluding any household-scoped `GoalState` not explicitly extended to the circle (FR-SOC-001). Minors' data receives heightened PIPEDA / Québec Law 25 treatment.

**Rationale**: FR-HH-002 + FR-SOC-001 + Constitution V/II. Minors are the most sensitive subjects; the constraint is enforced at the server, not merely hidden in the UI.

**Alternatives considered**: Letting a kid see a "family view" — rejected (over-exposure of guardians'/siblings' finances). Reciprocal guardian↔kid visibility — rejected (a kid does not get visibility into a guardian's finances).

---

## 8. Contract testing approach

**Decision**: Provider contract tests for `HouseholdRoles`, `MemberScopes`, `KidGoals`; consumer contract tests for each consumed contract (`AccountState`, `GoalState`, `MerchantGraph`, `ConnectionConsent`, `CardLineup`, `StatusState`, `HabitProgress`), running in CI (Pact), contracts semver'd with a deprecation window. Version skew **disables** the dependent dashboard panel rather than serving on a mismatched schema.

**Rationale**: Principle VII + FR-X-011 + SC-H-008/SC-012. Because every module **consumes** `MemberScopes`, its provider test is a platform-wide safety gate — a breaking change to the scope contract must fail loudly.

**Alternatives considered**: Integration tests against live modules only — rejected (slow, doesn't pin the schema, no provider guarantee).

---

## 9. Performance: ≤ 300 ms module-switch (FR-X-015)

**Decision**: The Family Dashboard composes cached, freshness-stamped reads of each granted module's contract; the scope filter is applied server-side. A cache miss or stale-beyond-threshold value shows a flagged/withheld or Loading (skeleton) state rather than a blocking fan-out on the hot path. The authorization check itself (session identity + scope lookup) is on the request path and must be fast (indexed scope lookup + RLS).

**Rationale**: FR-X-015 / SC-010 without violating Fresh-or-Flagged (staleness surfaced, never hidden) or authZ correctness (the scope check is never skipped for latency).

**Alternatives considered**: Live fan-out to every module on tab open — rejected (blows the 300 ms budget). Caching the authZ decision aggressively — rejected (a revocation must be immediate; cache the data, re-check the scope).

---

## Open items handed to planning/ops (non-blocking)

- **Adult-age transition threshold** for `kid`/`teen` → `adult` (Clarifications open question 1): household-configurable, default 18; whether province-specific majority (e.g. 19 in BC) drives it — confirmed in planning / the privacy impact assessment.
- **Co-ownership** vs single-owner+admins (Clarifications open question 2) — product confirmation; default is single owner + admins.
- **Departed-member history retention/export** (Clarifications open question 4) — exact dormant window per FR-X-019 set in the Module 0 / planning PIA; whether a guardian can export a leaving member's kid-allowance history before purge.
- **Habits contract availability** — `HabitProgress` consumption is wired behind a feature check until Module 8 ships (P3 ordering); `KidGoals.linked_habit_id` is provided regardless.
- **Heightened-minor-data handling specifics** under PIPEDA / Québec Law 25 — confirmed in the planning-phase PIA (consent model for minors, guardian-mediated deletion/export).

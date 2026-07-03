# Feature Specification: Module 14 — Household & Family

**Feature Branch**: `016-module-14-household`

**Created**: 2026-06-29

**Status**: Draft

**Input**: Umbrella spec [specs/001-finos-platform/spec.md](../001-finos-platform/spec.md) → "Module 14 — Household & Family (Priority: P3)"; functional requirements FR-HH-001..002 and cross-cutting FR-X-001..020; Constitution v2.2.0 (note the v2.2.0 documented-default exception to Principle VI); ratified platform decisions [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and UX foundations [specs/_platform/ux-foundations.md](../_platform/ux-foundations.md). Gold-standard structure mirrored from [specs/002-module-1-rewards/spec.md](../002-module-1-rewards/spec.md).

> **Scope note**: This is a per-module spec carved out of the FinOS umbrella spec. It owns the **Household & Family** tab only: the household membership/role/permission layer and the kid money / chore-allowance submodule. It is a P3 module and stays **MVP-scoped** (Constitution IX): thorough analysis, lean feature set. Module 0 (Spine) is a hard dependency. Cross-cutting requirements (FR-X-*) are inherited from the umbrella and restated only where they bind a Household behavior.
>
> **Critical boundary**: Household is the **authorization surface** of FinOS — its highest-sensitivity responsibility. It **defines** roles (`HouseholdRoles`) and per-module grants (`MemberScopes`) that **every other module enforces server-side**. Household does NOT re-implement other modules' logic; it composes a cross-member dashboard over their existing contracts, always filtered by a viewer's scope. The `MemberScope` data contract is provided here, but **enforcement lives in every module's server-side authZ** (FR-HH-001, platform-decisions §5), not in this UI.
>
> **Recommend-only**: Household introduces no money movement. Kid allowances are tracked ledger figures and "paid" is a record of a real-world hand-over the guardian performs — FinOS never disburses funds (FR-X-003).

## User Scenarios & Testing *(mandatory)*

Household & Family multiplies FinOS's value across every module — one financial OS for a couple, a family, or a multi-generational household — while introducing the most sensitive authorization surface in the product. Its two jobs: (1) give each member exactly the visibility they were granted into others' finances, enforced server-side on every request and audited on denial; and (2) let a family run chore-based allowances and kid-friendly savings goals that advance from real activity, never from a manual fudge.

### User Story 1 - Fine-grained household roles & per-module visibility (Priority: P1 within module)

A household owner adds members and assigns each a role and per-module visibility scopes; every member then sees exactly the modules and members' data they were granted — and nothing else — with the boundary enforced on every cross-user request.

**Why this priority**: This is the module's reason to exist and the prerequisite for everything else it does. The Family Dashboard, kid money, and any multi-profile view all depend on the role/scope model being correct and enforced first. It is also the highest-risk surface in FinOS (umbrella "introduces the most sensitive authorization surface").

**Independent Test**: Add a second household member with read-only access to exactly one module (e.g. Bills) and confirm they can see that module's data for the granted subject and nothing else — verified at the **API layer**, not just the UI — and confirm an attempt to read an un-granted module/member is denied and audited.

**Acceptance Scenarios**:

1. **Given** a household with multiple members, **When** roles and per-module scopes are assigned, **Then** each member's visibility is enforced per module (least privilege) and authorization is checked **server-side on every cross-user request** (FR-HH-001).
2. **Given** a member without permission for a module/subject, **When** they request that data (including by supplying another member's `profileId` directly in an API call), **Then** access is denied — the client-supplied id is NOT trusted — and the denied attempt is **audited** (FR-HH-001, SC-015).
3. **Given** an fr-CA member, **When** the Family Dashboard renders roles, scopes, and any CAD figure within scope, **Then** all labels are in French and money is formatted `1 234,56 $` (trailing symbol, comma decimal, space thousands), not `$1,234.56` (FR-X-005).
4. **Given** a member's scope is revoked, **When** they next open that module/member view, **Then** they see the **Empty state immediately with no cached data** (ux-foundations §5.5), and the revocation is audited.
5. **Given** a member is granted only `read` (not `propose`) on a subject's Bills, **When** they view it, **Then** they can see the data but cannot initiate any recommend-only proposal against it; and **given** no member can ever move another member's money (there is no `write`/`execute` level), the system surfaces only proposals the subject executes themselves (FR-X-003).

---

### User Story 2 - Chore-based allowances & kid-friendly goals (Priority: P2 within module)

A guardian sets up a chore-based allowance for a child; when the child completes a chore, the allowance accrues and advances the child's kid-friendly savings goal, shown on a simple tracker the child can understand.

**Why this priority**: The second of the module's two submodules (Kid Money & Allowances). It is independently valuable once the role/scope layer (US1) exists — a kid is just a constrained member — and delivers the family-facing payoff. It is P2-within-module because it depends on US1's role model (a `kid` role, guardian relationships) being in place.

**Independent Test**: Set up a chore-based allowance linked to a kid's goal, mark a chore complete, and confirm the allowance accrues by the exact reward amount, the goal's saved amount advances by the same exact cents, and the kid (signed in as the constrained `kid` role) sees only their own updated tracker.

**Acceptance Scenarios**:

1. **Given** a chore-based allowance linked to a kid's goal, **When** the child completes the chore, **Then** the allowance accrues and the linked goal's saved amount advances on the kid-friendly tracker (FR-HH-002), in **exact integer cents** with no float drift.
2. **Given** a chore completion is recorded twice (e.g. a retried request), **When** the second arrives, **Then** the accrual is **not** double-applied — the write is idempotent, keyed on the source event id (FR-X-003).
3. **Given** a chore is also linked to a Habits streak, **When** the child completes it, **Then** the habit streak advances from the **real** completion event (never a manual bump), per the Habits consumption of `KidGoals` (FR-HH-002).
4. **Given** a guardian records an allowance as "paid", **When** they confirm it, **Then** it is recorded as a real-world hand-over through a Confirm-Action sheet (with the "not regulated financial advice" disclaimer) — **FinOS does not transfer any money** (FR-X-003); the record is idempotent.
5. **Given** a child signed in with the `kid` role, **When** they open the app, **Then** they see only their own goals/habits, **no** profile switcher, and no other member's finances (ux-foundations §10.6).
6. **Given** an fr-CA child, **When** a CAD goal amount and chore reward are shown, **Then** they are formatted `5,00 $` etc. and FinOS-template chore labels appear in French (FR-X-005).

---

### User Story 3 - Family Dashboard composed over consented module data (Priority: P3 within module)

A household member opens a Family Dashboard that surfaces, per member, only the module data that member granted them — balances, goals, rewards status, bills — each within scope, freshness-stamped, and clearly attributed to whose finances are shown.

**Why this priority**: The aggregating view that ties the household together. It is lowest priority because it depends on US1 (scopes) and on other modules having shipped contracts to compose; it degrades gracefully when a module is absent. It adds convenience over US1's correctness.

**Independent Test**: With two members who have each granted the viewer `read` on different modules, open the Family Dashboard and confirm each member's panel shows only their granted modules, each value carries a freshness chip, and the "Viewing {Name}'s finances" attribution is unambiguous; confirm a panel for a module that has not shipped (or a stale feed) shows the Empty/Unavailable state, not fabricated data.

**Acceptance Scenarios**:

1. **Given** members who granted the viewer different per-module scopes, **When** the dashboard renders, **Then** each member panel shows **only** the granted modules' data, filtered server-side before transmission (FR-HH-001).
2. **Given** a consumed module value is stale, **When** the panel renders, **Then** the value carries a Stale freshness chip and any dependent money figure is flagged/withheld rather than shown as current (Constitution VIII; ux-foundations §3).
3. **Given** a consumed module has not yet shipped (P2/P3/P4 ordering) or its feed is down, **When** the dashboard renders, **Then** the panel shows the Empty/Unavailable state — never a zero-filled or fabricated figure (ux-foundations §3, §10.1).
4. **Given** the viewer switches to a member's view, **When** any screen renders, **Then** a persistent "Viewing {Name}'s finances" banner with a one-tap "Back to my finances" is shown (ux-foundations §5.5, §10.6).

---

### Edge Cases

- **Empty / no household**: A single-user account has no household; the Household tab shows the first-run Empty state (create or join a household), never zero-filled member panels (ux-foundations §10.1, §10.5).
- **Empty / partial connectivity**: A member who has connected no accounts contributes an Empty panel; a member with some accounts connected shows the Partial Data Banner and an "Incomplete data" chip on any computed figure (ux-foundations §3). The dashboard never implies completeness it doesn't have.
- **Stale / missing consumed inputs**: When any consumed contract (`AccountState`, `GoalState`, `CardLineup`, etc.) is stale or absent, the corresponding panel flags or withholds and asks the user — it never guesses a money input (Fresh or Flagged; Explainable & Auditable). A stale **money** input (a member's balance) withholds; a stale **secondary** value flags.
- **Conflicting advice with Cash Safety precedence**: If a household-level suggestion (e.g. "this member could contribute to a shared goal") would conflict with that member's own Cash Safety `SafeToActSignal` (overdraft risk), Cash Safety **takes precedence**; the Conflict Banner names both signals and the resolution (ux-foundations §3.1, §10.4). Household never overrides a member's safety signal.
- **Multi-currency**: A member's foreign-currency balance surfaced on the dashboard is converted to CAD via a timestamped FX rate (consumed from the spine's conversion); a stale rate flags the converted figure (umbrella multi-currency edge case). Household performs no FX math itself.
- **Idempotency / retries**: Chore-completion, allowance-accrual, and "marked paid" writes are idempotent, keyed on `source_event_id`; a replay never double-accrues or double-records (FR-X-003). Membership/role changes are likewise idempotent.
- **Cross-user boundaries (IDOR / horizontal escalation)**: Any request crossing a household boundary without authorization — including one that supplies another member's `member_id`/`profile_id` in the request body — is denied and audited; the acting identity always derives from the validated session, never a client-supplied id (FR-HH-001; see Threat Model).
- **Owner / last-admin protection**: The household `owner` cannot be removed or demoted by another member; an attempt is denied and audited. A household always retains at least one `owner`/`admin` who can manage it.
- **Member leaves**: When a member leaves, their independent aggregation consent is **partially revoked** (their `link_id` token destroyed; others' tokens untouched — FR-CORE-007), their scopes over others become `none`, and others' grants over them are removed; all changes are audited. Their historical chore/allowance records are retained per the retention policy, not silently deleted.
- **Minor ages up**: A `kid`/`teen` who reaches the household's configured adult age can be transitioned by a guardian to `adult`; the transition is audited and removes the `kid` UI constraints. (The exact age and whether transition is manual or prompted is a Clarification.)
- **Kid privacy vs guardian visibility**: A guardian sees a kid's goals/allowances by guardian relationship; a kid never sees a guardian's or sibling's finances (no switcher). A kid who is **also** a Social circle member exposes only the server-computed `CircleProgress`, never household-scoped data (FR-SOC-001; ux-foundations §10.6).
- **Contract version skew**: A breaking change in a consumed contract without a consumer migration disables that dashboard panel (contract tests fail in CI) rather than serving on a mismatched schema (umbrella edge case, SC-012).
- **Bilingual integrity**: A role label, scope label, chore-template label, or alert missing an EN or FR translation is a defect, not silently shown in one language (FR-X-005).
- **Revocation race**: If a scope is revoked while a viewer is mid-session on that panel, the panel transitions to the Empty state in-place with no cached value retained (ux-foundations §5.5, §10.3).

## Clarifications

This module makes the following decisions to stay non-blocking (Constitution IX, "resolve ambiguity yourself and document it"). Items needing product confirmation are also listed in the **Open Questions for the product owner** subsection — none blocks authoring or planning.

### Session 2026-06-29 (decisions taken)

- **Q: What roles does the MVP support?** → A: **owner, admin, adult, teen, kid** (5 roles). `owner` is the founder (exactly one, non-removable by others); `admin` can manage members/roles/scopes (step-up MFA gated, FR-X-017); `adult` is a standard member; `teen` is a limited self-manager with guardian visibility; `kid` is the constrained role (no switcher; sees only own goals/habits). This is the lean set that satisfies FR-HH-001 (fine-grained roles) and FR-HH-002 (kid money) without gold-plating (Constitution IX).
- **Q: What is the access-level granularity per (viewer, subject, module)?** → A: **none / read / propose** — and intentionally **no** `write`/`execute` level, because no member may ever move another member's money (FR-X-003). `propose` adds the ability to surface a recommend-only proposal the subject still executes themselves.
- **Q: Default grant for an un-specified (viewer, subject, module) tuple?** → A: **none** (least privilege, Constitution V). Visibility is opt-in per module, never default-on.
- **Q: Who controls a subject's scopes?** → A: The **subject** controls grants over their own data (a member shares their finances; it is not imposed). **Exception**: guardian visibility over a `kid`/`teen` is configured by the household `owner`/`admin`, reflecting real-world guardianship.
- **Q: Are allowances real money movement?** → A: **No.** Allowance accrual and "paid" are **tracked ledger figures and records of real-world hand-overs**; FinOS never disburses (FR-X-003). This keeps the module fully within the recommend-only constraint.
- **Q: Does Household re-implement each module, or compose over contracts?** → A: **Compose.** Household reads other modules' existing contracts at request time, filtered by `MemberScope` server-side; it holds no private copy of their state (single-canonical-spine + no-shared-mutable-state, Principles VII/I).
- **Q: How are `HouseholdRoles`/`MemberScopes` enforced?** → A: They are **data contracts describing grants**, not the enforcement point. Enforcement is **server-side** in every module's authZ (policy engine `MemberScope` checks + Postgres RLS, platform-decisions §5). Reading these contracts on the client never substitutes for server enforcement.

### Open Questions for the product owner (non-blocking; sensible defaults assumed)

1. **Adult-age threshold for `kid`/`teen` → `adult` transition.** Options: (a) household-configurable age (default **18**, a Canadian-majority default that varies by province); (b) fixed 18; (c) manual-only transition with no age. **Assumed default for now: (a) household-configurable, defaulting to 18, transition prompted to a guardian but applied manually.** Confirm the default and whether province-specific majority (e.g. 19 in BC/some provinces) should drive it.
2. **Can two adults co-own a household (co-owners) or is `owner` strictly singular?** **Assumed: single `owner` + multiple `admin`s** (admins have effectively equal management power; this avoids ambiguous co-ownership while still letting a partner manage). Confirm whether true co-ownership is required for MVP.
3. **Does a `teen` get a (restricted) profile switcher or none?** **Assumed: none for MVP** (only `adult`/`admin`/`owner` switch profiles; `teen` self-manages but does not view others). Confirm.
4. **Retention of a departed member's chore/allowance history.** **Assumed: retained under the standard dormant-account retention bound (FR-X-019) and purged on a deletion request (FR-X-013).** Confirm whether a leaving member's kid-allowance history should be exportable to a guardian before purge.

## Requirements *(mandatory)*

### Functional Requirements

Module-owned (from umbrella FR-HH-*):

- **FR-HH-001 (Roles, scopes & server-side authZ)**: System MUST enforce fine-grained, per-module roles/permissions with authorization checked **server-side on every cross-user request**, denying and auditing unauthorized access. All cross-user boundary checks MUST be enforced server-side and MUST NOT trust any client-supplied parameter (e.g. a `member_id`/`profile_id` in the request) as the source of truth; UI-layer filtering alone does NOT satisfy this requirement. The acting identity MUST derive from the validated session. The default grant for any un-specified (viewer, subject, module) tuple is **none** (least privilege). A revoked scope MUST take effect immediately (no cached data shown). The Household threat model (below) MUST enumerate **IDOR** and **horizontal privilege escalation** as explicit attack scenarios with mitigations. Changing household roles/scopes MUST require **step-up MFA** (FR-X-017).
- **FR-HH-002 (Chore-based allowances & kid goals)**: System MUST support chore-based allowances and kid-friendly goal trackers. Allowance reward amounts and goal targets/saved amounts MUST be stored and computed in **integer minor units (CAD cents)** — never binary float (FR-X-002). On a chore completion, the linked allowance MUST accrue the exact reward amount and any linked goal's saved amount MUST advance by the same exact cents; the write MUST be **idempotent**, keyed on the source event id (FR-X-003). A chore MAY link to a Habits streak that advances only from the **real** completion event (provided via `KidGoals` to Habits). Allowance accrual and "marked paid" are **tracked figures / records of real-world hand-overs** — FinOS MUST NOT move money (FR-X-003). The `kid` role MUST see only their own goals/habits with no profile switcher.

Cross-cutting requirements inherited from the umbrella that bind this module (full text in [001 spec](../001-finos-platform/spec.md)): **FR-X-001** (Integration — household suggestions read real member state), **FR-X-002** (Money exactness — kid allowances/goals), **FR-X-003** (Recommend, never move — allowances are tracked, not disbursed; idempotent writes), **FR-X-004** (CAD + time-to-goal — kid goals show time-to-goal), **FR-X-005** (Bilingual & locale-correct formatting — roles/scopes/chore labels EN/FR), **FR-X-006** (Explainability — any household-level suggestion carries inputs+reasoning), **FR-X-007** (Audit trail — every membership/role/scope change and every denied cross-user access is audited), **FR-X-008** (Freshness — consumed module values carry freshness; stale flagged/withheld), **FR-X-010** (Least privilege & threat model — MANDATORY here), **FR-X-011** (Contracts & versioning — consumer+provider tests), **FR-X-012** (Graceful degradation — absent modules/feeds show Empty/Unavailable), **FR-X-013/FR-X-019** (deletion / dormant retention — departed-member data), **FR-X-014** (Observability/redaction — PII/money redacted in logs; audit separate), **FR-X-015** (Performance ≤300 ms), **FR-X-016** (Accessibility — bilingual SR labels), **FR-X-017** (MFA gates for role/scope changes), **FR-X-020** (Data residency).

### Key Entities *(include if feature involves data)*

Consumed (read-only contracts, not owned here; gated by the household authZ layer): `AccountState`, `GoalState`, `MerchantGraph`, `ConnectionConsent` (Module 0); `CardLineup`, `StatusState` (Module 1 Rewards); `HabitProgress` (Module 8 Habits); a member's own `SafeToActSignal` (Module 3 Cash Safety) for conflict precedence.

Owned/provided by this module:

- **Household**: A family unit with a stable id and members. **Provided** as `HouseholdRoles`.
- **Member / Membership**: A profile's membership edge in a household, with a role (`owner`/`admin`/`adult`/`teen`/`kid`), status, and (for minors) guardian relationships. **Provided** via `HouseholdRoles`.
- **MemberScope / Grant**: A per-(viewer, subject, module) access grant (`none`/`read`/`propose`) — the contract that **every module enforces server-side**. **Provided** as `MemberScopes`.
- **KidGoal**: A minor's kid-friendly savings goal with a CAD target and saved amount (integer cents) and computed time-to-goal. **Provided** as `KidGoals` to Goals (Spine) and Habits.
- **Allowance / ChoreReward**: A chore-based allowance definition (bilingual chore label, CAD reward per completion, cadence, optional links to a `KidGoal` and a Habits streak) and its accrual ledger (accrued / paid). **Provided** via `KidGoals`.
- **AuditEvent**: An immutable, append-only record of every membership/role/scope change, every chore completion / accrual / "marked paid", and **every denied cross-user access** (Principle VI / FR-X-007, SC-015).

### Money Correctness *(MANDATORY — this feature computes and displays monetary values via Kid Money & Allowances)*

- **Numeric representation**: Allowance reward amounts, kid-goal targets, saved/accrued/paid amounts are **integer minor units (CAD cents)** via `MoneyCents`. There are **no rates/multipliers** owned by this module (it performs no FX or points math). No binary floating point anywhere.
- **Rounding rules**: Accrual is **integer-cents addition** — exact and associative, no rounding step needed (each chore reward is already an integer cents value). Time-to-goal days are computed deterministically from the accrual pace; the divide is performed in arbitrary precision and rounded to whole days, never on money. Any CAD figure surfaced from a consumed contract (e.g. a member's balance) is already rounded by its owning module; Household never re-rounds money.
- **Currency & locale**: CAD throughout, with time-to-goal context on kid goals (FR-X-004); en-CA and fr-CA locale-correct formatting (fr-CA `5,00 $`, `1 234,56 $`), via `@finos/format` only.
- **Determinism & fixtures**: Accrual and goal-advance math are pure and deterministic. Mandatory fixtures: **(a)** completing a `$2.50` chore 4× accrues exactly `1000` cents (`$10.00`) with no drift; **(b)** a goal with target `5000` cents and saved `1000` cents advances to `1500` cents on a `$5.00` chore — never `1499`/`1501`; **(c)** a **replayed** chore-completion event (same `source_event_id`) does **not** double-accrue (idempotency fixture); **(d)** fr-CA formatting fixture: `1000` cents renders `10,00 $`, not `$10.00`.
- **Idempotency**: Chore-completion, allowance-accrual, "marked paid", and membership/role/scope writes are keyed on `source_event_id` with a `UNIQUE` constraint; replays never double-apply (FR-X-003, platform-decisions §4).
- **Recommend-only**: Confirmed — Household moves no money. Allowance accrual is a tracked ledger figure; "paid" records a real-world hand-over the guardian performs through a Confirm-Action sheet; no FinOS endpoint disburses funds (FR-X-003, SC-007).

### Security & Privacy Threat Model *(MANDATORY — this module is the cross-user authorization surface and touches other people's financial data, including minors')*

Household is the **most authorization-sensitive module in FinOS**. This threat model is a hard gate (Constitution V; FR-X-010; umbrella FR-HH-001 mandates enumerating IDOR + horizontal privilege escalation).

- **Assets**: Every member's per-module financial data exposed through the dashboard (balances via `AccountState`, goals, rewards `CardLineup`/`StatusState`, bills, etc.); the household membership graph and role/scope grants; minors' allowance/goal data; the existence and composition of the household itself (a privacy-sensitive fact); aggregation **consent state** (`ConnectionConsent`, never the token).
- **Trust boundaries / actors**: The acting member (from the validated session); other household members at varying roles; guardians vs minors; the household `owner`/`admin` (privileged management); product modules (each enforcing `MemberScope`); the spine (read-only provider); a member who has **left**; an attacker with a valid session for one member attempting to reach another's data.
- **Threats & mitigations**:

  | Threat | Affected asset | Mitigation | Enforced server-side? |
  |--------|----------------|------------|-----------------------|
  | **IDOR** — a member supplies another member's `member_id`/`profile_id` to read their data | any subject's module data, kid goals | authZ keyed on the **validated session identity**, never a client-supplied id; the `MemberScope` grant is looked up server-side; **Postgres RLS** on every household-scoped table as defense-in-depth (platform-decisions §5) | **Yes** (UI filtering alone is non-compliant) |
  | **Horizontal privilege escalation** — an `adult`/`teen` acts as `admin`/`owner` to change roles/scopes | role/scope grants, whole-household integrity | role checks server-side; role/scope mutations require the `admin`/`owner` role **and step-up MFA** (FR-X-017); `owner` non-removable/non-demotable by others | **Yes** |
  | **Stale scope / revocation race** — revoked member still sees cached data | revoked subject's data | revocation effective immediately server-side; consumers MUST NOT serve cached grants once revocation observed; revoked member sees Empty state (ux-foundations §5.5) | **Yes** |
  | **Minor-data over-exposure** — a kid sees a guardian's/sibling's finances, or a sibling sees the kid's | minors' & guardians' data | `kid` role has no switcher and a hard server-side scope to only-own data; guardian visibility is explicit, not reciprocal (ux-foundations §10.6) | **Yes** |
  | **Departed-member token leakage** — a leaver retains live aggregation access | aggregation consent/token | **partial revocation**: only the leaver's `link_id` token is destroyed (crypto-shred), others untouched (FR-CORE-007); cascades within the 7-day deletion SLA (FR-X-013) | **Yes** |
  | **Household-existence inference via Social** — a circle member infers a household partner's existence/cadence | household composition | `CircleProgress` is a server-computed projection only; circle projections exclude household-scoped `GoalState` not explicitly extended to the circle (FR-SOC-001) | **Yes** |
  | **PII / monetary leak in logs** | member balances, kid amounts, membership | structured logs redact PII + monetary values; the append-only audit trail (which records full membership/scope changes and denials) is kept **separate** from debug logs (FR-X-014) | **Yes** |
  | **Token/secret exposure via a contract** | aggregation tokens | no provided/consumed contract carries a token; `ConnectionConsent` exposes only non-secret link metadata (FR-CORE-007) | **Yes** |

- **AuthZ enforcement**: Every cross-user read/proposal is enforced server-side against the requester's session identity and the looked-up `MemberScope`; no client-supplied identifier is trusted. Enforcement is two-layer: a service-layer policy engine (`MemberScope` checks) **and** Postgres RLS keyed on `auth.uid()` + household membership (platform-decisions §5). **Every denied cross-user access is audited** (SC-015).
- **MFA gates (FR-X-017)**: Changing household roles/scopes (and inviting/removing members) requires **step-up MFA**; password-only is rejected. (Issuing/revoking aggregation tokens is owned by Module 0, also MFA-gated.)
- **Data minimization, retention & revocation**: Household stores only membership, role/scope grants, and kid-allowance/goal ledger state — never a private copy of another module's financial data. A departed member's links are partially revoked (FR-CORE-007); their data is retained under the dormant bound (FR-X-019) and purged on a deletion request within 7 days (FR-X-013), cascading across household + the modules holding their derived state.
- **Data residency**: All household data inherits the Canadian-region residency constraint (FR-X-020); no household-derived PII (including minors') is processed outside Canada without disclosure and a PIPEDA accountability agreement. Minors' data is treated with heightened sensitivity under PIPEDA/Québec Law 25.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-H-001 (Household safety — zero cross-user exposure)**: 0 cross-user data exposures in authorization testing exercised at the **API layer** (not only the UI); 100% of denied cross-user accesses are audited (umbrella SC-015, FR-HH-001).
- **SC-H-002 (Least-privilege default)**: 100% of (viewer, subject, module) tuples with no explicit grant resolve to **no access**; 0 default-on visibility leaks.
- **SC-H-003 (Server-side enforcement)**: 100% of cross-user reads/proposals are enforced server-side against the session identity; 0 cases where a client-supplied `member_id`/`profile_id` is trusted as the authorization source (verified by IDOR tests at the API layer).
- **SC-H-004 (Revocation immediacy)**: Upon scope revocation, 100% of subsequent requests by the revoked viewer are denied with **no cached data served**; the revocation is audited.
- **SC-H-005 (Allowance exactness)**: 0 cent-level drift across the Money Correctness fixtures; 100% of allowance/goal math uses integer minor units (no float); 100% of replayed chore-completion events are idempotent (no double-accrual).
- **SC-H-006 (Recommend-only)**: 0 instances of FinOS moving money for an allowance; 100% of "paid" actions are recorded via a Confirm-Action sheet as real-world hand-overs the guardian executes (umbrella SC-007, FR-X-003).
- **SC-H-007 (Bilingual parity & locale formatting)**: 0 single-language leaks in shipped Household strings (roles, scopes, chore-template labels, alerts); 100% of displayed CAD/percentage/date values use the active locale's conventions (fr-CA `1 234,56 $`) (umbrella SC-008).
- **SC-H-008 (Contract reliability)**: 100% of contracts this module provides (`HouseholdRoles`, `MemberScopes`, `KidGoals`) and consumes have passing consumer + provider tests in CI before release; 0 breaking changes ship without a migration plan + deprecation window (umbrella SC-012).
- **SC-H-009 (Kid privacy)**: 0 instances of a `kid`-role account seeing another member's finances or being offered a profile switcher; 100% of guardian↔minor visibility is explicit and non-reciprocal (ux-foundations §10.6).
- **SC-H-010 (Graceful degradation)**: 100% of dashboard panels for an absent/unshipped module or a down feed show the Empty/Unavailable state — 0 fabricated or zero-filled figures (umbrella FR-X-012; ux-foundations §3).
- **SC-H-011 (Auditability)**: 100% of membership/role/scope changes, chore completions/accruals/"paid" records, and denied cross-user accesses are recorded in the append-only audit trail (FR-X-007).
- **SC-H-012 (MFA-gated management)**: 100% of role/scope changes and member invites/removals require step-up MFA; 0 such mutations succeed on password-only (FR-X-017).

## Assumptions

- **Spine availability**: Module 0 exposes `AccountState`, `GoalState`, `MerchantGraph`, and `ConnectionConsent` as versioned, freshness-stamped contracts; Household consumes them and never re-aggregates. Until a contract is available, the dependent dashboard panel degrades (shows Empty/Unavailable) rather than fabricating data.
- **Module ordering**: Household is **P3**; several modules it can compose on the dashboard (Bills P2, Habits P3, Social P4, etc.) may ship before or after it. Household degrades gracefully for any not-yet-shipped module (FR-X-012) and is independently shippable with just the spine + role/scope layer (US1) per its Independent Test.
- **Cash Safety dependency for conflict resolution**: A member's `SafeToActSignal` (Module 3) takes precedence over any household-level suggestion; until Cash Safety ships, Household surfaces no spend-positive household suggestion that could conflict.
- **Authorization enforcement is platform-provided**: The server-side policy engine (`MemberScope` checks) and Postgres RLS are ratified platform mechanisms (platform-decisions §5); this module **defines** the grants and **relies on** that enforcement, it does not invent a parallel mechanism.
- **No money movement**: Allowances are tracked ledger figures and "paid" records real-world hand-overs; this is a constitutional constraint, not a v1 limitation (FR-X-003).
- **Minors' data**: Kid accounts and their data receive heightened privacy treatment under PIPEDA / Québec Law 25; the adult-age transition threshold is a household-configurable default (see Clarifications open question 1).
- **Not regulated advice**: Any household-level financial suggestion is informational decision support, not regulated advice (surfaced to users).

# Quickstart & Validation: Module 14 — Household & Family

**Feature**: `016-module-14-household` | **Date**: 2026-06-29

A run/validation guide proving Household works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories, threat model, and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `AccountState`, `GoalState`, `MerchantGraph`, `ConnectionConsent`. Product-module contracts `CardLineup`/`StatusState` (Module 1) and `HabitProgress` (Module 8) optional — their dashboard consumers are **feature-checked** and degrade to Empty/Unavailable when absent. A member's `SafeToActSignal` (Module 3) optional — used for conflict precedence.
- Two-layer server-side authZ available: the policy engine (`MemberScope` checks) **and** Postgres RLS on household-scoped tables (platform-decisions §5).
- Step-up MFA available for role/scope mutations and member invites/removals (FR-X-017).
- Seeded fixtures: a household with ≥2 adult members + ≥1 `kid`, a `MemberScope` grant set, a kid goal, and a chore-based allowance linked to that goal.
- Toolchain per the ratified platform plan (see [plan.md](./plan.md) Technical Context). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
pnpm install
pnpm run seed:household-fixtures      # household, members (incl. kid), scopes, kid goal, allowance
```

## Validation by user story

### US1 — Fine-grained roles & per-module visibility (P1 within module)

```bash
pnpm test household/security/authz          # API-layer, NOT UI
pnpm test household/security/rls            # Postgres RLS policy tests
pnpm test household/unit/scope-resolution
pnpm test household/integration/roles-scopes
```

Expected:
- A member granted `read` on exactly one module/subject sees **only** that data — verified at the **API layer**, not just the UI (SC-H-001/003).
- **IDOR (mandatory)**: a request supplying another member's `member_id`/`profile_id` in the body is **denied** — the client-supplied id is NOT trusted; the acting identity derives from the validated session; the denial emits a `cross_user_access_denied` audit event (SC-H-001/003, SC-015).
- **Horizontal escalation (mandatory)**: an `adult`/`teen` attempting a role/scope mutation is denied; the mutation requires `admin`/`owner` **and step-up MFA** (SC-H-012); the `owner` cannot be removed/demoted by another member.
- **Least privilege**: an un-granted (viewer, subject, module) tuple resolves to **none** — 0 default-on leaks (SC-H-002).
- **Revocation immediacy**: after a scope is revoked, the next request by that viewer is denied with **no cached data served**, and the revocation is audited (SC-H-004).
- An fr-CA member sees French role/scope labels and any in-scope CAD figure as `1 234,56 $` (SC-H-007).

### US2 — Chore-based allowances & kid-friendly goals (P2 within module)

```bash
pnpm test household/unit/allowance-money     # integer-cents fixtures
pnpm test household/unit/idempotency
pnpm test household/integration/kid-money
```

Expected:
- **Money fixture (mandatory)**: a `$2.50` chore completed 4× accrues exactly `1000` cents (`$10.00`) — no float drift (SC-H-005).
- **Goal-advance fixture (mandatory)**: a goal with target `5000` cents and saved `1000` cents advances to **exactly** `1500` cents on a `$5.00` chore — never `1499`/`1501` (SC-H-005).
- **Idempotency fixture (mandatory)**: a replayed chore-completion event (same `source_event_id`) does **not** double-accrue (SC-H-005, FR-X-003).
- A chore linked to a Habits streak advances the streak from the **real** completion event only (never a manual bump), via `KidGoals` → Habits.
- Recording an allowance "paid" routes through a **Confirm-Action sheet** with the "not regulated financial advice" disclaimer and records a real-world hand-over — **FinOS moves no money** (SC-H-006); the "paid" write is idempotent.
- A `kid`-role sign-in sees **only their own** goals/habits, **no** profile switcher, and no other member's finances (SC-H-009).
- **fr-CA fixture (mandatory)**: `1000` cents renders `10,00 $` (not `$10.00`); FinOS-template chore labels appear in French (SC-H-007).

### US3 — Family Dashboard composed over consented data (P3 within module)

```bash
pnpm test household/integration/family-dashboard
pnpm test household/unit/dashboard-degradation
```

Expected:
- Each member panel shows **only** the granted modules' data, filtered **server-side before transmission** (SC-H-001).
- Every consumed value carries a `FreshnessStamp`; a stale **money** input (a member's balance) withholds the dependent figure (Withheld state), a stale **secondary** value flags with a stale chip (SC-H-010; ux-foundations §3).
- A consumed module that has **not shipped** (P2/P3/P4 ordering) or whose feed is down renders the **Empty/Unavailable** state — 0 zero-filled or fabricated figures (SC-H-010; ux-foundations §3, §10.1).
- A persistent **"Viewing {Name}'s finances"** banner with a one-tap "Back to my finances" appears on every screen while viewing a member (ux-foundations §5.5, §10.6).
- **Conflict precedence**: a household suggestion conflicting with that member's `SafeToActSignal` (overdraft risk) yields the **Conflict Banner**; Cash Safety **takes precedence**; Household never overrides a member's safety signal (ux-foundations §3.1, §10.4).

## Contract tests (mandatory — Principle VII / SC-H-008)

```bash
pnpm test household/contract/provided   # HouseholdRoles, MemberScopes, KidGoals
pnpm test household/contract/consumed   # AccountState, GoalState, MerchantGraph, ConnectionConsent, CardLineup, StatusState, HabitProgress
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken consumed schema **fails CI** and disables the dependent dashboard panel (version-skew behavior, SC-012). `HouseholdRoles`/`MemberScopes` carry **no** monetary value and **no** secret; `KidGoals` amounts are `MoneyCents` integer cents — asserted in the provider tests.

## Cross-cutting checks

- **Recommend-only (SC-H-006 / FR-X-003)**: grep the Household API surface — there is **no** money-movement / disbursement endpoint; "paid" is a recorded real-world hand-over, allowance accrual is a tracked ledger figure.
- **Threat-model mitigations (Principle V — MANDATORY)**: API-layer tests prove **0 cross-user exposures**, every denial audited (SC-H-001/011); IDOR + horizontal-escalation + revocation-race scenarios from the spec Threat Model are each exercised; departed-member **partial revocation** destroys only that member's `link_id` token (others untouched, FR-CORE-007).
- **Audit trail (Principle VI)**: `member_invited`/`role_changed`/`scope_granted`/`scope_revoked`/`chore_completed`/`allowance_accrued`/`allowance_marked_paid`/`kid_goal_advanced`/`cross_user_access_denied` produce append-only `AuditEvent`s, kept **separate** from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no PII, no member balances, and no kid allowance amounts.
- **Residency (FR-X-020)**: household data (incl. minors') stored/processed in a Canadian region; no household-derived PII processed out-of-region without disclosure + a PIPEDA accountability agreement.
- **Performance (SC-010)**: module-switch into Household renders membership + cached dashboard panels in ≤ 300 ms; a slow/stale upstream renders a flagged Empty/Unavailable state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual (EN/FR) screen-reader labels on interactive elements (role/scope controls, the "Viewing {Name}" banner, the kid tracker, Confirm-Action sheet).

## Done when

All user-story validations pass, the integer-cents money + idempotency fixtures show zero drift / no double-accrual, the **API-layer authZ tests show zero cross-user exposure with every denial audited**, all consumer+provider contract tests are green, and the cross-cutting checks (recommend-only, threat-model mitigations, redaction, residency, perf, a11y) hold.

# Consumed Contracts (referenced — owned by other modules)

Household accesses these **only** through their versioned contract clients, never via direct storage (preserves the swappable-spine boundary and the three-layer module isolation, Principle VII / platform-decisions §3). Schemas live in the owning module's spec; they are listed here so Household's **consumer** contract tests pin the exact versions it depends on (SC-012).

> Household is the most authorization-sensitive consumer in FinOS. It does **not** widen any consumed contract: it surfaces another member's data **only** within that member's explicit `MemberScope` grant, enforced server-side. Consuming a contract here NEVER bypasses the owner's least-privilege grant.

> Every consumed contract is pinned by the **owner's real canonical `$id`** (`finos:<area>/<Name>/<semver>`) — Household's consumer contract tests pin these exact ids, never a bare name (Principle VII / SC-H-008).

## Module 0 (Spine) — shared value objects

| Contract | Canonical `$id` | Owner | Min version | Why Household needs it |
|----------|-----------------|-------|-------------|------------------------|
| `FreshnessStamp` | `finos:common/FreshnessStamp/1.0.0` | Module 0 | 1.0.0 | every provided contract stamps freshness; consumed values' staleness is surfaced, never hidden |
| `MoneyCents` | `finos:common/MoneyCents/1.0.0` | Module 0 | 1.0.0 | integer-cents money typing for `KidGoals` allowance/goal amounts |

## Module 0 (Spine) — domain contracts

| Contract | Canonical `$id` | Owner | Min version | Why Household needs it |
|----------|-----------------|-------|-------------|------------------------|
| `AccountState` | `finos:spine/AccountState/1.0.0` | Module 0 (Spine) | 1.0.0 | the Family Dashboard surfaces a member's balances **only** within that member's granted `MemberScope`; never raw cross-member balances |
| `GoalState` | `finos:spine/GoalState/1.0.0` | Module 0 (Spine) | 1.0.0 | Multi-profile goal visibility on the dashboard; Household also **provides** `KidGoals` back to Goals/Spine to mirror as `GoalState` for time-to-goal context (FR-X-004) |
| `MerchantGraph` | `finos:spine/MerchantGraph/1.0.0` | Module 0 (Spine) | 1.0.0 | per umbrella Cross-Module Links (Multi-Profile Rewards context on the dashboard) |
| `ConnectionConsent` | `finos:spine/ConnectionConsent/1.0.0` | Module 0 (Spine) | 1.0.0 | render each member's connection/consent status and drive **partial revocation** when a member leaves (one member = one independent token, FR-CORE-007) |

## Product modules (gated by the household authorization layer)

The umbrella lists Household as consuming **"all module states, gated by the household authorization layer."** In practice Household composes a **dashboard** over whatever module states a viewer's `MemberScope` grants; it does not special-case each module's internals. The contracts most directly composed at MVP:

| Contract | Owner | Min version | Why Household needs it |
|----------|-------|-------------|------------------------|
| `CardLineup` | Module 1 (Rewards) | 1.0.0 | Multi-Profile Rewards context on the Family Dashboard (umbrella Cross-Module Links), shown only within scope |
| `StatusState` | Module 1 (Rewards) | 1.0.0 | member loyalty/elite status on the dashboard, shown only within scope |
| `HabitProgress` | Module 8 (Habits) | 1.0.0 | reflect a kid's chore-driven habit streak on the kid-friendly tracker (reciprocal of `KidGoals.linked_habit_id`); consumed when Habits ships |
| `SafeToActSignal` | Module 3 (Cash Safety) | 1.0.0 | conflict precedence: a household-level suggestion that conflicts with **that member's own** `SafeToActSignal` (overdraft risk) yields the Conflict Banner with Cash Safety winning (spec Edge Cases; data-model; plan; quickstart; conflict test T054). Pinned to the owner's real `$id` `finos:cashsafety/SafeToActSignal/1.0.0`; feature-checked until Cash Safety ships, with a paired consumer contract test (Principle VII / SC-H-008) |

**Version-skew behavior** (umbrella edge case): if a provider ships a breaking change without a consumer migration, the consumer contract test fails in CI and the dependent dashboard panel/behavior is **disabled**, not served on a mismatched schema (SC-012).

## Notes on the "consumes all module states" requirement

- Household never holds a private copy of another module's state; it reads via that module's contract client at request time and applies the `MemberScope` filter **server-side** before returning anything (FR-HH-001, SC-015).
- Any consumed contract whose owning module has not yet shipped (P2/P3/P4 ordering) degrades gracefully: the corresponding dashboard panel shows the Empty/Unavailable state rather than fabricating data (Constitution VIII; ux-foundations §3).
- No consumed contract carries a token/secret; `ConnectionConsent` exposes only non-secret link metadata (FR-CORE-007).

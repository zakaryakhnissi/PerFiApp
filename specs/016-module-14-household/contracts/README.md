# Contracts: Module 14 — Household & Family

All cross-module data flows through these versioned, schema-defined contracts (Principle VII / FR-X-011) — never shared mutable state. Every contract has **consumer** and **provider** contract tests in CI (SC-H-008 / umbrella SC-012). Contracts are semver'd in their `$id` (`finos:<area>/<Name>/<semver>`); breaking changes require a version bump + migration plan + deprecation window, and version skew **disables** the dependent behavior rather than serving on a mismatched schema (umbrella edge case, SC-012).

All schemas are JSON Schema **draft 2020-12**. They `$ref` the Module 0 shared value objects (`finos:common/FreshnessStamp/1.0.0`, `finos:common/MoneyCents/1.0.0`) rather than redefining them.

> **Critical boundary**: `HouseholdRoles` and `MemberScopes` describe membership and grants — they are **NOT** the authorization enforcement point. Every cross-user access is enforced **server-side** against the validated session identity, with the grant looked up server-side and denials audited (FR-HH-001, SC-015). A consumer that reads these contracts on the client to decide visibility, without the server enforcing the same, is non-compliant.

## Provided (this module is the provider)

| Contract | `$id` / Version | Schema | Consumers |
|----------|-----------------|--------|-----------|
| `HouseholdRoles` | `finos:household/HouseholdRoles/1.0.0` | [provided/household-roles.schema.json](./provided/household-roles.schema.json) | **Every module** (resolve household membership + roles), Home/onboarding, Settings, Social |
| `MemberScopes` | `finos:household/MemberScopes/1.0.0` | [provided/member-scopes.schema.json](./provided/member-scopes.schema.json) | **Every module** (enforced server-side on every cross-user request), Social (privacy controls), Spine |
| `KidGoals` | `finos:household/KidGoals/1.0.0` | [provided/kid-goals.schema.json](./provided/kid-goals.schema.json) | Goals (Spine — mirrors as `GoalState`), Habits (chore completion advances a streak) |

**Money on the wire**: `KidGoals` amount fields use `MoneyCents` (integer minor units, CAD). `HouseholdRoles` and `MemberScopes` carry **no** monetary values and **no** secrets. No field anywhere is a binary float (Constitution IV).

## Consumed (this module is a consumer)

See [consumed/README.md](./consumed/README.md). Household **consumes** spine and product-module state **only through their versioned contract clients**, gated by the household authorization layer — never via direct cross-schema storage reads (Principle VII; platform-decisions §3 three-layer boundary).

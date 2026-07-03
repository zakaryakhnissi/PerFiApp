# Quickstart & Validation: Module 0 — Financial Core & Data Spine

**Feature**: `003-module-0-spine` | **Date**: 2026-06-29

A run/validation guide proving the spine works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria. Because Module 0 is the **broadest credential/aggregation-token surface in the product**, the token-isolation, IDOR, MFA-gate, and freshness checks below are **mandatory gates**, not nice-to-haves.

## Prerequisites

- Ratified platform stack available (see [plan.md](./plan.md) Technical Context): TypeScript/NestJS backend, Postgres 16 (Testcontainers for tests), Redis, a KMS-backed secrets store (real or a test double that enforces "token never in the app DB"), Pact, Jest, Expo mobile.
- `SpineAggregationPort` with a **sandbox/stub Plaid (Canada) adapter** so the connection/consent flow runs without a live institution.
- Seeded fixtures: one supported Canadian institution (sandbox), a two-feed overlapping-charge set (for dedup), a foreign-currency transaction + a timestamped FX rate, a credit card with balance/limit at the band boundaries, recurring inflows/outflows (for runway), and one goal.
- Commands below are illustrative — adjust to the ratified toolchain.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run db:up                          # Postgres (ca-central-1-equivalent), RLS policies applied
<pkg> run seed:spine-fixtures            # institution, two-feed charge, FX, boundary card, recurring flows, goal
```

## Mandatory money fixtures (Principle IV — zero cent slippage)

These five run first and gate the build. Each is pure, deterministic, and asserts **exact** integer-cent output with **no** binary float anywhere on the path.

```bash
<pkg> test spine/unit/money
```

| Fixture | Input | Expected | Guards |
|---|---|---|---|
| **Dedup sum** | two feeds describing one $42.00 charge | total spend counts it **once** = `4200 cents`; the `merged_duplicate` row is excluded from the sum; a `suspected_duplicate` near-match is **also** excluded until resolved | SC-S-002 (0 double-counting) |
| **FX conversion** | a fixed foreign amount × a fixed timestamped rate (decimal string) | exact CAD `cad_amount` cents, half-up at the final cent, **no drift**; `fx_rate` recorded; stale FX flags `cad_amount` | FR-X-002, multi-currency edge |
| **Utilization band** | balance/limit at **9.99% / 10% / 29.99% / 30% / 50% / 50.01%** | classifies into `optimal` / `healthy` / `healthy→warn` / `warn` / `warn→hard_avoid` / `hard_avoid` exactly against the decimal-string thresholds | US5, single source of bands |
| **Runway** | a known balance + recurring outflows | expected `runway_days`, `projected_lowest_balance`, `projected_lowest_on`; a stale balance input **withholds** the whole forecast | US4, Constitution VIII |
| **Time-to-goal** | target/current/pace | expected `required_monthly_contribution` and `time_to_goal_days` with half-up rounding; insufficient inputs → `pace_status = unknown` (never guessed) | US6 |

A failure in any of these blocks merge (SC-S-002). A `float`/`double`/`real` type on any money path fails the lint + DB schema-lint gate independently.

## Validation by user story

### US1 — Account Aggregation & Connection/Consent (P1) 🎯 MVP

```bash
<pkg> test spine/integration/connection-consent
<pkg> test spine/security/token-isolation
```

Expected:
- Running the consent flow against the sandbox institution populates `AccountState` with accounts/balances, each carrying `source` + `FreshnessStamp`; granted `consent_scopes` are recorded on `ConnectionConsent` (least-privilege).
- **Token isolation (mandatory, SC-S-004)**: grep/scan proves the aggregation token is in **no** DB column, **no** contract payload, and **no** log; it exists **only** in the KMS secrets store keyed by `link_id`. The test fails if any token-shaped value appears in `spine` schema rows or logs.
- An `onboarding/connection` + `consent_granted` `AuditEvent` is written to the append-only log (FR-X-007).
- **Partial revocation (SC-S-005)**: in a two-member household both connected to the same institution, removing member A sets only A's `link_id` to `revoked` (`revoked_by = household_admin_partial`, `token_destroyed = true`); member B's connection and data are untouched.
- **Deletion cascade**: a revoke/deletion request revokes the provider connection, destroys the secrets-store token, and completes the spine + provider cascade within the 7-day SLA (FR-X-013).
- **MFA gate (SC-S-006)**: issuing or re-authorizing an aggregation token **requires step-up MFA**; a password-only attempt is rejected.
- **Institution-unavailable fallback**: a down institution renders the Error state with the provider reason + retry CTA, and offers the manual / statement-import path (`ingestion_mode = manual | statement_import`); a manual balance carries a user-entered freshness stamp.

### US2 — Transaction Normalization, Categorization & Dedup (P1)

```bash
<pkg> test spine/unit/normalization
<pkg> test spine/integration/transaction-stream
```

Expected:
- Two feeds describing the same charge collapse into one canonical `transaction_id` (`merged_primary` + `merged_duplicate`) linked to one `MerchantGraph` node; the duplicate is excluded from sums.
- An ambiguous near-duplicate is marked `suspected_duplicate` and **excluded from money math** until resolved — never silently summed.
- A foreign-currency transaction gets a `cad_amount` via the timestamped FX rate (half-up at the final cent), `fx_rate` recorded; a stale FX rate flags `cad_amount`.
- A `pending` transaction is provisional and is **not** treated as a settled money input for runway/budget.
- A user category override sets `category_source = user_override` and persists idempotently (replayed override does not double-write).

### US3 — Merchant Graph (P1)

```bash
<pkg> test spine/integration/merchant-graph
```

Expected:
- Multiple raw descriptors for one brand resolve to a single `merchant_id` with `canonical_name` + **both** `display_name_en` and `display_name_fr` (no single-language leak).
- A merchant inferred **solely** from a promotional email carries `email_sourced = true`; revoking email access purges that node/enrichment within the 7-day window regardless of which store holds it (FR-X-013).
- A descriptor that cannot be confidently resolved leaves `merchant_id` null rather than mis-attributing.

### US4 — Budget & Cash-Flow Forecast (P1)

```bash
<pkg> test spine/unit/budget-forecast
<pkg> test spine/integration/budget-cashflow
```

Expected:
- `BudgetState` reports per-category `budgeted`/`spent`/`headroom` (integer cents) + total headroom; `spent` excludes duplicate/suspected/pending rows.
- `CashFlowForecast` reports `runway_days`, `projected_lowest_balance`, `projected_lowest_on`, `shortfall_flag`, and an explicit `method` (`recurring_plus_trend` → `recurring_only` → `insufficient_history`).
- **Stale balance → withhold (SC-S-003)**: a balance past its threshold returns the forecast **flagged stale / withheld** — no runway on a multi-day-old balance.
- Partial connectivity → `data_completeness = partial` so consumers mark recommendations incomplete-data.

### US5 — Credit State Intake (P1)

```bash
<pkg> test spine/unit/credit-bands
<pkg> test spine/integration/credit-state
```

Expected:
- Connected cards yield per-card + aggregate `utilization` (decimal strings) and the correct `band` against the canonical thresholds (the boundary fixture above).
- No bureau → `score` null, utilization still computed (`utilization_source = derived_from_accounts`).
- **Documented-default boundary (Constitution VI v2.2.0)**: when `CreditState` is **entirely absent**, a *consumer* applies the documented healthy-band default and the spine emits nothing fabricated; when `CreditState` is **present and stale**, the consumer flags/withholds rather than reasoning on old utilization. The spine never emits `assumed_healthy_default` itself.
- A statement due within the at-risk window sets `due_date_risk = true`.

### US6 — Goals & Time-to-Goal (P2)

```bash
<pkg> test spine/integration/goal-state
```

Expected: a goal with target + date exposes `required_monthly_contribution`, `time_to_goal_days`, `projected_completion_date`, and a `pace_status` (`on_track`/`ahead`/`behind`/`unknown`); `unknown` whenever inputs are insufficient — never a guessed pace. A goal with no deadline omits/zeroes `required_monthly_contribution`.

### US7 — Contract & Freshness/Degradation Layer (P1)

```bash
<pkg> test spine/integration/degradation
<pkg> test spine/contract/version-skew
```

Expected:
- An external-feed timeout retains the prior value marked **stale** and logs the failure **without corrupting the spine** (SC-S-009); ingestion timeouts/retries/circuit-breakers fire.
- A balance older than its threshold is returned `is_stale = true` so consumers flag/withhold.
- A breaking contract change without a consumer migration **fails the consumer contract test in CI** and **disables** the dependent recommendation — never served on a mismatched schema (SC-012).

## Contract tests (mandatory — Principle VII / SC-S-008)

Every one of the **11 published contracts** has both a **provider** test (the spine proves it honors the schema) and a **consumer** test (a representative downstream module proves it reads the schema correctly) in CI — that is the SC-S-008 "consumer + provider for 100% of spine contracts" gate.

```bash
# Provider tests (this module proves it honors every published schema):
<pkg> test spine/contract/provided
#   account-state, transaction-stream, merchant-graph, budget-state, cash-flow-forecast,
#   credit-state, goal-state, connection-consent
#   + shared value objects: freshness-stamp, reasoning, money-cents

# Consumer tests for the 11 PUBLISHED contracts (representative downstream modules — T083a–i):
<pkg> test spine/contract/consumer
#   Rewards→CreditState/MerchantGraph/BudgetState/GoalState, Cash-Safety→CashFlowForecast/AccountState/TransactionStream,
#   Household/Settings→ConnectionConsent, + the 3 shared value objects

# Separately, the spine's own CONSUMED-feed tests prove it reads only EXTERNAL feeds — never product-module state:
<pkg> test spine/contract/consumed
#   aggregation provider (Plaid Canada), credit bureau, FX feed — via SpineAggregationPort
```

Expected: all **22** published-contract checks (11 provider + 11 consumer) pass; an intentionally bumped/broken provided schema **fails CI** and disables dependent consumers (version-skew behavior, SC-012). The separate consumed-feed tests prove the spine has **no** product-module dependency (no circular reads).

## Cross-cutting checks (mandatory gates)

- **Token isolation (SC-S-004)**: 0 aggregation tokens in any DB column, contract payload, or log; 100% reside in the KMS secrets store and are rotatable. Rotation fires on session invalidation, suspected compromise, privilege demotion, and max-age.
- **MFA gates (SC-S-006)**: 100% of token issuance/re-authorization, household-role changes, and export/deletion require step-up MFA; 0 succeed with password-only.
- **IDOR / cross-user safety (SC-S-007)**: API-layer authorization tests (not UI) show **0** cross-user/cross-member spine exposures; every denied cross-user access is **audited**. AuthZ is keyed on the validated **session identity, never a client-supplied `profile_id`/`member_id`**; RLS is exercised as defense-in-depth.
- **Recommend-only (FR-X-003 / SC-007)**: grep the spine API surface — there is **no** money-movement endpoint; the spine surfaces canonical state + freshness only.
- **Idempotency (Principle IV / FR-X-003)**: a replayed aggregation webhook / retried sync / re-submitted override never double-applies (keyed on `source_event_id` UNIQUE).
- **Audit trail (Principle VI)**: connection/consent/revocation/rotation/override/goal-save/access-denied events produce append-only `AuditEvent`s, kept **separate** from debug logs.
- **Redaction (FR-X-014)**: debug logs contain **no** PII (raw descriptors, identity), **no** monetary values, and **no** token.
- **Freshness safety (SC-S-003)**: 0 spine values served past threshold without `is_stale = true`; 0 forecasts computed on a stale balance presented as fresh.
- **Bilingual & locale (SC-S-010)**: 0 single-language leaks in spine strings; every displayed money/percent/date uses the active locale's conventions (en-CA `$1,234.56` vs fr-CA `1 234,56 $`, utilization `12,3 %`).
- **Residency (SC-S-011)**: 100% of spine data + PII in a Canadian region; the aggregation provider, bureau, and FX subprocessors are disclosed + agreement-backed before go-live (subprocessor register is a go-live gate).
- **Performance (SC-010 / FR-X-015)**: module-switch onto the Home/Spine tab renders the cached, freshness-stamped projection in ≤ 300 ms; a cache miss/stale value renders a flagged/withheld state rather than blocking on a provider fetch.
- **Accessibility (SC-011 / FR-X-016)**: WCAG 2.1 AA; bilingual screen-reader labels on every balance, chip, and CTA; all six data-view states (empty/loading/partial/stale/error/withheld) defined per spine view.

## Done when

All user-story validations pass, the five mandatory money fixtures show **zero** cent slippage, all 11 contracts' consumer+provider tests are green, token isolation / MFA-gate / IDOR / freshness / redaction / residency / recommend-only gates hold, and the onboarding payoff (connect → normalized balances + one runway indicator within 10 minutes, SC-S-012) is demonstrable.

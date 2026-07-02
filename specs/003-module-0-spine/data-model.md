# Phase 1 Data Model: Module 0 — Financial Core & Data Spine

**Feature**: `003-module-0-spine` | **Date**: 2026-06-29

Entities the spine **owns/provides**. These are the canonical source of truth every other module reads through versioned contracts (see [contracts/README.md](./contracts/README.md)). The spine consumes **only external feeds** and never reads product-module state.

**Money typing convention** (Constitution IV / FR-X-002): `*_cents` / `MoneyCents.amount_cents` fields are **integer minor units (CAD cents)**. FX rates, utilization, and band thresholds are **arbitrary-precision decimal strings** (`^[0-9]+(\.[0-9]+)?$`) on the wire, `NUMERIC` at rest. **No field is a binary float.** Compute in full precision; round **half-up to cents exactly once** at the storage/display boundary.

**Freshness semantics** (Constitution VIII / FR-X-008): every externally-sourced object carries a `FreshnessStamp`. A consumer reading `is_stale = true` MUST flag or withhold. Stale **money** inputs (balances, amounts, forecasts) ⇒ **withhold**. A **disconnected/errored** source retains its last-known value marked stale — never shown as current.

---

## Shared value objects (published by the spine, reused by ALL modules)

### FreshnessStamp — `finos:common/FreshnessStamp/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| source | string | feed/provider id (never a token/secret) |
| observed_at | timestamp (UTC) | when the value was sourced |
| staleness_threshold_seconds | integer ≥ 0 | per-value window (research §7) |
| is_stale | boolean (derived) | `now - observed_at > threshold` |
| next_refresh_at | timestamp \| null | optional next scheduled refresh |

### Reasoning — `finos:common/Reasoning/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| inputs | map | input values that produced a result (redacted in debug logs; full only in audit trail) |
| rationale_en / rationale_fr | string | bilingual "why"; a missing fr is a defect |

### MoneyCents — `finos:common/MoneyCents/1.0.0`
| Field | Type | Notes |
|-------|------|-------|
| amount_cents | integer (signed) | minor units; never a float/decimal-string |
| currency | string (ISO-4217) | default `CAD`; non-CAD converted before display |

---

## Owned entities

### Account / AccountState — `finos:spine/AccountState/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| account_id | uuid | required; stable FinOS id (not the provider's raw id) |
| aggregation_link_id | uuid \| null | the `ConnectionConsent` it was sourced through; null for manual/statement-import |
| institution_id / institution_name | string | required |
| type | enum {chequing, savings, credit_card, line_of_credit, loan, investment, other} | required |
| mask | string \| null | last 2–4 digits only; never the full number |
| currency | string (ISO-4217) | required; default `CAD` (matches `AccountState.accounts[].currency`; mirrors `TransactionStream.iso_currency`) |
| balance | MoneyCents | required; integer cents |
| available_balance / credit_limit | MoneyCents | optional; `credit_limit` feeds `CreditState` utilization |
| balance_kind | enum {asset, liability} | required; lets consumers sum net position without sign-guessing |
| ingestion_mode | enum {aggregated, manual, statement_import} | required (institution-unavailable fallback) |
| status | enum {active, login_required, disconnected, revoked, error} | required; non-active retains last-known marked stale |
| freshness | FreshnessStamp | required |

Container also carries `profile_id`, `household_id?`, and `connection_completeness ∈ {complete, partial, none}`.

### Transaction / TransactionStream — `finos:spine/TransactionStream/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| transaction_id | uuid | required; stable canonical id surviving dedup merges |
| account_id | uuid | required |
| amount | MoneyCents | required; magnitude (sign via `direction`) |
| direction | enum {debit, credit} | required |
| status | enum {pending, posted, reversed} | required; `pending` is provisional (not a settled money input) |
| booked_at / authorized_at | timestamp (UTC) | `booked_at` required |
| description_raw | string \| null | redacted from debug logs |
| merchant_id | string \| null | resolved `MerchantGraph` node; null when unresolved (never mis-attributed) |
| category / category_source | string \| enum {provider, rules, model, user_override} | `user_override` always wins |
| iso_currency / cad_amount / fx_rate | string / MoneyCents / decimal-string\|null | foreign → CAD via timestamped FX, half-up at final cent; stale FX flags `cad_amount` |
| dedup_state | enum {unique, merged_primary, merged_duplicate, suspected_duplicate} | `merged_duplicate`/`suspected_duplicate` excluded from sums |
| merged_into_transaction_id | uuid \| null | surviving `merged_primary` for a `merged_duplicate` |
| is_recurring | boolean | recurrence hint for Bills/Subscriptions |
| freshness | FreshnessStamp | required |

### Merchant / MerchantGraph — `finos:spine/MerchantGraph/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| merchant_id | string | required; stable node id |
| canonical_name | string | required |
| display_name_en / display_name_fr | string \| null | bilingual; one-language-only is a defect |
| category | string \| null | primary canonical category |
| aliases | list<string> | raw descriptors normalized onto this node |
| parent_merchant_id | string \| null | brand → subsidiary |
| is_subscription_like | boolean | recurring-merchant hint |
| source | enum {curated, provider, model, email_inferred, user} | provenance |
| email_sourced | boolean | true ⇒ purged on email-access revocation within 7 days (FR-X-013); requires `owner_profile_id` |
| owner_profile_id | uuid \| null | owning profile for **profile-scoped** enrichment (`email_inferred`/`user` nodes); null for shared curated/provider/model reference nodes. The email-revocation purge (T053/T057) keys on this; profile-scoped nodes are authZ-checked on cross-user reads |
| freshness | FreshnessStamp | required |

### BudgetState — `finos:spine/BudgetState/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| profile_id | uuid | required |
| period_start / period_end | date | required |
| total_budgeted / total_spent / total_headroom | MoneyCents | integer cents; headroom = budgeted − spent (may be negative) |
| categories[] | {category, budgeted, spent, headroom, status∈{under,near_limit,over}} | per-category; spent excludes duplicate rows |
| data_completeness | enum {complete, partial} | partial ⇒ consumers mark incomplete-data |
| freshness | FreshnessStamp | stale ⇒ consumers **withhold** spend recommendations |

### CashFlowForecast — `finos:spine/CashFlowForecast/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| profile_id | uuid | required |
| horizon_days | integer ≥ 1 | required |
| starting_balance / projected_lowest_balance | MoneyCents | integer cents; `starting_balance` **required** whenever `runway_days` is reported (Constitution VI — the runway carries its basis) |
| projected_lowest_on | date \| null | date of the lowest point |
| runway_days | integer ≥ 0 | days until the safety buffer is breached |
| shortfall_flag | boolean | breach within horizon (drives Cash Safety precedence) |
| method | enum {recurring_plus_trend, recurring_only, insufficient_history} | `insufficient_history` ⇒ low-confidence |
| points[] | {date, projected_balance} | optional per-day series for charting |
| data_completeness | enum {complete, partial} | — |
| freshness | FreshnessStamp | **stale balance ⇒ flag/withhold** (no runway on stale money) |

### CreditState — `finos:spine/CreditState/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| profile_id | uuid | required |
| score | integer [300..900] \| null | null if no bureau connected |
| score_source | string \| null | bureau id; null when absent |
| bands | {optimal_max "0.10", healthy_max "0.30", warn_max "0.50"} | decimal-string thresholds; user-adjustable defaults |
| aggregate_utilization | decimal-string [0..1] | total balances / total limits, arbitrary precision |
| aggregate_band | enum {optimal, healthy, warn, hard_avoid} | derived |
| per_card[] | {account_id, balance, credit_limit, utilization, band, statement_due_on?} | per-card utilization |
| due_date_risk | boolean | statement due within the at-risk window |
| utilization_source | enum {bureau, derived_from_accounts, assumed_healthy_default} | spine emits only the first two; `assumed_healthy_default` is recorded by a **consumer** when CreditState is entirely absent |
| freshness | FreshnessStamp | **stale ⇒ flag/withhold** (default applies only to total absence, not staleness) |

### GoalState — `finos:spine/GoalState/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| profile_id | uuid | required |
| goals[].goal_id | uuid | required |
| goals[].name | string | required; displayed verbatim (not translated) |
| goals[].target_amount / current_amount / required_monthly_contribution | MoneyCents | integer cents; required contribution computed half-up at final cent |
| goals[].target_date / projected_completion_date | date \| null | — |
| goals[].time_to_goal_days | integer ≥ 0 \| null | null if pace unknown (never guessed) |
| goals[].pace_status | enum {on_track, ahead, behind, unknown} | `unknown` when insufficient inputs |
| goals[].status | enum {active, achieved, paused, archived} | — |
| freshness | FreshnessStamp | depends on balance/cash-flow inputs |

### ConnectionConsent / AggregationLink — `finos:spine/ConnectionConsent/1.0.0`
| Field | Type | Validation |
|-------|------|------------|
| link_id | uuid | required; one member + one institution + one independent token |
| profile_id | uuid | required; the member who granted consent under their own identity |
| household_id | uuid \| null | — |
| institution_id / institution_name | string | required |
| provider | string | default `plaid`; behind `SpineAggregationPort` (swappable) |
| consent_status | enum {pending, active, login_required, reauth_required, revoked, expired, error} | required |
| consent_scopes | list<enum {accounts, balances, transactions, identity, liabilities}> | ≥ 1; least-privilege |
| granted_at / last_synced_at | timestamp (UTC) | `granted_at` required (audited) |
| reauth_required_reason | enum {login_expired, consent_expired, scope_change, suspected_compromise, rotation} \| null | the **reason** (distinct from the `consent_status` lifecycle value `login_required`; named `login_expired` to avoid conflation); re-issue/re-auth is **MFA-gated** (FR-X-017) |
| revocation | {revoked_at, revoked_by∈{user, household_admin_partial, system_rotation, deletion_request}, token_destroyed} \| null | present once revoked; `household_admin_partial` = partial revocation |
| freshness | FreshnessStamp | required |

> **Hard boundary**: the aggregation **token is NOT a field on any entity or contract**. It lives only in the KMS-backed secrets store, keyed by `link_id`, encrypted with keys the app DB cannot access (FR-CORE-007).

### AuditEvent (append-only; Constitution VI / FR-X-007)
| Field | Type | Notes |
|-------|------|-------|
| event_id | uuid | required |
| profile_id | uuid | required |
| type | enum {connection_created, consent_granted, token_rotated, link_revoked, partial_revocation, account_synced, category_overridden, goal_saved, export_requested, deletion_requested, access_denied} | |
| source_event_id | string | **UNIQUE** — idempotency key; a replay never double-applies |
| payload | map | PII/money **redacted** in debug logs; full record only in the audit trail |
| occurred_at | timestamp (UTC) | required, immutable (append-only; no UPDATE/DELETE grant) |

---

## State transitions

**ConnectionConsent / AggregationLink**:
```
pending ──(consent + auth, MFA-gated)──▶ active
active ──(provider login expiry)──▶ login_required ──(re-auth, MFA-gated)──▶ active
active ──(scope/credential change)──▶ reauth_required ──(re-auth, MFA-gated)──▶ active
active ──(user revoke | member removed)──▶ revoked   [token destroyed, cascade ≤7d]
active ──(max-age | suspected compromise | privilege demotion)──▶ token_rotated (stays active, new token)
{active, login_required} ──(provider/consent expiry)──▶ expired
any ──(provider error)──▶ error ──(repair)──▶ active
```
- **Partial revocation**: removing member A transitions only A's `link_id` to `revoked` (`revoked_by = household_admin_partial`); member B's links are untouched.

**Account.status**: `active ↔ login_required ↔ error`; `active → disconnected/revoked` (retains last-known balance marked stale; never shown as current).

**Transaction.dedup_state**: `unique`; or `merged_primary` + `merged_duplicate` (duplicate excluded from sums); or `suspected_duplicate` (excluded from money math) → user-resolved → `unique` or `merged_duplicate`.

**Transaction.status**: `pending → posted` (or `pending → reversed`); only `posted` is a settled money input.

**Goal.pace_status**: derived each read; `unknown` whenever inputs are insufficient — never guessed.

**Freshness (all externally-sourced)**: `fresh → aging → stale` by elapsed time vs threshold; on source failure the value is **retained, marked stale**, and the failure logged without spine corruption (FR-X-012).

---

## Relationships

- `ConnectionConsent` 1—* `Account` (via `aggregation_link_id`); per-member, per-institution.
- `Account` 1—* `Transaction`.
- `Transaction` *—1 `MerchantGraph` node (via `merchant_id`, nullable); `merged_duplicate` *—1 `merged_primary`.
- `TransactionStream` → derives → `BudgetState`, `CashFlowForecast` (excludes duplicate/pending money).
- `Account` (credit_limit + balance) → derives → `CreditState` per-card + aggregate utilization.
- `GoalState` *—1 `CashFlowForecast`/balances (pace inputs).
- All profile-scoped entities are authZ-checked server-side on every cross-user/cross-member read (threat model; never a client-supplied id). The `MerchantGraph` is the one mixed case: shared curated/provider/model reference nodes (`owner_profile_id = null`) are not profile-scoped, while email-sourced/user-sourced enrichment (`owner_profile_id` set) **is** profile-scoped and authZ-checked like every other owned entity.

## Consumed sources (external only — owned by no module)

Aggregation provider (Plaid Canada, behind `SpineAggregationPort`) → `AccountState`/`TransactionStream`/`CreditState` liabilities/`ConnectionConsent`; credit bureau → `CreditState` score; FX feed → `cad_amount`. See [contracts/consumed/README.md](./contracts/consumed/README.md). The spine never reads product-module state.

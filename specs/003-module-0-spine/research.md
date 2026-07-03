# Phase 0 Research: Module 0 — Financial Core & Data Spine

**Feature**: `003-module-0-spine` | **Date**: 2026-06-29

Resolves the spine-specific technical decisions the design depends on. **Platform-stack choices** (TypeScript modular monolith, NestJS + Postgres 16 Canadian region, KMS secrets store, append-only audit store, money representation, auth/MFA) are **ratified in [platform-decisions.md](../_platform/platform-decisions.md) and inherited here — not re-litigated**. This file resolves the items that platform-decisions flagged as NEEDS-RATIFICATION for the Module 0 plan (NR-1, NR-2, NR-3, NR-5, NR-7) plus the spine's domain method choices (normalization/dedup, categorization, budgeting/forecast, credit source, token rotation).

---

## 1. Aggregation provider mapping (Plaid Canada → contracts, kept swappable)

**Decision**: Map Plaid (Canada) products to spine contracts behind a single `SpineAggregationPort` with one adapter (`plaid.adapter.ts`): **Auth/Accounts/Balance → `AccountState`**, **Transactions → `TransactionStream`**, **Liabilities → `CreditState`** (balances/limits/statement dates) and `AccountState.credit_limit`, **Identity → member verification**, **Item/Link lifecycle → `ConnectionConsent`**. Each mapped object is stamped with a `FreshnessStamp`. Consumers depend only on the spine contracts, never on Plaid types.

**Rationale**: FR-CORE-006 + platform D7. Isolation behind the port makes the vendor swappable (a new adapter = zero consumer change) and ready for Canada's open-banking standard later. Plaid types never leak across the 16-module boundary.

**Alternatives considered**: Direct Plaid types in consumers — rejected (couples every module to a vendor; platform D7). Multiple aggregators in MVP — rejected (YAGNI; the port supports adding one later).

**Open (NR-1)**: confirm Plaid processes/stores Canadian data in-region under a PIPEDA cross-border accountability agreement **before go-live**; any out-of-region processing must be disclosed + agreement-backed or blocked (FR-X-020, SC-017). Owner: Module 0 plan + subprocessor register.

---

## 2. Token storage & rotation

**Decision**: Aggregation tokens live **only** in the KMS-backed secrets store (AWS Secrets Manager / KMS CMK, Canadian region), keyed by `link_id`, encrypted with keys the application DB cannot access — **never** a DB column beside user data, never in a contract, never in a log. **Per-household-member independent token**. Rotation triggers: session invalidation, suspected compromise, privilege/role demotion, max-age schedule. Revocation destroys the token (crypto-shred) and cascades to provider revocation within the 7-day SLA.

**Concrete rotation/compromise signals** (so the trigger set is falsifiable and each is test-asserted in T024): **session invalidation** = logout, password/passkey reset, or **refresh-token reuse detection**; **suspected compromise** (sets `reauth_required_reason = suspected_compromise`) = refresh-token reuse, a provider-signaled compromise, or an admin-initiated rotation; **privilege demotion** = a household role/scope downgrade; **max-age** = the scheduled ceiling. **Session-token handling** (inherited from platform D10, owned by this module per FR-X-017): a short-lived access JWT (≤15 min TTL) plus a rotating refresh token with reuse-detection; tokens are server-side-revocable and never stored in mobile insecure storage. A detected refresh-token reuse closes the loop — it both invalidates the session and triggers aggregation-token rotation.

**Rationale**: FR-CORE-007 + platform D8 + Constitution V. An aggregator concentrates a user's whole financial life; co-locating tokens with user data is the catastrophic-leak path. Per-member tokens are the prerequisite that makes **partial revocation** implementable.

**Alternatives considered**: Token in a Postgres column (even encrypted) beside user data — rejected (co-location, platform D8). Shared household token — rejected (breaks partial revocation, FR-CORE-007).

---

## 3. Transaction normalization & de-duplication

**Decision**: A deterministic, two-stage pipeline. **Normalize**: clean raw descriptors, resolve to a `MerchantGraph` node, assign a canonical category, convert foreign amounts to CAD via a timestamped FX rate. **Dedup**: collapse cross-feed duplicates using a deterministic match key (account + signed amount + a date window + normalized descriptor); an exact match → `merged_primary` + `merged_duplicate` (duplicate excluded from sums); an ambiguous near-match → `suspected_duplicate`, **excluded from money math** until the user resolves it. Dedup decisions are recorded (explainable) and the canonical `transaction_id` survives merges.

**Rationale**: FR-CORE-002 + Constitution IV (money correctness). Double-counting one charge corrupts every downstream money figure; under-counting once (suspected-duplicate held out) is the safer bias. Deterministic rules (not an opaque model) make dedup fixture-testable and reproducible (Constitution VI).

**Alternatives considered**: ML-only dedup — rejected for MVP (non-deterministic, hard to fixture/audit; can augment rules later). Trust the provider's dedup alone — rejected (doesn't cover *cross-feed* duplicates, e.g. card feed + bank feed of the same charge).

---

## 4. Categorization

**Decision**: Rules-first categorization keyed on the resolved `MerchantGraph` node + descriptor patterns, seeded with a curated Canada-first category map; provider categories used as a fallback signal; **user overrides always win** (`category_source = user_override`, persisted idempotently). A model-based categorizer may augment later behind the same `category_source` provenance.

**Rationale**: FR-CORE-002 + Constitution VI (explainable) + IX (simplicity). Provenance on every category makes categorization auditable and lets a user override stick. Canada-first map aligns with Constitution II.

**Alternatives considered**: Provider category verbatim — rejected (inconsistent across institutions, not Canada-tuned, no override story). Pure ML — rejected for MVP (auditability/determinism).

---

## 5. Budgeting & cash-flow forecast method

**Decision**: **Budget** = per-category `budgeted − spent` from `posted`, de-duplicated transactions (pending/duplicate rows excluded). **Forecast** = **recurring-cash-flow detection + a trend term** (`recurring_plus_trend`): detect recurring inflows/outflows (bills, paycheques) from `TransactionStream`, project them forward over the horizon, add a smoothed discretionary trend, apply a user-adjustable safety buffer, and report `runway_days`, `projected_lowest_balance`, `projected_lowest_on`, `shortfall_flag`. Degrade to `recurring_only` then `insufficient_history` when history is thin. **All deterministic and fixture-tested**; a stale balance input flags/withholds the whole forecast.

**Rationale**: FR-CORE-003 + Constitution IV/VIII. A deterministic, explainable method is reproducible and testable; the explicit `method` field lets consumers down-weight low-confidence forecasts rather than presenting a confident false runway. Cash Safety (P1) is built directly on this output.

**Alternatives considered**: Opaque time-series ML forecast — rejected for MVP (non-deterministic, hard to fixture, can't explain a runway figure; Constitution VI). Naive "balance ÷ average daily spend" — rejected (ignores known recurring bills, mis-states the lowest point).

**Open (NR-5)**: the heavy forecast query may drop from Prisma to raw SQL/Drizzle per-query — confirmed in the plan, not a platform-wide flip.

---

## 6. Credit-state data source

**Decision**: Two-source `CreditState`. **Utilization** is derived from connected card balances/limits (`utilization_source = derived_from_accounts`) so it works **without** a bureau connection. **Score/factors** come from a Canadian bureau (Equifax/TransUnion) when connected (`utilization_source = bureau`, `score` populated). The **canonical bands** (< 10 optimal / < 30 healthy / 30–50 warn / > 50 hard-avoid) are defined here once and read by all modules; user-adjustable. When `CreditState` is **entirely absent**, a *consumer* may apply the documented healthy-band default (Constitution VI v2.2.0); **stale** `CreditState` flags/withholds.

**Rationale**: FR-CORE-005 + umbrella CreditState canonical bands + Rewards FR-REW-003. Deriving utilization from accounts gives the flagship recommender a working guardrail even before a bureau is connected, while the bureau enriches with score. Single definition of bands prevents Rewards/Credit/Pay divergence.

**Alternatives considered**: Require a bureau connection for any `CreditState` — rejected (blocks utilization for users without bureau data; over-restrictive). Recompute utilization independently in each consumer — rejected (divergence; the spine is the single source).

**Open (NR-4)**: concrete Canadian bureau vendor + residency posture enter the subprocessor register before go-live.

---

## 7. Staleness windows per data class

**Decision**: Canada-oriented default `staleness_threshold_seconds`, **user-adjustable**, attached per value via `FreshnessStamp`: **balances ~6 h**, **transactions ~12 h**, **credit/utilization ~24 h**, **FX ~1 h**, **merchant graph ~30 d** (curated, slow-moving), **goals** derived (inherit the freshest of their balance/cash-flow inputs). Stale **money** inputs withhold; the mechanism (per-value stamp + threshold + withhold-on-stale-money) is fixed now; exact numbers tuned in ops/PIA.

**Rationale**: FR-X-008 / Constitution VIII + platform NR-2. Different data classes age at very different rates (FX in minutes, a curated merchant name in weeks); a single global threshold would be wrong for most. Concrete defaults give tests deterministic behavior now.

**Alternatives considered**: Single global threshold — rejected (FX moves far faster than curated reference data). No staleness (always "fresh") — constitutionally prohibited (Principle VIII).

---

## 8. Idempotent ingestion & audit

**Decision**: Every spine write (sync upsert, category override, goal save, connection/revocation, rotation) is keyed on a `source_event_id` with a `UNIQUE` constraint and recorded in the **append-only** `audit.event_log` (INSERT-only grant). Replayed aggregation webhooks / retried syncs never double-apply. Ingestion paths have mandatory timeouts, retries, rate-limit handling, and circuit-breakers; a failure retains the last-known value marked stale without corrupting the spine.

**Rationale**: Constitution IV (idempotent, safe-to-retry) + VI (immutable audit) + VIII/FR-X-012 (graceful degradation) + platform D5. Aggregation webhooks are at-least-once; idempotency keys are the only safe way to consume them for money state.

**Alternatives considered**: Last-write-wins upserts without an idempotency key — rejected (a replayed webhook could double-apply a balance/transaction). Mutable CRUD audit table — rejected (not provably append-only; platform D5).

---

## 9. Performance: ≤ 300 ms module-switch onto the spine/Home tab

**Decision**: Serve the Home/Spine tab from a locally cached, freshness-stamped projection of `AccountState`/`BudgetState`/`CashFlowForecast`; background-refresh via BullMQ workers. A cache miss or stale-beyond-threshold value renders a **flagged/withheld** state rather than blocking the hot path on a network/provider fetch.

**Rationale**: FR-X-015 / SC-010 + Constitution VIII. Hitting the 300 ms budget must never mean silently serving stale money — staleness is always surfaced.

**Alternatives considered**: Always-live provider fetch on tab open — rejected (blows 300 ms, depends on provider latency). Serve stale silently to hit latency — rejected (violates Principle VIII).

**Open (NR-7)**: profile the budget on **real** mid-range Canadian devices, not only emulators; calibrate the gate in the plan.

---

## Open items handed to planning / ops / PIA (non-blocking)

- **NR-1**: Plaid Canada residency posture confirmed + agreement-backed before go-live (subprocessor register).
- **NR-2**: final staleness-window defaults + runway buffers (ops/PIA).
- **NR-3**: dormant-account inactivity window for FR-X-019 auto-anonymization (PIA) — spec's working assumption is 24 months, to confirm.
- **NR-4**: concrete Canadian credit-bureau + FX vendors and their residency posture (subprocessor register).
- **NR-5**: per-query raw-SQL/Drizzle escape hatch for the heavy forecast query (plan).
- **NR-7**: perf budget profiled on real devices (plan).
- **Statement-import vs manual-entry scope** for the institution-unavailable fallback (product-owner question 3 in the spec).

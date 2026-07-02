# Consumed Sources — Module 0 (Spine)

Module 0 consumes **only external feeds**, never product-module state — this is what prevents circular dependencies and keeps the spine the single canonical source (platform-decisions §3). These are **not** cross-module FinOS contracts; they are external providers accessed behind swappable ports, each obeying Fresh-or-Flagged (Constitution VIII).

| External source | Port / boundary | Maps to provided contract(s) | Residency / notes |
|-----------------|-----------------|------------------------------|-------------------|
| **Aggregation provider — Plaid (Canada)** | `SpineAggregationPort` (one adapter; swappable, FR-CORE-006/D7) | `AccountState`, `TransactionStream`, `CreditState` (liabilities), `ConnectionConsent` | Tokens in KMS secrets store only, never in a contract or DB column beside user data (FR-CORE-007). Residency posture confirmed pre-go-live (NR-1). |
| **Credit bureau (Canada — Equifax/TransUnion)** | `CreditBureauPort` | `CreditState` (score, factors) | Freshness-stamped. Absent bureau data ⇒ consumers apply documented healthy-band default (Constitution VI v2.2.0). Vendor + residency in subprocessor register (NR-4). |
| **FX-rate feed** | `FxRatePort` | `TransactionStream.cad_amount`, foreign-amount conversions | Decimal-string rates, arbitrary precision, half-up at the final cent. Stale FX ⇒ converted figure flagged. Shared cross-module candidate (Travel FR-TRV-001). |

**Version-skew behavior**: a breaking change in any provided spine contract without consumer migration fails the consumer's contract test in CI and **disables** the dependent recommendation rather than serving on a mismatched schema (SC-012).

**Ingestion resilience (FR-X-012)**: every port has mandatory timeouts, retries, rate-limit handling, and circuit-breakers; a source failure retains the last-known value **marked stale** and never corrupts the spine (Module 0 Acceptance Scenario 5).

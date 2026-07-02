# Phase 0 Research: Module 11 — Travel & Trips

**Feature**: `013-module-11-travel` | **Date**: 2026-06-29

Resolves the technical decisions the Travel design depends on. **Platform-stack choices (language, storage, mobile framework, money/format packages, auth, residency, CI gates) are INHERITED from [specs/_platform/platform-decisions.md](../_platform/platform-decisions.md) and are NOT re-litigated here.** This module only records decisions genuinely specific to Travel, and flags module-specific vendor/source items as documented open items (non-blocking, per Principle IX / the umbrella P3 scope).

**Inherited (not re-decided)**: TypeScript modular monolith (NestJS + Expo RN); `@finos/money` (integer cents + `decimal.js` string-on-wire) with `roundHalfUpToCents` once; `@finos/format` (en-CA/fr-CA); PostgreSQL 16 `ca-central-1`, one schema per module + RLS; append-only `audit.event_log`; semver'd JSON-Schema contracts with Pact consumer+provider tests; BullMQ workers with mandatory timeouts/retries/rate-limits for ingestion; KMS-backed secrets (Travel holds no tokens). See platform-decisions.md §2–6.

---

## 1. FX-rate sourcing (foreign→CAD conversion)

**Decision**: Consume a **timestamped FX-rate feed via a shared `FxProvider` interface** (the same one Rewards uses, Rewards research §3), with the same freshness contract. Convert each foreign itinerary cost to CAD in **arbitrary precision** (`decimal.js`), round **half-up to CAD cents once**. The spine publishes **no FX contract** — FX is an internal Module 0 feed feeding `TransactionStream.cad_amount`; Travel therefore treats FX as an **external freshness-stamped feed**, not a cross-module contract. A stale FX rate flags the converted figure (umbrella multi-currency edge case); a stale FX **money** input is never recomputed silently.

**Rationale**: FR-TRV-001 + FR-X-002/008. Reusing the Rewards `FxProvider` avoids duplicate FX logic and drift (Rewards research §3 already noted Travel as the natural co-consumer). Per-conversion-path rounding fixtures guard against cent slippage.

**Alternatives considered**: A new spine-level FX **contract** — attractive (single canonical FX), but the spine spec did not define one; promoting FX to a shared contract is a **cross-module follow-up** (open item OI-1), not a blocker. Per-module FX implementation — rejected (duplicate logic, drift risk).

---

## 2. Confirmation parsing (itinerary extraction)

**Decision**: Parse forwarded booking confirmations behind a **`ConfirmationParser` interface** producing the structured `ItineraryItem` shape (type, provider, dates, original currency + amount, booking reference). Email content is treated as **untrusted input**: the parser extracts structured fields only, never executes embedded instructions/links (prompt-injection mitigation, threat model), and rejects out-of-range/garbage values to manual entry rather than storing a guessed cost. After parsing, **only** the derived itinerary + sender identity/classification is retained — **never raw message bodies** (FR-X-013). Idempotency key = booking reference/PNR + segment + date, with a content-hash fallback (C2).

**Rationale**: FR-TRV-001 + FR-X-013. Abstracting behind an interface lets a curated/regex parser ship for MVP and an LLM/vendor parser swap in without touching itinerary logic; the no-raw-body rule is enforced at the parser boundary.

**Alternatives considered**: Store raw bodies for re-parse — rejected (FR-X-013 prohibits raw-body retention; over-collection). Direct mailbox scraping without opt-in — rejected (umbrella email opt-in assumption; privacy).

**Open item OI-2 (NR-6)**: the concrete parsing subprocessor (regex/curated vs LLM vendor) must be Canadian-region or disclosed+agreement-backed, retaining only sender identity + classifications (FR-X-020). Selected in planning; enters the subprocessor register.

---

## 3. Travel-spend matching (TravelSpend stats)

**Decision**: Compute `TravelSpend` by **matching `TransactionStream` records to trips via `MerchantGraph`** travel-merchant nodes (airlines/hotels/car rentals) within the trip date window, blended with parsed itinerary costs. Each per-trip figure records its `cost_source` (itinerary / matched_transactions / blended). Lifetime spend **sums already-CAD-rounded per-trip cents** (integer addition, associative, exact) — no cross-currency float arithmetic.

**Rationale**: FR-TRV-002 + FR-X-001/002. Reading spine `TransactionStream` (already CAD-converted + freshness-stamped) reuses the canonical spend source rather than re-aggregating; merchant-graph matching keeps travel classification consistent with the rest of FinOS.

**Alternatives considered**: Itinerary-only spend — rejected (misses ancillary travel spend the user didn't forward). Re-classify raw transactions in Travel — rejected (duplicates spine/MerchantGraph logic, divergence risk).

---

## 4. Insurance-gap assessment

**Decision**: Read **travel-insurance perks from Rewards' `CardLineup`** (Rewards owns the card knowledgebase incl. insurance perks, FR-REW-002) and derive a `covered / gap / unknown` flag per trip. Travel **does not** own card/perk data. Indeterminate coverage ⇒ **`unknown`**, never `covered` (withhold-and-ask, Principle VI). The flag is informational — it does **not** advise buying insurance or acquiring a card (not regulated advice).

**Rationale**: FR-TRV-002 + the Rewards/Travel boundary (spec scope note). A single source of card-perk truth prevents Travel and Rewards diverging on what a card covers.

**Alternatives considered**: Maintain a Travel-local insurance dataset — rejected (duplicates the Rewards knowledgebase, divergence + bilingual-parity risk). Assume a default coverage when data is missing — rejected (constitutionally a withhold case; "unknown" only).

---

## 5. Carbon estimation

**Decision**: Optional, **estimate-only, non-money** carbon figure from a **curated distance/class factor table** (versioned dataset), behind a feature toggle. Each estimate carries a coarse `confidence` (low/medium) and a `method` id; never presented as precise or as money.

**Rationale**: FR-TRV-002 (carbon "optional") + Principle IX (MVP-lean). A curated factor table is cheap, deterministic, and clearly non-authoritative; a precise carbon engine is not justified at P3.

**Alternatives considered**: A live carbon API — rejected for MVP (vendor dependency, residency surface, marginal value at P3). Omit carbon — rejected (umbrella explicitly lists optional carbon).

---

## 6. Manual trip entry as a first-class source

**Decision**: A **manually-entered trip/itinerary is a first-class, freshness-stamped source** (user-entered freshness, user-set staleness window), not a degraded fallback — because many users will not connect an email source (umbrella email opt-in assumption, C6). It flows through the same FX/cents math and the same provided contracts.

**Rationale**: Umbrella "usable (with reduced automation) without [email]" assumption. Mirrors how Rewards treats manual balance entry (FR-REW-010).

**Alternatives considered**: Email-only itineraries — rejected (excludes non-email users; poor P3 reach).

---

## 7. Conflict resolution with Cash Safety

**Decision**: Travel originates no money movement, so conflicts are rare; **if** a spend-positive Travel suggestion ever exists and `SafeToActSignal` flags overdraft risk, **Cash Safety takes precedence** and the conflict + resolution are surfaced (umbrella precedence rule). The `SafeToActSignal` consumer is **feature-checked** until Cash Safety (Module 3) ships (C7). Until then, Travel surfaces only informational over-budget warnings from `BudgetState`.

**Rationale**: Umbrella "Conflicting recommendations" precedence + phased delivery (Travel P3, Cash Safety P1 but may land separately).

**Alternatives considered**: Block all Travel suggestions until Cash Safety exists — rejected (Travel is independently shippable per its Independent Test).

---

## 8. Contract testing approach

**Decision**: Consumer-driven (Pact) contract tests for each consumed contract (`BudgetState`, `GoalState`, `MerchantGraph`, `TransactionStream`, `CardLineup`, `StatusState`, `SafeToActSignal`) and provider contract tests for each provided contract (`TripBudget`, `TravelSpend`), in CI; contracts semver'd with a deprecation window. Version skew **disables** the dependent Travel feature rather than serving on a mismatched schema (umbrella edge case, SC-012).

**Rationale**: Principle VII + FR-X-011 + SC-T-008 (inherits platform CI gates, platform-decisions.md §6).

**Alternatives considered**: Integration tests against a live spine only — rejected (slow, no schema pinning, no provider-side guarantee).

---

## 9. Performance: ≤ 300 ms module-switch

**Decision**: Maintain a local, freshness-stamped cache of the trip list + stats on the mobile client (TanStack Query, surfacing `is_stale`); a cache miss or stale-beyond-threshold money value triggers a flagged/withheld state rather than a blocking network fetch on the hot path.

**Rationale**: FR-X-015 / SC-T-012 without violating Fresh-or-Flagged — staleness is surfaced, never hidden to hit the latency budget. Inherits the platform state/cache approach (platform-decisions.md §2).

**Alternatives considered**: Always-live fetch on tab open — rejected (blows the 300 ms budget); serve stale silently — rejected (violates Principle VIII).

---

## Open items handed to planning/ops (non-blocking)

- **OI-1**: Whether FX should be promoted to a shared **spine-level contract** (cross-module follow-up with Rewards). Today FX is a shared external feed (decision §1).
- **OI-2 (NR-6)**: Concrete confirmation-parsing subprocessor + residency posture (Canadian-region or disclosed+agreement-backed); enters the subprocessor register before go-live.
- **OI-3 (NR-2)**: Exact FX staleness window and manual-entry staleness default (Canada-oriented; Module 0 / ops review).
- **OI-4 (NR-4)**: Concrete FX-rate vendor (shared with Rewards) and its residency posture; enters the subprocessor register.
- **OI-5**: Carbon-factor dataset source/version cadence (curated).
- **OI-6**: `SafeToActSignal` `$id`/version confirmation once Cash Safety (Module 3) ships (pinned at `finos:cashsafety/SafeToActSignal/1.0.0`).

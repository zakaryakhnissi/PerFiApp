# Implementation Plan: Module 6 — Shopping & Deals

**Branch**: `008-module-6-shopping` | **Date**: 2026-06-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/008-module-6-shopping/spec.md`

**Note**: This template is filled in by the `/speckit-plan` command. See `.specify/templates/plan-template.md` for the execution workflow.

## Summary

Shopping & Deals is a **P2** product tab that answers the question competitors ignore — *should you buy at all, and when?* It blends retail price intelligence and coupon savings with the spine's **budget headroom, runway safety, and goal impact**, and is strictly **recommend-only**: it never completes a checkout, auto-applies a code, or moves money. Three user stories deliver the module: **US1** surfaces the single best valid coupon at checkout and records the **realized** (not optimistic) saving once the purchase posts; **US2** watches an item against an observed-history baseline and alerts on a real drop framed by budget/goal; **US3** computes a **buy-now-vs-wait** score grounded in budget headroom and `SafeToActSignal`, withholding on stale/missing money inputs and capping at "wait/neutral" when no safety input exists.

The module is a **consumer** of Module 0 spine contracts (`BudgetState`, `CashFlowForecast`, `GoalState`, `MerchantGraph`, `TransactionStream`), Module 1's `OfferCatalog`, and the feature-checked `SafeToActSignal` (Module 3) and `CheckoutRecommendation` (Module 5). It is a **provider** of `WatchedItems`, `CouponRecommendation`, `PurchasePlan`, and `RealizedSavings` to Tasks, Pay, and Inbox. Technical approach: a recommend-only service layer with all monetary math in arbitrary-precision decimal / integer minor units, freshness-gated reads (stale money inputs withhold; stale price/coupon/FX flag), idempotent realized-savings writes keyed on the source event id, server-side cross-member authZ with a mandatory threat model (Household cross-member access + email-sourced enrichment), and consumer+provider contract tests in CI.

## Technical Context

> **Platform-stack note**: The ratified stack is inherited from [platform-decisions.md](../_platform/platform-decisions.md) and is **NOT re-litigated here**. Items below restate the inherited platform choice for this module; genuinely module-specific open inputs are marked **[SHOPPING — module decision]** or resolved in [research.md](./research.md). Platform-level open inputs (vendor selection, staleness tuning) are tracked as **documented open items** in research.md and the platform `NEEDS-RATIFICATION` log — none blocks this plan.

**Language/Version**: TypeScript 5.x on Node 20 LTS (NestJS 10 backend, Fastify adapter) + React Native via Expo (mobile) — **inherited** (platform-decisions §2). One language → bit-identical money/format math client and server.

**Primary Dependencies**: `@finos/money` (integer CAD cents + `decimal.js` arbitrary-precision rates) and `@finos/format` (en-CA/fr-CA locale rendering) — **inherited, reused not re-implemented**; Prisma ORM on PostgreSQL 16; Pact for consumer+provider contract tests; BullMQ (Redis) workers for coupon/price/FX ingestion with mandatory timeouts/retries/rate-limits. Spine, Rewards, Cash-Safety, and Pay access is via versioned contract clients under `contracts/consumed/`, never direct DB reads — **[SHOPPING — module decision]**.

**Storage**: Shopping-owned schema (`shopping`) in the single Canadian-region PostgreSQL 16 (`ca-central-1` Montréal, `ca-west-1` DR) — **inherited** (platform-decisions §2). Owned tables: `watched_item`, `coupon_offer` cache, `coupon_recommendation`, `purchase_plan`, `realized_savings` (append-only, `source_event_id UNIQUE`), with per-schema role + RLS keyed on `profile_id`/household membership. No private copy of balances/budget/credit — read from spine contracts. Money columns are `BIGINT` (`*_cents`) or `NUMERIC`; **never** `float`/`double`/`real`.

**Testing**: Unit (money fixtures, coupon-saving + FX slippage, realized-vs-expected divergence, buy/wait branch logic, freshness/withhold), **consumer + provider contract tests** per contract (Pact), integration per user story (Testcontainers Postgres), mobile component + bilingual/locale + WCAG a11y — all in CI. Tests are mandatory (Constitution III).

**Target Platform**: Mobile-first (iOS/Android) Canadian app with a NestJS backend API — **inherited** (platform-decisions §2).

**Project Type**: Web/mobile — backend bounded-context module (`ShoppingModule`) + mobile feature module.

**Performance Goals**: ≤ 300 ms cold-start / module-switch (umbrella SC-010 / FR-X-015) — met via a locally cached, freshness-stamped watchlist + last coupon surface; the buy/wait score returns within budget on cached spine reads, and stale reads render a flagged/withheld state rather than a blocking fetch.

**Constraints**: Money is exact (integer minor units / arbitrary-precision decimal, never float — Principle IV); recommend-only, no money movement (Principle IV / FR-X-003); every external-sourced value carries a freshness stamp — stale **money** inputs withhold, stale **price/coupon/FX** flag (Principle VIII); idempotent realized-savings writes keyed on the source event id (Principle IV / FR-X-003); EN/FR + locale-correct formatting (Principle II); cross-member authZ enforced server-side, never on a client-supplied id (Principle V); Inbox-only notifications, no standalone push (ux-foundations §6).

**Scale/Scope**: Per-user shopping data (tens of watched items typical); **3 module-owned FRs (FR-SHOP-001..003)** across **3 prioritized user stories (US1–US3, all P2)**; ~6 owned/provided entities; provides 4 contracts (`WatchedItems`, `CouponRecommendation`, `PurchasePlan`, `RealizedSavings`); consumes 5 spine + 1 Rewards contract, plus 2 feature-checked (`SafeToActSignal`, `CheckoutRecommendation`). MVP-scoped per Principle IX — thorough analysis, lean feature set; no buy/wait sub-models beyond the budget/runway/goal grounding.

**NEEDS CLARIFICATION** (→ [research.md](./research.md), all non-blocking with documented working defaults): (1) concrete Canadian coupon feed vendor + residency posture (OI-1); (2) concrete price-history feed vendor + residency posture (OI-2); (3) final coupon/price/FX staleness windows (OI-3); (4) Pay `CheckoutRecommendation` availability at MVP (OI-4, feature-checked); (5) Cash-Safety `SafeToActSignal` availability (OI-5, `CashFlowForecast` fallback governs until it ships).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design. Reference: `.specify/memory/constitution.md` (v2.2.0).*

Mark each gate **PASS / FAIL / N/A** with a one-line justification. Any **FAIL**, or an **N/A** that isn't justified, blocks the plan — either change the design or record the trade-off in [Complexity Tracking](#complexity-tracking). The two NON-NEGOTIABLE principles (IV, III) cannot be waived via Complexity Tracking.

| # | Principle / Standard | Gate question | Status |
|---|----------------------|---------------|--------|
| I | Integration-First | Recommendations read real budget/cash-flow/runway/goals state? | **PASS** — buy/wait consumes `BudgetState`, `CashFlowForecast`, `GoalState`, and `SafeToActSignal`; drop alerts and realized savings are budget-category- and goal-framed; a score that ignores an available input is a defect (SC-SH-001). |
| II | Canada-First & Bilingual | CAD + time-to-goal; EN/FR; locale-correct formatting? | **PASS** — savings/prices/best-dates in CAD with time-to-goal; EN/FR with no single-language leaks; fr-CA `12,50 $` / `3 juillet 2026` via `@finos/format` (SC-SH-008). |
| III | Test-First (NON-NEGOTIABLE) | Failing tests before implementation incl. edge cases? | **PASS** — coupon/FX money fixtures, realized-vs-expected divergence, buy/wait branch logic, stale/withhold, idempotency, bilingual, and consumer+provider contract tests authored first (mandatory). |
| IV | Money Is Exact (NON-NEGOTIABLE) | Decimal/minor-units, unit-tested rounding, deterministic, idempotent, recommend-only? | **PASS** — integer CAD cents + arbitrary-precision FX/discount fractions, half-up at the final cent only, slippage fixtures; `RealizedSavings` writes idempotent on `source_event_id`; **no money-movement endpoint** (recommend-only). |
| V | Security & Least Privilege | Encryption, secret handling, cross-user authZ, threat model? | **PASS** — **threat model mandatory and present** (Household cross-member watchlist/ledger/buy-wait history + email-sourced enrichment); cross-member authZ enforced server-side on session identity + `MemberScope`, never a client-supplied `profileId`/`memberId`; RLS on every owned table; no aggregation-token handling here (owned by Module 0). |
| VI | Explainable & Auditable | Inputs + reasoning on recommendations; immutable audit trail; withhold-or-documented-default on missing inputs? | **PASS** — `PurchasePlan`/`CouponRecommendation` carry `Reasoning` (inputs + bilingual rationale); `recommendation_shown` + confirmed actions written to the append-only audit trail; missing/stale **money** inputs withhold; absent `SafeToActSignal` falls back to `CashFlowForecast` and, if both absent, **caps at wait/neutral** (a stricter boundary than Rewards' silent default because the missing input bears on a spend — documented Clarification Q4). |
| VII | Module Boundaries, Contracts & Versioning | Schema-defined contracts, consumer+provider tests, semver? | **PASS** — consumes/provides via versioned JSON-Schema contracts (`finos:shopping/*`, `finos:spine/*`, `finos:rewards/OfferCatalog/1.0.0`); consumer+provider Pact tests in CI (SC-SH-010); version skew disables the dependent feature; semver with deprecation window. |
| VIII | Fresh or Flagged | Freshness stamps; stale flagged/withheld; ingestion resilience? | **PASS** — coupons/prices/FX carry freshness stamps; stale **money** inputs withhold the score, stale **price/coupon/FX** flag the figure (no live-drop on stale price); coupon/price/FX ingestion has timeouts/retries/rate-limits (SC-SH-003/004). |
| IX | Simplicity & YAGNI | Complexity justified, MVP scope? | **PASS** — read/recommend service over spine contracts + two swappable feed interfaces (`CouponProvider`, `PriceProvider`); no premature buy/wait ML; P2 MVP scope (thorough analysis, lean feature set). |
| QS | Quality Standards | Logging redaction, PIPEDA/Law 25, retention, residency, ≤300ms, WCAG AA, advice framing? | **PASS** — PII/money redacted in logs (audit separate); Canadian-region residency; email-sourced enrichment honors FR-X-013 7-day purge + FR-X-019 dormant bound; ≤300 ms module-switch; WCAG 2.1 AA bilingual SR labels; not-regulated-advice framing on Confirm-Action sheets. |

**Threat model (Principle V)** — **REQUIRED** here because Shopping touches another household member's financial data (watchlist / realized-savings ledger / buy-wait history) **and** ingests email-sourced enrichment. Link: [spec.md → Security & Privacy Threat Model](./spec.md#security--privacy-threat-model-mandatory--household-cross-member-access--email-sourced-enrichment). Aggregation-token lifecycle is **out of scope** for Shopping (owned by Module 0 / FR-CORE-007); Shopping reads spine contracts only.

**Initial Constitution Check** (before Phase 0): **PASS** — no violations; no Complexity Tracking entries required.

**Post-Design Constitution Check** (after Phase 1): **PASS** — data model and contracts preserve money-exactness (integer cents + decimal-string FX), freshness withhold/flag split, idempotent realized-savings, server-side cross-member authZ, recommend-only, and the documented capped-output safety boundary; no new violations introduced.

## Project Structure

### Documentation (this feature)

```text
specs/008-module-6-shopping/
├── plan.md              # This file (/speckit-plan command output)
├── research.md          # Phase 0 output (/speckit-plan command)
├── data-model.md        # Phase 1 output (/speckit-plan command)
├── quickstart.md        # Phase 1 output (/speckit-plan command)
├── contracts/           # Phase 1 output (/speckit-plan command)
│   ├── consumed/        # referenced spine/Rewards/Cash-Safety/Pay contracts (consumer tests pin min versions)
│   └── provided/        # WatchedItems, CouponRecommendation, PurchasePlan, RealizedSavings schemas
└── tasks.md             # Phase 2 output (/speckit-tasks command - NOT created by /speckit-plan)
```

### Source Code (repository root)

```text
backend/
└── src/modules/shopping/
    ├── domain/            # entities: WatchedItem, CouponOffer, CouponRecommendation,
    │                      #           PurchasePlan/BuyWaitScore, RealizedSavings, AuditEvent
    ├── money/             # coupon-saving + FX helpers over @finos/money (half-up at final cent, no float)
    ├── services/          # coupon-selection, price-watch/baseline, drop-alert, buy-wait-scorer,
    │                      #           realized-savings-recorder, coupon-provider, price-provider
    ├── contracts/
    │   ├── consumed/      # typed clients: budget-state, cash-flow, goal-state, merchant-graph,
    │   │                  #           transaction-stream, offer-catalog, safe-to-act (feature-checked),
    │   │                  #           checkout-recommendation (feature-checked)
    │   └── provided/      # WatchedItems, CouponRecommendation, PurchasePlan, RealizedSavings
    └── api/               # recommend-only endpoints (propose / confirm-and-record only — no money movement)
backend/tests/
├── contract/             # consumer + provider contract tests (Pact)
├── integration/          # per user story (US1..US3) + cross-member authZ + redaction/audit
└── unit/                 # money fixtures, coupon/FX slippage, divergence, buy/wait branches, idempotency

mobile/
└── src/features/shopping/
    ├── coupon-checkout/   # US1 — best-coupon surface + realized-savings ledger
    ├── price-watch/       # US2 — watchlist + droplist
    └── buy-wait/          # US3 — buy-now-vs-wait detail + conflict banner
mobile/tests/             # component + locale/bilingual + a11y tests
```

**Structure Decision**: Web/mobile split. Shopping is a self-contained backend bounded context (`backend/src/modules/shopping/` = `ShoppingModule`) exposing recommend-only endpoints and the four provided contracts, plus a mobile feature module (`mobile/src/features/shopping/`) organized by user story. The module never reads spine/Rewards storage directly — only the versioned contract clients under `contracts/consumed/` — preserving the swappable-spine boundary (Principle VII), enforced by the platform's lint-banned cross-module import rule and per-schema Postgres roles. The concrete repository-root layout and the `shopping` schema role/RLS are ratified in the Module 0 platform plan; this plan commits the intra-module structure.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — the Initial and Post-Design Constitution Checks both PASS with no violations. No complexity deviations to justify. The two genuinely module-specific design risks (buy/wait safety fallback when Cash Safety is unshipped; coupon/price vendor abstraction) are resolved within constitutional bounds in research.md (Clarification Q4 capped-output rule; `CouponProvider`/`PriceProvider` interfaces) and require no waiver.

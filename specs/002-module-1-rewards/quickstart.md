# Quickstart & Validation: Module 1 — Rewards & Loyalty

**Feature**: `002-module-1-rewards` | **Date**: 2026-06-26

A run/validation guide proving Rewards works end-to-end against the [data model](./data-model.md) and [contracts](./contracts/README.md). Implementation details belong in `tasks.md`; this is the "does it actually work" checklist tied to the spec's user stories and success criteria.

## Prerequisites

- Module 0 spine contract clients available (or stubbed) exposing `BudgetState`, `CashFlowForecast`, `CreditState`, `MerchantGraph`, `GoalState`. `SafeToActSignal` (Module 3) optional — its consumer is feature-checked.
- Seeded fixtures: a curated card-knowledgebase sample, a redemption-rate table, an FX rate, and a `MerchantGraph` test node.
- Toolchain per the Module 0 platform plan (see [plan.md](./plan.md) Technical Context). Commands below are illustrative — adjust to the ratified stack.

## Setup

```bash
# from repo root
<pkg> install
<pkg> run seed:rewards-fixtures      # cards, rates, fx, merchant node
```

## Validation by user story

### US1 — Points Wallet valued in CAD (P1)

```bash
<pkg> test rewards/unit/valuation
<pkg> test rewards/integration/points-wallet
```

Expected:
- Each connected program shows `cad_value_cents` + time-to-goal contribution, each with a `FreshnessStamp`.
- **Money fixture (mandatory)**: `500000 points × 1.05 cpp → 525000 cents` ($5,250.00) — exact, no slippage (SC-R-004).
- A redemption-rate fixture marked stale renders the valuation **flagged/withheld**, not fresh (SC-R-005).
- fr-CA locale renders `1 234,56 $` (SC-R-006).

### US2 — Best Card Recommender (P1)

```bash
<pkg> test rewards/unit/recommender-bands
<pkg> test rewards/integration/best-card
```

Expected:
- Recommendation names **one** card; `reasoning.inputs` includes earn_rate, budget_headroom_cents, utilization_before/after; `rationale_en` and `rationale_fr` both present (SC-R-002/003).
- A candidate whose projected utilization > 50% is **excluded**; a safer card is named with explanation.
- A candidate landing 30–50% returns `utilization_warning = true`.
- Stale/missing `BudgetState` or `CreditState` → recommendation **WITHHELD** (asks user), never guessed.
- With `SafeToActSignal` overdraft risk present → `safe_to_act_deferred = true`, conflict + resolution surfaced.

### US3 — Card Knowledgebase & Perks Coach (P2)

```bash
<pkg> test rewards/integration/perks-coach
```

Expected: a card with an unused statement credit nearing `reset_date` shows a usage plan + downgrade/cancel flag when `chronically_unused`; knowledgebase fields render bilingually (no single-language leak).

### US4 — Welcome Bonus & Min-Spend Tracker (P2)

```bash
<pkg> test rewards/integration/bonus-tracker
```

Expected: an in-progress min-spend shows remaining amount/days + bonus CAD value; when meeting it would exceed healthy budget headroom, `over_budget_warning = true` and an alternate path is offered.

### US5 — Card-Linked Offers (P3)

```bash
<pkg> test rewards/integration/offers
```

Expected: each offer is normalized, tied to a `budget_category` and `merchant_ref`, with a `FreshnessStamp`; a stale-feed offer is flagged/withheld; activation is idempotent (replayed activation does not double-apply).

### US6 — Transfer & Redemption Intelligence (P2)

```bash
<pkg> test rewards/unit/transfer-valuation
<pkg> test rewards/integration/transfer-intelligence
```

Expected:
- A currency shows its transfer partners + ratios; an active bonus yields an `effective_rate ≥ base_rate`.
- **Transfer fixture (mandatory)**: `100000 pts at 1:1 + 30% bonus → 130000 partner pts` valued with **no cent drift** (SC-R-004/010).
- An **expired** transfer bonus is NOT applied — `effective_rate` falls back to `base_rate` (SC-R-010).
- Earn-path for a target redemption uses **only held cards** and is labelled `informational_only` (SC-R-012).
- A balance with points expiring within the window shows the expiry date + at-risk CAD value (SC-R-011); unknown policy renders "expiry unknown", never assumed non-expiring.
- Manual-entry balance past its user-set window renders flagged-stale (FR-REW-010).

## Contract tests (mandatory — Principle VII / SC-R-008)

```bash
<pkg> test rewards/contract/consumed   # BudgetState, CashFlowForecast, CreditState, MerchantGraph, GoalState, SafeToActSignal
<pkg> test rewards/contract/provided   # CardLineup, PointsValuation, BestCardRecommendation, OfferCatalog, StatusState, TransferIntelligence
```

Expected: all consumer + provider contract tests pass; an intentionally bumped/broken consumed schema **fails CI** and disables the dependent recommendation (version-skew behavior).

## Cross-cutting checks

- **Recommend-only (SC-R / FR-X-003)**: grep the Rewards API surface — there is **no** money-movement endpoint; every action is a recommendation or a user-confirmed state write.
- **Audit trail (Principle VI)**: `perk_marked_used` / `offer_activated` / `recommendation_shown` produce append-only `AuditEvent`s, kept separate from debug logs.
- **Redaction (FR-X-014)**: debug logs contain no PII or monetary values.
- **Performance (SC-010)**: module-switch into Rewards renders the cached wallet/lineup in ≤ 300 ms; cache miss/stale renders a flagged state rather than blocking.
- **Accessibility (SC-011)**: WCAG 2.1 AA, bilingual screen-reader labels on interactive elements.

## Done when

All user-story validations pass, the money fixtures show zero slippage, all consumer+provider contract tests are green, and the cross-cutting checks hold.

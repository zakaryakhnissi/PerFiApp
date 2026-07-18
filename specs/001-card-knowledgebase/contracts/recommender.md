# Contract: Recommender engine (`packages/recommender`)

Pure, synchronous, dependency-free (except `packages/money`, `packages/kb-schema`).
Consumed by the mobile app; runs entirely on-device. **This is Principle V financial
logic: the tests below are written and failing before implementation.**

## API

```ts
function rankCards(input: {
  wallet: Wallet;                       // device wallet (card id refs)
  snapshot: KnowledgebaseSnapshot;      // cached KB
  categoryId: SpendCategoryId;
  amountCents?: number;                 // omit → per-$100 basis (10_000 cents)
}): RankedCard[]                        // ordered best-first; [] iff wallet empty
```

`RankedCard` per data-model.md `Recommendation` (expectedValue: Money, appliedRate,
valuationUsed, explanation as i18n key + params).

## Behavioral contract

| # | Guarantee | Source |
|---|---|---|
| C1 | Deterministic: identical inputs → identical output array (order and values) | FR-011, SC-005 |
| C2 | Wallet order irrelevant: any permutation of `wallet.cardIds` → same output | FR-011 |
| C3 | Exact cents: `expectedValue` from the documented half-even rounding in `packages/money`; reconciles to the cent with KB terms | FR-008, SC-002 |
| C4 | Fee is sunk: `annualFee` never changes `expectedValue`; used only in tie-break | Clarifications |
| C5 | Tie-break totality: equal value → lower fee → `cardId` lexicographic; no unordered pairs | FR-011 |
| C6 | Bonus-else-base: category rate if present, else base rate; result marks which | FR-009 |
| C7 | Default valuation disclosed: `valuationUsed.isDefault` true ⇒ explanation includes the disclosure param | FR-005/010 |
| C8 | Cap disclosed: card has `capDisclosures[categoryId]` ⇒ explanation includes it | Edge cases |
| C9 | Invalid amount (`<= 0`, non-integer) → typed error; never a silent empty result | Edge cases |
| C10 | Wallet card ids missing from snapshot → reported in a `missingCardIds` side list, excluded from ranking, never thrown away silently | data-model.md |

## Required test artifacts (fail-first)

1. **Oracle table**: ≥ 12 hand-computed cases (cashback, points, default valuation,
   ties, no-amount basis, zero-bonus category) asserting exact cent values.
2. **fast-check properties**: C1, C2, C5 over generated wallets/KBs/amounts.
3. **Rounding boundary cases**: half-even at `.5` cent boundaries in both the cashback
   and points paths.

# Data Model: Card Knowledgebase & Best Card Recommender

Types are expressed conceptually; the source of truth at implementation time is
`packages/kb-schema` (zod). All text shown to users is a **BilingualText**; all money is
**Money**; no floats anywhere.

## Shared value types

| Type | Shape | Rules |
|---|---|---|
| `BilingualText` | `{ enCA: string, frCA: string }` | Both non-empty; validated at ingest (FR-003) |
| `Money` | `{ amountCents: int, currency: 'CAD' }` | Integer cents only (Principle II) |
| `RateBps` | `int` | Earn rate in basis points (2% = 200) |
| `PointValueMilliCents` | `int` | Valuation in 1/1000 cent per point (0.5¢ = 500) |
| `SpendCategoryId` | enum | Exactly 10: `groceries, gas, dining, recurring_bills, pharmacy, travel, transit, entertainment, online_shopping, other` |

## Entities

### Card (knowledgebase, API + cached on device)

| Field | Type | Rules |
|---|---|---|
| `id` | string (slug) | Unique, stable across KB versions |
| `issuer` | BilingualText | — |
| `network` | enum `visa \| mastercard \| amex \| interac` | — |
| `name` | BilingualText | — |
| `annualFee` | Money | ≥ 0 |
| `rewardCurrency` | `{ kind: 'cashback' } \| { kind: 'points', programId }` | `programId` must resolve to a RewardProgram |
| `earnRates` | `{ base: RateBps, byCategory: Partial<Record<SpendCategoryId, RateBps>> }` | `base` ≥ 0; category entries override base; caps not modelled — see `capDisclosures` |
| `capDisclosures` | `Partial<Record<SpendCategoryId, BilingualText>>` | Present when a bonus rate has a cap (edge case: disclosed, not computed) |
| `welcomeBonus` | `{ description: BilingualText, minSpend?: Money, deadlineDays?: int } \| null` | Display-only in v1 |
| `statementCredits` | `Array<{ description: BilingualText, amount: Money, cadence: BilingualText }>` | Display-only in v1 |
| `perks` | `BilingualText[]` | Display-only |
| `insurance` | `BilingualText[]` | Display-only |
| `dataAsOf` | ISO date | Required; shown to users (FR-014) |

### RewardProgram

| Field | Type | Rules |
|---|---|---|
| `id` | string (slug) | Unique |
| `name` | BilingualText | — |
| `valuation` | `{ milliCentsPerPoint: PointValueMilliCents, source: string, asOf: ISO date, isDefault: boolean }` | `isDefault: true` ⇒ value is the conservative 500 (0.5¢/pt) and recommendations must disclose it (FR-005) |

### SpendCategory

Fixed list of 10; each entry `{ id: SpendCategoryId, label: BilingualText }`. Shipped
with the KB payload so labels stay versioned with data.

### KnowledgebaseSnapshot (device cache)

`{ kbVersion: int, fetchedAt: ISO datetime, cards: Card[], programs: RewardProgram[],
categories: SpendCategory[], schemaVersion: int }` — zod-validated on read; refreshed
when `GET /v1/kb-version` > cached `kbVersion`.

### Wallet (device only — never transmitted)

`{ schemaVersion: int, cardIds: string[] }` — set semantics (no duplicates); entries
referencing cards absent from the current KB snapshot are surfaced as "card no longer
listed", not silently dropped.

### Recommendation (computed, never stored)

Input: `(wallet, categoryId, amountCents?)` + KnowledgebaseSnapshot.
Output, per wallet card, ordered:

| Field | Meaning |
|---|---|
| `cardId` | Ranked card |
| `expectedValue` | Money — exact cents (for the given amount, or per $100.00 when no amount) |
| `appliedRate` | RateBps + whether it was a category bonus or base rate |
| `valuationUsed` | For points cards: milliCentsPerPoint + `isDefault` flag |
| `explanation` | i18n key + parameters (rendered in the active locale; includes fee-is-sunk disclosure, default-valuation disclosure, cap disclosure when applicable) |

**Ranking rule**: descending `expectedValue`; ties → lower `annualFee`, then `cardId`
lexicographic (FR-011).

**Rounding rule**: single boundary — `round_half_even(amountCents × rateBps / 10_000)`
for cashback; for points: `points = amountCents × rateBps / 10_000` (kept exact as
integer math where possible), then `round_half_even(points × milliCentsPerPoint /
1_000)`. Implemented once in `packages/money`, property-tested (Principle II/V).

## Relationships

```text
RewardProgram 1 ── * Card            (via rewardCurrency.programId)
SpendCategory 10 ── * EarnRate       (via earnRates.byCategory keys)
Wallet * ── * Card                   (by id reference, device-side only)
KnowledgebaseSnapshot 1 ── * (Card, RewardProgram, SpendCategory)
```

## State transitions

- **KB refresh**: `cached(kbVersion=n)` → fetch when server reports `m > n` →
  `cached(kbVersion=m)`; wallet untouched by refreshes (FR edge case: updated terms
  apply on next recommendation).
- **Wallet**: add (idempotent), remove; no other states.

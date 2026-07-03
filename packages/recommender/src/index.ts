/**
 * @perfiapp/recommender — pure, deterministic best-card ranking engine
 * (contracts/recommender.md). Runs entirely on-device; the wallet never
 * leaves the phone. All value math delegates to @perfiapp/money
 * (Constitution Principles II & V).
 */
import {
  PER_HUNDRED_DOLLARS_CENTS,
  assertValidAmountCents,
  cashbackValueCents,
  money,
  pointsEarnedCentiPoints,
  pointsValueCents,
  type Money,
} from '@perfiapp/money';
import type {
  Card,
  KnowledgebaseSnapshot,
  RewardProgram,
  SpendCategoryId,
  Wallet,
} from '@perfiapp/kb-schema';

export interface AppliedRate {
  bps: number;
  kind: 'bonus' | 'base';
}

export interface ValuationUsed {
  milliCentsPerPoint: number;
  isDefault: boolean;
}

/**
 * One localizable line of the "why" (FR-010): an i18n key from
 * @perfiapp/i18n plus raw parameters. The UI renders and formats
 * (Intl.NumberFormat) in the active locale.
 */
export interface ExplanationPart {
  key: string;
  params: Record<string, string | number>;
}

export interface RankedCard {
  cardId: string;
  expectedValue: Money;
  appliedRate: AppliedRate;
  valuationUsed?: ValuationUsed;
  explanation: ExplanationPart[];
}

export interface RankInput {
  wallet: Wallet;
  snapshot: KnowledgebaseSnapshot;
  categoryId: SpendCategoryId;
  amountCents?: number;
}

export interface RankResult {
  ranked: RankedCard[];
  /** Wallet entries not present in the snapshot (C10) — surfaced, not dropped. */
  missingCardIds: string[];
  /** True when no amount was given and the per-$100 basis was used. */
  usedPerHundredBasis: boolean;
  /** The amount the values were computed for, in cents. */
  basisAmountCents: number;
}

function appliedRateFor(card: Card, categoryId: SpendCategoryId): AppliedRate {
  const bonus = card.earnRates.byCategory[categoryId];
  return bonus !== undefined
    ? { bps: bonus, kind: 'bonus' }
    : { bps: card.earnRates.base, kind: 'base' };
}

function evaluateCard(
  card: Card,
  programsById: Map<string, RewardProgram>,
  categoryId: SpendCategoryId,
  amountCents: number,
): RankedCard {
  const rate = appliedRateFor(card, categoryId);
  const explanation: ExplanationPart[] = [];
  let expectedValue: Money;
  let valuationUsed: ValuationUsed | undefined;

  if (card.rewardCurrency.kind === 'cashback') {
    expectedValue = money(cashbackValueCents(amountCents, rate.bps));
    explanation.push({
      key: 'explanation.cashbackRate',
      params: { rateBps: rate.bps, amountCents, categoryId },
    });
  } else {
    const program = programsById.get(card.rewardCurrency.programId);
    if (!program) {
      // The snapshot validator (kb-schema) makes this unreachable for valid
      // snapshots; fail loudly rather than rank on wrong math.
      throw new Error(`snapshot integrity: program ${card.rewardCurrency.programId} not found`);
    }
    const { milliCentsPerPoint, isDefault } = program.valuation;
    expectedValue = money(pointsValueCents(amountCents, rate.bps, milliCentsPerPoint));
    valuationUsed = { milliCentsPerPoint, isDefault };
    explanation.push({
      key: 'explanation.pointsRate',
      params: {
        rateBps: rate.bps,
        amountCents,
        categoryId,
        pointsCenti: pointsEarnedCentiPoints(amountCents, rate.bps),
      },
    });
    explanation.push(
      isDefault
        ? {
            key: 'explanation.valuationDefault',
            params: { milliCentsPerPoint },
          }
        : {
            key: 'explanation.valuation',
            params: {
              milliCentsPerPoint,
              source: program.valuation.source,
              asOf: program.valuation.asOf,
            },
          },
    );
  }

  if (rate.kind === 'base') {
    explanation.push({ key: 'explanation.baseRateFallback', params: { categoryId } });
  }

  const capDisclosure = card.capDisclosures[categoryId];
  if (rate.kind === 'bonus' && capDisclosure !== undefined) {
    explanation.push({
      key: 'explanation.capNotModelled',
      params: { disclosureEnCA: capDisclosure.enCA, disclosureFrCA: capDisclosure.frCA },
    });
  }

  // Fee treatment is identical for every card and always disclosed (C4).
  explanation.push({ key: 'explanation.feeSunk', params: { annualFeeCents: card.annualFee.amountCents } });

  const ranked: RankedCard = { cardId: card.id, expectedValue, appliedRate: rate, explanation };
  return valuationUsed !== undefined ? { ...ranked, valuationUsed } : ranked;
}

/**
 * Rank the user's wallet for a purchase. Deterministic (C1/C2): output depends
 * only on (snapshot, wallet set, category, amount) — never on wallet order,
 * time, or randomness. Ordering: expected value desc, then annual fee asc,
 * then cardId lexicographic (C5).
 */
export function rankCards(input: RankInput): RankResult {
  const { wallet, snapshot, categoryId } = input;

  const usedPerHundredBasis = input.amountCents === undefined;
  const basisAmountCents = input.amountCents ?? PER_HUNDRED_DOLLARS_CENTS;
  assertValidAmountCents(basisAmountCents); // C9 — typed error, never silent

  const cardsById = new Map(snapshot.cards.map((c) => [c.id, c]));
  const programsById = new Map(snapshot.programs.map((p) => [p.id, p]));

  // De-duplicate and sort the wallet ids so results are order-independent (C2).
  const uniqueIds = [...new Set(wallet.cardIds)].sort();
  const missingCardIds = uniqueIds.filter((id) => !cardsById.has(id));

  const ranked = uniqueIds
    .filter((id) => cardsById.has(id))
    .map((id) => evaluateCard(cardsById.get(id)!, programsById, categoryId, basisAmountCents))
    .sort((a, b) => {
      if (a.expectedValue.amountCents !== b.expectedValue.amountCents) {
        return b.expectedValue.amountCents - a.expectedValue.amountCents;
      }
      const feeA = cardsById.get(a.cardId)!.annualFee.amountCents;
      const feeB = cardsById.get(b.cardId)!.annualFee.amountCents;
      if (feeA !== feeB) return feeA - feeB;
      return a.cardId < b.cardId ? -1 : 1;
    });

  return { ranked, missingCardIds, usedPerHundredBasis, basisAmountCents };
}

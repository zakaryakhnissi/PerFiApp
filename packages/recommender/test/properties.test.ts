/**
 * T014 — fast-check property suites for contract guarantees C1 (determinism),
 * C2 (wallet-permutation invariance), C5 (tie-break totality).
 */
import fc from 'fast-check';
import type { Card, RewardProgram } from '@perfiapp/kb-schema';
import { rankCards } from '../src';
import { GROCERIES, makeCard, makeProgram, makeSnapshot, walletOf } from './fixtures';

const programArb = fc
  .record({
    idx: fc.integer({ min: 0, max: 4 }),
    mcpp: fc.integer({ min: 100, max: 5_000 }),
    isDefault: fc.boolean(),
  })
  .map(({ idx, mcpp, isDefault }) =>
    makeProgram({
      id: `prog-${idx}`,
      valuation: { milliCentsPerPoint: mcpp, source: 't', asOf: '2026-07-03', isDefault },
    }),
  );

const cardArb = (programIds: string[]) =>
  fc
    .record({
      idx: fc.integer({ min: 0, max: 999 }),
      feeCents: fc.integer({ min: 0, max: 70_000 }),
      base: fc.integer({ min: 0, max: 600 }),
      groceriesBonus: fc.option(fc.integer({ min: 0, max: 700 }), { nil: undefined }),
      programChoice: fc.option(fc.integer({ min: 0, max: Math.max(programIds.length - 1, 0) }), {
        nil: undefined,
      }),
    })
    .map(({ idx, feeCents, base, groceriesBonus, programChoice }) =>
      makeCard({
        id: `card-${String(idx).padStart(3, '0')}`,
        annualFee: { amountCents: feeCents, currency: 'CAD' },
        rewardCurrency:
          programChoice !== undefined && programIds.length > 0
            ? { kind: 'points', programId: programIds[programChoice % programIds.length]! }
            : { kind: 'cashback' },
        earnRates: {
          base,
          byCategory: groceriesBonus !== undefined ? { groceries: groceriesBonus } : {},
        },
      }),
    );

const scenarioArb = fc
  .array(programArb, { minLength: 0, maxLength: 3 })
  .chain((programs) => {
    const uniquePrograms = [...new Map(programs.map((p) => [p.id, p])).values()];
    return fc
      .array(cardArb(uniquePrograms.map((p) => p.id)), { minLength: 1, maxLength: 8 })
      .map((cards) => {
        const uniqueCards = [...new Map(cards.map((c) => [c.id, c])).values()];
        return { cards: uniqueCards, programs: uniquePrograms };
      });
  })
  .chain(({ cards, programs }) =>
    fc
      .record({
        amount: fc.option(fc.integer({ min: 1, max: 5_000_000 }), { nil: undefined }),
      })
      .map(({ amount }) => ({ cards, programs, amount })),
  );

function run(scenario: { cards: Card[]; programs: RewardProgram[]; amount?: number | undefined }, cardIds: string[]) {
  return rankCards({
    wallet: walletOf(...cardIds),
    snapshot: makeSnapshot(scenario.cards, scenario.programs),
    categoryId: GROCERIES,
    ...(scenario.amount !== undefined ? { amountCents: scenario.amount } : {}),
  });
}

describe('contract properties', () => {
  it('C1 — determinism: identical inputs give identical results', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const ids = scenario.cards.map((c) => c.id);
        const a = run(scenario, ids);
        const b = run(scenario, ids);
        expect(b).toEqual(a);
      }),
      { numRuns: 200 },
    );
  });

  it('C2 — wallet order is irrelevant', () => {
    fc.assert(
      fc.property(
        scenarioArb.chain((scenario) =>
          fc
            .shuffledSubarray(scenario.cards.map((c) => c.id), {
              minLength: scenario.cards.length,
              maxLength: scenario.cards.length,
            })
            .map((shuffled) => ({ scenario, shuffled })),
        ),
        ({ scenario, shuffled }) => {
          const sorted = run(scenario, scenario.cards.map((c) => c.id));
          const permuted = run(scenario, shuffled);
          expect(permuted).toEqual(sorted);
        },
      ),
      { numRuns: 200 },
    );
  });

  it('C5 — tie-break totality: output is strictly ordered by (value desc, fee asc, id asc)', () => {
    fc.assert(
      fc.property(scenarioArb, (scenario) => {
        const { ranked } = run(scenario, scenario.cards.map((c) => c.id));
        const feeOf = (id: string) => scenario.cards.find((c) => c.id === id)!.annualFee.amountCents;
        const strictlyBefore = (a: (typeof ranked)[number], b: (typeof ranked)[number]): boolean => {
          if (a.expectedValue.amountCents !== b.expectedValue.amountCents) {
            return a.expectedValue.amountCents > b.expectedValue.amountCents;
          }
          if (feeOf(a.cardId) !== feeOf(b.cardId)) return feeOf(a.cardId) < feeOf(b.cardId);
          return a.cardId < b.cardId;
        };
        for (let i = 1; i < ranked.length; i += 1) {
          // strict order — no unordered pairs, no duplicates
          expect(strictlyBefore(ranked[i - 1]!, ranked[i]!)).toBe(true);
        }
      }),
      { numRuns: 200 },
    );
  });
});

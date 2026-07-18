/**
 * T013 — Oracle table (contracts/recommender.md, "Required test artifacts" 1).
 * Every expected value is hand-computed in exact cents. Committed failing
 * before the engine exists (Principle V).
 */
import { rankCards } from '../src';
import { GROCERIES, makeCard, makeProgram, makeSnapshot, walletOf } from './fixtures';

const cashbackA = makeCard({
  id: 'card-a',
  earnRates: { base: 50, byCategory: { groceries: 200 } }, // 2% groceries
});
const pointsB = makeCard({
  id: 'card-b',
  rewardCurrency: { kind: 'points', programId: 'prog-15' },
  earnRates: { base: 100, byCategory: {} }, // 1 pt/$
});
const prog15 = makeProgram({
  id: 'prog-15',
  valuation: { milliCentsPerPoint: 1500, source: 'test', asOf: '2026-07-03', isDefault: false },
});

describe('oracle table', () => {
  it('O1 — spec US1 scenario 1: $100 groceries, 2% cash back beats 1 pt/$ @ 1.5¢', () => {
    const { ranked } = rankCards({
      wallet: walletOf('card-a', 'card-b'),
      snapshot: makeSnapshot([cashbackA, pointsB], [prog15]),
      categoryId: GROCERIES,
      amountCents: 10_000,
    });
    expect(ranked.map((r) => r.cardId)).toEqual(['card-a', 'card-b']);
    expect(ranked[0]!.expectedValue.amountCents).toBe(200); // $2.00
    expect(ranked[1]!.expectedValue.amountCents).toBe(150); // $1.50
  });

  it('O2 — no amount: per-$100 basis produces the same values (spec US1 scenario 2)', () => {
    const result = rankCards({
      wallet: walletOf('card-a', 'card-b'),
      snapshot: makeSnapshot([cashbackA, pointsB], [prog15]),
      categoryId: GROCERIES,
    });
    expect(result.usedPerHundredBasis).toBe(true);
    expect(result.ranked[0]!.expectedValue.amountCents).toBe(200);
    expect(result.ranked[1]!.expectedValue.amountCents).toBe(150);
  });

  it('O3 — zero-bonus category falls back to base rates (spec US1 scenario 3)', () => {
    const { ranked } = rankCards({
      wallet: walletOf('card-a', 'card-b'),
      snapshot: makeSnapshot([cashbackA, pointsB], [prog15]),
      categoryId: 'pharmacy',
      amountCents: 10_000,
    });
    // card-a base 0.5% = 50c? no: 50 bps on $100.00 = 10_000*50/10_000 = 50 cents
    // card-b base 1 pt/$ @1.5c = 150 cents
    expect(ranked.map((r) => r.cardId)).toEqual(['card-b', 'card-a']);
    expect(ranked[0]!.expectedValue.amountCents).toBe(150);
    expect(ranked[1]!.expectedValue.amountCents).toBe(50);
    expect(ranked.every((r) => r.appliedRate.kind === 'base')).toBe(true);
  });

  it('O4 — conservative default valuation (0.5¢/pt): 1 pt/$ on $100 = $0.50', () => {
    const progDefault = makeProgram({
      id: 'prog-default',
      valuation: { milliCentsPerPoint: 500, source: 'default', asOf: '2026-07-03', isDefault: true },
    });
    const card = makeCard({
      id: 'card-d',
      rewardCurrency: { kind: 'points', programId: 'prog-default' },
      earnRates: { base: 100, byCategory: {} },
    });
    const { ranked } = rankCards({
      wallet: walletOf('card-d'),
      snapshot: makeSnapshot([card], [progDefault]),
      categoryId: GROCERIES,
      amountCents: 10_000,
    });
    expect(ranked[0]!.expectedValue.amountCents).toBe(50);
    expect(ranked[0]!.valuationUsed).toEqual({ milliCentsPerPoint: 500, isDefault: true });
  });

  it('O5 — equal value: lower annual fee ranks first', () => {
    const cheap = makeCard({ id: 'zz-cheap', annualFee: { amountCents: 0, currency: 'CAD' }, earnRates: { base: 100, byCategory: {} } });
    const pricey = makeCard({ id: 'aa-pricey', annualFee: { amountCents: 12_000, currency: 'CAD' }, earnRates: { base: 100, byCategory: {} } });
    const { ranked } = rankCards({
      wallet: walletOf('aa-pricey', 'zz-cheap'),
      snapshot: makeSnapshot([cheap, pricey]),
      categoryId: GROCERIES,
      amountCents: 10_000,
    });
    expect(ranked.map((r) => r.cardId)).toEqual(['zz-cheap', 'aa-pricey']);
  });

  it('O6 — equal value and fee: cardId lexicographic', () => {
    const c1 = makeCard({ id: 'alpha', earnRates: { base: 100, byCategory: {} } });
    const c2 = makeCard({ id: 'beta', earnRates: { base: 100, byCategory: {} } });
    const { ranked } = rankCards({
      wallet: walletOf('beta', 'alpha'),
      snapshot: makeSnapshot([c1, c2]),
      categoryId: GROCERIES,
      amountCents: 10_000,
    });
    expect(ranked.map((r) => r.cardId)).toEqual(['alpha', 'beta']);
  });

  it('O7 — cashback half-even boundary: $1.25 at 2% = 2¢ (2.5 → 2)', () => {
    const { ranked } = rankCards({
      wallet: walletOf('card-a'),
      snapshot: makeSnapshot([cashbackA]),
      categoryId: GROCERIES,
      amountCents: 125,
    });
    expect(ranked[0]!.expectedValue.amountCents).toBe(2);
  });

  it('O8 — cashback half-even boundary: $1.75 at 2% = 4¢ (3.5 → 4)', () => {
    const { ranked } = rankCards({
      wallet: walletOf('card-a'),
      snapshot: makeSnapshot([cashbackA]),
      categoryId: GROCERIES,
      amountCents: 175,
    });
    expect(ranked[0]!.expectedValue.amountCents).toBe(4);
  });

  it('O9 — points single rounding boundary: $0.50 at 1 pt/$ @ 3.0¢/pt = 2¢ (1.5 → 2, no intermediate point rounding)', () => {
    const prog30 = makeProgram({
      id: 'prog-30',
      valuation: { milliCentsPerPoint: 3000, source: 'test', asOf: '2026-07-03', isDefault: false },
    });
    const card = makeCard({
      id: 'card-p',
      rewardCurrency: { kind: 'points', programId: 'prog-30' },
      earnRates: { base: 100, byCategory: {} },
    });
    const { ranked } = rankCards({
      wallet: walletOf('card-p'),
      snapshot: makeSnapshot([card], [prog30]),
      categoryId: GROCERIES,
      amountCents: 50,
    });
    expect(ranked[0]!.expectedValue.amountCents).toBe(2);
  });

  it('O10 — bonus beats base on the same card: groceries 4% vs base 1%', () => {
    const card = makeCard({ id: 'card-x', earnRates: { base: 100, byCategory: { groceries: 400 } } });
    const { ranked } = rankCards({
      wallet: walletOf('card-x'),
      snapshot: makeSnapshot([card]),
      categoryId: GROCERIES,
      amountCents: 10_000,
    });
    expect(ranked[0]!.expectedValue.amountCents).toBe(400);
    expect(ranked[0]!.appliedRate).toEqual({ bps: 400, kind: 'bonus' });
  });

  it('O11 — three-card mixed ordering on $250.00 dining', () => {
    const c1 = makeCard({ id: 'c-din-3', earnRates: { base: 50, byCategory: { dining: 300 } } }); // 3% => 750
    const progA = makeProgram({ id: 'prog-a', valuation: { milliCentsPerPoint: 2000, source: 't', asOf: '2026-07-03', isDefault: false } });
    const c2 = makeCard({ id: 'c-din-pts', rewardCurrency: { kind: 'points', programId: 'prog-a' }, earnRates: { base: 100, byCategory: { dining: 200 } } }); // 2pt/$ @2c = 4% => 1000
    const c3 = makeCard({ id: 'c-din-base', earnRates: { base: 150, byCategory: {} } }); // 1.5% => 375
    const { ranked } = rankCards({
      wallet: walletOf('c-din-3', 'c-din-pts', 'c-din-base'),
      snapshot: makeSnapshot([c1, c2, c3], [progA]),
      categoryId: 'dining',
      amountCents: 25_000,
    });
    expect(ranked.map((r) => [r.cardId, r.expectedValue.amountCents])).toEqual([
      ['c-din-pts', 1000],
      ['c-din-3', 750],
      ['c-din-base', 375],
    ]);
  });

  it('O12 — fee is sunk: identical rates with different fees produce identical expected values', () => {
    const noFee = makeCard({ id: 'nf', earnRates: { base: 200, byCategory: {} } });
    const bigFee = makeCard({ id: 'bf', annualFee: { amountCents: 59_900, currency: 'CAD' }, earnRates: { base: 200, byCategory: {} } });
    const { ranked } = rankCards({
      wallet: walletOf('bf', 'nf'),
      snapshot: makeSnapshot([noFee, bigFee]),
      categoryId: 'other',
      amountCents: 10_000,
    });
    expect(ranked[0]!.expectedValue.amountCents).toBe(200);
    expect(ranked[1]!.expectedValue.amountCents).toBe(200);
    expect(ranked.map((r) => r.cardId)).toEqual(['nf', 'bf']); // tie broken by fee only
  });
});

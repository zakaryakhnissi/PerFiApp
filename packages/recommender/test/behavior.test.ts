/**
 * T015 — behavior guarantees C4, C6–C10 from contracts/recommender.md.
 */
import { InvalidAmountError } from '@perfiapp/money';
import { rankCards } from '../src';
import { GROCERIES, bt, makeCard, makeProgram, makeSnapshot, walletOf } from './fixtures';

describe('C4 — annual fee is sunk', () => {
  it('changing only the fee never changes expectedValue', () => {
    const base = makeCard({ id: 'c1', earnRates: { base: 250, byCategory: {} } });
    const withFee = makeCard({
      id: 'c1',
      annualFee: { amountCents: 45_000, currency: 'CAD' },
      earnRates: { base: 250, byCategory: {} },
    });
    const v1 = rankCards({ wallet: walletOf('c1'), snapshot: makeSnapshot([base]), categoryId: GROCERIES, amountCents: 7_777 });
    const v2 = rankCards({ wallet: walletOf('c1'), snapshot: makeSnapshot([withFee]), categoryId: GROCERIES, amountCents: 7_777 });
    expect(v1.ranked[0]!.expectedValue).toEqual(v2.ranked[0]!.expectedValue);
  });
});

describe('C6 — bonus-else-base marking', () => {
  const card = makeCard({ id: 'c', earnRates: { base: 100, byCategory: { groceries: 300 } } });
  it('marks bonus when the category rate exists', () => {
    const { ranked } = rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card]), categoryId: GROCERIES, amountCents: 1_000 });
    expect(ranked[0]!.appliedRate).toEqual({ bps: 300, kind: 'bonus' });
  });
  it('marks base when it does not', () => {
    const { ranked } = rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card]), categoryId: 'gas', amountCents: 1_000 });
    expect(ranked[0]!.appliedRate).toEqual({ bps: 100, kind: 'base' });
    expect(ranked[0]!.explanation.some((p) => p.key === 'explanation.baseRateFallback')).toBe(true);
  });
});

describe('C7 — default valuation disclosure', () => {
  it('isDefault valuation adds the disclosure part', () => {
    const prog = makeProgram({
      id: 'p-def',
      valuation: { milliCentsPerPoint: 500, source: 'default', asOf: '2026-07-03', isDefault: true },
    });
    const card = makeCard({ id: 'c', rewardCurrency: { kind: 'points', programId: 'p-def' } });
    const { ranked } = rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card], [prog]), categoryId: GROCERIES, amountCents: 1_000 });
    expect(ranked[0]!.explanation.some((p) => p.key === 'explanation.valuationDefault')).toBe(true);
  });
  it('published valuation uses the normal valuation part', () => {
    const prog = makeProgram({ id: 'p-pub' });
    const card = makeCard({ id: 'c', rewardCurrency: { kind: 'points', programId: 'p-pub' } });
    const { ranked } = rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card], [prog]), categoryId: GROCERIES, amountCents: 1_000 });
    const keys = ranked[0]!.explanation.map((p) => p.key);
    expect(keys).toContain('explanation.valuation');
    expect(keys).not.toContain('explanation.valuationDefault');
  });
});

describe('C8 — cap disclosure surfaces in the explanation', () => {
  it('includes the cap part when the applied category has a disclosure', () => {
    const card = makeCard({
      id: 'c',
      earnRates: { base: 100, byCategory: { groceries: 400 } },
      capDisclosures: { groceries: bt('4% applies to the first $2,000 per quarter') },
    });
    const { ranked } = rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card]), categoryId: GROCERIES, amountCents: 1_000 });
    expect(ranked[0]!.explanation.some((p) => p.key === 'explanation.capNotModelled')).toBe(true);
  });
  it('omits it for categories without a disclosure', () => {
    const card = makeCard({ id: 'c', earnRates: { base: 100, byCategory: { groceries: 400 } } });
    const { ranked } = rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card]), categoryId: GROCERIES, amountCents: 1_000 });
    expect(ranked[0]!.explanation.some((p) => p.key === 'explanation.capNotModelled')).toBe(false);
  });
});

describe('C9 — invalid amounts are typed errors, never silent empties', () => {
  const card = makeCard({ id: 'c' });
  for (const bad of [0, -100, 12.5, NaN]) {
    it(`rejects ${bad}`, () => {
      expect(() =>
        rankCards({ wallet: walletOf('c'), snapshot: makeSnapshot([card]), categoryId: GROCERIES, amountCents: bad }),
      ).toThrow(InvalidAmountError);
    });
  }
});

describe('C10 — wallet ids missing from the snapshot', () => {
  it('reports them and excludes them from the ranking', () => {
    const card = makeCard({ id: 'present' });
    const { ranked, missingCardIds } = rankCards({
      wallet: walletOf('present', 'ghost-card'),
      snapshot: makeSnapshot([card]),
      categoryId: GROCERIES,
      amountCents: 1_000,
    });
    expect(missingCardIds).toEqual(['ghost-card']);
    expect(ranked.map((r) => r.cardId)).toEqual(['present']);
  });
});

describe('empty wallet', () => {
  it('returns an empty ranking (UI renders the guided empty state)', () => {
    const { ranked, missingCardIds } = rankCards({
      wallet: walletOf(),
      snapshot: makeSnapshot([makeCard({ id: 'c' })]),
      categoryId: GROCERIES,
      amountCents: 1_000,
    });
    expect(ranked).toEqual([]);
    expect(missingCardIds).toEqual([]);
  });
});

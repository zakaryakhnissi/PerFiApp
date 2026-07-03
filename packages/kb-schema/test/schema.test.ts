import {
  BilingualTextSchema,
  CardSchema,
  MoneySchema,
  SPEND_CATEGORY_IDS,
  findUnresolvedProgramRefs,
} from '../src';

const bt = (t: string) => ({ enCA: t, frCA: `${t} fr` });

const validCard = {
  id: 'test-card',
  issuer: bt('Bank'),
  network: 'visa',
  name: bt('Card'),
  annualFee: { amountCents: 0, currency: 'CAD' },
  rewardCurrency: { kind: 'cashback' },
  earnRates: { base: 100, byCategory: {} },
  dataAsOf: '2026-07-03',
};

describe('kb-schema gates', () => {
  it('accepts a valid card and applies defaults', () => {
    const card = CardSchema.parse(validCard);
    expect(card.perks).toEqual([]);
    expect(card.welcomeBonus).toBeNull();
  });

  it('rejects missing French (Principle I / FR-003)', () => {
    expect(BilingualTextSchema.safeParse({ enCA: 'Hello', frCA: '' }).success).toBe(false);
    expect(
      CardSchema.safeParse({ ...validCard, name: { enCA: 'Only English', frCA: '' } }).success,
    ).toBe(false);
  });

  it('rejects float money and float rates (Principle II)', () => {
    expect(MoneySchema.safeParse({ amountCents: 10.5, currency: 'CAD' }).success).toBe(false);
    expect(MoneySchema.safeParse({ amountCents: 100, currency: 'USD' }).success).toBe(false);
    expect(
      CardSchema.safeParse({ ...validCard, earnRates: { base: 1.5, byCategory: {} } }).success,
    ).toBe(false);
  });

  it('fixes the category list at exactly 10', () => {
    expect(SPEND_CATEGORY_IDS).toHaveLength(10);
  });

  it('flags unresolved program references', () => {
    const pointsCard = CardSchema.parse({
      ...validCard,
      rewardCurrency: { kind: 'points', programId: 'nope' },
    });
    expect(findUnresolvedProgramRefs([pointsCard], [])).toEqual(['test-card -> nope']);
  });
});

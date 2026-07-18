import type { Card, KnowledgebaseSnapshot, RewardProgram } from '@perfiapp/kb-schema';
import { SPEND_CATEGORY_IDS } from '@perfiapp/kb-schema';

const bt = (enCA: string, frCA: string) => ({ enCA, frCA });

export const cardA: Card = {
  id: 'demo-cashback',
  issuer: bt('Demo Bank', 'Banque Démo'),
  network: 'visa',
  name: bt('Demo Cash Back Visa', 'Visa Remises Démo'),
  annualFee: { amountCents: 0, currency: 'CAD' },
  rewardCurrency: { kind: 'cashback' },
  earnRates: { base: 50, byCategory: { groceries: 200 } },
  capDisclosures: {},
  welcomeBonus: null,
  statementCredits: [],
  perks: [],
  insurance: [],
  dataAsOf: '2026-07-03',
};

export const cardB: Card = {
  ...cardA,
  id: 'demo-points',
  name: bt('Demo Points Card', 'Carte Points Démo'),
  rewardCurrency: { kind: 'points', programId: 'demo-program' },
  earnRates: { base: 100, byCategory: {} },
};

export const demoProgram: RewardProgram = {
  id: 'demo-program',
  name: bt('Demo Rewards', 'Récompenses Démo'),
  valuation: {
    milliCentsPerPoint: 1500,
    source: 'test',
    asOf: '2026-07-03',
    isDefault: false,
  },
};

export const demoSnapshot: KnowledgebaseSnapshot = {
  schemaVersion: 1,
  kbVersion: 1,
  fetchedAt: '2026-07-03T00:00:00.000Z',
  cards: [cardA, cardB],
  programs: [demoProgram],
  categories: SPEND_CATEGORY_IDS.map((id) => ({
    id,
    label: bt(`en:${id}`, `fr:${id}`),
  })),
};

import type {
  Card,
  KnowledgebaseSnapshot,
  RewardProgram,
  SpendCategory,
  SpendCategoryId,
  Wallet,
} from '@perfiapp/kb-schema';
import { SPEND_CATEGORY_IDS } from '@perfiapp/kb-schema';

export const bt = (text: string) => ({ enCA: text, frCA: `${text} (fr)` });

export function makeCard(overrides: Partial<Card> & { id: string }): Card {
  return {
    issuer: bt('Test Bank'),
    network: 'visa',
    name: bt(`Card ${overrides.id}`),
    annualFee: { amountCents: 0, currency: 'CAD' },
    rewardCurrency: { kind: 'cashback' },
    earnRates: { base: 100, byCategory: {} },
    capDisclosures: {},
    welcomeBonus: null,
    statementCredits: [],
    perks: [],
    insurance: [],
    dataAsOf: '2026-07-03',
    ...overrides,
  };
}

export function makeProgram(overrides: Partial<RewardProgram> & { id: string }): RewardProgram {
  return {
    name: bt(`Program ${overrides.id}`),
    valuation: {
      milliCentsPerPoint: 1000,
      source: 'test',
      asOf: '2026-07-03',
      isDefault: false,
    },
    ...overrides,
  };
}

export const categories: SpendCategory[] = SPEND_CATEGORY_IDS.map((id) => ({
  id,
  label: bt(id),
}));

export function makeSnapshot(cards: Card[], programs: RewardProgram[] = []): KnowledgebaseSnapshot {
  return {
    schemaVersion: 1,
    kbVersion: 1,
    fetchedAt: '2026-07-03T00:00:00.000Z',
    cards,
    programs,
    categories,
  };
}

export function walletOf(...cardIds: string[]): Wallet {
  return { schemaVersion: 1, cardIds };
}

export const GROCERIES: SpendCategoryId = 'groceries';

/**
 * @perfiapp/kb-schema — zod schemas + types for knowledgebase entities
 * (data-model.md is the design source; this file is the runtime source of
 * truth shared by the API (ingest/serve) and the app (cache validation)).
 */
import { z } from 'zod';

/** Both languages mandatory and non-empty (Constitution Principle I, FR-003). */
export const BilingualTextSchema = z.object({
  enCA: z.string().min(1),
  frCA: z.string().min(1),
});
export type BilingualText = z.infer<typeof BilingualTextSchema>;

const nonNegativeInt = z.number().int().min(0);

/** Integer cents, CAD only (Constitution Principle II). */
export const MoneySchema = z.object({
  amountCents: nonNegativeInt,
  currency: z.literal('CAD'),
});
export type MoneyValue = z.infer<typeof MoneySchema>;

export const SPEND_CATEGORY_IDS = [
  'groceries',
  'gas',
  'dining',
  'recurring_bills',
  'pharmacy',
  'travel',
  'transit',
  'entertainment',
  'online_shopping',
  'other',
] as const;
export const SpendCategoryIdSchema = z.enum(SPEND_CATEGORY_IDS);
export type SpendCategoryId = z.infer<typeof SpendCategoryIdSchema>;

export const SpendCategorySchema = z.object({
  id: SpendCategoryIdSchema,
  label: BilingualTextSchema,
});
export type SpendCategory = z.infer<typeof SpendCategorySchema>;

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected ISO date YYYY-MM-DD');
const slug = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'expected kebab-case slug');

export const RewardProgramSchema = z.object({
  id: slug,
  name: BilingualTextSchema,
  valuation: z.object({
    milliCentsPerPoint: z.number().int().min(1),
    source: z.string().min(1),
    asOf: isoDate,
    isDefault: z.boolean(),
  }),
});
export type RewardProgram = z.infer<typeof RewardProgramSchema>;

export const RewardCurrencySchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('cashback') }),
  z.object({ kind: z.literal('points'), programId: slug }),
]);
export type RewardCurrency = z.infer<typeof RewardCurrencySchema>;

export const EarnRatesSchema = z.object({
  /** Reward units per dollar × 100 (2% or 2 pts/$ = 200). */
  base: nonNegativeInt,
  byCategory: z.record(SpendCategoryIdSchema, nonNegativeInt),
});
export type EarnRates = z.infer<typeof EarnRatesSchema>;

export const CardSchema = z.object({
  id: slug,
  issuer: BilingualTextSchema,
  network: z.enum(['visa', 'mastercard', 'amex', 'interac']),
  name: BilingualTextSchema,
  annualFee: MoneySchema,
  rewardCurrency: RewardCurrencySchema,
  earnRates: EarnRatesSchema,
  capDisclosures: z.record(SpendCategoryIdSchema, BilingualTextSchema).default({}),
  welcomeBonus: z
    .object({
      description: BilingualTextSchema,
      minSpend: MoneySchema.optional(),
      deadlineDays: z.number().int().min(1).optional(),
    })
    .nullable()
    .default(null),
  statementCredits: z
    .array(
      z.object({
        description: BilingualTextSchema,
        amount: MoneySchema,
        cadence: BilingualTextSchema,
      }),
    )
    .default([]),
  perks: z.array(BilingualTextSchema).default([]),
  insurance: z.array(BilingualTextSchema).default([]),
  dataAsOf: isoDate,
});
export type Card = z.infer<typeof CardSchema>;

export const KnowledgebaseSnapshotSchema = z.object({
  schemaVersion: z.literal(1),
  kbVersion: z.number().int().min(1),
  fetchedAt: z.string().datetime(),
  cards: z.array(CardSchema),
  programs: z.array(RewardProgramSchema),
  categories: z.array(SpendCategorySchema).length(SPEND_CATEGORY_IDS.length),
});
export type KnowledgebaseSnapshot = z.infer<typeof KnowledgebaseSnapshotSchema>;

export const WalletSchema = z.object({
  schemaVersion: z.literal(1),
  cardIds: z.array(slug),
});
export type Wallet = z.infer<typeof WalletSchema>;

/**
 * Cross-entity referential check (contract invariant 2): every points card's
 * programId must resolve within the same payload. Returns unresolved ids.
 */
export function findUnresolvedProgramRefs(cards: Card[], programs: RewardProgram[]): string[] {
  const known = new Set(programs.map((p) => p.id));
  const missing: string[] = [];
  for (const card of cards) {
    if (card.rewardCurrency.kind === 'points' && !known.has(card.rewardCurrency.programId)) {
      missing.push(`${card.id} -> ${card.rewardCurrency.programId}`);
    }
  }
  return missing;
}

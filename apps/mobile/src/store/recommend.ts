/**
 * T019 — glue between the on-device wallet, the cached knowledgebase, and
 * the pure ranking engine. Everything runs locally (Principle III).
 */
import type { SpendCategoryId } from '@perfiapp/kb-schema';
import { rankCards, type RankResult } from '@perfiapp/recommender';
import { getSnapshot } from './kb';
import { getWallet } from './wallet';

export type RecommendOutcome =
  | { status: 'ok'; result: RankResult }
  | { status: 'empty-wallet' }
  | { status: 'no-knowledgebase' };

export async function recommend(
  categoryId: SpendCategoryId,
  amountCents?: number,
): Promise<RecommendOutcome> {
  const snapshot = await getSnapshot();
  if (!snapshot) return { status: 'no-knowledgebase' };
  const wallet = await getWallet();
  if (wallet.cardIds.length === 0) return { status: 'empty-wallet' };
  const result = rankCards({
    wallet,
    snapshot,
    categoryId,
    ...(amountCents !== undefined ? { amountCents } : {}),
  });
  return { status: 'ok', result };
}

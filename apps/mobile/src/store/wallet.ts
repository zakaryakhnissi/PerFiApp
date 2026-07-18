/**
 * On-device wallet (Clarifications: no accounts, no server-side copy —
 * FR-006/FR-007). Card PRODUCT references only; never card numbers.
 */
import { WalletSchema, type Wallet } from '@perfiapp/kb-schema';
import { readValidated, write } from './storage';

const WALLET_KEY = 'perfiapp.wallet.v1';
const EMPTY: Wallet = { schemaVersion: 1, cardIds: [] };

export async function getWallet(): Promise<Wallet> {
  return (await readValidated(WALLET_KEY, WalletSchema)) ?? EMPTY;
}

export async function addCard(cardId: string): Promise<Wallet> {
  const wallet = await getWallet();
  if (wallet.cardIds.includes(cardId)) return wallet; // idempotent add
  const next: Wallet = { ...wallet, cardIds: [...wallet.cardIds, cardId] };
  await write(WALLET_KEY, next);
  return next;
}

export async function removeCard(cardId: string): Promise<Wallet> {
  const wallet = await getWallet();
  const next: Wallet = { ...wallet, cardIds: wallet.cardIds.filter((id) => id !== cardId) };
  await write(WALLET_KEY, next);
  return next;
}

/**
 * T028 — US3 acceptance scenarios 1–3 from spec.md: add, remove, and the
 * empty-wallet guidance (scenario 3 is covered end-to-end in Recommend.test).
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { WalletScreen } from '../Wallet';
import { initI18n, switchLocale } from '../../i18n';
import { primeSnapshot } from '../../store/kb';
import { addCard, getWallet, removeCard } from '../../store/wallet';
import { recommend } from '../../store/recommend';
import { demoSnapshot } from './fixtures';

beforeAll(() => {
  initI18n('en-CA');
});

beforeEach(async () => {
  primeSnapshot(demoSnapshot);
  switchLocale('en-CA');
  const wallet = await getWallet();
  for (const id of wallet.cardIds) await removeCard(id);
});

describe('US3 — manage my wallet', () => {
  it('scenario 1: adding two cards from search lists both', async () => {
    const screen = render(<WalletScreen />);
    await waitFor(() => screen.getByText('My wallet'));
    expect(screen.getByText(/No cards yet/)).toBeTruthy();

    fireEvent.changeText(screen.getByLabelText('Search cards or issuers'), 'demo');
    await waitFor(() => screen.getAllByText('Add to wallet'));
    // add both candidates
    fireEvent.press(screen.getAllByText('Add to wallet')[0]!);
    await waitFor(() => screen.getByText('Remove'));
    fireEvent.press(screen.getAllByText('Add to wallet')[0]!);
    await waitFor(() => expect(screen.getAllByText('Remove').length).toBe(2));

    expect(screen.getByText('Demo Cash Back Visa')).toBeTruthy();
    expect(screen.getByText('Demo Points Card')).toBeTruthy();
    expect(screen.queryByText(/No cards yet/)).toBeNull();
  });

  it('scenario 2: removing a card removes it from the wallet and from rankings', async () => {
    const screen = render(<WalletScreen />);
    await waitFor(() => screen.getByText('My wallet'));
    fireEvent.changeText(screen.getByLabelText('Search cards or issuers'), 'cash back');
    await waitFor(() => screen.getAllByText('Add to wallet'));
    fireEvent.press(screen.getAllByText('Add to wallet')[0]!);
    await waitFor(() => screen.getByText('Remove'));

    fireEvent.press(screen.getByText('Remove'));
    await waitFor(() => screen.getByText(/No cards yet/));

    // ranking no longer sees the removed card (spec: "nor in any subsequent recommendation")
    const outcome = await recommend('groceries', 10_000);
    expect(outcome.status).toBe('empty-wallet');
  });

  it('missing-card state: wallet entries absent from the snapshot are surfaced, not dropped', async () => {
    await addCard('ghost-card');
    const screen = render(<WalletScreen />);
    await waitFor(() => screen.getByText(/ghost-card/));
    expect(screen.getByText(/no longer listed/)).toBeTruthy();
  });

  it('fr-CA: wallet flow renders fully localized', async () => {
    switchLocale('fr-CA');
    const screen = render(<WalletScreen />);
    await waitFor(() => screen.getByText('Mon portefeuille'));
    expect(screen.getByText(/Aucune carte pour l'instant/)).toBeTruthy();
  });
});

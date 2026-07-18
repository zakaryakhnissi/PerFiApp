/**
 * T020 — US1 acceptance scenarios 1–4 from spec.md, driven through the real
 * screen with a primed snapshot and on-device wallet.
 */
import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { RecommendScreen } from '../Recommend';
import { initI18n, switchLocale } from '../../i18n';
import { primeSnapshot } from '../../store/kb';
import { addCard, removeCard, getWallet } from '../../store/wallet';
import { demoSnapshot } from './fixtures';

beforeAll(() => {
  initI18n('en-CA');
});

beforeEach(async () => {
  primeSnapshot(demoSnapshot);
  switchLocale('en-CA');
  const wallet = await getWallet();
  for (const id of wallet.cardIds) await removeCard(id);
  await addCard('demo-cashback');
  await addCard('demo-points');
});

async function recommendGroceries(amount?: string) {
  const screen = render(<RecommendScreen onGoToWallet={jest.fn()} />);
  await waitFor(() => screen.getByText('Best card to use'));
  if (amount !== undefined) {
    fireEvent.changeText(screen.getByLabelText('Amount (optional)'), amount);
  }
  fireEvent.press(screen.getByText('Recommend'));
  await waitFor(() => screen.getByText('Best pick'));
  return screen;
}

describe('US1 — best card for a purchase', () => {
  it('scenario 1: $100.00 groceries ranks 2% cash back ($2.00) over 1 pt/$ @1.5¢ ($1.50)', async () => {
    const screen = await recommendGroceries('100.00');
    expect(screen.getByText('Expected value: $2.00')).toBeTruthy();
    expect(screen.getByText('Expected value: $1.50')).toBeTruthy();
    const first = screen.getByTestId('ranked-0');
    expect(first).toHaveTextContent(/Demo Cash Back Visa/);
    expect(first).toHaveTextContent(/\$2\.00/);
    // transparent math: rate line + fee-sunk disclosure render
    expect(first).toHaveTextContent(/2% cash back/);
    expect(first).toHaveTextContent(/Annual fee not counted/);
  });

  it('scenario 2: no amount → per-$100 basis notice and same values', async () => {
    const screen = await recommendGroceries();
    expect(screen.getByText('Values shown per $100 of spend')).toBeTruthy();
    expect(screen.getByText('Expected value: $2.00')).toBeTruthy();
  });

  it('scenario 3: category without bonuses falls back to base rates and says so', async () => {
    const screen = render(<RecommendScreen onGoToWallet={jest.fn()} />);
    await waitFor(() => screen.getByText('Best card to use'));
    fireEvent.press(screen.getByText('en:pharmacy'));
    fireEvent.press(screen.getByText('Recommend'));
    await waitFor(() => screen.getByText('Best pick'));
    expect(
      screen.getByText('None of your cards has a bonus for this category — base rates shown.'),
    ).toBeTruthy();
  });

  it('scenario 4: switching to fr-CA localizes the full flow with fr-CA currency formatting', async () => {
    switchLocale('fr-CA');
    const screen = render(<RecommendScreen onGoToWallet={jest.fn()} />);
    await waitFor(() => screen.getByText('Meilleure carte à utiliser'));
    fireEvent.changeText(screen.getByLabelText('Montant (facultatif)'), '100,00');
    fireEvent.press(screen.getByText('Recommander'));
    await waitFor(() => screen.getByText('Meilleur choix'));
    // fr-CA formats CAD as "2,00 $" (nbsp variants tolerated via regex)
    expect(screen.getByText(/Valeur attendue\s*:\s*2,00\s*\$/)).toBeTruthy();
    const first = screen.getByTestId('ranked-0');
    expect(first).toHaveTextContent(/Visa Remises Démo/);
  });

  it('invalid amount shows the localized validation error and no ranking', async () => {
    const screen = render(<RecommendScreen onGoToWallet={jest.fn()} />);
    await waitFor(() => screen.getByText('Best card to use'));
    fireEvent.changeText(screen.getByLabelText('Amount (optional)'), '0');
    fireEvent.press(screen.getByText('Recommend'));
    await waitFor(() => screen.getByText('Enter a valid amount greater than $0.00.'));
    expect(screen.queryByText('Best pick')).toBeNull();
  });

  it('empty wallet routes to the guided empty state (spec US3 scenario 3)', async () => {
    const wallet = await getWallet();
    for (const id of wallet.cardIds) await removeCard(id);
    const onGoToWallet = jest.fn();
    const screen = render(<RecommendScreen onGoToWallet={onGoToWallet} />);
    await waitFor(() => screen.getByText('Best card to use'));
    fireEvent.press(screen.getByText('Recommend'));
    await waitFor(() => screen.getByText('Your wallet is empty'));
    fireEvent.press(screen.getByText('Add cards'));
    expect(onGoToWallet).toHaveBeenCalled();
  });
});

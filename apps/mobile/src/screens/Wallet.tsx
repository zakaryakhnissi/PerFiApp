/**
 * T027 — US3: wallet management. Add from a knowledgebase search, remove,
 * and surface cards no longer listed in the current snapshot.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { KnowledgebaseSnapshot, Wallet } from '@perfiapp/kb-schema';
import { currentLocale } from '../i18n';
import { pickText } from '../format';
import { findCard, getSnapshot } from '../store/kb';
import { addCard, getWallet, removeCard } from '../store/wallet';

export function WalletScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [snapshot, setSnapshot] = useState<KnowledgebaseSnapshot | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [query, setQuery] = useState('');

  useEffect(() => {
    void getSnapshot().then(setSnapshot);
    void getWallet().then(setWallet);
  }, []);

  const onAdd = useCallback(async (cardId: string) => {
    setWallet(await addCard(cardId));
  }, []);
  const onRemove = useCallback(async (cardId: string) => {
    setWallet(await removeCard(cardId));
  }, []);

  if (!snapshot || !wallet) {
    return (
      <View>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  const q = query.trim().toLowerCase();
  const candidates =
    q === ''
      ? []
      : snapshot.cards
          .filter((c) => !wallet.cardIds.includes(c.id))
          .filter((c) =>
            [c.name.enCA, c.name.frCA, c.issuer.enCA, c.issuer.frCA]
              .join(' ')
              .toLowerCase()
              .includes(q),
          )
          .slice(0, 8);

  return (
    <ScrollView>
      <Text accessibilityRole="header">{t('wallet.title')}</Text>

      {wallet.cardIds.length === 0 ? <Text>{t('wallet.empty')}</Text> : null}
      {wallet.cardIds.map((cardId) => {
        const card = findCard(snapshot, cardId);
        return (
          <View key={cardId}>
            <Text>{card ? pickText(card.name, locale) : `${cardId} — ${t('wallet.missingCard')}`}</Text>
            <Pressable accessibilityRole="button" onPress={() => void onRemove(cardId)}>
              <Text>{t('wallet.remove')}</Text>
            </Pressable>
          </View>
        );
      })}

      <TextInput
        accessibilityLabel={t('kb.searchPlaceholder')}
        placeholder={t('kb.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />
      {candidates.map((card) => (
        <View key={card.id}>
          <Text>{pickText(card.name, locale)}</Text>
          <Pressable accessibilityRole="button" onPress={() => void onAdd(card.id)}>
            <Text>{t('wallet.add')}</Text>
          </Pressable>
        </View>
      ))}
    </ScrollView>
  );
}

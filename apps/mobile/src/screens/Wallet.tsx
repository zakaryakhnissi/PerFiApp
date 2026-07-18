/**
 * T027 — US3: wallet management. Add from a knowledgebase search, remove,
 * and surface cards no longer listed in the current snapshot.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { KnowledgebaseSnapshot, Wallet } from '@perfiapp/kb-schema';
import { currentLocale } from '../i18n';
import { pickText } from '../format';
import { findCard, getSnapshot } from '../store/kb';
import { addCard, getWallet, removeCard } from '../store/wallet';
import { Card, FieldLabel, GhostButton, Input, ScreenTitle } from '../ui/components';
import { color, space, type_ } from '../ui/theme';

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
      <View style={styles.loading}>
        <Text style={type_.small}>{t('common.loading')}</Text>
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
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenTitle>{t('wallet.title')}</ScreenTitle>

      {wallet.cardIds.length === 0 ? (
        <Card>
          <Text style={type_.small}>{t('wallet.empty')}</Text>
        </Card>
      ) : null}
      {wallet.cardIds.map((cardId) => {
        const card = findCard(snapshot, cardId);
        return (
          <Card key={cardId}>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: space.sm }}>
                {card ? (
                  <>
                    <Text style={type_.section}>{pickText(card.name, locale)}</Text>
                    <Text style={type_.small}>{pickText(card.issuer, locale)}</Text>
                  </>
                ) : (
                  <Text style={[type_.body, { color: color.warnInk }]}>
                    {cardId} — {t('wallet.missingCard')}
                  </Text>
                )}
              </View>
              <GhostButton destructive label={t('wallet.remove')} onPress={() => void onRemove(cardId)} />
            </View>
          </Card>
        );
      })}

      <FieldLabel>{t('kb.searchPlaceholder')}</FieldLabel>
      <Input
        accessibilityLabel={t('kb.searchPlaceholder')}
        placeholder={t('kb.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />
      <View style={{ height: space.md }} />
      {candidates.map((card) => (
        <Card key={card.id}>
          <View style={styles.row}>
            <View style={{ flex: 1, paddingRight: space.sm }}>
              <Text style={type_.section}>{pickText(card.name, locale)}</Text>
              <Text style={type_.small}>{pickText(card.issuer, locale)}</Text>
            </View>
            <GhostButton label={t('wallet.add')} onPress={() => void onAdd(card.id)} />
          </View>
        </Card>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: space.xl * 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
});

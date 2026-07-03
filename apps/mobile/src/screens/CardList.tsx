/**
 * T024 — US2: knowledgebase browsing with search and the two spec filters
 * (no annual fee, bonus category). Filters run against the on-device cache.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Card, KnowledgebaseSnapshot, SpendCategoryId } from '@perfiapp/kb-schema';
import { currentLocale } from '../i18n';
import { formatCents, pickText } from '../format';
import { getSnapshot } from '../store/kb';
import { CardDetailScreen } from './CardDetail';

export function matchesFilters(
  card: Card,
  locale: 'en-CA' | 'fr-CA',
  query: string,
  noFeeOnly: boolean,
  bonusCategory: SpendCategoryId | null,
): boolean {
  if (noFeeOnly && card.annualFee.amountCents !== 0) return false;
  if (bonusCategory !== null && card.earnRates.byCategory[bonusCategory] === undefined) return false;
  const q = query.trim().toLowerCase();
  if (q !== '') {
    const haystack = [
      card.name.enCA,
      card.name.frCA,
      card.issuer.enCA,
      card.issuer.frCA,
    ]
      .join(' ')
      .toLowerCase();
    if (!haystack.includes(q)) return false;
  }
  return true;
}

export function CardListScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [snapshot, setSnapshot] = useState<KnowledgebaseSnapshot | null>(null);
  const [query, setQuery] = useState('');
  const [noFeeOnly, setNoFeeOnly] = useState(false);
  const [bonusCategory, setBonusCategory] = useState<SpendCategoryId | null>(null);
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  useEffect(() => {
    void getSnapshot().then(setSnapshot);
  }, []);

  const filtered = useMemo(
    () =>
      snapshot
        ? snapshot.cards.filter((c) => matchesFilters(c, locale, query, noFeeOnly, bonusCategory))
        : [],
    [snapshot, locale, query, noFeeOnly, bonusCategory],
  );

  if (!snapshot) {
    return (
      <View>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  if (openCardId !== null) {
    const card = snapshot.cards.find((c) => c.id === openCardId);
    if (card) {
      return (
        <CardDetailScreen card={card} snapshot={snapshot} onBack={() => setOpenCardId(null)} />
      );
    }
  }

  return (
    <ScrollView>
      <Text accessibilityRole="header">{t('kb.title')}</Text>
      <TextInput
        accessibilityLabel={t('kb.searchPlaceholder')}
        placeholder={t('kb.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />
      <Pressable
        accessibilityRole="switch"
        accessibilityState={{ checked: noFeeOnly }}
        onPress={() => setNoFeeOnly((v) => !v)}
      >
        <Text>{t('kb.filterNoFee')}</Text>
      </Pressable>
      <Text>{t('kb.filterBonusCategory')}</Text>
      <View>
        {snapshot.categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: bonusCategory === category.id }}
            onPress={() => setBonusCategory((v) => (v === category.id ? null : category.id))}
          >
            <Text>{pickText(category.label, locale)}</Text>
          </Pressable>
        ))}
      </View>

      {filtered.length === 0 ? <Text>{t('kb.empty')}</Text> : null}
      {filtered.map((card) => (
        <Pressable key={card.id} accessibilityRole="button" onPress={() => setOpenCardId(card.id)}>
          <Text>{pickText(card.name, locale)}</Text>
          <Text>{pickText(card.issuer, locale)}</Text>
          <Text>
            {card.annualFee.amountCents === 0
              ? t('kb.noFee')
              : `${t('kb.annualFee')}: ${formatCents(card.annualFee.amountCents, locale)}`}
          </Text>
        </Pressable>
      ))}
    </ScrollView>
  );
}

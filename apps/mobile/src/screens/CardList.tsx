/**
 * T024 — US2: knowledgebase browsing with search and the two spec filters
 * (no annual fee, bonus category). Filters run against the on-device cache.
 */
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Card as KbCard, KnowledgebaseSnapshot, SpendCategoryId } from '@perfiapp/kb-schema';
import { currentLocale } from '../i18n';
import { formatCents, pickText } from '../format';
import { getSnapshot } from '../store/kb';
import { CardDetailScreen } from './CardDetail';
import { Badge, Card, Chip, ChipRow, FieldLabel, Input, ScreenTitle } from '../ui/components';
import { space, type_ } from '../ui/theme';

export function matchesFilters(
  card: KbCard,
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
      <View style={styles.loading}>
        <Text style={type_.small}>{t('common.loading')}</Text>
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
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenTitle>{t('kb.title')}</ScreenTitle>
      <Input
        accessibilityLabel={t('kb.searchPlaceholder')}
        placeholder={t('kb.searchPlaceholder')}
        value={query}
        onChangeText={setQuery}
      />
      <View style={{ marginTop: space.md }}>
        <ChipRow>
          <Chip
            role="switch"
            label={t('kb.filterNoFee')}
            selected={noFeeOnly}
            onPress={() => setNoFeeOnly((v) => !v)}
          />
        </ChipRow>
      </View>
      <FieldLabel>{t('kb.filterBonusCategory')}</FieldLabel>
      <ChipRow>
        {snapshot.categories.map((category) => (
          <Chip
            key={category.id}
            label={pickText(category.label, locale)}
            selected={bonusCategory === category.id}
            onPress={() => setBonusCategory((v) => (v === category.id ? null : category.id))}
          />
        ))}
      </ChipRow>

      <View style={{ height: space.xl }} />
      {filtered.length === 0 ? <Text style={type_.small}>{t('kb.empty')}</Text> : null}
      {filtered.map((card) => (
        <Pressable key={card.id} accessibilityRole="button" onPress={() => setOpenCardId(card.id)}>
          <Card>
            <View style={styles.row}>
              <View style={{ flex: 1, paddingRight: space.sm }}>
                <Text style={type_.section}>{pickText(card.name, locale)}</Text>
                <Text style={[type_.small, { marginBottom: space.sm }]}>
                  {pickText(card.issuer, locale)}
                </Text>
                {card.annualFee.amountCents === 0 ? (
                  <Badge label={t('kb.noFee')} tone="success" />
                ) : (
                  <Badge
                    label={`${t('kb.annualFee')}: ${formatCents(card.annualFee.amountCents, locale)}`}
                  />
                )}
              </View>
              <Text style={styles.chevron}>›</Text>
            </View>
          </Card>
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: space.xl * 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center' },
  chevron: { fontSize: 24, color: '#98A2B3', paddingLeft: space.sm },
});

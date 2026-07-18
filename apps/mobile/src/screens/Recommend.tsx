/**
 * T018 — US1: best card for a purchase. Category picker (the fixed 10),
 * optional amount, ranked results with transparent localized math.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { KnowledgebaseSnapshot, SpendCategoryId } from '@perfiapp/kb-schema';
import type { RankResult } from '@perfiapp/recommender';
import { currentLocale } from '../i18n';
import { formatCents, parseAmountToCents, pickText } from '../format';
import { getSnapshot } from '../store/kb';
import { recommend } from '../store/recommend';
import { renderExplanation } from './explanation';
import { Badge, Card, Chip, ChipRow, FieldLabel, Input, Notice, PrimaryButton, ScreenTitle } from '../ui/components';
import { color, space, type_ } from '../ui/theme';

interface Props {
  onGoToWallet: () => void;
}

export function RecommendScreen({ onGoToWallet }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [snapshot, setSnapshot] = useState<KnowledgebaseSnapshot | null>(null);
  const [categoryId, setCategoryId] = useState<SpendCategoryId>('groceries');
  const [amountText, setAmountText] = useState('');
  const [amountError, setAmountError] = useState(false);
  const [outcome, setOutcome] = useState<
    { kind: 'idle' } | { kind: 'empty-wallet' } | { kind: 'ranked'; result: RankResult }
  >({ kind: 'idle' });

  useEffect(() => {
    void getSnapshot().then(setSnapshot);
  }, []);

  const onRecommend = useCallback(async () => {
    setAmountError(false);
    let amountCents: number | undefined;
    if (amountText.trim() !== '') {
      const parsed = parseAmountToCents(amountText);
      if (parsed === null) {
        setAmountError(true);
        return;
      }
      amountCents = parsed;
    }
    const res = await recommend(categoryId, amountCents);
    if (res.status === 'empty-wallet') setOutcome({ kind: 'empty-wallet' });
    else if (res.status === 'ok') setOutcome({ kind: 'ranked', result: res.result });
  }, [amountText, categoryId]);

  if (!snapshot) {
    return (
      <View style={styles.loading}>
        <Text style={type_.small}>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <ScreenTitle>{t('recommend.title')}</ScreenTitle>

      <FieldLabel>{t('recommend.categoryLabel')}</FieldLabel>
      <ChipRow>
        {snapshot.categories.map((category) => (
          <Chip
            key={category.id}
            label={pickText(category.label, locale)}
            selected={category.id === categoryId}
            onPress={() => setCategoryId(category.id)}
          />
        ))}
      </ChipRow>

      <FieldLabel>{t('recommend.amountLabel')}</FieldLabel>
      <Input
        accessibilityLabel={t('recommend.amountLabel')}
        placeholder={t('recommend.amountPlaceholder')}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
      />
      {amountError ? <Text style={styles.error}>{t('recommend.invalidAmount')}</Text> : null}

      <PrimaryButton label={t('recommend.cta')} onPress={() => void onRecommend()} />

      {outcome.kind === 'empty-wallet' ? (
        <Card style={styles.emptyCard}>
          <Text style={[type_.section, { marginBottom: space.xs }]}>
            {t('recommend.emptyWalletTitle')}
          </Text>
          <Text style={[type_.small, { marginBottom: space.md }]}>
            {t('recommend.emptyWalletBody')}
          </Text>
          <PrimaryButton label={t('recommend.emptyWalletCta')} onPress={onGoToWallet} />
        </Card>
      ) : null}

      {outcome.kind === 'ranked' ? (
        <View style={{ marginTop: space.xl }}>
          {outcome.result.usedPerHundredBasis ? (
            <Notice>{t('recommend.perHundredBasis')}</Notice>
          ) : null}
          {outcome.result.ranked.every((r) => r.appliedRate.kind === 'base') ? (
            <Notice tone="warn">{t('recommend.baseRateNotice')}</Notice>
          ) : null}
          <View style={{ height: space.md }} />
          {outcome.result.ranked.map((entry, index) => {
            const card = snapshot.cards.find((c) => c.id === entry.cardId);
            if (!card) return null;
            const best = index === 0;
            return (
              <Card
                key={entry.cardId}
                testID={`ranked-${index}`}
                style={best ? styles.bestCard : undefined}
              >
                <View style={styles.resultHeader}>
                  <View style={{ flex: 1, paddingRight: space.sm }}>
                    {best ? (
                      <View style={{ marginBottom: space.sm }}>
                        <Badge label={t('recommend.bestPick')} tone="primary" />
                      </View>
                    ) : null}
                    <Text style={type_.section}>{pickText(card.name, locale)}</Text>
                    <Text style={type_.small}>{pickText(card.issuer, locale)}</Text>
                  </View>
                  <Text style={styles.rank}>#{index + 1}</Text>
                </View>
                <Text style={[type_.value, { marginVertical: space.sm }]}>
                  {t('recommend.expectedValue', {
                    value: formatCents(entry.expectedValue.amountCents, locale),
                  })}
                </Text>
                {renderExplanation(entry.explanation, t, locale, snapshot).map((line) => (
                  <Text key={line} style={[type_.small, styles.explanationLine]}>
                    {line}
                  </Text>
                ))}
              </Card>
            );
          })}
          {outcome.result.missingCardIds.length > 0 ? (
            <Notice tone="warn">{t('wallet.missingCard')}</Notice>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: space.xl * 2 },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  error: { color: color.danger, fontSize: 13, marginTop: space.sm },
  emptyCard: { marginTop: space.xl, alignItems: 'stretch' },
  bestCard: { borderColor: color.primary, borderWidth: 2, backgroundColor: color.primarySoft },
  resultHeader: { flexDirection: 'row', alignItems: 'flex-start' },
  rank: { fontSize: 15, fontWeight: '700', color: color.inkMuted },
  explanationLine: { marginTop: 4 },
});

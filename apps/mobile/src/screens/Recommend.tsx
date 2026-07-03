/**
 * T018 — US1: best card for a purchase. Category picker (the fixed 10),
 * optional amount, ranked results with transparent localized math.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { KnowledgebaseSnapshot, SpendCategoryId } from '@perfiapp/kb-schema';
import type { RankResult } from '@perfiapp/recommender';
import { currentLocale } from '../i18n';
import { categoryLabel, formatCents, parseAmountToCents, pickText } from '../format';
import { getSnapshot } from '../store/kb';
import { recommend } from '../store/recommend';
import { renderExplanation } from './explanation';

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
      <View>
        <Text>{t('common.loading')}</Text>
      </View>
    );
  }

  return (
    <ScrollView>
      <Text accessibilityRole="header">{t('recommend.title')}</Text>

      <Text>{t('recommend.categoryLabel')}</Text>
      <View>
        {snapshot.categories.map((category) => (
          <Pressable
            key={category.id}
            accessibilityRole="button"
            accessibilityState={{ selected: category.id === categoryId }}
            onPress={() => setCategoryId(category.id)}
          >
            <Text>{pickText(category.label, locale)}</Text>
          </Pressable>
        ))}
      </View>

      <Text>{t('recommend.amountLabel')}</Text>
      <TextInput
        accessibilityLabel={t('recommend.amountLabel')}
        placeholder={t('recommend.amountPlaceholder')}
        value={amountText}
        onChangeText={setAmountText}
        keyboardType="decimal-pad"
      />
      {amountError ? <Text>{t('recommend.invalidAmount')}</Text> : null}

      <Pressable accessibilityRole="button" onPress={() => void onRecommend()}>
        <Text>{t('recommend.cta')}</Text>
      </Pressable>

      {outcome.kind === 'empty-wallet' ? (
        <View>
          <Text>{t('recommend.emptyWalletTitle')}</Text>
          <Text>{t('recommend.emptyWalletBody')}</Text>
          <Pressable accessibilityRole="button" onPress={onGoToWallet}>
            <Text>{t('recommend.emptyWalletCta')}</Text>
          </Pressable>
        </View>
      ) : null}

      {outcome.kind === 'ranked' ? (
        <View>
          {outcome.result.usedPerHundredBasis ? <Text>{t('recommend.perHundredBasis')}</Text> : null}
          {outcome.result.ranked.every((r) => r.appliedRate.kind === 'base') ? (
            <Text>{t('recommend.baseRateNotice')}</Text>
          ) : null}
          {outcome.result.ranked.map((entry, index) => {
            const card = snapshot.cards.find((c) => c.id === entry.cardId);
            if (!card) return null;
            return (
              <View key={entry.cardId} testID={`ranked-${index}`}>
                {index === 0 ? <Text>{t('recommend.bestPick')}</Text> : null}
                <Text>{pickText(card.name, locale)}</Text>
                <Text>
                  {t('recommend.expectedValue', {
                    value: formatCents(entry.expectedValue.amountCents, locale),
                  })}
                </Text>
                {renderExplanation(entry.explanation, t, locale, snapshot).map((line) => (
                  <Text key={line}>{line}</Text>
                ))}
              </View>
            );
          })}
          {outcome.result.missingCardIds.length > 0 ? (
            <Text>{t('wallet.missingCard')}</Text>
          ) : null}
        </View>
      ) : null}

      <Text testID="active-category">{categoryLabel(snapshot.categories, categoryId, locale)}</Text>
    </ScrollView>
  );
}

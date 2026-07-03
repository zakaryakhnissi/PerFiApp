/**
 * T025 — US2: card detail with every FR-001 field, dataAsOf (FR-014), and
 * cap disclosures. Wallet add/remove is wired in the wallet phase via the
 * add button here (kept simple: add-only from detail).
 */
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Card, KnowledgebaseSnapshot } from '@perfiapp/kb-schema';
import { currentLocale } from '../i18n';
import { formatBpsAsPercent, formatCents, pickText } from '../format';
import { addCard, getWallet } from '../store/wallet';

interface Props {
  card: Card;
  snapshot: KnowledgebaseSnapshot;
  onBack: () => void;
}

export function CardDetailScreen({ card, snapshot, onBack }: Props): React.JSX.Element {
  const { t } = useTranslation();
  const locale = currentLocale();
  const [inWallet, setInWallet] = useState(false);

  useEffect(() => {
    void getWallet().then((w) => setInWallet(w.cardIds.includes(card.id)));
  }, [card.id]);

  const program =
    card.rewardCurrency.kind === 'points'
      ? snapshot.programs.find(
          (p) => card.rewardCurrency.kind === 'points' && p.id === card.rewardCurrency.programId,
        )
      : undefined;

  return (
    <ScrollView>
      <Pressable accessibilityRole="button" onPress={onBack}>
        <Text>{'←'}</Text>
      </Pressable>
      <Text accessibilityRole="header">{pickText(card.name, locale)}</Text>
      <Text>{pickText(card.issuer, locale)}</Text>
      <Text>{card.network}</Text>

      <Text>
        {card.annualFee.amountCents === 0
          ? t('kb.noFee')
          : `${t('kb.annualFee')}: ${formatCents(card.annualFee.amountCents, locale)}`}
      </Text>

      <Text>{t('kb.earnRates')}</Text>
      {Object.entries(card.earnRates.byCategory).map(([categoryId, bps]) => {
        const category = snapshot.categories.find((c) => c.id === categoryId);
        const cap = card.capDisclosures[categoryId as keyof typeof card.capDisclosures];
        return (
          <View key={categoryId}>
            <Text>
              {category ? pickText(category.label, locale) : categoryId}:{' '}
              {formatBpsAsPercent(bps, locale)}
              {card.rewardCurrency.kind === 'cashback' ? ' %' : ' pts/$'}
            </Text>
            {cap ? <Text>{pickText(cap, locale)}</Text> : null}
          </View>
        );
      })}
      <Text>
        {t('kb.baseRate')}: {formatBpsAsPercent(card.earnRates.base, locale)}
        {card.rewardCurrency.kind === 'cashback' ? ' %' : ' pts/$'}
      </Text>
      {program ? <Text>{pickText(program.name, locale)}</Text> : null}

      {card.welcomeBonus ? (
        <View>
          <Text>{t('kb.welcomeBonus')}</Text>
          <Text>{pickText(card.welcomeBonus.description, locale)}</Text>
          {card.welcomeBonus.minSpend ? (
            <Text>{formatCents(card.welcomeBonus.minSpend.amountCents, locale)}</Text>
          ) : null}
        </View>
      ) : null}

      {card.statementCredits.length > 0 ? (
        <View>
          <Text>{t('kb.statementCredits')}</Text>
          {card.statementCredits.map((credit) => (
            <Text key={credit.description.enCA}>
              {pickText(credit.description, locale)} — {formatCents(credit.amount.amountCents, locale)}{' '}
              ({pickText(credit.cadence, locale)})
            </Text>
          ))}
        </View>
      ) : null}

      {card.perks.length > 0 ? (
        <View>
          <Text>{t('kb.perks')}</Text>
          {card.perks.map((perk) => (
            <Text key={perk.enCA}>{pickText(perk, locale)}</Text>
          ))}
        </View>
      ) : null}

      {card.insurance.length > 0 ? (
        <View>
          <Text>{t('kb.insurance')}</Text>
          {card.insurance.map((item) => (
            <Text key={item.enCA}>{pickText(item, locale)}</Text>
          ))}
        </View>
      ) : null}

      <Text>{t('kb.dataAsOf', { date: card.dataAsOf })}</Text>

      {inWallet ? (
        <Text>{t('wallet.inWallet')}</Text>
      ) : (
        <Pressable
          accessibilityRole="button"
          onPress={() => {
            void addCard(card.id).then(() => setInWallet(true));
          }}
        >
          <Text>{t('wallet.add')}</Text>
        </Pressable>
      )}
    </ScrollView>
  );
}

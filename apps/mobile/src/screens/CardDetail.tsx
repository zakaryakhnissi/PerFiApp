/**
 * T025 — US2: card detail with every FR-001 field, dataAsOf (FR-014), and
 * cap disclosures. Add-to-wallet entry point lives here too.
 */
import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { Card as KbCard, KnowledgebaseSnapshot } from '@perfiapp/kb-schema';
import { currentLocale } from '../i18n';
import { formatBpsAsPercent, formatCents, pickText } from '../format';
import { addCard, getWallet } from '../store/wallet';
import { Badge, Card, GhostButton, Notice, PrimaryButton, ScreenTitle } from '../ui/components';
import { color, space, type_ } from '../ui/theme';

interface Props {
  card: KbCard;
  snapshot: KnowledgebaseSnapshot;
  onBack: () => void;
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={{ marginTop: space.lg }}>
      <Text style={[type_.label, { marginBottom: space.sm }]}>{title}</Text>
      {children}
    </View>
  );
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
  const unit = card.rewardCurrency.kind === 'cashback' ? ' %' : ' pts/$';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <GhostButton label={`← ${t('kb.title')}`} onPress={onBack} />
      <View style={{ height: space.sm }} />
      <ScreenTitle>{pickText(card.name, locale)}</ScreenTitle>
      <View style={styles.metaRow}>
        <Badge label={pickText(card.issuer, locale)} tone="primary" />
        <Badge label={card.network.toUpperCase()} />
        {card.annualFee.amountCents === 0 ? (
          <Badge label={t('kb.noFee')} tone="success" />
        ) : (
          <Badge label={`${t('kb.annualFee')}: ${formatCents(card.annualFee.amountCents, locale)}`} />
        )}
      </View>

      <Section title={t('kb.earnRates')}>
        <Card>
          {Object.entries(card.earnRates.byCategory).map(([categoryId, bps]) => {
            const category = snapshot.categories.find((c) => c.id === categoryId);
            const cap = card.capDisclosures[categoryId as keyof typeof card.capDisclosures];
            return (
              <View key={categoryId} style={styles.rateRow}>
                <Text style={type_.body}>
                  {category ? pickText(category.label, locale) : categoryId}
                </Text>
                <Text style={styles.rateValue}>
                  {formatBpsAsPercent(bps, locale)}
                  {unit}
                </Text>
                {cap ? <Text style={[type_.small, styles.capLine]}>{pickText(cap, locale)}</Text> : null}
              </View>
            );
          })}
          <View style={styles.rateRow}>
            <Text style={type_.body}>{t('kb.baseRate')}</Text>
            <Text style={styles.rateValue}>
              {formatBpsAsPercent(card.earnRates.base, locale)}
              {unit}
            </Text>
          </View>
          {program ? (
            <Text style={[type_.small, { marginTop: space.sm }]}>{pickText(program.name, locale)}</Text>
          ) : null}
        </Card>
      </Section>

      {card.welcomeBonus ? (
        <Section title={t('kb.welcomeBonus')}>
          <Card>
            <Text style={type_.body}>{pickText(card.welcomeBonus.description, locale)}</Text>
            {card.welcomeBonus.minSpend ? (
              <Text style={[type_.small, { marginTop: space.xs }]}>
                {formatCents(card.welcomeBonus.minSpend.amountCents, locale)}
              </Text>
            ) : null}
          </Card>
        </Section>
      ) : null}

      {card.statementCredits.length > 0 ? (
        <Section title={t('kb.statementCredits')}>
          <Card>
            {card.statementCredits.map((credit) => (
              <Text key={credit.description.enCA} style={[type_.body, { marginBottom: space.xs }]}>
                {pickText(credit.description, locale)} — {formatCents(credit.amount.amountCents, locale)}{' '}
                ({pickText(credit.cadence, locale)})
              </Text>
            ))}
          </Card>
        </Section>
      ) : null}

      {card.perks.length > 0 ? (
        <Section title={t('kb.perks')}>
          <Card>
            {card.perks.map((perk) => (
              <Text key={perk.enCA} style={[type_.body, { marginBottom: space.xs }]}>
                • {pickText(perk, locale)}
              </Text>
            ))}
          </Card>
        </Section>
      ) : null}

      {card.insurance.length > 0 ? (
        <Section title={t('kb.insurance')}>
          <Card>
            {card.insurance.map((item) => (
              <Text key={item.enCA} style={[type_.body, { marginBottom: space.xs }]}>
                • {pickText(item, locale)}
              </Text>
            ))}
          </Card>
        </Section>
      ) : null}

      <Notice>{t('kb.dataAsOf', { date: card.dataAsOf })}</Notice>

      <View style={{ height: space.md }} />
      {inWallet ? (
        <Badge label={t('wallet.inWallet')} tone="success" />
      ) : (
        <PrimaryButton
          label={t('wallet.add')}
          onPress={() => {
            void addCard(card.id).then(() => setInWallet(true));
          }}
        />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { padding: space.lg, paddingBottom: space.xl * 2 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm, marginBottom: space.sm },
  rateRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: color.border,
  },
  rateValue: { fontSize: 15, fontWeight: '600', color: color.ink },
  capLine: { width: '100%', marginTop: 2, color: color.warnInk },
});

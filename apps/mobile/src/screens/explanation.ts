/**
 * Renders the engine's ExplanationPart[] (i18n key + raw params) into
 * localized strings (FR-010). All number/currency formatting is Intl-based.
 */
import type { TFunction } from 'i18next';
import type { KnowledgebaseSnapshot, SpendCategoryId } from '@perfiapp/kb-schema';
import type { ExplanationPart } from '@perfiapp/recommender';
import type { SupportedLocale } from '@perfiapp/i18n';
import {
  categoryLabel,
  formatBpsAsPercent,
  formatCentiPoints,
  formatCents,
  formatMilliCentsPerPoint,
} from '../format';

export function renderExplanation(
  parts: ExplanationPart[],
  t: TFunction,
  locale: SupportedLocale,
  snapshot: KnowledgebaseSnapshot,
): string[] {
  return parts.map((part) => {
    const p = part.params;
    switch (part.key) {
      case 'explanation.cashbackRate':
        return t('explanation.cashbackRate', {
          rate: formatBpsAsPercent(Number(p['rateBps']), locale),
          category: categoryLabel(snapshot.categories, String(p['categoryId']) as SpendCategoryId, locale),
          amount: formatCents(Number(p['amountCents']), locale),
        });
      case 'explanation.pointsRate':
        return t('explanation.pointsRate', {
          rate: formatBpsAsPercent(Number(p['rateBps']), locale),
          category: categoryLabel(snapshot.categories, String(p['categoryId']) as SpendCategoryId, locale),
          amount: formatCents(Number(p['amountCents']), locale),
          points: formatCentiPoints(Number(p['pointsCenti']), locale),
        });
      case 'explanation.valuation':
        return t('explanation.valuation', {
          value: formatMilliCentsPerPoint(Number(p['milliCentsPerPoint']), locale),
          source: String(p['source']),
          asOf: String(p['asOf']),
        });
      case 'explanation.valuationDefault':
        return t('explanation.valuationDefault', {
          value: formatMilliCentsPerPoint(Number(p['milliCentsPerPoint']), locale),
        });
      case 'explanation.feeSunk':
        return t('explanation.feeSunk');
      case 'explanation.baseRateFallback':
        return t('explanation.baseRateFallback', {
          category: categoryLabel(snapshot.categories, String(p['categoryId']) as SpendCategoryId, locale),
        });
      case 'explanation.capNotModelled':
        return t('explanation.capNotModelled', {
          disclosure: locale === 'fr-CA' ? String(p['disclosureFrCA']) : String(p['disclosureEnCA']),
        });
      default:
        return t(part.key, p as Record<string, string>);
    }
  });
}

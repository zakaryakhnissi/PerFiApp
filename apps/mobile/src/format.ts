/**
 * Display-only formatting. Money VALUES stay integer cents everywhere; the
 * division below exists solely to feed Intl.NumberFormat for rendering and
 * is never used in money math (Constitution Principle II).
 */
import type { BilingualText, SpendCategory, SpendCategoryId } from '@perfiapp/kb-schema';
import type { SupportedLocale } from '@perfiapp/i18n';

export function formatCents(amountCents: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, { style: 'currency', currency: 'CAD' }).format(
    amountCents / 100,
  );
}

/** 200 bps -> "2" ; 250 bps -> "2.5" (rate for display, e.g. "2 % cash back"). */
export function formatBpsAsPercent(bps: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(bps / 100);
}

/** 1500 milli-cents/pt -> "1.5" (cents per point for display). */
export function formatMilliCentsPerPoint(mcpp: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 3 }).format(mcpp / 1000);
}

/** 1234 centi-points -> "12.34" points for display. */
export function formatCentiPoints(centiPoints: number, locale: SupportedLocale): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(centiPoints / 100);
}

export function pickText(text: BilingualText, locale: SupportedLocale): string {
  return locale === 'fr-CA' ? text.frCA : text.enCA;
}

export function categoryLabel(
  categories: SpendCategory[],
  id: SpendCategoryId,
  locale: SupportedLocale,
): string {
  const category = categories.find((c) => c.id === id);
  return category ? pickText(category.label, locale) : id;
}

/**
 * Parse a user-typed amount ("100", "100.00", "100,00") into integer cents
 * WITHOUT floating point. Returns null for anything invalid or <= 0.
 */
export function parseAmountToCents(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;
  const match = /^(\d{1,10})(?:[.,](\d{1,2}))?$/.exec(trimmed);
  if (!match) return null;
  const dollars = Number(match[1]);
  const centsPart = match[2] ?? '';
  const cents = centsPart === '' ? 0 : Number(centsPart.padEnd(2, '0'));
  const total = dollars * 100 + cents;
  return total > 0 ? total : null;
}

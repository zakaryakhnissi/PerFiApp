/**
 * @perfiapp/i18n — bilingual resources (Constitution Principle I). Both
 * locales ship together; `pnpm check-i18n` fails the build on key drift.
 */
import enCA from './en-CA.json';
import frCA from './fr-CA.json';

export const resources = {
  'en-CA': { translation: enCA },
  'fr-CA': { translation: frCA },
} as const;

export const SUPPORTED_LOCALES = ['en-CA', 'fr-CA'] as const;
export type SupportedLocale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: SupportedLocale = 'en-CA';

/** Compile-time key shape — both files must satisfy the same structure. */
export type TranslationResource = typeof enCA;
const _frCAConformsToEnCA: TranslationResource = frCA;
void _frCAConformsToEnCA;

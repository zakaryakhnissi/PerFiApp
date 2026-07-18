/**
 * i18next initialization (Constitution Principle I). Locale detection via
 * expo-localization; only en-CA and fr-CA ship, en-CA is the fallback.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { getLocales } from 'expo-localization';
import { DEFAULT_LOCALE, resources, type SupportedLocale } from '@perfiapp/i18n';

export function detectLocale(): SupportedLocale {
  const tags = getLocales().map((l) => l.languageTag);
  for (const tag of tags) {
    if (tag.toLowerCase().startsWith('fr')) return 'fr-CA';
    if (tag.toLowerCase().startsWith('en')) return 'en-CA';
  }
  return DEFAULT_LOCALE;
}

export function initI18n(locale: SupportedLocale = detectLocale()): typeof i18n {
  if (!i18n.isInitialized) {
    void i18n.use(initReactI18next).init({
      resources,
      lng: locale,
      fallbackLng: DEFAULT_LOCALE,
      interpolation: { escapeValue: false },
      returnNull: false,
    });
  }
  return i18n;
}

export function currentLocale(): SupportedLocale {
  return i18n.language === 'fr-CA' ? 'fr-CA' : 'en-CA';
}

export function switchLocale(locale: SupportedLocale): void {
  void i18n.changeLanguage(locale);
}

export default i18n;

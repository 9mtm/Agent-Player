/**
 * Frontend i18n Initialization
 *
 * Uses i18next + react-i18next for internationalization.
 * Extensions register their translations at runtime via registerExtensionTranslations().
 *
 * To add a new language:
 * 1. Add the locale to src/i18n/settings.ts
 * 2. Create translation files in src/i18n/locales/{code}/
 * 3. Import and add them to the resources object below
 */

import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Core locale files (English)
import enCommon from './locales/en/common.json';
import enNav from './locales/en/nav.json';

// To add more languages, import their files here:
// import arCommon from './locales/ar/common.json';
// import arNav from './locales/ar/nav.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common: enCommon,
        nav: enNav,
      },
      // To add more languages, add them here:
      // ar: {
      //   common: arCommon,
      //   nav: arNav,
      // },
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: ['common', 'nav'],
    interpolation: {
      escapeValue: false, // React already escapes
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'i18nextLng',
      caches: ['localStorage'],
    },
  });

export default i18n;

/**
 * Register extension translations at runtime
 * Called when an extension's frontend page loads its translations
 *
 * @param extensionId - The extension's unique ID
 * @param locale - Language code (e.g., 'en', 'ar')
 * @param translations - Key-value translation pairs
 */
export function registerExtensionTranslations(
  extensionId: string,
  locale: string,
  translations: Record<string, string>
) {
  i18n.addResourceBundle(locale, `ext-${extensionId}`, translations, true, true);
}

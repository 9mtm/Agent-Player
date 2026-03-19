/**
 * i18n Settings
 * Supported locales and RTL configuration
 *
 * To add a new language:
 * 1. Add entry to supportedLocales below
 * 2. Create locale files in src/i18n/locales/{code}/ (copy from en/ and translate)
 * 3. Import and register in src/i18n/index.ts
 */

export const supportedLocales = [
  { code: 'en', name: 'English', dir: 'ltr' as const },
  // To add more languages, add entries here. Examples:
  // { code: 'ar', name: 'العربية', dir: 'rtl' as const },
  // { code: 'es', name: 'Español', dir: 'ltr' as const },
  // { code: 'fr', name: 'Français', dir: 'ltr' as const },
  // { code: 'de', name: 'Deutsch', dir: 'ltr' as const },
  // { code: 'zh', name: '中文', dir: 'ltr' as const },
  // { code: 'ja', name: '日本語', dir: 'ltr' as const },
] as const;

export const defaultLocale = 'en';

export type SupportedLocale = (typeof supportedLocales)[number]['code'];

export function isRtlLocale(locale: string): boolean {
  const loc = supportedLocales.find(l => l.code === locale);
  return (loc?.dir as string) === 'rtl';
}

export function getLocaleDirection(locale: string): 'ltr' | 'rtl' {
  return isRtlLocale(locale) ? 'rtl' : 'ltr';
}

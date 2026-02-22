/**
 * Country and Language Mappings for SERP Scraping
 */

export const COUNTRIES = {
  US: { name: 'United States', code: 'US', language: 'en' },
  UK: { name: 'United Kingdom', code: 'UK', language: 'en' },
  CA: { name: 'Canada', code: 'CA', language: 'en' },
  AU: { name: 'Australia', code: 'AU', language: 'en' },
  DE: { name: 'Germany', code: 'DE', language: 'de' },
  FR: { name: 'France', code: 'FR', language: 'fr' },
  ES: { name: 'Spain', code: 'ES', language: 'es' },
  IT: { name: 'Italy', code: 'IT', language: 'it' },
  NL: { name: 'Netherlands', code: 'NL', language: 'nl' },
  PL: { name: 'Poland', code: 'PL', language: 'pl' },
  BR: { name: 'Brazil', code: 'BR', language: 'pt' },
  MX: { name: 'Mexico', code: 'MX', language: 'es' },
  IN: { name: 'India', code: 'IN', language: 'en' },
  JP: { name: 'Japan', code: 'JP', language: 'ja' },
  CN: { name: 'China', code: 'CN', language: 'zh' },
  KR: { name: 'South Korea', code: 'KR', language: 'ko' },
  RU: { name: 'Russia', code: 'RU', language: 'ru' },
  TR: { name: 'Turkey', code: 'TR', language: 'tr' },
  AE: { name: 'United Arab Emirates', code: 'AE', language: 'ar' },
  SA: { name: 'Saudi Arabia', code: 'SA', language: 'ar' },
};

export const LANGUAGES = {
  en: 'English',
  de: 'German',
  fr: 'French',
  es: 'Spanish',
  it: 'Italian',
  nl: 'Dutch',
  pl: 'Polish',
  pt: 'Portuguese',
  ja: 'Japanese',
  zh: 'Chinese',
  ko: 'Korean',
  ru: 'Russian',
  tr: 'Turkish',
  ar: 'Arabic',
};

export const DEVICES = ['desktop', 'mobile'];

export function getCountryName(code) {
  return COUNTRIES[code]?.name || code;
}

export function getLanguageName(code) {
  return LANGUAGES[code] || code;
}

export function getDefaultLanguage(countryCode) {
  return COUNTRIES[countryCode]?.language || 'en';
}

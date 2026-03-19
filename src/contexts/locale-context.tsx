'use client';

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supportedLocales, defaultLocale, getLocaleDirection, type SupportedLocale } from '@/i18n/settings';
import { config } from '@/lib/config';

interface LocaleContextType {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => Promise<void>;
  direction: 'ltr' | 'rtl';
  supportedLocales: typeof supportedLocales;
}

const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const { i18n } = useTranslation();
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [direction, setDirection] = useState<'ltr' | 'rtl'>('ltr');

  // Load saved locale on mount
  useEffect(() => {
    const saved = localStorage.getItem('i18nextLng') as SupportedLocale;
    if (saved && supportedLocales.some(l => l.code === saved)) {
      setLocaleState(saved);
      setDirection(getLocaleDirection(saved));
      i18n.changeLanguage(saved);
    }
  }, [i18n]);

  // Update HTML attributes when locale changes
  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = direction;
  }, [locale, direction]);

  const setLocale = async (newLocale: SupportedLocale) => {
    // Change i18next language
    await i18n.changeLanguage(newLocale);

    // Update state
    setLocaleState(newLocale);
    setDirection(getLocaleDirection(newLocale));

    // Persist to localStorage
    localStorage.setItem('i18nextLng', newLocale);

    // Persist to backend (user preference)
    try {
      const token = localStorage.getItem('auth_token');
      if (token) {
        await fetch(`${config.backendUrl}/api/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ locale: newLocale }),
        });
      }
    } catch (err) {
      console.error('Failed to save locale preference:', err);
    }
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, direction, supportedLocales }}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider');
  }
  return context;
}

/**
 * Hook for loading extension-specific translations.
 *
 * Usage in extension frontend pages:
 *   const { t, loaded } = useExtensionTranslations('my-extension');
 *   if (!loaded) return <LoadingSpinner />;
 *   return <h1>{t('title')}</h1>;
 */

import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { registerExtensionTranslations } from '@/i18n';
import { config } from '@/lib/config';

export function useExtensionTranslations(extensionId: string) {
  const { i18n, t } = useTranslation(`ext-${extensionId}`);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const loadTranslations = async () => {
      try {
        const locale = i18n.language;

        // Load translations for current locale
        const response = await fetch(
          `${config.backendUrl}/api/extensions/${extensionId}/i18n/${locale}`
        );

        if (response.ok) {
          const translations = await response.json();
          registerExtensionTranslations(extensionId, locale, translations);
        }

        // Also load English fallback if current locale is not English
        if (locale !== 'en') {
          const fallbackResponse = await fetch(
            `${config.backendUrl}/api/extensions/${extensionId}/i18n/en`
          );
          if (fallbackResponse.ok) {
            const fallbackTranslations = await fallbackResponse.json();
            registerExtensionTranslations(extensionId, 'en', fallbackTranslations);
          }
        }
      } catch (err) {
        console.error(`Failed to load translations for extension ${extensionId}:`, err);
      } finally {
        setLoaded(true);
      }
    };

    loadTranslations();
  }, [extensionId, i18n.language]);

  return { t, loaded };
}

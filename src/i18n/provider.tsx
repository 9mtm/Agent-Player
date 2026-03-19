'use client';

import './index'; // Initialize i18next (client-side only)

export function I18nProvider({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

'use client';

import { useLocale } from '@/contexts/locale-context';
import { useTranslation } from 'react-i18next';
import { Globe } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function LanguageSwitcher() {
    const { locale, setLocale, supportedLocales } = useLocale();
    const { t } = useTranslation('common');

    // Only show if there are multiple languages available
    if (supportedLocales.length <= 1) return null;

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" title={t('language')}>
                    <Globe className="h-5 w-5" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                {supportedLocales.map((loc) => (
                    <DropdownMenuItem
                        key={loc.code}
                        onClick={() => setLocale(loc.code)}
                        className={locale === loc.code ? 'bg-accent' : ''}
                    >
                        {loc.name}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

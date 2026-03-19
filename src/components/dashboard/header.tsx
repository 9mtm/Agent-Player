'use client';

import { Bell, Search, User, LogOut, Bot, Settings, UserCircle, Shield, Moon, Sun, Monitor } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAvatarWidget } from '@/contexts/avatar-widget-context';
import { useAuth } from '@/contexts/auth-context';
import { useNotifications } from '@/contexts/notification-context';
import { useDeveloperMode } from '@/contexts/developer-context';
import { useTheme } from '@/contexts/theme-context';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '@/components/ui/language-switcher';

export function Header() {
    const { user, logout } = useAuth();
    const { isOpen, toggle } = useAvatarWidget();
    const { unreadCount } = useNotifications();
    const { devMode, toggle: toggleDevMode } = useDeveloperMode();
    const { theme, setTheme } = useTheme();
    const router = useRouter();
    const { t } = useTranslation('common');

    const handleLogout = async () => {
        await logout();
    };

    // Get first letter for avatar fallback
    const getInitial = (name?: string) => {
        if (!name) return 'U';
        return name.trim()[0].toUpperCase();
    };

    return (
        <header className="flex h-16 items-center justify-between border-b bg-card px-6">
            {/* Search */}
            <div className="flex flex-1 items-center gap-4">
                <div className="relative w-96">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        type="search"
                        placeholder={t('search.placeholder')}
                        className="pl-10"
                    />
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                {/* Language switcher — visible when multiple locales available */}
                <LanguageSwitcher />

                {/* Avatar widget toggle */}
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggle}
                    title={isOpen ? t('avatar.close') : t('avatar.open')}
                    className={isOpen ? 'text-indigo-500 bg-indigo-50 dark:bg-indigo-950/40' : ''}
                >
                    <Bot className="h-5 w-5" />
                </Button>

                {/* Developer mode toggle */}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleDevMode}
                    className={`text-[10px] font-bold px-3 ${devMode ? 'bg-amber-600/20 text-amber-600 hover:bg-amber-600/30 dark:bg-amber-600/30 dark:text-amber-400' : 'text-muted-foreground hover:text-amber-600'}`}
                    title={devMode ? t('devMode.on') : t('devMode.off')}
                >
                    DEV
                </Button>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="gap-2">
                            <Avatar className="h-6 w-6">
                                <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User'} />
                                <AvatarFallback className="text-xs">
                                    {getInitial(user?.name)}
                                </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{user?.name || 'User'}</span>
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64">
                        <DropdownMenuLabel>
                            <div className="flex items-center gap-2">
                                <Avatar className="h-8 w-8">
                                    <AvatarImage src={user?.avatar || undefined} alt={user?.name || 'User'} />
                                    <AvatarFallback className="text-sm">
                                        {getInitial(user?.name)}
                                    </AvatarFallback>
                                </Avatar>
                                <div className="flex flex-col min-w-0">
                                    <p className="text-sm font-medium truncate">{user?.name || 'User'}</p>
                                    <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                                </div>
                            </div>
                        </DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => router.push('/dashboard/profile')}>
                            <User className="mr-2 h-4 w-4" />
                            <span>{t('profile')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/dashboard/notifications')} className="relative">
                            <Bell className="mr-2 h-4 w-4" />
                            <span>{t('notifications')}</span>
                            {unreadCount > 0 && (
                                <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                                    {unreadCount > 99 ? '99' : unreadCount}
                                </span>
                            )}
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push('/dashboard/security')}>
                            <Shield className="mr-2 h-4 w-4" />
                            <span>{t('security')}</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />

                        {/* Theme Toggle - Icon Row */}
                        <div className="px-2 py-2">
                            <p className="text-xs text-muted-foreground mb-2 px-2">{t('appearance')}</p>
                            <div className="flex items-center gap-1">
                                <button
                                    onClick={() => setTheme('light')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
                                        theme === 'light'
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent/50'
                                    }`}
                                    title={t('theme.lightMode')}
                                >
                                    <Sun className="h-4 w-4" />
                                    <span className="text-xs">{t('theme.light')}</span>
                                </button>
                                <button
                                    onClick={() => setTheme('dark')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
                                        theme === 'dark'
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent/50'
                                    }`}
                                    title={t('theme.darkMode')}
                                >
                                    <Moon className="h-4 w-4" />
                                    <span className="text-xs">{t('theme.dark')}</span>
                                </button>
                                <button
                                    onClick={() => setTheme('system')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-md transition-colors ${
                                        theme === 'system'
                                            ? 'bg-accent text-accent-foreground'
                                            : 'hover:bg-accent/50'
                                    }`}
                                    title={t('theme.systemMode')}
                                >
                                    <Monitor className="h-4 w-4" />
                                    <span className="text-xs">{t('theme.auto')}</span>
                                </button>
                            </div>
                        </div>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={handleLogout} className="text-red-600 focus:text-red-600">
                            <LogOut className="mr-2 h-4 w-4" />
                            <span>{t('logout')}</span>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    );
}

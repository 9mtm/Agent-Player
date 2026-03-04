'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
    LayoutDashboard,
    Calendar,
    Settings,
    Bot,
    MessageSquare,
    MessagesSquare,
    Puzzle,
    PackagePlus,
    User,
    Users,
    Bell,
    Shield,
    Database,
    Key,
    Mail,
    Phone,
    ChevronDown,
    ChevronRight,
    Clock,
    Workflow,
    User2,
    Volume2,
    HardDrive,
    ListTodo,
    BarChart2,
    BarChart3,
    History,
    ClipboardList,
    ScanSearch,
    Code2,
    Layers,
    Hash,
    Sliders,
    Eye,
    EyeOff,
    GripVertical,
    PanelLeft,
    PanelLeftClose,
    TrendingUp,
    Search,
    Lightbulb,
    Globe,
    Compass,
    Brain,
    Sparkles,
    Award,
    Share2,
} from 'lucide-react';
import { useDeveloperMode } from '@/contexts/developer-context';
import { useEffect, useState as useReactState } from 'react';
import { config } from '@/lib/config';

// Core navigation items (static)
const coreNavigation = [
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Chat', href: '/chat', icon: MessageSquare },
    // { name: 'Email', href: '/dashboard/email', icon: Mail }, // Moved to email-client extension
    { name: 'Tasks', href: '/dashboard/tasks', icon: ListTodo },
    { name: 'Workflows', href: '/dashboard/workflows', icon: Workflow },
    { name: 'Scheduler', href: '/dashboard/scheduler', icon: Clock },
    // Calendar, Team, Public Chat moved to extensions
];

const avatarSubmenu = [
    { name: 'Avatar Viewer', href: '/avatar-viewer', icon: Eye },
    { name: 'Multiverse', href: '/dashboard/multiverse', icon: Globe },
];

const brainSubmenu = [
    { name: 'Memory', href: '/dashboard/memory', icon: Brain },
    { name: 'Shared Memory', href: '/dashboard/shared-memory', icon: Share2 },
    { name: 'Memory Insights', href: '/dashboard/memory-insights', icon: Lightbulb },
    { name: 'Evolution', href: '/dashboard/evolution', icon: Sparkles },
    { name: 'Evaluation', href: '/dashboard/evaluation', icon: Award },
];

const settingsSubmenu = [
    { name: 'Agent', href: '/dashboard/agent', icon: Bot },
    { name: 'Skills', href: '/dashboard/skills', icon: Puzzle },
    { name: 'Extensions', href: '/dashboard/extensions', icon: PackagePlus },
    { name: 'Voice Settings', href: '/settings/voice', icon: Volume2 },
    { name: 'Storage', href: '/dashboard/storage', icon: HardDrive },
];

const developerMenu = [
    { name: 'UI Components', href: '/dashboard/developer/ui-components', icon: Layers },
    { name: 'AI Tools', href: '/dashboard/ai-tools', icon: ScanSearch },
    { name: 'SEO Tools', href: '/dashboard/seo', icon: TrendingUp },
    { name: 'WAF Security', href: '/dashboard/waf-security', icon: Shield },
    { name: 'Claude Code', href: '/dashboard/claude', icon: Bot },
    { name: 'Credentials', href: '/dashboard/settings/credentials', icon: Key },
    { name: 'Database', href: '/dashboard/database', icon: Database },
    // Brain section
    { name: 'Memory', href: '/dashboard/memory', icon: Brain },
    { name: 'Shared Memory', href: '/dashboard/shared-memory', icon: Share2 },
    { name: 'Memory Insights', href: '/dashboard/memory-insights', icon: Lightbulb },
    { name: 'Evolution', href: '/dashboard/evolution', icon: Sparkles },
    { name: 'Evaluation', href: '/dashboard/evaluation', icon: Award },
];

export function Sidebar() {
    const pathname = usePathname();
    const { devMode } = useDeveloperMode();
    const [devOpen, setDevOpen] = useState(
        pathname?.startsWith('/dashboard/developer/') ||
        pathname?.startsWith('/dashboard/claude') ||
        pathname?.startsWith('/dashboard/ai-tools') ||
        pathname?.startsWith('/dashboard/seo') ||
        pathname?.startsWith('/dashboard/waf-security') ||
        pathname?.startsWith('/dashboard/settings/credentials') ||
        pathname?.startsWith('/dashboard/settings/email') ||
        pathname?.startsWith('/dashboard/database') ||
        pathname?.startsWith('/dashboard/memory') ||
        pathname?.startsWith('/dashboard/shared-memory') ||
        pathname?.startsWith('/dashboard/memory-insights') ||
        pathname?.startsWith('/dashboard/evolution') ||
        pathname?.startsWith('/dashboard/evaluation')
    );
    const [channelsOpen, setChannelsOpen] = useState(
        pathname?.startsWith('/dashboard/channels')
    );
    const [hasChannels, setHasChannels] = useReactState(false);
    const [extensionRoutes, setExtensionRoutes] = useReactState<Array<{ name: string; href: string; icon: any }>>([]);
    const [avatarOpen, setAvatarOpen] = useState(
        pathname?.startsWith('/avatar-viewer') ||
        pathname?.startsWith('/dashboard/multiverse')
    );
    const [brainOpen, setBrainOpen] = useState(
        pathname?.startsWith('/dashboard/memory') ||
        pathname?.startsWith('/dashboard/shared-memory') ||
        pathname?.startsWith('/dashboard/memory-insights') ||
        pathname?.startsWith('/dashboard/evolution') ||
        pathname?.startsWith('/dashboard/evaluation')
    );
    const [settingsOpen, setSettingsOpen] = useState(
        pathname?.startsWith('/dashboard/agent') ||
        pathname?.startsWith('/dashboard/skills') ||
        pathname?.startsWith('/dashboard/extensions') ||
        pathname?.startsWith('/settings/voice') ||
        pathname?.startsWith('/dashboard/storage')
    );
    const [showCustomize, setShowCustomize] = useReactState(false);
    const [hiddenItems, setHiddenItems] = useReactState<string[]>([]);
    const [navOrder, setNavOrder] = useReactState(coreNavigation);
    const [collapsed, setCollapsed] = useReactState(false);
    const [draggedIndex, setDraggedIndex] = useReactState<number | null>(null);

    useEffect(() => {
        // Icon map for dynamic extension routes
        const iconMap: Record<string, any> = {
            Calendar,
            Users,
            MessagesSquare,
            Puzzle,
            Search,
            BarChart3,
            Mail,
            Phone,
            TrendingUp,
            Shield,
            Globe,
            // Add more icons as needed
        };

        // Check if there are enabled channel extensions
        const checkChannels = async () => {
            try {
                const response = await fetch(`${config.backendUrl}/api/extensions`);
                const data = await response.json();
                const channelExts = data.extensions.filter(
                    (ext: any) => ext.type === 'channel' && ext.enabled
                );
                setHasChannels(channelExts.length > 0);
            } catch (err) {
                console.error('Failed to check channel extensions:', err);
            }
        };

        // Fetch extension routes (Calendar, Team, Public Chat, etc.)
        const loadExtensionRoutes = async () => {
            try {
                const response = await fetch(`${config.backendUrl}/api/extensions/enabled-routes`);
                const data = await response.json();

                if (data.success && data.routes) {
                    // Filter for 'main' position routes only (exclude settings, developer)
                    const mainRoutes = data.routes
                        .filter((route: any) => route.position === 'main')
                        .map((route: any) => ({
                            name: route.name,
                            href: route.href,
                            icon: iconMap[route.icon] || Puzzle, // Fallback to Puzzle icon
                        }));

                    setExtensionRoutes(mainRoutes);
                }
            } catch (err) {
                console.error('Failed to load extension routes:', err);
            }
        };

        checkChannels();
        loadExtensionRoutes();

        // Load sidebar customization from localStorage
        const savedHidden = localStorage.getItem('sidebar_hidden_items');
        const savedOrder = localStorage.getItem('sidebar_nav_order');
        const savedCollapsed = localStorage.getItem('sidebar_collapsed');

        if (savedHidden) {
            try {
                setHiddenItems(JSON.parse(savedHidden));
            } catch (e) {
                console.error('Failed to parse hidden items:', e);
            }
        }
        if (savedCollapsed) {
            try {
                setCollapsed(JSON.parse(savedCollapsed));
            } catch (e) {
                console.error('Failed to parse collapsed state:', e);
            }
        }
    }, []);

    // Separate effect to merge extension routes with core navigation
    useEffect(() => {
        const allNavigation = [...coreNavigation, ...extensionRoutes];

        // Restore saved order if available
        const savedOrder = localStorage.getItem('sidebar_nav_order');
        if (savedOrder) {
            try {
                const orderNames = JSON.parse(savedOrder);
                // Rebuild navOrder from saved names, preserving icon components
                const rebuiltOrder = orderNames
                    .map((name: string) => allNavigation.find(item => item.name === name))
                    .filter(Boolean);

                // Add any new items that aren't in the saved order
                const rebuiltNames = rebuiltOrder.map(item => item.name);
                const newItems = allNavigation.filter(item => !rebuiltNames.includes(item.name));
                const finalOrder = [...rebuiltOrder, ...newItems];

                // If we got valid items, use them, otherwise use default navigation
                if (finalOrder.length > 0) {
                    setNavOrder(finalOrder);
                } else {
                    setNavOrder(allNavigation);
                }
            } catch (e) {
                console.error('Failed to parse nav order:', e);
                setNavOrder(allNavigation);
            }
        } else {
            setNavOrder(allNavigation);
        }
    }, [extensionRoutes]);

    const toggleItemVisibility = (itemName: string) => {
        const newHidden = hiddenItems.includes(itemName)
            ? hiddenItems.filter(h => h !== itemName)
            : [...hiddenItems, itemName];
        setHiddenItems(newHidden);
        localStorage.setItem('sidebar_hidden_items', JSON.stringify(newHidden));
    };

    const moveItem = (fromIndex: number, toIndex: number) => {
        const newOrder = [...navOrder];
        const [moved] = newOrder.splice(fromIndex, 1);
        newOrder.splice(toIndex, 0, moved);
        setNavOrder(newOrder);
        // Save only names, not the full objects with icons
        localStorage.setItem('sidebar_nav_order', JSON.stringify(newOrder.map(item => item.name)));
    };

    const resetCustomization = () => {
        setHiddenItems([]);
        setNavOrder([...coreNavigation, ...extensionRoutes]);
        localStorage.removeItem('sidebar_hidden_items');
        localStorage.removeItem('sidebar_nav_order');
    };

    const toggleCollapsed = () => {
        const newCollapsed = !collapsed;
        setCollapsed(newCollapsed);
        localStorage.setItem('sidebar_collapsed', JSON.stringify(newCollapsed));
    };

    const handleDragStart = (index: number) => {
        setDraggedIndex(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (draggedIndex === null || draggedIndex === index) return;

        const newOrder = [...navOrder];
        const draggedItem = newOrder[draggedIndex];
        newOrder.splice(draggedIndex, 1);
        newOrder.splice(index, 0, draggedItem);

        setNavOrder(newOrder);
        setDraggedIndex(index);
    };

    const handleDragEnd = () => {
        setDraggedIndex(null);
        // Save only names, not the full objects with icons
        localStorage.setItem('sidebar_nav_order', JSON.stringify(navOrder.map(item => item.name)));
    };

    return (
        <div className={cn("flex flex-col border-r bg-card transition-all duration-300", collapsed ? "w-16" : "w-64")}>
            {/* Header with Toggle and Settings */}
            <div className="flex h-16 items-center justify-end border-b px-3 gap-1">
                {!collapsed ? (
                    <>
                        <button
                            onClick={() => setShowCustomize(true)}
                            className="rounded-md p-1.5 text-muted-foreground/60 transition-all hover:bg-muted/50 hover:text-foreground"
                            title="Customize Sidebar"
                        >
                            <Sliders className="h-4 w-4" />
                        </button>
                        <button
                            onClick={toggleCollapsed}
                            className="rounded-md p-1.5 text-muted-foreground/60 transition-all hover:bg-muted/50 hover:text-foreground"
                            title="Collapse Sidebar"
                        >
                            <PanelLeftClose className="h-4 w-4" />
                        </button>
                    </>
                ) : (
                    <button
                        onClick={toggleCollapsed}
                        className="rounded-md p-1.5 text-muted-foreground/60 transition-all hover:bg-muted/50 hover:text-foreground mx-auto"
                        title="Expand Sidebar"
                    >
                        <PanelLeft className="h-4 w-4" />
                    </button>
                )}
            </div>

            {/* Navigation */}
            <nav className="flex-1 space-y-1 overflow-y-auto p-4">
                {/* Avatar with Submenu */}
                <div className="space-y-1">
                    <button
                        onClick={() => setAvatarOpen(!avatarOpen)}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            collapsed ? 'justify-center' : '',
                            avatarOpen
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                        title={collapsed ? 'Avatar' : undefined}
                    >
                        <User2 className={cn(collapsed ? 'h-7 w-7' : 'h-5 w-5')} />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Avatar</span>
                                {avatarOpen ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </>
                        )}
                    </button>

                    {avatarOpen && !collapsed && (
                        <div className="ml-4 space-y-1 border-l-2 border-muted pl-2">
                            {avatarSubmenu.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Main Navigation Items */}
                {navOrder.filter(item => !hiddenItems.includes(item.name)).map((item) => {
                    // Dashboard should only be active on exact match, not for all /dashboard/* pages
                    const isActive = item.href === '/dashboard'
                        ? pathname === '/dashboard'
                        : (pathname === item.href || pathname?.startsWith(item.href + '/'));
                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                collapsed ? 'justify-center' : '',
                                isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                            title={collapsed ? item.name : undefined}
                        >
                            <item.icon className={cn(collapsed ? 'h-7 w-7' : 'h-5 w-5')} />
                            {!collapsed && item.name}
                        </Link>
                    );
                })}

                {/* Channels section — only visible when channel extensions are enabled */}
                {hasChannels && (
                    <div className="space-y-1">
                        <Link
                            href="/dashboard/channels"
                            className={cn(
                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                collapsed ? 'justify-center' : '',
                                pathname === '/dashboard/channels' || pathname?.startsWith('/dashboard/channels/')
                                    ? 'bg-primary text-primary-foreground'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                            title={collapsed ? 'Channels' : undefined}
                        >
                            <Hash className={cn(collapsed ? 'h-7 w-7' : 'h-5 w-5')} />
                            {!collapsed && 'Channels'}
                        </Link>
                    </div>
                )}

                {/* Settings with Submenu */}
                <div className="space-y-1">
                    <button
                        onClick={() => setSettingsOpen(!settingsOpen)}
                        className={cn(
                            'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            collapsed ? 'justify-center' : '',
                            settingsOpen
                                ? 'bg-accent text-accent-foreground'
                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                        )}
                        title={collapsed ? 'Settings' : undefined}
                    >
                        <Settings className={cn(collapsed ? 'h-7 w-7' : 'h-5 w-5')} />
                        {!collapsed && (
                            <>
                                <span className="flex-1 text-left">Settings</span>
                                {settingsOpen ? (
                                    <ChevronDown className="h-4 w-4" />
                                ) : (
                                    <ChevronRight className="h-4 w-4" />
                                )}
                            </>
                        )}
                    </button>

                    {settingsOpen && !collapsed && (
                        <div className="ml-4 space-y-1 border-l-2 border-muted pl-2">
                            {settingsSubmenu.map((item) => {
                                const isActive = pathname === item.href;
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                            isActive
                                                ? 'bg-primary text-primary-foreground'
                                                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                        )}
                                    >
                                        <item.icon className="h-4 w-4" />
                                        {item.name}
                                    </Link>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Brain with Submenu — only visible when dev mode is on */}
                {devMode && (
                    <div className="space-y-1">
                        <button
                            onClick={() => setBrainOpen(!brainOpen)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                collapsed ? 'justify-center' : '',
                                brainOpen
                                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                            title={collapsed ? 'Brain' : undefined}
                        >
                            <Brain className={cn(collapsed ? 'h-7 w-7' : 'h-5 w-5')} />
                            {!collapsed && (
                                <>
                                    <span className="flex-1 text-left">Brain</span>
                                    {brainOpen ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </>
                            )}
                        </button>

                        {brainOpen && !collapsed && (
                            <div className="ml-4 space-y-1 border-l-2 border-purple-500/30 pl-2">
                                {brainSubmenu.map((item) => {
                                    const isActive = pathname === item.href;
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {/* Developer section — only visible when dev mode is on */}
                {devMode && (
                    <div className="space-y-1">
                        <button
                            onClick={() => setDevOpen(!devOpen)}
                            className={cn(
                                'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                collapsed ? 'justify-center' : '',
                                devOpen
                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                            )}
                            title={collapsed ? 'Developer' : undefined}
                        >
                            <Code2 className={cn(collapsed ? 'h-7 w-7' : 'h-5 w-5')} />
                            {!collapsed && (
                                <>
                                    <span className="flex-1 text-left">Developer</span>
                                    {devOpen ? (
                                        <ChevronDown className="h-4 w-4" />
                                    ) : (
                                        <ChevronRight className="h-4 w-4" />
                                    )}
                                </>
                            )}
                        </button>

                        {devOpen && !collapsed && (
                            <div className="ml-4 space-y-1 border-l-2 border-amber-500/30 pl-2">
                                {developerMenu.map((item) => {
                                    const isActive = pathname === item.href ||
                                        (item.href === '/dashboard/claude' && pathname?.startsWith('/dashboard/claude'));
                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={cn(
                                                'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                                                isActive
                                                    ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                                                    : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                                            )}
                                        >
                                            <item.icon className="h-4 w-4" />
                                            {item.name}
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </nav>

            {/* Footer */}
            {!collapsed && (
                <div className="space-y-2 border-t p-4">
                    <div className="rounded-lg bg-muted p-3">
                        <p className="text-xs font-medium text-muted-foreground">
                            Version 1.3.0
                        </p>
                        <p className="text-xs text-muted-foreground">
                            Phase 9 - beta
                        </p>
                    </div>
                </div>
            )}

            {/* Customize Dialog */}
            {showCustomize && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setShowCustomize(false)}>
                    <div className="w-full max-w-md rounded-lg bg-card p-6 shadow-lg" onClick={(e) => e.stopPropagation()}>
                        <div className="mb-4 flex items-center justify-between">
                            <h2 className="text-xl font-semibold">Customize Sidebar</h2>
                            <button
                                onClick={() => setShowCustomize(false)}
                                className="rounded-lg p-1 hover:bg-accent"
                            >
                                ✕
                            </button>
                        </div>

                        <div className="mb-4 space-y-2">
                            <h3 className="text-sm font-semibold text-muted-foreground">Navigation Items</h3>
                            <p className="text-xs text-muted-foreground">Drag items to reorder</p>
                            <div className="space-y-1 max-h-96 overflow-y-auto">
                                {navOrder.map((item, index) => (
                                    <div
                                        key={item.name}
                                        draggable
                                        onDragStart={() => handleDragStart(index)}
                                        onDragOver={(e) => handleDragOver(e, index)}
                                        onDragEnd={handleDragEnd}
                                        className={cn(
                                            "flex items-center gap-2 rounded-lg border bg-card p-2 cursor-move transition-all",
                                            draggedIndex === index ? "opacity-50 scale-95" : "opacity-100"
                                        )}
                                    >
                                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                                        <item.icon className="h-4 w-4" />
                                        <span className="flex-1 text-sm">{item.name}</span>
                                        <button
                                            onClick={() => toggleItemVisibility(item.name)}
                                            className="rounded p-1 hover:bg-accent"
                                        >
                                            {hiddenItems.includes(item.name) ? (
                                                <EyeOff className="h-4 w-4 text-muted-foreground" />
                                            ) : (
                                                <Eye className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex gap-2">
                            <button
                                onClick={resetCustomization}
                                className="flex-1 rounded-lg border px-4 py-2 text-sm font-medium hover:bg-accent"
                            >
                                Reset
                            </button>
                            <button
                                onClick={() => setShowCustomize(false)}
                                className="flex-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

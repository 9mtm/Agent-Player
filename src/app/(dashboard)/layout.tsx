'use client';

import { Sidebar } from '@/components/dashboard/sidebar';
import { Header } from '@/components/dashboard/header';
import { FloatingAvatarWidget } from '@/components/avatar/FloatingAvatarWidget';
import { AvatarWidgetProvider } from '@/contexts/avatar-widget-context';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { user, isLoading } = useAuth();

    if (isLoading) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading...</p>
                </div>
            </div>
        );
    }

    // Auth context handles redirect to /login when user is null

    return (
        <AvatarWidgetProvider>
            <div className="flex h-screen overflow-hidden bg-background">
                {/* Sidebar */}
                <Sidebar />

                {/* Main Content */}
                <div className="flex flex-1 flex-col overflow-hidden">
                    {/* Header */}
                    <Header />

                    {/* Page Content */}
                    <main className="flex-1 overflow-y-auto p-6">
                        {children}
                    </main>
                </div>
            </div>

            {/* Floating avatar widget — renders above everything */}
            <FloatingAvatarWidget />
        </AvatarWidgetProvider>
    );
}

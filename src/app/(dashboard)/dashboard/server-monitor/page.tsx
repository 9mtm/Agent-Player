'use client';

import { useState } from 'react';
import { Header } from '@/components/server-monitor/layout/Header';
import { Navigation } from '@/components/server-monitor/layout/Navigation';
import { DashboardTab } from '@/components/server-monitor/dashboard/DashboardTab';
import { AllSitesTab } from '@/components/server-monitor/all-sites/AllSitesTab';
import { ServersTab } from '@/components/server-monitor/servers/ServersTab';
import { S3Tab } from '@/components/server-monitor/s3/S3Tab';
import { UpdatesTab } from '@/components/server-monitor/updates/UpdatesTab';
import { SettingsTab } from '@/components/server-monitor/settings/SettingsTab';

type TabType = 'dashboard' | 'allsites' | 'servers' | 's3' | 'updates' | 'settings';

export default function ServerMonitorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');

  return (
    <div className="flex h-screen flex-col bg-background">
      <Header />

      <Navigation activeTab={activeTab} onTabChange={setActiveTab} />

      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && <DashboardTab />}
        {activeTab === 'allsites' && <AllSitesTab />}
        {activeTab === 'servers' && <ServersTab />}
        {activeTab === 's3' && <S3Tab />}
        {activeTab === 'updates' && <UpdatesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      <footer className="border-t border-border bg-card px-8 py-4">
        <p className="text-center text-sm text-muted-foreground">
          Server Monitor - Powered by Agent Player
        </p>
      </footer>
    </div>
  );
}

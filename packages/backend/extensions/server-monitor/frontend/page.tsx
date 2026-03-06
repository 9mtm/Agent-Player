/**
 * Server Monitor - Universal Server Monitoring Dashboard
 * Supports WHM/cPanel, Linux, AWS S3, and SSH-enabled infrastructure
 */

'use client';

import { config } from '@/lib/config';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Server,
  Globe,
  Database,
  RefreshCw,
  Download,
  Moon,
  Sun,
  Languages,
  Bell
} from 'lucide-react';
import { toast } from 'sonner';

// Components (to be created)
import { EnhancedDashboardTab } from './components/dashboard/EnhancedDashboardTab';
import { AllSitesTab } from './components/servers/AllSitesTab';
import { ServersTab } from './components/servers/ServersTab';
import { S3Tab } from './components/s3/S3Tab';
import { UpdatesTab } from './components/updates/UpdatesTab';
import { SettingsTab } from './components/settings/SettingsTab';

type TabType = 'dashboard' | 'allsites' | 'servers' | 's3' | 'updates' | 'settings';

interface Tab {
  id: TabType;
  name: string;
  icon: React.ReactNode;
  badge?: number;
}

export default function ServerMonitorPage() {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [theme, setTheme] = useState<'light' | 'dark'>('dark');
  const [language, setLanguage] = useState<'en' | 'de'>('en');
  const [alerts, setAlerts] = useState<number>(0);

  const tabs: Tab[] = [
    { id: 'dashboard', name: 'Dashboard', icon: <Server className="w-4 h-4" /> },
    { id: 'allsites', name: 'All Sites', icon: <Globe className="w-4 h-4" /> },
    { id: 'servers', name: 'Servers', icon: <Server className="w-4 h-4" /> },
    { id: 's3', name: 'S3 Storage', icon: <Database className="w-4 h-4" /> },
    { id: 'updates', name: 'Updates', icon: <RefreshCw className="w-4 h-4" /> },
    { id: 'settings', name: 'Settings', icon: <Server className="w-4 h-4" /> },
  ];

  const handleRefresh = () => {
    toast.info('Refreshing data...');
    // Will trigger refresh in active tab component
  };

  const handleExportCSV = () => {
    toast.info('Exporting CSV...');
    // Will be implemented per tab
  };

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    document.documentElement.classList.toggle('dark');
    toast.success(`Theme switched to ${newTheme} mode`);
  };

  const toggleLanguage = () => {
    const newLang = language === 'en' ? 'de' : 'en';
    setLanguage(newLang);
    toast.success(`Language changed to ${newLang.toUpperCase()}`);
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card px-8 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Server className="h-7 w-7 text-primary" />
            <h1 className="text-xl font-bold">Server Monitor</h1>
          </div>

          <div className="flex items-center gap-2">
            {/* Alerts Bell */}
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => toast.info('Alerts panel coming soon')}
            >
              <Bell className="h-4 w-4" />
              {alerts > 0 && (
                <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                  {alerts}
                </span>
              )}
            </Button>

            {/* Tools Menu */}
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={handleExportCSV}>
              <Download className="h-4 w-4" />
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleTheme}>
              {theme === 'dark' ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>

            <Button variant="ghost" size="icon" onClick={toggleLanguage}>
              <Languages className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Tab Navigation */}
      <nav className="border-b border-border bg-card px-8">
        <div className="flex gap-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 border-b-2 px-6 py-3 text-sm font-semibold transition-colors ${
                activeTab === tab.id
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.icon}
              <span>{tab.name}</span>
              {tab.badge !== undefined && tab.badge > 0 && (
                <span className="ml-1 rounded-full bg-primary px-2 py-0.5 text-xs font-bold text-primary-foreground">
                  {tab.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-8">
        {activeTab === 'dashboard' && <EnhancedDashboardTab />}
        {activeTab === 'allsites' && <AllSitesTab />}
        {activeTab === 'servers' && <ServersTab />}
        {activeTab === 's3' && <S3Tab />}
        {activeTab === 'updates' && <UpdatesTab />}
        {activeTab === 'settings' && <SettingsTab />}
      </main>

      {/* Footer */}
      <footer className="border-t border-border bg-card px-8 py-3">
        <p className="text-center text-sm text-muted-foreground">
          Server Monitor v1.0 - Universal Server Management Platform
        </p>
      </footer>
    </div>
  );
}

'use client';

import { config } from '@/lib/config';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Settings as SettingsIcon,
  Key,
  Zap,
  Bell,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SEOSettings() {
  const [settings, setSettings] = useState<any>(null);
  const [credentials, setCredentials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSettings();
    loadCredentials();
  }, []);

  const loadSettings = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/ext/seo/settings', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Failed to load settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadCredentials = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/credentials', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const scraperCreds = data.credentials?.filter((c: any) =>
          c.name.endsWith('-api-key')
        ) || [];
        setCredentials(scraperCreds);
      }
    } catch (error) {
      console.error('Failed to load credentials:', error);
    }
  };

  const saveSettings = async () => {
    setSaving(true);
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/ext/seo/settings', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Settings saved successfully');
      } else {
        throw new Error('Failed to save settings');
      }
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const scraperTypes = [
    { id: 'serper', name: 'Serper.dev', tier: 'Primary', url: 'https://serper.dev' },
    { id: 'serpapi', name: 'SerpAPI', tier: 'Primary', url: 'https://serpapi.com' },
    { id: 'valueserp', name: 'ValueSERP', tier: 'Primary', url: 'https://valueserp.com' },
    { id: 'searchapi', name: 'SearchAPI', tier: 'Primary', url: 'https://searchapi.io' },
    { id: 'serply', name: 'Serply', tier: 'Secondary', url: 'https://serply.io' },
    { id: 'scrapingant', name: 'ScrapingAnt', tier: 'Secondary', url: 'https://scrapingant.com' },
    { id: 'scrapingrobot', name: 'ScrapingRobot', tier: 'Secondary', url: 'https://scrapingrobot.com' },
    { id: 'spaceserp', name: 'SpaceSERP', tier: 'Secondary', url: 'https://spaceserp.com' },
    { id: 'hasdata', name: 'HasData', tier: 'Secondary', url: 'https://hasdata.com' },
  ];

  const hasCredential = (scraperId: string) => {
    return credentials.some(c => c.name === `${scraperId}-api-key`);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-64 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <SettingsIcon className="h-8 w-8 text-primary" />
          SEO Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Configure SERP scrapers, notifications, and integrations
        </p>
      </div>

      {/* Scraper Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            SERP Scrapers
          </CardTitle>
          <CardDescription>
            Configure API keys for SERP scraping services. The system automatically falls back to secondary scrapers if the primary fails.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Primary Scraper Selection */}
          <div className="space-y-2">
            <Label>Primary Scraper</Label>
            <select
              className="w-full px-3 py-2 border rounded-md bg-background"
              value={settings?.primary_scraper || 'serper'}
              onChange={(e) => setSettings({ ...settings, primary_scraper: e.target.value })}
            >
              {scraperTypes.filter(s => s.tier === 'Primary').map(scraper => (
                <option key={scraper.id} value={scraper.id}>
                  {scraper.name} {hasCredential(scraper.id) ? '✓' : '(no key)'}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              The scraper to use first for all requests
            </p>
          </div>

          {/* Scraper Status Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-4">
            {scraperTypes.map(scraper => {
              const hasCred = hasCredential(scraper.id);
              return (
                <div
                  key={scraper.id}
                  className={`border rounded-lg p-4 ${hasCred ? 'border-green-500/50 bg-green-500/10' : 'border-border'}`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium">{scraper.name}</h4>
                      <Badge variant={scraper.tier === 'Primary' ? 'default' : 'secondary'} className="text-xs mt-1">
                        {scraper.tier}
                      </Badge>
                    </div>
                    {hasCred ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <XCircle className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div className="flex gap-2 mt-3">
                    {hasCred ? (
                      <Link href="/dashboard/settings/credentials" className="flex-1">
                        <Button size="sm" variant="outline" className="w-full">
                          <Key className="h-3 w-3 mr-1" />
                          Manage
                        </Button>
                      </Link>
                    ) : (
                      <>
                        <Link href="/dashboard/settings/credentials" className="flex-1">
                          <Button size="sm" className="w-full">
                            <Key className="h-3 w-3 mr-1" />
                            Add Key
                          </Button>
                        </Link>
                        <Link href={scraper.url} target="_blank">
                          <Button size="sm" variant="ghost">
                            <LinkIcon className="h-3 w-3" />
                          </Button>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Instructions */}
          <div className="bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 mt-4">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
              <div className="space-y-2">
                <h4 className="font-medium text-blue-700 dark:text-blue-400">How to add API keys:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Click "Add Key" on any scraper above</li>
                  <li>Create credential with name: <code className="bg-muted px-1 py-0.5 rounded">scraper-id-api-key</code></li>
                  <li>For example: <code className="bg-muted px-1 py-0.5 rounded">serper-api-key</code></li>
                  <li>Paste your API key as the value (will be encrypted)</li>
                </ol>
                <p className="text-sm text-muted-foreground mt-2">
                  Recommended: Get a free Serper.dev API key (100 free searches/month)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notification Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-blue-500" />
            Notifications
          </CardTitle>
          <CardDescription>
            Get notified when keyword rankings change significantly
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <Label>Enable Notifications</Label>
              <p className="text-xs text-muted-foreground">
                Receive alerts in Avatar Viewer when rankings change
              </p>
            </div>
            <Switch
              checked={settings?.enable_notifications}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, enable_notifications: checked ? 1 : 0 })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notify on Improvement</Label>
              <p className="text-xs text-muted-foreground">
                Alert when keyword moves up 3+ positions
              </p>
            </div>
            <Switch
              checked={settings?.notify_on_improvement}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notify_on_improvement: checked ? 1 : 0 })
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Notify on Drop</Label>
              <p className="text-xs text-muted-foreground">
                Alert when keyword drops 5+ positions
              </p>
            </div>
            <Switch
              checked={settings?.notify_on_drop}
              onCheckedChange={(checked) =>
                setSettings({ ...settings, notify_on_drop: checked ? 1 : 0 })
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Change Threshold</Label>
            <Input
              type="number"
              min="1"
              max="20"
              value={settings?.notify_threshold || 3}
              onChange={(e) =>
                setSettings({ ...settings, notify_threshold: parseInt(e.target.value) })
              }
            />
            <p className="text-xs text-muted-foreground">
              Minimum position change to trigger notification
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={saveSettings} disabled={saving}>
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </div>
    </div>
  );
}

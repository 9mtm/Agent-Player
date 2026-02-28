'use client';

import { config } from '@/lib/config';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  TrendingUp,
  Search,
  BarChart2,
  Users,
  Settings as SettingsIcon,
  Lightbulb,
  Plus,
  AlertCircle,
  CheckCircle2,
  Link as LinkIcon,
} from 'lucide-react';
import Link from 'next/link';

export default function SEODashboard() {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [hasApiKey, setHasApiKey] = useState(false);

  useEffect(() => {
    loadStats();
    checkApiKey();
  }, []);

  const loadStats = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/ext/seo/domains', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats({
          domains: data.domains.length,
          keywords: data.domains.reduce((sum: number, d: any) => sum + (d.keyword_count || 0), 0),
        });
      }
    } catch (error) {
      console.error('Failed to load SEO stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const checkApiKey = async () => {
    try {
      const authToken = localStorage.getItem('auth_token');
      const response = await fetch('${config.backendUrl}/api/credentials', {
        headers: {
          'Authorization': `Bearer ${authToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const hasScraper = data.credentials?.some((c: any) =>
          c.name === 'serper-api-key' ||
          c.name === 'serpapi-api-key' ||
          c.name === 'valueserp-api-key'
        );
        setHasApiKey(hasScraper);
      }
    } catch (error) {
      console.error('Failed to check API keys:', error);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <TrendingUp className="h-8 w-8 text-primary" />
            SEO Tools
          </h1>
          <p className="text-muted-foreground mt-1">
            Track keywords, analyze rankings, and improve search visibility
          </p>
        </div>
        <Link href="/dashboard/seo/settings">
          <Button variant="outline" size="sm">
            <SettingsIcon className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </Link>
      </div>

      {/* Setup Alert */}
      {!hasApiKey && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-700 dark:text-yellow-400">
              <AlertCircle className="h-5 w-5" />
              Setup Required
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              To start tracking keywords, you need to add at least one SERP scraper API key.
            </p>
            <div className="flex gap-2">
              <Link href="/dashboard/settings/credentials">
                <Button size="sm">
                  Add API Key
                </Button>
              </Link>
              <Link href="https://serper.dev" target="_blank">
                <Button size="sm" variant="outline">
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Get Free Serper.dev Key
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Domains</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats?.domains || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Tracked websites
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Keywords</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '-' : stats?.keywords || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Active keywords
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              Extension enabled
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5 text-blue-500" />
              Track Keywords
            </CardTitle>
            <CardDescription>
              Monitor keyword rankings across Google search results
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Add keywords to track their position in search results. Get notifications when rankings change.
            </p>
            <Link href="/dashboard/seo/keywords">
              <Button className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Keyword
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-yellow-500" />
              Keyword Research
            </CardTitle>
            <CardDescription>
              Discover new keyword opportunities with AI
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Generate keyword ideas based on your niche using AI-powered research tools.
            </p>
            <Link href="/dashboard/seo/research">
              <Button className="w-full" variant="outline">
                Start Research
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-green-500" />
              Analytics
            </CardTitle>
            <CardDescription>
              View Google Search Console data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Connect Google Search Console to view clicks, impressions, and CTR data.
            </p>
            <Link href="/dashboard/seo/analytics">
              <Button className="w-full" variant="outline">
                View Analytics
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* AI Tools Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-500" />
            AI Agent Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            SEO tools are available to all AI agents. You can use natural language to manage keywords:
          </p>
          <div className="space-y-2 mb-4">
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Tool</Badge>
              <div>
                <code className="text-xs bg-muted px-2 py-1 rounded">seo_track_keyword</code>
                <p className="text-xs text-muted-foreground mt-1">
                  "Track keyword 'best CRM software' for example.com"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Tool</Badge>
              <div>
                <code className="text-xs bg-muted px-2 py-1 rounded">seo_get_stats</code>
                <p className="text-xs text-muted-foreground mt-1">
                  "Show me SEO stats for example.com"
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline" className="mt-0.5">Tool</Badge>
              <div>
                <code className="text-xs bg-muted px-2 py-1 rounded">seo_research_keywords</code>
                <p className="text-xs text-muted-foreground mt-1">
                  "Generate keyword ideas for 'project management'"
                </p>
              </div>
            </div>
          </div>
          <Link href="/avatar-viewer">
            <Button variant="outline">
              Try in Chat
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}

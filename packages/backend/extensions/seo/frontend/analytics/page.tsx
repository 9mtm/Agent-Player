'use client';

import { config } from '@/lib/config';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  BarChart2,
  TrendingUp,
  MousePointer,
  Eye,
  Link as LinkIcon,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function Analytics() {
  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <BarChart2 className="h-8 w-8 text-green-500" />
          Google Search Console Analytics
        </h1>
        <p className="text-muted-foreground mt-1">
          View clicks, impressions, CTR, and position data from Google
        </p>
      </div>

      {/* Setup Required Card */}
      <Card className="border-blue-500/50 bg-blue-500/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
            <AlertCircle className="h-5 w-5" />
            Google Search Console Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            To view Search Console analytics, you need to connect your Google account.
          </p>

          <div className="space-y-2">
            <h4 className="font-medium text-sm">Setup Steps:</h4>
            <ol className="text-sm text-muted-foreground space-y-2 list-decimal list-inside">
              <li>Add Google OAuth credentials to backend <code className="bg-muted px-1 py-0.5 rounded">.env</code> file:
                <div className="ml-6 mt-1 bg-muted p-2 rounded text-xs font-mono">
                  GOOGLE_CLIENT_ID=your_client_id<br/>
                  GOOGLE_CLIENT_SECRET=your_client_secret<br/>
                  BACKEND_URL=${config.backendUrl}
                </div>
              </li>
              <li>Go to Settings and click "Connect Google Search Console"</li>
              <li>Authorize access to your Search Console data</li>
              <li>Come back here to view analytics</li>
            </ol>
          </div>

          <div className="flex gap-2">
            <Link href="/dashboard/seo/settings">
              <Button size="sm">
                Go to Settings
              </Button>
            </Link>
            <Link href="https://console.cloud.google.com" target="_blank">
              <Button size="sm" variant="outline">
                <LinkIcon className="h-4 w-4 mr-2" />
                Get OAuth Credentials
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Preview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Clicks</CardTitle>
            <MousePointer className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 28 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Impressions</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Last 28 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">CTR</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Click-through rate
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Avg Position</CardTitle>
            <BarChart2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">-</div>
            <p className="text-xs text-muted-foreground mt-1">
              Average rank
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Feature Info */}
      <Card>
        <CardHeader>
          <CardTitle>What You'll See Here</CardTitle>
          <CardDescription>
            Once connected, this page will display:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-2">
              <Badge variant="outline">Feature</Badge>
              <div>
                <h4 className="font-medium text-sm">Performance Overview</h4>
                <p className="text-xs text-muted-foreground">
                  Total clicks, impressions, average CTR, and position for all your pages
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Feature</Badge>
              <div>
                <h4 className="font-medium text-sm">Top Queries</h4>
                <p className="text-xs text-muted-foreground">
                  Keywords that bring the most traffic to your site
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Feature</Badge>
              <div>
                <h4 className="font-medium text-sm">Top Pages</h4>
                <p className="text-xs text-muted-foreground">
                  Your best performing pages by clicks and impressions
                </p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Badge variant="outline">Feature</Badge>
              <div>
                <h4 className="font-medium text-sm">Trend Charts</h4>
                <p className="text-xs text-muted-foreground">
                  Visual graphs showing performance over time
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

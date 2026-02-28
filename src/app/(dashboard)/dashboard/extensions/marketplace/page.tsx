'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Download,
  Search,
  Star,
  Shield,
  TrendingUp,
  Filter,
  Loader2,
  Check,
  ExternalLink,
  Package,
} from 'lucide-react';
import { config } from '@/lib/config';
import { toast } from 'sonner';
import { PermissionsBadge } from '@/components/extensions/PermissionsBadge';

const API_URL = config.backendUrl;

interface MarketplaceExtension {
  id: string;
  name: string;
  description?: string;
  author: string;
  version: string;
  type: 'app' | 'channel' | 'tool' | 'integration';
  category?: string;
  tags?: string[];
  icon_url?: string;
  permissions?: string[];
  install_count: number;
  rating_avg: number;
  rating_count: number;
  featured: boolean;
  verified: boolean;
  homepage_url?: string;
  repository_url?: string;
  installed?: boolean;
  installed_version?: string;
}

export default function ExtensionMarketplacePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [extensions, setExtensions] = useState<MarketplaceExtension[]>([]);
  const [total, setTotal] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showFeaturedOnly, setShowFeaturedOnly] = useState(false);
  const [showVerifiedOnly, setShowVerifiedOnly] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);

  useEffect(() => {
    loadExtensions();
  }, [searchQuery, filterType, showFeaturedOnly, showVerifiedOnly]);

  const loadExtensions = async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams();
      if (searchQuery) params.append('q', searchQuery);
      if (filterType !== 'all') params.append('type', filterType);
      if (showFeaturedOnly) params.append('featured', 'true');
      if (showVerifiedOnly) params.append('verified', 'true');
      params.append('limit', '50');

      const res = await fetch(`${API_URL}/api/marketplace/search?${params.toString()}`);
      const data = await res.json();

      if (data.success) {
        setExtensions(data.extensions || []);
        setTotal(data.total || 0);
      } else {
        toast.error(data.error || 'Failed to load marketplace');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleInstall = async (extensionId: string) => {
    try {
      setInstalling(extensionId);

      const res = await fetch(`${API_URL}/api/marketplace/install`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ extension_id: extensionId }),
      });

      const data = await res.json();

      if (data.success) {
        toast.success('Extension installed successfully! Restart backend to activate.');
        loadExtensions(); // Refresh list
      } else {
        toast.error(data.error || 'Failed to install extension');
      }
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setInstalling(null);
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'app':
        return 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100';
      case 'channel':
        return 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-100';
      case 'tool':
        return 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100';
      case 'integration':
        return 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100';
      default:
        return 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-100';
    }
  };

  return (
    <div className="container py-6 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8" />
          Extension Marketplace
        </h1>
        <p className="text-muted-foreground mt-1">
          Discover and install extensions to enhance your agent's capabilities
        </p>
      </div>

      {/* Search & Filters */}
      <div className="mb-6 space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search extensions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline" onClick={loadExtensions}>
            <Filter className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="flex gap-2 flex-wrap">
          <Button
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
          >
            All
          </Button>
          <Button
            variant={filterType === 'app' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('app')}
          >
            Apps
          </Button>
          <Button
            variant={filterType === 'channel' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('channel')}
          >
            Channels
          </Button>
          <Button
            variant={filterType === 'tool' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('tool')}
          >
            Tools
          </Button>
          <Button
            variant={filterType === 'integration' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('integration')}
          >
            Integrations
          </Button>

          <div className="border-l mx-2" />

          <Button
            variant={showFeaturedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowFeaturedOnly(!showFeaturedOnly)}
          >
            <Star className="h-3 w-3 mr-1" />
            Featured
          </Button>
          <Button
            variant={showVerifiedOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowVerifiedOnly(!showVerifiedOnly)}
          >
            <Shield className="h-3 w-3 mr-1" />
            Verified
          </Button>
        </div>
      </div>

      {/* Results Count */}
      <div className="mb-4 text-sm text-muted-foreground">
        {total} {total === 1 ? 'extension' : 'extensions'} found
      </div>

      {/* Extensions Grid */}
      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      ) : extensions.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No extensions found.</p>
              <p className="text-sm mt-2">Try adjusting your search or filters.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {extensions.map((ext) => (
            <Card key={ext.id} className="flex flex-col">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {ext.name}
                      {ext.verified && (
                        <Shield className="h-4 w-4 text-blue-500" title="Verified" />
                      )}
                      {ext.featured && (
                        <Star className="h-4 w-4 text-yellow-500" title="Featured" />
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs mt-1">
                      by {ext.author}
                    </CardDescription>
                  </div>
                  <Badge className={getTypeColor(ext.type)}>{ext.type}</Badge>
                </div>

                {ext.description && (
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                    {ext.description}
                  </p>
                )}
              </CardHeader>

              <CardContent className="flex-1">
                <div className="space-y-3">
                  {/* Stats */}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Download className="h-3 w-3" />
                      {ext.install_count.toLocaleString()}
                    </div>
                    {ext.rating_count > 0 && (
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-500 text-yellow-500" />
                        {ext.rating_avg.toFixed(1)} ({ext.rating_count})
                      </div>
                    )}
                  </div>

                  {/* Tags */}
                  {ext.tags && ext.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {ext.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {/* Permissions */}
                  {ext.permissions && ext.permissions.length > 0 && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">Permissions:</p>
                      <PermissionsBadge permissions={ext.permissions as any} compact={true} />
                    </div>
                  )}
                </div>
              </CardContent>

              <CardFooter className="flex gap-2">
                {ext.installed ? (
                  <Button variant="outline" className="flex-1" disabled>
                    <Check className="h-4 w-4 mr-2" />
                    Installed (v{ext.installed_version})
                  </Button>
                ) : (
                  <Button
                    className="flex-1"
                    onClick={() => handleInstall(ext.id)}
                    disabled={installing === ext.id}
                  >
                    {installing === ext.id ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Installing...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Install
                      </>
                    )}
                  </Button>
                )}

                {ext.homepage_url && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => window.open(ext.homepage_url, '_blank')}
                    title="View Homepage"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

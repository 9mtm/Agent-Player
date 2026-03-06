'use client';

import { useState, useEffect } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorDisplay } from '../common/ErrorDisplay';

interface Release {
  title: string;
  description: string;
  type: string;
  source: string;
  pubDate: string;
  link?: string;
}

interface UpdatesData {
  total: number;
  releases: Release[];
}

const RELEASE_TYPE_COLORS: Record<string, string> = {
  'cpanel-release': '#1e88e5',
  'cpanel-update': '#43a047',
  'cpanel-security': '#e53935',
  'security-news': '#ff6f00',
  'wordpress-sec': '#21759b',
  cisa: '#d32f2f',
  other: '#9e9e9e',
};

const RELEASE_TYPE_LABELS: Record<string, string> = {
  'cpanel-release': 'cPanel Release',
  'cpanel-update': 'Update',
  'cpanel-security': 'Security',
  'security-news': 'Security News',
  'wordpress-sec': 'WordPress',
  cisa: 'CISA Advisory',
  other: 'Other',
};

const SOURCE_LABELS: Record<string, string> = {
  cpanel: 'cPanel',
  hackernews: 'The Hacker News',
  wordfence: 'Wordfence',
  cisa: 'CISA',
};

export function UpdatesTab() {
  const [data, setData] = useState<UpdatesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadUpdates();
  }, []);

  const loadUpdates = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/ext/server-monitor/updates/releases');
      if (!response.ok) throw new Error('Failed to load updates');
      const updatesData = await response.json();
      setData(updatesData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load updates');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={loadUpdates} />;
  if (!data) return null;

  // Get unique types
  const types = ['all', ...Array.from(new Set(data.releases.map((r) => r.type)))];

  // Filter releases
  let filtered = data.releases;
  if (activeFilter !== 'all') {
    filtered = filtered.filter((r) => r.type === activeFilter);
  }

  // Apply search
  if (searchQuery.length >= 2) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (r) =>
        r.title.toLowerCase().includes(query) || r.description.toLowerCase().includes(query)
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Security Updates & Releases</h3>
          <p className="text-sm text-muted-foreground">{data.total} total releases</p>
        </div>
        <Button onClick={loadUpdates} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="space-y-3">
        <Input
          placeholder="Search releases..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="max-w-md"
        />

        <div className="flex flex-wrap gap-2">
          {types.map((type) => {
            const count =
              type === 'all' ? data.total : data.releases.filter((r) => r.type === type).length;
            const color = RELEASE_TYPE_COLORS[type] || RELEASE_TYPE_COLORS.other;

            return (
              <button
                key={type}
                onClick={() => setActiveFilter(type)}
                className={`px-3 py-1.5 text-sm rounded transition-colors ${
                  activeFilter === type ? 'ring-2' : 'hover:bg-muted'
                }`}
                style={
                  activeFilter === type
                    ? {
                        background: `${color}20`,
                        color: color,
                        borderColor: `${color}40`,
                      }
                    : {}
                }
              >
                {RELEASE_TYPE_LABELS[type] || 'Other'}{' '}
                <span
                  className={`ml-1 px-1.5 py-0.5 text-xs rounded ${
                    activeFilter === type ? 'bg-background/50' : 'bg-muted'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Release List */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>No releases found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((release, idx) => {
            const color = RELEASE_TYPE_COLORS[release.type] || RELEASE_TYPE_COLORS.other;
            const typeLabel = RELEASE_TYPE_LABELS[release.type] || 'Other';
            const descPreview =
              release.description.length > 200
                ? release.description.substring(0, 200) + '...'
                : release.description;
            const srcLabel = SOURCE_LABELS[release.source] || release.source || '';
            const dateStr = release.pubDate
              ? new Date(release.pubDate).toLocaleDateString()
              : '';

            return (
              <div key={idx} className="bg-card border rounded-lg p-4 hover:border-primary/50 transition-colors">
                <div className="flex items-start justify-between gap-3 mb-2">
                  <span
                    className="px-2 py-1 text-xs rounded border"
                    style={{
                      background: `${color}20`,
                      color: color,
                      borderColor: `${color}40`,
                    }}
                  >
                    {typeLabel}
                  </span>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {srcLabel && <span>{srcLabel}</span>}
                    {dateStr && <span>{dateStr}</span>}
                  </div>
                </div>

                <h4 className="font-semibold mb-2">{release.title}</h4>
                <p className="text-sm text-muted-foreground mb-3">{descPreview}</p>

                {release.link && (
                  <a
                    href={release.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                  >
                    Read More
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

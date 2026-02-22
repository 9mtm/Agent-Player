'use client';

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  HardDrive, Search, Trash2, Download, Image as ImageIcon,
  FileText, Volume2, Film, Box, Database, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';

interface StorageFile {
  id: string;
  zone: 'cache' | 'cdn';
  category: string;
  filename: string;
  originalName?: string;
  mimeType?: string;
  sizeBytes: number;
  description?: string;
  tags: string[];
  ttl: string;
  expiresAt?: string;
  sourceUrl?: string;
  createdBy: string;
  createdAt: string;
}

interface StorageStats {
  totalFiles: number;
  totalBytes: number;
  byZone: Record<string, number>;
  byCategory: Record<string, number>;
}

const CATEGORY_ICONS: Record<string, React.ElementType> = {
  audio: Volume2,
  screenshots: ImageIcon,
  web: FileText,
  avatars: Box,
  images: ImageIcon,
  files: FileText,
  data: Database,
  video: Film,
};

const ZONE_COLORS = {
  cache: 'bg-orange-100 text-orange-700',
  cdn: 'bg-blue-100 text-blue-700',
};

const TTL_COLORS: Record<string, string> = {
  session: 'bg-red-100 text-red-600',
  '24h': 'bg-orange-100 text-orange-600',
  '7d': 'bg-yellow-100 text-yellow-700',
  persistent: 'bg-green-100 text-green-700',
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function StoragePage() {
  const [files, setFiles] = useState<StorageFile[]>([]);
  const [stats, setStats] = useState<StorageStats | null>(null);
  const [zone, setZone] = useState<'all' | 'cache' | 'cdn'>('all');
  const [category, setCategory] = useState<string>('');
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [cleaningUp, setCleaningUp] = useState(false);

  const fetchData = useCallback(async () => {
    const params = new URLSearchParams({ limit: '100' });
    if (zone !== 'all') params.set('zone', zone);
    if (category) params.set('category', category);
    if (query) params.set('q', query);

    const [filesRes, statsRes] = await Promise.all([
      fetch(`${config.backendUrl}/api/storage?${params}`),
      fetch(`${config.backendUrl}/api/storage/stats`),
    ]);

    if (filesRes.ok) {
      const data = await filesRes.json();
      setFiles(data.files ?? []);
    }
    if (statsRes.ok) {
      setStats(await statsRes.json());
    }
    setLoading(false);
  }, [zone, category, query]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this file?')) return;
    const res = await fetch(`${config.backendUrl}/api/storage/${id}`, { method: 'DELETE' });
    if (res.ok) fetchData();
  };

  const handleCleanup = async () => {
    setCleaningUp(true);
    const res = await fetch(`${config.backendUrl}/api/storage/cleanup`, { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      toast.success(`Cleaned ${data.deleted} expired files (${formatBytes(data.freedBytes)} freed)`);
      fetchData();
    }
    setCleaningUp(false);
  };

  const categories = stats ? Object.keys(stats.byCategory) : [];

  const getFileIcon = (file: StorageFile) => {
    const Icon = CATEGORY_ICONS[file.category] ?? FileText;
    return <Icon className="w-4 h-4 shrink-0" />;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <HardDrive className="w-6 h-6" /> Local Storage
          </h1>
          {stats && (
            <p className="text-sm text-muted-foreground mt-1">
              {stats.totalFiles} files · {formatBytes(stats.totalBytes)} total
              {stats.byZone.cache ? ` · Cache: ${stats.byZone.cache}` : ''}
              {stats.byZone.cdn ? ` · CDN: ${stats.byZone.cdn}` : ''}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fetchData}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
          <Button variant="outline" size="sm" onClick={handleCleanup} disabled={cleaningUp}>
            {cleaningUp ? 'Cleaning...' : 'Clean Cache'}
          </Button>
        </div>
      </div>

      <div className="flex gap-6">
        {/* Sidebar — categories */}
        <div className="w-48 shrink-0 space-y-1">
          {/* Zone filter */}
          <div className="mb-3">
            <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Zone</p>
            {(['all', 'cache', 'cdn'] as const).map(z => (
              <button
                key={z}
                onClick={() => { setZone(z); setCategory(''); }}
                className={`w-full text-left text-sm px-3 py-1.5 rounded-md transition-colors ${
                  zone === z && !category
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
              >
                {z === 'all' ? 'All Files' : z.charAt(0).toUpperCase() + z.slice(1)}
                {stats && z !== 'all' && (
                  <span className="ml-1 text-xs opacity-60">({stats.byZone[z] ?? 0})</span>
                )}
              </button>
            ))}
          </div>

          {/* Category filter */}
          {categories.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Category</p>
              {categories.map(cat => {
                const Icon = CATEGORY_ICONS[cat] ?? FileText;
                return (
                  <button
                    key={cat}
                    onClick={() => { setCategory(cat); setZone('all'); }}
                    className={`w-full text-left text-sm px-3 py-1.5 rounded-md flex items-center gap-2 transition-colors ${
                      category === cat
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {cat}
                    <span className="ml-auto text-xs opacity-60">{stats?.byCategory[cat] ?? 0}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Main content */}
        <div className="flex-1 space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-2.5 w-4 h-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by filename or description..."
              className="pl-9"
            />
          </div>

          {/* Files list */}
          {loading ? (
            <p className="text-sm text-muted-foreground text-center py-12">Loading...</p>
          ) : files.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <HardDrive className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p className="text-sm">No files yet.</p>
              <p className="text-xs mt-1">Files saved by agents will appear here.</p>
            </div>
          ) : (
            <Card>
              <CardContent className="p-0">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">File</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Zone/Category</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Size</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">TTL</th>
                      <th className="text-left px-4 py-2 font-medium text-muted-foreground">Added</th>
                      <th className="px-4 py-2" />
                    </tr>
                  </thead>
                  <tbody>
                    {files.map(file => (
                      <tr key={file.id} className="border-b last:border-0 hover:bg-muted/30">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            {getFileIcon(file)}
                            <div className="min-w-0">
                              <p className="font-mono text-xs truncate max-w-[200px]" title={file.filename}>
                                {file.originalName ?? file.filename}
                              </p>
                              {file.description && (
                                <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                                  {file.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex flex-col gap-1">
                            <Badge className={`text-[10px] py-0 px-1.5 w-fit ${ZONE_COLORS[file.zone]}`}>
                              {file.zone}
                            </Badge>
                            <span className="text-xs text-muted-foreground">{file.category}</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {formatBytes(file.sizeBytes)}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge className={`text-[10px] py-0 px-1.5 ${TTL_COLORS[file.ttl] ?? 'bg-slate-100 text-slate-600'}`}>
                            {file.ttl}
                          </Badge>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-muted-foreground">
                          {timeAgo(file.createdAt)}
                        </td>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-1">
                            <a
                              href={`${config.backendUrl}/api/storage/${file.id}`}
                              target="_blank"
                              rel="noreferrer"
                              className="p-1 hover:bg-muted rounded"
                              title="Open/Download"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </a>
                            <button
                              onClick={() => handleDelete(file.id)}
                              className="p-1 hover:bg-destructive/10 hover:text-destructive rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

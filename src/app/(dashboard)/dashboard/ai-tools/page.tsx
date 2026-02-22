'use client';

import { useState, useEffect, useCallback } from 'react';
import { config } from '@/lib/config';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, CheckCircle2, XCircle, Download, Copy, ExternalLink, Loader2 } from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface DetectedTool {
  id: string;
  name: string;
  icon: string;
  description: string;
  detected: boolean;
  detectedPath: string | null;
  meta: Record<string, any>;
  installCmd: string | null;
  installType: 'npm' | 'pip' | 'manual' | null;
}

interface ScanResult {
  tools: DetectedTool[];
  detectedCount: number;
  totalCount: number;
  platform: string;
  homeDir: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

// ─── Meta renderer ────────────────────────────────────────────────────────────

function MetaList({ meta }: { meta: Record<string, any> }) {
  const entries = Object.entries(meta).filter(([, v]) => v !== undefined && v !== null);
  if (entries.length === 0) return null;

  return (
    <ul className="mt-2 space-y-1">
      {entries.map(([key, value]) => {
        const label = key
          .replace(/([A-Z])/g, ' $1')
          .replace(/^./, (c) => c.toUpperCase());

        // Models get a special pill display
        if (key === 'models' && Array.isArray(value)) {
          return (
            <li key={key} className="mt-1">
              <span className="text-xs font-medium text-foreground/70">Local Models:</span>
              <div className="mt-1 flex flex-wrap gap-1">
                {(value as string[]).map((m) => (
                  <span key={m} className="rounded bg-primary/10 px-1.5 py-0.5 font-mono text-xs text-primary">
                    {m}
                  </span>
                ))}
              </div>
            </li>
          );
        }

        const display = Array.isArray(value)
          ? value.join(', ')
          : typeof value === 'boolean'
          ? value ? 'Yes' : 'No'
          : typeof value === 'number'
          ? value.toLocaleString()
          : String(value);

        return (
          <li key={key} className="flex items-start gap-1 text-xs text-muted-foreground">
            <span className="shrink-0 font-medium text-foreground/70">{label}:</span>
            <span className="break-all">{display}</span>
          </li>
        );
      })}
    </ul>
  );
}

// ─── Install Section ──────────────────────────────────────────────────────────

function InstallSection({ tool, onInstalled }: { tool: DetectedTool; onInstalled: () => void }) {
  const [installing, setInstalling] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(null);

  if (!tool.installCmd) return null;

  const isManual = tool.installType === 'manual';
  const isLink = tool.installCmd.startsWith('http');
  const isVsExt = tool.installCmd.startsWith('VS Code extension');

  async function runInstall() {
    setInstalling(true);
    setResult(null);
    try {
      const res = await fetch(`${config.backendUrl}/api/ai-tools/${tool.id}/install`, { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setResult({ ok: true, msg: 'Installed! Refresh to detect.' });
        onInstalled();
      } else {
        setResult({ ok: false, msg: data.error ?? 'Install failed' });
      }
    } catch (err: any) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="mt-3 border-t pt-3 space-y-2">
      {isLink ? (
        <a
          href={tool.installCmd}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-1 text-xs text-primary hover:underline"
        >
          <ExternalLink className="w-3 h-3" />
          Download / Install
        </a>
      ) : isVsExt ? (
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{tool.installCmd}</span>
          <Button size="sm" variant="outline" className="h-6 text-xs px-2" onClick={() => copyToClipboard(tool.installCmd!)}>
            <Copy className="w-3 h-3 mr-1" /> Copy
          </Button>
        </div>
      ) : (
        <div className="flex items-center gap-2 flex-wrap">
          <code className="text-xs bg-muted rounded px-1.5 py-0.5">{tool.installCmd}</code>
          <Button
            size="sm"
            variant="outline"
            className="h-6 text-xs px-2"
            onClick={() => copyToClipboard(tool.installCmd!)}
          >
            <Copy className="w-3 h-3" />
          </Button>
          <Button
            size="sm"
            className="h-6 text-xs px-2"
            disabled={installing}
            onClick={runInstall}
          >
            {installing ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Download className="w-3 h-3 mr-1" />}
            {installing ? 'Installing…' : 'Install'}
          </Button>
        </div>
      )}
      {result && (
        <p className={`text-xs ${result.ok ? 'text-green-600' : 'text-destructive'}`}>{result.msg}</p>
      )}
    </div>
  );
}

// ─── Tool Card ────────────────────────────────────────────────────────────────

function ToolCard({ tool, onInstalled }: { tool: DetectedTool; onInstalled: () => void }) {
  return (
    <Card className={tool.detected ? 'border-primary/40' : 'opacity-75'}>
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between text-base">
          <div className="flex items-center gap-2">
            <span className="text-xl">{tool.icon}</span>
            <span>{tool.name}</span>
          </div>
          {tool.detected ? (
            <Badge variant="default" className="gap-1 text-xs">
              <CheckCircle2 className="w-3 h-3" />
              Detected
            </Badge>
          ) : (
            <Badge variant="secondary" className="gap-1 text-xs text-muted-foreground">
              <XCircle className="w-3 h-3" />
              Not found
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-muted-foreground">{tool.description}</p>
        {tool.detected && tool.detectedPath && (
          <p className="mt-1 truncate font-mono text-xs text-primary/70" title={tool.detectedPath}>
            {tool.detectedPath}
          </p>
        )}
        {tool.detected && <MetaList meta={tool.meta} />}
        {!tool.detected && <InstallSection tool={tool} onInstalled={onInstalled} />}
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AiToolsPage() {
  const [result, setResult] = useState<ScanResult | null>(null);
  const [loading, setLoading] = useState(true);

  const scan = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`${config.backendUrl}/api/ai-tools`);
    const data = await res.json();
    setResult(data);
    setLoading(false);
  }, []);

  useEffect(() => { scan(); }, [scan]);

  return (
    <div className="flex flex-col gap-4 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">AI Tools</h1>
          <p className="text-sm text-muted-foreground">
            {loading
              ? 'Scanning…'
              : result
              ? `${result.detectedCount} of ${result.totalCount} detected · ${result.platform} · ${result.homeDir}`
              : 'Scan for installed AI tools'}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={scan} disabled={loading}>
          <RefreshCw className={`w-4 h-4 mr-1 ${loading ? 'animate-spin' : ''}`} />
          Scan
        </Button>
      </div>

      {/* Installed tools */}
      {result && result.detectedCount > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Installed ({result.detectedCount})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.tools.filter((t) => t.detected).map((t) => (
              <ToolCard key={t.id} tool={t} onInstalled={scan} />
            ))}
          </div>
        </section>
      )}

      {/* Not installed tools */}
      {result && result.totalCount - result.detectedCount > 0 && (
        <section>
          <h2 className="mb-2 text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Not Installed ({result.totalCount - result.detectedCount})
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {result.tools.filter((t) => !t.detected).map((t) => (
              <ToolCard key={t.id} tool={t} onInstalled={scan} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

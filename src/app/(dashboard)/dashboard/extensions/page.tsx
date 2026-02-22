'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Loader2, Package, Shield, AlertCircle, CheckCircle2, RefreshCw, Trash2, Database, Settings, Clock, Code, Route, Info } from 'lucide-react';
import { config } from '@/lib/config';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ExtensionSettingsForm } from '@/components/extensions/ExtensionSettingsForm';

const API_URL = config.backendUrl;

interface Extension {
  id: string;
  name: string;
  description: string;
  version: string;
  type: string;
  author: string;
  enabled: boolean;
  installedAt: string | null;
  permissions: string[];
  settingsUI?: any; // ui-web4 spec
}

interface ExtensionCapabilities {
  hasDatabase: boolean;
  hasCron: boolean;
  hasTools: boolean;
  hasRoutes: boolean;
}

export default function ExtensionsPage() {
  const [extensions, setExtensions] = useState<Extension[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restartRequired, setRestartRequired] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [extensionToDelete, setExtensionToDelete] = useState<Extension | null>(null);
  const [inspectDialogOpen, setInspectDialogOpen] = useState(false);
  const [extensionToInspect, setExtensionToInspect] = useState<Extension | null>(null);
  const [inspectData, setInspectData] = useState<any>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [extensionToPreview, setExtensionToPreview] = useState<Extension | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [extensionToSettings, setExtensionToSettings] = useState<Extension | null>(null);

  const fetchExtensions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/api/extensions`);
      const data = await res.json();

      if (data.success) {
        setExtensions(data.extensions);
      } else {
        setError(data.error || 'Failed to load extensions');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchExtensions();
  }, []);

  const toggleExtension = async (id: string, currentlyEnabled: boolean) => {
    try {
      const endpoint = currentlyEnabled ? 'disable' : 'enable';
      const res = await fetch(`${API_URL}/api/extensions/${id}/${endpoint}`, {
        method: 'POST',
      });

      const data = await res.json();

      if (data.success) {
        setExtensions((prev) =>
          prev.map((ext) =>
            ext.id === id ? { ...ext, enabled: !currentlyEnabled } : ext
          )
        );

        if (data.restartRequired) {
          setRestartRequired(true);
        }
      } else {
        setError(data.error || 'Failed to toggle extension');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const confirmDelete = (ext: Extension) => {
    setExtensionToDelete(ext);
    setDeleteDialogOpen(true);
  };

  const deleteExtension = async () => {
    if (!extensionToDelete) return;

    try {
      const res = await fetch(`${API_URL}/api/extensions/${extensionToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await res.json();

      if (data.success) {
        setExtensions((prev) => prev.filter((ext) => ext.id !== extensionToDelete.id));
        setDeleteDialogOpen(false);
        setExtensionToDelete(null);
      } else {
        setError(data.error || 'Failed to delete extension');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const restartBackend = async () => {
    try {
      await fetch(`${API_URL}/api/system/restart`, { method: 'POST' });
      setRestartRequired(false);
      toast.info('Backend restarting... Refresh page in 5 seconds.');
    } catch (err: any) {
      setError('Failed to restart backend: ' + err.message);
    }
  };

  const inspectExtension = async (ext: Extension) => {
    try {
      setExtensionToInspect(ext);
      const res = await fetch(`${API_URL}/api/extensions/${ext.id}/inspect`);
      const data = await res.json();

      if (data.success) {
        setInspectData(data.data);
        setInspectDialogOpen(true);
      } else {
        setError(data.error || 'Failed to inspect extension');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const previewExtension = (ext: Extension) => {
    setExtensionToPreview(ext);
    setPreviewDialogOpen(true);
  };

  const openSettings = (ext: Extension) => {
    setExtensionToSettings(ext);
    setSettingsDialogOpen(true);
  };

  const detectCapabilities = (ext: Extension): ExtensionCapabilities => {
    return {
      hasDatabase: ext.type === 'tool' || ext.type === 'integration',
      hasCron: ext.type === 'integration' || ext.permissions.includes('scheduler'),
      hasTools: ext.type === 'tool' || ext.permissions.includes('tools'),
      hasRoutes: true, // All extensions can register routes
    };
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Extensions</h1>
          <p className="text-muted-foreground mt-2">
            Manage installed extensions. Add new tools, routes, and features.
          </p>
        </div>
        <Button onClick={fetchExtensions} variant="outline" size="sm">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      {restartRequired && (
        <Alert className="border-amber-500 bg-amber-500/10">
          <AlertCircle className="h-4 w-4 text-amber-500" />
          <AlertDescription className="flex items-center justify-between text-amber-600 dark:text-amber-400">
            <span>
              <strong>Restart Required:</strong> Backend restart needed for routes to load.
            </span>
            <Button
              onClick={restartBackend}
              size="sm"
              variant="outline"
              className="ml-4 border-amber-500 text-amber-600 hover:bg-amber-500/20"
            >
              <RefreshCw className="mr-2 h-3 w-3" />
              Restart Backend
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{extensions.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enabled</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600 dark:text-green-400">
              {extensions.filter((e) => e.enabled).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Disabled</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground">
              {extensions.filter((e) => !e.enabled).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6">
        {extensions.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No extensions found.</p>
            </CardContent>
          </Card>
        ) : (
          extensions.map((ext) => {
            const capabilities = detectCapabilities(ext);
            return (
              <Card key={ext.id} className={ext.enabled ? 'border-primary' : ''}>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 flex-wrap">
                        <CardTitle className="text-xl">{ext.name}</CardTitle>
                        {ext.enabled ? (
                          <Badge className="bg-green-500 hover:bg-green-600">Enabled</Badge>
                        ) : (
                          <Badge variant="secondary">Disabled</Badge>
                        )}
                        <Badge variant="outline">{ext.type}</Badge>

                        {/* Capability Badges */}
                        {capabilities.hasDatabase && (
                          <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
                            <Database className="h-3 w-3" />
                            Database
                          </Badge>
                        )}
                        {capabilities.hasCron && (
                          <Badge variant="outline" className="gap-1 text-purple-600 border-purple-300">
                            <Clock className="h-3 w-3" />
                            Cron
                          </Badge>
                        )}
                        {capabilities.hasTools && (
                          <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                            <Code className="h-3 w-3" />
                            Tools
                          </Badge>
                        )}
                        {capabilities.hasRoutes && (
                          <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                            <Route className="h-3 w-3" />
                            API
                          </Badge>
                        )}
                      </div>
                      <CardDescription className="mt-2">{ext.description}</CardDescription>
                      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                        <span>v{ext.version}</span>
                        <span>•</span>
                        <span>{ext.author}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => previewExtension(ext)}
                        title="Preview Details"
                      >
                        <Info className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openSettings(ext)}
                        title="Extension Settings"
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                      {ext.enabled && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => inspectExtension(ext)}
                          title="Inspect Data"
                        >
                          <Database className="h-4 w-4" />
                        </Button>
                      )}
                      <Switch
                        checked={ext.enabled}
                        onCheckedChange={() => toggleExtension(ext.id, ext.enabled)}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => confirmDelete(ext)}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10"
                        title="Delete Extension"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
              <CardContent>
                {ext.permissions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Shield className="h-4 w-4 text-muted-foreground mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium mb-1">Permissions:</p>
                      <div className="flex flex-wrap gap-2">
                        {ext.permissions.map((perm) => (
                          <Badge key={perm} variant="outline" className="text-xs">
                            {perm}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
          })
        )}
      </div>

      {/* Preview Extension Dialog */}
      <AlertDialog open={previewDialogOpen} onOpenChange={setPreviewDialogOpen}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Info className="h-5 w-5" />
              {extensionToPreview?.name}
            </AlertDialogTitle>
          </AlertDialogHeader>

          {extensionToPreview && (
            <div className="space-y-4">
              {/* Basic Info */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge variant={extensionToPreview.enabled ? "default" : "secondary"}>
                    {extensionToPreview.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                  <Badge variant="outline">{extensionToPreview.type}</Badge>
                </div>
                <p className="text-sm text-muted-foreground">{extensionToPreview.description}</p>
              </div>

              {/* Version & Author */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="font-semibold mb-1">Version</p>
                  <p className="text-muted-foreground">v{extensionToPreview.version}</p>
                </div>
                <div>
                  <p className="font-semibold mb-1">Author</p>
                  <p className="text-muted-foreground">{extensionToPreview.author}</p>
                </div>
              </div>

              {/* Capabilities */}
              <div>
                <p className="font-semibold mb-2 text-sm">Capabilities</p>
                <div className="flex flex-wrap gap-2">
                  {detectCapabilities(extensionToPreview).hasDatabase && (
                    <Badge variant="outline" className="gap-1 text-blue-600 border-blue-300">
                      <Database className="h-3 w-3" />
                      Database Migrations
                    </Badge>
                  )}
                  {detectCapabilities(extensionToPreview).hasCron && (
                    <Badge variant="outline" className="gap-1 text-purple-600 border-purple-300">
                      <Clock className="h-3 w-3" />
                      Scheduled Tasks
                    </Badge>
                  )}
                  {detectCapabilities(extensionToPreview).hasTools && (
                    <Badge variant="outline" className="gap-1 text-orange-600 border-orange-300">
                      <Code className="h-3 w-3" />
                      AI Agent Tools
                    </Badge>
                  )}
                  {detectCapabilities(extensionToPreview).hasRoutes && (
                    <Badge variant="outline" className="gap-1 text-green-600 border-green-300">
                      <Route className="h-3 w-3" />
                      API Routes
                    </Badge>
                  )}
                </div>
              </div>

              {/* Permissions */}
              {extensionToPreview.permissions.length > 0 && (
                <div>
                  <p className="font-semibold mb-2 text-sm flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Required Permissions
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {extensionToPreview.permissions.map((perm) => (
                      <Badge key={perm} variant="outline" className="text-xs">
                        {perm}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Installation Status */}
              {extensionToPreview.installedAt && (
                <div className="text-xs text-muted-foreground">
                  Installed: {new Date(extensionToPreview.installedAt).toLocaleString()}
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
            {extensionToPreview && !extensionToPreview.enabled && (
              <Button
                onClick={() => {
                  setPreviewDialogOpen(false);
                  toggleExtension(extensionToPreview.id, false);
                }}
                className="bg-primary"
              >
                Enable Extension
              </Button>
            )}
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Inspect Extension Dialog */}
      <AlertDialog open={inspectDialogOpen} onOpenChange={setInspectDialogOpen}>
        <AlertDialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Extension Inspector: {extensionToInspect?.name}
            </AlertDialogTitle>
          </AlertDialogHeader>

          {inspectData && (
            <div className="space-y-4">
              {/* Database Tables */}
              {inspectData.tables && inspectData.tables.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <Database className="h-4 w-4" />
                    Database Tables ({inspectData.tables.length})
                  </h4>
                  <div className="space-y-2">
                    {inspectData.tables.map((table: any) => (
                      <Card key={table.name}>
                        <CardContent className="pt-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-mono text-sm font-semibold">{table.name}</p>
                              <p className="text-xs text-muted-foreground mt-1">{table.rows} rows</p>
                            </div>
                            <Badge variant="outline">{table.columns} columns</Badge>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {/* Migration History */}
              {inspectData.migrations && inspectData.migrations.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Migration History ({inspectData.migrations.length})</h4>
                  <div className="space-y-1">
                    {inspectData.migrations.map((mig: any, idx: number) => (
                      <div key={idx} className="text-sm flex items-center justify-between bg-muted p-2 rounded">
                        <span className="font-mono">{mig.filename}</span>
                        <span className="text-xs text-muted-foreground">{new Date(mig.ran_at).toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Registered Tools */}
              {inspectData.tools && inspectData.tools.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Registered Tools ({inspectData.tools.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {inspectData.tools.map((tool: string) => (
                      <Badge key={tool} variant="secondary" className="font-mono">{tool}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Registered Routes */}
              {inspectData.routes && inspectData.routes.length > 0 && (
                <div>
                  <h4 className="font-semibold mb-2">Registered Routes ({inspectData.routes.length})</h4>
                  <div className="space-y-1">
                    {inspectData.routes.map((route: string, idx: number) => (
                      <div key={idx} className="text-sm font-mono bg-muted p-2 rounded">{route}</div>
                    ))}
                  </div>
                </div>
              )}

              {/* Config */}
              {inspectData.config && (
                <div>
                  <h4 className="font-semibold mb-2">Configuration</h4>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                    {JSON.stringify(inspectData.config, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          )}

          <AlertDialogFooter>
            <AlertDialogCancel>Close</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{extensionToSettings?.name} - Settings</DialogTitle>
            <DialogDescription>
              Configure {extensionToSettings?.name} extension settings
            </DialogDescription>
          </DialogHeader>
          {extensionToSettings && (
            <ExtensionSettingsForm
              extensionId={extensionToSettings.id}
              uiSpec={extensionToSettings.settingsUI}
              onSave={() => {
                setSettingsDialogOpen(false);
                fetchExtensions();
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Extension?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{extensionToDelete?.name}</strong> and:
              <ul className="mt-2 list-disc list-inside space-y-1">
                <li>All extension files</li>
                <li>Database configuration and migrations</li>
                <li>Registered tools and routes</li>
                <li>Cron jobs (if any)</li>
              </ul>
              <p className="mt-3 font-semibold text-destructive">This action cannot be undone.</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteExtension}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete Extension
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

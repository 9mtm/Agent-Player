'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { config } from '@/lib/config';
import { UnifiedSettingsRenderer } from '@/components/extensions/UnifiedSettingsRenderer';

export default function ExtensionSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const extensionId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [extension, setExtension] = useState<any>(null);
  const [currentConfig, setCurrentConfig] = useState<any>({});

  useEffect(() => {
    loadExtensionData();
  }, [extensionId]);

  const loadExtensionData = async () => {
    try {
      // Fetch extension info (includes settingsUI from manifest)
      const extRes = await fetch(`${config.backendUrl}/api/extensions`);
      const extData = await extRes.json();
      const ext = extData.extensions.find((e: any) => e.id === extensionId);

      if (!ext) {
        router.push('/dashboard/extensions');
        return;
      }

      setExtension(ext);

      // Fetch current config
      const cfgRes = await fetch(`${config.backendUrl}/api/extensions/${extensionId}/config`);
      const cfgData = await cfgRes.json();
      setCurrentConfig(cfgData.config || {});
    } catch (error) {
      console.error('Failed to load extension settings:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!extension) {
    return (
      <div className="container py-6">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">Extension not found</p>
            <Button
              variant="outline"
              onClick={() => router.push('/dashboard/extensions')}
              className="mt-4"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Extensions
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container py-6 max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push('/dashboard/extensions')}
        className="mb-4"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Extensions
      </Button>

      <Card>
        <CardHeader>
          <CardTitle>{extension.name} Settings</CardTitle>
          <CardDescription>
            Configure {extension.name.toLowerCase()} behavior and credentials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <UnifiedSettingsRenderer
            extensionId={extensionId}
            manifest={{
              settings: extension.settings,
              settingsUI: extension.settingsUI,
            }}
            currentConfig={currentConfig}
            onSave={(newConfig) => {
              setCurrentConfig(newConfig);
              router.push('/dashboard/extensions');
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}

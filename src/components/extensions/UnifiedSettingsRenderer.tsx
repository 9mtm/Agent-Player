'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';
import { config } from '@/lib/config';

// ui-web4 spec renderer (for email-client style settings)
import { SpecRenderer } from '@/lib/json-render/renderer';

// Form schema renderer (for discord/slack style settingsUI)
import { FormSchemaRenderer } from './FormSchemaRenderer';

interface Props {
  extensionId: string;
  manifest: {
    settings?: any; // ui-web4 spec format
    settingsUI?: any; // form schema format
  };
  currentConfig?: Record<string, any>;
  onSave?: (config: Record<string, any>) => void;
}

export function UnifiedSettingsRenderer({
  extensionId,
  manifest,
  currentConfig = {},
  onSave
}: Props) {
  const [configData, setConfigData] = useState<Record<string, any>>(currentConfig);
  const [loading, setLoading] = useState(false);

  // Update config when currentConfig prop changes
  useEffect(() => {
    setConfigData(currentConfig);
  }, [currentConfig]);

  // Determine which format to use
  const hasUiWeb4 = manifest.settings?.type === 'ui-web4';
  const hasFormSchema = manifest.settingsUI?.type === 'form';

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${config.backendUrl}/api/extensions/${extensionId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: configData }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || data.details?.join(', ') || 'Failed to save');
      }

      toast.success('Settings saved successfully');
      onSave?.(configData);
    } catch (error: any) {
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  if (hasUiWeb4) {
    // Render ui-web4 spec (like email-client)
    return (
      <div className="space-y-4">
        <SpecRenderer
          spec={manifest.settings.spec}
          loading={false}
          onFieldChange={(id: string, value: any) => setConfigData(prev => ({ ...prev, [id]: value }))}
          values={configData}
        />
        <div className="flex justify-end pt-4 border-t">
          <Button onClick={handleSave} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            <Save className="mr-2 h-4 w-4" />
            Save Settings
          </Button>
        </div>
      </div>
    );
  }

  if (hasFormSchema) {
    // Render form schema (like discord/slack)
    return (
      <FormSchemaRenderer
        schema={manifest.settingsUI}
        values={configData}
        onChange={setConfigData}
        onSave={handleSave}
        loading={loading}
      />
    );
  }

  // No settings defined
  return (
    <div className="text-center py-8 text-muted-foreground">
      <Settings className="mx-auto h-12 w-12 mb-3 opacity-20" />
      <p>No configuration required for this extension.</p>
    </div>
  );
}

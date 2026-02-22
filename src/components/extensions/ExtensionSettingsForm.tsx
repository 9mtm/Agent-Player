'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from "lucide-react";
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

interface ExtensionSettingsFormProps {
  extensionId: string;
  uiSpec: any; // ui-web4 spec from extension manifest
  onSave?: () => void;
}

export function ExtensionSettingsForm({ extensionId, uiSpec, onSave }: ExtensionSettingsFormProps) {
  const [settings, setSettings] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchSettings();
  }, [extensionId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/extensions/${extensionId}/config`);
      if (response.ok) {
        const data = await response.json();
        setSettings(data.config || {});
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (formData: Record<string, any>) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/extensions/${extensionId}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: formData }),
      });

      if (response.ok) {
        setSettings(formData);
        onSave?.();
        return { success: true, message: 'Settings saved successfully!' };
      } else {
        return { success: false, message: 'Failed to save settings' };
      }
    } catch (err) {
      console.error('Save failed:', err);
      return { success: false, message: 'Failed to save settings' };
    }
  };

  useEffect(() => {
    setFormValues(settings);
  }, [settings]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (!uiSpec) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        No settings UI available for this extension
      </div>
    );
  }

  const handleInputChange = (name: string, value: string) => {
    setFormValues(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);

    const result = await handleSave(formValues);

    setIsSaving(false);
    setSaveMessage({
      type: result.success ? 'success' : 'error',
      text: result.message,
    });

    if (result.success) {
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  const fields = uiSpec.fields || [];
  const submitButton = uiSpec.submitButton || { label: 'Save', variant: 'default' };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {uiSpec.title && (
        <div>
          <h3 className="text-lg font-semibold">{uiSpec.title}</h3>
          {uiSpec.description && (
            <p className="text-sm text-muted-foreground mt-1">{uiSpec.description}</p>
          )}
        </div>
      )}

      <div className="space-y-4">
        {fields.map((field: any) => (
          <div key={field.name} className="space-y-2">
            <Label htmlFor={field.name}>
              {field.label}
              {field.required && <span className="text-destructive ml-1">*</span>}
            </Label>
            <Input
              id={field.name}
              name={field.name}
              type={field.inputType || 'text'}
              placeholder={field.placeholder || ''}
              value={formValues[field.name] || ''}
              onChange={(e) => handleInputChange(field.name, e.target.value)}
              required={field.required || false}
            />
            {field.helpText && (
              <p className="text-xs text-muted-foreground">{field.helpText}</p>
            )}
          </div>
        ))}
      </div>

      {saveMessage && (
        <div className={`rounded-lg p-3 text-sm ${
          saveMessage.type === 'success'
            ? 'bg-green-500/10 text-green-600 dark:text-green-400'
            : 'bg-destructive/10 text-destructive'
        }`}>
          {saveMessage.text}
        </div>
      )}

      <Button
        type="submit"
        variant={submitButton.variant || 'default'}
        disabled={isSaving}
      >
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          submitButton.label || 'Save'
        )}
      </Button>
    </form>
  );
}

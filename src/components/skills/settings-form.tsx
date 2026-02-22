'use client';

import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Save, Fingerprint } from "lucide-react";
import { toast } from 'sonner';

interface SettingSchema {
    type: 'string' | 'number' | 'boolean' | 'password' | 'select' | 'text';
    label: string;
    description?: string;
    required?: boolean;
    default?: any;
    options?: string[]; // for select
}

interface SettingsFormProps {
    skillName: string;
    schema: Record<string, SettingSchema>;
    currentSettings?: Record<string, any>;
}

export function SettingsForm({ skillName, schema, currentSettings }: SettingsFormProps) {
    const safeSchema = schema || {};
    const [settings, setSettings] = useState<Record<string, any>>(currentSettings || {});
    const [loading, setLoading] = useState(false);

    // Initialize defaults if empty
    useState(() => {
        if (!currentSettings || Object.keys(currentSettings).length === 0) {
            const defaults: Record<string, any> = {};
            Object.entries(safeSchema).forEach(([key, config]) => {
                if (config.default !== undefined) {
                    defaults[key] = config.default;
                }
            });
            setSettings(defaults);
        }
    });

    const handleChange = (key: string, value: any) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        // ... (rest of submit logic unchanged until line 73)
        setLoading(true);

        try {
            const res = await fetch(`/api/skills/${skillName}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ settings }),
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.message || 'Failed to save settings');
            }

            toast.success('Settings saved successfully!');
        } catch (error) {
            console.error(error);
            toast.error('Failed to save settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
        } finally{
            setLoading(false);
        }
    };

    if (Object.keys(safeSchema).length === 0) {
        return (
            <div className="text-center py-8 text-muted-foreground border border-dashed rounded-lg">
                <Fingerprint className="mx-auto h-8 w-8 mb-2 opacity-50" />
                <p>No configuration required for this skill.</p>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            {Object.entries(safeSchema).map(([key, config]) => (
                <div key={key} className="space-y-2">
                    <div className="flex items-center justify-between">
                        <Label htmlFor={key} className="text-sm font-medium">
                            {config.label} {config.required && <span className="text-red-500">*</span>}
                        </Label>
                        {config.type === 'password' && settings[key] && (
                            <span className="text-xs text-green-500 flex items-center gap-1">
                                <Fingerprint className="h-3 w-3" /> Configured
                            </span>
                        )}
                    </div>

                    {config.description && (
                        <p className="text-xs text-muted-foreground">{config.description}</p>
                    )}

                    {config.type === 'boolean' ? (
                        <div className="flex items-center space-x-2">
                            <Switch
                                id={key}
                                checked={settings[key] || false}
                                onCheckedChange={(checked) => handleChange(key, checked)}
                            />
                            <Label htmlFor={key} className="text-sm font-normal text-muted-foreground">
                                {settings[key] ? 'Enabled' : 'Disabled'}
                            </Label>
                        </div>
                    ) : config.type === 'select' ? (
                        <div className="relative">
                            <select
                                id={key}
                                value={settings[key] || ''}
                                onChange={(e) => handleChange(key, e.target.value)}
                                className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 appearance-none"
                            >
                                <option value="" disabled>Select option</option>
                                {config.options?.map(opt => (
                                    <option key={opt} value={opt}>{opt}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-muted-foreground">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
                        </div>
                    ) : config.type === 'text' ? (
                        <Textarea
                            id={key}
                            value={settings[key] || ''}
                            onChange={(e) => handleChange(key, e.target.value)}
                            placeholder={config.default?.toString()}
                            required={config.required}
                            className="font-mono text-sm"
                        />
                    ) : (
                        <Input
                            id={key}
                            type={config.type === 'password' ? 'password' : config.type === 'number' ? 'number' : 'text'}
                            value={settings[key] || ''}
                            onChange={(e) => handleChange(key, config.type === 'number' ? parseFloat(e.target.value) : e.target.value)}
                            placeholder={config.default?.toString()}
                            required={config.required}
                        />
                    )}
                </div>
            ))}

            <div className="pt-4 border-t flex justify-end">
                <Button type="submit" disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Save className="mr-2 h-4 w-4" />
                    Save Configuration
                </Button>
            </div>
        </form>
    );
}

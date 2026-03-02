'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Settings, Save } from 'lucide-react';
import { toast } from 'sonner';

interface EvolutionConfig {
    enabled: boolean;
    minConfidenceThreshold: number;
    minSampleSize: number;
    evolutionFrequency: 'hourly' | 'daily' | 'weekly' | 'manual';
    allowedEvolutions: string[];
    maxEvolutionsPerCycle: number;
    rollbackOnDegradation: boolean;
    degradationThreshold: number;
}

interface ConfigPanelProps {
    config: EvolutionConfig;
    onSave: (config: Partial<EvolutionConfig>) => Promise<void>;
}

const EVOLUTION_TYPES = [
    { value: 'prompt_update', label: 'Prompt Updates' },
    { value: 'capability_added', label: 'Add Capabilities' },
    { value: 'capability_removed', label: 'Remove Capabilities' },
    { value: 'config_change', label: 'Config Changes' },
];

export function ConfigPanel({ config, onSave }: ConfigPanelProps) {
    const [localConfig, setLocalConfig] = useState(config);
    const [saving, setSaving] = useState(false);

    // Update local config when parent config changes
    useEffect(() => {
        if (config) {
            setLocalConfig(config);
        }
    }, [config]);

    const handleSave = async () => {
        setSaving(true);
        try {
            await onSave(localConfig);
            toast.success('Configuration updated');
        } catch (err: any) {
            toast.error(err.message || 'Failed to save configuration');
        } finally {
            setSaving(false);
        }
    };

    const toggleEvolutionType = (type: string) => {
        const current = localConfig.allowedEvolutions || [];
        const updated = current.includes(type)
            ? current.filter((t) => t !== type)
            : [...current, type];
        setLocalConfig({ ...localConfig, allowedEvolutions: updated });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <Settings className="w-5 h-5" />
                    Evolution Configuration
                </CardTitle>
                <CardDescription>
                    Configure how this agent learns and evolves autonomously
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {/* Enable/Disable */}
                <div className="flex items-center justify-between">
                    <div>
                        <Label>Enable Evolution</Label>
                        <p className="text-sm text-gray-500">
                            Allow agent to learn and evolve autonomously
                        </p>
                    </div>
                    <Switch
                        checked={localConfig.enabled}
                        onCheckedChange={(checked) =>
                            setLocalConfig({ ...localConfig, enabled: checked })
                        }
                    />
                </div>

                {/* Frequency */}
                <div className="space-y-2">
                    <Label>Evolution Frequency</Label>
                    <Select
                        value={localConfig.evolutionFrequency}
                        onValueChange={(value: any) =>
                            setLocalConfig({ ...localConfig, evolutionFrequency: value })
                        }
                    >
                        <SelectTrigger>
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="hourly">Hourly</SelectItem>
                            <SelectItem value="daily">Daily (Recommended)</SelectItem>
                            <SelectItem value="weekly">Weekly</SelectItem>
                            <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Confidence Threshold */}
                <div className="space-y-2">
                    <Label>Min Confidence Threshold ({(localConfig.minConfidenceThreshold * 100).toFixed(0)}%)</Label>
                    <Input
                        type="range"
                        min="50"
                        max="100"
                        step="5"
                        value={localConfig.minConfidenceThreshold * 100}
                        onChange={(e) =>
                            setLocalConfig({
                                ...localConfig,
                                minConfidenceThreshold: parseInt(e.target.value) / 100,
                            })
                        }
                    />
                    <p className="text-xs text-gray-500">
                        Minimum confidence score required to apply insights
                    </p>
                </div>

                {/* Sample Size */}
                <div className="space-y-2">
                    <Label>Min Sample Size</Label>
                    <Input
                        type="number"
                        min="5"
                        max="100"
                        value={localConfig.minSampleSize}
                        onChange={(e) =>
                            setLocalConfig({
                                ...localConfig,
                                minSampleSize: parseInt(e.target.value),
                            })
                        }
                    />
                    <p className="text-xs text-gray-500">
                        Minimum activity samples before learning
                    </p>
                </div>

                {/* Max Evolutions Per Cycle */}
                <div className="space-y-2">
                    <Label>Max Evolutions Per Cycle</Label>
                    <Input
                        type="number"
                        min="1"
                        max="10"
                        value={localConfig.maxEvolutionsPerCycle}
                        onChange={(e) =>
                            setLocalConfig({
                                ...localConfig,
                                maxEvolutionsPerCycle: parseInt(e.target.value),
                            })
                        }
                    />
                </div>

                {/* Allowed Evolution Types */}
                <div className="space-y-2">
                    <Label>Allowed Evolution Types</Label>
                    <div className="space-y-2">
                        {EVOLUTION_TYPES.map((type) => (
                            <div key={type.value} className="flex items-center gap-2">
                                <Switch
                                    checked={localConfig.allowedEvolutions?.includes(type.value)}
                                    onCheckedChange={() => toggleEvolutionType(type.value)}
                                />
                                <Label className="font-normal">{type.label}</Label>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Auto Rollback */}
                <div className="flex items-center justify-between">
                    <div>
                        <Label>Auto Rollback on Degradation</Label>
                        <p className="text-sm text-gray-500">
                            Automatically rollback if performance drops by{' '}
                            {(localConfig.degradationThreshold * 100).toFixed(0)}%
                        </p>
                    </div>
                    <Switch
                        checked={localConfig.rollbackOnDegradation}
                        onCheckedChange={(checked) =>
                            setLocalConfig({ ...localConfig, rollbackOnDegradation: checked })
                        }
                    />
                </div>

                {/* Save Button */}
                <Button onClick={handleSave} disabled={saving} className="w-full">
                    <Save className="w-4 h-4 mr-2" />
                    {saving ? 'Saving...' : 'Save Configuration'}
                </Button>
            </CardContent>
        </Card>
    );
}

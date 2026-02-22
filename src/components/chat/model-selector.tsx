'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, Cpu, Sparkles } from 'lucide-react';

interface Model {
    id: string;
    name: string;
    type: 'local' | 'online';
    provider?: string;
    size?: string;
}

interface ModelSelectorProps {
    models: Model[];
    currentModel: string;
    onModelChange: (modelId: string) => void;
    isLoading?: boolean;
}

export function ModelSelector({ models, currentModel, onModelChange, isLoading }: ModelSelectorProps) {
    const selectedModel = models.find(m => m.id === currentModel || m.name === currentModel);

    const localModels = models.filter(m => m.type === 'local');
    const onlineModels = models.filter(m => m.type === 'online');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" className="gap-2" disabled={isLoading}>
                    {selectedModel?.type === 'local' ? (
                        <Cpu className="h-4 w-4 text-blue-500" />
                    ) : (
                        <Sparkles className="h-4 w-4 text-purple-500" />
                    )}
                    <span className="font-medium">
                        {selectedModel?.name || currentModel || 'Select Model'}
                    </span>
                    {selectedModel?.size && (
                        <Badge variant="secondary" className="text-xs">
                            {selectedModel.size}
                        </Badge>
                    )}
                    <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-64">
                {localModels.length > 0 && (
                    <>
                        <DropdownMenuLabel className="flex items-center gap-2">
                            <Cpu className="h-4 w-4 text-blue-500" />
                            Local Models
                        </DropdownMenuLabel>
                        {localModels.map((model) => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => onModelChange(model.id)}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium">{model.name}</span>
                                    {model.size && (
                                        <span className="text-xs text-muted-foreground">
                                            {model.size}
                                        </span>
                                    )}
                                </div>
                                {currentModel === model.id && (
                                    <Badge variant="default" className="text-xs">
                                        Active
                                    </Badge>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}

                {onlineModels.length > 0 && localModels.length > 0 && (
                    <DropdownMenuSeparator />
                )}

                {onlineModels.length > 0 && (
                    <>
                        <DropdownMenuLabel className="flex items-center gap-2">
                            <Sparkles className="h-4 w-4 text-purple-500" />
                            Online Models
                        </DropdownMenuLabel>
                        {onlineModels.map((model) => (
                            <DropdownMenuItem
                                key={model.id}
                                onClick={() => onModelChange(model.id)}
                                className="flex items-center justify-between cursor-pointer"
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="font-medium">{model.name}</span>
                                    {model.provider && (
                                        <span className="text-xs text-muted-foreground">
                                            {model.provider}
                                        </span>
                                    )}
                                </div>
                                {currentModel === model.id && (
                                    <Badge variant="default" className="text-xs">
                                        Active
                                    </Badge>
                                )}
                            </DropdownMenuItem>
                        ))}
                    </>
                )}

                {models.length === 0 && (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                        No models available
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

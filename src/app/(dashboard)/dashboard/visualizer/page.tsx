'use client';

import { config } from '@/lib/config';

export default function VisualizerPage() {
    return (
        <div className="h-[calc(100vh-8rem)] w-full rounded-lg border overflow-hidden bg-background">
            <div className="bg-muted px-4 py-2 border-b flex justify-between items-center">
                <span className="text-sm font-medium">Vercel Workflow Engine Debugger</span>
                <span className="text-xs text-muted-foreground">Visualizer Service</span>
            </div>
            <iframe
                src={config.visualizerUrl}
                className="w-full h-full border-0"
                title="Workflow Visualizer"
            />
        </div>
    );
}

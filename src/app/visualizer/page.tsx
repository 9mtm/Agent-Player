'use client';

import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { config } from "@/lib/config";

export default function FullScreenVisualizerPage() {
    return (
        <div className="fixed inset-0 w-full h-full bg-background flex flex-col">
            {/* Header بسيط للرجوع */}
            <div className="h-12 border-b flex items-center px-4 bg-muted/20 shrink-0">
                <Link href="/dashboard" className="flex items-center text-sm font-medium hover:text-primary transition-colors">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
                <div className="ml-auto text-xs text-muted-foreground flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    Connected to Vercel Engine (:3456)
                </div>
            </div>

            {/* Iframe للشاشة كاملة */}
            <iframe
                src={config.visualizerUrl}
                className="flex-1 w-full border-0"
                title="Workflow Visualizer"
                allow="clipboard-read; clipboard-write"
            />
        </div>
    );
}

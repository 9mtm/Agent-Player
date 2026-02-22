'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export function TriggerDemoButton() {
    const [loading, setLoading] = useState(false);

    const startDemo = async () => {
        setLoading(true);
        try {
            const res = await fetch('/api/demo-workflow', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ input: 'Test Workflow Input' })
            });
            const data = await res.json();

            if (res.ok) {
                toast.success(`Success! Message: ${data.message} | Duration: ${data.duration}ms`);
            } else {
                toast.error('Error starting workflow: ' + (data.error || 'Unknown error'));
            }
        } catch (e) {
            toast.error('Error starting workflow');
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Button onClick={startDemo} disabled={loading}>
            {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
                <Play className="mr-2 h-4 w-4" />
            )}
            Run Demo Workflow
        </Button>
    );
}

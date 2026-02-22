'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflow-canvas/WorkflowCanvas';
import type { CanvasNode, CanvasEdge } from '@/components/workflow-canvas/canvas.types';
import { config } from '@/lib/config';
import { toast } from 'sonner';

const BACKEND_URL = config.backendUrl;

export default function WorkflowBuilderPage() {
    const router = useRouter();
    const [workflowName, setWorkflowName] = useState('New Workflow');
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async (nodes: CanvasNode[], edges: CanvasEdge[]) => {
        setIsSaving(true);
        try {
            // Convert Canvas nodes/edges to backend format
            const workflowNodes = nodes.map(node => ({
                id: node.id,
                type: node.data.type,
                position: node.position,
                data: {
                    actionType: node.data.actionType,
                    message: node.data.label,
                    ...node.data.parameters
                }
            }));

            const workflowEdges = edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.label
            }));

            const response = await fetch(`${BACKEND_URL}/api/workflows`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: workflowName,
                    description: 'Created with professional workflow builder',
                    enabled: true,
                    nodes: workflowNodes,
                    edges: workflowEdges
                })
            });

            if (response.ok) {
                toast.success('Workflow saved successfully!');
                router.push('/dashboard/workflows');
            } else {
                const error = await response.json();
                toast.error(`Failed to save: ${error.error}`);
            }
        } catch (error) {
            toast.error('Failed to save workflow');
        } finally {
            setIsSaving(false);
        }
    };

    const handleExecute = async () => {
        toast.info('Save workflow first to execute');
    };

    return (
        <div className="h-screen flex flex-col">
            {/* Professional Workflow Canvas */}
            <div className="flex-1">
                <WorkflowCanvas
                    workflowName={workflowName}
                    onWorkflowNameChange={setWorkflowName}
                    onBack={() => router.push('/dashboard/workflows')}
                    onSave={handleSave}
                    onExecute={handleExecute}
                />
            </div>
        </div>
    );
}

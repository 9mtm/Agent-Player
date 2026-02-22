'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { WorkflowCanvas } from '@/components/workflow-canvas/WorkflowCanvas';
import type { CanvasNode, CanvasEdge, NodeType } from '@/components/workflow-canvas/canvas.types';
import { config } from '@/lib/config';
import { Loader2, Target, Zap, GitBranch, Clock, Repeat, Wrench, FileText, Package } from 'lucide-react';
import { toast } from 'sonner';

const BACKEND_URL = config.backendUrl;

export default function EditWorkflowPage() {
    const params = useParams();
    const router = useRouter();
    const workflowId = params.id as string;

    const [workflowName, setWorkflowName] = useState('');
    const [initialNodes, setInitialNodes] = useState<CanvasNode[]>([]);
    const [initialEdges, setInitialEdges] = useState<CanvasEdge[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadWorkflow();
    }, [workflowId]);

    const loadWorkflow = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}`);
            if (!response.ok) {
                toast.error('Workflow not found');
                router.push('/dashboard/workflows');
                return;
            }

            const data = await response.json();
            const workflow = data.workflow;

            setWorkflowName(workflow.name);

            // Convert backend nodes to CanvasNode format
            const canvasNodes: CanvasNode[] = workflow.nodes.map((node: any) => ({
                id: node.id,
                type: node.type as NodeType,
                position: node.position,
                data: {
                    label: node.data.label || node.type,
                    type: node.type as NodeType,
                    icon: getNodeIcon(node.type),
                    description: node.data.message || node.data.description,
                    actionType: node.data.actionType,
                    parameters: node.data.parameters || {},
                    content: node.data.content,
                    color: node.data.color,
                },
            }));

            // Convert backend edges to CanvasEdge format
            const canvasEdges: CanvasEdge[] = workflow.edges.map((edge: any) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.label,
                type: 'smoothstep',
                animated: true,
            }));

            setInitialNodes(canvasNodes);
            setInitialEdges(canvasEdges);
        } catch (error) {
            console.error('Error loading workflow:', error);
            toast.error('Failed to load workflow');
            router.push('/dashboard/workflows');
        } finally {
            setIsLoading(false);
        }
    };

    const getNodeIcon = (type: string): React.ComponentType<{ className?: string }> => {
        const icons: Record<string, React.ComponentType<{ className?: string }>> = {
            trigger: Target,
            action: Zap,
            condition: GitBranch,
            delay: Clock,
            loop: Repeat,
            transform: Wrench,
            note: FileText,
        };
        return icons[type] || Package;
    };

    const handleSave = async (nodes: CanvasNode[], edges: CanvasEdge[]) => {
        setIsSaving(true);
        try {
            // Convert Canvas nodes/edges back to backend format
            const workflowNodes = nodes.map(node => ({
                id: node.id,
                type: node.data.type,
                position: node.position,
                data: {
                    label: node.data.label,
                    actionType: node.data.actionType,
                    message: node.data.description,
                    description: node.data.description,
                    content: node.data.content,
                    color: node.data.color,
                    parameters: node.data.parameters || {},
                }
            }));

            const workflowEdges = edges.map(edge => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                label: edge.label
            }));

            const response = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: workflowName,
                    description: 'Updated via workflow editor',
                    enabled: true,
                    nodes: workflowNodes,
                    edges: workflowEdges
                })
            });

            if (response.ok) {
                toast.success('Workflow updated successfully!');
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
        try {
            const response = await fetch(`${BACKEND_URL}/api/workflows/${workflowId}/execute`, {
                method: 'POST'
            });

            if (response.ok) {
                toast.success('Workflow execution started!');
            } else {
                const error = await response.json();
                toast.error(`Failed: ${error.error}`);
            }
        } catch (error) {
            toast.error('Failed to execute workflow');
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col">
            {/* Professional Workflow Canvas */}
            <div className="flex-1">
                <WorkflowCanvas
                    workflowId={workflowId}
                    workflowName={workflowName}
                    onWorkflowNameChange={setWorkflowName}
                    onBack={() => router.push('/dashboard/workflows')}
                    initialNodes={initialNodes}
                    initialEdges={initialEdges}
                    onSave={handleSave}
                    onExecute={handleExecute}
                />
            </div>
        </div>
    );
}

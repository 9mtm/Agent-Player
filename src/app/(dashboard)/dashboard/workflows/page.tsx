'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Play, Edit, Trash2, Loader2, Download, Upload } from "lucide-react";
import { toast } from 'sonner';

interface Workflow {
    id: string;
    name: string;
    description?: string;
    enabled: boolean;
    nodes: any[];
    edges: any[];
    created_at: string;
    updated_at: string;
}

import { config } from '@/lib/config';

const BACKEND_URL = config.backendUrl;

export default function WorkflowsPage() {
    const [workflows, setWorkflows] = useState<Workflow[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchWorkflows();
    }, []);

    const fetchWorkflows = async () => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/workflows`);
            const data = await response.json();
            setWorkflows(data.workflows || []);
        } catch (error) {
            console.error('Error fetching workflows:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleExecute = async (id: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/api/workflows/${id}/execute`, {
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

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`Delete workflow "${name}"?`)) return;

        try {
            const response = await fetch(`${BACKEND_URL}/api/workflows/${id}`, {
                method: 'DELETE'
            });

            if (response.ok) {
                toast.success('Workflow deleted successfully');
                fetchWorkflows();
            }
        } catch (error) {
            toast.error('Failed to delete workflow');
        }
    };

    const handleImportN8n = async () => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.json';
        fileInput.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const response = await fetch(`${BACKEND_URL}/api/workflows/import/n8n`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ n8nWorkflow: text })
                });

                if (response.ok) {
                    toast.success('n8n workflow imported successfully!');
                    fetchWorkflows();
                } else {
                    const error = await response.json();
                    toast.error(`Import failed: ${error.error}`);
                }
            } catch (error) {
                toast.error('Failed to import n8n workflow');
            }
        };
        fileInput.click();
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight">Workflows</h2>
                    <p className="text-muted-foreground">
                        Create and manage automation workflows
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={handleImportN8n}>
                        <Upload className="mr-2 h-4 w-4" />
                        Import n8n
                    </Button>
                    <Link href="/dashboard/workflows/new">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" />
                            New Workflow
                        </Button>
                    </Link>
                </div>
            </div>

            {workflows.length === 0 ? (
                <Card>
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <div className="rounded-full bg-muted p-3 mb-4">
                            <Plus className="h-8 w-8 text-muted-foreground" />
                        </div>
                        <h3 className="text-lg font-semibold mb-2">No workflows yet</h3>
                        <p className="text-muted-foreground text-center mb-4">
                            Get started by creating your first automation workflow
                        </p>
                        <div className="flex gap-2">
                            <Link href="/dashboard/workflows/new">
                                <Button>
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create Workflow
                                </Button>
                            </Link>
                            <Button variant="outline" onClick={handleImportN8n}>
                                <Upload className="mr-2 h-4 w-4" />
                                Import n8n
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {workflows.map((workflow) => (
                        <Card key={workflow.id} className="hover:shadow-lg transition-shadow">
                            <CardHeader>
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                                        {workflow.description && (
                                            <CardDescription className="mt-1">
                                                {workflow.description}
                                            </CardDescription>
                                        )}
                                    </div>
                                    <Badge variant={workflow.enabled ? "default" : "secondary"}>
                                        {workflow.enabled ? "Enabled" : "Disabled"}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                                    <span>{workflow.nodes.length} nodes</span>
                                    <span>{workflow.edges.length} connections</span>
                                </div>
                                <div className="flex gap-2">
                                    <Button
                                        size="sm"
                                        variant="default"
                                        onClick={() => handleExecute(workflow.id)}
                                        disabled={!workflow.enabled}
                                        className="flex-1"
                                    >
                                        <Play className="mr-2 h-4 w-4" />
                                        Run
                                    </Button>
                                    <Link href={`/dashboard/workflows/${workflow.id}`}>
                                        <Button size="sm" variant="outline">
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleDelete(workflow.id, workflow.name)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}

/**
 * Temporary in-memory storage for workflows and executions
 * This will be replaced with Prisma database later
 */

export interface Workflow {
    id: string;
    name: string;
    description?: string;
    definition: any;
    enabled: boolean;
    createdAt: string;
    updatedAt: string;
    _count?: {
        executions: number;
    };
}

export interface Execution {
    id: string;
    workflowId: string;
    status: string;
    startedAt: string;
    completedAt?: string;
    input?: any;
    output?: any;
    error?: string;
}

// In-memory storage
export const workflows: Workflow[] = [
    // Demo workflow
    {
        id: 'demo-workflow-1',
        name: 'Demo Workflow',
        description: 'A sample workflow to demonstrate the system',
        definition: {
            steps: [
                { name: 'Step 1', type: 'agent', config: {} },
                { name: 'Step 2', type: 'skill', config: {} },
            ],
        },
        enabled: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        _count: {
            executions: 0,
        },
    },
];

export const executions: Execution[] = [];

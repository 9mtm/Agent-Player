/**
 * n8n Workflow Importer
 * Converts n8n JSON workflows to Agent Player format
 */

import { randomUUID } from 'crypto';

interface N8nNode {
    id: string;
    name: string;
    type: string;
    typeVersion: number;
    position: [number, number];
    parameters: Record<string, any>;
}

interface N8nConnection {
    node: string;
    type: string;
    index: number;
}

interface N8nWorkflow {
    name: string;
    nodes: N8nNode[];
    connections: Record<string, { main: N8nConnection[][] }>;
    active?: boolean;
    settings?: Record<string, any>;
}

interface WorkflowNode {
    id: string;
    type: 'trigger' | 'action' | 'condition' | 'loop' | 'delay';
    position: { x: number; y: number };
    data: Record<string, any>;
}

interface WorkflowEdge {
    id: string;
    source: string;
    target: string;
    label?: string;
}

export class N8nImporter {
    /**
     * Convert n8n workflow to Agent Player format
     */
    static convert(n8nWorkflow: N8nWorkflow): {
        name: string;
        description: string;
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
        enabled: boolean;
    } {
        const nodes: WorkflowNode[] = [];
        const edges: WorkflowEdge[] = [];

        // Convert nodes
        for (const n8nNode of n8nWorkflow.nodes) {
            const convertedNode = this.convertNode(n8nNode);
            if (convertedNode) {
                nodes.push(convertedNode);
            }
        }

        // Convert connections to edges
        for (const [sourceName, outputs] of Object.entries(n8nWorkflow.connections)) {
            const sourceNode = n8nWorkflow.nodes.find(n => n.name === sourceName);
            if (!sourceNode) continue;

            // n8n connections format: { "Node Name": { "main": [[{node, type, index}]] } }
            const mainOutputs = outputs.main || [];

            for (let outputIndex = 0; outputIndex < mainOutputs.length; outputIndex++) {
                const connections = mainOutputs[outputIndex];

                for (const conn of connections) {
                    const targetNode = n8nWorkflow.nodes.find(n => n.name === conn.node);
                    if (!targetNode) continue;

                    const edge: WorkflowEdge = {
                        id: randomUUID(),
                        source: sourceNode.id,
                        target: targetNode.id
                    };

                    // For IF nodes, label the edges as true/false
                    if (sourceNode.type === 'n8n-nodes-base.if') {
                        edge.label = outputIndex === 0 ? 'true' : 'false';
                    }

                    edges.push(edge);
                }
            }
        }

        return {
            name: n8nWorkflow.name,
            description: `Imported from n8n`,
            nodes,
            edges,
            enabled: n8nWorkflow.active !== false
        };
    }

    /**
     * Convert single n8n node to Agent Player node
     */
    private static convertNode(n8nNode: N8nNode): WorkflowNode | null {
        const baseNode = {
            id: n8nNode.id,
            position: {
                x: n8nNode.position[0],
                y: n8nNode.position[1]
            },
            data: {} as Record<string, any>
        };

        // Map n8n node types to our types
        switch (n8nNode.type) {
            // Trigger nodes
            case 'n8n-nodes-base.scheduleTrigger':
            case 'n8n-nodes-base.cron':
            case 'n8n-nodes-base.manualTrigger':
            case 'n8n-nodes-base.webhookTrigger':
                return {
                    ...baseNode,
                    type: 'trigger',
                    data: {
                        triggerType: this.mapTriggerType(n8nNode.type),
                        ...n8nNode.parameters
                    }
                };

            // Action nodes - HTTP Request
            case 'n8n-nodes-base.httpRequest':
                return {
                    ...baseNode,
                    type: 'action',
                    data: {
                        actionType: 'http-request',
                        method: n8nNode.parameters.method || 'GET',
                        url: n8nNode.parameters.url,
                        headers: n8nNode.parameters.headerParameters?.parameters || {},
                        body: n8nNode.parameters.bodyParameters?.parameters || {}
                    }
                };

            // Action nodes - Send Message
            case 'n8n-nodes-base.sendMessage':
                return {
                    ...baseNode,
                    type: 'action',
                    data: {
                        actionType: 'send-message',
                        channel: n8nNode.parameters.channel || 'default',
                        message: n8nNode.parameters.message
                    }
                };

            // Action nodes - Function
            case 'n8n-nodes-base.function':
                return {
                    ...baseNode,
                    type: 'action',
                    data: {
                        actionType: 'function',
                        code: n8nNode.parameters.functionCode || ''
                    }
                };

            // Action nodes - Set
            case 'n8n-nodes-base.set':
                return {
                    ...baseNode,
                    type: 'action',
                    data: {
                        actionType: 'set-variable',
                        variableName: n8nNode.parameters.values?.parameters?.[0]?.name || 'value',
                        value: n8nNode.parameters.values?.parameters?.[0]?.value || ''
                    }
                };

            // Condition nodes - IF
            case 'n8n-nodes-base.if':
                const condition = n8nNode.parameters.conditions;
                let operator = '==';
                let value1 = '';
                let value2 = '';

                if (condition?.number && condition.number.length > 0) {
                    const numCondition = condition.number[0];
                    value1 = numCondition.value1 || '';
                    value2 = numCondition.value2 || '';
                    operator = this.mapOperator(numCondition.operation);
                } else if (condition?.string && condition.string.length > 0) {
                    const strCondition = condition.string[0];
                    value1 = strCondition.value1 || '';
                    value2 = strCondition.value2 || '';
                    operator = this.mapOperator(strCondition.operation);
                }

                return {
                    ...baseNode,
                    type: 'condition',
                    data: {
                        operator,
                        value1,
                        value2
                    }
                };

            // Loop nodes
            case 'n8n-nodes-base.splitInBatches':
                return {
                    ...baseNode,
                    type: 'loop',
                    data: {
                        loopType: 'for-each',
                        batchSize: n8nNode.parameters.batchSize || 1
                    }
                };

            // Delay nodes
            case 'n8n-nodes-base.wait':
                return {
                    ...baseNode,
                    type: 'delay',
                    data: {
                        duration: n8nNode.parameters.amount * 1000 || 1000 // Convert to ms
                    }
                };

            // Unsupported - convert to generic action
            default:
                console.warn(`Unsupported n8n node type: ${n8nNode.type}`);
                return {
                    ...baseNode,
                    type: 'action',
                    data: {
                        actionType: 'log',
                        message: `[n8n node: ${n8nNode.type}] ${n8nNode.name}`
                    }
                };
        }
    }

    /**
     * Map n8n trigger types to our format
     */
    private static mapTriggerType(n8nType: string): string {
        switch (n8nType) {
            case 'n8n-nodes-base.scheduleTrigger':
            case 'n8n-nodes-base.cron':
                return 'schedule';
            case 'n8n-nodes-base.webhookTrigger':
                return 'webhook';
            case 'n8n-nodes-base.manualTrigger':
            default:
                return 'manual';
        }
    }

    /**
     * Map n8n operators to our format
     */
    private static mapOperator(n8nOperator: string): string {
        const mapping: Record<string, string> = {
            'equal': '==',
            'notEqual': '!=',
            'larger': '>',
            'smaller': '<',
            'largerEqual': '>=',
            'smallerEqual': '<=',
            'contains': 'contains',
            'notContains': '!contains'
        };

        return mapping[n8nOperator] || '==';
    }

    /**
     * Load n8n workflow from JSON string
     */
    static parse(jsonString: string): {
        name: string;
        description: string;
        nodes: WorkflowNode[];
        edges: WorkflowEdge[];
        enabled: boolean;
    } {
        const n8nWorkflow = JSON.parse(jsonString) as N8nWorkflow;
        return this.convert(n8nWorkflow);
    }
}

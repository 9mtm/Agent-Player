/**
 * Workflow Execution Engine
 * Executes workflows node-by-node with error handling and retry logic
 */

import { getDatabase } from '../db/index.js';

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

interface ExecutionContext {
    variables: Record<string, any>;
    logs: ExecutionLog[];
    currentNodeId: string | null;
}

interface ExecutionLog {
    timestamp: string;
    level: 'info' | 'warning' | 'error';
    message: string;
    nodeId?: string;
}

export class WorkflowExecutor {
    private db = getDatabase();
    private executionId: string;
    private workflowId: string;
    private nodes: WorkflowNode[];
    private edges: WorkflowEdge[];
    private context: ExecutionContext;

    constructor(workflowId: string, executionId: string, nodes: WorkflowNode[], edges: WorkflowEdge[]) {
        this.workflowId = workflowId;
        this.executionId = executionId;
        this.nodes = nodes;
        this.edges = edges;
        this.context = {
            variables: {},
            logs: [],
            currentNodeId: null
        };
    }

    /**
     * Execute the workflow from start to finish
     */
    async execute(): Promise<void> {
        try {
            this.log('info', 'Workflow execution started');

            // Find trigger node (starting point)
            const triggerNode = this.nodes.find(n => n.type === 'trigger');
            if (!triggerNode) {
                throw new Error('No trigger node found in workflow');
            }

            this.log('info', `Starting from trigger node: ${triggerNode.id}`);

            // Execute from trigger
            await this.executeNode(triggerNode);

            // Mark as completed
            this.updateStatus('completed');
            this.log('info', 'Workflow execution completed successfully');

        } catch (error) {
            this.log('error', `Workflow execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
            this.updateStatus('failed', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Execute a single node and move to next
     */
    private async executeNode(node: WorkflowNode): Promise<void> {
        this.context.currentNodeId = node.id;
        this.log('info', `Executing node: ${node.id} (${node.type})`, node.id);

        try {
            let result: any;

            // Execute based on node type
            switch (node.type) {
                case 'trigger':
                    result = await this.executeTrigger(node);
                    break;

                case 'action':
                    result = await this.executeAction(node);
                    break;

                case 'condition':
                    result = await this.executeCondition(node);
                    break;

                case 'loop':
                    result = await this.executeLoop(node);
                    break;

                case 'delay':
                    result = await this.executeDelay(node);
                    break;

                default:
                    throw new Error(`Unknown node type: ${node.type}`);
            }

            // Store result in context
            this.context.variables[node.id] = result;

            // Find next node(s)
            const nextNodes = await this.getNextNodes(node, result);

            // Execute next nodes
            for (const nextNode of nextNodes) {
                await this.executeNode(nextNode);
            }

        } catch (error) {
            this.log('error', `Node execution failed: ${error instanceof Error ? error.message : 'Unknown error'}`, node.id);
            throw error;
        }
    }

    /**
     * Execute trigger node
     */
    private async executeTrigger(node: WorkflowNode): Promise<any> {
        const { triggerType } = node.data;

        this.log('info', `Trigger type: ${triggerType || 'manual'}`, node.id);

        // For now, triggers just pass through
        // In the future:
        // - 'schedule': Check cron expression
        // - 'webhook': Wait for HTTP request
        // - 'channel': Wait for message from WhatsApp/Telegram

        return { triggered: true, timestamp: new Date().toISOString() };
    }

    /**
     * Execute action node
     */
    private async executeAction(node: WorkflowNode): Promise<any> {
        const { actionType, ...config } = node.data;

        this.log('info', `Action type: ${actionType}`, node.id);

        switch (actionType) {
            case 'log':
                // Simple log action
                const message = this.interpolate(config.message || 'Log message');
                this.log('info', `[Action Log] ${message}`, node.id);
                return { logged: true, message };

            case 'set-variable':
                // Set a variable in context
                const varName = config.variableName;
                const varValue = this.interpolate(config.value);
                this.context.variables[varName] = varValue;
                this.log('info', `Set variable: ${varName} = ${JSON.stringify(varValue)}`, node.id);
                return { variable: varName, value: varValue };

            case 'http-request':
                // HTTP request (placeholder)
                this.log('info', `HTTP ${config.method || 'GET'} ${config.url}`, node.id);
                // TODO: Implement actual HTTP request using fetch/axios
                return { status: 200, data: { mock: true } };

            case 'send-message':
                // Send message to channel (placeholder)
                this.log('info', `Send message to ${config.channel}: ${config.message}`, node.id);
                // TODO: Integrate with Gateway
                return { sent: true, channel: config.channel };

            default:
                throw new Error(`Unknown action type: ${actionType}`);
        }
    }

    /**
     * Execute condition node
     */
    private async executeCondition(node: WorkflowNode): Promise<any> {
        const { condition, operator = '==', value1, value2 } = node.data;

        // Interpolate values
        const val1 = this.interpolate(value1);
        const val2 = this.interpolate(value2);

        let result = false;

        // Evaluate condition
        switch (operator) {
            case '==':
                result = val1 == val2;
                break;
            case '!=':
                result = val1 != val2;
                break;
            case '>':
                result = Number(val1) > Number(val2);
                break;
            case '<':
                result = Number(val1) < Number(val2);
                break;
            case '>=':
                result = Number(val1) >= Number(val2);
                break;
            case '<=':
                result = Number(val1) <= Number(val2);
                break;
            case 'contains':
                result = String(val1).includes(String(val2));
                break;
            default:
                throw new Error(`Unknown operator: ${operator}`);
        }

        this.log('info', `Condition: ${val1} ${operator} ${val2} = ${result}`, node.id);

        return { passed: result, value1: val1, value2: val2 };
    }

    /**
     * Execute loop node
     */
    private async executeLoop(node: WorkflowNode): Promise<any> {
        const { loopType, items, variable } = node.data;

        this.log('info', `Loop type: ${loopType}`, node.id);

        if (loopType === 'for-each') {
            // Get items to iterate
            const itemsToLoop = this.interpolate(items) || [];

            if (!Array.isArray(itemsToLoop)) {
                throw new Error('Loop items must be an array');
            }

            const results = [];

            for (let i = 0; i < itemsToLoop.length; i++) {
                const item = itemsToLoop[i];

                // Set loop variable
                this.context.variables[variable || 'item'] = item;
                this.context.variables['index'] = i;

                this.log('info', `Loop iteration ${i + 1}/${itemsToLoop.length}`, node.id);

                // TODO: Execute loop body (nodes connected to this loop)
                // For now, just collect items
                results.push(item);
            }

            return { iterations: itemsToLoop.length, results };
        }

        return { looped: true };
    }

    /**
     * Execute delay node
     */
    private async executeDelay(node: WorkflowNode): Promise<any> {
        const { duration = 1000 } = node.data; // Default 1 second

        this.log('info', `Delaying for ${duration}ms`, node.id);

        await new Promise(resolve => setTimeout(resolve, duration));

        return { delayed: duration };
    }

    /**
     * Get next node(s) to execute
     */
    private async getNextNodes(currentNode: WorkflowNode, result: any): Promise<WorkflowNode[]> {
        // For condition nodes, branch based on result
        if (currentNode.type === 'condition') {
            const branch = result.passed ? 'true' : 'false';
            const edge = this.edges.find(e => e.source === currentNode.id && e.label === branch);

            if (edge) {
                const nextNode = this.nodes.find(n => n.id === edge.target);
                return nextNode ? [nextNode] : [];
            }
            return [];
        }

        // For other nodes, follow all outgoing edges
        const outgoingEdges = this.edges.filter(e => e.source === currentNode.id);
        const nextNodes: WorkflowNode[] = [];

        for (const edge of outgoingEdges) {
            const nextNode = this.nodes.find(n => n.id === edge.target);
            if (nextNode) {
                nextNodes.push(nextNode);
            }
        }

        return nextNodes;
    }

    /**
     * Interpolate variables in strings (e.g., "Hello {{name}}")
     */
    private interpolate(value: any): any {
        if (typeof value !== 'string') {
            return value;
        }

        // Replace {{variable}} with actual value
        return value.replace(/\{\{([^}]+)\}\}/g, (match, varName) => {
            const trimmed = varName.trim();
            return this.context.variables[trimmed] !== undefined
                ? String(this.context.variables[trimmed])
                : match;
        });
    }

    /**
     * Add log entry
     */
    private log(level: 'info' | 'warning' | 'error', message: string, nodeId?: string): void {
        const entry: ExecutionLog = {
            timestamp: new Date().toISOString(),
            level,
            message,
            nodeId
        };

        this.context.logs.push(entry);
        console.log(`[Workflow ${this.executionId}] [${level.toUpperCase()}] ${message}`);
    }

    /**
     * Update execution status in database
     */
    private updateStatus(status: 'running' | 'completed' | 'failed', error?: string): void {
        const now = new Date().toISOString();

        if (status === 'completed' || status === 'failed') {
            this.db.getDb().prepare(`
                UPDATE workflow_executions
                SET status = ?, completed_at = ?, error = ?, logs = ?
                WHERE id = ?
            `).run(status, now, error || null, JSON.stringify(this.context.logs), this.executionId);
        } else {
            this.db.getDb().prepare(`
                UPDATE workflow_executions
                SET status = ?, logs = ?
                WHERE id = ?
            `).run(status, JSON.stringify(this.context.logs), this.executionId);
        }
    }
}

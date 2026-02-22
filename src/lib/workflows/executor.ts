/**
 * Custom Workflow Executor
 *
 * NO Vercel Workflow SDK - كتابة من الصفر!
 */

import {
  Workflow,
  WorkflowNode,
  WorkflowEdge,
  ExecutionContext,
  ExecutionResult,
  ExecutionLog,
  ExecutionLogEntry,
  ActionNode,
  ConditionNode,
} from './types';

export class WorkflowExecutor {
  private executionLog: ExecutionLog;

  constructor(private workflow: Workflow) {
    this.executionLog = {
      workflowId: workflow.id,
      executionId: this.generateExecutionId(),
      startTime: new Date(),
      status: 'running',
      entries: [],
    };
  }

  /**
   * Execute workflow from start to finish
   */
  async execute(initialContext: ExecutionContext = {}): Promise<ExecutionResult> {
    const startTime = Date.now();

    try {
      // Find trigger node (starting point)
      const triggerNode = this.workflow.nodes.find(n => n.type === 'trigger');
      if (!triggerNode) {
        throw new Error('No trigger node found');
      }

      // Execute from trigger node
      const result = await this.executeNode(triggerNode, initialContext);

      const duration = Date.now() - startTime;

      this.executionLog.status = 'completed';
      this.executionLog.endTime = new Date();
      this.executionLog.finalResult = {
        success: true,
        data: result,
        duration,
      };

      return {
        success: true,
        data: result,
        duration,
      };
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      this.executionLog.status = 'failed';
      this.executionLog.endTime = new Date();
      this.executionLog.finalResult = {
        success: false,
        error: errorMessage,
        duration,
      };

      return {
        success: false,
        error: errorMessage,
        duration,
      };
    }
  }

  /**
   * Execute a single node
   */
  private async executeNode(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    console.log(`Executing node: ${node.id} (${node.type})`);

    const entry: ExecutionLogEntry = {
      nodeId: node.id,
      timestamp: new Date(),
      success: false,
    };

    try {
      let result: any;

      switch (node.type) {
        case 'trigger':
          result = context; // Pass through initial context
          break;

        case 'action':
          result = await this.executeAction(node as ActionNode, context);
          break;

        case 'condition':
          result = await this.executeCondition(node as ConditionNode, context);
          break;

        case 'loop':
          result = await this.executeLoop(node, context);
          break;

        case 'data':
          result = await this.executeDataTransform(node, context);
          break;

        default:
          throw new Error(`Unknown node type: ${node.type}`);
      }

      entry.success = true;
      entry.data = result;
      this.executionLog.entries.push(entry);

      // Find and execute next node(s)
      const nextNodes = this.findNextNodes(node, result);

      if (nextNodes.length === 0) {
        return result; // End of workflow
      }

      // Execute next node (for now, handle single path)
      // TODO: Handle multiple paths (branching)
      const nextNode = nextNodes[0];
      return await this.executeNode(nextNode, result);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      entry.error = errorMessage;
      this.executionLog.entries.push(entry);
      throw error;
    }
  }

  /**
   * Execute action node
   */
  private async executeAction(
    node: ActionNode,
    context: ExecutionContext
  ): Promise<any> {
    const { actionType } = node.data;

    switch (actionType) {
      case 'skill':
        return await this.executeSkill(node, context);

      case 'api':
        return await this.executeApiCall(node, context);

      case 'message':
        return await this.sendMessage(node, context);

      case 'desktop':
        return await this.executeDesktopAutomation(node, context);

      case 'script':
        return await this.executeScript(node, context);

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Execute skill
   */
  private async executeSkill(
    node: ActionNode,
    context: ExecutionContext
  ): Promise<any> {
    const { skillName } = node.data;

    // TODO: Integrate with Skills System
    console.log(`Executing skill: ${skillName}`, context);

    // Placeholder - replace with actual skill execution
    return {
      ...context,
      skillResult: `Skill ${skillName} executed`,
    };
  }

  /**
   * Execute API call
   */
  private async executeApiCall(
    node: ActionNode,
    context: ExecutionContext
  ): Promise<any> {
    const { apiUrl, apiMethod = 'GET', apiHeaders, apiBody } = node.data;

    const response = await fetch(apiUrl!, {
      method: apiMethod,
      headers: apiHeaders ? JSON.parse(JSON.stringify(apiHeaders)) : {},
      body: apiBody ? JSON.stringify(JSON.parse(apiBody)) : undefined,
    });

    const data = await response.json();

    return {
      ...context,
      apiResponse: data,
    };
  }

  /**
   * Send message to channel
   */
  private async sendMessage(
    node: ActionNode,
    context: ExecutionContext
  ): Promise<any> {
    const { channelId, message } = node.data;

    // TODO: Integrate with Gateway
    console.log(`Sending message to ${channelId}:`, message);

    return context;
  }

  /**
   * Execute desktop automation
   */
  private async executeDesktopAutomation(
    node: ActionNode,
    context: ExecutionContext
  ): Promise<any> {
    // TODO: Integrate with Electron Service
    console.log('Executing desktop automation:', node.data);

    return context;
  }

  /**
   * Execute script
   */
  private async executeScript(
    node: ActionNode,
    context: ExecutionContext
  ): Promise<any> {
    // TODO: Safe script execution
    console.log('Executing script:', node.data);

    return context;
  }

  /**
   * Execute condition node
   */
  private async executeCondition(
    node: ConditionNode,
    context: ExecutionContext
  ): Promise<any> {
    const { field, operator, value } = node.data;
    const fieldValue = this.getFieldValue(context, field);

    let passed = false;

    switch (operator) {
      case 'equals':
        passed = fieldValue === value;
        break;
      case 'notEquals':
        passed = fieldValue !== value;
        break;
      case 'contains':
        passed = String(fieldValue).includes(String(value));
        break;
      case 'greaterThan':
        passed = Number(fieldValue) > Number(value);
        break;
      case 'lessThan':
        passed = Number(fieldValue) < Number(value);
        break;
    }

    return {
      ...context,
      conditionPassed: passed,
    };
  }

  /**
   * Execute loop node
   */
  private async executeLoop(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    const { arrayPath, itemVariable } = node.data;
    const array = this.getFieldValue(context, arrayPath);

    if (!Array.isArray(array)) {
      throw new Error(`Field ${arrayPath} is not an array`);
    }

    const results = [];

    for (const item of array) {
      const loopContext = {
        ...context,
        [itemVariable]: item,
      };

      // TODO: Execute loop body
      results.push(loopContext);
    }

    return {
      ...context,
      loopResults: results,
    };
  }

  /**
   * Execute data transformation
   */
  private async executeDataTransform(
    node: WorkflowNode,
    context: ExecutionContext
  ): Promise<any> {
    const { operation } = node.data;

    // TODO: Implement data transformations
    console.log(`Data transformation: ${operation}`, context);

    return context;
  }

  /**
   * Find next nodes to execute
   */
  private findNextNodes(currentNode: WorkflowNode, result: any): WorkflowNode[] {
    const edges = this.workflow.edges.filter(e => e.source === currentNode.id);

    if (edges.length === 0) {
      return [];
    }

    // Handle condition branching
    if (currentNode.type === 'condition') {
      const passed = result.conditionPassed;
      const edge = edges.find(e => e.condition === (passed ? 'true' : 'false'));
      if (!edge) return [];
      const nextNode = this.workflow.nodes.find(n => n.id === edge.target);
      return nextNode ? [nextNode] : [];
    }

    // Single path
    const edge = edges[0];
    const nextNode = this.workflow.nodes.find(n => n.id === edge.target);
    return nextNode ? [nextNode] : [];
  }

  /**
   * Get field value from context using dot notation
   */
  private getFieldValue(context: ExecutionContext, path: string): any {
    return path.split('.').reduce((obj, key) => obj?.[key], context);
  }

  /**
   * Generate unique execution ID
   */
  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get execution log
   */
  getExecutionLog(): ExecutionLog {
    return this.executionLog;
  }
}

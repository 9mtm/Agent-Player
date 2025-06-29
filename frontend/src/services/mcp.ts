import api from "./api";

// MCP Types
export interface MCPRequest {
  server: string;
  method: string;
  params: Record<string, any>;
}

export interface MCPResponse {
  jsonrpc: string;
  result?: any;
  error?: {
    code: number;
    message: string;
    data?: any;
  };
  id?: string | number;
}

export interface MCPBatchRequest {
  requests: MCPRequest[];
}

export interface MCPServer {
  name: string;
  description: string;
  status: string;
  capabilities: string[];
  tools: MCPTool[];
}

export interface MCPTool {
  name: string;
  description: string;
  parameters: Record<string, any>;
  examples?: string[];
}

export interface MCPSession {
  session_id: string;
  user_id?: string;
  created_at: string;
  last_activity: string;
  request_count: number;
  servers_used: string[];
  recent_requests: Array<{
    server: string;
    method: string;
    timestamp: string;
  }>;
}

export interface MCPCapabilities {
  mcp_version: string;
  manager_version: string;
  servers: Record<string, any>;
  total_tools: number;
  active_sessions: number;
}

export interface AICommandRequest {
  command: string;
  context?: Record<string, any>;
  session_id?: string;
}

export interface AICommandResponse {
  success: boolean;
  response?: MCPResponse;
  responses?: MCPResponse[];
  executed_command?: any;
  executed_commands?: any[];
  error?: string;
  command: string;
}

// MCP Service
class MCPService {
  // Core MCP Operations
  async request(method: string, params: any = {}): Promise<MCPResponse> {
    try {
      const response = await api.post("/mcp/request", {
        method,
        params,
        id: this.generateRequestId(),
      });
      return response.data;
    } catch (error) {
      console.error("MCP request failed:", error);
      throw error;
    }
  }

  async batchRequest(requests: MCPRequest[]): Promise<MCPResponse[]> {
    try {
      const response = await api.post("/mcp/batch", {
        requests: requests.map((req, index) => ({
          ...req,
          id: req.id || `batch_${index}_${Date.now()}`,
        })),
      });
      return response.data;
    } catch (error) {
      console.error("MCP batch request failed:", error);
      throw error;
    }
  }

  async execute(tool: string, args: any = {}): Promise<MCPResponse> {
    try {
      const response = await api.post("/mcp/execute", {
        tool,
        args,
        timestamp: Date.now(),
      });
      return response.data;
    } catch (error) {
      console.error("MCP execute failed:", error);
      throw error;
    }
  }

  // AI Command Interface
  async executeAICommand(
    command: string,
    context: Record<string, any> = {},
    sessionId?: string
  ): Promise<AICommandResponse> {
    const response = await api.post("/mcp/execute", {
      command,
      context,
      session_id: sessionId,
    });
    return response.data;
  }

  // System Information
  async getCapabilities(): Promise<MCPCapabilities> {
    const response = await api.get("/mcp/capabilities");
    return response.data;
  }

  async getServers(): Promise<MCPServer[]> {
    const response = await api.get("/mcp/servers");
    return response.data;
  }

  async getStatus(): Promise<MCPStatus> {
    const response = await api.get("/mcp/status");
    return response.data;
  }

  async getTools(): Promise<MCPTool[]> {
    const response = await api.get("/mcp/tools");
    return response.data;
  }

  // Session Management
  async createSession(config?: MCPSessionConfig): Promise<MCPSession> {
    const response = await api.post("/mcp/sessions", config || {});
    return response.data;
  }

  async getSession(sessionId: string): Promise<MCPSession> {
    const response = await api.get(`/mcp/sessions/${sessionId}`);
    return response.data;
  }

  async closeSession(sessionId: string): Promise<void> {
    await api.delete(`/mcp/sessions/${sessionId}`);
  }

  // Board MCP Operations
  async createBoard(
    name: string,
    description?: string,
    boardType?: string,
    context: Record<string, any> = {}
  ): Promise<any> {
    return this.request("create_board", {
      name,
      description,
      board_type: boardType,
      ...context,
    });
  }

  async analyzeBoard(boardId: number, analysisType?: string): Promise<any> {
    return this.request("analyze_board", {
      board_id: boardId,
      analysis_type: analysisType,
    });
  }

  async optimizeBoard(
    boardId: number,
    optimizationType?: string
  ): Promise<any> {
    return this.request("optimize_board", {
      board_id: boardId,
      optimization_type: optimizationType,
    });
  }

  async createCardFromText(
    boardId: number,
    text: string,
    columnId?: number
  ): Promise<any> {
    return this.request("create_card_from_text", {
      board_id: boardId,
      text,
      column_id: columnId,
    });
  }

  async getBoardSuggestions(
    boardId: number,
    suggestionType?: string
  ): Promise<any> {
    return this.request("get_suggestions", {
      board_id: boardId,
      suggestion_type: suggestionType,
    });
  }

  // Child Agent MCP Operations
  async createChildAgent(
    name: string,
    parentAgentId: number,
    role: string,
    boardId?: number,
    config: Record<string, any> = {}
  ): Promise<any> {
    return this.request("create_child_agent", {
      name,
      parent_agent_id: parentAgentId,
      specialized_role: role,
      assigned_board_id: boardId,
      ...config,
    });
  }

  async assignTask(
    agentId: number,
    taskType: string,
    description: string,
    taskData: Record<string, any> = {}
  ): Promise<any> {
    return this.request("assign_task", {
      child_agent_id: agentId,
      task_type: taskType,
      task_description: description,
      task_data: taskData,
    });
  }

  async executeAgentTask(taskId: number): Promise<any> {
    return this.request("execute_task", {
      task_id: taskId,
    });
  }

  async getAgentQueue(agentId: number): Promise<any> {
    return this.request("get_task_queue", {
      agent_id: agentId,
    });
  }

  async trainAgent(
    agentId: number,
    learningData: Record<string, any>
  ): Promise<any> {
    return this.request("add_learning", {
      agent_id: agentId,
      ...learningData,
    });
  }

  async getAgentAnalytics(agentId: number, days?: number): Promise<any> {
    return this.request("get_agent_analytics", {
      agent_id: agentId,
      days,
    });
  }

  async enableAgentAutoMode(
    agentId: number,
    schedule?: Record<string, any>
  ): Promise<any> {
    return this.request("enable_auto_mode", {
      agent_id: agentId,
      schedule,
    });
  }

  // Specialized Agent Creation
  async createBoardManager(
    name: string,
    parentAgentId: number,
    boardId: number,
    permissions?: Record<string, any>
  ): Promise<any> {
    return this.request("create_board_manager", {
      name,
      parent_agent_id: parentAgentId,
      board_id: boardId,
      permissions,
    });
  }

  async createTaskCreator(
    name: string,
    parentAgentId: number,
    boardId: number,
    taskTemplates?: Record<string, any>
  ): Promise<any> {
    return this.request("create_task_creator", {
      name,
      parent_agent_id: parentAgentId,
      board_id: boardId,
      task_templates: taskTemplates,
    });
  }

  async createAnalyst(
    name: string,
    parentAgentId: number,
    boardId?: number,
    analysisFocus?: string
  ): Promise<any> {
    return this.request("create_analyst", {
      name,
      parent_agent_id: parentAgentId,
      board_id: boardId,
      analysis_focus: analysisFocus,
    });
  }

  // Deployment MCP Operations
  async deployToHeroku(
    appName: string,
    sourceCodeUrl: string,
    environment: string = "production"
  ): Promise<any> {
    return this.request("deploy_to_heroku", {
      app_name: appName,
      source_code_url: sourceCodeUrl,
      environment,
    });
  }

  async deployToVercel(
    projectName: string,
    sourceCodeUrl: string,
    framework?: string
  ): Promise<any> {
    return this.request("deploy_to_vercel", {
      project_name: projectName,
      source_code_url: sourceCodeUrl,
      framework,
    });
  }

  async deployToAWS(
    serviceName: string,
    sourceCodeUrl: string,
    awsService: string = "ec2",
    region: string = "us-east-1"
  ): Promise<any> {
    return this.request("deploy_to_aws", {
      service_name: serviceName,
      source_code_url: sourceCodeUrl,
      aws_service: awsService,
      region,
    });
  }

  async deployToDocker(
    containerName: string,
    sourceCodeUrl: string,
    imageName?: string,
    registry: string = "dockerhub"
  ): Promise<any> {
    return this.request("deploy_to_docker", {
      container_name: containerName,
      source_code_url: sourceCodeUrl,
      image_name: imageName,
      registry,
    });
  }

  async getDeploymentStatus(deploymentId: string): Promise<any> {
    return this.request("get_deployment_status", {
      deployment_id: deploymentId,
    });
  }

  async getDeployments(): Promise<any> {
    return this.request("get_deployments", {});
  }

  async scaleDeployment(deploymentId: string, instances: number): Promise<any> {
    return this.request("scale_deployment", {
      deployment_id: deploymentId,
      instances,
    });
  }

  async configureDomain(deploymentId: string, domain: string): Promise<any> {
    return this.request("configure_domain", {
      deployment_id: deploymentId,
      domain,
    });
  }

  async rollbackDeployment(deploymentId: string): Promise<any> {
    return this.request("rollback_deployment", {
      deployment_id: deploymentId,
    });
  }

  // Natural Language Commands
  async naturalLanguageCommand(
    command: string,
    context: Record<string, any> = {}
  ): Promise<AICommandResponse> {
    return this.executeAICommand(command, context);
  }

  // Common AI Commands
  async aiCreateBoard(description: string): Promise<AICommandResponse> {
    return this.executeAICommand(`Create a board: ${description}`);
  }

  async aiCreateAgent(
    description: string,
    boardId?: number
  ): Promise<AICommandResponse> {
    const context = boardId ? { board_id: boardId } : {};
    return this.executeAICommand(`Create an agent: ${description}`, context);
  }

  async aiAnalyzeBoard(boardId: number): Promise<AICommandResponse> {
    return this.executeAICommand(
      `Analyze board performance and suggest improvements`,
      { board_id: boardId }
    );
  }

  async aiOptimizeWorkflow(boardId: number): Promise<AICommandResponse> {
    return this.executeAICommand(
      `Optimize the workflow for better productivity`,
      { board_id: boardId }
    );
  }

  async aiDeployProject(
    description: string,
    platform?: string
  ): Promise<AICommandResponse> {
    const context = platform ? { platform } : {};
    return this.executeAICommand(`Deploy project: ${description}`, context);
  }

  async aiGenerateReport(
    boardId: number,
    reportType?: string
  ): Promise<AICommandResponse> {
    const context = { board_id: boardId, report_type: reportType };
    return this.executeAICommand(`Generate a performance report`, context);
  }

  // Batch Operations
  async executeBatchCommands(
    commands: string[],
    context: Record<string, any> = {}
  ): Promise<AICommandResponse[]> {
    const requests: MCPRequest[] = commands.map((command) => ({
      server: "mcp_manager",
      method: "execute_ai_command",
      params: { command, context },
    }));

    const responses = await this.batchRequest(requests);
    return responses.map((response) => ({
      success: !response.error,
      response,
      command: "", // This would need to be tracked properly
      error: response.error?.message,
    }));
  }

  // Utilities
  async testConnection(): Promise<{
    status: string;
    servers: Record<string, string>;
  }> {
    const response = await api.get("/mcp/health");
    return response.data;
  }

  async getHelp(topic?: string): Promise<{ help: string; examples: string[] }> {
    const params = topic ? { topic } : {};
    const response = await api.get("/mcp/help", { params });
    return response.data;
  }

  // WebSocket for real-time updates (if implemented)
  connectToMCPUpdates(callback: (update: any) => void): WebSocket | null {
    if (typeof WebSocket !== "undefined") {
      const ws = new WebSocket(`ws://localhost:8000/mcp/ws`);

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          callback(update);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
      };

      return ws;
    }
    return null;
  }
}

export default new MCPService();

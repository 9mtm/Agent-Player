/**
 * Board Service - Frontend API Integration
 * Connects WorkflowBoard component with Backend Board APIs
 */

import { api } from "./api";

// Board Types - matching backend schemas
export interface BoardNode {
  id: string;
  board_id: string;
  node_type: string;
  label: string;
  description?: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  color?: string;
  icon?: string;
  config?: Record<string, any>;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  is_active?: boolean;
  is_start_node?: boolean;
  is_end_node?: boolean;
  execution_order?: number;
  created_at: string;
  updated_at: string;
}

export interface BoardConnection {
  id: string;
  board_id: string;
  source_node_id: string;
  target_node_id: string;
  source_port?: string;
  target_port?: string;
  connection_type?: string;
  color?: string;
  style?: string;
  condition?: string;
  condition_config?: Record<string, any>;
  is_active?: boolean;
  execution_order?: number;
  created_at: string;
  updated_at: string;
}

export interface Board {
  id: string;
  name: string;
  description?: string;
  user_id: number;
  agent_id?: number;
  board_type: string;
  status: string;
  visibility: string;
  zoom_level: number;
  pan_x: number;
  pan_y: number;
  connection_type: string;
  theme: string;
  board_data?: Record<string, any>;
  settings?: Record<string, any>;
  is_executable: boolean;
  execution_count: number;
  last_execution?: string;
  created_at: string;
  updated_at: string;
  nodes: BoardNode[];
  connections: BoardConnection[];
}

export interface CreateBoardRequest {
  name: string;
  description?: string;
  board_type?: string;
  status?: string;
  visibility?: string;
  zoom_level?: number;
  pan_x?: number;
  pan_y?: number;
  connection_type?: string;
  theme?: string;
  board_data?: Record<string, any>;
  settings?: Record<string, any>;
  is_executable?: boolean;
  agent_id?: number;
}

export interface UpdateBoardRequest {
  name?: string;
  description?: string;
  board_type?: string;
  status?: string;
  visibility?: string;
  zoom_level?: number;
  pan_x?: number;
  pan_y?: number;
  connection_type?: string;
  theme?: string;
  board_data?: Record<string, any>;
  settings?: Record<string, any>;
  is_executable?: boolean;
}

export interface CreateNodeRequest {
  node_type: string;
  label: string;
  description?: string;
  position_x: number;
  position_y: number;
  width?: number;
  height?: number;
  color?: string;
  icon?: string;
  config?: Record<string, any>;
  input_schema?: Record<string, any>;
  output_schema?: Record<string, any>;
  is_active?: boolean;
  is_start_node?: boolean;
  is_end_node?: boolean;
  execution_order?: number;
}

export interface CreateConnectionRequest {
  source_node_id: string;
  target_node_id: string;
  source_port?: string;
  target_port?: string;
  connection_type?: string;
  color?: string;
  style?: string;
  condition?: string;
  condition_config?: Record<string, any>;
  is_active?: boolean;
  execution_order?: number;
}

export interface BoardSearchParams {
  query?: string;
  board_type?: string;
  status?: string;
  visibility?: string;
  agent_id?: number;
  skip?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: string;
}

export interface BoardsListResponse {
  boards: Board[];
  total: number;
  page: number;
  pages: number;
  has_next: boolean;
}

export interface BoardExecution {
  id: string;
  board_id: string;
  user_id: number;
  status: string;
  execution_type: string;
  trigger_data?: Record<string, any>;
  total_nodes: number;
  completed_nodes: number;
  failed_nodes: number;
  execution_time_ms?: number;
  result_data?: Record<string, any>;
  error_message?: string;
  execution_log?: Record<string, any>;
  started_at: string;
  completed_at?: string;
  created_at: string;
}

class BoardService {
  private baseUrl = "/workflows";

  // Board CRUD Operations
  async getBoards(params?: BoardSearchParams): Promise<BoardsListResponse> {
    const searchParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
    }

    const response = await api.get(`${this.baseUrl}/boards?${searchParams}`);
    return response.data;
  }

  async getBoard(boardId: string): Promise<Board> {
    const response = await api.get(`${this.baseUrl}/boards/${boardId}`);
    return response.data;
  }

  async createBoard(boardData: CreateBoardRequest): Promise<Board> {
    const response = await api.post(`${this.baseUrl}/boards`, boardData);
    return response.data;
  }

  async updateBoard(
    boardId: string,
    boardData: UpdateBoardRequest
  ): Promise<Board> {
    const response = await api.put(
      `${this.baseUrl}/boards/${boardId}`,
      boardData
    );
    return response.data;
  }

  async deleteBoard(boardId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/boards/${boardId}`);
  }

  // Node Operations
  async createNode(
    boardId: string,
    nodeData: CreateNodeRequest
  ): Promise<BoardNode> {
    const response = await api.post(
      `${this.baseUrl}/boards/${boardId}/nodes`,
      nodeData
    );
    return response.data;
  }

  async updateNode(
    boardId: string,
    nodeId: string,
    nodeData: Partial<CreateNodeRequest>
  ): Promise<BoardNode> {
    const response = await api.put(
      `${this.baseUrl}/boards/${boardId}/nodes/${nodeId}`,
      nodeData
    );
    return response.data;
  }

  async deleteNode(boardId: string, nodeId: string): Promise<void> {
    await api.delete(`${this.baseUrl}/boards/${boardId}/nodes/${nodeId}`);
  }

  // Connection Operations
  async createConnection(
    boardId: string,
    connectionData: CreateConnectionRequest
  ): Promise<BoardConnection> {
    const response = await api.post(
      `${this.baseUrl}/boards/${boardId}/connections`,
      connectionData
    );
    return response.data;
  }

  async deleteConnection(boardId: string, connectionId: string): Promise<void> {
    await api.delete(
      `${this.baseUrl}/boards/${boardId}/connections/${connectionId}`
    );
  }

  // Board Execution
  async executeBoard(
    boardId: string,
    executionType: string = "manual",
    triggerData?: Record<string, any>
  ): Promise<BoardExecution> {
    const response = await api.post(
      `${this.baseUrl}/boards/${boardId}/execute`,
      {
        execution_type: executionType,
        trigger_data: triggerData,
      }
    );
    return response.data;
  }

  // Board Statistics
  async getBoardStats(boardId: string): Promise<any> {
    const response = await api.get(`${this.baseUrl}/boards/${boardId}/stats`);
    return response.data;
  }

  // Utility Methods for Frontend Integration

  /**
   * Convert Frontend WorkflowNode to Backend CreateNodeRequest
   */
  convertNodeToCreateRequest(node: any): CreateNodeRequest {
    return {
      node_type: node.type,
      label: node.label,
      description: node.description,
      position_x: node.x,
      position_y: node.y,
      width: node.width || 120,
      height: node.height || 60,
      color: node.color,
      icon: node.icon,
      config: node.config,
      is_start_node: node.isStartNode || false,
      is_end_node: node.isEndNode || false,
      is_active: true,
    };
  }

  /**
   * Convert Frontend WorkflowConnection to Backend CreateConnectionRequest
   */
  convertConnectionToCreateRequest(connection: any): CreateConnectionRequest {
    return {
      source_node_id: connection.source,
      target_node_id: connection.target,
      source_port: connection.sourcePort,
      target_port: connection.targetPort,
      connection_type: connection.type || "data",
      color: connection.color || "#667eea",
      style: connection.style || "solid",
      is_active: true,
    };
  }

  /**
   * Convert Backend Board to Frontend format
   */
  convertBoardToFrontend(board: Board): any {
    return {
      id: board.id,
      name: board.name,
      description: board.description,
      zoom: board.zoom_level,
      pan: {
        x: board.pan_x,
        y: board.pan_y,
      },
      connectionType: board.connection_type,
      theme: board.theme,
      nodes: board.nodes.map((node) => ({
        id: node.id,
        x: node.position_x,
        y: node.position_y,
        label: node.label,
        type: node.node_type,
        color: node.color,
        icon: node.icon,
        config: node.config,
        width: node.width,
        height: node.height,
        isStartNode: node.is_start_node,
        isEndNode: node.is_end_node,
        isActive: node.is_active,
      })),
      connections: board.connections.map((conn) => ({
        id: conn.id,
        source: conn.source_node_id,
        target: conn.target_node_id,
        sourcePort: conn.source_port,
        targetPort: conn.target_port,
        type: conn.connection_type,
        color: conn.color,
        style: conn.style,
        isActive: conn.is_active,
      })),
      settings: board.settings,
      boardData: board.board_data,
      isExecutable: board.is_executable,
      executionCount: board.execution_count,
      lastExecution: board.last_execution,
      createdAt: board.created_at,
      updatedAt: board.updated_at,
    };
  }

  /**
   * Save entire board state to backend
   */
  async saveBoardState(boardId: string, boardState: any): Promise<Board> {
    const updateData: UpdateBoardRequest = {
      zoom_level: boardState.zoom,
      pan_x: boardState.pan?.x || 0,
      pan_y: boardState.pan?.y || 0,
      connection_type: boardState.connectionType,
      theme: boardState.theme,
      board_data: boardState.boardData,
      settings: boardState.settings,
    };

    return await this.updateBoard(boardId, updateData);
  }

  /**
   * Load board state from backend
   */
  async loadBoardState(boardId: string): Promise<any> {
    const board = await this.getBoard(boardId);
    return this.convertBoardToFrontend(board);
  }

  /**
   * Auto-save board state (debounced)
   */
  private autoSaveTimeout?: NodeJS.Timeout;

  autoSaveBoardState(
    boardId: string,
    boardState: any,
    delay: number = 2000
  ): void {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(async () => {
      try {
        await this.saveBoardState(boardId, boardState);
        console.log("Board auto-saved successfully");
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, delay);
  }

  /**
   * Sync nodes with backend
   */
  async syncNodes(boardId: string, frontendNodes: any[]): Promise<void> {
    const board = await this.getBoard(boardId);
    const backendNodeIds = new Set(board.nodes.map((n) => n.id));
    const frontendNodeIds = new Set(frontendNodes.map((n) => n.id));

    // Create new nodes
    for (const node of frontendNodes) {
      if (!backendNodeIds.has(node.id)) {
        await this.createNode(boardId, this.convertNodeToCreateRequest(node));
      }
    }

    // Delete removed nodes
    for (const nodeId of backendNodeIds) {
      if (!frontendNodeIds.has(nodeId)) {
        await this.deleteNode(boardId, nodeId);
      }
    }

    // Update existing nodes (position changes, etc.)
    for (const node of frontendNodes) {
      if (backendNodeIds.has(node.id)) {
        await this.updateNode(boardId, node.id, {
          position_x: node.x,
          position_y: node.y,
          label: node.label,
          color: node.color,
        });
      }
    }
  }

  /**
   * Sync connections with backend
   */
  async syncConnections(
    boardId: string,
    frontendConnections: any[]
  ): Promise<void> {
    const board = await this.getBoard(boardId);
    const backendConnectionIds = new Set(board.connections.map((c) => c.id));
    const frontendConnectionIds = new Set(frontendConnections.map((c) => c.id));

    // Create new connections
    for (const connection of frontendConnections) {
      if (!backendConnectionIds.has(connection.id)) {
        await this.createConnection(
          boardId,
          this.convertConnectionToCreateRequest(connection)
        );
      }
    }

    // Delete removed connections
    for (const connectionId of backendConnectionIds) {
      if (!frontendConnectionIds.has(connectionId)) {
        await this.deleteConnection(boardId, connectionId);
      }
    }
  }
}

// Export singleton instance
export const boardService = new BoardService();
export default boardService;

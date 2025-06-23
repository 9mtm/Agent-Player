import api from "./api";

// Board Types
export interface Board {
  id: number;
  name: string;
  description?: string;
  board_type: string;
  is_public: boolean;
  is_template: boolean;
  template_id?: number;
  owner_id: number;
  settings: Record<string, any>;
  metadata: Record<string, any>;

  // Performance metrics
  total_cards: number;
  completed_cards: number;
  active_members: number;
  last_activity?: string;

  // Timestamps
  created_at: string;
  updated_at: string;
}

export interface BoardColumn {
  id: number;
  board_id: number;
  name: string;
  position: number;
  color?: string;
  wip_limit?: number;
  is_done_column: boolean;
  column_type: string;
  settings: Record<string, any>;
  card_count: number;
  created_at: string;
  updated_at: string;
}

export interface BoardCard {
  id: number;
  board_id: number;
  column_id: number;
  title: string;
  description?: string;
  type: string;
  priority: string;
  position: number;

  // Assignment and tracking
  assignee_id?: number;
  reporter_id?: number;
  due_date?: string;
  estimated_hours?: number;
  actual_hours?: number;

  // Metadata
  tags: string[];
  labels: string[];
  custom_fields: Record<string, any>;
  metadata: Record<string, any>;

  // Status tracking
  status: string;
  completion_percentage: number;

  // Timestamps
  created_at: string;
  updated_at: string;
  completed_at?: string;
}

export interface BoardMember {
  id: number;
  board_id: number;
  user_id: number;
  role: string;
  permissions: Record<string, boolean>;
  joined_at: string;
  last_activity?: string;
}

export interface BoardActivity {
  id: number;
  board_id: number;
  user_id: number;
  activity_type: string;
  activity_data: Record<string, any>;
  target_type?: string;
  target_id?: number;
  description: string;
  metadata: Record<string, any>;
  created_at: string;
}

// Request/Response Types
export interface CreateBoardRequest {
  name: string;
  description?: string;
  board_type?: string;
  is_public?: boolean;
  template_id?: number;
  settings?: Record<string, any>;
}

export interface UpdateBoardRequest extends Partial<CreateBoardRequest> {
  is_template?: boolean;
}

export interface CreateColumnRequest {
  name: string;
  position?: number;
  color?: string;
  wip_limit?: number;
  is_done_column?: boolean;
  column_type?: string;
  settings?: Record<string, any>;
}

export interface CreateCardRequest {
  column_id: number;
  title: string;
  description?: string;
  type?: string;
  priority?: string;
  position?: number;
  assignee_id?: number;
  due_date?: string;
  estimated_hours?: number;
  tags?: string[];
  labels?: string[];
  custom_fields?: Record<string, any>;
}

export interface MoveCardRequest {
  target_column_id: number;
  position: number;
}

export interface BoardListParams {
  skip?: number;
  limit?: number;
  board_type?: string;
  is_public?: boolean;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface BoardAnalytics {
  board_id: number;
  period_days: number;
  total_cards: number;
  completed_cards: number;
  active_cards: number;
  overdue_cards: number;
  completion_rate: number;
  average_completion_time: number;
  velocity: number;
  cycle_time: number;
  lead_time: number;
  throughput: number;
  wip_ratio: number;
  daily_stats: Record<string, any>[];
  column_stats: Record<string, any>[];
  member_stats: Record<string, any>[];
  generated_at: string;
}

// Boards Service - Updated to use new unified API structure
class BoardsService {
  // Board Management
  async getBoards(
    params: BoardListParams = {}
  ): Promise<{ boards: Board[]; total: number; page: number; limit: number }> {
    const response = await api.get("/boards", { params });
    return response.data;
  }

  async getBoard(id: number): Promise<Board> {
    const response = await api.get(`/boards/${id}`);
    return response.data;
  }

  async createBoard(boardData: CreateBoardRequest): Promise<Board> {
    const response = await api.post("/boards", boardData);
    return response.data;
  }

  async updateBoard(id: number, boardData: UpdateBoardRequest): Promise<Board> {
    const response = await api.put(`/boards/${id}`, boardData);
    return response.data;
  }

  async deleteBoard(id: number): Promise<void> {
    await api.delete(`/boards/${id}`);
  }

  async duplicateBoard(id: number, name?: string): Promise<Board> {
    const response = await api.post(`/boards/${id}/duplicate`, { name });
    return response.data;
  }

  // Column Management
  async getColumns(boardId: number): Promise<BoardColumn[]> {
    const response = await api.get(`/boards/${boardId}/columns`);
    return response.data;
  }

  async createColumn(
    boardId: number,
    columnData: CreateColumnRequest
  ): Promise<BoardColumn> {
    const response = await api.post(`/boards/${boardId}/columns`, columnData);
    return response.data;
  }

  async updateColumn(
    boardId: number,
    columnId: number,
    columnData: Partial<CreateColumnRequest>
  ): Promise<BoardColumn> {
    const response = await api.put(
      `/boards/${boardId}/columns/${columnId}`,
      columnData
    );
    return response.data;
  }

  async deleteColumn(boardId: number, columnId: number): Promise<void> {
    await api.delete(`/boards/${boardId}/columns/${columnId}`);
  }

  async reorderColumns(
    boardId: number,
    columnOrders: { id: number; position: number }[]
  ): Promise<void> {
    await api.post(`/boards/${boardId}/columns/reorder`, {
      columns: columnOrders,
    });
  }

  // Card Management
  async getCards(boardId: number, columnId?: number): Promise<BoardCard[]> {
    const params = columnId ? { column_id: columnId } : {};
    const response = await api.get(`/boards/${boardId}/cards`, {
      params,
    });
    return response.data;
  }

  async getCard(boardId: number, cardId: number): Promise<BoardCard> {
    const response = await api.get(`/boards/${boardId}/cards/${cardId}`);
    return response.data;
  }

  async createCard(
    boardId: number,
    cardData: CreateCardRequest
  ): Promise<BoardCard> {
    const response = await api.post(`/boards/${boardId}/cards`, cardData);
    return response.data;
  }

  async updateCard(
    boardId: number,
    cardId: number,
    cardData: Partial<CreateCardRequest>
  ): Promise<BoardCard> {
    const response = await api.put(
      `/boards/${boardId}/cards/${cardId}`,
      cardData
    );
    return response.data;
  }

  async deleteCard(boardId: number, cardId: number): Promise<void> {
    await api.delete(`/boards/${boardId}/cards/${cardId}`);
  }

  async moveCard(
    boardId: number,
    cardId: number,
    moveData: MoveCardRequest
  ): Promise<BoardCard> {
    const response = await api.post(
      `/boards/${boardId}/cards/${cardId}/move`,
      moveData
    );
    return response.data;
  }

  async bulkMoveCards(
    boardId: number,
    moves: { card_id: number; target_column_id: number; position: number }[]
  ): Promise<void> {
    await api.post(`/boards/${boardId}/cards/bulk-move`, { moves });
  }

  // Member Management
  async getMembers(boardId: number): Promise<BoardMember[]> {
    const response = await api.get(`/boards/${boardId}/members`);
    return response.data;
  }

  async addMember(
    boardId: number,
    userId: number,
    role: string = "member"
  ): Promise<BoardMember> {
    const response = await api.post(`/boards/${boardId}/members`, {
      user_id: userId,
      role,
    });
    return response.data;
  }

  async updateMemberRole(
    boardId: number,
    memberId: number,
    role: string,
    permissions?: Record<string, boolean>
  ): Promise<BoardMember> {
    const response = await api.put(`/boards/${boardId}/members/${memberId}`, {
      role,
      permissions,
    });
    return response.data;
  }

  async removeMember(boardId: number, memberId: number): Promise<void> {
    await api.delete(`/boards/${boardId}/members/${memberId}`);
  }

  // Activity and History
  async getActivities(
    boardId: number,
    limit: number = 50
  ): Promise<BoardActivity[]> {
    const response = await api.get(`/boards/${boardId}/activities`, {
      params: { limit },
    });
    return response.data;
  }

  async getCardActivities(
    boardId: number,
    cardId: number
  ): Promise<BoardActivity[]> {
    const response = await api.get(
      `/boards/${boardId}/cards/${cardId}/activities`
    );
    return response.data;
  }

  // Analytics and Reports
  async getBoardAnalytics(
    boardId: number,
    days: number = 30
  ): Promise<BoardAnalytics> {
    const response = await api.get(`/boards/${boardId}/analytics`, {
      params: { days },
    });
    return response.data;
  }

  async exportBoard(
    boardId: number,
    format: "json" | "csv" | "xlsx" = "json"
  ): Promise<Blob> {
    const response = await api.get(`/boards/${boardId}/export`, {
      params: { format },
      responseType: "blob",
    });
    return response.data;
  }

  async generateReport(
    boardId: number,
    reportType: string,
    params: Record<string, any> = {}
  ): Promise<any> {
    const response = await api.post(`/boards/${boardId}/reports`, {
      report_type: reportType,
      ...params,
    });
    return response.data;
  }

  // Templates
  async getBoardTemplates(): Promise<Board[]> {
    const response = await api.get("/boards/templates");
    return response.data;
  }

  async createFromTemplate(
    templateId: number,
    name: string,
    description?: string
  ): Promise<Board> {
    const response = await api.post("/boards/create-from-template", {
      template_id: templateId,
      name,
      description,
    });
    return response.data;
  }

  async saveAsTemplate(
    boardId: number,
    templateName: string,
    description?: string
  ): Promise<Board> {
    const response = await api.post(`/boards/${boardId}/save-as-template`, {
      name: templateName,
      description,
    });
    return response.data;
  }

  // AI Features
  async getAISuggestions(boardId: number, cardId?: number): Promise<any> {
    const params = cardId ? { card_id: cardId } : {};
    const response = await api.get(`/boards/${boardId}/ai/suggestions`, {
      params,
    });
    return response.data;
  }

  async createCardFromText(
    boardId: number,
    text: string,
    columnId?: number
  ): Promise<BoardCard> {
    const response = await api.post(
      `/boards/${boardId}/ai/create-card-from-text`,
      {
        text,
        column_id: columnId,
      }
    );
    return response.data;
  }

  async optimizeBoard(boardId: number): Promise<any> {
    const response = await api.post(`/boards/${boardId}/ai/optimize`);
    return response.data;
  }

  async analyzePerformance(boardId: number): Promise<any> {
    const response = await api.get(`/boards/${boardId}/ai/analyze`);
    return response.data;
  }

  // Real-time features (WebSocket would be handled separately)
  async joinBoard(boardId: number): Promise<void> {
    await api.post(`/boards/${boardId}/join`);
  }

  async leaveBoard(boardId: number): Promise<void> {
    await api.post(`/boards/${boardId}/leave`);
  }

  // Search
  async searchCards(
    boardId: number,
    query: string,
    filters: Record<string, any> = {}
  ): Promise<BoardCard[]> {
    const response = await api.get(`/boards/${boardId}/search`, {
      params: { q: query, ...filters },
    });
    return response.data;
  }

  // Bulk Operations
  async bulkUpdateCards(
    boardId: number,
    updates: { card_id: number; updates: Partial<CreateCardRequest> }[]
  ): Promise<void> {
    await api.post(`/boards/${boardId}/cards/bulk-update`, { updates });
  }

  async bulkDeleteCards(boardId: number, cardIds: number[]): Promise<void> {
    await api.post(`/boards/${boardId}/cards/bulk-delete`, {
      card_ids: cardIds,
    });
  }
}

export default new BoardsService();

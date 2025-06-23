import { removeAuthToken } from "./api";

// WebSocket Event Types
export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp: string;
  session_id?: string;
  user_id?: number;
}

export interface UserPresence {
  user_id: number;
  username: string;
  board_id?: number;
  last_seen: string;
  cursor_position?: { x: number; y: number };
  current_card?: number;
  status: "online" | "idle" | "away";
}

export interface BoardCollaboration {
  board_id: number;
  active_users: UserPresence[];
  card_locks: Record<number, { user_id: number; locked_at: string }>;
  typing_indicators: Record<number, { user_id: number; typing_at: string }>;
}

export interface LiveUpdate {
  type:
    | "card_moved"
    | "card_created"
    | "card_updated"
    | "card_deleted"
    | "column_created"
    | "column_updated"
    | "member_joined"
    | "member_left";
  board_id: number;
  data: any;
  user_id: number;
  timestamp: string;
}

export interface CursorUpdate {
  user_id: number;
  board_id: number;
  x: number;
  y: number;
  timestamp: string;
}

export interface TypingIndicator {
  user_id: number;
  card_id: number;
  typing: boolean;
  timestamp: string;
}

// Event Types Constants
export const WS_EVENTS = {
  // Connection events
  CONNECT: "connect",
  DISCONNECT: "disconnect",
  RECONNECT: "reconnect",
  ERROR: "error",

  // Board events
  JOIN_BOARD: "join_board",
  LEAVE_BOARD: "leave_board",
  BOARD_UPDATE: "board_update",

  // Card events
  CARD_MOVED: "card_moved",
  CARD_CREATED: "card_created",
  CARD_UPDATED: "card_updated",
  CARD_DELETED: "card_deleted",
  CARD_LOCKED: "card_locked",
  CARD_UNLOCKED: "card_unlocked",

  // Column events
  COLUMN_CREATED: "column_created",
  COLUMN_UPDATED: "column_updated",
  COLUMN_DELETED: "column_deleted",
  COLUMN_REORDERED: "column_reordered",

  // User presence
  USER_JOINED: "user_joined",
  USER_LEFT: "user_left",
  USER_PRESENCE_UPDATE: "user_presence_update",
  CURSOR_UPDATE: "cursor_update",
  TYPING_START: "typing_start",
  TYPING_STOP: "typing_stop",

  // Agent events
  AGENT_CREATED: "agent_created",
  AGENT_UPDATED: "agent_updated",
  AGENT_TASK_ASSIGNED: "agent_task_assigned",
  AGENT_TASK_COMPLETED: "agent_task_completed",

  // Workflow events
  WORKFLOW_EXECUTED: "workflow_executed",
  WORKFLOW_COMPLETED: "workflow_completed",
  WORKFLOW_FAILED: "workflow_failed",

  // System events
  SYSTEM_MESSAGE: "system_message",
  NOTIFICATION: "notification",
} as const;

export type WSEventType = (typeof WS_EVENTS)[keyof typeof WS_EVENTS];

// Callback Types
export type WSCallback = (message: WebSocketMessage) => void;
export type WSErrorCallback = (error: Event) => void;
export type WSCloseCallback = (event: CloseEvent) => void;

// WebSocket Service
class WebSocketService {
  private ws: WebSocket | null = null;
  private listeners: Map<WSEventType, Set<WSCallback>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private isConnecting = false;
  private currentBoardId: number | null = null;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionPromise: Promise<void> | null = null;

  // Connection Management
  async connect(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    this.connectionPromise = this._connect();
    return this.connectionPromise;
  }

  private async _connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      if (this.isConnecting) {
        return;
      }

      this.isConnecting = true;
      const token = localStorage.getItem("access_token");

      if (!token) {
        this.isConnecting = false;
        reject(new Error("No authentication token found"));
        return;
      }

      // Create WebSocket connection with auth token
      const wsUrl = `ws://localhost:8000/api/v1/ws?token=${token}`;
      this.ws = new WebSocket(wsUrl);

      const connectTimeout = setTimeout(() => {
        if (this.ws?.readyState !== WebSocket.OPEN) {
          this.ws?.close();
          this.isConnecting = false;
          reject(new Error("WebSocket connection timeout"));
        }
      }, 10000);

      this.ws.onopen = () => {
        clearTimeout(connectTimeout);
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.startHeartbeat();
        this.emit(WS_EVENTS.CONNECT, { connected: true });
        console.log("WebSocket connected");
        resolve();
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onerror = (error) => {
        clearTimeout(connectTimeout);
        this.isConnecting = false;
        console.error("WebSocket error:", error);
        this.emit(WS_EVENTS.ERROR, { error });
        reject(error);
      };

      this.ws.onclose = (event) => {
        clearTimeout(connectTimeout);
        this.isConnecting = false;
        this.stopHeartbeat();
        console.log("WebSocket closed:", event);
        this.emit(WS_EVENTS.DISCONNECT, { event });

        // Auto reconnect if not a clean close
        if (event.code !== 1000 && event.code !== 1001) {
          this.handleReconnect();
        }
      };
    });
  }

  disconnect(): void {
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }
    this.currentBoardId = null;
    this.connectionPromise = null;
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("Max reconnection attempts reached");
      this.emit(WS_EVENTS.ERROR, {
        error: "Max reconnection attempts reached",
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`
    );

    setTimeout(() => {
      this.connect()
        .then(() => {
          this.emit(WS_EVENTS.RECONNECT, { attempts: this.reconnectAttempts });

          // Rejoin current board if any
          if (this.currentBoardId) {
            this.joinBoard(this.currentBoardId);
          }
        })
        .catch((error) => {
          console.error("Reconnection failed:", error);
        });
    }, delay);
  }

  // Event Handling
  private handleMessage(message: WebSocketMessage): void {
    const listeners = this.listeners.get(message.type as WSEventType);
    if (listeners) {
      listeners.forEach((callback) => callback(message));
    }
  }

  private emit(type: WSEventType, data: any): void {
    const message: WebSocketMessage = {
      type,
      data,
      timestamp: new Date().toISOString(),
    };
    this.handleMessage(message);
  }

  // Event Listeners
  on(event: WSEventType, callback: WSCallback): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: WSEventType, callback: WSCallback): void {
    const listeners = this.listeners.get(event);
    if (listeners) {
      listeners.delete(callback);
      if (listeners.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  // Send Messages
  private send(message: any): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket not connected, message not sent:", message);
    }
  }

  // Board Collaboration
  async joinBoard(boardId: number): Promise<void> {
    await this.connect();
    this.currentBoardId = boardId;
    this.send({
      type: WS_EVENTS.JOIN_BOARD,
      data: { board_id: boardId },
      timestamp: new Date().toISOString(),
    });
  }

  leaveBoard(boardId: number): void {
    this.send({
      type: WS_EVENTS.LEAVE_BOARD,
      data: { board_id: boardId },
      timestamp: new Date().toISOString(),
    });

    if (this.currentBoardId === boardId) {
      this.currentBoardId = null;
    }
  }

  // Card Operations
  broadcastCardMove(
    boardId: number,
    cardId: number,
    fromColumnId: number,
    toColumnId: number,
    position: number
  ): void {
    this.send({
      type: WS_EVENTS.CARD_MOVED,
      data: {
        board_id: boardId,
        card_id: cardId,
        from_column_id: fromColumnId,
        to_column_id: toColumnId,
        position,
      },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastCardCreate(boardId: number, card: any): void {
    this.send({
      type: WS_EVENTS.CARD_CREATED,
      data: {
        board_id: boardId,
        card,
      },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastCardUpdate(boardId: number, cardId: number, updates: any): void {
    this.send({
      type: WS_EVENTS.CARD_UPDATED,
      data: {
        board_id: boardId,
        card_id: cardId,
        updates,
      },
      timestamp: new Date().toISOString(),
    });
  }

  broadcastCardDelete(boardId: number, cardId: number): void {
    this.send({
      type: WS_EVENTS.CARD_DELETED,
      data: {
        board_id: boardId,
        card_id: cardId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Card Locking
  lockCard(boardId: number, cardId: number): void {
    this.send({
      type: WS_EVENTS.CARD_LOCKED,
      data: {
        board_id: boardId,
        card_id: cardId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  unlockCard(boardId: number, cardId: number): void {
    this.send({
      type: WS_EVENTS.CARD_UNLOCKED,
      data: {
        board_id: boardId,
        card_id: cardId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // User Presence
  updateCursor(boardId: number, x: number, y: number): void {
    this.send({
      type: WS_EVENTS.CURSOR_UPDATE,
      data: {
        board_id: boardId,
        x,
        y,
      },
      timestamp: new Date().toISOString(),
    });
  }

  startTyping(cardId: number): void {
    this.send({
      type: WS_EVENTS.TYPING_START,
      data: {
        card_id: cardId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  stopTyping(cardId: number): void {
    this.send({
      type: WS_EVENTS.TYPING_STOP,
      data: {
        card_id: cardId,
      },
      timestamp: new Date().toISOString(),
    });
  }

  updatePresence(
    status: "online" | "idle" | "away",
    additionalData?: any
  ): void {
    this.send({
      type: WS_EVENTS.USER_PRESENCE_UPDATE,
      data: {
        status,
        ...additionalData,
      },
      timestamp: new Date().toISOString(),
    });
  }

  // Heartbeat
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: "ping",
          timestamp: new Date().toISOString(),
        });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Utility Methods
  getConnectionState(): string {
    if (!this.ws) return "disconnected";

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return "connecting";
      case WebSocket.OPEN:
        return "connected";
      case WebSocket.CLOSING:
        return "disconnecting";
      case WebSocket.CLOSED:
        return "disconnected";
      default:
        return "unknown";
    }
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getCurrentBoardId(): number | null {
    return this.currentBoardId;
  }

  // Cleanup
  destroy(): void {
    this.disconnect();
    this.listeners.clear();
    this.reconnectAttempts = 0;
  }
}

// Create and export singleton instance
export const websocketService = new WebSocketService();

// Auto-connect when user is authenticated
const token = localStorage.getItem("access_token");
if (token) {
  websocketService.connect().catch((error) => {
    console.warn("Auto WebSocket connection failed:", error);
  });
}

// Auto-disconnect when user logs out
window.addEventListener("storage", (event) => {
  if (event.key === "access_token" && !event.newValue) {
    websocketService.disconnect();
  }
});

export default websocketService;

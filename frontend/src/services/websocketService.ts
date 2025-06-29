/**
 * WebSocket Service
 * Handles real-time chat communication with automatic reconnection
 */

export interface WebSocketMessage {
  type:
    | "new_message"
    | "typing"
    | "user_joined"
    | "user_left"
    | "error"
    | "connection_status";
  data?: any;
  conversation_id?: string;
  user_id?: string;
  timestamp?: string;
}

export interface TypingIndicator {
  user_id: string;
  is_typing: boolean;
  conversation_id: string;
}

class WebSocketService {
  private ws: WebSocket | null = null;
  private conversationId: string | null = null;
  private messageHandlers: ((message: WebSocketMessage) => void)[] = [];
  private connectionHandlers: ((connected: boolean) => void)[] = [];
  private typingHandlers: ((typing: TypingIndicator) => void)[] = [];
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 3000; // 3 seconds
  private isManualDisconnect = false;

  private getAuthToken(): string {
    return localStorage.getItem("authToken") || "demo_token";
  }

  connect(conversationId: string): void {
    this.conversationId = conversationId;
    this.isManualDisconnect = false;

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log("WebSocket already connected");
      return;
    }

    const token = this.getAuthToken();
    const wsUrl = `ws://localhost:8000/chat/ws/${conversationId}?token=${token}`;

    try {
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = () => {
        console.log(`WebSocket connected to conversation ${conversationId}`);
        this.reconnectAttempts = 0;
        this.notifyConnectionHandlers(true);
      };

      this.ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error("Error parsing WebSocket message:", error);
        }
      };

      this.ws.onclose = (event) => {
        console.log("WebSocket connection closed:", event.code, event.reason);
        this.notifyConnectionHandlers(false);

        if (
          !this.isManualDisconnect &&
          this.reconnectAttempts < this.maxReconnectAttempts
        ) {
          this.attemptReconnect();
        }
      };

      this.ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        this.notifyConnectionHandlers(false);
      };
    } catch (error) {
      console.error("Error creating WebSocket connection:", error);
      this.notifyConnectionHandlers(false);
    }
  }

  private attemptReconnect(): void {
    this.reconnectAttempts++;
    console.log(
      `Attempting to reconnect... (${this.reconnectAttempts}/${this.maxReconnectAttempts})`
    );

    setTimeout(() => {
      if (this.conversationId && !this.isManualDisconnect) {
        this.connect(this.conversationId);
      }
    }, this.reconnectInterval * this.reconnectAttempts);
  }

  disconnect(): void {
    this.isManualDisconnect = true;

    if (this.ws) {
      this.ws.close(1000, "Manual disconnect");
      this.ws = null;
    }

    this.conversationId = null;
    this.notifyConnectionHandlers(false);
  }

  sendMessage(message: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const messageWithTimestamp = {
        ...message,
        timestamp: new Date().toISOString(),
      };

      this.ws.send(JSON.stringify(messageWithTimestamp));
    } else {
      console.error("WebSocket is not connected");
    }
  }

  sendTypingIndicator(isTyping: boolean): void {
    if (
      this.ws &&
      this.ws.readyState === WebSocket.OPEN &&
      this.conversationId
    ) {
      this.sendMessage({
        type: "typing",
        data: {
          is_typing: isTyping,
          conversation_id: this.conversationId,
        },
      });
    }
  }

  private handleMessage(message: WebSocketMessage): void {
    switch (message.type) {
      case "new_message":
        this.notifyMessageHandlers(message);
        break;

      case "typing":
        if (message.data) {
          this.notifyTypingHandlers(message.data);
        }
        break;

      case "user_joined":
      case "user_left":
        console.log(`User ${message.type}:`, message.data);
        this.notifyMessageHandlers(message);
        break;

      case "error":
        console.error("WebSocket error message:", message.data);
        break;

      case "connection_status":
        console.log("Connection status:", message.data);
        break;

      default:
        console.log("Unknown WebSocket message type:", message.type);
        this.notifyMessageHandlers(message);
    }
  }

  private notifyMessageHandlers(message: WebSocketMessage): void {
    this.messageHandlers.forEach((handler) => {
      try {
        handler(message);
      } catch (error) {
        console.error("Error in message handler:", error);
      }
    });
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach((handler) => {
      try {
        handler(connected);
      } catch (error) {
        console.error("Error in connection handler:", error);
      }
    });
  }

  private notifyTypingHandlers(typing: TypingIndicator): void {
    this.typingHandlers.forEach((handler) => {
      try {
        handler(typing);
      } catch (error) {
        console.error("Error in typing handler:", error);
      }
    });
  }

  // Event handlers
  onMessage(handler: (message: WebSocketMessage) => void): () => void {
    this.messageHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.messageHandlers.indexOf(handler);
      if (index > -1) {
        this.messageHandlers.splice(index, 1);
      }
    };
  }

  onConnectionChange(handler: (connected: boolean) => void): () => void {
    this.connectionHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.connectionHandlers.indexOf(handler);
      if (index > -1) {
        this.connectionHandlers.splice(index, 1);
      }
    };
  }

  onTyping(handler: (typing: TypingIndicator) => void): () => void {
    this.typingHandlers.push(handler);

    // Return unsubscribe function
    return () => {
      const index = this.typingHandlers.indexOf(handler);
      if (index > -1) {
        this.typingHandlers.splice(index, 1);
      }
    };
  }

  // Utility methods
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  getConnectionState(): number {
    return this.ws ? this.ws.readyState : WebSocket.CLOSED;
  }

  getCurrentConversationId(): string | null {
    return this.conversationId;
  }

  // Heartbeat to keep connection alive
  private heartbeatInterval: number | null = null;

  startHeartbeat(intervalMs: number = 30000): void {
    this.stopHeartbeat();

    this.heartbeatInterval = window.setInterval(() => {
      if (this.isConnected()) {
        this.sendMessage({
          type: "heartbeat",
          timestamp: new Date().toISOString(),
        });
      }
    }, intervalMs);
  }

  stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Clean up on page unload
  cleanup(): void {
    this.stopHeartbeat();
    this.disconnect();
    this.messageHandlers = [];
    this.connectionHandlers = [];
    this.typingHandlers = [];
  }
}

// Create and export singleton instance
const websocketService = new WebSocketService();

// Auto-cleanup on page unload
if (typeof window !== "undefined") {
  window.addEventListener("beforeunload", () => {
    websocketService.cleanup();
  });
}

export default websocketService;

# 💬 CHAT API - Complete Guide

## 📋 Overview
Complete guide for Chat API endpoints, database structure, and implementation examples.

**Base URL:** `http://localhost:8000/chat`  
**Authentication:** JWT Bearer Token Required  
**Total Endpoints:** 11 endpoints ✅

---

## 🗄️ Database Structure

### Table: `conversations`
```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    user_id INTEGER NOT NULL,
    agent_id INTEGER,
    conversation_type VARCHAR(50) DEFAULT 'chat',
    status VARCHAR(50) DEFAULT 'active',
    is_archived BOOLEAN DEFAULT FALSE,
    is_pinned BOOLEAN DEFAULT FALSE,
    total_messages INTEGER DEFAULT 0,
    unread_count INTEGER DEFAULT 0,
    last_message_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: `messages`
```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    content TEXT NOT NULL,
    content_type VARCHAR(50) DEFAULT 'text',
    sender VARCHAR(20) NOT NULL, -- 'user' or 'agent'
    message_type VARCHAR(50) DEFAULT 'text',
    status VARCHAR(50) DEFAULT 'sent',
    tokens_used INTEGER,
    processing_time REAL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

### Table: `message_attachments`
```sql
CREATE TABLE message_attachments (
    id INTEGER PRIMARY KEY,
    message_id INTEGER NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(100),
    file_size INTEGER,
    file_path TEXT,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (message_id) REFERENCES messages(id)
);
```

### Table: `chat_session_history`
```sql
CREATE TABLE chat_session_history (
    id INTEGER PRIMARY KEY,
    conversation_id INTEGER NOT NULL,
    session_start DATETIME NOT NULL,
    session_end DATETIME,
    messages_count INTEGER DEFAULT 0,
    duration_minutes INTEGER,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id)
);
```

---

## 🔗 Complete API Endpoints

### 1. List Conversations
```javascript
// GET /chat/conversations
const response = await fetch('/chat/conversations?limit=20&offset=0', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 5 conversations",
    "data": {
        "conversations": [
            {
                "id": 1,
                "title": "Customer Support Chat",
                "user_id": 1,
                "agent_id": 5,
                "conversation_type": "chat",
                "status": "active",
                "is_archived": false,
                "is_pinned": true,
                "total_messages": 15,
                "unread_count": 2,
                "last_message_at": "2024-06-29T14:30:00Z",
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total": 5,
        "limit": 20,
        "offset": 0
    }
}
```

### 2. Create New Conversation
```javascript
// POST /chat/conversations
const response = await fetch('/chat/conversations', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: "New Customer Inquiry",
        agent_id: 5
    })
});

// Response
{
    "success": true,
    "message": "Conversation created successfully",
    "data": {
        "conversation_id": 123
    }
}
```

### 3. Get Conversation Details
```javascript
// GET /chat/conversations/{id}
const response = await fetch('/chat/conversations/123', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Conversation found",
    "data": {
        "id": 123,
        "title": "Customer Support Chat",
        "user_id": 1,
        "agent_id": 5,
        "conversation_type": "chat",
        "status": "active",
        "total_messages": 15,
        "created_at": "2024-06-29T10:00:00Z"
    }
}
```

### 4. Get Conversation Messages
```javascript
// GET /chat/conversations/{id}/messages
const response = await fetch('/chat/conversations/123/messages?limit=50&offset=0', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 10 messages",
    "data": {
        "messages": [
            {
                "id": 1,
                "conversation_id": 123,
                "content": "Hello, I need help with my order",
                "content_type": "text",
                "sender": "user",
                "message_type": "text",
                "status": "read",
                "tokens_used": 12,
                "processing_time": 0.8,
                "created_at": "2024-06-29T10:00:00Z"
            },
            {
                "id": 2,
                "conversation_id": 123,
                "content": "Hello! I'd be happy to help you with your order. Could you please provide your order number?",
                "content_type": "text",
                "sender": "agent",
                "message_type": "text",
                "status": "sent",
                "tokens_used": 25,
                "processing_time": 1.2,
                "created_at": "2024-06-29T10:00:02Z"
            }
        ],
        "total": 10,
        "limit": 50,
        "offset": 0
    }
}
```

### 5. Add Message to Conversation
```javascript
// POST /chat/conversations/{id}/messages
const response = await fetch('/chat/conversations/123/messages', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        content: "My order number is #12345",
        sender_type: "user"
    })
});

// Response
{
    "success": true,
    "message": "Message added successfully",
    "data": {
        "message_id": 456,
        "conversation_id": 123,
        "content": "My order number is #12345",
        "sender": "user",
        "created_at": "2024-06-29T10:05:00Z"
    }
}
```

### 6. Generate AI Response
```javascript
// POST /chat/conversations/{id}/ai-response
const response = await fetch('/chat/conversations/123/ai-response', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        message: "My order number is #12345",
        agent_id: 5,
        include_context: true
    })
});

// Response
{
    "success": true,
    "message": "AI response generated",
    "data": {
        "message_id": 457,
        "ai_response": "Thank you for providing your order number #12345. Let me check the status of your order for you.",
        "tokens_used": 30,
        "processing_time": 1.5,
        "cost": 0.002,
        "created_at": "2024-06-29T10:05:02Z"
    }
}
```

### 7. Update Conversation
```javascript
// PUT /chat/conversations/{id}
const response = await fetch('/chat/conversations/123', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: "Updated Conversation Title",
        is_pinned: true
    })
});

// Response
{
    "success": true,
    "message": "Conversation updated successfully",
    "data": {
        "conversation_id": 123
    }
}
```

### 8. Delete Conversation
```javascript
// DELETE /chat/conversations/{id}
const response = await fetch('/chat/conversations/123', {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Conversation deleted successfully",
    "data": {
        "conversation_id": 123
    }
}
```

### 9. Get Chat Analytics
```javascript
// GET /chat/analytics/dashboard
const response = await fetch('/chat/analytics/dashboard', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Analytics retrieved",
    "data": {
        "total_conversations": 25,
        "total_messages": 350,
        "average_response_time": 1.2,
        "most_active_agent": {
            "agent_id": 5,
            "name": "Customer Service Agent",
            "message_count": 150
        },
        "daily_stats": [
            {
                "date": "2024-06-29",
                "conversations": 5,
                "messages": 45
            }
        ]
    }
}
```

### 10. Get Global Analytics (Admin Only)
```javascript
// GET /chat/analytics/global
const response = await fetch('/chat/analytics/global', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Global analytics retrieved",
    "data": {
        "total_conversations_all_users": 500,
        "total_messages_all_users": 7500,
        "average_conversations_per_user": 12.5,
        "top_performing_agents": [
            {
                "agent_id": 5,
                "name": "Customer Service Agent",
                "total_conversations": 200,
                "success_rate": 95.5
            }
        ]
    }
}
```

### 11. Search Messages
```javascript
// GET /chat/search
const response = await fetch('/chat/search?query=order&limit=20', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 5 results",
    "data": {
        "results": [
            {
                "message_id": 1,
                "conversation_id": 123,
                "content": "I need help with my order",
                "sender": "user",
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "query": "order",
        "total": 5
    }
}
```

---

## 🛠️ React Service Implementation

```typescript
export class ChatService {
    private baseUrl = '/chat';
    
    // Get user conversations
    async getConversations(limit = 20, offset = 0) {
        const response = await fetch(`${this.baseUrl}/conversations?limit=${limit}&offset=${offset}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Create new conversation
    async createConversation(title: string, agentId: number) {
        const response = await fetch(`${this.baseUrl}/conversations`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ title, agent_id: agentId })
        });
        return await response.json();
    }
    
    // Get conversation messages
    async getMessages(conversationId: number, limit = 50, offset = 0) {
        const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages?limit=${limit}&offset=${offset}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Send message
    async sendMessage(conversationId: number, content: string) {
        const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/messages`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ content, sender_type: 'user' })
        });
        return await response.json();
    }
    
    // Generate AI response
    async generateAIResponse(conversationId: number, message: string, agentId: number) {
        const response = await fetch(`${this.baseUrl}/conversations/${conversationId}/ai-response`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ message, agent_id: agentId, include_context: true })
        });
        return await response.json();
    }
    
    // Search messages
    async searchMessages(query: string, limit = 20) {
        const response = await fetch(`${this.baseUrl}/search?query=${encodeURIComponent(query)}&limit=${limit}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Get analytics
    async getAnalytics() {
        const response = await fetch(`${this.baseUrl}/analytics/dashboard`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    private getHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }
}
```

---

## 📊 Complete API Reference

| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| GET | `/chat/conversations` | List user conversations | ✅ |
| POST | `/chat/conversations` | Create new conversation | ✅ |
| GET | `/chat/conversations/{id}` | Get conversation details | ✅ |
| PUT | `/chat/conversations/{id}` | Update conversation | ✅ |
| DELETE | `/chat/conversations/{id}` | Delete conversation | ✅ |
| GET | `/chat/conversations/{id}/messages` | Get conversation messages | ✅ |
| POST | `/chat/conversations/{id}/messages` | Add message to conversation | ✅ |
| POST | `/chat/conversations/{id}/ai-response` | Generate AI response | ✅ |
| GET | `/chat/analytics/dashboard` | Get user analytics | ✅ |
| GET | `/chat/analytics/global` | Get global analytics (admin) | ✅ |
| GET | `/chat/search` | Search messages | ✅ |

---

## ✨ Status: 100% Complete ✅

All Chat API endpoints are fully implemented and tested, ready for production use.

**Database Tables:** 4 tables integrated  
**API Endpoints:** 11 endpoints working  
**Authentication:** JWT secured  
**Status:** Production ready 
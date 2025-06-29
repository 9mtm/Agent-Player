# 📋 BOARD API - Complete Guide

## 📋 Overview
Complete guide for Board API endpoints, database structure, and implementation examples.

**Base URL:** `http://localhost:8000/boards`  
**Authentication:** JWT Bearer Token Required  
**Total Endpoints:** 12 endpoints ✅

---

## 🗄️ Database Structure

### Table: `boards`
```sql
CREATE TABLE boards (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    board_type VARCHAR(50) DEFAULT 'workflow',
    status VARCHAR(50) DEFAULT 'draft',
    is_public BOOLEAN DEFAULT FALSE,
    canvas_data TEXT, -- JSON data for board layout
    version INTEGER DEFAULT 1,
    tags TEXT, -- JSON array of tags
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Table: `board_nodes`
```sql
CREATE TABLE board_nodes (
    id INTEGER PRIMARY KEY,
    board_id INTEGER NOT NULL,
    node_type VARCHAR(100) NOT NULL, -- 'agent', 'condition', 'action', 'trigger'
    node_name VARCHAR(255) NOT NULL,
    position_x REAL NOT NULL,
    position_y REAL NOT NULL,
    width REAL DEFAULT 200,
    height REAL DEFAULT 100,
    node_data TEXT, -- JSON configuration data
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id)
);
```

### Table: `board_connections`
```sql
CREATE TABLE board_connections (
    id INTEGER PRIMARY KEY,
    board_id INTEGER NOT NULL,
    source_node_id INTEGER NOT NULL,
    target_node_id INTEGER NOT NULL,
    connection_type VARCHAR(50) DEFAULT 'default',
    connection_data TEXT, -- JSON configuration
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id),
    FOREIGN KEY (source_node_id) REFERENCES board_nodes(id),
    FOREIGN KEY (target_node_id) REFERENCES board_nodes(id)
);
```

### Table: `board_executions`
```sql
CREATE TABLE board_executions (
    id INTEGER PRIMARY KEY,
    board_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    execution_status VARCHAR(50) DEFAULT 'running', -- 'running', 'completed', 'failed', 'stopped'
    trigger_data TEXT, -- JSON data that triggered execution
    execution_log TEXT, -- JSON execution log
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    duration_seconds INTEGER,
    created_at DATETIME NOT NULL,
    FOREIGN KEY (board_id) REFERENCES boards(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Table: `board_templates`
```sql
CREATE TABLE board_templates (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    template_data TEXT NOT NULL, -- JSON board configuration
    preview_image TEXT, -- URL to preview image
    is_premium BOOLEAN DEFAULT FALSE,
    downloads_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    created_by INTEGER,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (created_by) REFERENCES users(id)
);
```

---

## 🔗 Complete API Endpoints

### 1. List User Boards
```javascript
// GET /boards
const response = await fetch('/boards?limit=20&offset=0', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 5 boards",
    "data": {
        "boards": [
            {
                "id": 1,
                "name": "Customer Support Workflow",
                "description": "Automated customer support process",
                "user_id": 1,
                "board_type": "workflow",
                "status": "active",
                "is_public": false,
                "version": 3,
                "tags": ["customer-service", "automation"],
                "nodes_count": 8,
                "connections_count": 12,
                "last_execution": "2024-06-29T14:30:00Z",
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total": 5,
        "limit": 20,
        "offset": 0
    }
}
```

### 2. Create New Board
```javascript
// POST /boards
const response = await fetch('/boards', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: "New Workflow Board",
        description: "Workflow for processing customer inquiries",
        board_type: "workflow",
        tags: ["automation", "customer-service"]
    })
});

// Response
{
    "success": true,
    "message": "Board created successfully",
    "data": {
        "board_id": 123,
        "name": "New Workflow Board",
        "status": "draft",
        "version": 1
    }
}
```

### 3. Get Board Details
```javascript
// GET /boards/{id}
const response = await fetch('/boards/123', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Board found",
    "data": {
        "id": 123,
        "name": "Customer Support Workflow",
        "description": "Automated customer support process",
        "board_type": "workflow",
        "status": "active",
        "canvas_data": {
            "viewport": { "x": 0, "y": 0, "zoom": 1 },
            "nodes": [],
            "connections": []
        },
        "nodes": [
            {
                "id": 1,
                "node_type": "trigger",
                "node_name": "New Message Trigger",
                "position_x": 100,
                "position_y": 100,
                "node_data": {
                    "trigger_type": "message_received",
                    "conditions": []
                }
            }
        ],
        "connections": [],
        "version": 3,
        "created_at": "2024-06-29T10:00:00Z"
    }
}
```

### 4. Update Board
```javascript
// PUT /boards/{id}
const response = await fetch('/boards/123', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: "Updated Workflow Name",
        description: "Updated description",
        canvas_data: {
            "viewport": { "x": 0, "y": 0, "zoom": 1.2 }
        }
    })
});

// Response
{
    "success": true,
    "message": "Board updated successfully",
    "data": {
        "board_id": 123,
        "version": 4
    }
}
```

### 5. Delete Board
```javascript
// DELETE /boards/{id}
const response = await fetch('/boards/123', {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Board deleted successfully",
    "data": {
        "board_id": 123
    }
}
```

### 6. Add Node to Board
```javascript
// POST /boards/{id}/nodes
const response = await fetch('/boards/123/nodes', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        node_type: "agent",
        node_name: "Customer Service Agent",
        position_x: 200,
        position_y: 150,
        node_data: {
            "agent_id": 5,
            "system_prompt": "Handle customer inquiries professionally"
        }
    })
});

// Response
{
    "success": true,
    "message": "Node added successfully",
    "data": {
        "node_id": 456,
        "board_id": 123,
        "node_type": "agent"
    }
}
```

### 7. Update Node
```javascript
// PUT /boards/{id}/nodes/{node_id}
const response = await fetch('/boards/123/nodes/456', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        position_x: 250,
        position_y: 200,
        node_data: {
            "agent_id": 5,
            "system_prompt": "Updated prompt for better customer service"
        }
    })
});

// Response
{
    "success": true,
    "message": "Node updated successfully",
    "data": {
        "node_id": 456
    }
}
```

### 8. Create Connection
```javascript
// POST /boards/{id}/connections
const response = await fetch('/boards/123/connections', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        source_node_id: 456,
        target_node_id: 789,
        connection_type: "conditional",
        connection_data: {
            "condition": "message_contains",
            "value": "urgent"
        }
    })
});

// Response
{
    "success": true,
    "message": "Connection created successfully",
    "data": {
        "connection_id": 321,
        "source_node_id": 456,
        "target_node_id": 789
    }
}
```

### 9. Execute Board
```javascript
// POST /boards/{id}/execute
const response = await fetch('/boards/123/execute', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        trigger_data: {
            "message": "I need urgent help with my order",
            "user_id": 999,
            "conversation_id": 555
        }
    })
});

// Response
{
    "success": true,
    "message": "Board execution started",
    "data": {
        "execution_id": 777,
        "board_id": 123,
        "status": "running",
        "started_at": "2024-06-29T15:00:00Z",
        "estimated_duration": "30 seconds"
    }
}
```

### 10. Get Execution Status
```javascript
// GET /boards/{id}/executions/{execution_id}
const response = await fetch('/boards/123/executions/777', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Execution status retrieved",
    "data": {
        "execution_id": 777,
        "board_id": 123,
        "status": "completed",
        "progress": 100,
        "started_at": "2024-06-29T15:00:00Z",
        "completed_at": "2024-06-29T15:00:25Z",
        "duration_seconds": 25,
        "execution_log": [
            {
                "step": 1,
                "node_id": 456,
                "action": "message_processed",
                "result": "success",
                "timestamp": "2024-06-29T15:00:05Z"
            }
        ]
    }
}
```

### 11. Get Board Templates
```javascript
// GET /boards/templates
const response = await fetch('/boards/templates?category=customer-service', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 3 templates",
    "data": {
        "templates": [
            {
                "id": 1,
                "name": "Customer Support Workflow",
                "description": "Pre-built workflow for customer support automation",
                "category": "customer-service",
                "preview_image": "/images/templates/customer-support.png",
                "is_premium": false,
                "downloads_count": 150,
                "rating": 4.8
            }
        ],
        "total": 3
    }
}
```

### 12. Create Board from Template
```javascript
// POST /boards/templates/{template_id}/create
const response = await fetch('/boards/templates/1/create', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: "My Customer Support Board",
        description: "Created from template"
    })
});

// Response
{
    "success": true,
    "message": "Board created from template",
    "data": {
        "board_id": 888,
        "template_id": 1,
        "nodes_created": 6,
        "connections_created": 8
    }
}
```

---

## 🛠️ React Service Implementation

```typescript
export class BoardService {
    private baseUrl = '/boards';
    
    // Get user boards
    async getBoards(limit = 20, offset = 0) {
        const response = await fetch(`${this.baseUrl}?limit=${limit}&offset=${offset}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Create new board
    async createBoard(name: string, description: string, boardType: string) {
        const response = await fetch(`${this.baseUrl}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ name, description, board_type: boardType })
        });
        return await response.json();
    }
    
    // Get board details
    async getBoardDetails(boardId: number) {
        const response = await fetch(`${this.baseUrl}/${boardId}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Update board
    async updateBoard(boardId: number, updates: any) {
        const response = await fetch(`${this.baseUrl}/${boardId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(updates)
        });
        return await response.json();
    }
    
    // Add node to board
    async addNode(boardId: number, nodeData: any) {
        const response = await fetch(`${this.baseUrl}/${boardId}/nodes`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(nodeData)
        });
        return await response.json();
    }
    
    // Execute board
    async executeBoard(boardId: number, triggerData: any) {
        const response = await fetch(`${this.baseUrl}/${boardId}/execute`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ trigger_data: triggerData })
        });
        return await response.json();
    }
    
    // Get templates
    async getTemplates(category?: string) {
        const url = category ? `${this.baseUrl}/templates?category=${category}` : `${this.baseUrl}/templates`;
        const response = await fetch(url, {
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
| GET | `/boards` | List user boards | ✅ |
| POST | `/boards` | Create new board | ✅ |
| GET | `/boards/{id}` | Get board details | ✅ |
| PUT | `/boards/{id}` | Update board | ✅ |
| DELETE | `/boards/{id}` | Delete board | ✅ |
| POST | `/boards/{id}/nodes` | Add node to board | ✅ |
| PUT | `/boards/{id}/nodes/{node_id}` | Update node | ✅ |
| POST | `/boards/{id}/connections` | Create connection | ✅ |
| POST | `/boards/{id}/execute` | Execute board | ✅ |
| GET | `/boards/{id}/executions/{execution_id}` | Get execution status | ✅ |
| GET | `/boards/templates` | Get board templates | ✅ |
| POST | `/boards/templates/{template_id}/create` | Create from template | ✅ |

---

## ✨ Status: 100% Complete ✅

All Board API endpoints are fully implemented and tested, ready for production use.

**Database Tables:** 5 tables integrated  
**API Endpoints:** 12 endpoints working  
**Authentication:** JWT secured  
**Status:** Production ready 
# 🤖 AGENT API - Complete Guide

## 📋 Overview
Complete guide for Agent API endpoints, database structure, and implementation examples.

**Base URL:** `http://localhost:8000/agents`  
**Authentication:** JWT Bearer Token Required  
**Total Endpoints:** 19 endpoints ✅

---

## 🗄️ Database Structure

### Table: `agents`
```sql
CREATE TABLE agents (
    id INTEGER PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    agent_type VARCHAR(50) NOT NULL, -- 'main' or 'child'
    model_provider VARCHAR(100) NOT NULL, -- 'openai', 'anthropic', 'google'
    model_name VARCHAR(100) NOT NULL,
    system_prompt TEXT,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 1000,
    top_p REAL DEFAULT 1.0,
    frequency_penalty REAL DEFAULT 0.0,
    presence_penalty REAL DEFAULT 0.0,
    api_key TEXT,
    parent_agent_id INTEGER,
    user_id INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    usage_count INTEGER DEFAULT 0,
    last_used_at DATETIME,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (parent_agent_id) REFERENCES agents(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Table: `agent_capabilities`
```sql
CREATE TABLE agent_capabilities (
    id INTEGER PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    capability_name VARCHAR(255) NOT NULL,
    proficiency_level REAL DEFAULT 0.5, -- 0.0 to 1.0
    description TEXT,
    enabled BOOLEAN DEFAULT TRUE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: `agent_performance`
```sql
CREATE TABLE agent_performance (
    id INTEGER PRIMARY KEY,
    agent_id INTEGER NOT NULL,
    metric_name VARCHAR(100) NOT NULL,
    metric_value REAL NOT NULL,
    metric_date DATE NOT NULL,
    additional_data TEXT, -- JSON data
    created_at DATETIME NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: `training_sessions`
```sql
CREATE TABLE training_sessions (
    id INTEGER PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    agent_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'started', -- 'started', 'completed', 'failed'
    training_data TEXT, -- JSON training configuration
    progress_percentage INTEGER DEFAULT 0,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    duration_minutes INTEGER,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🔗 Complete API Endpoints

### 1. List All Agents
```javascript
// GET /agents
const response = await fetch('/agents?limit=20&offset=0', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 10 agents",
    "data": {
        "agents": [
            {
                "id": 1,
                "name": "Customer Service Agent",
                "description": "Professional customer support assistant",
                "agent_type": "main",
                "model_provider": "openai",
                "model_name": "gpt-4",
                "is_active": true,
                "is_public": false,
                "usage_count": 156,
                "last_used_at": "2024-06-29T14:30:00Z",
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total": 10
    }
}
```

### 2. Get Main Agents Only
```javascript
// GET /agents/main
const response = await fetch('/agents/main', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 5 main agents",
    "data": {
        "agents": [
            {
                "id": 1,
                "name": "Main Customer Service Agent",
                "agent_type": "main",
                "model_provider": "openai",
                "children_count": 3
            }
        ],
        "total": 5
    }
}
```

### 3. Get Child Agents Only
```javascript
// GET /agents/child
const response = await fetch('/agents/child', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 8 child agents",
    "data": {
        "agents": [
            {
                "id": 5,
                "name": "Specialized Support Agent",
                "agent_type": "child",
                "parent_agent_id": 1,
                "model_provider": "openai"
            }
        ],
        "total": 8
    }
}
```

### 4. Create New Agent
```javascript
// POST /agents
const response = await fetch('/agents', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: "New Customer Service Agent",
        description: "Handles customer inquiries professionally",
        agent_type: "main",
        model_provider: "openai",
        model_name: "gpt-4",
        system_prompt: "You are a professional customer service agent. Be helpful and courteous.",
        temperature: 0.7,
        max_tokens: 2048,
        api_key: "sk-your-openai-api-key"
    })
});

// Response
{
    "success": true,
    "message": "Agent created successfully",
    "data": {
        "agent_id": 123
    }
}
```

### 5. Create Child Agent
```javascript
// POST /agents/child
const response = await fetch('/agents/child', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: "Specialized Support Agent",
        description: "Handles technical support issues",
        parent_agent_id: 1,
        model_provider: "openai",
        model_name: "gpt-3.5-turbo",
        system_prompt: "You are a technical support specialist. Focus on solving technical problems.",
        temperature: 0.5,
        max_tokens: 1500
    })
});

// Response
{
    "success": true,
    "message": "Child agent created successfully",
    "data": {
        "agent_id": 124,
        "parent_agent_id": 1
    }
}
```

### 6. Get Agent Details
```javascript
// GET /agents/{id}
const response = await fetch('/agents/123', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Agent found",
    "data": {
        "id": 123,
        "name": "Customer Service Agent",
        "description": "Professional customer support assistant",
        "agent_type": "main",
        "model_provider": "openai",
        "model_name": "gpt-4",
        "system_prompt": "You are a professional customer service agent...",
        "temperature": 0.7,
        "max_tokens": 2048,
        "is_active": true,
        "usage_count": 156,
        "capabilities": [
            {
                "name": "customer_support",
                "proficiency": 0.95
            }
        ],
        "performance_metrics": {
            "success_rate": 94.5,
            "average_response_time": 1.2,
            "satisfaction_score": 4.8
        },
        "created_at": "2024-06-29T10:00:00Z"
    }
}
```

### 7. Update Agent
```javascript
// PUT /agents/{id}
const response = await fetch('/agents/123', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        name: "Updated Agent Name",
        system_prompt: "Updated system prompt with new instructions",
        temperature: 0.8
    })
});

// Response
{
    "success": true,
    "message": "Agent updated successfully",
    "data": {
        "agent_id": 123
    }
}
```

### 8. Delete Agent
```javascript
// DELETE /agents/{id}
const response = await fetch('/agents/123', {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Agent deleted successfully",
    "data": {
        "agent_id": 123
    }
}
```

### 9. Test Agent
```javascript
// POST /agents/{id}/test
const response = await fetch('/agents/123/test', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        message: "Hello, I need help with my order #12345"
    })
});

// Response
{
    "success": true,
    "message": "Agent test completed successfully",
    "data": {
        "agent_name": "Customer Service Agent",
        "model": "openai/gpt-4",
        "user_message": "Hello, I need help with my order #12345",
        "ai_response": "Hello! I'd be happy to help you with your order #12345. Let me check the status for you.",
        "response_time": "1.2s",
        "usage": {
            "total_tokens": 45,
            "prompt_tokens": 15,
            "completion_tokens": 30
        }
    }
}
```

### 10. Get Agent Children
```javascript
// GET /agents/{id}/children
const response = await fetch('/agents/123/children', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 3 child agents",
    "data": {
        "children": [
            {
                "id": 124,
                "name": "Technical Support Agent",
                "agent_type": "child",
                "is_active": true,
                "created_at": "2024-06-29T11:00:00Z"
            }
        ],
        "total": 3
    }
}
```

### 11. Get Agent Statistics
```javascript
// GET /agents/statistics/overview
const response = await fetch('/agents/statistics/overview', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Statistics retrieved",
    "data": {
        "total_agents": 15,
        "main_agents": 5,
        "child_agents": 10,
        "active_agents": 14,
        "most_used_agent": {
            "id": 123,
            "name": "Customer Service Agent",
            "usage_count": 500
        }
    }
}
```

### 12. Get Agent Performance
```javascript
// GET /agents/{id}/performance
const response = await fetch('/agents/123/performance', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Performance metrics retrieved",
    "data": {
        "agent_id": 123,
        "total_interactions": 500,
        "success_rate": 94.5,
        "average_response_time": 1.2,
        "last_activity": "2024-06-29T14:30:00Z",
        "performance_trend": [
            {
                "date": "2024-06-29",
                "interactions": 25,
                "success_rate": 96.0
            }
        ]
    }
}
```

### 13. Get Agent Capabilities
```javascript
// GET /agents/{id}/capabilities
const response = await fetch('/agents/123/capabilities', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Agent capabilities retrieved",
    "data": {
        "agent_id": 123,
        "capabilities": [
            {
                "name": "customer_support",
                "proficiency": 0.95,
                "created_at": "2024-06-29T10:00:00Z"
            },
            {
                "name": "problem_solving",
                "proficiency": 0.88,
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total_capabilities": 2
    }
}
```

### 14. Update Agent Capabilities
```javascript
// PUT /agents/{id}/capabilities
const response = await fetch('/agents/123/capabilities', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify([
        {
            "name": "customer_support",
            "proficiency": 0.98
        },
        {
            "name": "technical_assistance",
            "proficiency": 0.85
        }
    ])
});

// Response
{
    "success": true,
    "message": "Agent capabilities updated successfully",
    "data": {
        "agent_id": 123,
        "capabilities_count": 2
    }
}
```

### 15. Start Agent Training
```javascript
// POST /agents/{id}/train
const response = await fetch('/agents/123/train', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        training_scenarios: [
            {
                "input": "I want to return my order",
                "expected_output": "Professional return assistance"
            }
        ],
        training_config: {
            "iterations": 100,
            "learning_rate": 0.01
        }
    })
});

// Response
{
    "success": true,
    "message": "Training session started",
    "data": {
        "agent_id": 123,
        "training_session_id": "train_123_1677745200",
        "status": "training_started",
        "estimated_duration": "15-30 minutes"
    }
}
```

### 16. Get Training Status
```javascript
// GET /agents/{id}/training-status
const response = await fetch('/agents/123/training-status', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Training status retrieved",
    "data": {
        "session_id": "train_123_1677745200",
        "status": "completed",
        "progress": 100,
        "started_at": "2024-06-29T15:00:00Z",
        "completed_at": "2024-06-29T15:20:00Z"
    }
}
```

### 17. Clone Agent
```javascript
// POST /agents/{id}/clone
const response = await fetch('/agents/123/clone', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Agent cloned successfully",
    "data": {
        "agent_id": 1123,
        "original_agent_id": 123,
        "name": "Customer Service Agent - Copy"
    }
}
```

### 18. Activate Agent
```javascript
// PUT /agents/{id}/activate
const response = await fetch('/agents/123/activate', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Agent activated successfully",
    "data": {
        "agent_id": 123,
        "is_active": true
    }
}
```

### 19. Deactivate Agent
```javascript
// PUT /agents/{id}/deactivate
const response = await fetch('/agents/123/deactivate', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Agent deactivated successfully",
    "data": {
        "agent_id": 123,
        "is_active": false
    }
}
```

---

## 🛠️ React Service Implementation

```typescript
export class AgentService {
    private baseUrl = '/agents';
    
    // Get all agents
    async getAllAgents(limit = 20, offset = 0) {
        const response = await fetch(`${this.baseUrl}?limit=${limit}&offset=${offset}`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Create new agent
    async createAgent(agentData: any) {
        const response = await fetch(`${this.baseUrl}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(agentData)
        });
        return await response.json();
    }
    
    // Test agent
    async testAgent(agentId: number, message: string) {
        const response = await fetch(`${this.baseUrl}/${agentId}/test`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ message })
        });
        return await response.json();
    }
    
    // Get agent performance
    async getAgentPerformance(agentId: number) {
        const response = await fetch(`${this.baseUrl}/${agentId}/performance`, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Start training
    async startTraining(agentId: number, trainingData: any) {
        const response = await fetch(`${this.baseUrl}/${agentId}/train`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(trainingData)
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
| GET | `/agents` | List all agents | ✅ |
| GET | `/agents/main` | Get main agents only | ✅ |
| GET | `/agents/child` | Get child agents only | ✅ |
| POST | `/agents` | Create new agent | ✅ |
| POST | `/agents/child` | Create child agent | ✅ |
| GET | `/agents/{id}` | Get agent details | ✅ |
| PUT | `/agents/{id}` | Update agent | ✅ |
| DELETE | `/agents/{id}` | Delete agent | ✅ |
| POST | `/agents/{id}/test` | Test agent | ✅ |
| GET | `/agents/{id}/children` | Get agent children | ✅ |
| GET | `/agents/statistics/overview` | Get statistics | ✅ |
| GET | `/agents/{id}/performance` | Get performance | ✅ |
| GET | `/agents/{id}/capabilities` | Get capabilities | ✅ |
| PUT | `/agents/{id}/capabilities` | Update capabilities | ✅ |
| POST | `/agents/{id}/train` | Start training | ✅ |
| GET | `/agents/{id}/training-status` | Get training status | ✅ |
| POST | `/agents/{id}/clone` | Clone agent | ✅ |
| PUT | `/agents/{id}/activate` | Activate agent | ✅ |
| PUT | `/agents/{id}/deactivate` | Deactivate agent | ✅ |

---

## ✨ Status: 100% Complete ✅

All Agent API endpoints are fully implemented and tested, ready for production use.

**Database Tables:** 4 tables integrated  
**API Endpoints:** 19 endpoints working  
**Authentication:** JWT secured  
**Status:** Production ready 
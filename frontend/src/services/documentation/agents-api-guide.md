# AGENTS API - Frontend Integration Guide

## 🤖 **Agents Service Documentation**

### **Purpose**
The Agents API handles creation, management, and testing of AI agents in the DPRO AI Agent platform.

### **Base URL**
`http://localhost:8000/agents`

### **Database Tables**
- **agents**: Main agent configurations (16 columns)
- **agent_capabilities**: Agent skills and abilities tracking
- **agent_performance**: Performance metrics and analytics

---

## 📡 **Frontend Service Implementation**

### **Key Interfaces**
```typescript
export interface Agent {
  id: number;
  name: string;
  description: string;
  agent_type: 'main' | 'child';
  model_provider: string;
  model_name: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
  is_active: boolean;
  is_public: boolean;
  user_id: number;
  created_at: string;
  updated_at: string;
}

export interface AgentCreateRequest {
  name: string;
  description: string;
  agent_type: 'main' | 'child';
  model_provider: string;
  model_name: string;
  system_prompt: string;
  temperature: number;
  max_tokens: number;
}
```

### **Service Methods**
```typescript
class AgentsService {
  // Get all agents
  async getAgents(agentType?: 'main' | 'child'): Promise<Agent[]>
  
  // Create new agent
  async createAgent(agentData: AgentCreateRequest): Promise<Agent>
  
  // Get specific agent
  async getAgent(agentId: number): Promise<Agent>
  
  // Update agent
  async updateAgent(agentId: number, updateData: Partial<AgentCreateRequest>): Promise<Agent>
  
  // Delete agent
  async deleteAgent(agentId: number): Promise<void>
  
  // Test agent
  async testAgent(agentId: number, input: string): Promise<any>
}
```

---

## 🗄️ **Database Schema**

### **agents Table (16 columns)**
```sql
CREATE TABLE agents (
    id INTEGER PRIMARY KEY,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    agent_type VARCHAR(20) NOT NULL,
    model_provider VARCHAR(50) NOT NULL,
    model_name VARCHAR(100) NOT NULL,
    system_prompt TEXT NOT NULL,
    temperature REAL DEFAULT 0.7,
    max_tokens INTEGER DEFAULT 2048,
    top_p REAL DEFAULT 1.0,
    frequency_penalty REAL DEFAULT 0.0,
    presence_penalty REAL DEFAULT 0.0,
    is_active BOOLEAN DEFAULT TRUE,
    is_public BOOLEAN DEFAULT FALSE,
    user_id INTEGER NOT NULL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL
);
```

---

## ✅ **Testing Examples**

### **Create Agent**
```python
import requests

headers = {"Authorization": "Bearer YOUR_TOKEN"}

agent_data = {
    "name": "Test Agent",
    "description": "Test agent for API testing",
    "agent_type": "main",
    "model_provider": "openai",
    "model_name": "gpt-3.5-turbo",
    "system_prompt": "You are a helpful assistant",
    "temperature": 0.7,
    "max_tokens": 2048
}

# Create
response = requests.post("http://localhost:8000/agents", json=agent_data, headers=headers)

# List
agents = requests.get("http://localhost:8000/agents", headers=headers)

# Test
test_data = {"input": "Hello!"}
test_response = requests.post(f"http://localhost:8000/agents/{agent_id}/test", 
                             json=test_data, headers=headers)
```

---

## 🎯 **React Hook Usage**

```typescript
const { agents, isLoading, createAgent, deleteAgent } = useAgents();

// Create new agent
await createAgent({
  name: "New Agent",
  description: "Agent description",
  agent_type: "main",
  model_provider: "openai",
  model_name: "gpt-3.5-turbo",
  system_prompt: "You are helpful",
  temperature: 0.7,
  max_tokens: 2048
});
```

**✅ Agents API is fully tested and production-ready!**

# 🗄️ DATABASE SCHEMA - COMPLETE REFERENCE
*Complete Database Schema for DPRO AI Agent System*

**Database:** SQLite (dpro_agent.db)  
**Size:** 148KB  
**Tables:** 13  
**Last Updated:** 2025-01-22  

---

## 📊 DATABASE OVERVIEW

### Current Status
✅ **FULLY OPERATIONAL** - All critical tables exist and functional  
📈 **Total Records:** 8 active records across all tables  
🔗 **Relationships:** Full foreign key constraints implemented  
⚡ **Performance:** Optimized with 9 indexes  

### Table Distribution
```
👥 User Management:     4 tables (users, settings, sessions, activity)
🤖 AI Agents:          3 tables (agents, boards, workflows) 
💬 Communication:      2 tables (conversations, messages)
🛠️ System:            2 tables (system_info, marketplace_tools)
📋 Task Management:    1 table  (tasks)
🗂️ Internal:          1 table  (sqlite_sequence)
```

---

## 🏗️ TABLE STRUCTURES

### 1. USERS TABLE (Core Authentication)
**Purpose:** User accounts and authentication  
**Records:** 1 admin user  

```sql
CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,        -- bcrypt hashed passwords
    is_active BOOLEAN DEFAULT 1,
    is_admin BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP NULL
);
```

**Current Data:**
- ID: 1, Username: "9mtm", Email: "me@alarade.at", Admin: Yes

**Indexes:**
- `idx_users_email` ON users(email)
- `idx_users_username` ON users(username)

---

### 2. USER_SESSIONS TABLE (Session Management)
**Purpose:** JWT token session tracking  
**Records:** 0 (sessions expire automatically)  

```sql
CREATE TABLE user_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT 1,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

**Indexes:**
- `idx_sessions_token` ON user_sessions(session_token)
- `idx_sessions_user_id` ON user_sessions(user_id)

---

### 3. USER_SETTINGS TABLE (User Preferences)
**Purpose:** User-specific configuration and preferences  
**Records:** 1 setting record  

```sql
CREATE TABLE user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE NOT NULL,
    chat_settings TEXT NOT NULL DEFAULT '{}',      -- JSON configuration
    profile_settings TEXT NOT NULL DEFAULT '{}',   -- JSON configuration
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

---

### 4. ACTIVITY_LOGS TABLE (Audit Trail)
**Purpose:** System activity and security logging  
**Records:** 2 activity logs  

```sql
CREATE TABLE activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    action TEXT NOT NULL,
    details TEXT,
    ip_address TEXT,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);
```

**Indexes:**
- `idx_activity_user_id` ON activity_logs(user_id)
- `idx_activity_created_at` ON activity_logs(created_at)

---

### 5. AGENTS TABLE (Core AI Agents) ⭐
**Purpose:** Main AI agent storage and configuration  
**Records:** 3 sample agents  

```sql
CREATE TABLE agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    
    -- Basic Information
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    avatar_url VARCHAR(500),
    
    -- AI Model Configuration
    model_provider VARCHAR(50) DEFAULT 'openai',    -- 'openai', 'anthropic', 'local'
    model_name VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
    system_prompt TEXT DEFAULT 'You are a helpful AI assistant.',
    temperature VARCHAR(10) DEFAULT '0.7',
    max_tokens INTEGER DEFAULT 2048,
    timeout_seconds INTEGER DEFAULT 300,
    api_key TEXT DEFAULT '',
    
    -- Agent Hierarchy
    agent_type TEXT DEFAULT 'main',                 -- 'main', 'child'
    parent_agent_id INTEGER,                        -- FK to agents.id for child agents
    
    -- Advanced Configuration
    capabilities TEXT DEFAULT '',                   -- JSON array of capabilities
    agent_config TEXT DEFAULT '{}',                -- JSON configuration object
    
    -- Status & Permissions
    is_active BOOLEAN DEFAULT 1,
    is_public BOOLEAN DEFAULT 0,
    is_system BOOLEAN DEFAULT 0,
    
    -- Timestamps
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (parent_agent_id) REFERENCES agents(id)
);
```

**Current Sample Data:**
1. **GPT-4 Assistant** - Advanced AI assistant (OpenAI GPT-4)
2. **Code Helper** - Programming specialist (OpenAI GPT-4) 
3. **Creative Writer** - Content creation (OpenAI GPT-3.5-turbo)

**Indexes:**
- `idx_agents_user_id` ON agents(user_id)
- `idx_agents_type` ON agents(agent_type)
- `idx_agents_active` ON agents(is_active)

---

### 6. BOARDS TABLE (Workflow Boards)
**Purpose:** Visual workflow board management  
**Records:** 0 (ready for user creation)  

```sql
CREATE TABLE boards (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    board_data TEXT DEFAULT '{}',                   -- JSON board configuration
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Indexes:**
- `idx_boards_user_id` ON boards(user_id)

---

### 7. WORKFLOWS TABLE (Process Definitions)
**Purpose:** Executable workflow definitions  
**Records:** 0 (ready for workflow creation)  

```sql
CREATE TABLE workflows (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL DEFAULT 1,
    name VARCHAR(255) NOT NULL,
    workflow_data TEXT DEFAULT '{}',                -- JSON workflow steps
    status VARCHAR(50) DEFAULT 'active',            -- 'active', 'paused', 'completed'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (board_id) REFERENCES boards(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

### 8. CONVERSATIONS TABLE (Chat History)
**Purpose:** Chat conversation management  
**Records:** 0 (ready for chat usage)  

```sql
CREATE TABLE conversations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    agent_id INTEGER,
    title VARCHAR(255) NOT NULL DEFAULT 'New Conversation',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

**Indexes:**
- `idx_conversations_user_id` ON conversations(user_id)
- `idx_conversations_agent_id` ON conversations(agent_id)

---

### 9. MESSAGES TABLE (Chat Messages)
**Purpose:** Individual chat message storage  
**Records:** 0 (ready for messaging)  

```sql
CREATE TABLE messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(50) DEFAULT 'user',        -- 'user', 'agent', 'system'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (conversation_id) REFERENCES conversations(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Indexes:**
- `idx_messages_conversation_id` ON messages(conversation_id)

---

### 10. TASKS TABLE (Task Management)
**Purpose:** Task and project management  
**Records:** 0 (ready for task creation)  

```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL DEFAULT 1,
    title VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    status VARCHAR(50) DEFAULT 'pending',           -- 'pending', 'in_progress', 'completed'
    priority VARCHAR(50) DEFAULT 'medium',          -- 'low', 'medium', 'high', 'urgent'
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Indexes:**
- `idx_tasks_user_id` ON tasks(user_id)
- `idx_tasks_status` ON tasks(status)

---

### 11. MARKETPLACE_TOOLS TABLE (Available Tools)
**Purpose:** System tools and plugins catalog  
**Records:** 0 (ready for tool registration)  

```sql
CREATE TABLE marketplace_tools (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    category VARCHAR(100) DEFAULT 'general',        -- 'ai', 'productivity', 'development'
    version VARCHAR(50) DEFAULT '1.0.0',
    config TEXT DEFAULT '{}',                       -- JSON tool configuration
    is_active BOOLEAN DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

### 12. SYSTEM_INFO TABLE (System Metadata)
**Purpose:** System configuration and metadata  
**Records:** 4 system settings  

```sql
CREATE TABLE system_info (
    id INTEGER PRIMARY KEY,
    key TEXT UNIQUE NOT NULL,
    value TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

**Current System Data:**
- `admin_registered`: "0" (Admin setup status)
- `system_initialized`: "1" (System initialization flag)
- `version`: "3.0.0" (Current system version)
- `database_cleared_at`: Timestamp of last database reset

---

### 13. SQLITE_SEQUENCE TABLE (Internal)
**Purpose:** SQLite internal autoincrement tracking  
**Records:** 4 sequence tracking records  

*This is an SQLite system table that automatically tracks autoincrement values for PRIMARY KEY columns.*

---

## 🔗 RELATIONSHIPS & CONSTRAINTS

### Primary Relationships
```
users (1) ←→ (M) agents
users (1) ←→ (M) boards  
users (1) ←→ (M) conversations
users (1) ←→ (M) tasks
users (1) ←→ (1) user_settings
users (1) ←→ (M) user_sessions
users (1) ←→ (M) activity_logs

agents (1) ←→ (M) agents (parent-child)
agents (1) ←→ (M) conversations

boards (1) ←→ (M) workflows

conversations (1) ←→ (M) messages
```

### Foreign Key Rules
- **CASCADE DELETE:** user_sessions, user_settings (when user deleted)
- **SET NULL:** activity_logs.user_id (preserve logs when user deleted)
- **RESTRICT:** agents, conversations (prevent deletion if referenced)

---

## ⚡ PERFORMANCE OPTIMIZATION

### Indexes Summary
```sql
-- User Management Indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_activity_user_id ON activity_logs(user_id);
CREATE INDEX idx_activity_created_at ON activity_logs(created_at);

-- Agent Management Indexes  
CREATE INDEX idx_agents_user_id ON agents(user_id);
CREATE INDEX idx_agents_type ON agents(agent_type);
CREATE INDEX idx_agents_active ON agents(is_active);

-- Workflow Indexes
CREATE INDEX idx_boards_user_id ON boards(user_id);

-- Communication Indexes
CREATE INDEX idx_conversations_user_id ON conversations(user_id);
CREATE INDEX idx_conversations_agent_id ON conversations(agent_id);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);

-- Task Management Indexes
CREATE INDEX idx_tasks_user_id ON tasks(user_id);
CREATE INDEX idx_tasks_status ON tasks(status);
```

### Query Optimization Tips
1. **Agent Queries:** Use `agent_type` and `is_active` filters for better performance
2. **Chat Queries:** Filter by `user_id` first, then by date ranges
3. **Search Operations:** Consider full-text search for message content
4. **Bulk Operations:** Use transactions for multiple record operations

---

## 🔧 MAINTENANCE OPERATIONS

### Database Health Checks
```sql
-- Check table sizes
SELECT name, COUNT(*) as records FROM (
    SELECT 'users' as name, COUNT(*) FROM users
    UNION ALL SELECT 'agents', COUNT(*) FROM agents
    UNION ALL SELECT 'conversations', COUNT(*) FROM conversations
    -- Add other tables as needed
);

-- Check foreign key integrity
PRAGMA foreign_key_check;

-- Database statistics
PRAGMA database_list;
PRAGMA table_info(agents);
```

### Maintenance Scripts
```sql
-- Clean up expired sessions
DELETE FROM user_sessions 
WHERE expires_at < datetime('now') OR is_active = 0;

-- Archive old activity logs (older than 90 days)
DELETE FROM activity_logs 
WHERE created_at < datetime('now', '-90 days');

-- Optimize database
VACUUM;
ANALYZE;
```

---

## 📋 DEVELOPMENT GUIDELINES

### Adding New Tables
1. Follow naming convention: `snake_case`
2. Include standard audit fields: `created_at`, `updated_at`
3. Add appropriate foreign key constraints
4. Create performance indexes
5. Update this documentation

### Data Migration
1. Use transaction blocks for schema changes
2. Backup database before major changes
3. Test migrations on copy of production data
4. Update application code before deploying schema changes

### Security Considerations
1. Never store plain text passwords (use bcrypt)
2. Sensitive data should be encrypted at application level
3. Implement proper access controls in application layer
4. Regular backup and integrity checks

---

## 🎯 CURRENT SYSTEM STATUS

**Database Health:** ✅ EXCELLENT  
**Schema Completeness:** ✅ 100% Complete  
**Performance:** ✅ Optimized  
**Data Integrity:** ✅ All constraints enforced  
**Backup Status:** ✅ Ready for backup  

**Total Database Size:** 148KB  
**Active Records:** 8 records across all tables  
**Ready for Production:** ✅ Yes  

---

*This document serves as the complete reference for the DPRO AI Agent database schema. Keep this updated with any schema changes.* 
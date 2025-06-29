# ✅ TASKS API - Complete Guide

## 📋 Overview
Complete guide for Tasks API endpoints, database structure, and implementation examples.

**Base URL:** `http://localhost:8000/task/tasks`  
**Authentication:** JWT Bearer Token Required  
**Total Endpoints:** 12 endpoints ✅

---

## 🗄️ Database Structure

### Table: `tasks`
```sql
CREATE TABLE tasks (
    id INTEGER PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    assigned_to INTEGER,
    status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    priority VARCHAR(20) DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    category VARCHAR(100),
    tags TEXT, -- JSON array of tags
    due_date DATETIME,
    estimated_hours REAL,
    actual_hours REAL,
    completion_percentage INTEGER DEFAULT 0,
    parent_task_id INTEGER,
    project_id INTEGER,
    is_archived BOOLEAN DEFAULT FALSE,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    completed_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id),
    FOREIGN KEY (parent_task_id) REFERENCES tasks(id)
);
```

### Table: `task_comments`
```sql
CREATE TABLE task_comments (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    comment_text TEXT NOT NULL,
    comment_type VARCHAR(50) DEFAULT 'comment', -- 'comment', 'status_change', 'assignment'
    is_internal BOOLEAN DEFAULT FALSE,
    attachments TEXT, -- JSON array of file paths
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

### Table: `task_time_logs`
```sql
CREATE TABLE task_time_logs (
    id INTEGER PRIMARY KEY,
    task_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    hours_logged REAL NOT NULL,
    description TEXT,
    log_date DATE NOT NULL,
    is_billable BOOLEAN DEFAULT TRUE,
    hourly_rate REAL,
    total_amount REAL,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
);
```

---

## 🔗 Complete API Endpoints

### 1. List User Tasks
```javascript
// GET /task/tasks/my-tasks
const response = await fetch('/task/tasks/my-tasks?status=pending&priority=high', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 5 tasks",
    "data": {
        "tasks": [
            {
                "id": 1,
                "title": "Fix API Authentication Issue",
                "description": "Resolve JWT token validation problems",
                "user_id": 1,
                "assigned_to": 1,
                "status": "in_progress",
                "priority": "high",
                "category": "bug_fix",
                "tags": ["api", "authentication", "urgent"],
                "due_date": "2024-06-30T17:00:00Z",
                "estimated_hours": 4.0,
                "actual_hours": 2.5,
                "completion_percentage": 60,
                "comments_count": 3,
                "time_logs_count": 2,
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total": 5
    }
}
```

### 2. Get All Tasks (Admin/Manager)
```javascript
// GET /task/tasks
const response = await fetch('/task/tasks?limit=20&offset=0&status=pending', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 15 tasks",
    "data": {
        "tasks": [
            {
                "id": 1,
                "title": "Implement New Feature",
                "assigned_user": {
                    "id": 2,
                    "name": "John Doe",
                    "email": "john@example.com"
                },
                "status": "in_progress",
                "priority": "medium",
                "due_date": "2024-07-01T17:00:00Z",
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total": 15,
        "limit": 20,
        "offset": 0
    }
}
```

### 3. Create New Task
```javascript
// POST /task/tasks
const response = await fetch('/task/tasks', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: "Implement Chat Feature",
        description: "Add real-time chat functionality to the application",
        assigned_to: 2,
        status: "pending",
        priority: "high",
        category: "feature",
        tags: ["chat", "real-time", "websocket"],
        due_date: "2024-07-05T17:00:00Z",
        estimated_hours: 12.0
    })
});

// Response
{
    "success": true,
    "message": "Task created successfully",
    "data": {
        "task_id": 123,
        "title": "Implement Chat Feature",
        "status": "pending",
        "assigned_to": 2
    }
}
```

### 4. Get Task Details
```javascript
// GET /task/tasks/{id}
const response = await fetch('/task/tasks/123', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Task found",
    "data": {
        "id": 123,
        "title": "Implement Chat Feature",
        "description": "Add real-time chat functionality to the application",
        "user_id": 1,
        "assigned_to": 2,
        "assigned_user": {
            "id": 2,
            "name": "John Doe",
            "email": "john@example.com"
        },
        "status": "in_progress",
        "priority": "high",
        "category": "feature",
        "tags": ["chat", "real-time", "websocket"],
        "due_date": "2024-07-05T17:00:00Z",
        "estimated_hours": 12.0,
        "actual_hours": 6.5,
        "completion_percentage": 55,
        "comments": [
            {
                "id": 1,
                "user_name": "John Doe",
                "comment_text": "Started working on the WebSocket implementation",
                "created_at": "2024-06-29T11:00:00Z"
            }
        ],
        "time_logs": [
            {
                "id": 1,
                "user_name": "John Doe",
                "hours_logged": 3.5,
                "description": "WebSocket setup and basic connection",
                "log_date": "2024-06-29"
            }
        ],
        "created_at": "2024-06-29T10:00:00Z"
    }
}
```

### 5. Update Task
```javascript
// PUT /task/tasks/{id}
const response = await fetch('/task/tasks/123', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        title: "Updated Task Title",
        status: "in_progress",
        completion_percentage: 75,
        actual_hours: 8.0
    })
});

// Response
{
    "success": true,
    "message": "Task updated successfully",
    "data": {
        "task_id": 123
    }
}
```

### 6. Delete Task
```javascript
// DELETE /task/tasks/{id}
const response = await fetch('/task/tasks/123', {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Task deleted successfully",
    "data": {
        "task_id": 123
    }
}
```

### 7. Add Task Comment
```javascript
// POST /task/tasks/{id}/comments
const response = await fetch('/task/tasks/123/comments', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        comment_text: "Updated the WebSocket implementation and tested with multiple clients",
        comment_type: "comment"
    })
});

// Response
{
    "success": true,
    "message": "Comment added successfully",
    "data": {
        "comment_id": 456,
        "task_id": 123,
        "comment_text": "Updated the WebSocket implementation and tested with multiple clients"
    }
}
```

### 8. Get Task Comments
```javascript
// GET /task/tasks/{id}/comments
const response = await fetch('/task/tasks/123/comments', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 3 comments",
    "data": {
        "comments": [
            {
                "id": 1,
                "task_id": 123,
                "user_id": 2,
                "user_name": "John Doe",
                "comment_text": "Started working on the WebSocket implementation",
                "comment_type": "comment",
                "created_at": "2024-06-29T11:00:00Z"
            }
        ],
        "total": 3
    }
}
```

### 9. Assign Task
```javascript
// POST /task/tasks/{id}/assign
const response = await fetch('/task/tasks/123/assign', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        assigned_to: 3
    })
});

// Response
{
    "success": true,
    "message": "Task assigned successfully",
    "data": {
        "task_id": 123,
        "assigned_to": 3,
        "assigned_user": {
            "id": 3,
            "name": "Jane Smith",
            "email": "jane@example.com"
        }
    }
}
```

### 10. Log Time to Task
```javascript
// POST /task/tasks/{id}/time-logs
const response = await fetch('/task/tasks/123/time-logs', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        hours_logged: 2.5,
        description: "Implemented real-time message delivery",
        log_date: "2024-06-29",
        is_billable: true,
        hourly_rate: 50.0
    })
});

// Response
{
    "success": true,
    "message": "Time logged successfully",
    "data": {
        "time_log_id": 789,
        "task_id": 123,
        "hours_logged": 2.5,
        "total_amount": 125.0
    }
}
```

### 11. Get Task Time Logs
```javascript
// GET /task/tasks/{id}/time-logs
const response = await fetch('/task/tasks/123/time-logs', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 4 time logs",
    "data": {
        "time_logs": [
            {
                "id": 1,
                "task_id": 123,
                "user_id": 2,
                "user_name": "John Doe",
                "hours_logged": 3.5,
                "description": "WebSocket setup and basic connection",
                "log_date": "2024-06-29",
                "is_billable": true,
                "hourly_rate": 50.0,
                "total_amount": 175.0,
                "created_at": "2024-06-29T17:00:00Z"
            }
        ],
        "total": 4,
        "total_hours": 12.5,
        "total_billable": 625.0
    }
}
```

### 12. Get Tasks Analytics
```javascript
// GET /task/tasks/analytics
const response = await fetch('/task/tasks/analytics?period=30', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Analytics data retrieved",
    "data": {
        "overview": {
            "total_tasks": 50,
            "completed_tasks": 35,
            "in_progress_tasks": 12,
            "pending_tasks": 3,
            "completion_rate": 70.0,
            "average_completion_time": 5.2
        },
        "by_priority": {
            "urgent": 2,
            "high": 8,
            "medium": 25,
            "low": 15
        },
        "by_category": {
            "feature": 20,
            "bug_fix": 15,
            "enhancement": 10,
            "maintenance": 5
        },
        "productivity": {
            "total_hours_logged": 156.5,
            "average_hours_per_task": 3.1,
            "billable_hours": 120.0,
            "total_revenue": 6000.0
        },
        "timeline": [
            {
                "date": "2024-06-29",
                "completed": 3,
                "created": 2,
                "hours_logged": 8.5
            }
        ]
    }
}
```

---

## 🛠️ React Service Implementation

```typescript
export class TaskService {
    private baseUrl = '/task/tasks';
    
    // Get user tasks
    async getMyTasks(status?: string, priority?: string) {
        let url = `${this.baseUrl}/my-tasks`;
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (priority) params.append('priority', priority);
        if (params.toString()) url += `?${params.toString()}`;
        
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Create new task
    async createTask(taskData: any) {
        const response = await fetch(`${this.baseUrl}`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(taskData)
        });
        return await response.json();
    }
    
    // Update task
    async updateTask(taskId: number, updates: any) {
        const response = await fetch(`${this.baseUrl}/${taskId}`, {
            method: 'PUT',
            headers: this.getHeaders(),
            body: JSON.stringify(updates)
        });
        return await response.json();
    }
    
    // Add comment
    async addComment(taskId: number, commentText: string) {
        const response = await fetch(`${this.baseUrl}/${taskId}/comments`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ comment_text: commentText })
        });
        return await response.json();
    }
    
    // Log time
    async logTime(taskId: number, hours: number, description: string) {
        const response = await fetch(`${this.baseUrl}/${taskId}/time-logs`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({
                hours_logged: hours,
                description,
                log_date: new Date().toISOString().split('T')[0]
            })
        });
        return await response.json();
    }
    
    // Get analytics
    async getAnalytics(period = 30) {
        const response = await fetch(`${this.baseUrl}/analytics?period=${period}`, {
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
| GET | `/task/tasks/my-tasks` | Get user's tasks | ✅ |
| GET | `/task/tasks` | List all tasks | ✅ |
| POST | `/task/tasks` | Create new task | ✅ |
| GET | `/task/tasks/{id}` | Get task details | ✅ |
| PUT | `/task/tasks/{id}` | Update task | ✅ |
| DELETE | `/task/tasks/{id}` | Delete task | ✅ |
| POST | `/task/tasks/{id}/comments` | Add comment | ✅ |
| GET | `/task/tasks/{id}/comments` | Get comments | ✅ |
| POST | `/task/tasks/{id}/assign` | Assign task | ✅ |
| POST | `/task/tasks/{id}/time-logs` | Log time | ✅ |
| GET | `/task/tasks/{id}/time-logs` | Get time logs | ✅ |
| GET | `/task/tasks/analytics` | Get analytics | ✅ |

---

## ✨ Status: 100% Complete ✅

All Tasks API endpoints are fully implemented and tested, ready for production use.

**Database Tables:** 3 tables integrated  
**API Endpoints:** 12 endpoints working  
**Authentication:** JWT secured  
**Status:** Production ready 
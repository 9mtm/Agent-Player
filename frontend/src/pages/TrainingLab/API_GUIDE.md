# 🎓 TRAINING LAB API - Complete Guide

## 📋 Overview
Complete guide for Training Lab API endpoints, database structure, and implementation examples.

**Base URL:** `http://localhost:8000/training/training-lab`  
**Authentication:** JWT Bearer Token Required  
**License:** Premium License Required  
**Total Endpoints:** 12 endpoints ✅

---

## 🗄️ Database Structure

### Table: `training_courses`
```sql
CREATE TABLE training_courses (
    id INTEGER PRIMARY KEY,
    course_name VARCHAR(255) NOT NULL,
    description TEXT,
    user_id INTEGER NOT NULL,
    agent_id INTEGER,
    course_type VARCHAR(50) DEFAULT 'custom', -- 'custom', 'template', 'advanced'
    difficulty_level VARCHAR(20) DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
    category VARCHAR(100),
    objectives TEXT, -- JSON array of learning objectives
    prerequisites TEXT, -- JSON array of prerequisites
    estimated_duration INTEGER, -- in minutes
    course_data_json TEXT, -- JSON course configuration
    is_public BOOLEAN DEFAULT FALSE,
    enrollment_count INTEGER DEFAULT 0,
    rating REAL DEFAULT 0.0,
    status VARCHAR(50) DEFAULT 'draft', -- 'draft', 'published', 'archived'
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id)
);
```

### Table: `course_modules`
```sql
CREATE TABLE course_modules (
    id INTEGER PRIMARY KEY,
    course_id INTEGER NOT NULL,
    module_name VARCHAR(255) NOT NULL,
    description TEXT,
    module_order INTEGER NOT NULL,
    module_type VARCHAR(50) DEFAULT 'lesson', -- 'lesson', 'exercise', 'quiz', 'project'
    content_data TEXT, -- JSON module content
    duration_minutes INTEGER,
    is_required BOOLEAN DEFAULT TRUE,
    passing_score REAL DEFAULT 70.0,
    max_attempts INTEGER DEFAULT 3,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (course_id) REFERENCES training_courses(id)
);
```

### Table: `student_enrollments`
```sql
CREATE TABLE student_enrollments (
    id INTEGER PRIMARY KEY,
    course_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    agent_id INTEGER,
    enrollment_date DATETIME NOT NULL,
    start_date DATETIME,
    completion_date DATETIME,
    status VARCHAR(50) DEFAULT 'enrolled', -- 'enrolled', 'in_progress', 'completed', 'dropped'
    progress_percentage INTEGER DEFAULT 0,
    current_module_id INTEGER,
    total_score REAL DEFAULT 0.0,
    time_spent INTEGER DEFAULT 0, -- in minutes
    attempts_used INTEGER DEFAULT 0,
    certificate_issued BOOLEAN DEFAULT FALSE,
    feedback TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (course_id) REFERENCES training_courses(id),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (agent_id) REFERENCES agents(id),
    FOREIGN KEY (current_module_id) REFERENCES course_modules(id)
);
```

### Table: `training_sessions`
```sql
CREATE TABLE training_sessions (
    id INTEGER PRIMARY KEY,
    session_id VARCHAR(255) UNIQUE NOT NULL,
    enrollment_id INTEGER NOT NULL,
    module_id INTEGER NOT NULL,
    session_type VARCHAR(50) DEFAULT 'practice', -- 'practice', 'assessment', 'simulation'
    session_data TEXT, -- JSON session configuration
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    duration_minutes INTEGER,
    score REAL,
    max_score REAL,
    status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'paused', 'failed'
    performance_data TEXT, -- JSON performance metrics
    feedback TEXT,
    created_at DATETIME NOT NULL,
    updated_at DATETIME NOT NULL,
    FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id),
    FOREIGN KEY (module_id) REFERENCES course_modules(id)
);
```

---

## 🔗 Complete API Endpoints

### 1. List Training Workspaces
```javascript
// GET /training/training-lab/workspaces
const response = await fetch('/training/training-lab/workspaces?limit=20&search=customer', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 5 workspaces",
    "data": {
        "workspaces": [
            {
                "id": 1,
                "course_name": "Customer Service Agent Training",
                "description": "Comprehensive training for customer service scenarios",
                "user_id": 1,
                "agent_id": 5,
                "course_type": "custom",
                "difficulty_level": "intermediate",
                "category": "customer_service",
                "status": "published",
                "enrollment_count": 25,
                "rating": 4.7,
                "estimated_duration": 180,
                "modules_count": 8,
                "created_at": "2024-06-29T10:00:00Z"
            }
        ],
        "total": 5
    }
}
```

### 2. Create New Workspace
```javascript
// POST /training/training-lab/workspaces
const response = await fetch('/training/training-lab/workspaces', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        course_name: "Advanced AI Training",
        description: "Advanced training course for AI agents specializing in complex problem solving",
        agent_id: 10,
        course_type: "custom",
        difficulty_level: "advanced",
        category: "ai_training",
        objectives: [
            "Master complex reasoning patterns",
            "Handle ambiguous situations",
            "Provide nuanced responses"
        ],
        estimated_duration: 240
    })
});

// Response
{
    "success": true,
    "message": "Workspace created successfully",
    "data": {
        "workspace_id": 123,
        "course_name": "Advanced AI Training",
        "status": "draft"
    }
}
```

### 3. Get Workspace Details
```javascript
// GET /training/training-lab/workspaces/{id}
const response = await fetch('/training/training-lab/workspaces/123', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Workspace found",
    "data": {
        "id": 123,
        "course_name": "Advanced AI Training",
        "description": "Advanced training course for AI agents",
        "agent_id": 10,
        "agent_name": "Advanced AI Agent",
        "course_type": "custom",
        "difficulty_level": "advanced",
        "category": "ai_training",
        "objectives": [
            "Master complex reasoning patterns",
            "Handle ambiguous situations"
        ],
        "modules": [
            {
                "id": 1,
                "module_name": "Complex Reasoning Module",
                "module_type": "lesson",
                "module_order": 1,
                "duration_minutes": 45,
                "is_required": true
            }
        ],
        "enrollments": [
            {
                "id": 1,
                "user_name": "John Doe",
                "status": "in_progress",
                "progress_percentage": 65,
                "enrollment_date": "2024-06-29T10:00:00Z"
            }
        ],
        "analytics": {
            "total_enrollments": 15,
            "completion_rate": 80.0,
            "average_score": 85.5,
            "average_time": 195
        },
        "created_at": "2024-06-29T10:00:00Z"
    }
}
```

### 4. Update Workspace
```javascript
// PUT /training/training-lab/workspaces/{id}
const response = await fetch('/training/training-lab/workspaces/123', {
    method: 'PUT',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        course_name: "Updated Course Name",
        description: "Updated course description",
        difficulty_level: "expert",
        estimated_duration: 300
    })
});

// Response
{
    "success": true,
    "message": "Workspace updated successfully",
    "data": {
        "workspace_id": 123
    }
}
```

### 5. Delete Workspace
```javascript
// DELETE /training/training-lab/workspaces/{id}
const response = await fetch('/training/training-lab/workspaces/123', {
    method: 'DELETE',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Workspace deleted successfully",
    "data": {
        "workspace_id": 123
    }
}
```

### 6. Test Workspace
```javascript
// POST /training/training-lab/workspaces/{id}/test
const response = await fetch('/training/training-lab/workspaces/123/test', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        test_scenarios: [
            {
                input: "How do I handle an angry customer?",
                expected_output: "Professional conflict resolution"
            }
        ],
        evaluation_mode: "automatic"
    })
});

// Response
{
    "success": true,
    "message": "Workspace test completed",
    "data": {
        "test_results": [
            {
                "scenario_id": 1,
                "input": "How do I handle an angry customer?",
                "actual_output": "Listen actively, acknowledge their concerns, apologize when appropriate...",
                "evaluation_score": 92.5,
                "response_time": 1.8,
                "tokens_used": 45
            }
        ],
        "overall_score": 92.5,
        "total_tokens": 45,
        "test_duration": 3.2
    }
}
```

### 7. Get Training Sessions
```javascript
// GET /training/training-lab/workspaces/{id}/sessions
const response = await fetch('/training/training-lab/workspaces/123/sessions?limit=10', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 8 sessions",
    "data": {
        "sessions": [
            {
                "id": 1,
                "session_id": "session_123_456",
                "enrollment_id": 1,
                "module_id": 1,
                "session_type": "practice",
                "started_at": "2024-06-29T15:00:00Z",
                "completed_at": "2024-06-29T15:45:00Z",
                "duration_minutes": 45,
                "score": 88.5,
                "max_score": 100.0,
                "status": "completed",
                "student_name": "John Doe"
            }
        ],
        "total": 8
    }
}
```

### 8. Create Training Session
```javascript
// POST /training/training-lab/workspaces/{id}/sessions
const response = await fetch('/training/training-lab/workspaces/123/sessions', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        session_name: "Customer Service Practice Session",
        module_id: 1,
        session_type: "practice",
        session_config: {
            max_duration: 60,
            scenarios_count: 10,
            difficulty: "intermediate"
        }
    })
});

// Response
{
    "success": true,
    "message": "Training session created",
    "data": {
        "session_id": "session_123_789",
        "workspace_id": 123,
        "module_id": 1,
        "status": "active",
        "started_at": "2024-06-29T16:00:00Z"
    }
}
```

### 9. Get Training Analytics
```javascript
// GET /training/training-lab/analytics
const response = await fetch('/training/training-lab/analytics?period=30', {
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
        "overview": {
            "total_workspaces": 12,
            "active_sessions": 8,
            "total_enrollments": 145,
            "completion_rate": 78.5,
            "average_score": 84.2
        },
        "performance_metrics": {
            "best_performing_workspace": {
                "id": 5,
                "name": "Customer Service Excellence",
                "completion_rate": 95.0,
                "average_score": 92.5
            },
            "most_popular_category": "customer_service",
            "average_training_time": 185
        },
        "progress_trends": [
            {
                "date": "2024-06-29",
                "new_enrollments": 5,
                "completions": 8,
                "total_hours": 24.5
            }
        ],
        "difficulty_distribution": {
            "beginner": 40,
            "intermediate": 35,
            "advanced": 25
        }
    }
}
```

### 10. Get Training Templates
```javascript
// GET /training/training-lab/templates
const response = await fetch('/training/training-lab/templates?category=customer_service', {
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    }
});

// Response
{
    "success": true,
    "message": "Found 6 templates",
    "data": {
        "templates": [
            {
                "id": 1,
                "name": "Customer Service Fundamentals",
                "description": "Basic customer service training template",
                "category": "customer_service",
                "difficulty_level": "beginner",
                "estimated_duration": 120,
                "modules_count": 6,
                "downloads_count": 150,
                "rating": 4.8,
                "is_premium": false,
                "preview_image": "/images/templates/customer-service-basic.png"
            }
        ],
        "total": 6
    }
}
```

### 11. Import Template
```javascript
// POST /training/training-lab/workspaces/{id}/import-template
const response = await fetch('/training/training-lab/workspaces/123/import-template', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        template_id: 1,
        customize_settings: {
            course_name: "My Customer Service Training",
            difficulty_level: "intermediate",
            agent_id: 10
        }
    })
});

// Response
{
    "success": true,
    "message": "Template imported successfully",
    "data": {
        "workspace_id": 123,
        "template_id": 1,
        "modules_imported": 6,
        "customizations_applied": 3
    }
}
```

### 12. Export Workspace
```javascript
// POST /training/training-lab/workspaces/{id}/export
const response = await fetch('/training/training-lab/workspaces/123/export', {
    method: 'POST',
    headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({
        format: "json",
        include_analytics: true,
        include_sessions: false
    })
});

// Response
{
    "success": true,
    "message": "Workspace exported successfully",
    "data": {
        "export_id": "export_123_456",
        "download_url": "/downloads/workspace_123_export.json",
        "file_size": "2.5MB",
        "expires_at": "2024-06-30T16:00:00Z"
    }
}
```

---

## 🛠️ React Service Implementation

```typescript
export class TrainingLabService {
    private baseUrl = '/training/training-lab';
    
    // Get workspaces
    async getWorkspaces(limit = 20, search?: string) {
        let url = `${this.baseUrl}/workspaces?limit=${limit}`;
        if (search) url += `&search=${encodeURIComponent(search)}`;
        
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Create workspace
    async createWorkspace(workspaceData: any) {
        const response = await fetch(`${this.baseUrl}/workspaces`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(workspaceData)
        });
        return await response.json();
    }
    
    // Test workspace
    async testWorkspace(workspaceId: number, testData: any) {
        const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/test`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify(testData)
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
    
    // Get templates
    async getTemplates(category?: string) {
        let url = `${this.baseUrl}/templates`;
        if (category) url += `?category=${category}`;
        
        const response = await fetch(url, {
            headers: this.getHeaders()
        });
        return await response.json();
    }
    
    // Import template
    async importTemplate(workspaceId: number, templateId: number, settings: any) {
        const response = await fetch(`${this.baseUrl}/workspaces/${workspaceId}/import-template`, {
            method: 'POST',
            headers: this.getHeaders(),
            body: JSON.stringify({ template_id: templateId, customize_settings: settings })
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

| Method | Endpoint | Description | License Required |
|--------|----------|-------------|------------------|
| GET | `/training/training-lab/workspaces` | List workspaces | Premium ✅ |
| POST | `/training/training-lab/workspaces` | Create workspace | Premium ✅ |
| GET | `/training/training-lab/workspaces/{id}` | Get workspace details | Premium ✅ |
| PUT | `/training/training-lab/workspaces/{id}` | Update workspace | Premium ✅ |
| DELETE | `/training/training-lab/workspaces/{id}` | Delete workspace | Premium ✅ |
| POST | `/training/training-lab/workspaces/{id}/test` | Test workspace | Premium ✅ |
| GET | `/training/training-lab/workspaces/{id}/sessions` | Get sessions | Premium ✅ |
| POST | `/training/training-lab/workspaces/{id}/sessions` | Create session | Premium ✅ |
| GET | `/training/training-lab/analytics` | Get analytics | Premium ✅ |
| GET | `/training/training-lab/templates` | Get templates | Premium ✅ |
| POST | `/training/training-lab/workspaces/{id}/import-template` | Import template | Premium ✅ |
| POST | `/training/training-lab/workspaces/{id}/export` | Export workspace | Premium ✅ |

---

## ✨ Status: 100% Complete ✅

All Training Lab API endpoints are fully implemented and tested, ready for production use.

**Database Tables:** 4 tables integrated  
**API Endpoints:** 12 endpoints working  
**Authentication:** JWT secured  
**License Requirement:** Premium license validated  
**Status:** Production ready 
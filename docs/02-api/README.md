# 🔗 API Documentation

## 📋 API Structure Overview

**Agent Player** API is built with FastAPI and provides comprehensive endpoints for all system features.

### 🎯 Current API Groups (39 endpoints)
1. **Auth API** (8 endpoints) - Authentication & authorization
2. **Users API** (12 endpoints) - User management
3. **Agents API** (10 endpoints) - AI agent management
4. **Chat API** (9 endpoints) - Communication system

### 🆕 New API Groups (45+ new endpoints)
5. **Training Lab API** (12 endpoints) - Agent training workspace
6. **Licensing API** (8 endpoints) - License validation
7. **Themes API** (10 endpoints) - Theme system
8. **AI Trainer API** (8 endpoints) - Course generation
9. **Form Builder API** (7 endpoints) - Form designer
10. **Marketplace API** (8+ endpoints) - Component marketplace

### 📊 API Statistics
- **Current:** 39 endpoints across 4 groups
- **Planned:** 84+ endpoints across 10 groups
- **Coverage:** Complete system functionality

### 🔧 API Features
- FastAPI framework
- Automatic OpenAPI documentation
- Request/response validation
- JWT authentication
- Rate limiting
- Error handling

### 📁 API Endpoint Examples:

#### Training Lab API
```
POST   /api/training-lab/workspaces
GET    /api/training-lab/workspaces
PUT    /api/training-lab/workspaces/{id}
DELETE /api/training-lab/workspaces/{id}
POST   /api/training-lab/workspaces/{id}/test
```

#### Licensing API
```
POST   /api/licensing/validate
GET    /api/licensing/status
POST   /api/licensing/activate
GET    /api/licensing/hardware-info
```

#### Themes API
```
GET    /api/themes
POST   /api/themes
GET    /api/themes/marketplace
POST   /api/themes/import
POST   /api/themes/export/{id}
```

### 🚀 Implementation Priority:
1. **Week 1:** Enhance existing APIs
2. **Week 2:** Implement Training Lab API
3. **Week 3:** Add Licensing & Themes APIs
4. **Week 4:** Complete AI Trainer & Form Builder APIs 
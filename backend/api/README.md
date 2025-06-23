# DPRO AI Agent - API Organization Guide

## CRITICAL RULES FOR AI ASSISTANTS
**READ THIS FILE BEFORE MAKING ANY CHANGES TO THE API STRUCTURE**

---

## MANDATORY CODING STANDARDS

### Language Policy
- **ALL CODE MUST BE WRITTEN IN ENGLISH ONLY**
- **NO ARABIC COMMENTS OR VARIABLE NAMES**
- **ALL DOCUMENTATION IN ENGLISH**
- **ALL API RESPONSES IN ENGLISH**
- **ALL ERROR MESSAGES IN ENGLISH**

### File Organization Rules

#### Directory Structure (FIXED - DO NOT MODIFY)
```
backend/api/
├── auth/                   # Authentication endpoints
│   ├── __init__.py        # Module initialization
│   └── endpoints.py       # Auth routes only
├── agents/                 # Agent management endpoints  
│   ├── __init__.py        # Module initialization
│   └── endpoints.py       # Agent routes only
├── chat/                   # Chat and conversation endpoints
│   ├── __init__.py        # Module initialization
│   └── endpoints.py       # Chat routes only
├── users/                  # User management endpoints
│   ├── __init__.py        # Module initialization
│   └── endpoints.py       # User routes only
└── README.md              # This file (API rules)
```

---

## API ENDPOINT ORGANIZATION

### Authentication APIs (/auth/*)
**File: backend/api/auth/endpoints.py**
```python
# Required imports
from fastapi import APIRouter, Depends, HTTPException
from models.shared import LoginRequest, RegisterRequest, SuccessResponse
from core.dependencies import get_current_user, get_current_admin
from services.auth_service import AuthService

# Required router setup
router = APIRouter(prefix="/auth", tags=["Authentication"])

# Required endpoints (DO NOT REMOVE)
POST   /auth/login                 # User login
POST   /auth/register/admin        # Admin registration
GET    /auth/me                    # Current user info
POST   /auth/logout               # User logout
POST   /auth/refresh              # Token refresh
GET    /auth/system/status        # System status
GET    /auth/users                # All users (admin only)
```

### Agent APIs (/agents/*)
**File: backend/api/agents/endpoints.py**
```python
# Required imports
from fastapi import APIRouter, Depends, HTTPException, Query
from models.agent import AgentCreateRequest, AgentUpdateRequest
from models.shared import SuccessResponse
from core.dependencies import get_current_user, get_optional_user
from services.agent_service import AgentService

# Required router setup
router = APIRouter(prefix="/agents", tags=["Agents"])

# Required endpoints (DO NOT REMOVE)
GET    /agents                    # All agents
GET    /agents/main               # Main agents only
GET    /agents/child              # Child agents only
GET    /agents/{agent_id}         # Specific agent
POST   /agents                    # Create agent
POST   /agents/child              # Create child agent
PUT    /agents/{agent_id}         # Update agent
DELETE /agents/{agent_id}         # Delete agent
POST   /agents/{agent_id}/test    # Test agent
GET    /agents/{agent_id}/children # Agent children
GET    /agents/statistics/overview # Agent statistics
```

### Chat APIs (/chat/*)
**File: backend/api/chat/endpoints.py**
```python
# Required imports
from fastapi import APIRouter, Depends, HTTPException, Query
from models.chat import ConversationCreateRequest, MessageCreateRequest
from models.shared import SuccessResponse
from core.dependencies import get_current_user
from services.chat_service import ChatService

# Required router setup
router = APIRouter(prefix="/chat", tags=["Chat"])

# Required endpoints (DO NOT REMOVE)
GET    /chat/conversations                           # User conversations
POST   /chat/conversations                          # Create conversation
GET    /chat/conversations/{conversation_id}        # Get conversation
PUT    /chat/conversations/{conversation_id}        # Update conversation
DELETE /chat/conversations/{conversation_id}        # Delete conversation
GET    /chat/conversations/{conversation_id}/messages # Get messages
POST   /chat/conversations/{conversation_id}/messages # Add message
POST   /chat/conversations/{conversation_id}/ai-response # AI response
GET    /chat/analytics/dashboard                    # User analytics
GET    /chat/analytics/global                       # Global analytics (admin)
GET    /chat/search                                 # Search messages
```

### User APIs (/users/*)
**File: backend/api/users/endpoints.py**
```python
# Required imports
from fastapi import APIRouter, Depends, HTTPException
from models.shared import SuccessResponse, UserUpdate
from core.dependencies import get_current_user, get_current_admin
from services.user_service import UserService

# Required router setup
router = APIRouter(prefix="/users", tags=["Users"])

# Required endpoints (DO NOT REMOVE)
GET    /users/profile              # Current user profile
PUT    /users/profile              # Update profile
GET    /users/settings             # User settings
PUT    /users/settings             # Update settings
GET    /users/admin/all            # All users (admin only)
```

---

## CODING PATTERNS (MANDATORY)

### Endpoint Structure Template
```python
@router.get("/endpoint", response_model=SuccessResponse)
async def endpoint_name(
    # Parameters
    current_user: Dict = Depends(get_current_user)
):
    """
    English description of endpoint functionality
    """
    try:
        # Business logic using services
        result = service.method_name(parameters)
        
        # Return structured response
        return SuccessResponse(
            message="English success message",
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="English error message")
```

### Response Format (MANDATORY)
```python
# Success responses
{
    "success": true,
    "message": "English message",
    "data": { ... },
    "timestamp": "2024-01-01T00:00:00"
}

# Error responses
{
    "success": false,
    "message": "English error message",
    "error_code": "ERROR_CODE",
    "timestamp": "2024-01-01T00:00:00"
}
```

---

## SERVICES INTEGRATION

### Services Location
```
backend/services/
├── auth_service.py      # AuthService class
├── agent_service.py     # AgentService class  
├── chat_service.py      # ChatService class
├── user_service.py      # UserService class
└── __init__.py         # Services module
```

### Service Usage Pattern
```python
# Import service
from services.auth_service import AuthService

# Initialize in endpoint file
auth_service = AuthService()

# Use in endpoints
result = await auth_service.login(email, password)
```

---

## CRITICAL RULES FOR AI ASSISTANTS

### FORBIDDEN ACTIONS
1. **DO NOT** create new API directories
2. **DO NOT** move endpoints between directories
3. **DO NOT** change router prefixes
4. **DO NOT** remove existing endpoints
5. **DO NOT** use Arabic in any code
6. **DO NOT** modify the main structure

### ALLOWED ACTIONS
1. **ADD** new endpoints to existing directories
2. **MODIFY** endpoint logic within existing files
3. **UPDATE** models and schemas
4. **ENHANCE** error handling
5. **IMPROVE** documentation (in English only)

### MODIFICATION WORKFLOW
1. **READ** this README file completely
2. **IDENTIFY** which API category your change belongs to
3. **EDIT** only the appropriate endpoints.py file
4. **ENSURE** all code is in English
5. **TEST** endpoint functionality
6. **UPDATE** documentation if needed

---

## LEGACY API COMPATIBILITY

### Legacy Routes (Maintained for Frontend)
All endpoints are also available under /api/v1/ prefix:
```
/auth/login          → /api/v1/auth/login
/agents              → /api/v1/agents  
/chat/conversations  → /api/v1/chat/conversations
/users/profile       → /api/v1/users/profile
```

---

## QUALITY STANDARDS

### Documentation Requirements
- Every endpoint must have clear English docstring
- All parameters must be documented
- Response models must be specified
- Error cases must be handled

### Security Requirements
- All protected endpoints must use get_current_user
- Admin endpoints must use get_current_admin
- Input validation using Pydantic models
- Proper error handling and status codes

### Testing Requirements
- Each endpoint should be testable
- Clear error messages in English
- Consistent response format
- Proper HTTP status codes

---

## QUICK REFERENCE

### File Locations
- **API Endpoints**: backend/api/{module}/endpoints.py
- **Models**: backend/models/{module}.py
- **Services**: backend/services/{module}_service.py
- **Dependencies**: backend/core/dependencies.py
- **Configuration**: backend/config/settings.py

### Common Imports
```python
# FastAPI imports
from fastapi import APIRouter, Depends, HTTPException, status, Query

# Project imports
from models.shared import SuccessResponse
from core.dependencies import get_current_user, get_current_admin
from services.{module}_service import {Module}Service

# Types
from typing import Dict, Any, List, Optional
```

---

## REMEMBER: ENGLISH ONLY!
**All code, comments, variables, functions, classes, and documentation must be written in English. This is a strict requirement for code consistency and international collaboration.**

---

*Last Updated: 2024-12-22*
*Version: 2.0.0* 
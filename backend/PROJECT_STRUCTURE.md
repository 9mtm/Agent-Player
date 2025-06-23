# DPRO AI Agent - Project Structure Guide

## PROJECT OVERVIEW
**DPRO AI Agent** is a unified FastAPI application that consolidates multiple AI agent services into a single, manageable system running on port 8000.

---

## COMPLETE PROJECT TREE

```
dpro_ai_agent/
├── backend/                           # Main Backend Application
│   ├── config/                        # System Configuration
│   │   ├── __init__.py               # Config module
│   │   ├── settings.py               # Application settings
│   │   └── database.py               # Database configuration
│   │
│   ├── core/                          # Core System Components
│   │   ├── __init__.py               # Core module
│   │   ├── security.py               # JWT & security utilities
│   │   └── dependencies.py           # FastAPI dependencies
│   │
│   ├── models/                        # Pydantic Models
│   │   ├── __init__.py               # Models module
│   │   ├── shared.py                 # Common models & responses
│   │   ├── agent.py                  # Agent-specific models
│   │   ├── chat.py                   # Chat & conversation models
│   │   └── user.py                   # User-related models
│   │
│   ├── api/                          # API Endpoints (Organized by Feature)
│   │   ├── __init__.py               # API module
│   │   ├── README.md                 # API organization rules
│   │   ├── auth/                     # Authentication endpoints
│   │   │   ├── __init__.py          # Auth module
│   │   │   └── endpoints.py         # Auth routes
│   │   ├── agents/                   # Agent management endpoints
│   │   │   ├── __init__.py          # Agents module
│   │   │   └── endpoints.py         # Agent routes
│   │   ├── chat/                     # Chat endpoints
│   │   │   ├── __init__.py          # Chat module
│   │   │   └── endpoints.py         # Chat routes
│   │   └── users/                    # User management endpoints
│   │       ├── __init__.py          # Users module
│   │       └── endpoints.py         # User routes
│   │
│   ├── services/                      # Business Logic Services
│   │   ├── __init__.py               # Services module
│   │   ├── auth_service.py           # Authentication service
│   │   ├── agent_service.py          # Agent management service
│   │   ├── chat_service.py           # Chat & conversation service
│   │   └── user_service.py           # User management service
│   │
│   ├── logs/                         # Application Logs
│   │   ├── api/                      # API-related logs
│   │   ├── auth/                     # Authentication logs
│   │   ├── agents/                   # Agent operation logs
│   │   ├── chat/                     # Chat system logs
│   │   ├── database/                 # Database operation logs
│   │   ├── errors/                   # Error logs
│   │   └── system/                   # System logs
│   │
│   ├── files/                        # File storage
│   ├── data/                         # Data files
│   ├── backups/                      # Database backups
│   │
│   ├── main.py                       # Main FastAPI application
│   ├── simple_main.py                # Simplified test server
│   ├── dpro_agent.db                 # SQLite database
│   ├── requirements.txt              # Python dependencies
│   ├── PROJECT_STRUCTURE.md          # This file
│   └── README.md                     # Backend documentation
│
├── frontend/                         # React Frontend Application
│   ├── src/                          # Source code
│   │   ├── components/               # Reusable components
│   │   │   ├── Auth/                 # Authentication components
│   │   │   ├── Board/                # Board components
│   │   │   ├── Layout/               # Layout components
│   │   │   └── ui/                   # UI components
│   │   │
│   │   ├── pages/                    # Page components
│   │   │   ├── Auth/                 # Login/Register pages
│   │   │   ├── Agent/                # Agent management pages
│   │   │   ├── Chat/                 # Chat interface pages
│   │   │   ├── Dashboard/            # Dashboard pages
│   │   │   └── [others]/             # Other feature pages
│   │   │
│   │   ├── services/                 # API services
│   │   │   ├── api.ts                # Main API client
│   │   │   ├── auth.ts               # Authentication API
│   │   │   ├── agents.ts             # Agents API
│   │   │   ├── chat.ts               # Chat API
│   │   │   └── [others].ts           # Other API services
│   │   │
│   │   ├── hooks/                    # Custom React hooks
│   │   ├── types/                    # TypeScript types
│   │   ├── utils/                    # Utility functions
│   │   ├── context/                  # React contexts
│   │   └── config/                   # Configuration
│   │
│   ├── public/                       # Static assets
│   ├── package.json                  # Frontend dependencies
│   └── [config files]                # Build configuration
│
└── README.md                         # Project root documentation
```

---

## ARCHITECTURE PRINCIPLES

### 1. Unified Backend Architecture
- **Single FastAPI Application**: All services consolidated into one app
- **Single Port Operation**: Everything runs on port 8000
- **Modular Design**: Clear separation of concerns
- **Service Layer Pattern**: Business logic separated from API layer

### 2. Clean Code Organization
- **Feature-Based Structure**: Organized by business domain
- **Consistent Naming**: English-only, descriptive names
- **Clear Dependencies**: Minimal coupling between modules
- **Proper Error Handling**: Consistent error responses

### 3. Scalable Design
- **Easy to Extend**: Add new features without restructuring
- **Maintainable**: Clear code organization and documentation
- **Testable**: Isolated components for easy testing
- **Deployable**: Single application deployment

---

## KEY COMPONENTS EXPLANATION

### Configuration Layer (`config/`)
- **settings.py**: Central configuration management
- **database.py**: Database connection and initialization
- Manages environment variables and system settings

### Core Layer (`core/`)
- **security.py**: JWT authentication and password hashing
- **dependencies.py**: FastAPI dependency injection
- Provides system-wide utilities and security

### Models Layer (`models/`)
- **Pydantic Models**: Data validation and serialization
- **Type Safety**: Ensures data consistency
- **API Documentation**: Auto-generates OpenAPI specs

### API Layer (`api/`)
- **Feature-Based Routing**: Organized by business domain
- **Consistent Patterns**: Standard endpoint structure
- **Legacy Compatibility**: Maintains `/api/v1/` prefix

### Services Layer (`services/`)
- **Business Logic**: Core application functionality
- **Database Operations**: Data access and manipulation
- **External Integrations**: AI models and third-party APIs

---

## DEVELOPMENT WORKFLOW

### Adding New Features
1. **Identify Domain**: Determine which API module (auth/agents/chat/users)
2. **Create Models**: Add Pydantic models if needed
3. **Implement Service**: Add business logic to appropriate service
4. **Create Endpoints**: Add API endpoints to correct module
5. **Update Frontend**: Modify frontend API calls if needed

### Code Standards
- **English Only**: All code must be in English
- **Consistent Naming**: Use descriptive, clear names
- **Proper Documentation**: Document all functions and classes
- **Error Handling**: Use consistent error responses
- **Type Hints**: Use Python type hints throughout

### Testing Approach
- **Service Testing**: Test business logic independently
- **API Testing**: Test endpoints with various scenarios
- **Integration Testing**: Test complete user workflows
- **Frontend Testing**: Test UI interactions

---

## MIGRATION FROM MICROSERVICES

### Previous Architecture
- **5 Separate Services**: Running on ports 8000-8005
- **Complex Networking**: Inter-service communication
- **Deployment Overhead**: Multiple service management
- **Development Complexity**: Multiple codebases

### New Unified Architecture
- **Single Application**: One FastAPI app on port 8000
- **Shared Database**: Single SQLite database
- **Simplified Deployment**: One application to deploy
- **Easier Development**: Single codebase to manage

### Migration Benefits
- **Reduced Complexity**: 80% reduction in infrastructure
- **Faster Development**: Single debugging environment
- **Better Performance**: No network latency between services
- **Easier Maintenance**: One application to update

---

## DEPLOYMENT STRUCTURE

### Development Environment
```bash
# Start backend
cd backend
python simple_main.py

# Start frontend (separate terminal)
cd frontend
npm run dev
```

### Production Environment
```bash
# Backend with production settings
cd backend
python main.py

# Frontend built for production
cd frontend
npm run build
```

---

## API ENDPOINTS OVERVIEW

### Authentication (`/auth/`)
- User login and registration
- JWT token management
- System status and user management

### Agents (`/agents/`)
- Agent creation and management
- Agent testing and statistics
- Child agent relationships

### Chat (`/chat/`)
- Conversation management
- Message handling
- AI response generation

### Users (`/users/`)
- User profile management
- Settings and preferences
- Admin user operations

---

## FRONTEND INTEGRATION

### API Service Layer
- **Centralized API Client**: Single configuration point
- **Type Safety**: TypeScript interfaces for all APIs
- **Error Handling**: Consistent error management
- **Loading States**: Proper loading state management

### Component Structure
- **Page Components**: Main page layouts
- **Feature Components**: Business logic components
- **UI Components**: Reusable interface elements
- **Layout Components**: Navigation and structure

---

## DATABASE DESIGN

### Core Tables
- **users**: User accounts and authentication
- **agents**: AI agent configurations
- **conversations**: Chat conversations
- **messages**: Individual chat messages
- **activity_logs**: System activity tracking

### Relationships
- Users can have multiple agents
- Agents can participate in conversations
- Conversations contain multiple messages
- All activities are logged for audit

---

## SECURITY CONSIDERATIONS

### Authentication
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcrypt for password security
- **Role-Based Access**: Admin and user roles
- **Session Management**: Proper token expiration

### API Security
- **Input Validation**: Pydantic model validation
- **CORS Configuration**: Proper cross-origin settings
- **Rate Limiting**: Prevention of abuse
- **Error Sanitization**: No sensitive data in errors

---

## MONITORING AND LOGGING

### Log Structure
- **Structured Logging**: JSON-formatted logs
- **Feature-Based Logs**: Separate logs per feature
- **Error Tracking**: Comprehensive error logging
- **Performance Metrics**: Request timing and statistics

### Log Locations
- API requests/responses: `logs/api/`
- Authentication events: `logs/auth/`
- Agent operations: `logs/agents/`
- Chat activities: `logs/chat/`
- Database operations: `logs/database/`
- System events: `logs/system/`

---

## FUTURE ENHANCEMENTS

### Planned Features
- **Real-time Chat**: WebSocket implementation
- **Advanced AI Models**: Integration with multiple LLMs
- **File Management**: Document upload and processing
- **Analytics Dashboard**: Usage statistics and insights
- **Multi-language Support**: Internationalization

### Scalability Options
- **Database Migration**: Move to PostgreSQL for production
- **Caching Layer**: Redis for performance
- **Load Balancing**: Multiple application instances
- **Container Deployment**: Docker and Kubernetes

---

## DEVELOPMENT GUIDELINES

### Code Quality
- **English Only**: All code in English language
- **Consistent Formatting**: Use proper code formatting
- **Clear Documentation**: Document all major functions
- **Error Messages**: Descriptive, user-friendly errors

### Performance
- **Database Optimization**: Efficient queries
- **Response Times**: Fast API responses
- **Memory Management**: Proper resource cleanup
- **Caching Strategy**: Cache frequently accessed data

### Maintenance
- **Regular Updates**: Keep dependencies updated
- **Security Patches**: Apply security fixes promptly
- **Backup Strategy**: Regular database backups
- **Documentation**: Keep documentation current

---

*This structure represents a modern, scalable, and maintainable FastAPI application designed for AI agent management and chat functionality.*

**Last Updated**: 2024-12-22  
**Version**: 2.0.0 
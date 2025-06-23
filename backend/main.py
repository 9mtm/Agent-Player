"""
DPRO AI Agent - Unified Server
Single FastAPI application with organized structure
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from datetime import datetime

# Import configuration
from config.settings import settings, get_cors_settings
from config.database import db

# Import API routers
from api.auth.endpoints import router as auth_router
from api.agents.endpoints import router as agents_router
from api.chat.endpoints import router as chat_router
from api.users.endpoints import router as users_router

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
    description=settings.DESCRIPTION,
    debug=settings.DEBUG
)

# Add CORS middleware
cors_settings = get_cors_settings()
app.add_middleware(
    CORSMiddleware,
    **cors_settings
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    try:
        # Initialize database
        db.initialize_database()
        logger.info("Database initialized successfully")
        
        # Log startup info
        logger.info(f"{settings.APP_NAME} v{settings.VERSION} starting up")
        logger.info(f"Server: {settings.HOST}:{settings.PORT}")
        logger.info(f"Debug mode: {settings.DEBUG}")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

# Include API routers
app.include_router(auth_router)
app.include_router(agents_router)
app.include_router(chat_router)
app.include_router(users_router)

# Legacy API compatibility (v1 routes)
app.include_router(auth_router, prefix="/api/v1")
app.include_router(agents_router, prefix="/api/v1")
app.include_router(chat_router, prefix="/api/v1")
app.include_router(users_router, prefix="/api/v1")

# Root endpoint
@app.get("/")
async def root():
    """Application information and available routes"""
    return {
        "application": settings.APP_NAME,
        "version": settings.VERSION,
        "description": settings.DESCRIPTION,
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "endpoints": {
            "Authentication": {
                "login": "POST /auth/login",
                "register": "POST /auth/register/admin",
                "profile": "GET /auth/me",
                "logout": "POST /auth/logout"
            },
            "Agents": {
                "list": "GET /agents",
                "create": "POST /agents",
                "details": "GET /agents/{id}",
                "update": "PUT /agents/{id}",
                "delete": "DELETE /agents/{id}",
                "test": "POST /agents/{id}/test"
            },
            "Chat": {
                "conversations": "GET /chat/conversations",
                "create_conversation": "POST /chat/conversations",
                "messages": "GET /chat/conversations/{id}/messages",
                "send_message": "POST /chat/conversations/{id}/messages",
                "ai_response": "POST /chat/conversations/{id}/ai-response"
            },
            "Users": {
                "profile": "GET /users/profile",
                "settings": "GET /users/settings",
                "activity": "GET /users/activity",
                "admin": "GET /users/admin/all"
            }
        },
        "legacy_api": {
            "note": "All endpoints also available under /api/v1/ prefix",
            "example": "/api/v1/auth/login"
        }
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Application health check"""
    try:
        # Test database connection
        db.execute_query("SELECT 1")
        database_status = "connected"
    except Exception:
        database_status = "disconnected"
    
    return {
        "status": "healthy" if database_status == "connected" else "unhealthy",
        "application": settings.APP_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.utcnow().isoformat(),
        "database": database_status,
        "debug_mode": settings.DEBUG
    }

# System status endpoint
@app.get("/system/status")
async def system_status():
    """Detailed system status information"""
    try:
        # Database stats
        users_count = len(db.execute_query("SELECT id FROM users"))
        agents_count = len(db.execute_query("SELECT id FROM agents"))
        conversations_count = len(db.execute_query("SELECT id FROM conversations"))
        
        return {
            "application": settings.APP_NAME,
            "version": settings.VERSION,
            "status": "operational",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "status": "connected",
                "users": users_count,
                "agents": agents_count,
                "conversations": conversations_count
            },
            "configuration": {
                "debug": settings.DEBUG,
                "cors_enabled": True,
                "api_versions": ["v1", "latest"]
            }
        }
    except Exception as e:
        logger.error(f"System status error: {e}")
        return JSONResponse(
            status_code=500,
            content={
                "status": "error",
                "message": "Failed to get system status",
                "timestamp": datetime.utcnow().isoformat()
            }
        )

# Global exception handler
@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler for unhandled errors"""
    logger.error(f"Unhandled exception: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Run the application
if __name__ == "__main__":
    print(f"Starting {settings.APP_NAME} v{settings.VERSION}")
    print(f"Server will be available at: http://{settings.HOST}:{settings.PORT}")
    print(f"API Documentation: http://{settings.HOST}:{settings.PORT}/docs")
    print(f"Debug Mode: {settings.DEBUG}")
    print("=" * 60)
    
    uvicorn.run(
        "main:app",
        host=settings.HOST,
        port=settings.PORT,
        reload=settings.RELOAD,
        log_level=settings.LOG_LEVEL.lower()
    ) 
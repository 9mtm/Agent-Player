"""
DPRO AI Agent - Unified Server
Single FastAPI application with organized structure
"""

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from datetime import datetime

# Import configuration
from config.settings import settings
from config.database import init_db, get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Import API routers
from api.auth.endpoints import router as auth_router
from api.agents.endpoints import router as agents_router
from api.chat.endpoints import router as chat_router
from api.users.endpoints import router as users_router
from api.tasks.endpoints import router as tasks_router
from api.licensing.endpoints import router as licensing_router
from api.training_lab.endpoints import router as training_lab_router
from api.marketplace.endpoints import router as marketplace_router
from api.workflows.endpoints import router as workflows_router

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

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    """Initialize application on startup"""
    try:
        # Initialize database
        init_db()
        logger.info("Database initialized successfully")
        
        # Log startup info
        logger.info(f"{settings.APP_NAME} v{settings.VERSION} starting up")
        logger.info(f"Server: {settings.HOST}:{settings.PORT}")
        logger.info(f"Debug mode: {settings.DEBUG}")
        
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

# Include routers
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(users_router, prefix="/users", tags=["Users"])
app.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
app.include_router(licensing_router, prefix="/licensing", tags=["Licensing"])
app.include_router(training_lab_router, prefix="/training-lab", tags=["Training Lab"])
app.include_router(marketplace_router, prefix="/marketplace", tags=["Marketplace"])
app.include_router(workflows_router, prefix="/workflows", tags=["Workflows"])

# Root endpoint
@app.get("/")
async def root():
    """Application information and available routes"""
    return {
        "message": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "operational"
    }

# Health check endpoint
@app.get("/health")
async def health_check(db: AsyncSession = Depends(get_db)):
    """Application health check"""
    try:
        # Test database connection
        await db.execute("SELECT 1")
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
async def system_status(db: AsyncSession = Depends(get_db)):
    """Detailed system status information"""
    try:
        # Get database stats using SQLAlchemy
        users_count = await db.scalar("SELECT COUNT(*) FROM users")
        agents_count = await db.scalar("SELECT COUNT(*) FROM agents")
        conversations_count = await db.scalar("SELECT COUNT(*) FROM conversations")
        
        return {
            "application": settings.APP_NAME,
            "version": settings.VERSION,
            "status": "operational",
            "timestamp": datetime.utcnow().isoformat(),
            "database": {
                "status": "connected",
                "users": users_count or 0,
                "agents": agents_count or 0,
                "conversations": conversations_count or 0
            },
            "configuration": {
                "debug": settings.DEBUG,
                "cors_enabled": True,
                "api_versions": ["latest"]
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
"""
DPRO AI Agent - Unified Server
Single FastAPI application with organized structure
"""

import os
import sys
from pathlib import Path
import asyncio

# Add the backend directory to PYTHONPATH
backend_dir = Path(__file__).resolve().parent
sys.path.append(str(backend_dir))

from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
import uvicorn
import logging
from datetime import datetime, timedelta

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
from api.system.endpoints import router as system_router
from api.workflows.endpoints import router as workflows_router

# Import SystemMonitorService
from backend.services.system_monitor_service import SystemMonitorService

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.LOG_LEVEL),
    format=settings.LOG_FORMAT
)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title="Dpro AI Agent API",
    description="API for Dpro AI Agent platform",
    version="1.0.0"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize SystemMonitorService
system_monitor = SystemMonitorService()

def seconds_until_next_day():
    now = datetime.now()
    tomorrow = (now + timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
    return (tomorrow - now).total_seconds() + 1

async def collect_metrics_daily():
    while True:
        now = datetime.now()
        last_metrics = system_monitor.get_last_metrics()
        last_date = None
        if last_metrics and "timestamp" in last_metrics:
            try:
                last_date = datetime.fromisoformat(last_metrics["timestamp"])
            except Exception:
                last_date = None
        # Collect if not collected today
        if not last_date or last_date.date() < now.date():
            logger.info("[SystemMonitor] Collecting system metrics for today...")
            system_monitor.get_system_metrics()
        # Sleep until next day
        await asyncio.sleep(seconds_until_next_day())

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
        # Collect system metrics once at startup
        logger.info("[SystemMonitor] Collecting system metrics at startup...")
        system_monitor.get_system_metrics()
    except Exception as e:
        logger.error(f"Startup error: {e}")
        raise

# Health check endpoint
@app.get("/health")
async def health_check():
    """System health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat()
    }

# System status endpoint
@app.get("/system/status")
async def system_status():
    """Detailed system status"""
    return {
        "status": "operational",
        "version": settings.VERSION,
        "environment": settings.ENVIRONMENT,
        "debug_mode": settings.DEBUG,
        "timestamp": datetime.utcnow().isoformat()
    }

# Include routers with standardized prefixes
app.include_router(auth_router, prefix="/auth", tags=["Authentication"])
app.include_router(agents_router, prefix="/agents", tags=["Agents"])
app.include_router(chat_router, prefix="/chat", tags=["Chat"])
app.include_router(users_router, prefix="/user", tags=["Users"])
app.include_router(tasks_router, prefix="/tasks", tags=["Tasks"])
app.include_router(licensing_router, prefix="/licensing", tags=["Licensing"])
app.include_router(training_lab_router, prefix="/training-lab", tags=["Training Lab"])
app.include_router(marketplace_router, prefix="/marketplace", tags=["Marketplace"])
app.include_router(system_router, prefix="/api/system", tags=["System"])
app.include_router(workflows_router, prefix="/workflows", tags=["Workflows & Boards"])

# Root endpoint
@app.get("/")
async def root():
    """Application information and available routes"""
    return {
        "message": settings.APP_NAME,
        "version": settings.VERSION,
        "status": "operational"
    }

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
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level=settings.LOG_LEVEL.lower()
    ) 
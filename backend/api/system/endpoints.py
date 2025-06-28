"""
System API Endpoints
Author: Agent Player Development Team
Description: System health monitoring and metrics
"""

# NOTE: Always run the app from the project root (C:\MAMP\htdocs\dpro_aI_agent) so that absolute imports like 'from backend.services...' work correctly.
# If you run from inside 'backend', you will get ModuleNotFoundError: No module named 'backend'.

from fastapi import APIRouter
from typing import Optional
from datetime import datetime
from backend.services.system_monitor_service import SystemMonitorService

router = APIRouter(tags=["System"])

@router.on_event("startup")
async def startup_event():
    """Start the scheduler on application startup"""
    pass

@router.on_event("shutdown")
async def shutdown_event():
    """Stop the scheduler on application shutdown"""
    pass

@router.get("/health")
async def health_check():
    """System health check endpoint"""
    return {"status": "ok"}

@router.get("/metrics/history")
async def get_metrics_history(hours: int = 24):
    """Get system health metrics history"""
    service = SystemMonitorService()
    history = service.get_metrics_history(hours=hours)
    return {"success": True, "data": history}

@router.get("/metrics/latest")
async def get_latest_metrics():
    """Get latest system health metrics"""
    service = SystemMonitorService()
    metrics = service.get_last_metrics()
    return {"success": True, "data": metrics}

@router.post("/metrics/collect")
async def collect_metrics_now():
    """Collect new system metrics now and return them"""
    service = SystemMonitorService()
    metrics = service.get_system_metrics()
    return {"success": True, "data": metrics} 
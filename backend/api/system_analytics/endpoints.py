"""
System Analytics API endpoints
Provides system performance metrics, health monitoring, and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, desc, and_, or_
from sqlalchemy.sql import text
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta
import logging

from core.dependencies import get_db, get_current_user
from models.database import User, SystemAnalytics, UserAnalytics, Agent, Conversation, Task
from schemas.system_analytics import (
    SystemAnalyticsResponse,
    SystemAnalyticsListResponse,
    SystemHealthReport,
    SystemPerformanceMetrics,
    SystemDashboardResponse,
    SystemTrendsResponse
)

router = APIRouter(prefix="/system-analytics", tags=["System Analytics"])
logger = logging.getLogger(__name__)

@router.get("/health")
async def system_health():
    """Basic health check for system analytics"""
    return {"status": "healthy", "service": "system-analytics"}

@router.get("/")
async def list_system_analytics(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List system analytics metrics (admin only)"""
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    
    return {"success": True, "data": [], "message": "System analytics endpoint working"} 
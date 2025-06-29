"""
Pydantic schemas for System Analytics API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class SystemAnalyticsResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class SystemAnalyticsListResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class SystemPerformanceMetrics(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class SystemUsageStats(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class SystemHealthReport(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class SystemDashboardResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class SystemTrendsResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] 
"""
Pydantic schemas for User Analytics API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserAnalyticsCreateRequest(BaseModel):
    event_type: str = Field(..., description="Type of analytics event")
    event_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Event data")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional metadata")


class UserAnalyticsUpdateRequest(BaseModel):
    event_data: Optional[Dict[str, Any]] = Field(None, description="Event data")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class UserAnalyticsResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class UserAnalyticsListResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class UserBehaviorAnalysis(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class UserEngagementMetrics(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class UserProductivityReport(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class UserInsightsResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any] 
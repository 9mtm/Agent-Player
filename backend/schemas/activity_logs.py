"""
Pydantic schemas for Activity Logs API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


class ActivityLogCreate(BaseModel):
    """Schema for creating activity log"""
    action: str = Field(..., description="Action performed by user", max_length=255)
    details: Optional[str] = Field(None, description="Additional details about the action", max_length=1000)


class ActivityLogResponse(BaseModel):
    """Schema for activity log response"""
    success: bool = Field(True, description="Request success status")
    data: Optional[Dict[str, Any]] = Field(None, description="Activity log data")
    message: Optional[str] = Field(None, description="Response message")


class ActivityLogListResponse(BaseModel):
    """Schema for activity logs list response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="List data with pagination")


class ActivityLogAnalyticsResponse(BaseModel):
    """Schema for activity logs analytics response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="Analytics data")


class ActivityLogSearchResponse(BaseModel):
    """Schema for activity logs search response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="Search results data")


class ActivityLogExportResponse(BaseModel):
    """Schema for activity logs export response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="Export metadata")
    download_url: str = Field(..., description="Download URL for exported file")


class ActivityLogBulkCreateResponse(BaseModel):
    """Schema for bulk activity log creation response"""
    success: bool = Field(True, description="Request success status")
    message: str = Field(..., description="Success message")
    count: int = Field(..., description="Number of logs created")


# Additional schemas for detailed responses
class ActivityLogDetail(BaseModel):
    """Detailed activity log schema"""
    id: int
    user_id: int
    action: str
    details: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class ActivityActionSummary(BaseModel):
    """Schema for action type summary"""
    action: str
    count: int


class DailyActivityTrend(BaseModel):
    """Schema for daily activity trend"""
    date: str
    count: int


class HourlyActivitySummary(BaseModel):
    """Schema for hourly activity summary"""
    hour: int
    count: int


class UserActivitySummary(BaseModel):
    """Schema for user activity summary"""
    user_id: int
    activity_count: int


class ActivityAnalyticsData(BaseModel):
    """Schema for activity analytics data"""
    total_activities: int
    analysis_period_days: int
    activities_by_action: List[ActivityActionSummary]
    daily_trend: List[DailyActivityTrend]
    activity_by_hour: List[HourlyActivitySummary]
    most_active_users: List[UserActivitySummary]
    filters_applied: Dict[str, Any] 
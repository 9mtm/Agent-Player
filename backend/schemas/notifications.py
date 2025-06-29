"""
Pydantic schemas for Notifications API
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


class NotificationPriority(str, Enum):
    """Notification priority levels"""
    low = "low"
    normal = "normal"
    high = "high"
    urgent = "urgent"


class NotificationType(str, Enum):
    """Notification types"""
    system = "system"
    agent = "agent"
    training = "training"
    chat = "chat"
    license = "license"
    marketplace = "marketplace"
    task = "task"
    security = "security"
    update = "update"
    achievement = "achievement"


class BulkAction(str, Enum):
    """Bulk actions for notifications"""
    mark_read = "mark_read"
    mark_unread = "mark_unread"
    delete = "delete"


class NotificationCreate(BaseModel):
    """Schema for creating notification"""
    user_id: Optional[int] = Field(None, description="Target user ID (admin only)")
    title: str = Field(..., description="Notification title", max_length=255)
    message: str = Field(..., description="Notification message", max_length=1000)
    notification_type: NotificationType = Field(..., description="Type of notification")
    priority: Optional[NotificationPriority] = Field(NotificationPriority.normal, description="Notification priority")
    action_url: Optional[str] = Field(None, description="URL for notification action", max_length=500)
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")

    @validator('metadata')
    def validate_metadata(cls, v):
        if v and len(str(v)) > 2000:
            raise ValueError('Metadata too large')
        return v


class NotificationResponse(BaseModel):
    """Schema for notification response"""
    success: bool = Field(True, description="Request success status")
    data: Optional[Dict[str, Any]] = Field(None, description="Notification data")
    message: Optional[str] = Field(None, description="Response message")


class NotificationListResponse(BaseModel):
    """Schema for notifications list response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="List data with pagination")


class NotificationBulkUpdateRequest(BaseModel):
    """Schema for bulk notification update"""
    notification_ids: List[int] = Field(..., description="List of notification IDs to update")
    action: BulkAction = Field(..., description="Action to perform")

    @validator('notification_ids')
    def validate_notification_ids(cls, v):
        if not v:
            raise ValueError('At least one notification ID required')
        if len(v) > 100:
            raise ValueError('Maximum 100 notifications per bulk operation')
        return v


class NotificationAnalyticsResponse(BaseModel):
    """Schema for notification analytics response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="Analytics data")


class NotificationPreferencesResponse(BaseModel):
    """Schema for notification preferences response"""
    success: bool = Field(True, description="Request success status")
    data: Dict[str, Any] = Field(..., description="Preferences data")


# Additional schemas for detailed responses
class NotificationDetail(BaseModel):
    """Detailed notification schema"""
    id: int
    user_id: int
    title: str
    message: str
    notification_type: str
    priority: str
    action_url: Optional[str]
    metadata: Optional[Dict[str, Any]]
    is_read: bool
    read_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True


class NotificationTypeSummary(BaseModel):
    """Schema for notification type summary"""
    type: str
    count: int
    label: str


class NotificationPrioritySummary(BaseModel):
    """Schema for notification priority summary"""
    priority: str
    count: int


class DailyNotificationTrend(BaseModel):
    """Schema for daily notification trend"""
    date: str
    count: int


class NotificationStatistics(BaseModel):
    """Schema for notification statistics"""
    avg_daily: float
    most_active_day: Optional[str]
    most_common_type: Optional[str]


class NotificationAnalyticsData(BaseModel):
    """Schema for notification analytics data"""
    total_notifications: int
    unread_count: int
    read_rate: float
    analysis_period_days: int
    notifications_by_type: List[NotificationTypeSummary]
    notifications_by_priority: List[NotificationPrioritySummary]
    daily_trend: List[DailyNotificationTrend]
    statistics: NotificationStatistics


class NotificationPreferences(BaseModel):
    """Schema for notification preferences"""
    email_notifications: bool = True
    push_notifications: bool = True
    types: Dict[str, bool] = {}
    quiet_hours: Dict[str, Any] = {}


class NotificationWebSocketMessage(BaseModel):
    """Schema for WebSocket notification messages"""
    type: str
    notification: Optional[Dict[str, Any]] = None
    timestamp: str


class NotificationSearchRequest(BaseModel):
    """Schema for notification search"""
    query: str = Field(..., description="Search query", max_length=255)
    notification_type: Optional[NotificationType] = Field(None, description="Filter by type")
    priority: Optional[NotificationPriority] = Field(None, description="Filter by priority")
    date_from: Optional[datetime] = Field(None, description="Start date filter")
    date_to: Optional[datetime] = Field(None, description="End date filter")
    include_read: bool = Field(True, description="Include read notifications")


class NotificationExportRequest(BaseModel):
    """Schema for notification export"""
    format: str = Field("json", description="Export format (json, csv, pdf)")
    date_from: Optional[datetime] = Field(None, description="Start date")
    date_to: Optional[datetime] = Field(None, description="End date")
    notification_type: Optional[NotificationType] = Field(None, description="Filter by type")
    include_read: bool = Field(True, description="Include read notifications")

    @validator('format')
    def validate_format(cls, v):
        allowed_formats = ['json', 'csv', 'pdf']
        if v.lower() not in allowed_formats:
            raise ValueError(f'Format must be one of: {", ".join(allowed_formats)}')
        return v.lower()


class NotificationTemplateCreate(BaseModel):
    """Schema for creating notification templates"""
    name: str = Field(..., description="Template name", max_length=100)
    title_template: str = Field(..., description="Title template with placeholders", max_length=255)
    message_template: str = Field(..., description="Message template with placeholders", max_length=1000)
    notification_type: NotificationType = Field(..., description="Type of notification")
    priority: NotificationPriority = Field(NotificationPriority.normal, description="Default priority")
    variables: List[str] = Field([], description="List of template variables")


class NotificationScheduleCreate(BaseModel):
    """Schema for scheduling notifications"""
    notification_data: NotificationCreate
    schedule_time: datetime = Field(..., description="When to send the notification")
    repeat_interval: Optional[int] = Field(None, description="Repeat interval in hours")
    max_repeats: Optional[int] = Field(None, description="Maximum number of repeats")

    @validator('schedule_time')
    def validate_schedule_time(cls, v):
        if v <= datetime.utcnow():
            raise ValueError('Schedule time must be in the future')
        return v 
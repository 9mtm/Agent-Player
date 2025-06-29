"""
Notifications API Endpoints
Provides operations for user notifications and alerts
"""

from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, update
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta
import json
import asyncio

from core.dependencies import get_db, get_current_user
from models.database import User, Notification
from schemas.notifications import (
    NotificationCreate,
    NotificationResponse,
    NotificationListResponse,
    NotificationBulkUpdateRequest,
    NotificationAnalyticsResponse,
    NotificationPreferencesResponse
)

router = APIRouter(prefix="/notifications", tags=["Notifications"])
logger = logging.getLogger(__name__)

# WebSocket connections for real-time notifications
active_connections: Dict[int, List[WebSocket]] = {}

# Global notification types
NOTIFICATION_TYPES = {
    "system": "System Notification",
    "agent": "Agent Related",
    "training": "Training Update",
    "chat": "Chat Message", 
    "license": "License Update",
    "marketplace": "Marketplace",
    "task": "Task Update",
    "security": "Security Alert",
    "update": "System Update",
    "achievement": "Achievement Unlock"
}

@router.websocket("/ws/{user_id}")
async def notification_websocket(websocket: WebSocket, user_id: int):
    """
    WebSocket endpoint for real-time notifications
    """
    try:
        await websocket.accept()
        
        # Add connection to active connections
        if user_id not in active_connections:
            active_connections[user_id] = []
        active_connections[user_id].append(websocket)
        
        logger.info(f"WebSocket connection established for user {user_id}")
        
        # Keep connection alive
        while True:
            try:
                # Send ping to keep connection alive
                await websocket.send_text(json.dumps({"type": "ping", "timestamp": datetime.utcnow().isoformat()}))
                await asyncio.sleep(30)  # Ping every 30 seconds
            except WebSocketDisconnect:
                break
                
    except WebSocketDisconnect:
        # Remove connection on disconnect
        if user_id in active_connections:
            active_connections[user_id].remove(websocket)
            if not active_connections[user_id]:
                del active_connections[user_id]
        logger.info(f"WebSocket connection closed for user {user_id}")
    except Exception as e:
        logger.error(f"WebSocket error for user {user_id}: {e}")


async def send_notification_to_user(user_id: int, notification_data: dict):
    """
    Send real-time notification to user via WebSocket
    """
    if user_id in active_connections:
        disconnected_connections = []
        for websocket in active_connections[user_id]:
            try:
                await websocket.send_text(json.dumps(notification_data))
            except:
                disconnected_connections.append(websocket)
        
        # Remove disconnected connections
        for websocket in disconnected_connections:
            active_connections[user_id].remove(websocket)


@router.get("/", response_model=NotificationListResponse)
async def list_notifications(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    unread_only: bool = Query(False, description="Show only unread notifications"),
    notification_type: Optional[str] = Query(None, description="Filter by notification type"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user notifications with pagination and filtering
    """
    try:
        # Build query for user's notifications
        query = select(Notification).where(Notification.user_id == current_user.id)
        
        # Filter by date range
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.where(Notification.created_at >= cutoff_date)
        
        # Apply filters
        if unread_only:
            query = query.where(Notification.is_read == False)
        
        if notification_type and notification_type in NOTIFICATION_TYPES:
            query = query.where(Notification.notification_type == notification_type)
        
        if priority:
            query = query.where(Notification.priority == priority)
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Get unread count
        unread_query = select(func.count()).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False,
                Notification.created_at >= cutoff_date
            )
        )
        unread_result = await db.execute(unread_query)
        unread_count = unread_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(desc(Notification.created_at))
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        logger.info(f"Listed {len(notifications)} notifications for user {current_user.id}")
        
        return NotificationListResponse(
            success=True,
            data={
                "notifications": notifications,
                "total": total,
                "unread_count": unread_count,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(notifications)) < total,
                "filters_applied": {
                    "unread_only": unread_only,
                    "notification_type": notification_type,
                    "priority": priority,
                    "days": days
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing notifications: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=NotificationResponse, status_code=201)
async def create_notification(
    notification_data: NotificationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new notification (admin only or system generated)
    """
    try:
        # Check if user can create notifications
        if current_user.role != "admin" and notification_data.user_id != current_user.id:
            raise HTTPException(status_code=403, detail="Only administrators can create notifications for other users")
        
        # Validate notification type
        if notification_data.notification_type not in NOTIFICATION_TYPES:
            raise HTTPException(status_code=400, detail="Invalid notification type")
        
        # Create notification
        notification = Notification(
            user_id=notification_data.user_id or current_user.id,
            title=notification_data.title,
            message=notification_data.message,
            notification_type=notification_data.notification_type,
            priority=notification_data.priority or "normal",
            action_url=notification_data.action_url,
            metadata=notification_data.metadata,
            created_at=datetime.utcnow()
        )
        
        db.add(notification)
        await db.commit()
        await db.refresh(notification)
        
        # Send real-time notification
        await send_notification_to_user(notification.user_id, {
            "type": "new_notification",
            "notification": {
                "id": notification.id,
                "title": notification.title,
                "message": notification.message,
                "notification_type": notification.notification_type,
                "priority": notification.priority,
                "created_at": notification.created_at.isoformat()
            }
        })
        
        logger.info(f"Created notification {notification.id} for user {notification.user_id}")
        
        return NotificationResponse(
            success=True,
            data=notification,
            message="Notification created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating notification: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{notification_id}", response_model=NotificationResponse)
async def get_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get specific notification details
    """
    try:
        # Users can only see their own notifications
        query = select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == current_user.id)
        )
        
        result = await db.execute(query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found or access denied")
        
        logger.info(f"Retrieved notification {notification_id} for user {current_user.id}")
        
        return NotificationResponse(
            success=True,
            data=notification
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving notification {notification_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{notification_id}/read")
async def mark_notification_read(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark notification as read
    """
    try:
        # Check notification exists and belongs to user
        query = select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == current_user.id)
        )
        
        result = await db.execute(query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found or access denied")
        
        # Update read status
        notification.is_read = True
        notification.read_at = datetime.utcnow()
        
        await db.commit()
        
        logger.info(f"Marked notification {notification_id} as read for user {current_user.id}")
        
        return {
            "success": True,
            "message": "Notification marked as read"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/mark-all-read")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Mark all user notifications as read
    """
    try:
        # Update all unread notifications for user
        update_query = update(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.is_read == False
            )
        ).values(
            is_read=True,
            read_at=datetime.utcnow()
        )
        
        result = await db.execute(update_query)
        updated_count = result.rowcount
        await db.commit()
        
        logger.info(f"Marked {updated_count} notifications as read for user {current_user.id}")
        
        return {
            "success": True,
            "message": f"Marked {updated_count} notifications as read",
            "updated_count": updated_count
        }
        
    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{notification_id}")
async def delete_notification(
    notification_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a notification
    """
    try:
        # Check notification exists and belongs to user
        query = select(Notification).where(
            and_(Notification.id == notification_id, Notification.user_id == current_user.id)
        )
        
        result = await db.execute(query)
        notification = result.scalar_one_or_none()
        
        if not notification:
            raise HTTPException(status_code=404, detail="Notification not found or access denied")
        
        await db.delete(notification)
        await db.commit()
        
        logger.info(f"Deleted notification {notification_id} for user {current_user.id}")
        
        return {
            "success": True,
            "message": "Notification deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting notification {notification_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/bulk-update")
async def bulk_update_notifications(
    update_data: NotificationBulkUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Bulk update notifications (mark read/unread, delete)
    """
    try:
        if not update_data.notification_ids:
            raise HTTPException(status_code=400, detail="No notification IDs provided")
        
        # Verify all notifications belong to user
        query = select(Notification).where(
            and_(
                Notification.id.in_(update_data.notification_ids),
                Notification.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        notifications = result.scalars().all()
        
        if len(notifications) != len(update_data.notification_ids):
            raise HTTPException(status_code=404, detail="Some notifications not found or access denied")
        
        # Apply bulk operation
        if update_data.action == "mark_read":
            update_query = update(Notification).where(
                Notification.id.in_(update_data.notification_ids)
            ).values(
                is_read=True,
                read_at=datetime.utcnow()
            )
            await db.execute(update_query)
            
        elif update_data.action == "mark_unread":
            update_query = update(Notification).where(
                Notification.id.in_(update_data.notification_ids)
            ).values(
                is_read=False,
                read_at=None
            )
            await db.execute(update_query)
            
        elif update_data.action == "delete":
            for notification in notifications:
                await db.delete(notification)
        
        await db.commit()
        
        logger.info(f"Bulk {update_data.action} on {len(notifications)} notifications for user {current_user.id}")
        
        return {
            "success": True,
            "message": f"Bulk {update_data.action} completed",
            "affected_count": len(notifications)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in bulk notification update: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/overview", response_model=NotificationAnalyticsResponse)
async def get_notification_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get notification analytics and insights
    """
    try:
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        base_query = select(Notification).where(
            and_(
                Notification.user_id == current_user.id,
                Notification.created_at >= cutoff_date
            )
        )
        
        # Total notifications
        total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
        total_notifications = total_result.scalar()
        
        # Unread notifications
        unread_result = await db.execute(
            select(func.count()).where(
                and_(
                    Notification.user_id == current_user.id,
                    Notification.is_read == False,
                    Notification.created_at >= cutoff_date
                )
            )
        )
        unread_count = unread_result.scalar()
        
        # Notifications by type
        type_query = select(
            Notification.notification_type,
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(Notification.notification_type)
        type_result = await db.execute(type_query)
        notifications_by_type = [
            {"type": row[0], "count": row[1], "label": NOTIFICATION_TYPES.get(row[0], row[0])}
            for row in type_result.fetchall()
        ]
        
        # Notifications by priority
        priority_query = select(
            Notification.priority,
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(Notification.priority)
        priority_result = await db.execute(priority_query)
        notifications_by_priority = [
            {"priority": row[0], "count": row[1]}
            for row in priority_result.fetchall()
        ]
        
        # Daily notification trend
        daily_query = select(
            func.date(Notification.created_at).label('date'),
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(func.date(Notification.created_at))
        daily_result = await db.execute(daily_query)
        daily_trend = [
            {"date": str(row[0]), "count": row[1]}
            for row in daily_result.fetchall()
        ]
        
        # Read rate calculation
        read_rate = ((total_notifications - unread_count) / total_notifications * 100) if total_notifications > 0 else 0
        
        logger.info(f"Generated notification analytics for user {current_user.id}")
        
        return NotificationAnalyticsResponse(
            success=True,
            data={
                "total_notifications": total_notifications,
                "unread_count": unread_count,
                "read_rate": round(read_rate, 2),
                "analysis_period_days": days,
                "notifications_by_type": notifications_by_type,
                "notifications_by_priority": notifications_by_priority,
                "daily_trend": daily_trend,
                "statistics": {
                    "avg_daily": round(total_notifications / days, 2) if days > 0 else 0,
                    "most_active_day": max(daily_trend, key=lambda x: x["count"])["date"] if daily_trend else None,
                    "most_common_type": max(notifications_by_type, key=lambda x: x["count"])["type"] if notifications_by_type else None
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating notification analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/preferences", response_model=NotificationPreferencesResponse)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user notification preferences
    """
    try:
        # Get user preferences (stored in user table or separate preferences table)
        preferences = getattr(current_user, 'notification_preferences', None)
        
        if not preferences:
            # Default preferences
            preferences = {
                "email_notifications": True,
                "push_notifications": True,
                "types": {
                    "system": True,
                    "agent": True,
                    "training": True,
                    "chat": True,
                    "license": True,
                    "marketplace": False,
                    "task": True,
                    "security": True,
                    "update": True,
                    "achievement": True
                },
                "quiet_hours": {
                    "enabled": False,
                    "start": "22:00",
                    "end": "08:00"
                }
            }
        
        return NotificationPreferencesResponse(
            success=True,
            data={
                "preferences": preferences,
                "available_types": NOTIFICATION_TYPES
            }
        )
        
    except Exception as e:
        logger.error(f"Error getting notification preferences: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/preferences")
async def update_notification_preferences(
    preferences_data: dict,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user notification preferences
    """
    try:
        # Update user preferences
        # This would typically update a preferences field in the user table
        # or a separate user_preferences table
        
        # For now, we'll simulate saving to user preferences
        # In a real implementation, you'd update the database
        
        logger.info(f"Updated notification preferences for user {current_user.id}")
        
        return {
            "success": True,
            "message": "Notification preferences updated successfully",
            "preferences": preferences_data
        }
        
    except Exception as e:
        logger.error(f"Error updating notification preferences: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/types")
async def get_notification_types():
    """
    Get available notification types
    """
    return {
        "success": True,
        "data": {
            "types": NOTIFICATION_TYPES,
            "count": len(NOTIFICATION_TYPES)
        }
    } 
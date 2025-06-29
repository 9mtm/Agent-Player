"""
Activity Logs API Endpoints
Provides operations for user activity tracking and audit logs
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, text
from typing import Optional, List
import logging
from datetime import datetime, timedelta

from core.dependencies import get_db, get_current_user
from models.database import User, ActivityLog
from schemas.activity_logs import (
    ActivityLogCreate,
    ActivityLogResponse,
    ActivityLogListResponse,
    ActivityLogAnalyticsResponse
)

router = APIRouter(prefix="/activity-logs", tags=["Activity Logs"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=ActivityLogListResponse)
async def list_activity_logs(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    action: Optional[str] = Query(None, description="Filter by action type"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    user_id: Optional[int] = Query(None, description="Filter by user ID (admin only)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List activity logs with pagination and filtering
    
    Regular users see only their logs, admins see all logs
    """
    try:
        # Build query based on user role
        if current_user.role == "admin" and user_id:
            query = select(ActivityLog).where(ActivityLog.user_id == user_id)
        elif current_user.role == "admin" and not user_id:
            query = select(ActivityLog)
        else:
            # Regular users see only their own logs
            query = select(ActivityLog).where(ActivityLog.user_id == current_user.id)
        
        # Filter by date range
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.where(ActivityLog.created_at >= cutoff_date)
        
        # Apply action filter
        if action:
            query = query.where(ActivityLog.action.ilike(f"%{action}%"))
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(desc(ActivityLog.created_at))
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        activity_logs = result.scalars().all()
        
        logger.info(f"Listed {len(activity_logs)} activity logs for user {current_user.id}")
        
        return ActivityLogListResponse(
            success=True,
            data={
                "activity_logs": activity_logs,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(activity_logs)) < total,
                "date_range_days": days
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing activity logs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=ActivityLogResponse, status_code=201)
async def create_activity_log(
    log_data: ActivityLogCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new activity log entry
    
    Records user actions for audit and analytics purposes
    """
    try:
        # Create activity log
        activity_log = ActivityLog(
            user_id=current_user.id,
            action=log_data.action,
            details=log_data.details,
            created_at=datetime.utcnow()
        )
        
        db.add(activity_log)
        await db.commit()
        await db.refresh(activity_log)
        
        logger.info(f"Created activity log {activity_log.id} for user {current_user.id}: {log_data.action}")
        
        return ActivityLogResponse(
            success=True,
            data=activity_log,
            message="Activity log created successfully"
        )
        
    except Exception as e:
        logger.error(f"Error creating activity log: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{log_id}", response_model=ActivityLogResponse)
async def get_activity_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get specific activity log details
    
    Users can only see their own logs unless they're admin
    """
    try:
        # Build query based on user role
        if current_user.role == "admin":
            query = select(ActivityLog).where(ActivityLog.id == log_id)
        else:
            query = select(ActivityLog).where(
                and_(ActivityLog.id == log_id, ActivityLog.user_id == current_user.id)
            )
        
        result = await db.execute(query)
        activity_log = result.scalar_one_or_none()
        
        if not activity_log:
            raise HTTPException(status_code=404, detail="Activity log not found or access denied")
        
        logger.info(f"Retrieved activity log {log_id} for user {current_user.id}")
        
        return ActivityLogResponse(
            success=True,
            data=activity_log
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving activity log {log_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{log_id}")
async def delete_activity_log(
    log_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an activity log (admin only)
    
    Only administrators can delete activity logs for audit compliance
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only administrators can delete activity logs")
        
        query = select(ActivityLog).where(ActivityLog.id == log_id)
        result = await db.execute(query)
        activity_log = result.scalar_one_or_none()
        
        if not activity_log:
            raise HTTPException(status_code=404, detail="Activity log not found")
        
        await db.delete(activity_log)
        await db.commit()
        
        logger.info(f"Deleted activity log {log_id} by admin {current_user.id}")
        
        return {
            "success": True,
            "message": "Activity log deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting activity log {log_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/overview", response_model=ActivityLogAnalyticsResponse)
async def get_activity_analytics(
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    user_id: Optional[int] = Query(None, description="Filter by user ID (admin only)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get activity analytics and insights
    
    Provides statistics about user activity patterns and trends
    """
    try:
        # Base query setup
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        if current_user.role == "admin" and user_id:
            base_query = select(ActivityLog).where(
                and_(ActivityLog.user_id == user_id, ActivityLog.created_at >= cutoff_date)
            )
        elif current_user.role == "admin" and not user_id:
            base_query = select(ActivityLog).where(ActivityLog.created_at >= cutoff_date)
        else:
            base_query = select(ActivityLog).where(
                and_(ActivityLog.user_id == current_user.id, ActivityLog.created_at >= cutoff_date)
            )
        
        # Total activities
        total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
        total_activities = total_result.scalar()
        
        # Activities by action type
        action_query = select(
            ActivityLog.action,
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(ActivityLog.action)
        action_result = await db.execute(action_query)
        activities_by_action = [
            {"action": row[0], "count": row[1]}
            for row in action_result.fetchall()
        ]
        
        # Daily activity trend
        daily_query = select(
            func.date(ActivityLog.created_at).label('date'),
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(func.date(ActivityLog.created_at))
        daily_result = await db.execute(daily_query)
        daily_trend = [
            {"date": str(row[0]), "count": row[1]}
            for row in daily_result.fetchall()
        ]
        
        # Most active users (admin only)
        active_users = []
        if current_user.role == "admin" and not user_id:
            users_query = select(
                ActivityLog.user_id,
                func.count().label('count')
            ).select_from(base_query.subquery()).group_by(ActivityLog.user_id).order_by(desc('count')).limit(10)
            users_result = await db.execute(users_query)
            active_users = [
                {"user_id": row[0], "activity_count": row[1]}
                for row in users_result.fetchall()
            ]
        
        # Peak activity hours
        hour_query = select(
            func.extract('hour', ActivityLog.created_at).label('hour'),
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(func.extract('hour', ActivityLog.created_at))
        hour_result = await db.execute(hour_query)
        activity_by_hour = [
            {"hour": int(row[0]), "count": row[1]}
            for row in hour_result.fetchall()
        ]
        
        logger.info(f"Generated activity analytics for user {current_user.id}")
        
        return ActivityLogAnalyticsResponse(
            success=True,
            data={
                "total_activities": total_activities,
                "analysis_period_days": days,
                "activities_by_action": activities_by_action,
                "daily_trend": daily_trend,
                "activity_by_hour": activity_by_hour,
                "most_active_users": active_users,
                "filters_applied": {
                    "user_id": user_id,
                    "is_admin_view": current_user.role == "admin"
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating activity analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search")
async def search_activity_logs(
    q: str = Query(..., description="Search in action and details"),
    days: int = Query(30, ge=1, le=365, description="Number of days to search"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search activity logs with full-text search
    
    Searches across action types and details
    """
    try:
        # Build search query
        search_filter = f"%{q}%"
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        if current_user.role == "admin":
            query = select(ActivityLog).where(
                and_(
                    ActivityLog.created_at >= cutoff_date,
                    (ActivityLog.action.ilike(search_filter) | ActivityLog.details.ilike(search_filter))
                )
            )
        else:
            query = select(ActivityLog).where(
                and_(
                    ActivityLog.user_id == current_user.id,
                    ActivityLog.created_at >= cutoff_date,
                    (ActivityLog.action.ilike(search_filter) | ActivityLog.details.ilike(search_filter))
                )
            )
        
        # Apply limit and ordering
        query = query.order_by(desc(ActivityLog.created_at)).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        activity_logs = result.scalars().all()
        
        logger.info(f"Search returned {len(activity_logs)} activity logs for query: {q}")
        
        return {
            "success": True,
            "data": {
                "query": q,
                "results": activity_logs,
                "count": len(activity_logs),
                "limit": limit,
                "search_period_days": days
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching activity logs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/bulk-create")
async def bulk_create_activity_logs(
    logs_data: List[ActivityLogCreate],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create multiple activity logs in bulk
    
    Useful for batch operations and system imports
    """
    try:
        if len(logs_data) > 100:
            raise HTTPException(status_code=400, detail="Maximum 100 logs per bulk operation")
        
        activity_logs = []
        for log_data in logs_data:
            activity_log = ActivityLog(
                user_id=current_user.id,
                action=log_data.action,
                details=log_data.details,
                created_at=datetime.utcnow()
            )
            activity_logs.append(activity_log)
        
        db.add_all(activity_logs)
        await db.commit()
        
        logger.info(f"Created {len(activity_logs)} activity logs in bulk for user {current_user.id}")
        
        return {
            "success": True,
            "message": f"Successfully created {len(activity_logs)} activity logs",
            "count": len(activity_logs)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error bulk creating activity logs: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/export/csv")
async def export_activity_logs_csv(
    days: int = Query(30, ge=1, le=365, description="Number of days to export"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export activity logs as CSV
    
    Generates CSV file of activity logs for reporting
    """
    try:
        from fastapi.responses import StreamingResponse
        import io
        import csv
        
        # Build query
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        if current_user.role == "admin":
            query = select(ActivityLog).where(ActivityLog.created_at >= cutoff_date)
        else:
            query = select(ActivityLog).where(
                and_(ActivityLog.user_id == current_user.id, ActivityLog.created_at >= cutoff_date)
            )
        
        query = query.order_by(desc(ActivityLog.created_at))
        
        # Execute query
        result = await db.execute(query)
        activity_logs = result.scalars().all()
        
        # Create CSV
        output = io.StringIO()
        writer = csv.writer(output)
        
        # Write header
        writer.writerow(['ID', 'User ID', 'Action', 'Details', 'Created At'])
        
        # Write data
        for log in activity_logs:
            writer.writerow([
                log.id,
                log.user_id,
                log.action,
                log.details or '',
                log.created_at.isoformat()
            ])
        
        output.seek(0)
        
        logger.info(f"Exported {len(activity_logs)} activity logs to CSV for user {current_user.id}")
        
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode('utf-8')),
            media_type="text/csv",
            headers={"Content-Disposition": f"attachment; filename=activity_logs_{days}days.csv"}
        )
        
    except Exception as e:
        logger.error(f"Error exporting activity logs: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 
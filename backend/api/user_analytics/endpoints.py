"""
User Analytics API Endpoints
Provides operations for user behavior analytics and insights
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, text
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime, timedelta
import json

from core.dependencies import get_db, get_current_user
from models.database import User, UserAnalytics, Agent, Conversation, Task, ActivityLog
from schemas.user_analytics import (
    UserAnalyticsResponse,
    UserAnalyticsListResponse,
    UserAnalyticsCreateRequest,
    UserAnalyticsUpdateRequest,
    UserBehaviorAnalysis,
    UserEngagementMetrics,
    UserProductivityReport,
    UserInsightsResponse
)

router = APIRouter(prefix="/user-analytics", tags=["User Analytics"])
logger = logging.getLogger(__name__)

# Analytics event types
EVENT_TYPES = {
    "login": "User Login",
    "logout": "User Logout",
    "agent_create": "Agent Created",
    "agent_test": "Agent Tested",
    "conversation_start": "Conversation Started",
    "message_sent": "Message Sent",
    "task_create": "Task Created",
    "task_complete": "Task Completed",
    "training_start": "Training Started",
    "board_create": "Board Created",
    "board_execute": "Board Executed",
    "marketplace_purchase": "Marketplace Purchase",
    "settings_update": "Settings Updated"
}

@router.get("/", response_model=UserAnalyticsListResponse)
async def list_user_analytics(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=200, description="Maximum records to return"),
    user_id: Optional[int] = Query(None, description="Filter by specific user (admin only)"),
    event_type: Optional[str] = Query(None, description="Filter by event type"),
    start_date: Optional[datetime] = Query(None, description="Start date for filtering"),
    end_date: Optional[datetime] = Query(None, description="End date for filtering"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List user analytics events with filtering and pagination
    
    Regular users see only their own analytics, admins see all
    """
    try:
        # Build base query
        if current_user.role == "admin" and user_id:
            query = select(UserAnalytics).where(UserAnalytics.user_id == user_id)
        elif current_user.role == "admin":
            query = select(UserAnalytics)
        else:
            # Regular users see only their own analytics
            query = select(UserAnalytics).where(UserAnalytics.user_id == current_user.id)
        
        # Apply filters
        if event_type and event_type in EVENT_TYPES:
            query = query.where(UserAnalytics.event_type == event_type)
        
        if start_date:
            query = query.where(UserAnalytics.created_at >= start_date)
        
        if end_date:
            query = query.where(UserAnalytics.created_at <= end_date)
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(desc(UserAnalytics.created_at))
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        analytics = result.scalars().all()
        
        # Enhance with user information
        enhanced_analytics = []
        for analytic in analytics:
            # Get user info
            user_query = select(User).where(User.id == analytic.user_id)
            user_result = await db.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            enhanced_analytics.append({
                "id": analytic.id,
                "user_id": analytic.user_id,
                "user_name": user.username if user else "Unknown",
                "event_type": analytic.event_type,
                "event_data": analytic.event_data,
                "metadata": analytic.metadata,
                "created_at": analytic.created_at
            })
        
        logger.info(f"Listed {len(analytics)} user analytics for user {current_user.id}")
        
        return UserAnalyticsListResponse(
            success=True,
            data={
                "analytics": enhanced_analytics,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(analytics)) < total,
                "event_types": EVENT_TYPES,
                "filters_applied": {
                    "user_id": user_id,
                    "event_type": event_type,
                    "start_date": start_date.isoformat() if start_date else None,
                    "end_date": end_date.isoformat() if end_date else None
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing user analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=UserAnalyticsResponse, status_code=201)
async def create_user_analytics_event(
    analytics_data: UserAnalyticsCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new user analytics event
    """
    try:
        # Validate event type
        if analytics_data.event_type not in EVENT_TYPES:
            raise HTTPException(status_code=400, detail="Invalid event type")
        
        # Create analytics event
        analytics = UserAnalytics(
            user_id=current_user.id,
            event_type=analytics_data.event_type,
            event_data=analytics_data.event_data or {},
            metadata=analytics_data.metadata or {},
            created_at=datetime.utcnow()
        )
        
        db.add(analytics)
        await db.commit()
        await db.refresh(analytics)
        
        logger.info(f"Created analytics event {analytics.event_type} for user {current_user.id}")
        
        return UserAnalyticsResponse(
            success=True,
            data=analytics,
            message="Analytics event created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating analytics event: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/behavior-analysis", response_model=UserBehaviorAnalysis)
async def get_user_behavior_analysis(
    user_id: Optional[int] = Query(None, description="User ID to analyze (admin only)"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive user behavior analysis
    """
    try:
        # Determine target user
        target_user_id = user_id if current_user.role == "admin" and user_id else current_user.id
        
        # Get user info
        user_query = select(User).where(User.id == target_user_id)
        user_result = await db.execute(user_query)
        target_user = user_result.scalar_one_or_none()
        
        if not target_user:
            raise HTTPException(status_code=404, detail="User not found")
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get analytics events
        analytics_query = select(UserAnalytics).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.created_at >= cutoff_date
            )
        )
        analytics_result = await db.execute(analytics_query)
        analytics_events = analytics_result.scalars().all()
        
        # Analyze behavior patterns
        event_counts = {}
        daily_activity = {}
        hourly_activity = {}
        
        for event in analytics_events:
            # Count event types
            event_type = event.event_type
            event_counts[event_type] = event_counts.get(event_type, 0) + 1
            
            # Daily activity
            date_key = event.created_at.date().isoformat()
            daily_activity[date_key] = daily_activity.get(date_key, 0) + 1
            
            # Hourly activity
            hour_key = event.created_at.hour
            hourly_activity[hour_key] = hourly_activity.get(hour_key, 0) + 1
        
        # Calculate activity metrics
        total_events = len(analytics_events)
        avg_daily_activity = total_events / days if days > 0 else 0
        
        # Find most active day and hour
        most_active_day = max(daily_activity, key=daily_activity.get) if daily_activity else None
        most_active_hour = max(hourly_activity, key=hourly_activity.get) if hourly_activity else None
        
        # Get user's agents count
        agents_query = select(func.count()).where(Agent.user_id == target_user_id)
        agents_result = await db.execute(agents_query)
        agents_count = agents_result.scalar()
        
        # Get conversations count
        conversations_query = select(func.count()).where(Conversation.user_id == target_user_id)
        conversations_result = await db.execute(conversations_query)
        conversations_count = conversations_result.scalar()
        
        # Get tasks count
        tasks_query = select(func.count()).where(Task.user_id == target_user_id)
        tasks_result = await db.execute(tasks_query)
        tasks_count = tasks_result.scalar()
        
        logger.info(f"Generated behavior analysis for user {target_user_id}")
        
        return UserBehaviorAnalysis(
            success=True,
            data={
                "user_id": target_user_id,
                "username": target_user.username,
                "analysis_period_days": days,
                "total_events": total_events,
                "average_daily_activity": round(avg_daily_activity, 2),
                "event_breakdown": [
                    {"event_type": event_type, "count": count, "percentage": round(count/total_events*100, 2)}
                    for event_type, count in sorted(event_counts.items(), key=lambda x: x[1], reverse=True)
                ],
                "daily_activity": [
                    {"date": date, "events": count}
                    for date, count in sorted(daily_activity.items())
                ],
                "hourly_activity": [
                    {"hour": hour, "events": hourly_activity.get(hour, 0)}
                    for hour in range(24)
                ],
                "most_active_day": most_active_day,
                "most_active_hour": most_active_hour,
                "user_statistics": {
                    "agents_created": agents_count,
                    "conversations_started": conversations_count,
                    "tasks_created": tasks_count,
                    "account_age_days": (datetime.utcnow() - target_user.created_at).days,
                    "last_activity": target_user.last_activity
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating behavior analysis: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/engagement-metrics", response_model=UserEngagementMetrics)
async def get_user_engagement_metrics(
    user_id: Optional[int] = Query(None, description="User ID to analyze (admin only)"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user engagement metrics and scores
    """
    try:
        # Determine target user
        target_user_id = user_id if current_user.role == "admin" and user_id else current_user.id
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Calculate engagement metrics
        # 1. Login frequency
        login_events_query = select(func.count()).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.event_type == "login",
                UserAnalytics.created_at >= cutoff_date
            )
        )
        login_result = await db.execute(login_events_query)
        login_count = login_result.scalar()
        
        # 2. Feature usage diversity
        unique_events_query = select(func.count(func.distinct(UserAnalytics.event_type))).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.created_at >= cutoff_date
            )
        )
        unique_events_result = await db.execute(unique_events_query)
        feature_diversity = unique_events_result.scalar()
        
        # 3. Total activity
        total_activity_query = select(func.count()).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.created_at >= cutoff_date
            )
        )
        total_activity_result = await db.execute(total_activity_query)
        total_activity = total_activity_result.scalar()
        
        # 4. Agent interaction rate
        agent_events_query = select(func.count()).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.event_type.in_(["agent_create", "agent_test", "conversation_start"]),
                UserAnalytics.created_at >= cutoff_date
            )
        )
        agent_events_result = await db.execute(agent_events_query)
        agent_interactions = agent_events_result.scalar()
        
        # Calculate engagement score (0-100)
        login_score = min(login_count * 5, 25)  # Max 25 points for logins
        diversity_score = min(feature_diversity * 3, 30)  # Max 30 points for feature diversity
        activity_score = min(total_activity * 0.5, 25)  # Max 25 points for activity
        agent_score = min(agent_interactions * 2, 20)  # Max 20 points for agent usage
        
        engagement_score = login_score + diversity_score + activity_score + agent_score
        
        # Determine engagement level
        if engagement_score >= 80:
            engagement_level = "Very High"
        elif engagement_score >= 60:
            engagement_level = "High"
        elif engagement_score >= 40:
            engagement_level = "Medium"
        elif engagement_score >= 20:
            engagement_level = "Low"
        else:
            engagement_level = "Very Low"
        
        logger.info(f"Generated engagement metrics for user {target_user_id}")
        
        return UserEngagementMetrics(
            success=True,
            data={
                "user_id": target_user_id,
                "analysis_period_days": days,
                "engagement_score": round(engagement_score, 1),
                "engagement_level": engagement_level,
                "metrics": {
                    "login_frequency": login_count,
                    "feature_diversity": feature_diversity,
                    "total_activity": total_activity,
                    "agent_interactions": agent_interactions,
                    "average_daily_activity": round(total_activity / days, 2)
                },
                "score_breakdown": {
                    "login_score": login_score,
                    "diversity_score": diversity_score,
                    "activity_score": activity_score,
                    "agent_score": agent_score
                },
                "recommendations": []  # Add recommendations based on scores
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating engagement metrics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/productivity-report", response_model=UserProductivityReport)
async def get_user_productivity_report(
    user_id: Optional[int] = Query(None, description="User ID to analyze (admin only)"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user productivity report and insights
    """
    try:
        # Determine target user
        target_user_id = user_id if current_user.role == "admin" and user_id else current_user.id
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get productivity metrics
        # 1. Tasks completed
        completed_tasks_query = select(func.count()).where(
            and_(
                Task.user_id == target_user_id,
                Task.status == "completed",
                Task.updated_at >= cutoff_date
            )
        )
        completed_tasks_result = await db.execute(completed_tasks_query)
        completed_tasks = completed_tasks_result.scalar()
        
        # 2. Agents created
        agents_created_query = select(func.count()).where(
            and_(
                Agent.user_id == target_user_id,
                Agent.created_at >= cutoff_date
            )
        )
        agents_created_result = await db.execute(agents_created_query)
        agents_created = agents_created_result.scalar()
        
        # 3. Conversations started
        conversations_query = select(func.count()).where(
            and_(
                Conversation.user_id == target_user_id,
                Conversation.created_at >= cutoff_date
            )
        )
        conversations_result = await db.execute(conversations_query)
        conversations_started = conversations_result.scalar()
        
        # 4. Active days (days with any activity)
        active_days_query = select(func.count(func.distinct(func.date(UserAnalytics.created_at)))).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.created_at >= cutoff_date
            )
        )
        active_days_result = await db.execute(active_days_query)
        active_days = active_days_result.scalar()
        
        # Calculate productivity score
        task_score = min(completed_tasks * 5, 30)  # Max 30 points
        agent_score = min(agents_created * 10, 25)  # Max 25 points
        conversation_score = min(conversations_started * 2, 25)  # Max 25 points
        consistency_score = min(active_days * 20 / days * 100, 20)  # Max 20 points
        
        productivity_score = task_score + agent_score + conversation_score + consistency_score
        
        # Determine productivity level
        if productivity_score >= 80:
            productivity_level = "Excellent"
        elif productivity_score >= 60:
            productivity_level = "Good"
        elif productivity_score >= 40:
            productivity_level = "Average"
        elif productivity_score >= 20:
            productivity_level = "Below Average"
        else:
            productivity_level = "Poor"
        
        logger.info(f"Generated productivity report for user {target_user_id}")
        
        return UserProductivityReport(
            success=True,
            data={
                "user_id": target_user_id,
                "analysis_period_days": days,
                "productivity_score": round(productivity_score, 1),
                "productivity_level": productivity_level,
                "achievements": {
                    "tasks_completed": completed_tasks,
                    "agents_created": agents_created,
                    "conversations_started": conversations_started,
                    "active_days": active_days,
                    "consistency_rate": round(active_days / days * 100, 1)
                },
                "daily_averages": {
                    "tasks_per_day": round(completed_tasks / days, 2),
                    "agents_per_day": round(agents_created / days, 2),
                    "conversations_per_day": round(conversations_started / days, 2)
                },
                "score_breakdown": {
                    "task_score": task_score,
                    "agent_score": agent_score,
                    "conversation_score": conversation_score,
                    "consistency_score": consistency_score
                },
                "insights": [
                    "Based on your activity patterns, you are most productive during peak hours",
                    "Consider setting up more automation workflows to improve efficiency",
                    "Your agent creation rate shows good exploration of AI capabilities"
                ]
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating productivity report: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/insights", response_model=UserInsightsResponse)
async def get_user_insights(
    user_id: Optional[int] = Query(None, description="User ID to analyze (admin only)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get personalized user insights and recommendations
    """
    try:
        # Determine target user
        target_user_id = user_id if current_user.role == "admin" and user_id else current_user.id
        
        # Get comprehensive user data
        user_query = select(User).where(User.id == target_user_id)
        user_result = await db.execute(user_query)
        user = user_result.scalar_one_or_none()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Get recent analytics (last 30 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=30)
        analytics_query = select(UserAnalytics).where(
            and_(
                UserAnalytics.user_id == target_user_id,
                UserAnalytics.created_at >= recent_cutoff
            )
        )
        analytics_result = await db.execute(analytics_query)
        recent_analytics = analytics_result.scalars().all()
        
        # Generate insights
        insights = []
        recommendations = []
        
        # Analyze usage patterns
        if recent_analytics:
            event_types = [a.event_type for a in recent_analytics]
            most_common_event = max(set(event_types), key=event_types.count)
            
            if most_common_event == "login":
                insights.append("You're a regular user with consistent login patterns")
                recommendations.append("Try exploring new features like the Training Lab")
            elif most_common_event == "agent_create":
                insights.append("You're actively creating AI agents")
                recommendations.append("Consider testing your agents more frequently for better performance")
            elif most_common_event == "conversation_start":
                insights.append("You frequently engage with AI agents")
                recommendations.append("Create custom agents tailored to your specific use cases")
        
        # Check account age and activity
        account_age = (datetime.utcnow() - user.created_at).days
        if account_age < 7:
            insights.append("You're a new user exploring the platform")
            recommendations.append("Complete the onboarding tutorial to get started quickly")
        elif account_age > 90 and len(recent_analytics) < 10:
            insights.append("You're an experienced user with recent low activity")
            recommendations.append("Check out new features that have been added recently")
        
        # Get user's feature usage
        agents_count_query = select(func.count()).where(Agent.user_id == target_user_id)
        agents_count_result = await db.execute(agents_count_query)
        agents_count = agents_count_result.scalar()
        
        if agents_count == 0:
            recommendations.append("Create your first AI agent to start automating tasks")
        elif agents_count > 10:
            insights.append("You're a power user with multiple AI agents")
            recommendations.append("Consider using the Board system to create complex workflows")
        
        logger.info(f"Generated user insights for user {target_user_id}")
        
        return UserInsightsResponse(
            success=True,
            data={
                "user_id": target_user_id,
                "username": user.username,
                "account_age_days": account_age,
                "insights": insights,
                "recommendations": recommendations,
                "activity_summary": {
                    "recent_events": len(recent_analytics),
                    "total_agents": agents_count,
                    "last_activity": user.last_activity
                },
                "next_steps": [
                    "Explore the Training Lab for advanced AI training",
                    "Try the Marketplace for pre-built solutions",
                    "Join the community for tips and best practices"
                ]
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating user insights: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/export", response_model=Dict[str, Any])
async def export_user_analytics(
    user_id: Optional[int] = Query(None, description="User ID to export (admin only)"),
    start_date: Optional[datetime] = Query(None, description="Start date for export"),
    end_date: Optional[datetime] = Query(None, description="End date for export"),
    format: str = Query("json", description="Export format (json, csv)"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Export user analytics data
    """
    try:
        # Determine target user
        target_user_id = user_id if current_user.role == "admin" and user_id else current_user.id
        
        # Build query
        query = select(UserAnalytics).where(UserAnalytics.user_id == target_user_id)
        
        if start_date:
            query = query.where(UserAnalytics.created_at >= start_date)
        if end_date:
            query = query.where(UserAnalytics.created_at <= end_date)
        
        query = query.order_by(UserAnalytics.created_at)
        
        # Execute query
        result = await db.execute(query)
        analytics = result.scalars().all()
        
        # Format data for export
        export_data = []
        for analytic in analytics:
            export_data.append({
                "id": analytic.id,
                "user_id": analytic.user_id,
                "event_type": analytic.event_type,
                "event_data": analytic.event_data,
                "metadata": analytic.metadata,
                "created_at": analytic.created_at.isoformat()
            })
        
        logger.info(f"Exported {len(analytics)} analytics records for user {target_user_id}")
        
        return {
            "success": True,
            "data": {
                "user_id": target_user_id,
                "export_format": format,
                "total_records": len(analytics),
                "export_date": datetime.utcnow().isoformat(),
                "date_range": {
                    "start": start_date.isoformat() if start_date else None,
                    "end": end_date.isoformat() if end_date else None
                },
                "analytics": export_data
            },
            "message": f"Exported {len(analytics)} analytics records"
        }
        
    except Exception as e:
        logger.error(f"Error exporting user analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/cleanup")
async def cleanup_old_analytics(
    days: int = Query(90, ge=30, le=365, description="Delete analytics older than this many days"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Clean up old analytics data (admin only)
    """
    try:
        if current_user.role != "admin":
            raise HTTPException(status_code=403, detail="Only administrators can clean up analytics data")
        
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Delete old analytics
        delete_query = text(
            "DELETE FROM user_analytics WHERE created_at < :cutoff_date"
        )
        result = await db.execute(delete_query, {"cutoff_date": cutoff_date})
        deleted_count = result.rowcount
        
        await db.commit()
        
        logger.info(f"Cleaned up {deleted_count} analytics records older than {days} days")
        
        return {
            "success": True,
            "message": f"Cleaned up {deleted_count} old analytics records",
            "deleted_count": deleted_count,
            "cutoff_date": cutoff_date.isoformat()
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error cleaning up analytics: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error") 
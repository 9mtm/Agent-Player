"""
Agent Performance API Endpoints
Provides CRUD operations for agent performance metrics and analytics
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc
from typing import Optional, List
import logging
from datetime import datetime, timedelta

from core.dependencies import get_db, get_current_user
from models.database import User, AgentPerformance, Agent
from schemas.agent_performance import (
    AgentPerformanceCreate,
    AgentPerformanceUpdate,
    AgentPerformanceResponse,
    AgentPerformanceListResponse,
    AgentPerformanceDetailResponse,
    AgentPerformanceAnalyticsResponse
)

router = APIRouter(prefix="/agent-performance", tags=["Agent Performance"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=AgentPerformanceListResponse)
async def list_agent_performance(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    metric_type: Optional[str] = Query(None, description="Filter by metric type"),
    days: int = Query(30, ge=1, le=365, description="Number of days to look back"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List agent performance metrics with pagination and filtering
    
    Query Parameters:
    - skip: Number of records to skip (default: 0)
    - limit: Maximum records to return (default: 50, max: 100)
    - agent_id: Filter by specific agent
    - metric_type: Filter by metric type (response_time, accuracy, efficiency, etc.)
    - days: Number of days to look back (default: 30, max: 365)
    """
    try:
        # Build query with user ownership check
        query = select(AgentPerformance).join(Agent).where(Agent.user_id == current_user.id)
        
        # Filter by date range
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        query = query.where(AgentPerformance.measurement_date >= cutoff_date)
        
        # Apply filters
        if agent_id:
            query = query.where(AgentPerformance.agent_id == agent_id)
        
        if metric_type:
            query = query.where(AgentPerformance.metric_type == metric_type)
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(desc(AgentPerformance.measurement_date))
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        performance_records = result.scalars().all()
        
        logger.info(f"Listed {len(performance_records)} performance records for user {current_user.id}")
        
        return AgentPerformanceListResponse(
            success=True,
            data={
                "performance_records": performance_records,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(performance_records)) < total,
                "date_range_days": days
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing agent performance: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=AgentPerformanceResponse, status_code=201)
async def create_performance_record(
    performance_data: AgentPerformanceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new agent performance record
    
    Records performance metrics for an agent at a specific point in time.
    """
    try:
        # Verify agent ownership
        agent_query = select(Agent).where(
            and_(Agent.id == performance_data.agent_id, Agent.user_id == current_user.id)
        )
        agent_result = await db.execute(agent_query)
        agent = agent_result.scalar_one_or_none()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        # Create performance record
        performance = AgentPerformance(
            agent_id=performance_data.agent_id,
            metric_name=performance_data.metric_name,
            metric_value=performance_data.metric_value,
            metric_type=performance_data.metric_type,
            measurement_date=performance_data.measurement_date or datetime.utcnow(),
            context_data=performance_data.context_data or {}
        )
        
        db.add(performance)
        await db.commit()
        await db.refresh(performance)
        
        logger.info(f"Created performance record {performance.id} for agent {performance.agent_id}")
        
        return AgentPerformanceResponse(
            success=True,
            data=performance,
            message="Agent performance record created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating performance record: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{performance_id}", response_model=AgentPerformanceDetailResponse)
async def get_performance_record(
    performance_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific performance record
    
    Returns complete performance record with agent information and context.
    """
    try:
        # Get performance record with agent ownership check
        query = select(AgentPerformance).join(Agent).where(
            and_(
                AgentPerformance.id == performance_id,
                Agent.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        performance = result.scalar_one_or_none()
        
        if not performance:
            raise HTTPException(status_code=404, detail="Performance record not found or access denied")
        
        logger.info(f"Retrieved performance record {performance_id} for user {current_user.id}")
        
        return AgentPerformanceDetailResponse(
            success=True,
            data={
                "performance": performance,
                "agent_info": {
                    "agent_id": performance.agent_id,
                    "agent_name": performance.agent.name if performance.agent else "Unknown"
                },
                "trends": {
                    "improvement": 0.0,  # TODO: Calculate improvement trend
                    "trend_direction": "stable",
                    "comparison_period": "7 days"
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving performance record {performance_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{performance_id}", response_model=AgentPerformanceResponse)
async def update_performance_record(
    performance_id: int,
    performance_data: AgentPerformanceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing performance record
    
    Updates performance metrics, values, or context data.
    """
    try:
        # Get performance record with agent ownership check
        query = select(AgentPerformance).join(Agent).where(
            and_(
                AgentPerformance.id == performance_id,
                Agent.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        performance = result.scalar_one_or_none()
        
        if not performance:
            raise HTTPException(status_code=404, detail="Performance record not found or access denied")
        
        # Update fields
        update_data = performance_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(performance, field, value)
        
        await db.commit()
        await db.refresh(performance)
        
        logger.info(f"Updated performance record {performance_id}")
        
        return AgentPerformanceResponse(
            success=True,
            data=performance,
            message="Performance record updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating performance record {performance_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{performance_id}")
async def delete_performance_record(
    performance_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a performance record
    
    Permanently removes the performance record from the database.
    """
    try:
        # Get performance record with agent ownership check
        query = select(AgentPerformance).join(Agent).where(
            and_(
                AgentPerformance.id == performance_id,
                Agent.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        performance = result.scalar_one_or_none()
        
        if not performance:
            raise HTTPException(status_code=404, detail="Performance record not found or access denied")
        
        await db.delete(performance)
        await db.commit()
        
        logger.info(f"Deleted performance record {performance_id}")
        
        return {
            "success": True,
            "message": "Performance record deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting performance record {performance_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/overview", response_model=AgentPerformanceAnalyticsResponse)
async def get_performance_analytics(
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    metric_type: Optional[str] = Query(None, description="Filter by metric type"),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get comprehensive performance analytics
    
    Returns performance trends, averages, and insights for agents.
    """
    try:
        # Base query with user ownership and date filter
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        base_query = select(AgentPerformance).join(Agent).where(
            and_(
                Agent.user_id == current_user.id,
                AgentPerformance.measurement_date >= cutoff_date
            )
        )
        
        if agent_id:
            base_query = base_query.where(AgentPerformance.agent_id == agent_id)
        
        if metric_type:
            base_query = base_query.where(AgentPerformance.metric_type == metric_type)
        
        # Total records
        total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
        total_records = total_result.scalar()
        
        # Average performance by metric type
        avg_query = select(
            AgentPerformance.metric_type,
            func.avg(AgentPerformance.metric_value).label('avg_value'),
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(AgentPerformance.metric_type)
        avg_result = await db.execute(avg_query)
        avg_by_type = [
            {
                "metric_type": row[0],
                "average_value": round(row[1], 3),
                "record_count": row[2]
            }
            for row in avg_result.fetchall()
        ]
        
        # Performance by agent
        agent_query = select(
            AgentPerformance.agent_id,
            func.avg(AgentPerformance.metric_value).label('avg_value'),
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(AgentPerformance.agent_id)
        agent_result = await db.execute(agent_query)
        performance_by_agent = [
            {
                "agent_id": row[0],
                "average_performance": round(row[1], 3),
                "total_measurements": row[2]
            }
            for row in agent_result.fetchall()
        ]
        
        # Recent trends (last 7 days vs previous 7 days)
        recent_cutoff = datetime.utcnow() - timedelta(days=7)
        previous_cutoff = datetime.utcnow() - timedelta(days=14)
        
        recent_query = select(func.avg(AgentPerformance.metric_value)).select_from(
            base_query.where(AgentPerformance.measurement_date >= recent_cutoff).subquery()
        )
        previous_query = select(func.avg(AgentPerformance.metric_value)).select_from(
            base_query.where(
                and_(
                    AgentPerformance.measurement_date >= previous_cutoff,
                    AgentPerformance.measurement_date < recent_cutoff
                )
            ).subquery()
        )
        
        recent_result = await db.execute(recent_query)
        previous_result = await db.execute(previous_query)
        
        recent_avg = recent_result.scalar() or 0.0
        previous_avg = previous_result.scalar() or 0.0
        
        trend_percentage = 0.0
        if previous_avg > 0:
            trend_percentage = ((recent_avg - previous_avg) / previous_avg) * 100
        
        logger.info(f"Generated performance analytics for user {current_user.id}")
        
        return AgentPerformanceAnalyticsResponse(
            success=True,
            data={
                "total_records": total_records,
                "analysis_period_days": days,
                "average_by_metric_type": avg_by_type,
                "performance_by_agent": performance_by_agent,
                "recent_trend": {
                    "current_period_avg": round(recent_avg, 3),
                    "previous_period_avg": round(previous_avg, 3),
                    "trend_percentage": round(trend_percentage, 2),
                    "trend_direction": "improving" if trend_percentage > 0 else "declining" if trend_percentage < 0 else "stable"
                },
                "filters_applied": {
                    "agent_id": agent_id,
                    "metric_type": metric_type
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error generating performance analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search")
async def search_performance_records(
    q: str = Query(..., description="Search in metric names"),
    metric_type: Optional[str] = Query(None, description="Filter by metric type"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search performance records with advanced filtering
    
    Performs search across metric names and types.
    """
    try:
        # Build search query
        search_filter = f"%{q}%"
        query = select(AgentPerformance).join(Agent).where(
            and_(
                Agent.user_id == current_user.id,
                AgentPerformance.metric_name.ilike(search_filter)
            )
        )
        
        # Apply filters
        if agent_id:
            query = query.where(AgentPerformance.agent_id == agent_id)
        
        if metric_type:
            query = query.where(AgentPerformance.metric_type == metric_type)
        
        # Apply limit and ordering
        query = query.order_by(desc(AgentPerformance.measurement_date)).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        performance_records = result.scalars().all()
        
        logger.info(f"Search returned {len(performance_records)} performance records for query: {q}")
        
        return {
            "success": True,
            "data": {
                "query": q,
                "results": performance_records,
                "count": len(performance_records),
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching performance records: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/metrics/types")
async def get_metric_types(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all available metric types used by the user's agents
    
    Returns a list of unique metric types for filtering and analytics.
    """
    try:
        query = select(AgentPerformance.metric_type.distinct()).join(Agent).where(
            Agent.user_id == current_user.id
        )
        
        result = await db.execute(query)
        metric_types = [row[0] for row in result.fetchall()]
        
        return {
            "success": True,
            "data": {
                "metric_types": metric_types,
                "count": len(metric_types)
            }
        }
        
    except Exception as e:
        logger.error(f"Error retrieving metric types: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 
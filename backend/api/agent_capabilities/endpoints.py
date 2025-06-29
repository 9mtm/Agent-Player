"""
Agent Capabilities API Endpoints
Provides CRUD operations for agent capabilities management
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from typing import Optional, List
import logging
from datetime import datetime

from core.dependencies import get_db, get_current_user
from models.database import User, AgentCapability, Agent
from schemas.agent_capabilities import (
    AgentCapabilityCreate,
    AgentCapabilityUpdate,
    AgentCapabilityResponse,
    AgentCapabilitiesListResponse,
    AgentCapabilityDetailResponse
)

router = APIRouter(prefix="/agent-capabilities", tags=["Agent Capabilities"])
logger = logging.getLogger(__name__)

@router.get("/", response_model=AgentCapabilitiesListResponse)
async def list_agent_capabilities(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(50, ge=1, le=100, description="Maximum records to return"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    capability_type: Optional[str] = Query(None, description="Filter by capability type"),
    search: Optional[str] = Query(None, description="Search in capability name or description"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List agent capabilities with pagination and filtering
    
    Query Parameters:
    - skip: Number of records to skip (default: 0)
    - limit: Maximum records to return (default: 50, max: 100)
    - agent_id: Filter by specific agent
    - capability_type: Filter by capability type
    - search: Search in name or description
    """
    try:
        # Build query
        query = select(AgentCapability).join(Agent)
        
        # Filter by user's agents only
        query = query.where(Agent.user_id == current_user.id)
        
        # Apply filters
        if agent_id:
            query = query.where(AgentCapability.agent_id == agent_id)
        
        if capability_type:
            query = query.where(AgentCapability.capability_type == capability_type)
        
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                AgentCapability.name.ilike(search_filter) |
                AgentCapability.description.ilike(search_filter)
            )
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(AgentCapability.created_at.desc())
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        capabilities = result.scalars().all()
        
        logger.info(f"Listed {len(capabilities)} agent capabilities for user {current_user.id}")
        
        return AgentCapabilitiesListResponse(
            success=True,
            data={
                "capabilities": capabilities,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(capabilities)) < total
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing agent capabilities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=AgentCapabilityResponse, status_code=201)
async def create_agent_capability(
    capability_data: AgentCapabilityCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new agent capability
    
    Creates a new capability for an agent with specified parameters and configuration.
    """
    try:
        # Verify agent ownership
        agent_query = select(Agent).where(
            and_(Agent.id == capability_data.agent_id, Agent.user_id == current_user.id)
        )
        agent_result = await db.execute(agent_query)
        agent = agent_result.scalar_one_or_none()
        
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found or access denied")
        
        # Check for duplicate capability name for this agent
        existing_query = select(AgentCapability).where(
            and_(
                AgentCapability.agent_id == capability_data.agent_id,
                AgentCapability.name == capability_data.name
            )
        )
        existing_result = await db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            raise HTTPException(status_code=400, detail="Capability with this name already exists for this agent")
        
        # Create capability
        capability = AgentCapability(
            agent_id=capability_data.agent_id,
            name=capability_data.name,
            description=capability_data.description,
            capability_type=capability_data.capability_type,
            proficiency_level=capability_data.proficiency_level,
            configuration=capability_data.configuration or {},
            is_active=capability_data.is_active,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(capability)
        await db.commit()
        await db.refresh(capability)
        
        logger.info(f"Created agent capability {capability.id} for agent {capability.agent_id}")
        
        return AgentCapabilityResponse(
            success=True,
            data=capability,
            message="Agent capability created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating agent capability: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{capability_id}", response_model=AgentCapabilityDetailResponse)
async def get_agent_capability(
    capability_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed information about a specific agent capability
    
    Returns complete capability information including configuration and usage statistics.
    """
    try:
        # Get capability with agent ownership check
        query = select(AgentCapability).join(Agent).where(
            and_(
                AgentCapability.id == capability_id,
                Agent.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        capability = result.scalar_one_or_none()
        
        if not capability:
            raise HTTPException(status_code=404, detail="Agent capability not found or access denied")
        
        logger.info(f"Retrieved agent capability {capability_id} for user {current_user.id}")
        
        return AgentCapabilityDetailResponse(
            success=True,
            data={
                "capability": capability,
                "agent_info": {
                    "agent_id": capability.agent_id,
                    "agent_name": capability.agent.name if capability.agent else "Unknown"
                },
                "usage_stats": {
                    "times_used": 0,  # TODO: Implement usage tracking
                    "last_used": None,
                    "success_rate": 0.0
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving agent capability {capability_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{capability_id}", response_model=AgentCapabilityResponse)
async def update_agent_capability(
    capability_id: int,
    capability_data: AgentCapabilityUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update an existing agent capability
    
    Updates capability configuration, proficiency level, and other parameters.
    """
    try:
        # Get capability with agent ownership check
        query = select(AgentCapability).join(Agent).where(
            and_(
                AgentCapability.id == capability_id,
                Agent.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        capability = result.scalar_one_or_none()
        
        if not capability:
            raise HTTPException(status_code=404, detail="Agent capability not found or access denied")
        
        # Update fields
        update_data = capability_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(capability, field, value)
        
        capability.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(capability)
        
        logger.info(f"Updated agent capability {capability_id}")
        
        return AgentCapabilityResponse(
            success=True,
            data=capability,
            message="Agent capability updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating agent capability {capability_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{capability_id}")
async def delete_agent_capability(
    capability_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an agent capability
    
    Permanently removes the capability from the agent.
    """
    try:
        # Get capability with agent ownership check
        query = select(AgentCapability).join(Agent).where(
            and_(
                AgentCapability.id == capability_id,
                Agent.user_id == current_user.id
            )
        )
        
        result = await db.execute(query)
        capability = result.scalar_one_or_none()
        
        if not capability:
            raise HTTPException(status_code=404, detail="Agent capability not found or access denied")
        
        await db.delete(capability)
        await db.commit()
        
        logger.info(f"Deleted agent capability {capability_id}")
        
        return {
            "success": True,
            "message": "Agent capability deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting agent capability {capability_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/analytics/overview")
async def get_capabilities_analytics(
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get analytics overview for agent capabilities
    
    Returns statistics about capability usage, performance, and distribution.
    """
    try:
        # Base query with user ownership
        base_query = select(AgentCapability).join(Agent).where(Agent.user_id == current_user.id)
        
        if agent_id:
            base_query = base_query.where(AgentCapability.agent_id == agent_id)
        
        # Total capabilities
        total_result = await db.execute(select(func.count()).select_from(base_query.subquery()))
        total_capabilities = total_result.scalar()
        
        # Active capabilities
        active_query = base_query.where(AgentCapability.is_active == True)
        active_result = await db.execute(select(func.count()).select_from(active_query.subquery()))
        active_capabilities = active_result.scalar()
        
        # Capabilities by type
        type_query = select(
            AgentCapability.capability_type,
            func.count().label('count')
        ).select_from(base_query.subquery()).group_by(AgentCapability.capability_type)
        type_result = await db.execute(type_query)
        capabilities_by_type = [{"type": row[0], "count": row[1]} for row in type_result.fetchall()]
        
        # Average proficiency level
        proficiency_query = select(func.avg(AgentCapability.proficiency_level)).select_from(base_query.subquery())
        proficiency_result = await db.execute(proficiency_query)
        avg_proficiency = proficiency_result.scalar() or 0.0
        
        logger.info(f"Generated capabilities analytics for user {current_user.id}")
        
        return {
            "success": True,
            "data": {
                "total_capabilities": total_capabilities,
                "active_capabilities": active_capabilities,
                "inactive_capabilities": total_capabilities - active_capabilities,
                "capabilities_by_type": capabilities_by_type,
                "average_proficiency": round(avg_proficiency, 2),
                "agent_filter": agent_id
            }
        }
        
    except Exception as e:
        logger.error(f"Error generating capabilities analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/search")
async def search_agent_capabilities(
    q: str = Query(..., description="Search query"),
    agent_id: Optional[int] = Query(None, description="Filter by agent ID"),
    capability_type: Optional[str] = Query(None, description="Filter by capability type"),
    limit: int = Query(20, ge=1, le=50, description="Maximum results"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search agent capabilities with advanced filtering
    
    Performs full-text search across capability names and descriptions.
    """
    try:
        # Build search query
        search_filter = f"%{q}%"
        query = select(AgentCapability).join(Agent).where(
            and_(
                Agent.user_id == current_user.id,
                AgentCapability.name.ilike(search_filter) |
                AgentCapability.description.ilike(search_filter)
            )
        )
        
        # Apply filters
        if agent_id:
            query = query.where(AgentCapability.agent_id == agent_id)
        
        if capability_type:
            query = query.where(AgentCapability.capability_type == capability_type)
        
        # Apply limit and ordering
        query = query.order_by(AgentCapability.name).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        capabilities = result.scalars().all()
        
        logger.info(f"Search returned {len(capabilities)} capabilities for query: {q}")
        
        return {
            "success": True,
            "data": {
                "query": q,
                "results": capabilities,
                "count": len(capabilities),
                "limit": limit
            }
        }
        
    except Exception as e:
        logger.error(f"Error searching agent capabilities: {e}")
        raise HTTPException(status_code=500, detail="Internal server error") 
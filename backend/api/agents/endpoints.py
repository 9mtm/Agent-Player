"""
Agents API Endpoints
All agent management related routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional
from models.agent import (
    AgentCreateRequest, AgentUpdateRequest, AgentTestRequest,
    AgentListResponse, AgentDetailResponse, AgentTestResponse, 
    AgentStatsResponse, ChildAgentCreateRequest
)
from models.shared import SuccessResponse
from core.dependencies import get_current_user, get_optional_user
from services.agent_service import AgentService

# Initialize router and service
router = APIRouter(prefix="/agents", tags=["Agents"])
agent_service = AgentService()

@router.get("", response_model=SuccessResponse)
async def get_all_agents(
    agent_type: Optional[str] = Query(None, regex="^(main|child)$"),
    current_user: Optional[Dict] = Depends(get_optional_user)
):
    """Get all agents with optional filtering"""
    try:
        if agent_type == "main":
            agents = agent_service.get_main_agents()
        elif agent_type == "child":
            agents = agent_service.get_child_agents()
        else:
            agents = agent_service.get_all_agents()
        
        return SuccessResponse(
            message=f"Found {len(agents)} agents",
            data={"agents": agents, "total": len(agents)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/main", response_model=SuccessResponse)
async def get_main_agents():
    """Get main agents only"""
    try:
        agents = agent_service.get_main_agents()
        return SuccessResponse(
            message=f"Found {len(agents)} main agents",
            data={"agents": agents, "total": len(agents)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/child", response_model=SuccessResponse)
async def get_child_agents():
    """Get child agents only"""
    try:
        agents = agent_service.get_child_agents()
        return SuccessResponse(
            message=f"Found {len(agents)} child agents",
            data={"agents": agents, "total": len(agents)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}", response_model=SuccessResponse)
async def get_agent_by_id(agent_id: int):
    """Get specific agent by ID"""
    try:
        agent = agent_service.get_agent_by_id(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return SuccessResponse(
            message="Agent found",
            data=agent
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("", response_model=SuccessResponse)
async def create_agent(
    request: AgentCreateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Create new agent"""
    try:
        # Set user_id from current user
        request.user_id = current_user["user_id"]
        
        agent_id = agent_service.create_agent(
            name=request.name,
            description=request.description,
            agent_type=request.agent_type,
            model_provider=request.model_provider,
            model_name=request.model_name,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            api_key=request.api_key,
            parent_agent_id=request.parent_agent_id,
            user_id=request.user_id
        )
        
        return SuccessResponse(
            message="Agent created successfully",
            data={"agent_id": agent_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/child", response_model=SuccessResponse)
async def create_child_agent(
    request: ChildAgentCreateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Create new child agent"""
    try:
        # Set user_id from current user
        request.user_id = current_user["user_id"]
        
        agent_id = agent_service.create_agent(
            name=request.name,
            description=request.description,
            agent_type="child",
            model_provider=request.model_provider,
            model_name=request.model_name,
            system_prompt=request.system_prompt,
            temperature=request.temperature,
            max_tokens=request.max_tokens,
            api_key=request.api_key,
            parent_agent_id=request.parent_agent_id,
            user_id=request.user_id
        )
        
        return SuccessResponse(
            message="Child agent created successfully",
            data={"agent_id": agent_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{agent_id}", response_model=SuccessResponse)
async def update_agent(
    agent_id: int, 
    request: AgentUpdateRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Update existing agent"""
    try:
        success = agent_service.update_agent(agent_id, request.dict(exclude_unset=True))
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return SuccessResponse(
            message="Agent updated successfully",
            data={"agent_id": agent_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{agent_id}", response_model=SuccessResponse)
async def delete_agent(
    agent_id: int,
    current_user: Dict = Depends(get_current_user)
):
    """Delete agent"""
    try:
        success = agent_service.delete_agent(agent_id)
        if not success:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return SuccessResponse(
            message="Agent deleted successfully",
            data={"agent_id": agent_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{agent_id}/test", response_model=SuccessResponse)
async def test_agent(
    agent_id: int, 
    request: AgentTestRequest,
    current_user: Dict = Depends(get_current_user)
):
    """Test agent with a message"""
    try:
        result = agent_service.test_agent(agent_id, request.message)
        return SuccessResponse(
            message="Agent test completed",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}/children", response_model=SuccessResponse)
async def get_agent_children(agent_id: int):
    """Get child agents of a specific agent"""
    try:
        children = agent_service.get_agent_children(agent_id)
        return SuccessResponse(
            message=f"Found {len(children)} child agents",
            data={"children": children, "total": len(children)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics/overview", response_model=SuccessResponse)
async def get_agent_statistics():
    """Get agent statistics"""
    try:
        stats = agent_service.get_agent_statistics()
        return SuccessResponse(
            message="Statistics retrieved",
            data=stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{agent_id}/performance", response_model=SuccessResponse)
async def get_agent_performance(agent_id: int):
    """Get agent performance metrics"""
    try:
        performance = agent_service.get_agent_performance(agent_id)
        if not performance:
            raise HTTPException(status_code=404, detail="Agent not found")
        
        return SuccessResponse(
            message="Performance metrics retrieved",
            data=performance
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
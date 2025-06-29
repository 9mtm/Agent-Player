"""
Pydantic schemas for Agent Capabilities API
Defines request and response models for agent capability operations
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class CapabilityType(str, Enum):
    """Supported capability types"""
    LANGUAGE = "language"
    REASONING = "reasoning"
    KNOWLEDGE = "knowledge"
    COMMUNICATION = "communication"
    ANALYSIS = "analysis"
    CREATIVITY = "creativity"
    PROBLEM_SOLVING = "problem_solving"
    TECHNICAL = "technical"
    DOMAIN_SPECIFIC = "domain_specific"


class AgentCapabilityBase(BaseModel):
    """Base schema for agent capability"""
    name: str = Field(..., min_length=1, max_length=200, description="Capability name")
    description: Optional[str] = Field(None, max_length=1000, description="Capability description")
    capability_type: CapabilityType = Field(..., description="Type of capability")
    proficiency_level: float = Field(..., ge=0.0, le=10.0, description="Proficiency level (0-10)")
    configuration: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Capability configuration")
    is_active: bool = Field(True, description="Whether capability is active")

    @validator('proficiency_level')
    def validate_proficiency_level(cls, v):
        if not 0.0 <= v <= 10.0:
            raise ValueError('Proficiency level must be between 0.0 and 10.0')
        return round(v, 2)


class AgentCapabilityCreate(AgentCapabilityBase):
    """Schema for creating a new agent capability"""
    agent_id: int = Field(..., gt=0, description="ID of the agent this capability belongs to")

    class Config:
        schema_extra = {
            "example": {
                "agent_id": 1,
                "name": "Python Programming",
                "description": "Advanced Python programming and debugging capabilities",
                "capability_type": "technical",
                "proficiency_level": 8.5,
                "configuration": {
                    "languages": ["python"],
                    "frameworks": ["fastapi", "django"],
                    "max_complexity": "high"
                },
                "is_active": True
            }
        }


class AgentCapabilityUpdate(BaseModel):
    """Schema for updating an agent capability"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    capability_type: Optional[CapabilityType] = None
    proficiency_level: Optional[float] = Field(None, ge=0.0, le=10.0)
    configuration: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None

    @validator('proficiency_level')
    def validate_proficiency_level(cls, v):
        if v is not None and not 0.0 <= v <= 10.0:
            raise ValueError('Proficiency level must be between 0.0 and 10.0')
        return round(v, 2) if v is not None else v

    class Config:
        schema_extra = {
            "example": {
                "proficiency_level": 9.0,
                "configuration": {
                    "languages": ["python", "typescript"],
                    "frameworks": ["fastapi", "django", "react"],
                    "max_complexity": "expert"
                },
                "is_active": True
            }
        }


class AgentCapabilityInDB(AgentCapabilityBase):
    """Schema for agent capability in database"""
    id: int
    agent_id: int
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class AgentCapabilityResponse(BaseModel):
    """Schema for single agent capability response"""
    success: bool = True
    data: AgentCapabilityInDB
    message: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "id": 1,
                    "agent_id": 1,
                    "name": "Python Programming",
                    "description": "Advanced Python programming capabilities",
                    "capability_type": "technical",
                    "proficiency_level": 8.5,
                    "configuration": {
                        "languages": ["python"],
                        "frameworks": ["fastapi", "django"]
                    },
                    "is_active": True,
                    "created_at": "2024-01-15T10:30:00Z",
                    "updated_at": "2024-01-15T10:30:00Z"
                },
                "message": "Agent capability retrieved successfully"
            }
        }


class AgentCapabilityListItem(AgentCapabilityInDB):
    """Schema for agent capability in list view"""
    agent_name: Optional[str] = None


class AgentCapabilitiesListData(BaseModel):
    """Schema for agent capabilities list data"""
    capabilities: List[AgentCapabilityListItem]
    total: int
    skip: int
    limit: int
    has_more: bool


class AgentCapabilitiesListResponse(BaseModel):
    """Schema for agent capabilities list response"""
    success: bool = True
    data: AgentCapabilitiesListData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "capabilities": [
                        {
                            "id": 1,
                            "agent_id": 1,
                            "name": "Python Programming",
                            "capability_type": "technical",
                            "proficiency_level": 8.5,
                            "is_active": True,
                            "agent_name": "Development Assistant",
                            "created_at": "2024-01-15T10:30:00Z",
                            "updated_at": "2024-01-15T10:30:00Z"
                        }
                    ],
                    "total": 1,
                    "skip": 0,
                    "limit": 50,
                    "has_more": False
                }
            }
        }


class AgentInfo(BaseModel):
    """Schema for agent information"""
    agent_id: int
    agent_name: str


class UsageStats(BaseModel):
    """Schema for capability usage statistics"""
    times_used: int
    last_used: Optional[datetime] = None
    success_rate: float


class AgentCapabilityDetailData(BaseModel):
    """Schema for detailed agent capability data"""
    capability: AgentCapabilityInDB
    agent_info: AgentInfo
    usage_stats: UsageStats


class AgentCapabilityDetailResponse(BaseModel):
    """Schema for detailed agent capability response"""
    success: bool = True
    data: AgentCapabilityDetailData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "capability": {
                        "id": 1,
                        "agent_id": 1,
                        "name": "Python Programming",
                        "description": "Advanced Python programming capabilities",
                        "capability_type": "technical",
                        "proficiency_level": 8.5,
                        "configuration": {
                            "languages": ["python"],
                            "frameworks": ["fastapi", "django"]
                        },
                        "is_active": True,
                        "created_at": "2024-01-15T10:30:00Z",
                        "updated_at": "2024-01-15T10:30:00Z"
                    },
                    "agent_info": {
                        "agent_id": 1,
                        "agent_name": "Development Assistant"
                    },
                    "usage_stats": {
                        "times_used": 156,
                        "last_used": "2024-01-16T14:30:00Z",
                        "success_rate": 0.92
                    }
                }
            }
        }


class CapabilityTypeCount(BaseModel):
    """Schema for capability type count"""
    type: str
    count: int


class CapabilitiesAnalyticsData(BaseModel):
    """Schema for capabilities analytics data"""
    total_capabilities: int
    active_capabilities: int
    inactive_capabilities: int
    capabilities_by_type: List[CapabilityTypeCount]
    average_proficiency: float
    agent_filter: Optional[int] = None


class CapabilitiesAnalyticsResponse(BaseModel):
    """Schema for capabilities analytics response"""
    success: bool = True
    data: CapabilitiesAnalyticsData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "total_capabilities": 25,
                    "active_capabilities": 22,
                    "inactive_capabilities": 3,
                    "capabilities_by_type": [
                        {"type": "technical", "count": 10},
                        {"type": "language", "count": 8},
                        {"type": "reasoning", "count": 5},
                        {"type": "analysis", "count": 2}
                    ],
                    "average_proficiency": 7.8,
                    "agent_filter": None
                }
            }
        }


class CapabilitySearchData(BaseModel):
    """Schema for capability search data"""
    query: str
    results: List[AgentCapabilityInDB]
    count: int
    limit: int


class CapabilitySearchResponse(BaseModel):
    """Schema for capability search response"""
    success: bool = True
    data: CapabilitySearchData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "query": "python",
                    "results": [
                        {
                            "id": 1,
                            "agent_id": 1,
                            "name": "Python Programming",
                            "capability_type": "technical",
                            "proficiency_level": 8.5,
                            "is_active": True,
                            "created_at": "2024-01-15T10:30:00Z",
                            "updated_at": "2024-01-15T10:30:00Z"
                        }
                    ],
                    "count": 1,
                    "limit": 20
                }
            }
        } 
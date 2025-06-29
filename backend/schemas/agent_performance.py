"""
Pydantic schemas for Agent Performance API
Defines request and response models for agent performance operations
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, Dict, Any, List
from datetime import datetime
from enum import Enum


class MetricType(str, Enum):
    """Supported metric types"""
    RESPONSE_TIME = "response_time"
    ACCURACY = "accuracy"
    EFFICIENCY = "efficiency"
    SUCCESS_RATE = "success_rate"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    LATENCY = "latency"
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    CUSTOM = "custom"


class AgentPerformanceBase(BaseModel):
    """Base schema for agent performance"""
    metric_name: str = Field(..., min_length=1, max_length=100, description="Name of the metric")
    metric_value: float = Field(..., description="Numerical value of the metric")
    metric_type: MetricType = Field(..., description="Type of performance metric")
    measurement_date: Optional[datetime] = Field(None, description="When the metric was measured")
    context_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Additional context")

    @validator('metric_value')
    def validate_metric_value(cls, v):
        if v < 0:
            raise ValueError('Metric value cannot be negative')
        return round(v, 6)


class AgentPerformanceCreate(AgentPerformanceBase):
    """Schema for creating a new agent performance record"""
    agent_id: int = Field(..., gt=0, description="ID of the agent this performance data belongs to")

    class Config:
        schema_extra = {
            "example": {
                "agent_id": 1,
                "metric_name": "Average Response Time",
                "metric_value": 1.250,
                "metric_type": "response_time",
                "measurement_date": "2024-01-15T10:30:00Z",
                "context_data": {
                    "session_id": "abc123",
                    "user_count": 50,
                    "complexity": "high"
                }
            }
        }


class AgentPerformanceUpdate(BaseModel):
    """Schema for updating an agent performance record"""
    metric_name: Optional[str] = Field(None, min_length=1, max_length=100)
    metric_value: Optional[float] = None
    metric_type: Optional[MetricType] = None
    measurement_date: Optional[datetime] = None
    context_data: Optional[Dict[str, Any]] = None

    @validator('metric_value')
    def validate_metric_value(cls, v):
        if v is not None and v < 0:
            raise ValueError('Metric value cannot be negative')
        return round(v, 6) if v is not None else v

    class Config:
        schema_extra = {
            "example": {
                "metric_value": 0.980,
                "context_data": {
                    "updated_session": "def456",
                    "optimization": "applied"
                }
            }
        }


class AgentPerformanceInDB(AgentPerformanceBase):
    """Schema for agent performance in database"""
    id: int
    agent_id: int

    class Config:
        from_attributes = True


class AgentPerformanceResponse(BaseModel):
    """Schema for single agent performance response"""
    success: bool = True
    data: AgentPerformanceInDB
    message: Optional[str] = None

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "id": 1,
                    "agent_id": 1,
                    "metric_name": "Average Response Time",
                    "metric_value": 1.250,
                    "metric_type": "response_time",
                    "measurement_date": "2024-01-15T10:30:00Z",
                    "context_data": {
                        "session_id": "abc123",
                        "user_count": 50
                    }
                },
                "message": "Performance record retrieved successfully"
            }
        }


class AgentPerformanceListItem(AgentPerformanceInDB):
    """Schema for agent performance in list view"""
    agent_name: Optional[str] = None


class AgentPerformanceListData(BaseModel):
    """Schema for agent performance list data"""
    performance_records: List[AgentPerformanceListItem]
    total: int
    skip: int
    limit: int
    has_more: bool
    date_range_days: int


class AgentPerformanceListResponse(BaseModel):
    """Schema for agent performance list response"""
    success: bool = True
    data: AgentPerformanceListData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "performance_records": [
                        {
                            "id": 1,
                            "agent_id": 1,
                            "metric_name": "Response Time",
                            "metric_value": 1.250,
                            "metric_type": "response_time",
                            "measurement_date": "2024-01-15T10:30:00Z",
                            "agent_name": "Customer Service Bot"
                        }
                    ],
                    "total": 1,
                    "skip": 0,
                    "limit": 50,
                    "has_more": False,
                    "date_range_days": 30
                }
            }
        }


class AgentInfo(BaseModel):
    """Schema for agent information"""
    agent_id: int
    agent_name: str


class PerformanceTrends(BaseModel):
    """Schema for performance trends"""
    improvement: float
    trend_direction: str
    comparison_period: str


class AgentPerformanceDetailData(BaseModel):
    """Schema for detailed agent performance data"""
    performance: AgentPerformanceInDB
    agent_info: AgentInfo
    trends: PerformanceTrends


class AgentPerformanceDetailResponse(BaseModel):
    """Schema for detailed agent performance response"""
    success: bool = True
    data: AgentPerformanceDetailData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "performance": {
                        "id": 1,
                        "agent_id": 1,
                        "metric_name": "Response Time",
                        "metric_value": 1.250,
                        "metric_type": "response_time",
                        "measurement_date": "2024-01-15T10:30:00Z",
                        "context_data": {
                            "session_id": "abc123"
                        }
                    },
                    "agent_info": {
                        "agent_id": 1,
                        "agent_name": "Customer Service Bot"
                    },
                    "trends": {
                        "improvement": 15.5,
                        "trend_direction": "improving",
                        "comparison_period": "7 days"
                    }
                }
            }
        }


class MetricTypeAverage(BaseModel):
    """Schema for metric type average"""
    metric_type: str
    average_value: float
    record_count: int


class AgentPerformanceAverage(BaseModel):
    """Schema for agent performance average"""
    agent_id: int
    average_performance: float
    total_measurements: int


class TrendData(BaseModel):
    """Schema for trend analysis"""
    current_period_avg: float
    previous_period_avg: float
    trend_percentage: float
    trend_direction: str


class FiltersApplied(BaseModel):
    """Schema for applied filters"""
    agent_id: Optional[int]
    metric_type: Optional[str]


class AgentPerformanceAnalyticsData(BaseModel):
    """Schema for performance analytics data"""
    total_records: int
    analysis_period_days: int
    average_by_metric_type: List[MetricTypeAverage]
    performance_by_agent: List[AgentPerformanceAverage]
    recent_trend: TrendData
    filters_applied: FiltersApplied


class AgentPerformanceAnalyticsResponse(BaseModel):
    """Schema for performance analytics response"""
    success: bool = True
    data: AgentPerformanceAnalyticsData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "total_records": 150,
                    "analysis_period_days": 30,
                    "average_by_metric_type": [
                        {
                            "metric_type": "response_time",
                            "average_value": 1.250,
                            "record_count": 75
                        },
                        {
                            "metric_type": "accuracy",
                            "average_value": 0.925,
                            "record_count": 60
                        }
                    ],
                    "performance_by_agent": [
                        {
                            "agent_id": 1,
                            "average_performance": 1.180,
                            "total_measurements": 85
                        },
                        {
                            "agent_id": 2,
                            "average_performance": 0.950,
                            "total_measurements": 65
                        }
                    ],
                    "recent_trend": {
                        "current_period_avg": 1.125,
                        "previous_period_avg": 1.280,
                        "trend_percentage": -12.1,
                        "trend_direction": "improving"
                    },
                    "filters_applied": {
                        "agent_id": None,
                        "metric_type": None
                    }
                }
            }
        }


class PerformanceSearchData(BaseModel):
    """Schema for performance search data"""
    query: str
    results: List[AgentPerformanceInDB]
    count: int
    limit: int


class PerformanceSearchResponse(BaseModel):
    """Schema for performance search response"""
    success: bool = True
    data: PerformanceSearchData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "query": "response",
                    "results": [
                        {
                            "id": 1,
                            "agent_id": 1,
                            "metric_name": "Average Response Time",
                            "metric_value": 1.250,
                            "metric_type": "response_time",
                            "measurement_date": "2024-01-15T10:30:00Z"
                        }
                    ],
                    "count": 1,
                    "limit": 20
                }
            }
        }


class MetricTypesData(BaseModel):
    """Schema for metric types data"""
    metric_types: List[str]
    count: int


class MetricTypesResponse(BaseModel):
    """Schema for metric types response"""
    success: bool = True
    data: MetricTypesData

    class Config:
        schema_extra = {
            "example": {
                "success": True,
                "data": {
                    "metric_types": [
                        "response_time",
                        "accuracy",
                        "efficiency",
                        "success_rate"
                    ],
                    "count": 4
                }
            }
        } 
"""
Board API Schemas
Pydantic models for request/response validation
"""

from pydantic import BaseModel, Field, validator
from typing import Optional, List, Dict, Any, Union
from datetime import datetime
from enum import Enum

# Enums
class BoardType(str, Enum):
    WORKFLOW = "workflow"
    TRAINING = "training"
    AUTOMATION = "automation"

class BoardStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    ARCHIVED = "archived"

class BoardVisibility(str, Enum):
    PRIVATE = "private"
    SHARED = "shared"
    PUBLIC = "public"

class ConnectionType(str, Enum):
    CURVED = "curved"
    STRAIGHT = "straight"
    STEPPED = "stepped"

class ExecutionStatus(str, Enum):
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

# Node Schemas
class BoardNodeBase(BaseModel):
    """Base schema for board nodes"""
    node_type: str = Field(..., description="Type of the node")
    label: str = Field(..., min_length=1, max_length=200, description="Node display label")
    description: Optional[str] = Field(None, description="Node description")
    position_x: float = Field(..., description="X position on board")
    position_y: float = Field(..., description="Y position on board")
    width: int = Field(default=120, ge=50, le=500, description="Node width")
    height: int = Field(default=60, ge=30, le=300, description="Node height")
    color: str = Field(default="#667eea", pattern=r"^#[0-9A-Fa-f]{6}$", description="Node color")
    icon: str = Field(default="fas fa-cog", description="Node icon class")
    config: Optional[Dict[str, Any]] = Field(default=None, description="Node configuration")
    input_schema: Optional[Dict[str, Any]] = Field(default=None, description="Input schema")
    output_schema: Optional[Dict[str, Any]] = Field(default=None, description="Output schema")
    is_active: bool = Field(default=True, description="Node active status")
    is_start_node: bool = Field(default=False, description="Is start node")
    is_end_node: bool = Field(default=False, description="Is end node")
    execution_order: Optional[int] = Field(default=None, description="Execution order")

class BoardNodeCreate(BoardNodeBase):
    """Schema for creating a board node"""
    pass

class BoardNodeUpdate(BaseModel):
    """Schema for updating a board node"""
    label: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    position_x: Optional[float] = None
    position_y: Optional[float] = None
    width: Optional[int] = Field(None, ge=50, le=500)
    height: Optional[int] = Field(None, ge=30, le=300)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    icon: Optional[str] = None
    config: Optional[Dict[str, Any]] = None
    input_schema: Optional[Dict[str, Any]] = None
    output_schema: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    is_start_node: Optional[bool] = None
    is_end_node: Optional[bool] = None
    execution_order: Optional[int] = None

class BoardNodeResponse(BoardNodeBase):
    """Schema for board node response"""
    id: str
    board_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Connection Schemas
class BoardConnectionBase(BaseModel):
    """Base schema for board connections"""
    source_node_id: str = Field(..., description="Source node ID")
    target_node_id: str = Field(..., description="Target node ID")
    source_port: Optional[str] = Field(None, description="Source port name")
    target_port: Optional[str] = Field(None, description="Target port name")
    connection_type: str = Field(default="data", description="Connection type")
    color: str = Field(default="#667eea", pattern=r"^#[0-9A-Fa-f]{6}$", description="Connection color")
    style: str = Field(default="solid", description="Connection style")
    condition: Optional[str] = Field(None, description="Conditional logic")
    condition_config: Optional[Dict[str, Any]] = Field(None, description="Condition configuration")
    is_active: bool = Field(default=True, description="Connection active status")
    execution_order: Optional[int] = Field(None, description="Execution order")

class BoardConnectionCreate(BoardConnectionBase):
    """Schema for creating a board connection"""
    pass

class BoardConnectionUpdate(BaseModel):
    """Schema for updating a board connection"""
    source_port: Optional[str] = None
    target_port: Optional[str] = None
    connection_type: Optional[str] = None
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")
    style: Optional[str] = None
    condition: Optional[str] = None
    condition_config: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    execution_order: Optional[int] = None

class BoardConnectionResponse(BoardConnectionBase):
    """Schema for board connection response"""
    id: str
    board_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Board Schemas
class BoardBase(BaseModel):
    """Base schema for boards"""
    name: str = Field(..., min_length=1, max_length=200, description="Board name")
    description: Optional[str] = Field(None, description="Board description")
    board_type: BoardType = Field(default=BoardType.WORKFLOW, description="Board type")
    status: BoardStatus = Field(default=BoardStatus.DRAFT, description="Board status")
    visibility: BoardVisibility = Field(default=BoardVisibility.PRIVATE, description="Board visibility")
    zoom_level: float = Field(default=1.0, ge=0.1, le=5.0, description="Zoom level")
    pan_x: float = Field(default=0.0, description="Pan X offset")
    pan_y: float = Field(default=0.0, description="Pan Y offset")
    connection_type: ConnectionType = Field(default=ConnectionType.CURVED, description="Connection type")
    theme: str = Field(default="light", description="Board theme")
    board_data: Optional[Dict[str, Any]] = Field(default=None, description="Board metadata")
    settings: Optional[Dict[str, Any]] = Field(default=None, description="Board settings")
    is_executable: bool = Field(default=False, description="Can be executed")

class BoardCreate(BoardBase):
    """Schema for creating a board"""
    agent_id: Optional[int] = Field(None, description="Associated agent ID")

class BoardUpdate(BaseModel):
    """Schema for updating a board"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    board_type: Optional[BoardType] = None
    status: Optional[BoardStatus] = None
    visibility: Optional[BoardVisibility] = None
    zoom_level: Optional[float] = Field(None, ge=0.1, le=5.0)
    pan_x: Optional[float] = None
    pan_y: Optional[float] = None
    connection_type: Optional[ConnectionType] = None
    theme: Optional[str] = None
    board_data: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    is_executable: Optional[bool] = None

class BoardResponse(BoardBase):
    """Schema for board response"""
    id: str
    user_id: int
    agent_id: Optional[int]
    execution_count: int
    last_execution: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    # Include related data
    nodes: List[BoardNodeResponse] = Field(default=[], description="Board nodes")
    connections: List[BoardConnectionResponse] = Field(default=[], description="Board connections")

    class Config:
        from_attributes = True

class BoardListResponse(BaseModel):
    """Schema for board list response"""
    id: str
    name: str
    description: Optional[str]
    board_type: str
    status: str
    visibility: str
    user_id: int
    agent_id: Optional[int]
    execution_count: int
    last_execution: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    node_count: int = Field(default=0, description="Number of nodes")
    connection_count: int = Field(default=0, description="Number of connections")

    class Config:
        from_attributes = True

# Board Execution Schemas
class BoardExecutionCreate(BaseModel):
    """Schema for creating board execution"""
    execution_type: str = Field(default="manual", description="Execution type")
    trigger_data: Optional[Dict[str, Any]] = Field(None, description="Trigger data")

class BoardExecutionResponse(BaseModel):
    """Schema for board execution response"""
    id: str
    board_id: str
    user_id: int
    status: ExecutionStatus
    execution_type: str
    trigger_data: Optional[Dict[str, Any]]
    total_nodes: int
    completed_nodes: int
    failed_nodes: int
    execution_time_ms: Optional[int]
    result_data: Optional[Dict[str, Any]]
    error_message: Optional[str]
    execution_log: Optional[Dict[str, Any]]
    started_at: datetime
    completed_at: Optional[datetime]
    created_at: datetime

    class Config:
        from_attributes = True

# Board Template Schemas
class BoardTemplateBase(BaseModel):
    """Base schema for board templates"""
    name: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    category: str = Field(..., description="Template category")
    template_data: Dict[str, Any] = Field(..., description="Template data")
    preview_image: Optional[str] = None
    tags: Optional[List[str]] = Field(default=[], description="Template tags")
    is_public: bool = Field(default=True, description="Public template")
    is_featured: bool = Field(default=False, description="Featured template")
    difficulty_level: str = Field(default="beginner", description="Difficulty level")

class BoardTemplateCreate(BoardTemplateBase):
    """Schema for creating board template"""
    pass

class BoardTemplateResponse(BoardTemplateBase):
    """Schema for board template response"""
    id: str
    usage_count: int
    rating: float
    created_by: Optional[int]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

# Bulk Operations
class BoardBulkCreateRequest(BaseModel):
    """Schema for bulk creating board data"""
    board: BoardCreate
    nodes: List[BoardNodeCreate] = Field(default=[], description="Nodes to create")
    connections: List[BoardConnectionCreate] = Field(default=[], description="Connections to create")

class BoardBulkUpdateRequest(BaseModel):
    """Schema for bulk updating board data"""
    board: Optional[BoardUpdate] = None
    nodes: Optional[List[BoardNodeUpdate]] = None
    connections: Optional[List[BoardConnectionUpdate]] = None
    
# Search and Filter
class BoardSearchRequest(BaseModel):
    """Schema for board search"""
    query: Optional[str] = Field(None, description="Search query")
    board_type: Optional[BoardType] = None
    status: Optional[BoardStatus] = None
    visibility: Optional[BoardVisibility] = None
    agent_id: Optional[int] = None
    skip: int = Field(default=0, ge=0, description="Records to skip")
    limit: int = Field(default=20, ge=1, le=100, description="Records to return")
    sort_by: str = Field(default="created_at", description="Sort field")
    sort_order: str = Field(default="desc", pattern="^(asc|desc)$", description="Sort order")

# Response Models
class BoardsListResponse(BaseModel):
    """Schema for boards list response"""
    boards: List[BoardListResponse]
    total: int
    page: int
    pages: int
    has_next: bool

class SuccessResponse(BaseModel):
    """Generic success response"""
    success: bool = True
    message: str = "Operation completed successfully"
    data: Optional[Dict[str, Any]] = None

class ErrorResponse(BaseModel):
    """Generic error response"""
    success: bool = False
    message: str = "An error occurred"
    errors: List[str] = [] 
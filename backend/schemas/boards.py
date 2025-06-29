"""
Pydantic schemas for Boards API
"""

from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime


# Board Management Schemas
class BoardCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Board name")
    description: Optional[str] = Field(None, max_length=1000, description="Board description")
    board_type: str = Field(..., description="Type of board (workflow, agent_training, etc.)")
    board_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Board configuration data")
    is_public: Optional[bool] = Field(False, description="Whether board is public")


class BoardUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Board name")
    description: Optional[str] = Field(None, max_length=1000, description="Board description")
    board_data: Optional[Dict[str, Any]] = Field(None, description="Board configuration data")
    status: Optional[str] = Field(None, description="Board status")
    is_public: Optional[bool] = Field(None, description="Whether board is public")


class BoardResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class BoardListResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


class BoardDetailResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


# Board Execution Schemas
class BoardExecutionRequest(BaseModel):
    input_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Input data for execution")
    execution_mode: Optional[str] = Field("normal", description="Execution mode (normal, debug, test)")
    timeout: Optional[int] = Field(300, description="Execution timeout in seconds")


class BoardExecutionResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Dict[str, Any]


# Board Analytics Schemas
class BoardAnalyticsResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


# Board Node Schemas
class BoardNodeCreate(BaseModel):
    board_id: int = Field(..., description="Board ID")
    node_type: str = Field(..., description="Type of node")
    position_x: float = Field(..., description="X position on canvas")
    position_y: float = Field(..., description="Y position on canvas")
    node_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Node configuration data")
    is_active: Optional[bool] = Field(True, description="Whether node is active")


class BoardNodeUpdate(BaseModel):
    node_type: Optional[str] = Field(None, description="Type of node")
    position_x: Optional[float] = Field(None, description="X position on canvas")
    position_y: Optional[float] = Field(None, description="Y position on canvas")
    node_data: Optional[Dict[str, Any]] = Field(None, description="Node configuration data")
    is_active: Optional[bool] = Field(None, description="Whether node is active")


class BoardNodeResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# Board Connection Schemas
class BoardConnectionCreate(BaseModel):
    board_id: int = Field(..., description="Board ID")
    source_node_id: int = Field(..., description="Source node ID")
    target_node_id: int = Field(..., description="Target node ID")
    connection_type: Optional[str] = Field("data", description="Type of connection")
    connection_data: Optional[Dict[str, Any]] = Field(default_factory=dict, description="Connection configuration")


class BoardConnectionUpdate(BaseModel):
    connection_type: Optional[str] = Field(None, description="Type of connection")
    connection_data: Optional[Dict[str, Any]] = Field(None, description="Connection configuration")


class BoardConnectionResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


# Board Template Schemas
class BoardTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200, description="Template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    category: str = Field(..., description="Template category")
    template_data: Dict[str, Any] = Field(..., description="Template configuration")
    is_public: Optional[bool] = Field(False, description="Whether template is public")
    tags: Optional[List[str]] = Field(default_factory=list, description="Template tags")


class BoardTemplateUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=200, description="Template name")
    description: Optional[str] = Field(None, max_length=1000, description="Template description")
    template_data: Optional[Dict[str, Any]] = Field(None, description="Template configuration")
    is_public: Optional[bool] = Field(None, description="Whether template is public")
    tags: Optional[List[str]] = Field(None, description="Template tags")


class BoardTemplateResponse(BaseModel):
    success: bool = True
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None


class BoardTemplateListResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]


# Complex Board Operations
class BoardImportRequest(BaseModel):
    template_id: Optional[int] = Field(None, description="Template ID to import from")
    board_data: Optional[Dict[str, Any]] = Field(None, description="Direct board data to import")
    import_mode: Optional[str] = Field("merge", description="Import mode (merge, replace)")


class BoardExportRequest(BaseModel):
    include_executions: Optional[bool] = Field(False, description="Include execution history")
    export_format: Optional[str] = Field("json", description="Export format (json, yaml)")
    export_scope: Optional[str] = Field("full", description="Export scope (full, structure_only)")


class BoardExportResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None


# Board Collaboration Schemas
class BoardShareRequest(BaseModel):
    user_ids: List[int] = Field(..., description="User IDs to share with")
    permission_level: str = Field("view", description="Permission level (view, edit, admin)")
    expires_at: Optional[datetime] = Field(None, description="Share expiration time")
    message: Optional[str] = Field(None, description="Share message")


class BoardShareResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None


# Board Version Control Schemas
class BoardVersionCreate(BaseModel):
    version_name: str = Field(..., description="Version name")
    description: Optional[str] = Field(None, description="Version description")
    changelog: Optional[str] = Field(None, description="What changed in this version")


class BoardVersionResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]
    message: Optional[str] = None


# Board Statistics and Monitoring
class BoardPerformanceMetrics(BaseModel):
    board_id: int
    total_executions: int
    successful_executions: int
    failed_executions: int
    average_execution_time: float
    last_execution: Optional[datetime]


class BoardUsageStats(BaseModel):
    daily_executions: List[Dict[str, Any]]
    popular_nodes: List[Dict[str, Any]]
    error_patterns: List[Dict[str, Any]]
    performance_trends: List[Dict[str, Any]]


# Validation helpers
class BoardValidationRequest(BaseModel):
    validate_connections: Optional[bool] = Field(True, description="Validate node connections")
    validate_data_flow: Optional[bool] = Field(True, description="Validate data flow")
    validate_logic: Optional[bool] = Field(True, description="Validate business logic")


class BoardValidationResponse(BaseModel):
    success: bool = True
    data: Dict[str, Any]
    errors: List[str] = Field(default_factory=list)
    warnings: List[str] = Field(default_factory=list) 
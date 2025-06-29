"""
Workflows API Endpoints - Business Process Automation
Author: Agent Player Development Team
Description: Complete workflow automation system for business processes and agent coordination
"""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any, Union
from datetime import datetime, timedelta
from enum import Enum
import uuid
import json

router = APIRouter(prefix="/workflows", tags=["workflows"])

# ============================================================================
# ENUMS
# ============================================================================

class WorkflowStatus(str, Enum):
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class NodeType(str, Enum):
    START = "start"
    END = "end"
    AGENT_ACTION = "agent_action"
    CONDITION = "condition"
    DELAY = "delay"
    EMAIL = "email"
    WEBHOOK = "webhook"
    DATA_TRANSFORM = "data_transform"
    APPROVAL = "approval"

class TriggerType(str, Enum):
    MANUAL = "manual"
    SCHEDULE = "schedule"
    WEBHOOK = "webhook"
    EMAIL = "email"
    API = "api"
    AGENT_EVENT = "agent_event"

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class WorkflowNode(BaseModel):
    id: str
    type: NodeType
    name: str
    description: Optional[str] = None
    config: Dict[str, Any] = Field(default_factory=dict)
    position: Dict[str, float] = Field(default_factory=dict)  # x, y coordinates
    connections: List[str] = Field(default_factory=list)  # connected node IDs

class WorkflowTrigger(BaseModel):
    type: TriggerType
    config: Dict[str, Any] = Field(default_factory=dict)
    is_enabled: bool = True

class WorkflowCreateRequest(BaseModel):
    name: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: str = Field(default="general")
    triggers: List[WorkflowTrigger] = Field(default_factory=list)
    nodes: List[WorkflowNode] = Field(default_factory=list)
    variables: Dict[str, Any] = Field(default_factory=dict)
    settings: Dict[str, Any] = Field(default_factory=dict)
    is_template: bool = False
    is_public: bool = False

class WorkflowUpdateRequest(BaseModel):
    name: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    category: Optional[str] = None
    triggers: Optional[List[WorkflowTrigger]] = None
    nodes: Optional[List[WorkflowNode]] = None
    variables: Optional[Dict[str, Any]] = None
    settings: Optional[Dict[str, Any]] = None
    is_public: Optional[bool] = None

class WorkflowResponse(BaseModel):
    id: int
    name: str
    description: Optional[str]
    category: str
    status: WorkflowStatus
    owner_id: int
    owner_name: str
    triggers_count: int
    nodes_count: int
    executions_count: int
    success_rate: float
    is_template: bool
    is_public: bool
    created_at: datetime
    updated_at: datetime
    last_execution: Optional[datetime]

class WorkflowExecutionRequest(BaseModel):
    workflow_id: int
    input_data: Dict[str, Any] = Field(default_factory=dict)
    trigger_type: str = "manual"

class ExecutionResponse(BaseModel):
    id: str
    workflow_id: int
    status: str
    input_data: Dict[str, Any]
    output_data: Optional[Dict[str, Any]]
    started_at: datetime
    completed_at: Optional[datetime]
    execution_time: Optional[float]  # seconds
    error_message: Optional[str]
    nodes_executed: List[Dict[str, Any]]

class WorkflowTemplate(BaseModel):
    id: int
    name: str
    description: str
    category: str
    use_case: str
    complexity: str  # simple, medium, complex
    estimated_setup_time: str
    preview_image: Optional[str]
    nodes_count: int
    triggers_count: int
    downloads_count: int
    rating: float
    created_by: str

# ============================================================================
# MOCK DATA
# ============================================================================

def get_mock_workflows() -> List[Dict[str, Any]]:
    """Mock workflows data"""
    return [
        {
            "id": 1,
            "name": "Customer Onboarding",
            "description": "Automated customer onboarding workflow with email sequences",
            "category": "Customer Service",
            "status": WorkflowStatus.ACTIVE,
            "owner_id": 1,
            "owner_name": "Admin User",
            "triggers_count": 2,
            "nodes_count": 8,
            "executions_count": 145,
            "success_rate": 0.94,
            "is_template": False,
            "is_public": False,
            "created_at": datetime.now() - timedelta(days=30),
            "updated_at": datetime.now() - timedelta(days=5),
            "last_execution": datetime.now() - timedelta(hours=2)
        },
        {
            "id": 2,
            "name": "Lead Qualification Process",
            "description": "Automated lead scoring and qualification workflow",
            "category": "Sales",
            "status": WorkflowStatus.ACTIVE,
            "owner_id": 1,
            "owner_name": "Admin User",
            "triggers_count": 1,
            "nodes_count": 12,
            "executions_count": 89,
            "success_rate": 0.87,
            "is_template": False,
            "is_public": True,
            "created_at": datetime.now() - timedelta(days=20),
            "updated_at": datetime.now() - timedelta(days=3),
            "last_execution": datetime.now() - timedelta(minutes=45)
        },
        {
            "id": 3,
            "name": "Incident Response",
            "description": "Automated incident response and escalation workflow",
            "category": "Support",
            "status": WorkflowStatus.PAUSED,
            "owner_id": 1,
            "owner_name": "Admin User",
            "triggers_count": 3,
            "nodes_count": 15,
            "executions_count": 23,
            "success_rate": 0.91,
            "is_template": False,
            "is_public": False,
            "created_at": datetime.now() - timedelta(days=15),
            "updated_at": datetime.now() - timedelta(days=1),
            "last_execution": datetime.now() - timedelta(days=2)
        }
    ]

def get_mock_workflow_templates() -> List[WorkflowTemplate]:
    """Mock workflow templates"""
    return [
        WorkflowTemplate(
            id=1,
            name="Customer Support Ticket Routing",
            description="Automatically route support tickets to appropriate agents",
            category="Customer Service",
            use_case="Ticket Management",
            complexity="simple",
            estimated_setup_time="15 minutes",
            preview_image="/static/templates/ticket-routing.png",
            nodes_count=6,
            triggers_count=2,
            downloads_count=234,
            rating=4.7,
            created_by="Agent Player Team"
        ),
        WorkflowTemplate(
            id=2,
            name="Sales Follow-up Sequence",
            description="Automated follow-up sequence for sales prospects",
            category="Sales",
            use_case="Lead Nurturing",
            complexity="medium",
            estimated_setup_time="30 minutes",
            preview_image="/static/templates/sales-followup.png",
            nodes_count=10,
            triggers_count=1,
            downloads_count=189,
            rating=4.8,
            created_by="SalesAI Pro"
        ),
        WorkflowTemplate(
            id=3,
            name="Multi-Agent Task Coordination",
            description="Coordinate tasks across multiple AI agents",
            category="Automation",
            use_case="Agent Coordination",
            complexity="complex",
            estimated_setup_time="60 minutes",
            preview_image="/static/templates/multi-agent.png",
            nodes_count=18,
            triggers_count=4,
            downloads_count=67,
            rating=4.9,
            created_by="AutoFlow Systems"
        )
    ]

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/templates", response_model=List[WorkflowTemplate])
async def get_workflow_templates(
    category: Optional[str] = None,
    complexity: Optional[str] = None
) -> List[WorkflowTemplate]:
    """
    Get available workflow templates
    """
    try:
        templates = get_mock_workflow_templates()
        # Apply filters
        if category:
            templates = [t for t in templates if t.category == category]
        if complexity:
            templates = [t for t in templates if t.complexity == complexity]
        return templates
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get templates: {str(e)}"
        )

@router.post("/templates/{template_id}/create", response_model=WorkflowResponse)
async def create_from_template(template_id: int) -> WorkflowResponse:
    """
    Create workflow from template
    """
    try:
        templates = get_mock_workflow_templates()
        template = next((t for t in templates if t.id == template_id), None)
        if not template:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        # Create workflow from template
        workflow_id = len(get_mock_workflows()) + 100
        workflow = WorkflowResponse(
            id=workflow_id,
            name=f"{template.name} - Copy",
            description=template.description,
            category=template.category,
            status=WorkflowStatus.DRAFT,
            owner_id=1,
            owner_name="Current User",
            triggers_count=template.triggers_count,
            nodes_count=template.nodes_count,
            executions_count=0,
            success_rate=0.0,
            is_template=False,
            is_public=False,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_execution=None
        )
        return workflow
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create from template: {str(e)}"
        )

@router.get("/analytics", response_model=Dict[str, Any])
async def get_workflow_analytics() -> Dict[str, Any]:
    """
    Get workflow analytics and performance metrics
    """
    try:
        analytics = {
            "total_workflows": 12,
            "active_workflows": 8,
            "total_executions": 1247,
            "successful_executions": 1156,
            "failed_executions": 91,
            "success_rate": 0.927,
            "average_execution_time": 245.6,  # seconds
            "executions_today": 23,
            "executions_this_week": 187,
            "most_used_workflows": [
                {
                    "id": 1,
                    "name": "Customer Onboarding",
                    "executions": 145,
                    "success_rate": 0.94
                },
                {
                    "id": 2,
                    "name": "Lead Qualification Process", 
                    "executions": 89,
                    "success_rate": 0.87
                }
            ],
            "execution_trends": [
                {"date": "2024-01-10", "executions": 18, "success_rate": 0.94},
                {"date": "2024-01-11", "executions": 22, "success_rate": 0.91},
                {"date": "2024-01-12", "executions": 19, "success_rate": 0.95},
                {"date": "2024-01-13", "executions": 25, "success_rate": 0.92},
                {"date": "2024-01-14", "executions": 21, "success_rate": 0.90},
                {"date": "2024-01-15", "executions": 20, "success_rate": 0.93},
                {"date": "2024-01-16", "executions": 23, "success_rate": 0.96}
            ]
        }
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )

@router.get("/", response_model=List[WorkflowResponse])
async def list_workflows(
    skip: int = 0,
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[WorkflowStatus] = None,
    is_public: Optional[bool] = None
) -> List[WorkflowResponse]:
    """
    List user's workflows with filtering and pagination
    """
    try:
        workflows = get_mock_workflows()
        
        # Apply filters
        filtered_workflows = workflows
        
        if search:
            filtered_workflows = [
                w for w in filtered_workflows 
                if search.lower() in w["name"].lower() or search.lower() in w["description"].lower()
            ]
        
        if category:
            filtered_workflows = [w for w in filtered_workflows if w["category"] == category]
        
        if status:
            filtered_workflows = [w for w in filtered_workflows if w["status"] == status]
        
        if is_public is not None:
            filtered_workflows = [w for w in filtered_workflows if w["is_public"] == is_public]
        
        # Apply pagination
        paginated_workflows = filtered_workflows[skip:skip + limit]
        
        return [WorkflowResponse(**workflow) for workflow in paginated_workflows]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list workflows: {str(e)}"
        )

@router.post("/", response_model=WorkflowResponse, status_code=status.HTTP_201_CREATED)
async def create_workflow(request: WorkflowCreateRequest) -> WorkflowResponse:
    """
    Create a new workflow
    """
    try:
        # Create new workflow
        workflow_id = len(get_mock_workflows()) + 1
        
        workflow = WorkflowResponse(
            id=workflow_id,
            name=request.name,
            description=request.description,
            category=request.category,
            status=WorkflowStatus.DRAFT,
            owner_id=1,  # Mock user ID
            owner_name="Current User",
            triggers_count=len(request.triggers),
            nodes_count=len(request.nodes),
            executions_count=0,
            success_rate=0.0,
            is_template=request.is_template,
            is_public=request.is_public,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            last_execution=None
        )
        
        return workflow
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create workflow: {str(e)}"
        )

@router.get("/{workflow_id}", response_model=Dict[str, Any])
async def get_workflow(workflow_id: int) -> Dict[str, Any]:
    """
    Get detailed workflow information
    """
    try:
        workflows = get_mock_workflows()
        workflow = next((w for w in workflows if w["id"] == workflow_id), None)
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found"
            )
        
        # Add detailed workflow data
        detailed_workflow = {
            **workflow,
            "triggers": [
                {
                    "id": "trigger_1",
                    "type": "webhook",
                    "name": "New Customer Registration",
                    "config": {
                        "webhook_url": "/webhooks/customer-registered",
                        "method": "POST"
                    },
                    "is_enabled": True
                },
                {
                    "id": "trigger_2",
                    "type": "schedule",
                    "name": "Daily Check",
                    "config": {
                        "cron": "0 9 * * *",
                        "timezone": "UTC"
                    },
                    "is_enabled": True
                }
            ],
            "nodes": [
                {
                    "id": "start_1",
                    "type": "start",
                    "name": "Start",
                    "description": "Workflow starting point",
                    "config": {},
                    "position": {"x": 100, "y": 100},
                    "connections": ["agent_1"]
                },
                {
                    "id": "agent_1",
                    "type": "agent_action",
                    "name": "Send Welcome Message",
                    "description": "Send personalized welcome message",
                    "config": {
                        "agent_id": 1,
                        "message_template": "Welcome {{customer_name}}! We're excited to have you aboard.",
                        "variables": ["customer_name", "customer_email"]
                    },
                    "position": {"x": 300, "y": 100},
                    "connections": ["delay_1"]
                },
                {
                    "id": "delay_1",
                    "type": "delay",
                    "name": "Wait 1 Hour",
                    "description": "Wait before next action",
                    "config": {
                        "duration": 3600,  # seconds
                        "unit": "seconds"
                    },
                    "position": {"x": 500, "y": 100},
                    "connections": ["email_1"]
                },
                {
                    "id": "email_1",
                    "type": "email",
                    "name": "Send Setup Guide",
                    "description": "Send setup guide email",
                    "config": {
                        "template": "setup_guide",
                        "subject": "Get Started with Agent Player",
                        "variables": ["customer_name"]
                    },
                    "position": {"x": 700, "y": 100},
                    "connections": ["end_1"]
                },
                {
                    "id": "end_1",
                    "type": "end",
                    "name": "End",
                    "description": "Workflow completion",
                    "config": {},
                    "position": {"x": 900, "y": 100},
                    "connections": []
                }
            ],
            "variables": {
                "customer_name": {"type": "string", "required": True},
                "customer_email": {"type": "email", "required": True},
                "customer_plan": {"type": "string", "default": "basic"}
            },
            "settings": {
                "max_execution_time": 3600,
                "retry_on_failure": True,
                "max_retries": 3,
                "notification_email": "admin@example.com"
            },
            "recent_executions": [
                {
                    "id": "exec_123",
                    "status": "completed",
                    "started_at": datetime.now() - timedelta(hours=2),
                    "completed_at": datetime.now() - timedelta(hours=1, minutes=45),
                    "execution_time": 900.0
                },
                {
                    "id": "exec_124",
                    "status": "running",
                    "started_at": datetime.now() - timedelta(minutes=30),
                    "completed_at": None,
                    "execution_time": None
                }
            ]
        }
        
        return detailed_workflow
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get workflow: {str(e)}"
        )

@router.put("/{workflow_id}", response_model=WorkflowResponse)
async def update_workflow(
    workflow_id: int,
    request: WorkflowUpdateRequest
) -> WorkflowResponse:
    """
    Update existing workflow
    """
    try:
        workflows = get_mock_workflows()
        workflow = next((w for w in workflows if w["id"] == workflow_id), None)
        
        if not workflow:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Workflow not found"
            )
        
        # Update workflow
        if request.name:
            workflow["name"] = request.name
        if request.description:
            workflow["description"] = request.description
        if request.category:
            workflow["category"] = request.category
        if request.is_public is not None:
            workflow["is_public"] = request.is_public
        
        workflow["updated_at"] = datetime.now()
        
        return WorkflowResponse(**workflow)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update workflow: {str(e)}"
        )

@router.delete("/{workflow_id}")
async def delete_workflow(workflow_id: int) -> Dict[str, str]:
    """
    Delete workflow
    """
    try:
        return {"message": f"Workflow {workflow_id} deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete workflow: {str(e)}"
        )

@router.post("/{workflow_id}/execute", response_model=ExecutionResponse)
async def execute_workflow(
    workflow_id: int,
    request: WorkflowExecutionRequest
) -> ExecutionResponse:
    """
    Execute workflow manually
    """
    try:
        execution_id = str(uuid.uuid4())
        
        # Mock execution
        execution = ExecutionResponse(
            id=execution_id,
            workflow_id=workflow_id,
            status="running",
            input_data=request.input_data,
            output_data=None,
            started_at=datetime.now(),
            completed_at=None,
            execution_time=None,
            error_message=None,
            nodes_executed=[
                {
                    "node_id": "start_1",
                    "status": "completed",
                    "started_at": datetime.now(),
                    "completed_at": datetime.now() + timedelta(seconds=1)
                }
            ]
        )
        
        return execution
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to execute workflow: {str(e)}"
        )

@router.get("/{workflow_id}/executions", response_model=List[ExecutionResponse])
async def get_workflow_executions(
    workflow_id: int,
    skip: int = 0,
    limit: int = 20,
    status_filter: Optional[str] = None
) -> List[ExecutionResponse]:
    """
    Get workflow execution history
    """
    try:
        # Mock executions
        executions = [
            ExecutionResponse(
                id="exec_123",
                workflow_id=workflow_id,
                status="completed",
                input_data={"customer_name": "John Doe", "customer_email": "john@example.com"},
                output_data={"success": True, "emails_sent": 2},
                started_at=datetime.now() - timedelta(hours=2),
                completed_at=datetime.now() - timedelta(hours=1, minutes=45),
                execution_time=900.0,
                error_message=None,
                nodes_executed=[
                    {
                        "node_id": "start_1",
                        "status": "completed",
                        "execution_time": 0.1
                    },
                    {
                        "node_id": "agent_1",
                        "status": "completed",
                        "execution_time": 2.3
                    }
                ]
            ),
            ExecutionResponse(
                id="exec_124",
                workflow_id=workflow_id,
                status="failed",
                input_data={"customer_name": "Jane Smith", "customer_email": "invalid-email"},
                output_data=None,
                started_at=datetime.now() - timedelta(hours=4),
                completed_at=datetime.now() - timedelta(hours=3, minutes=58),
                execution_time=120.0,
                error_message="Invalid email address format",
                nodes_executed=[
                    {
                        "node_id": "start_1",
                        "status": "completed",
                        "execution_time": 0.1
                    },
                    {
                        "node_id": "agent_1",
                        "status": "failed",
                        "execution_time": 1.2,
                        "error": "Email validation failed"
                    }
                ]
            )
        ]
        
        # Apply status filter
        if status_filter:
            executions = [e for e in executions if e.status == status_filter]
        
        return executions[skip:skip + limit]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get executions: {str(e)}"
        ) 
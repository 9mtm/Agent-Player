"""
Tasks API Endpoints - Task Management and Tracking System
Author: Agent Player Development Team
Description: Complete task management system for AI agents and users
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from pydantic import BaseModel, Field
from typing import Optional, List, Dict, Any
from datetime import datetime, timedelta
from enum import Enum
import uuid

router = APIRouter(tags=["Tasks"])

# ============================================================================
# ENUMS
# ============================================================================

class TaskStatus(str, Enum):
    TODO = "todo"
    IN_PROGRESS = "in_progress"
    UNDER_REVIEW = "under_review"
    COMPLETED = "completed"
    CANCELLED = "cancelled"
    ON_HOLD = "on_hold"

class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"

class TaskType(str, Enum):
    AGENT_TASK = "agent_task"
    USER_TASK = "user_task"
    SYSTEM_TASK = "system_task"
    WORKFLOW_TASK = "workflow_task"

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class TaskCreateRequest(BaseModel):
    title: str = Field(..., min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    type: TaskType = TaskType.USER_TASK
    priority: TaskPriority = TaskPriority.MEDIUM
    assigned_to: Optional[int] = None  # user_id or agent_id
    assigned_type: str = Field(default="user", pattern="^(user|agent)$")
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = Field(None, ge=0, le=1000)
    tags: List[str] = Field(default_factory=list)
    attachments: List[str] = Field(default_factory=list)
    dependencies: List[int] = Field(default_factory=list)  # other task IDs
    project_id: Optional[int] = None
    workflow_id: Optional[int] = None

class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=3, max_length=200)
    description: Optional[str] = Field(None, max_length=2000)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    assigned_to: Optional[int] = None
    assigned_type: Optional[str] = Field(None, pattern="^(user|agent)$")
    due_date: Optional[datetime] = None
    estimated_hours: Optional[float] = Field(None, ge=0, le=1000)
    actual_hours: Optional[float] = Field(None, ge=0, le=1000)
    tags: Optional[List[str]] = None
    progress_percentage: Optional[int] = Field(None, ge=0, le=100)

class TaskResponse(BaseModel):
    id: int
    title: str
    description: Optional[str]
    type: TaskType
    status: TaskStatus
    priority: TaskPriority
    assigned_to: Optional[int]
    assigned_type: str
    assigned_name: Optional[str]
    creator_id: int
    creator_name: str
    due_date: Optional[datetime]
    estimated_hours: Optional[float]
    actual_hours: Optional[float]
    progress_percentage: int
    tags: List[str]
    dependencies: List[int]
    project_id: Optional[int]
    project_name: Optional[str]
    workflow_id: Optional[int]
    workflow_name: Optional[str]
    created_at: datetime
    updated_at: datetime
    completed_at: Optional[datetime]

class CommentCreateRequest(BaseModel):
    content: str = Field(..., min_length=1, max_length=1000)
    is_internal: bool = False

class CommentResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    user_name: str
    content: str
    is_internal: bool
    created_at: datetime
    updated_at: Optional[datetime]

class TaskAssignmentRequest(BaseModel):
    task_id: int
    assigned_to: int  # user_id or agent_id
    assigned_type: str = Field(..., pattern="^(user|agent)$")
    notes: Optional[str] = None

class TaskTimeLogRequest(BaseModel):
    hours: float = Field(..., ge=0.1, le=24)
    description: str = Field(..., min_length=1, max_length=500)
    date: Optional[datetime] = None

class TimeLogResponse(BaseModel):
    id: int
    task_id: int
    user_id: int
    user_name: str
    hours: float
    description: str
    date: datetime
    created_at: datetime

class TaskAnalytics(BaseModel):
    total_tasks: int
    completed_tasks: int
    in_progress_tasks: int
    overdue_tasks: int
    completion_rate: float
    average_completion_time: float  # hours
    tasks_by_priority: Dict[str, int]
    tasks_by_status: Dict[str, int]
    productivity_score: float

# ============================================================================
# MOCK DATA
# ============================================================================

def get_mock_tasks() -> List[Dict[str, Any]]:
    """Mock tasks data"""
    return [
        {
            "id": 1,
            "title": "Setup Customer Service Agent Training",
            "description": "Configure and train the customer service agent with new scenarios",
            "type": TaskType.AGENT_TASK,
            "status": TaskStatus.IN_PROGRESS,
            "priority": TaskPriority.HIGH,
            "assigned_to": 1,
            "assigned_type": "agent",
            "assigned_name": "Customer Service Agent",
            "creator_id": 1,
            "creator_name": "Admin User",
            "due_date": datetime.now() + timedelta(days=3),
            "estimated_hours": 8.0,
            "actual_hours": 4.5,
            "progress_percentage": 60,
            "tags": ["training", "customer-service", "urgent"],
            "dependencies": [],
            "project_id": 1,
            "project_name": "Q1 Agent Improvements",
            "workflow_id": None,
            "workflow_name": None,
            "created_at": datetime.now() - timedelta(days=2),
            "updated_at": datetime.now() - timedelta(hours=1),
            "completed_at": None
        },
        {
            "id": 2,
            "title": "Review Marketplace Submission",
            "description": "Review and approve new agent submission to marketplace",
            "type": TaskType.USER_TASK,
            "status": TaskStatus.TODO,
            "priority": TaskPriority.MEDIUM,
            "assigned_to": 2,
            "assigned_type": "user",
            "assigned_name": "John Manager",
            "creator_id": 1,
            "creator_name": "Admin User",
            "due_date": datetime.now() + timedelta(days=5),
            "estimated_hours": 2.0,
            "actual_hours": None,
            "progress_percentage": 0,
            "tags": ["review", "marketplace"],
            "dependencies": [1],
            "project_id": 2,
            "project_name": "Marketplace Expansion",
            "workflow_id": 1,
            "workflow_name": "Content Review Process",
            "created_at": datetime.now() - timedelta(days=1),
            "updated_at": datetime.now() - timedelta(hours=2),
            "completed_at": None
        },
        {
            "id": 3,
            "title": "Database Optimization",
            "description": "Optimize database queries for better performance",
            "type": TaskType.SYSTEM_TASK,
            "status": TaskStatus.COMPLETED,
            "priority": TaskPriority.LOW,
            "assigned_to": 3,
            "assigned_type": "user",
            "assigned_name": "Dev Team",
            "creator_id": 1,
            "creator_name": "Admin User",
            "due_date": datetime.now() - timedelta(days=1),
            "estimated_hours": 6.0,
            "actual_hours": 5.5,
            "progress_percentage": 100,
            "tags": ["database", "performance", "backend"],
            "dependencies": [],
            "project_id": 3,
            "project_name": "System Improvements",
            "workflow_id": None,
            "workflow_name": None,
            "created_at": datetime.now() - timedelta(days=7),
            "updated_at": datetime.now() - timedelta(days=1),
            "completed_at": datetime.now() - timedelta(days=1)
        }
    ]

def get_mock_comments(task_id: int) -> List[Dict[str, Any]]:
    """Mock task comments"""
    return [
        {
            "id": 1,
            "task_id": task_id,
            "user_id": 1,
            "user_name": "Admin User",
            "content": "Task has been assigned to the customer service team. Please prioritize this.",
            "is_internal": False,
            "created_at": datetime.now() - timedelta(hours=2),
            "updated_at": None
        },
        {
            "id": 2,
            "task_id": task_id,
            "user_id": 2,
            "user_name": "John Manager",
            "content": "Working on this now. Will update progress by end of day.",
            "is_internal": False,
            "created_at": datetime.now() - timedelta(hours=1),
            "updated_at": None
        }
    ]

def get_mock_time_logs(task_id: int) -> List[Dict[str, Any]]:
    """Mock time logs for task"""
    return [
        {
            "id": 1,
            "task_id": task_id,
            "user_id": 1,
            "user_name": "Admin User",
            "hours": 2.5,
            "description": "Initial setup and configuration",
            "date": datetime.now() - timedelta(days=1),
            "created_at": datetime.now() - timedelta(days=1)
        },
        {
            "id": 2,
            "task_id": task_id,
            "user_id": 2,
            "user_name": "John Manager",
            "hours": 2.0,
            "description": "Agent training scenarios development",
            "date": datetime.now(),
            "created_at": datetime.now()
        }
    ]

# ============================================================================
# API ENDPOINTS
# ============================================================================

@router.get("/analytics", response_model=TaskAnalytics)
async def get_task_analytics() -> TaskAnalytics:
    """
    Get task analytics and productivity metrics
    """
    try:
        analytics = TaskAnalytics(
            total_tasks=25,
            completed_tasks=15,
            in_progress_tasks=5,
            overdue_tasks=2,
            completion_rate=0.6,
            average_completion_time=6.2,
            tasks_by_priority={"high": 8, "medium": 10, "low": 7},
            tasks_by_status={"todo": 5, "in_progress": 5, "completed": 15},
            productivity_score=87.5
        )
        return analytics
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get analytics: {str(e)}"
        )

@router.get("/my-tasks", response_model=List[TaskResponse])
async def get_my_tasks(
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None)
) -> List[TaskResponse]:
    """
    Get tasks assigned to the current user
    """
    try:
        tasks = get_mock_tasks()
        # Filter for mock user (id=1)
        my_tasks = [t for t in tasks if t["assigned_to"] == 1 and t["assigned_type"] == "user"]
        if status:
            my_tasks = [t for t in my_tasks if t["status"] == status]
        if priority:
            my_tasks = [t for t in my_tasks if t["priority"] == priority]
        return [TaskResponse(**task) for task in my_tasks]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get my tasks: {str(e)}"
        )

@router.get("/", response_model=List[TaskResponse])
async def list_tasks(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    status: Optional[TaskStatus] = Query(None),
    priority: Optional[TaskPriority] = Query(None),
    assigned_to: Optional[int] = Query(None),
    project_id: Optional[int] = Query(None),
    due_soon: Optional[bool] = Query(None),
    overdue: Optional[bool] = Query(None),
    tags: Optional[str] = Query(None)
) -> List[TaskResponse]:
    """
    List tasks with filtering and pagination
    """
    try:
        tasks = get_mock_tasks()
        
        # Apply filters
        filtered_tasks = tasks
        
        if search:
            filtered_tasks = [
                t for t in filtered_tasks 
                if search.lower() in t["title"].lower() or 
                   (t["description"] and search.lower() in t["description"].lower())
            ]
        
        if status:
            filtered_tasks = [t for t in filtered_tasks if t["status"] == status]
        
        if priority:
            filtered_tasks = [t for t in filtered_tasks if t["priority"] == priority]
        
        if assigned_to:
            filtered_tasks = [t for t in filtered_tasks if t["assigned_to"] == assigned_to]
        
        if project_id:
            filtered_tasks = [t for t in filtered_tasks if t["project_id"] == project_id]
        
        if due_soon:
            due_date_threshold = datetime.now() + timedelta(days=3)
            filtered_tasks = [
                t for t in filtered_tasks 
                if t["due_date"] and t["due_date"] <= due_date_threshold
            ]
        
        if overdue:
            now = datetime.now()
            filtered_tasks = [
                t for t in filtered_tasks 
                if t["due_date"] and t["due_date"] < now and t["status"] != TaskStatus.COMPLETED
            ]
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            filtered_tasks = [
                t for t in filtered_tasks 
                if any(tag in t["tags"] for tag in tag_list)
            ]
        
        # Apply pagination
        paginated_tasks = filtered_tasks[skip:skip + limit]
        
        return [TaskResponse(**task) for task in paginated_tasks]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list tasks: {str(e)}"
        )

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(request: TaskCreateRequest) -> TaskResponse:
    """
    Create a new task
    """
    try:
        task_id = len(get_mock_tasks()) + 1
        
        task = TaskResponse(
            id=task_id,
            title=request.title,
            description=request.description,
            type=request.type,
            status=TaskStatus.TODO,
            priority=request.priority,
            assigned_to=request.assigned_to,
            assigned_type=request.assigned_type,
            assigned_name="Mock Assignee" if request.assigned_to else None,
            creator_id=1,  # Mock current user
            creator_name="Current User",
            due_date=request.due_date,
            estimated_hours=request.estimated_hours,
            actual_hours=None,
            progress_percentage=0,
            tags=request.tags,
            dependencies=request.dependencies,
            project_id=request.project_id,
            project_name="Mock Project" if request.project_id else None,
            workflow_id=request.workflow_id,
            workflow_name="Mock Workflow" if request.workflow_id else None,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            completed_at=None
        )
        
        return task
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create task: {str(e)}"
        )

@router.get("/{task_id}", response_model=Dict[str, Any])
async def get_task(task_id: int) -> Dict[str, Any]:
    """
    Get detailed task information
    """
    try:
        tasks = get_mock_tasks()
        task = next((t for t in tasks if t["id"] == task_id), None)
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Add detailed information
        detailed_task = {
            **task,
            "comments": get_mock_comments(task_id),
            "time_logs": get_mock_time_logs(task_id),
            "history": [
                {
                    "id": 1,
                    "action": "created",
                    "user_name": "Admin User",
                    "timestamp": task["created_at"],
                    "details": "Task created"
                },
                {
                    "id": 2,
                    "action": "status_changed",
                    "user_name": "John Manager",
                    "timestamp": datetime.now() - timedelta(hours=1),
                    "details": "Status changed from TODO to IN_PROGRESS"
                }
            ],
            "attachments": [
                {
                    "id": 1,
                    "filename": "training_scenarios.pdf",
                    "size": 1024576,
                    "uploaded_by": "Admin User",
                    "uploaded_at": datetime.now() - timedelta(hours=3)
                }
            ]
        }
        
        return detailed_task
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get task: {str(e)}"
        )

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(task_id: int, request: TaskUpdateRequest) -> TaskResponse:
    """
    Update existing task
    """
    try:
        tasks = get_mock_tasks()
        task = next((t for t in tasks if t["id"] == task_id), None)
        
        if not task:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Task not found"
            )
        
        # Update task fields
        if request.title:
            task["title"] = request.title
        if request.description is not None:
            task["description"] = request.description
        if request.status:
            task["status"] = request.status
            if request.status == TaskStatus.COMPLETED:
                task["completed_at"] = datetime.now()
                task["progress_percentage"] = 100
        if request.priority:
            task["priority"] = request.priority
        if request.assigned_to is not None:
            task["assigned_to"] = request.assigned_to
        if request.assigned_type:
            task["assigned_type"] = request.assigned_type
        if request.due_date is not None:
            task["due_date"] = request.due_date
        if request.estimated_hours is not None:
            task["estimated_hours"] = request.estimated_hours
        if request.actual_hours is not None:
            task["actual_hours"] = request.actual_hours
        if request.tags is not None:
            task["tags"] = request.tags
        if request.progress_percentage is not None:
            task["progress_percentage"] = request.progress_percentage
        
        task["updated_at"] = datetime.now()
        
        return TaskResponse(**task)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update task: {str(e)}"
        )

@router.delete("/{task_id}")
async def delete_task(task_id: int) -> Dict[str, str]:
    """
    Delete task
    """
    try:
        return {"message": f"Task {task_id} deleted successfully"}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete task: {str(e)}"
        )

@router.post("/{task_id}/comments", response_model=CommentResponse)
async def add_comment(task_id: int, request: CommentCreateRequest) -> CommentResponse:
    """
    Add comment to task
    """
    try:
        comment = CommentResponse(
            id=123,  # Mock ID
            task_id=task_id,
            user_id=1,  # Mock current user
            user_name="Current User",
            content=request.content,
            is_internal=request.is_internal,
            created_at=datetime.now(),
            updated_at=None
        )
        
        return comment
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to add comment: {str(e)}"
        )

@router.get("/{task_id}/comments", response_model=List[CommentResponse])
async def get_task_comments(task_id: int) -> List[CommentResponse]:
    """
    Get task comments
    """
    try:
        comments = get_mock_comments(task_id)
        return [CommentResponse(**comment) for comment in comments]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get comments: {str(e)}"
        )

@router.post("/{task_id}/assign", response_model=Dict[str, Any])
async def assign_task(task_id: int, request: TaskAssignmentRequest) -> Dict[str, Any]:
    """
    Assign task to user or agent
    """
    try:
        return {
            "success": True,
            "message": f"Task {task_id} assigned to {request.assigned_type} {request.assigned_to}",
            "assigned_to": request.assigned_to,
            "assigned_type": request.assigned_type,
            "notification_sent": True
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to assign task: {str(e)}"
        )

@router.post("/{task_id}/time-logs", response_model=TimeLogResponse)
async def log_time(task_id: int, request: TaskTimeLogRequest) -> TimeLogResponse:
    """
    Log time spent on task
    """
    try:
        time_log = TimeLogResponse(
            id=123,  # Mock ID
            task_id=task_id,
            user_id=1,  # Mock current user
            user_name="Current User",
            hours=request.hours,
            description=request.description,
            date=request.date or datetime.now(),
            created_at=datetime.now()
        )
        
        return time_log
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to log time: {str(e)}"
        )

@router.get("/{task_id}/time-logs", response_model=List[TimeLogResponse])
async def get_task_time_logs(task_id: int) -> List[TimeLogResponse]:
    """
    Get task time logs
    """
    try:
        time_logs = get_mock_time_logs(task_id)
        return [TimeLogResponse(**log) for log in time_logs]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get time logs: {str(e)}"
        ) 
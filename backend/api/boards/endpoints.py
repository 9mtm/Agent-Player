"""
Boards API Endpoints
Provides operations for workflow boards and visual programming
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, desc, update
from typing import Optional, List, Dict, Any
import logging
from datetime import datetime
import json

from core.dependencies import get_db, get_current_user
from models.database import User, Board, BoardNode, BoardConnection, BoardExecution
from schemas.boards import (
    BoardCreate,
    BoardUpdate,
    BoardResponse,
    BoardListResponse,
    BoardDetailResponse,
    BoardExecutionRequest,
    BoardExecutionResponse,
    BoardAnalyticsResponse
)

router = APIRouter(prefix="/boards", tags=["Boards"])
logger = logging.getLogger(__name__)

# Board types and categories
BOARD_TYPES = {
    "workflow": "Workflow Board",
    "agent_training": "Agent Training Board", 
    "data_processing": "Data Processing Board",
    "integration": "Integration Board",
    "automation": "Automation Board",
    "custom": "Custom Board"
}

BOARD_STATUS_OPTIONS = {
    "draft": "Draft",
    "active": "Active",
    "paused": "Paused",
    "completed": "Completed",
    "archived": "Archived"
}

@router.get("/", response_model=BoardListResponse)
async def list_boards(
    skip: int = Query(0, ge=0, description="Number of records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Maximum records to return"),
    board_type: Optional[str] = Query(None, description="Filter by board type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    search: Optional[str] = Query(None, description="Search in name or description"),
    is_public: Optional[bool] = Query(None, description="Filter by public boards"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List workflow boards with pagination and filtering
    
    Users see their own boards plus public boards
    """
    try:
        # Build query based on user permissions
        if current_user.role == "admin":
            query = select(Board)
        else:
            # Users see their own boards and public boards
            query = select(Board).where(
                (Board.user_id == current_user.id) | (Board.is_public == True)
            )
        
        # Apply filters
        if board_type and board_type in BOARD_TYPES:
            query = query.where(Board.board_type == board_type)
        
        if status and status in BOARD_STATUS_OPTIONS:
            query = query.where(Board.status == status)
        
        if search:
            search_filter = f"%{search}%"
            query = query.where(
                (Board.name.ilike(search_filter)) |
                (Board.description.ilike(search_filter))
            )
        
        if is_public is not None:
            query = query.where(Board.is_public == is_public)
        
        # Get total count
        total_query = select(func.count()).select_from(query.subquery())
        total_result = await db.execute(total_query)
        total = total_result.scalar()
        
        # Apply pagination and ordering
        query = query.order_by(desc(Board.updated_at))
        query = query.offset(skip).limit(limit)
        
        # Execute query
        result = await db.execute(query)
        boards = result.scalars().all()
        
        # Enhance with node counts and execution stats
        enhanced_boards = []
        for board in boards:
            # Get node count
            node_count_query = select(func.count()).where(BoardNode.board_id == board.id)
            node_result = await db.execute(node_count_query)
            node_count = node_result.scalar()
            
            # Get recent executions count
            execution_count_query = select(func.count()).where(BoardExecution.board_id == board.id)
            execution_result = await db.execute(execution_count_query)
            execution_count = execution_result.scalar()
            
            enhanced_boards.append({
                "id": board.id,
                "name": board.name,
                "description": board.description,
                "board_type": board.board_type,
                "status": board.status,
                "is_public": board.is_public,
                "user_id": board.user_id,
                "node_count": node_count,
                "execution_count": execution_count,
                "created_at": board.created_at,
                "updated_at": board.updated_at
            })
        
        logger.info(f"Listed {len(boards)} boards for user {current_user.id}")
        
        return BoardListResponse(
            success=True,
            data={
                "boards": enhanced_boards,
                "total": total,
                "skip": skip,
                "limit": limit,
                "has_more": (skip + len(boards)) < total,
                "board_types": BOARD_TYPES,
                "status_options": BOARD_STATUS_OPTIONS,
                "filters_applied": {
                    "board_type": board_type,
                    "status": status,
                    "search": search,
                    "is_public": is_public
                }
            }
        )
        
    except Exception as e:
        logger.error(f"Error listing boards: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/", response_model=BoardResponse, status_code=201)
async def create_board(
    board_data: BoardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new workflow board
    """
    try:
        # Validate board type
        if board_data.board_type not in BOARD_TYPES:
            raise HTTPException(status_code=400, detail="Invalid board type")
        
        # Create board
        board = Board(
            name=board_data.name,
            description=board_data.description,
            board_type=board_data.board_type,
            board_data=board_data.board_data or {},
            status="draft",
            is_public=board_data.is_public or False,
            user_id=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(board)
        await db.commit()
        await db.refresh(board)
        
        logger.info(f"Created board {board.id} for user {current_user.id}")
        
        return BoardResponse(
            success=True,
            data=board,
            message="Board created successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error creating board: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{board_id}", response_model=BoardDetailResponse)
async def get_board(
    board_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get detailed board information including nodes and connections
    """
    try:
        # Check board access
        if current_user.role == "admin":
            board_query = select(Board).where(Board.id == board_id)
        else:
            board_query = select(Board).where(
                and_(
                    Board.id == board_id,
                    (Board.user_id == current_user.id) | (Board.is_public == True)
                )
            )
        
        board_result = await db.execute(board_query)
        board = board_result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found or access denied")
        
        # Get board nodes
        nodes_query = select(BoardNode).where(BoardNode.board_id == board_id)
        nodes_result = await db.execute(nodes_query)
        nodes = nodes_result.scalars().all()
        
        # Get board connections
        connections_query = select(BoardConnection).where(BoardConnection.board_id == board_id)
        connections_result = await db.execute(connections_query)
        connections = connections_result.scalars().all()
        
        # Get recent executions
        executions_query = select(BoardExecution).where(
            BoardExecution.board_id == board_id
        ).order_by(desc(BoardExecution.created_at)).limit(10)
        executions_result = await db.execute(executions_query)
        executions = executions_result.scalars().all()
        
        logger.info(f"Retrieved board {board_id} for user {current_user.id}")
        
        return BoardDetailResponse(
            success=True,
            data={
                "board": {
                    "id": board.id,
                    "name": board.name,
                    "description": board.description,
                    "board_type": board.board_type,
                    "board_data": board.board_data,
                    "status": board.status,
                    "is_public": board.is_public,
                    "user_id": board.user_id,
                    "created_at": board.created_at,
                    "updated_at": board.updated_at
                },
                "nodes": [
                    {
                        "id": node.id,
                        "node_type": node.node_type,
                        "position_x": node.position_x,
                        "position_y": node.position_y,
                        "node_data": node.node_data,
                        "is_active": node.is_active
                    } for node in nodes
                ],
                "connections": [
                    {
                        "id": conn.id,
                        "source_node_id": conn.source_node_id,
                        "target_node_id": conn.target_node_id,
                        "connection_type": conn.connection_type,
                        "connection_data": conn.connection_data
                    } for conn in connections
                ],
                "recent_executions": [
                    {
                        "id": exec.id,
                        "status": exec.status,
                        "start_time": exec.start_time,
                        "end_time": exec.end_time,
                        "result": exec.result
                    } for exec in executions
                ],
                "statistics": {
                    "total_nodes": len(nodes),
                    "total_connections": len(connections),
                    "total_executions": len(executions)
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error retrieving board {board_id}: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.put("/{board_id}", response_model=BoardResponse)
async def update_board(
    board_id: int,
    board_data: BoardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update board information and configuration
    """
    try:
        # Check board ownership
        if current_user.role == "admin":
            board_query = select(Board).where(Board.id == board_id)
        else:
            board_query = select(Board).where(
                and_(Board.id == board_id, Board.user_id == current_user.id)
            )
        
        board_result = await db.execute(board_query)
        board = board_result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found or access denied")
        
        # Update board fields
        if board_data.name is not None:
            board.name = board_data.name
        if board_data.description is not None:
            board.description = board_data.description
        if board_data.board_data is not None:
            board.board_data = board_data.board_data
        if board_data.status is not None:
            if board_data.status not in BOARD_STATUS_OPTIONS:
                raise HTTPException(status_code=400, detail="Invalid status")
            board.status = board_data.status
        if board_data.is_public is not None:
            board.is_public = board_data.is_public
        
        board.updated_at = datetime.utcnow()
        
        await db.commit()
        await db.refresh(board)
        
        logger.info(f"Updated board {board_id} by user {current_user.id}")
        
        return BoardResponse(
            success=True,
            data=board,
            message="Board updated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error updating board {board_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.delete("/{board_id}")
async def delete_board(
    board_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete board and all related data
    """
    try:
        # Check board ownership
        if current_user.role == "admin":
            board_query = select(Board).where(Board.id == board_id)
        else:
            board_query = select(Board).where(
                and_(Board.id == board_id, Board.user_id == current_user.id)
            )
        
        board_result = await db.execute(board_query)
        board = board_result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found or access denied")
        
        # Delete related data first (foreign key constraints)
        # Delete executions
        await db.execute(
            "DELETE FROM board_executions WHERE board_id = ?", (board_id,)
        )
        
        # Delete connections
        await db.execute(
            "DELETE FROM board_connections WHERE board_id = ?", (board_id,)
        )
        
        # Delete nodes
        await db.execute(
            "DELETE FROM board_nodes WHERE board_id = ?", (board_id,)
        )
        
        # Delete board
        await db.delete(board)
        await db.commit()
        
        logger.info(f"Deleted board {board_id} by user {current_user.id}")
        
        return {
            "success": True,
            "message": "Board deleted successfully"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error deleting board {board_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.post("/{board_id}/execute", response_model=BoardExecutionResponse)
async def execute_board(
    board_id: int,
    execution_data: BoardExecutionRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Execute a workflow board
    """
    try:
        # Check board access
        if current_user.role == "admin":
            board_query = select(Board).where(Board.id == board_id)
        else:
            board_query = select(Board).where(
                and_(
                    Board.id == board_id,
                    (Board.user_id == current_user.id) | (Board.is_public == True)
                )
            )
        
        board_result = await db.execute(board_query)
        board = board_result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found or access denied")
        
        if board.status != "active":
            raise HTTPException(status_code=400, detail="Board must be active to execute")
        
        # Create execution record
        execution = BoardExecution(
            board_id=board_id,
            user_id=current_user.id,
            status="running",
            start_time=datetime.utcnow(),
            input_data=execution_data.input_data or {},
            created_at=datetime.utcnow()
        )
        
        db.add(execution)
        await db.commit()
        await db.refresh(execution)
        
        # TODO: Implement actual board execution logic here
        # This would involve:
        # 1. Loading board nodes and connections
        # 2. Creating execution graph
        # 3. Running nodes in proper order
        # 4. Handling data flow between nodes
        # 5. Managing execution state
        
        # For now, simulate execution
        execution.status = "completed"
        execution.end_time = datetime.utcnow()
        execution.result = {
            "success": True,
            "output": "Board execution completed successfully",
            "execution_time": 1.5,
            "nodes_executed": 5
        }
        
        await db.commit()
        await db.refresh(execution)
        
        logger.info(f"Executed board {board_id} by user {current_user.id}")
        
        return BoardExecutionResponse(
            success=True,
            data={
                "execution_id": execution.id,
                "board_id": board_id,
                "status": execution.status,
                "start_time": execution.start_time,
                "end_time": execution.end_time,
                "result": execution.result,
                "input_data": execution.input_data
            },
            message="Board execution completed"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error executing board {board_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/{board_id}/analytics", response_model=BoardAnalyticsResponse)
async def get_board_analytics(
    board_id: int,
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get board analytics and usage statistics
    """
    try:
        # Check board access
        if current_user.role == "admin":
            board_query = select(Board).where(Board.id == board_id)
        else:
            board_query = select(Board).where(
                and_(
                    Board.id == board_id,
                    (Board.user_id == current_user.id) | (Board.is_public == True)
                )
            )
        
        board_result = await db.execute(board_query)
        board = board_result.scalar_one_or_none()
        
        if not board:
            raise HTTPException(status_code=404, detail="Board not found or access denied")
        
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        # Get execution statistics
        executions_query = select(BoardExecution).where(
            and_(
                BoardExecution.board_id == board_id,
                BoardExecution.created_at >= cutoff_date
            )
        )
        executions_result = await db.execute(executions_query)
        executions = executions_result.scalars().all()
        
        # Calculate analytics
        total_executions = len(executions)
        successful_executions = len([e for e in executions if e.status == "completed"])
        failed_executions = len([e for e in executions if e.status == "failed"])
        
        success_rate = (successful_executions / total_executions * 100) if total_executions > 0 else 0
        
        # Calculate average execution time
        completed_executions = [e for e in executions if e.status == "completed" and e.end_time]
        avg_execution_time = 0
        if completed_executions:
            total_time = sum([
                (e.end_time - e.start_time).total_seconds() 
                for e in completed_executions
            ])
            avg_execution_time = total_time / len(completed_executions)
        
        # Daily execution trend
        daily_executions = {}
        for execution in executions:
            date_key = execution.created_at.date().isoformat()
            daily_executions[date_key] = daily_executions.get(date_key, 0) + 1
        
        logger.info(f"Generated board analytics for board {board_id}")
        
        return BoardAnalyticsResponse(
            success=True,
            data={
                "board_id": board_id,
                "analysis_period_days": days,
                "total_executions": total_executions,
                "successful_executions": successful_executions,
                "failed_executions": failed_executions,
                "success_rate": round(success_rate, 2),
                "average_execution_time": round(avg_execution_time, 2),
                "daily_executions": [
                    {"date": date, "count": count}
                    for date, count in sorted(daily_executions.items())
                ],
                "board_info": {
                    "name": board.name,
                    "type": board.board_type,
                    "status": board.status,
                    "created_at": board.created_at,
                    "updated_at": board.updated_at
                }
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error generating board analytics: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")


@router.get("/types/list")
async def get_board_types(
    current_user: User = Depends(get_current_user)
):
    """
    Get available board types and status options
    """
    return {
        "success": True,
        "data": {
            "board_types": BOARD_TYPES,
            "status_options": BOARD_STATUS_OPTIONS,
            "default_type": "workflow",
            "default_status": "draft"
        }
    }


@router.post("/{board_id}/duplicate", response_model=BoardResponse, status_code=201)
async def duplicate_board(
    board_id: int,
    new_name: str = Query(..., description="Name for duplicated board"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Duplicate an existing board with all nodes and connections
    """
    try:
        # Check board access
        if current_user.role == "admin":
            board_query = select(Board).where(Board.id == board_id)
        else:
            board_query = select(Board).where(
                and_(
                    Board.id == board_id,
                    (Board.user_id == current_user.id) | (Board.is_public == True)
                )
            )
        
        board_result = await db.execute(board_query)
        original_board = board_result.scalar_one_or_none()
        
        if not original_board:
            raise HTTPException(status_code=404, detail="Board not found or access denied")
        
        # Create new board
        new_board = Board(
            name=new_name,
            description=f"Copy of {original_board.description}",
            board_type=original_board.board_type,
            board_data=original_board.board_data,
            status="draft",
            is_public=False,  # Duplicated boards are private by default
            user_id=current_user.id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        db.add(new_board)
        await db.commit()
        await db.refresh(new_board)
        
        # Copy nodes
        nodes_query = select(BoardNode).where(BoardNode.board_id == board_id)
        nodes_result = await db.execute(nodes_query)
        original_nodes = nodes_result.scalars().all()
        
        node_id_mapping = {}
        for original_node in original_nodes:
            new_node = BoardNode(
                board_id=new_board.id,
                node_type=original_node.node_type,
                position_x=original_node.position_x,
                position_y=original_node.position_y,
                node_data=original_node.node_data,
                is_active=original_node.is_active,
                created_at=datetime.utcnow()
            )
            db.add(new_node)
            await db.commit()
            await db.refresh(new_node)
            node_id_mapping[original_node.id] = new_node.id
        
        # Copy connections
        connections_query = select(BoardConnection).where(BoardConnection.board_id == board_id)
        connections_result = await db.execute(connections_query)
        original_connections = connections_result.scalars().all()
        
        for original_conn in original_connections:
            new_connection = BoardConnection(
                board_id=new_board.id,
                source_node_id=node_id_mapping[original_conn.source_node_id],
                target_node_id=node_id_mapping[original_conn.target_node_id],
                connection_type=original_conn.connection_type,
                connection_data=original_conn.connection_data,
                created_at=datetime.utcnow()
            )
            db.add(new_connection)
        
        await db.commit()
        
        logger.info(f"Duplicated board {board_id} to {new_board.id} by user {current_user.id}")
        
        return BoardResponse(
            success=True,
            data=new_board,
            message="Board duplicated successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error duplicating board {board_id}: {e}")
        await db.rollback()
        raise HTTPException(status_code=500, detail="Internal server error") 
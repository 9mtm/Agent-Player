"""
Board/Workflow API Endpoints
RESTful API for board operations
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import JSONResponse
from sqlalchemy.ext.asyncio import AsyncSession

from config.database import get_db
from core.dependencies import get_current_user
from models import User
from services.board_service import BoardService
from schemas.board import (
    BoardCreate, BoardUpdate, BoardResponse, BoardListResponse,
    BoardNodeCreate, BoardNodeUpdate, BoardNodeResponse,
    BoardConnectionCreate, BoardConnectionUpdate, BoardConnectionResponse,
    BoardSearchRequest, BoardsListResponse, BoardExecutionCreate, BoardExecutionResponse,
    BoardTemplateResponse, BoardBulkCreateRequest, BoardBulkUpdateRequest,
    SuccessResponse, ErrorResponse
)

router = APIRouter()

# Board CRUD Operations
@router.get("/boards", response_model=BoardsListResponse)
async def list_boards(
    query: Optional[str] = Query(None, description="Search query"),
    board_type: Optional[str] = Query(None, description="Board type filter"),
    status: Optional[str] = Query(None, description="Status filter"),
    visibility: Optional[str] = Query(None, description="Visibility filter"),
    agent_id: Optional[int] = Query(None, description="Agent ID filter"),
    skip: int = Query(0, ge=0, description="Records to skip"),
    limit: int = Query(20, ge=1, le=100, description="Records to return"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", regex="^(asc|desc)$", description="Sort order"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List user boards with search and filtering"""
    try:
        service = BoardService(db)
        
        search_params = BoardSearchRequest(
            query=query,
            board_type=board_type,
            status=status,
            visibility=visibility,
            agent_id=agent_id,
            skip=skip,
            limit=limit,
            sort_by=sort_by,
            sort_order=sort_order
        )
        
        boards, total = await service.list_boards(current_user.id, search_params)
        
        # Convert to list response format
        board_list = []
        for board in boards:
            board_item = BoardListResponse(
                id=board.id,
                name=board.name,
                description=board.description,
                board_type=board.board_type,
                status=board.status,
                visibility=board.visibility,
                user_id=board.user_id,
                agent_id=board.agent_id,
                execution_count=board.execution_count,
                last_execution=board.last_execution,
                created_at=board.created_at,
                updated_at=board.updated_at,
                node_count=len(board.nodes) if board.nodes else 0,
                connection_count=len(board.connections) if board.connections else 0
            )
            board_list.append(board_item)
        
        pages = (total + limit - 1) // limit
        current_page = (skip // limit) + 1
        has_next = current_page < pages
        
        return BoardsListResponse(
            boards=board_list,
            total=total,
            page=current_page,
            pages=pages,
            has_next=has_next
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list boards: {str(e)}"
        )

@router.post("/boards", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board(
    board_data: BoardCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new board"""
    try:
        service = BoardService(db)
        board = await service.create_board(board_data, current_user.id)
        
        return BoardResponse.from_orm(board)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create board: {str(e)}"
        )

@router.get("/boards/{board_id}", response_model=BoardResponse)
async def get_board(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get board by ID"""
    try:
        service = BoardService(db)
        board = await service.get_board(board_id, current_user.id)
        
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found"
            )
        
        return BoardResponse.from_orm(board)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get board: {str(e)}"
        )

@router.put("/boards/{board_id}", response_model=BoardResponse)
async def update_board(
    board_id: str,
    board_data: BoardUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update board"""
    try:
        service = BoardService(db)
        board = await service.update_board(board_id, board_data, current_user.id)
        
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found or access denied"
            )
        
        return BoardResponse.from_orm(board)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update board: {str(e)}"
        )

@router.delete("/boards/{board_id}", response_model=SuccessResponse)
async def delete_board(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete board"""
    try:
        service = BoardService(db)
        success = await service.delete_board(board_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found or access denied"
            )
        
        return SuccessResponse(message="Board deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete board: {str(e)}"
        )

# Node Operations
@router.post("/boards/{board_id}/nodes", response_model=BoardNodeResponse, status_code=status.HTTP_201_CREATED)
async def create_node(
    board_id: str,
    node_data: BoardNodeCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a node in board"""
    try:
        service = BoardService(db)
        node = await service.create_node(board_id, node_data, current_user.id)
        
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found or access denied"
            )
        
        return BoardNodeResponse.from_orm(node)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create node: {str(e)}"
        )

@router.put("/boards/{board_id}/nodes/{node_id}", response_model=BoardNodeResponse)
async def update_node(
    board_id: str,
    node_id: str,
    node_data: BoardNodeUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update node"""
    try:
        service = BoardService(db)
        node = await service.update_node(node_id, node_data, current_user.id)
        
        if not node:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found or access denied"
            )
        
        return BoardNodeResponse.from_orm(node)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to update node: {str(e)}"
        )

@router.delete("/boards/{board_id}/nodes/{node_id}", response_model=SuccessResponse)
async def delete_node(
    board_id: str,
    node_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete node"""
    try:
        service = BoardService(db)
        success = await service.delete_node(node_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Node not found or access denied"
            )
        
        return SuccessResponse(message="Node deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete node: {str(e)}"
        )

# Connection Operations
@router.post("/boards/{board_id}/connections", response_model=BoardConnectionResponse, status_code=status.HTTP_201_CREATED)
async def create_connection(
    board_id: str,
    connection_data: BoardConnectionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create connection between nodes"""
    try:
        service = BoardService(db)
        connection = await service.create_connection(board_id, connection_data, current_user.id)
        
        if not connection:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Failed to create connection - invalid nodes or connection already exists"
            )
        
        return BoardConnectionResponse.from_orm(connection)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create connection: {str(e)}"
        )

@router.delete("/boards/{board_id}/connections/{connection_id}", response_model=SuccessResponse)
async def delete_connection(
    board_id: str,
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete connection"""
    try:
        service = BoardService(db)
        success = await service.delete_connection(connection_id, current_user.id)
        
        if not success:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Connection not found or access denied"
            )
        
        return SuccessResponse(message="Connection deleted successfully")
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete connection: {str(e)}"
        )

# Bulk Operations
@router.post("/boards/bulk", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def bulk_create_board(
    bulk_data: BoardBulkCreateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk create board with nodes and connections"""
    try:
        service = BoardService(db)
        
        # Create board first
        board = await service.create_board(bulk_data.board, current_user.id)
        
        # Create nodes
        created_nodes = {}
        for node_data in bulk_data.nodes:
            node = await service.create_node(board.id, node_data, current_user.id)
            if node:
                # Map old temporary ID to new UUID
                created_nodes[f"temp_{len(created_nodes)}"] = node.id
        
        # Create connections with updated node IDs
        for connection_data in bulk_data.connections:
            # Update node IDs if they reference temporary IDs
            source_id = created_nodes.get(connection_data.source_node_id, connection_data.source_node_id)
            target_id = created_nodes.get(connection_data.target_node_id, connection_data.target_node_id)
            
            connection_data.source_node_id = source_id
            connection_data.target_node_id = target_id
            
            await service.create_connection(board.id, connection_data, current_user.id)
        
        # Refresh board to get all created data
        board = await service.get_board(board.id, current_user.id)
        
        return BoardResponse.from_orm(board)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to bulk create board: {str(e)}"
        )

@router.put("/boards/{board_id}/bulk", response_model=BoardResponse)
async def bulk_update_board(
    board_id: str,
    bulk_data: BoardBulkUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Bulk update board, nodes, and connections"""
    try:
        service = BoardService(db)
        board = await service.bulk_update_board(
            board_id, bulk_data.board, bulk_data.nodes, bulk_data.connections, current_user.id
        )
        
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found or access denied"
            )
        
        return BoardResponse.from_orm(board)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to bulk update board: {str(e)}"
        )

# Board Execution
@router.post("/boards/{board_id}/execute", response_model=BoardExecutionResponse, status_code=status.HTTP_201_CREATED)
async def execute_board(
    board_id: str,
    execution_data: BoardExecutionCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Execute board workflow"""
    try:
        service = BoardService(db)
        execution = await service.execute_board(board_id, execution_data, current_user.id)
        
        if not execution:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Board not found or not executable"
            )
        
        return BoardExecutionResponse.from_orm(execution)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to execute board: {str(e)}"
        )

# Board Templates
@router.get("/templates", response_model=List[BoardTemplateResponse])
async def list_templates(
    category: Optional[str] = Query(None, description="Template category"),
    featured: Optional[bool] = Query(None, description="Featured templates only"),
    db: AsyncSession = Depends(get_db)
):
    """List available board templates"""
    try:
        service = BoardService(db)
        templates = await service.get_templates(category=category, is_featured=featured)
        
        return [BoardTemplateResponse.from_orm(template) for template in templates]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list templates: {str(e)}"
        )

@router.post("/templates/{template_id}/create-board", response_model=BoardResponse, status_code=status.HTTP_201_CREATED)
async def create_board_from_template(
    template_id: str,
    board_name: str = Query(..., description="Name for the new board"),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create board from template"""
    try:
        service = BoardService(db)
        board = await service.create_board_from_template(template_id, board_name, current_user.id)
        
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Template not found"
            )
        
        return BoardResponse.from_orm(board)
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create board from template: {str(e)}"
        )

# Health check
@router.get("/health")
async def health_check():
    """Workflow API health check"""
    return {"status": "healthy", "service": "workflows"}

# Statistics
@router.get("/boards/{board_id}/stats")
async def get_board_stats(
    board_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get board statistics"""
    try:
        service = BoardService(db)
        board = await service.get_board(board_id, current_user.id)
        
        if not board:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Board not found"
            )
        
        stats = {
            "board_id": board.id,
            "node_count": len(board.nodes) if board.nodes else 0,
            "connection_count": len(board.connections) if board.connections else 0,
            "execution_count": board.execution_count,
            "last_execution": board.last_execution,
            "created_at": board.created_at,
            "updated_at": board.updated_at,
            "node_types": {},
            "connection_types": {}
        }
        
        # Count node types
        if board.nodes:
            for node in board.nodes:
                node_type = node.node_type
                stats["node_types"][node_type] = stats["node_types"].get(node_type, 0) + 1
        
        # Count connection types
        if board.connections:
            for connection in board.connections:
                conn_type = connection.connection_type
                stats["connection_types"][conn_type] = stats["connection_types"].get(conn_type, 0) + 1
        
        return {"success": True, "data": stats}
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get board stats: {str(e)}"
        ) 
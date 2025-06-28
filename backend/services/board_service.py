"""
Board Service
Business logic for board operations
"""

import uuid
from typing import List, Optional, Dict, Any, Tuple
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, and_, or_, func, desc, asc
from sqlalchemy.orm import selectinload

from models import Board, BoardNode, BoardConnection, BoardExecution, BoardTemplate
from schemas.board import (
    BoardCreate, BoardUpdate, BoardResponse, BoardListResponse,
    BoardNodeCreate, BoardNodeUpdate, BoardConnectionCreate, BoardConnectionUpdate,
    BoardSearchRequest, BoardExecutionCreate
)
from config.database import get_db

class BoardService:
    """Service for board operations"""
    
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_board(self, board_data: BoardCreate, user_id: int) -> Board:
        """Create a new board"""
        board_id = str(uuid.uuid4())
        
        board = Board(
            id=board_id,
            user_id=user_id,
            **board_data.dict()
        )
        
        self.db.add(board)
        await self.db.commit()
        await self.db.refresh(board)
        
        # Load relationships explicitly for Pydantic compatibility
        query = select(Board).options(
            selectinload(Board.nodes),
            selectinload(Board.connections)
        ).where(Board.id == board_id)
        
        result = await self.db.execute(query)
        board_with_relations = result.scalar_one()
        
        return board_with_relations

    async def get_board(self, board_id: str, user_id: int) -> Optional[Board]:
        """Get board by ID with user validation"""
        query = select(Board).options(
            selectinload(Board.nodes),
            selectinload(Board.connections)
        ).where(
            and_(
                Board.id == board_id,
                or_(
                    Board.user_id == user_id,
                    Board.visibility == "public",
                    and_(Board.visibility == "shared", Board.user_id == user_id)
                )
            )
        )
        
        result = await self.db.execute(query)
        return result.scalar_one_or_none()

    async def update_board(self, board_id: str, board_data: BoardUpdate, user_id: int) -> Optional[Board]:
        """Update board"""
        board = await self.get_board(board_id, user_id)
        if not board:
            return None
        
        # Check ownership for updates
        if board.user_id != user_id:
            return None
        
        # Update fields
        update_data = board_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(board, field, value)
        
        board.updated_at = datetime.utcnow()
        await self.db.commit()
        
        # Load relationships explicitly for Pydantic compatibility
        query = select(Board).options(
            selectinload(Board.nodes),
            selectinload(Board.connections)
        ).where(Board.id == board_id)
        
        result = await self.db.execute(query)
        board_with_relations = result.scalar_one()
        
        return board_with_relations

    async def delete_board(self, board_id: str, user_id: int) -> bool:
        """Delete board and all related data"""
        board = await self.get_board(board_id, user_id)
        if not board or board.user_id != user_id:
            return False
        
        # Delete board (cascades to nodes and connections)
        await self.db.delete(board)
        await self.db.commit()
        
        return True

    async def list_boards(self, user_id: int, search_params: BoardSearchRequest) -> Tuple[List[Board], int]:
        """List boards with search and pagination"""
        query = select(Board).options(
            selectinload(Board.nodes),
            selectinload(Board.connections)
        )
        
        # Build filters
        filters = [
            or_(
                Board.user_id == user_id,
                Board.visibility == "public",
                and_(Board.visibility == "shared", Board.user_id == user_id)
            )
        ]
        
        if search_params.query:
            search_term = f"%{search_params.query}%"
            filters.append(
                or_(
                    Board.name.ilike(search_term),
                    Board.description.ilike(search_term)
                )
            )
        
        if search_params.board_type:
            filters.append(Board.board_type == search_params.board_type)
        
        if search_params.status:
            filters.append(Board.status == search_params.status)
        
        if search_params.visibility:
            filters.append(Board.visibility == search_params.visibility)
        
        if search_params.agent_id:
            filters.append(Board.agent_id == search_params.agent_id)
        
        # Apply filters
        query = query.where(and_(*filters))
        
        # Count total
        count_query = select(func.count(Board.id)).where(and_(*filters))
        total_result = await self.db.execute(count_query)
        total = total_result.scalar()
        
        # Apply sorting
        sort_field = getattr(Board, search_params.sort_by, Board.created_at)
        if search_params.sort_order == "desc":
            query = query.order_by(desc(sort_field))
        else:
            query = query.order_by(asc(sort_field))
        
        # Apply pagination
        query = query.offset(search_params.skip).limit(search_params.limit)
        
        result = await self.db.execute(query)
        boards = result.scalars().all()
        
        return list(boards), total

    # Node operations
    async def create_node(self, board_id: str, node_data: BoardNodeCreate, user_id: int) -> Optional[BoardNode]:
        """Create a node in board"""
        board = await self.get_board(board_id, user_id)
        if not board or board.user_id != user_id:
            return None
        
        node_id = str(uuid.uuid4())
        node = BoardNode(
            id=node_id,
            board_id=board_id,
            **node_data.dict()
        )
        
        self.db.add(node)
        await self.db.commit()
        await self.db.refresh(node)
        
        return node

    async def update_node(self, node_id: str, node_data: BoardNodeUpdate, user_id: int) -> Optional[BoardNode]:
        """Update node"""
        query = select(BoardNode).join(Board).where(
            and_(
                BoardNode.id == node_id,
                Board.user_id == user_id
            )
        )
        
        result = await self.db.execute(query)
        node = result.scalar_one_or_none()
        
        if not node:
            return None
        
        # Update fields
        update_data = node_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(node, field, value)
        
        node.updated_at = datetime.utcnow()
        await self.db.commit()
        await self.db.refresh(node)
        
        return node

    async def delete_node(self, node_id: str, user_id: int) -> bool:
        """Delete node and its connections"""
        query = select(BoardNode).join(Board).where(
            and_(
                BoardNode.id == node_id,
                Board.user_id == user_id
            )
        )
        
        result = await self.db.execute(query)
        node = result.scalar_one_or_none()
        
        if not node:
            return False
        
        # Delete connections involving this node
        await self.db.execute(
            delete(BoardConnection).where(
                or_(
                    BoardConnection.source_node_id == node_id,
                    BoardConnection.target_node_id == node_id
                )
            )
        )
        
        # Delete node
        await self.db.delete(node)
        await self.db.commit()
        
        return True

    # Connection operations
    async def create_connection(self, board_id: str, connection_data: BoardConnectionCreate, user_id: int) -> Optional[BoardConnection]:
        """Create connection between nodes"""
        board = await self.get_board(board_id, user_id)
        if not board or board.user_id != user_id:
            return None
        
        # Validate nodes exist and belong to the board
        nodes_query = select(BoardNode).where(
            and_(
                BoardNode.board_id == board_id,
                or_(
                    BoardNode.id == connection_data.source_node_id,
                    BoardNode.id == connection_data.target_node_id
                )
            )
        )
        
        nodes_result = await self.db.execute(nodes_query)
        nodes = nodes_result.scalars().all()
        
        node_ids = {node.id for node in nodes}
        if not (connection_data.source_node_id in node_ids and connection_data.target_node_id in node_ids):
            return None
        
        # Check for existing connection
        existing_query = select(BoardConnection).where(
            and_(
                BoardConnection.board_id == board_id,
                BoardConnection.source_node_id == connection_data.source_node_id,
                BoardConnection.target_node_id == connection_data.target_node_id
            )
        )
        
        existing_result = await self.db.execute(existing_query)
        if existing_result.scalar_one_or_none():
            return None  # Connection already exists
        
        connection_id = str(uuid.uuid4())
        connection = BoardConnection(
            id=connection_id,
            board_id=board_id,
            **connection_data.dict()
        )
        
        self.db.add(connection)
        await self.db.commit()
        await self.db.refresh(connection)
        
        return connection

    async def delete_connection(self, connection_id: str, user_id: int) -> bool:
        """Delete connection"""
        query = select(BoardConnection).join(Board).where(
            and_(
                BoardConnection.id == connection_id,
                Board.user_id == user_id
            )
        )
        
        result = await self.db.execute(query)
        connection = result.scalar_one_or_none()
        
        if not connection:
            return False
        
        await self.db.delete(connection)
        await self.db.commit()
        
        return True

    # Bulk operations
    async def bulk_update_board(self, board_id: str, board_data: BoardUpdate, 
                               nodes: Optional[List[BoardNodeUpdate]], 
                               connections: Optional[List[BoardConnectionUpdate]], 
                               user_id: int) -> Optional[Board]:
        """Bulk update board, nodes, and connections"""
        board = await self.get_board(board_id, user_id)
        if not board or board.user_id != user_id:
            return None
        
        # Update board
        if board_data:
            update_data = board_data.dict(exclude_unset=True)
            for field, value in update_data.items():
                setattr(board, field, value)
            board.updated_at = datetime.utcnow()
        
        # Update nodes
        if nodes:
            for node_update in nodes:
                if hasattr(node_update, 'id') and node_update.id:
                    node_query = select(BoardNode).where(
                        and_(
                            BoardNode.id == node_update.id,
                            BoardNode.board_id == board_id
                        )
                    )
                    node_result = await self.db.execute(node_query)
                    node = node_result.scalar_one_or_none()
                    
                    if node:
                        update_data = node_update.dict(exclude_unset=True, exclude={'id'})
                        for field, value in update_data.items():
                            setattr(node, field, value)
                        node.updated_at = datetime.utcnow()
        
        # Update connections
        if connections:
            for conn_update in connections:
                if hasattr(conn_update, 'id') and conn_update.id:
                    conn_query = select(BoardConnection).where(
                        and_(
                            BoardConnection.id == conn_update.id,
                            BoardConnection.board_id == board_id
                        )
                    )
                    conn_result = await self.db.execute(conn_query)
                    connection = conn_result.scalar_one_or_none()
                    
                    if connection:
                        update_data = conn_update.dict(exclude_unset=True, exclude={'id'})
                        for field, value in update_data.items():
                            setattr(connection, field, value)
                        connection.updated_at = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(board)
        
        return board

    # Board execution
    async def execute_board(self, board_id: str, execution_data: BoardExecutionCreate, user_id: int) -> Optional[BoardExecution]:
        """Execute board workflow"""
        board = await self.get_board(board_id, user_id)
        if not board:
            return None
        
        if not board.is_executable:
            return None
        
        execution_id = str(uuid.uuid4())
        execution = BoardExecution(
            id=execution_id,
            board_id=board_id,
            user_id=user_id,
            status="running",
            total_nodes=len(board.nodes),
            updated_at=datetime.utcnow(),
            **execution_data.dict()
        )
        
        self.db.add(execution)
        
        # Update board execution count
        board.execution_count += 1
        board.last_execution = datetime.utcnow()
        
        await self.db.commit()
        await self.db.refresh(execution)
        
        # TODO: Implement actual workflow execution logic here
        # For now, just mark as completed
        execution.status = "completed"
        execution.completed_nodes = execution.total_nodes
        execution.completed_at = datetime.utcnow()
        execution.execution_time_ms = 1000  # Mock execution time
        execution.updated_at = datetime.utcnow()
        
        await self.db.commit()
        
        return execution

    # Template operations
    async def get_templates(self, category: Optional[str] = None, is_featured: Optional[bool] = None) -> List[BoardTemplate]:
        """Get board templates"""
        query = select(BoardTemplate).where(BoardTemplate.is_public == True)
        
        if category:
            query = query.where(BoardTemplate.category == category)
        
        if is_featured is not None:
            query = query.where(BoardTemplate.is_featured == is_featured)
        
        query = query.order_by(desc(BoardTemplate.usage_count), desc(BoardTemplate.rating))
        
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def create_board_from_template(self, template_id: str, board_name: str, user_id: int) -> Optional[Board]:
        """Create board from template"""
        template_query = select(BoardTemplate).where(BoardTemplate.id == template_id)
        template_result = await self.db.execute(template_query)
        template = template_result.scalar_one_or_none()
        
        if not template:
            return None
        
        # Create board from template data
        template_data = template.template_data
        board_id = str(uuid.uuid4())
        
        board = Board(
            id=board_id,
            name=board_name,
            description=template.description,
            user_id=user_id,
            board_type=template_data.get("board_type", "workflow"),
            status="draft",
            visibility="private",
            zoom_level=template_data.get("zoom_level", 1.0),
            pan_x=template_data.get("pan_x", 0.0),
            pan_y=template_data.get("pan_y", 0.0),
            connection_type=template_data.get("connection_type", "curved"),
            theme=template_data.get("theme", "light"),
            board_data=template_data.get("board_data", {}),
            settings=template_data.get("settings", {}),
            is_executable=template_data.get("is_executable", False)
        )
        
        self.db.add(board)
        
        # Create nodes from template
        if "nodes" in template_data:
            for node_data in template_data["nodes"]:
                node_id = str(uuid.uuid4())
                node = BoardNode(
                    id=node_id,
                    board_id=board_id,
                    **node_data
                )
                self.db.add(node)
        
        # Create connections from template
        if "connections" in template_data:
            for conn_data in template_data["connections"]:
                connection_id = str(uuid.uuid4())
                connection = BoardConnection(
                    id=connection_id,
                    board_id=board_id,
                    **conn_data
                )
                self.db.add(connection)
        
        # Update template usage
        template.usage_count += 1
        
        await self.db.commit()
        await self.db.refresh(board)
        
        return board 
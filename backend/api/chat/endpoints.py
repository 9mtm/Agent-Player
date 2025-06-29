"""
Chat API Endpoints
All chat and conversation related routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query
from typing import Dict, Any, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession
from models.chat import (
    ConversationCreate, ConversationUpdate, MessageCreate,
    ConversationListResponse, ConversationDetailResponse, MessageListResponse,
    ChatAnalyticsResponse, AIResponseRequest
)
from models.shared import SuccessResponse
from core.dependencies import get_current_user, get_optional_user, get_db
from services.chat_service import ChatService

# Initialize router and service
router = APIRouter(tags=["Chat"])
chat_service = ChatService()

# Conversation endpoints
@router.get("/conversations", response_model=SuccessResponse)
async def get_conversations(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=20, ge=1, le=100),
    offset: int = Query(default=0, ge=0)
):
    """Get user conversations"""
    try:
        conversations = await chat_service.get_user_conversations(
            db=db,
            user_id=current_user["user_id"], 
            limit=limit, 
            offset=offset
        )
        total = await chat_service.get_user_conversations_count(db=db, user_id=current_user["user_id"])
        
        return SuccessResponse(
            message=f"Found {len(conversations)} conversations",
            data={
                "conversations": conversations,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations", response_model=SuccessResponse)
async def create_conversation(
    request: ConversationCreate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create new conversation"""
    try:
        # Set user_id from the authenticated user's session
        user_id = current_user["user_id"]
        
        conversation_id = await chat_service.create_conversation(
            db=db,
            title=request.title,
            user_id=user_id,
            agent_id=request.agent_id
        )
        
        return SuccessResponse(
            message="Conversation created successfully",
            data={"conversation_id": conversation_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/conversations/{conversation_id}", response_model=SuccessResponse)
async def get_conversation(
    conversation_id: str,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get specific conversation"""
    try:
        conversation = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        # Check if user owns this conversation
        if conversation["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        return SuccessResponse(
            message="Conversation found",
            data=conversation
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/conversations/{conversation_id}", response_model=SuccessResponse)
async def update_conversation(
    conversation_id: str,
    request: ConversationUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update conversation"""
    try:
        # Check if user owns this conversation
        conversation = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await chat_service.update_conversation(
            db=db,
            conversation_id=conversation_id,
            updates=request.dict(exclude_unset=True)
        )
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return SuccessResponse(
            message="Conversation updated successfully",
            data={"conversation_id": conversation_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/conversations/{conversation_id}", response_model=SuccessResponse)
async def delete_conversation(
    conversation_id: str,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete conversation"""
    try:
        # Check if user owns this conversation
        conversation = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        success = await chat_service.delete_conversation(db=db, conversation_id=conversation_id)
        if not success:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        return SuccessResponse(
            message="Conversation deleted successfully",
            data={"conversation_id": conversation_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Message endpoints
@router.get("/conversations/{conversation_id}/messages", response_model=SuccessResponse)
async def get_conversation_messages(
    conversation_id: str,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0)
):
    """Get messages for a conversation"""
    try:
        # Check if user owns this conversation
        conversation = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        messages = await chat_service.get_conversation_messages(
            db=db,
            conversation_id=conversation_id, 
            limit=limit, 
            offset=offset
        )
        total = await chat_service.get_conversation_messages_count(db=db, conversation_id=conversation_id)
        
        return SuccessResponse(
            message=f"Found {len(messages)} messages",
            data={
                "messages": messages,
                "total": total,
                "limit": limit,
                "offset": offset
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conversation_id}/messages", response_model=SuccessResponse)
async def add_message_to_conversation(
    conversation_id: str,
    request: MessageCreate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Add message to conversation"""
    try:
        # Check if user owns this conversation
        conversation = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        result = await chat_service.add_message_to_conversation(
            db=db,
            conversation_id=conversation_id,
            content=request.content,
            sender_type=request.sender_type,
            agent_id=request.agent_id
        )
        
        return SuccessResponse(
            message="Message added successfully",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/conversations/{conversation_id}/ai-response", response_model=SuccessResponse)
async def get_ai_response(
    conversation_id: str,
    request: AIResponseRequest,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get AI response for a message"""
    try:
        # Check if user owns this conversation
        conversation = await chat_service.get_conversation_by_id(db=db, conversation_id=conversation_id)
        if not conversation:
            raise HTTPException(status_code=404, detail="Conversation not found")
        
        if conversation["user_id"] != current_user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        result = await chat_service.generate_ai_response(
            db=db,
            conversation_id=conversation_id,
            message=request.message,
            agent_id=request.agent_id,
            conversation_history=request.conversation_history,
            include_context=request.include_context
        )
        
        return SuccessResponse(
            message="AI response generated",
            data=result
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Analytics endpoints
@router.get("/analytics/dashboard", response_model=SuccessResponse)
async def get_chat_analytics(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get chat analytics for current user"""
    try:
        analytics = await chat_service.get_user_chat_analytics(db=db, user_id=current_user["user_id"])
        return SuccessResponse(
            message="Analytics retrieved",
            data=analytics
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/analytics/global", response_model=SuccessResponse)
async def get_global_chat_analytics(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get global chat analytics (admin only)"""
    try:
        if current_user.get("role") != "admin":
            raise HTTPException(status_code=403, detail="Admin access required")
        
        analytics = await chat_service.get_global_chat_analytics(db=db)
        return SuccessResponse(
            message="Global analytics retrieved",
            data=analytics
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Search endpoints
@router.get("/search", response_model=SuccessResponse)
async def search_messages(
    query: str = Query(..., min_length=1, max_length=200),
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
    conversation_id: Optional[str] = Query(None),
    limit: int = Query(default=20, ge=1, le=100)
):
    """Search messages"""
    try:
        results = await chat_service.search_user_messages(
            db=db,
            user_id=current_user["user_id"],
            query=query,
            conversation_id=conversation_id,
            limit=limit
        )
        
        return SuccessResponse(
            message=f"Found {len(results)} results",
            data={
                "results": results,
                "query": query,
                "total": len(results)
            }
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
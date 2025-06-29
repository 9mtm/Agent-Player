"""
Chat Service
Simplified chat and conversation management service using SQLAlchemy
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func, desc
from models.chat import Conversation, Message
from fastapi import HTTPException
import uuid
from datetime import datetime

class ChatService:
    """Chat management service"""
    
    async def get_user_conversations(
        self, db: AsyncSession, user_id: int, limit: int = 20, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get user conversations"""
        query = (
            select(Conversation)
            .where(and_(Conversation.user_id == user_id, Conversation.is_active == True))
            .order_by(desc(Conversation.updated_at))
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        conversations = result.scalars().all()
        return [self._conversation_to_dict(conv) for conv in conversations]
    
    async def get_user_conversations_count(self, db: AsyncSession, user_id: int) -> int:
        """Get total count of user conversations"""
        query = select(func.count()).select_from(Conversation).where(
            and_(Conversation.user_id == user_id, Conversation.is_active == True)
        )
        result = await db.execute(query)
        return result.scalar()
    
    async def create_conversation(
        self, db: AsyncSession, title: str, user_id: int, agent_id: Optional[int] = None
    ) -> str:
        """Create new conversation"""
        conversation_id = str(uuid.uuid4())
        conversation = Conversation(
            id=conversation_id,
            title=title,
            user_id=user_id,
            agent_id=agent_id,
            is_active=True
        )
        db.add(conversation)
        await db.commit()
        await db.refresh(conversation)
        return conversation_id
    
    async def get_conversation_by_id(
        self, db: AsyncSession, conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get specific conversation by ID"""
        query = select(Conversation).where(
            and_(Conversation.id == conversation_id, Conversation.is_active == True)
        )
        result = await db.execute(query)
        conversation = result.scalar_one_or_none()
        return self._conversation_to_dict(conversation) if conversation else None
    
    async def update_conversation(
        self, db: AsyncSession, conversation_id: str, updates: Dict[str, Any]
    ) -> bool:
        """Update existing conversation"""
        try:
            query = select(Conversation).where(
                and_(Conversation.id == conversation_id, Conversation.is_active == True)
            )
            result = await db.execute(query)
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                return False
                
            for key, value in updates.items():
                if hasattr(conversation, key):
                    setattr(conversation, key, value)
                    
            await db.commit()
            return True
            
        except Exception:
            await db.rollback()
            return False
    
    async def delete_conversation(self, db: AsyncSession, conversation_id: str) -> bool:
        """Delete conversation (soft delete)"""
        try:
            query = update(Conversation).where(
                and_(Conversation.id == conversation_id, Conversation.is_active == True)
            ).values(is_active=False, deleted_at=func.now())
            result = await db.execute(query)
            await db.commit()
            return result.rowcount > 0
        except Exception:
            await db.rollback()
            return False
    
    async def get_conversation_messages(
        self, db: AsyncSession, conversation_id: str, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation"""
        query = (
            select(Message)
            .where(and_(
                Message.conversation_id == conversation_id,
                Message.is_active == True
            ))
            .order_by(Message.created_at)
            .offset(offset)
            .limit(limit)
        )
        result = await db.execute(query)
        messages = result.scalars().all()
        return [self._message_to_dict(msg) for msg in messages]
    
    async def get_conversation_messages_count(
        self, db: AsyncSession, conversation_id: str
    ) -> int:
        """Get total count of messages in conversation"""
        query = select(func.count()).select_from(Message).where(
            and_(Message.conversation_id == conversation_id, Message.is_active == True)
        )
        result = await db.execute(query)
        return result.scalar()
    
    async def add_message_to_conversation(
        self, db: AsyncSession, conversation_id: str, content: str,
        sender_type: str = "user", agent_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Add message to conversation"""
        try:
            # Create message
            message = Message(
                conversation_id=conversation_id,
                content=content,
                sender_type=sender_type,
                agent_id=agent_id,
                is_active=True
            )
            db.add(message)
            
            # Update conversation
            query = select(Conversation).where(Conversation.id == conversation_id)
            result = await db.execute(query)
            conversation = result.scalar_one_or_none()
            
            if conversation:
                conversation.total_messages += 1
                conversation.updated_at = func.now()
            
            await db.commit()
            await db.refresh(message)
            
            return {"message_id": message.id, "status": "success"}
            
        except Exception as e:
            await db.rollback()
            raise HTTPException(status_code=500, detail=str(e))
    
    async def generate_ai_response(
        self, db: AsyncSession, conversation_id: str, message: str,
        agent_id: Optional[int] = None, conversation_history: Optional[List] = None,
        include_context: bool = True
    ) -> Dict[str, Any]:
        """Generate AI response for a message"""
        # For now, return mock response
        return {
            "response": "This is a mock AI response",
            "agent_id": agent_id,
            "processing_time": 1.5,
            "status": "success"
        }
    
    async def get_user_chat_analytics(
        self, db: AsyncSession, user_id: int
    ) -> Dict[str, Any]:
        """Get chat analytics for user"""
        try:
            # Get conversation count
            conv_count = await db.scalar(
                select(func.count())
                .select_from(Conversation)
                .where(and_(
                    Conversation.user_id == user_id,
                    Conversation.is_active == True
                ))
            )
            
            # Get message count
            msg_count = await db.scalar(
                select(func.count())
                .select_from(Message)
                .join(Conversation)
                .where(and_(
                    Conversation.user_id == user_id,
                    Message.is_active == True
                ))
            )
            
            # Calculate average messages per conversation
            avg_msgs = msg_count / conv_count if conv_count > 0 else 0
            
            return {
                "total_conversations": conv_count,
                "total_messages": msg_count,
                "active_conversations": conv_count,
                "average_messages_per_conversation": round(avg_msgs, 2),
                "most_used_agents": [],  # TODO: Implement agent analytics
                "recent_activity": []  # TODO: Implement activity tracking
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_global_chat_analytics(self, db: AsyncSession) -> Dict[str, Any]:
        """Get global chat analytics"""
        try:
            # Get total counts
            conv_count = await db.scalar(
                select(func.count())
                .select_from(Conversation)
                .where(Conversation.is_active == True)
            )
            
            msg_count = await db.scalar(
                select(func.count())
                .select_from(Message)
                .where(Message.is_active == True)
            )
            
            # Calculate average messages per conversation
            avg_msgs = msg_count / conv_count if conv_count > 0 else 0
            
            return {
                "total_conversations": conv_count,
                "total_messages": msg_count,
                "active_conversations": conv_count,
                "average_messages_per_conversation": round(avg_msgs, 2),
                "most_used_agents": [],  # TODO: Implement agent analytics
                "recent_activity": []  # TODO: Implement activity tracking
            }
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    async def search_user_messages(
        self, db: AsyncSession, user_id: int, query: str,
        conversation_id: Optional[str] = None, limit: int = 20
    ) -> List[Dict[str, Any]]:
        """Search messages for user"""
        try:
            base_query = (
                select(Message)
                .join(Conversation)
                .where(and_(
                    Conversation.user_id == user_id,
                    Message.is_active == True,
                    Message.content.ilike(f"%{query}%")
                ))
            )
            
            if conversation_id:
                base_query = base_query.where(Message.conversation_id == conversation_id)
                
            base_query = base_query.order_by(desc(Message.created_at)).limit(limit)
            
            result = await db.execute(base_query)
            messages = result.scalars().all()
            return [self._message_to_dict(msg) for msg in messages]
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
    
    def _conversation_to_dict(self, conversation: Conversation) -> Dict[str, Any]:
        """Convert Conversation model to dictionary"""
        if not conversation:
            return None
            
        return {
            "id": conversation.id,
            "title": conversation.title,
            "user_id": conversation.user_id,
            "agent_id": conversation.agent_id,
            "is_active": conversation.is_active,
            "context_data": conversation.context_data,
            "extra_data": conversation.extra_data,
            "summary": conversation.summary,
            "sentiment_score": conversation.sentiment_score,
            "satisfaction_rating": conversation.satisfaction_rating,
            "total_messages": conversation.total_messages,
            "total_tokens": conversation.total_tokens,
            "total_cost": conversation.total_cost,
            "created_at": conversation.created_at,
            "updated_at": conversation.updated_at
        }
    
    def _message_to_dict(self, message: Message) -> Dict[str, Any]:
        """Convert Message model to dictionary"""
        if not message:
            return None
            
        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "content": message.content,
            "sender_type": message.sender_type,
            "agent_id": message.agent_id,
            "tokens_used": message.tokens_used,
            "processing_time": message.processing_time,
            "extra_data": message.extra_data,
            "is_active": message.is_active,
            "created_at": message.created_at
        } 
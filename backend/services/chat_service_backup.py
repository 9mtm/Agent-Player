"""
Chat Service - Fixed
Simplified chat and conversation management service using SQLAlchemy
Compatible with actual database models
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func, desc
from models.database import Conversation, Message
from fastapi import HTTPException
from datetime import datetime
import logging

class ChatService:
    """Chat management service - Fixed version"""
    
    async def get_user_conversations(
        self, db: AsyncSession, user_id: int, limit: int = 20, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get user conversations"""
        try:
            query = (
                select(Conversation)
                .where(Conversation.user_id == user_id)
                .order_by(desc(Conversation.updated_at))
                .offset(offset)
                .limit(limit)
            )
            result = await db.execute(query)
            conversations = result.scalars().all()
            return [self._conversation_to_dict(conv) for conv in conversations]
        except Exception as e:
            logging.error(f"Error getting user conversations: {e}")
            return []
    
    async def get_user_conversations_count(self, db: AsyncSession, user_id: int) -> int:
        """Get total count of user conversations"""
        try:
            query = select(func.count()).select_from(Conversation).where(
                Conversation.user_id == user_id
            )
            result = await db.execute(query)
            return result.scalar() or 0
        except Exception as e:
            logging.error(f"Error getting conversation count: {e}")
            return 0
    
    async def create_conversation(
        self, db: AsyncSession, title: str, user_id: int, agent_id: Optional[int] = None
    ) -> int:
        """Create new conversation"""
        try:
            conversation = Conversation(
                title=title or "New Conversation",
                user_id=user_id,
                agent_id=agent_id
            )
            db.add(conversation)
            await db.commit()
            await db.refresh(conversation)
            return conversation.id
        except Exception as e:
            await db.rollback()
            logging.error(f"Error creating conversation: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def get_conversation_by_id(
        self, db: AsyncSession, conversation_id: str
    ) -> Optional[Dict[str, Any]]:
        """Get specific conversation by ID"""
        try:
            # Handle both string and int IDs
            conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
            
            query = select(Conversation).where(Conversation.id == conv_id)
            result = await db.execute(query)
            conversation = result.scalar_one_or_none()
            return self._conversation_to_dict(conversation) if conversation else None
        except Exception as e:
            logging.error(f"Error getting conversation by ID: {e}")
            return None
    
    async def update_conversation(
        self, db: AsyncSession, conversation_id: str, updates: Dict[str, Any]
    ) -> bool:
        """Update existing conversation"""
        try:
            conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
            
            query = select(Conversation).where(Conversation.id == conv_id)
            result = await db.execute(query)
            conversation = result.scalar_one_or_none()
            
            if not conversation:
                return False
                
            for key, value in updates.items():
                if hasattr(conversation, key) and value is not None:
                    setattr(conversation, key, value)
                    
            conversation.updated_at = datetime.utcnow()
            await db.commit()
            return True
            
        except Exception as e:
            await db.rollback()
            logging.error(f"Error updating conversation: {e}")
            return False
    
    async def delete_conversation(self, db: AsyncSession, conversation_id: str) -> bool:
        """Delete conversation (soft delete by setting title to null)"""
        try:
            conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
            
            query = update(Conversation).where(
                Conversation.id == conv_id
            ).values(title=None, updated_at=datetime.utcnow())
            result = await db.execute(query)
            await db.commit()
            return result.rowcount > 0
        except Exception as e:
            await db.rollback()
            logging.error(f"Error deleting conversation: {e}")
            return False
    
    async def get_conversation_messages(
        self, db: AsyncSession, conversation_id: str, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation"""
        try:
            conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
            
            query = (
                select(Message)
                .where(Message.conversation_id == conv_id)
                .order_by(Message.created_at)
                .offset(offset)
                .limit(limit)
            )
            result = await db.execute(query)
            messages = result.scalars().all()
            return [self._message_to_dict(msg) for msg in messages]
        except Exception as e:
            logging.error(f"Error getting conversation messages: {e}")
            return []
    
    async def get_conversation_messages_count(
        self, db: AsyncSession, conversation_id: str
    ) -> int:
        """Get total count of messages in conversation"""
        try:
            conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
            
            query = select(func.count()).select_from(Message).where(
                Message.conversation_id == conv_id
            )
            result = await db.execute(query)
            return result.scalar() or 0
        except Exception as e:
            logging.error(f"Error getting message count: {e}")
            return 0
    
    async def add_message_to_conversation(
        self, db: AsyncSession, conversation_id: str, content: str,
        sender_type: str = "user", agent_id: Optional[int] = None
    ) -> Dict[str, Any]:
        """Add message to conversation"""
        try:
            conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
            
            # Create message using correct field name
            message = Message(
                conversation_id=conv_id,
                content=content,
                sender=sender_type  # Use 'sender' field from database model
            )
            db.add(message)
            
            # Update conversation timestamp
            query = select(Conversation).where(Conversation.id == conv_id)
            result = await db.execute(query)
            conversation = result.scalar_one_or_none()
            
            if conversation:
                conversation.updated_at = datetime.utcnow()
            
            await db.commit()
            await db.refresh(message)
            
            return {"message_id": message.id, "status": "success"}
            
        except Exception as e:
            await db.rollback()
            logging.error(f"Error adding message: {e}")
            raise HTTPException(status_code=500, detail=str(e))
    
    async def generate_ai_response(
        self, db: AsyncSession, conversation_id: str, message: str,
        agent_id: Optional[int] = None, conversation_history: Optional[List] = None,
        include_context: bool = True
    ) -> Dict[str, Any]:
        """Generate AI response for a message"""
        try:
            # Mock AI response for now
            ai_responses = [
                "I understand your question. Let me help you with that.",
                "That's an interesting point. Here's what I think about it.",
                "Based on the information you provided, I would suggest the following approach.",
                "Thank you for sharing that. I can help you work through this step by step.",
                "I see what you're asking about. Let me provide some guidance on this topic."
            ]
            
            import random
            response = random.choice(ai_responses)
            
            # Add the AI response as a message
            await self.add_message_to_conversation(
                db=db,
                conversation_id=conversation_id,
                content=response,
                sender_type="agent",
                agent_id=agent_id
            )
            
            return {
                "response": response,
                "agent_id": agent_id,
                "processing_time": 1.2,
                "tokens_used": len(message.split()) + len(response.split()),
                "status": "success"
            }
            
        except Exception as e:
            logging.error(f"Error generating AI response: {e}")
            return {
                "response": "I apologize, but I'm having trouble generating a response right now.",
                "status": "error",
                "error": str(e)
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
                .where(Conversation.user_id == user_id)
            ) or 0
            
            # Get message count
            msg_count = await db.scalar(
                select(func.count())
                .select_from(Message)
                .join(Conversation)
                .where(Conversation.user_id == user_id)
            ) or 0
            
            # Calculate average messages per conversation
            avg_msgs = msg_count / conv_count if conv_count > 0 else 0
            
            return {
                "total_conversations": conv_count,
                "total_messages": msg_count,
                "active_conversations": conv_count,
                "average_messages_per_conversation": round(avg_msgs, 2),
                "most_used_agents": [],
                "recent_activity": []
            }
            
        except Exception as e:
            logging.error(f"Error getting user analytics: {e}")
            return {
                "total_conversations": 0,
                "total_messages": 0,
                "active_conversations": 0,
                "average_messages_per_conversation": 0,
                "most_used_agents": [],
                "recent_activity": []
            }
    
    async def get_global_chat_analytics(self, db: AsyncSession) -> Dict[str, Any]:
        """Get global chat analytics"""
        try:
            # Get total counts
            conv_count = await db.scalar(
                select(func.count()).select_from(Conversation)
            ) or 0
            
            msg_count = await db.scalar(
                select(func.count()).select_from(Message)
            ) or 0
            
            # Calculate average messages per conversation
            avg_msgs = msg_count / conv_count if conv_count > 0 else 0
            
            return {
                "total_conversations": conv_count,
                "total_messages": msg_count,
                "active_conversations": conv_count,
                "average_messages_per_conversation": round(avg_msgs, 2),
                "most_used_agents": [],
                "recent_activity": []
            }
            
        except Exception as e:
            logging.error(f"Error getting global analytics: {e}")
            return {
                "total_conversations": 0,
                "total_messages": 0,
                "active_conversations": 0,
                "average_messages_per_conversation": 0,
                "most_used_agents": [],
                "recent_activity": []
            }
    
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
                    Message.content.ilike(f"%{query}%")
                ))
            )
            
            if conversation_id:
                conv_id = int(conversation_id) if conversation_id.isdigit() else conversation_id
                base_query = base_query.where(Message.conversation_id == conv_id)
                
            base_query = base_query.order_by(desc(Message.created_at)).limit(limit)
            
            result = await db.execute(base_query)
            messages = result.scalars().all()
            return [self._message_to_dict(msg) for msg in messages]
            
        except Exception as e:
            logging.error(f"Error searching messages: {e}")
            return []
    
    def _conversation_to_dict(self, conversation: Conversation) -> Dict[str, Any]:
        """Convert Conversation model to dictionary"""
        if not conversation:
            return {}
            
        return {
            "id": conversation.id,
            "title": conversation.title,
            "user_id": conversation.user_id,
            "agent_id": conversation.agent_id,
            "created_at": conversation.created_at.isoformat() if conversation.created_at else None,
            "updated_at": conversation.updated_at.isoformat() if conversation.updated_at else None
        }
    
    def _message_to_dict(self, message: Message) -> Dict[str, Any]:
        """Convert Message model to dictionary"""
        if not message:
            return {}
            
        return {
            "id": message.id,
            "conversation_id": message.conversation_id,
            "content": message.content,
            "sender": message.sender,
            "message_type": message.message_type,
            "created_at": message.created_at.isoformat() if message.created_at else None
        } 
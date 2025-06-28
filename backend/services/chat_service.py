"""
Chat Service
Simplified chat and conversation management service using SQLAlchemy
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func, desc
from models.database import Conversation, Message
from fastapi import HTTPException
import uuid
from datetime import datetime
import logging
from services.agent_service import AgentService

class ChatService:
    """Chat management service"""
    
    def __init__(self):
        self.agent_service = AgentService()
    
    async def get_user_conversations(
        self, db: AsyncSession, user_id: int, skip: int = 0, limit: int = 20
    ) -> Dict[str, Any]:
        """Get user conversations with pagination"""
        try:
            print(f"🔍 [CHAT SERVICE] get_user_conversations called")
            print(f"🔍 [CHAT SERVICE] user_id: {user_id}")
            print(f"🔍 [CHAT SERVICE] skip: {skip}, limit: {limit}")
            
            # Query conversations for the user
            query = select(Conversation).where(
                Conversation.user_id == user_id,
                Conversation.is_active == True
            ).order_by(Conversation.updated_at.desc()).offset(skip).limit(limit)
            
            print(f"🔍 [CHAT SERVICE] Query: {query}")
            
            result = await db.execute(query)
            conversations = result.scalars().all()
            
            print(f"🔍 [CHAT SERVICE] Raw conversations from DB: {len(conversations)}")
            for conv in conversations:
                print(f"🔍 [CHAT SERVICE] Conv: {conv.id}, Title: {conv.title}, User: {conv.user_id}")
            
            # Count total conversations
            count_query = select(func.count(Conversation.id)).where(
                Conversation.user_id == user_id,
                Conversation.is_active == True
            )
            count_result = await db.execute(count_query)
            total = count_result.scalar()
            
            print(f"🔍 [CHAT SERVICE] Total conversations count: {total}")
            
            # Format conversations
            formatted_conversations = []
            for conv in conversations:
                formatted_conv = {
                    "id": conv.id,
                    "title": conv.title or "New Chat",
                    "user_id": conv.user_id,
                    "agent_id": conv.agent_id,
                    "is_active": conv.is_active,
                    "total_messages": conv.total_messages,
                    "created_at": conv.created_at.isoformat() if conv.created_at else None,
                    "updated_at": conv.updated_at.isoformat() if conv.updated_at else None,
                }
                formatted_conversations.append(formatted_conv)
                print(f"🔍 [CHAT SERVICE] Formatted conv: {formatted_conv}")
            
            result_data = {
                "conversations": formatted_conversations,
                "total": total,
                "page": (skip // limit) + 1,
                "pages": ((total - 1) // limit) + 1 if total > 0 else 0,
                "has_next": skip + limit < total
            }
            
            print(f"🔍 [CHAT SERVICE] Final result: {result_data}")
            return result_data
            
        except Exception as e:
            print(f"❌ [CHAT SERVICE] Error in get_user_conversations: {e}")
            import traceback
            traceback.print_exc()
            return {
                "conversations": [],
                "total": 0,
                "page": 1,
                "pages": 0,
                "has_next": False
            }
    
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
        print(f"🆕 [CHAT SERVICE] Creating conversation: title='{title}', user_id={user_id}, agent_id={agent_id}")
        
        conversation_id = str(uuid.uuid4())
        print(f"🆕 [CHAT SERVICE] Generated UUID: {conversation_id}")
        
        conversation = Conversation(
            id=conversation_id,
            title=title,
            user_id=user_id,
            agent_id=agent_id,
            is_active=True
        )
        print(f"🆕 [CHAT SERVICE] Created Conversation object: {conversation}")
        
        db.add(conversation)
        print(f"🆕 [CHAT SERVICE] Added to session")
        
        await db.commit()
        print(f"🆕 [CHAT SERVICE] Committed to database")
        
        await db.refresh(conversation)
        print(f"🆕 [CHAT SERVICE] Refreshed conversation")
        print(f"🆕 [CHAT SERVICE] Final conversation: id={conversation.id}, title={conversation.title}, user_id={conversation.user_id}, is_active={conversation.is_active}")
        
        # VERIFICATION: Check if conversation is immediately accessible
        verification_query = select(Conversation).where(Conversation.id == conversation_id)
        verification_result = await db.execute(verification_query)
        verification_conv = verification_result.scalar_one_or_none()
        if verification_conv:
            print(f"✅ [CHAT SERVICE] VERIFICATION PASSED: Conversation found in DB immediately after creation")
        else:
            print(f"❌ [CHAT SERVICE] VERIFICATION FAILED: Conversation NOT found in DB after creation!")
        
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
            print(f"🗑️ [CHAT SERVICE] Deleting conversation: {conversation_id}")
            query = update(Conversation).where(
                and_(Conversation.id == conversation_id, Conversation.is_active == True)
            ).values(is_active=False)
            result = await db.execute(query)
            await db.commit()
            rows_affected = result.rowcount
            print(f"🗑️ [CHAT SERVICE] Delete result: {rows_affected} rows affected")
            return rows_affected > 0
        except Exception as e:
            print(f"❌ [CHAT SERVICE] Delete error: {e}")
            await db.rollback()
            return False
    
    async def get_conversation_messages(
        self, db: AsyncSession, conversation_id: str, limit: int = 50, offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get messages for a conversation"""
        print(f"🔍 [CHAT SERVICE] get_conversation_messages called")
        print(f"🔍 [CHAT SERVICE] conversation_id: {conversation_id}")
        print(f"🔍 [CHAT SERVICE] limit: {limit}, offset: {offset}")
        
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
        
        print(f"🔍 [CHAT SERVICE] Query: {query}")
        
        result = await db.execute(query)
        messages = result.scalars().all()
        
        print(f"🔍 [CHAT SERVICE] Raw messages from DB: {len(messages)}")
        for msg in messages:
            print(f"🔍 [CHAT SERVICE] Message: ID={msg.id}, Content={msg.content[:50]}..., Sender={msg.sender_type}, Active={msg.is_active}")
        
        formatted_messages = [self._message_to_dict(msg) for msg in messages]
        print(f"🔍 [CHAT SERVICE] Formatted messages: {len(formatted_messages)}")
        
        return formatted_messages
    
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
        """Add message to conversation and return user and AI response objects"""
        try:
            print(f"🔍 [CHAT SERVICE] Starting add_message_to_conversation")
            print(f"🔍 [CHAT SERVICE] conversation_id: {conversation_id}")
            print(f"🔍 [CHAT SERVICE] content: {content}")
            print(f"🔍 [CHAT SERVICE] sender_type: {sender_type}")
            print(f"🔍 [CHAT SERVICE] agent_id: {agent_id}")
            
            # Create user message
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

            # Build user message dict
            user_message = self._message_to_dict(message)
            print(f"✅ [CHAT SERVICE] User message created: {user_message['id']}")

            # === FIXED: Get agent info and generate REAL AI response ===
            ai_content = "This is a mock AI response."
            print(f"🔍 [CHAT SERVICE] Getting conversation agent_id: {conversation.agent_id if conversation else 'None'}")
            
            if conversation and conversation.agent_id:
                print(f"🔍 [CHAT SERVICE] Loading agent with ID: {conversation.agent_id}")
                agent = await self.agent_service.get_agent_by_id(db, conversation.agent_id)
                print(f"🔍 [CHAT SERVICE] Agent loaded: {agent['name'] if agent else 'None'}")
                
                if agent:
                    is_local = agent.get("is_local_model", False)
                    print(f"🔍 [CHAT SERVICE] Agent is_local_model: {is_local}")
                    print(f"🔍 [CHAT SERVICE] Agent model_provider: {agent.get('model_provider')}")
                    
                    if is_local:
                        print(f"🚀 [CHAT SERVICE] Calling REAL local model...")
                        local_config = agent.get("local_config", {})
                        system_prompt = agent.get("system_prompt", "")
                        print(f"🔍 [CHAT SERVICE] Local config: {local_config}")
                        print(f"🔍 [CHAT SERVICE] System prompt: {system_prompt[:100]}...")
                        
                        # Use the REAL local model call (same as test_agent)
                        ai_content = await self.agent_service._call_local_model(
                            local_config,
                            content,
                            system_prompt
                        )
                        print(f"✅ [CHAT SERVICE] REAL AI response received: {ai_content[:100]}...")
                    else:
                        print(f"🚀 [CHAT SERVICE] Calling REAL cloud model...")
                        # Use REAL cloud model integration
                        model_provider = agent.get("model_provider", "openai")
                        
                        if model_provider == "openai":
                            print(f"🌐 [CHAT SERVICE] Calling OpenAI API...")
                            ai_content = await self.agent_service._call_openai_model(agent, content)
                        elif model_provider == "anthropic":
                            print(f"🌐 [CHAT SERVICE] Calling Anthropic API...")
                            ai_content = await self.agent_service._call_anthropic_model(agent, content)
                        else:
                            print(f"🔄 [CHAT SERVICE] Fallback for unsupported provider: {model_provider}")
                            ai_content = f"🚧 Provider '{model_provider}' integration coming soon! For now using mock response: I'm an AI assistant ready to help!"
                        
                        print(f"✅ [CHAT SERVICE] REAL cloud AI response received: {ai_content[:100]}...")
                else:
                    print(f"❌ [CHAT SERVICE] Agent not found!")
            else:
                print(f"❌ [CHAT SERVICE] No conversation or agent_id found!")

            # Save AI message
            print(f"💾 [CHAT SERVICE] Saving AI message...")
            ai_message = Message(
                conversation_id=conversation_id,
                content=ai_content,
                sender_type="agent",
                agent_id=agent_id,
                is_active=True
            )
            db.add(ai_message)
            if conversation:
                conversation.total_messages += 1
                conversation.updated_at = func.now()
            await db.commit()
            await db.refresh(ai_message)
            ai_response = self._message_to_dict(ai_message)
            print(f"✅ [CHAT SERVICE] AI message saved: {ai_response['id']}")

            result = {
                "user_message": user_message,
                "ai_response": ai_response
            }
            print(f"🎉 [CHAT SERVICE] Complete response ready!")
            return result
            
        except Exception as e:
            print(f"❌ [CHAT SERVICE] ERROR: {str(e)}")
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

    async def cleanup_all_user_chat_data(self, db: AsyncSession, user_id: int) -> Dict[str, int]:
        """🧹 DEVELOPMENT ONLY: Delete ALL chat data for user (conversations + messages)"""
        try:
            print(f"🧹 Starting chat cleanup for user {user_id}...")
            
            # Get count before deletion
            conversations_count = await db.execute(
                select(func.count(Conversation.id)).where(
                    Conversation.user_id == user_id,
                    Conversation.is_active == True
                )
            )
            total_conversations = conversations_count.scalar()
            
            messages_count = await db.execute(
                select(func.count(Message.id)).join(Conversation).where(
                    Conversation.user_id == user_id,
                    Conversation.is_active == True
                )
            )
            total_messages = messages_count.scalar()
            
            print(f"📊 Found {total_conversations} conversations and {total_messages} messages to delete")
            
            # Delete all messages first (foreign key constraint)
            deleted_messages = await db.execute(
                update(Message).where(
                    Message.conversation_id.in_(
                        select(Conversation.id).where(
                            Conversation.user_id == user_id,
                            Conversation.is_active == True
                        )
                    )
                ).values(is_active=False)
            )
            
            # Delete all conversations (soft delete)
            deleted_conversations = await db.execute(
                update(Conversation).where(
                    Conversation.user_id == user_id,
                    Conversation.is_active == True
                ).values(is_active=False)
            )
            
            await db.commit()
            
            result = {
                "conversations_deleted": deleted_conversations.rowcount,
                "messages_deleted": deleted_messages.rowcount
            }
            
            print(f"✅ Cleanup completed: {result}")
            return result
            
        except Exception as e:
            await db.rollback()
            print(f"❌ Error during cleanup: {e}")
            raise e 
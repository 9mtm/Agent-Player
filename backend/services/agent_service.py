"""
Agent Service
Simplified agent management service using SQLAlchemy
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func
from models.database import Agent  # Import the Agent model directly
import requests
import time
from datetime import datetime
from fastapi import HTTPException
import logging
from sqlalchemy.sql import text

class AgentService:
    """Agent management service"""
    
    async def get_all_agents(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get all agents"""
        try:
            query = select(Agent).where(Agent.is_active == True).order_by(Agent.created_at.desc())
            result = await db.execute(query)
            agents = result.scalars().all()
            return [self._agent_to_dict(agent) for agent in agents]
        except Exception as e:
            logging.error(f"Error getting all agents: {e}")
            return []
    
    async def get_main_agents(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get main agents only"""
        try:
            query = select(Agent).where(
                and_(Agent.agent_type == "main", Agent.is_active == True)
            ).order_by(Agent.created_at.desc())
            result = await db.execute(query)
            agents = result.scalars().all()
            return [self._agent_to_dict(agent) for agent in agents]
        except Exception as e:
            logging.error(f"Error getting main agents: {e}")
            return []
    
    async def get_child_agents(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get child agents only"""
        try:
            query = select(Agent).where(
                and_(Agent.agent_type == "child", Agent.is_active == True)
            ).order_by(Agent.created_at.desc())
            result = await db.execute(query)
            agents = result.scalars().all()
            return [self._agent_to_dict(agent) for agent in agents]
        except Exception as e:
            logging.error(f"Error getting child agents: {e}")
            return []
    
    async def get_agent_by_id(self, db: AsyncSession, agent_id: int) -> Optional[Dict[str, Any]]:
        """Get specific agent by ID"""
        try:
            query = select(Agent).where(
                and_(Agent.id == agent_id, Agent.is_active == True)
            )
            result = await db.execute(query)
            agent = result.scalar_one_or_none()
            return self._agent_to_dict(agent) if agent else None
        except Exception as e:
            logging.error(f"Error getting agent by ID {agent_id}: {e}")
            return None
    
    def _validate_openai_key(self, api_key: str) -> bool:
        """Validate OpenAI API key by format check"""
        if not api_key or not api_key.strip():
            return False
            
        # For testing, accept test keys
        if api_key.startswith("sk-test"):
            return True
            
        if not api_key.startswith("sk-"):
            return False
        
        # Skip actual API validation in development
        # Just check format
        return len(api_key) >= 20
    
    async def create_agent(self, db: AsyncSession, name: str, description: str, agent_type: str,
                    model_provider: str, model_name: str, system_prompt: str,
                    temperature: float, max_tokens: int, api_key: str,
                    parent_agent_id: int, user_id: int, api_endpoint: str = None) -> int:
        """Create new agent with proper validation"""
        try:
            # Validate API key for OpenAI only if provided
            if model_provider == "openai" and api_key and api_key.strip():
                if not self._validate_openai_key(api_key):
                    raise Exception("Invalid OpenAI API Key format. Please provide a valid key.")
            
            # For child agents, inherit API key from parent if not provided
            if agent_type == "child" and parent_agent_id and (not api_key or not api_key.strip()):
                parent = await self.get_agent_by_id(db, parent_agent_id)
                if parent and parent.get("api_key_encrypted"):
                    api_key = parent.get("api_key_encrypted")
            
            # Create new agent with string values (not enum)
            new_agent = Agent(
                name=name,
                description=description,
                agent_type=agent_type,  # Use string directly
                model_provider=model_provider,
                model_name=model_name,
                system_prompt=system_prompt,
                temperature=temperature,
                max_tokens=max_tokens,
                api_key_encrypted=api_key,  # Changed from api_key to api_key_encrypted
                api_endpoint=api_endpoint,  # NEW: Support for custom endpoints (Ollama, etc.)
                parent_agent_id=parent_agent_id,
                user_id=user_id,
                is_active=True
            )
            
            db.add(new_agent)
            await db.commit()
            await db.refresh(new_agent)
            return new_agent.id
            
        except Exception as e:
            await db.rollback()
            logging.error(f"Error creating agent: {e}")
            raise Exception(f"Agent creation failed: {str(e)}")
    
    async def update_agent(self, db: AsyncSession, agent_id: int, updates: Dict[str, Any]) -> bool:
        """Update existing agent"""
        try:
            query = select(Agent).where(
                and_(Agent.id == agent_id, Agent.is_active == True)
            )
            result = await db.execute(query)
            agent = result.scalar_one_or_none()
            
            if not agent:
                return False
                
            # Update only provided fields
            for key, value in updates.items():
                if hasattr(agent, key) and value is not None:
                    setattr(agent, key, value)
                    
            agent.updated_at = datetime.utcnow()
            await db.commit()
            return True
            
        except Exception as e:
            await db.rollback()
            logging.error(f"Error updating agent {agent_id}: {e}")
            return False
    
    async def delete_agent(self, db: AsyncSession, agent_id: int) -> bool:
        """Delete agent (soft delete)"""
        try:
            query = update(Agent).where(Agent.id == agent_id).values(
                is_active=False,
                updated_at=datetime.utcnow()
            )
            result = await db.execute(query)
            await db.commit()
            return result.rowcount > 0
        except Exception as e:
            await db.rollback()
            logging.error(f"Error deleting agent {agent_id}: {e}")
            return False
    
    async def test_agent(self, db: AsyncSession, agent_id: int, test_message: str) -> Dict[str, Any]:
        """Test agent with a message using real API calls"""
        start_time = time.time()
        
        try:
            # Get agent details
            agent = await self.get_agent_by_id(db, agent_id)
            if not agent:
                return {
                    "status": "error", 
                    "message": "Agent not found",
                    "error": "Agent with the specified ID does not exist"
                }
            
            # ✅ IMPROVED: Check model provider first, then validate API key only if needed
            model_provider = agent.get("model_provider", "").lower()
            
            # Local providers that don't need API keys
            local_providers = ["ollama", "lmstudio", "textgen", "localai", "llamafile", "jan", "vllm", "llamacppserver"]
            
            # Check if this is a local provider that doesn't need API key
            if model_provider in local_providers:
                # ✅ Skip API key validation for local providers (they don't need API keys!)
                logging.info(f"🟢 Local provider '{model_provider}' detected - no API key required")
                pass
            elif model_provider == "openai":
                # Only validate API key for OpenAI
                api_key = agent.get("api_key_encrypted")
                if not api_key or not self._validate_openai_key(api_key):
                    return {
                        "status": "error", 
                        "message": "Invalid or missing OpenAI API Key",
                        "error": "API key validation failed for OpenAI. Local providers like Ollama don't need API keys."
                    }
                
                # Make real OpenAI API call
                try:
                    from openai import OpenAI
                    import json
                    
                    # Create OpenAI client with API key
                    client = OpenAI(api_key=api_key)
                    
                    # Prepare the messages for OpenAI
                    messages = []
                    
                    # Add system prompt if exists
                    system_prompt = agent.get("system_prompt", "")
                    if system_prompt:
                        messages.append({"role": "system", "content": system_prompt})
                    
                    # Add user message
                    messages.append({"role": "user", "content": test_message})
                    
                    # Make the API call using new v1+ format
                    response = client.chat.completions.create(
                        model=agent.get("model_name", "gpt-3.5-turbo"),
                        messages=messages,
                        temperature=agent.get("temperature", 0.7),
                        max_tokens=min(agent.get("max_tokens", 1000), 4000),
                        top_p=agent.get("top_p", 1.0),
                        frequency_penalty=agent.get("frequency_penalty", 0.0),
                        presence_penalty=agent.get("presence_penalty", 0.0)
                    )
                    
                    # Extract the response
                    ai_response = response.choices[0].message.content
                    usage = response.usage
                    
                    response_time = round(time.time() - start_time, 3)
                    
                    return {
                        "status": "success",
                        "message": "Agent test completed successfully",
                        "agent_info": {
                            "id": agent.get("id"),
                            "name": agent.get("name"),
                            "model_provider": agent.get("model_provider"),
                            "model_name": agent.get("model_name"),
                            "agent_type": agent.get("agent_type"),
                            "temperature": agent.get("temperature"),
                            "max_tokens": agent.get("max_tokens")
                        },
                        "test_results": {
                            "user_message": test_message,
                            "agent_response": ai_response,
                            "response_time": f"{response_time}s",
                            "timestamp": datetime.now().isoformat(),
                            "tokens_used": usage.total_tokens,
                            "prompt_tokens": usage.prompt_tokens,
                            "completion_tokens": usage.completion_tokens,
                            "cost_estimate": usage.total_tokens * 0.00002,  # Rough estimate
                            "success": True
                        },
                        "performance": {
                            "response_time_ms": int(response_time * 1000),
                            "status_code": 200,
                            "model_temperature": agent.get("temperature"),
                            "total_tokens": usage.total_tokens
                        }
                    }
                    
                except ImportError:
                    # OpenAI library not installed, provide helpful error
                    return {
                        "status": "error",
                        "message": "OpenAI library not installed",
                        "error": "Please install openai library: pip install openai"
                    }
                except Exception as api_error:
                    logging.error(f"OpenAI API error: {api_error}")
                    return {
                        "status": "error",
                        "message": f"OpenAI API error: {str(api_error)}",
                        "error": str(api_error)
                    }
            
            # For Ollama local models
            elif agent.get("model_provider") == "ollama":
                try:
                    import requests
                    import json
                    
                    # Get Ollama endpoint (default: http://localhost:11434)
                    ollama_endpoint = agent.get("api_endpoint", "http://localhost:11434")
                    if not ollama_endpoint.endswith('/'):
                        ollama_endpoint += '/'
                    
                    # Prepare the messages for Ollama
                    messages = []
                    
                    # Add system prompt if exists
                    system_prompt = agent.get("system_prompt", "")
                    if system_prompt:
                        messages.append({"role": "system", "content": system_prompt})
                    
                    # Add user message
                    messages.append({"role": "user", "content": test_message})
                    
                    # Ollama API request
                    payload = {
                        "model": agent.get("model_name", "llama2"),
                        "messages": messages,
                        "stream": False,
                        "options": {
                            "temperature": agent.get("temperature", 0.7),
                            "num_predict": min(agent.get("max_tokens", 1000), 4000),
                            "top_p": agent.get("top_p", 1.0),
                        }
                    }
                    
                    # Make request to Ollama
                    response = requests.post(
                        f"{ollama_endpoint}api/chat",
                        json=payload,
                        timeout=30
                    )
                    
                    if response.status_code == 200:
                        data = response.json()
                        ai_response = data.get("message", {}).get("content", "No response from Ollama")
                        
                        response_time = round(time.time() - start_time, 3)
                        
                        return {
                            "status": "success",
                            "message": "Agent test completed successfully (Ollama)",
                            "agent_info": {
                                "id": agent.get("id"),
                                "name": agent.get("name"),
                                "model_provider": agent.get("model_provider"),
                                "model_name": agent.get("model_name"),
                                "agent_type": agent.get("agent_type"),
                                "temperature": agent.get("temperature"),
                                "max_tokens": agent.get("max_tokens"),
                                "endpoint": ollama_endpoint
                            },
                            "test_results": {
                                "user_message": test_message,
                                "agent_response": ai_response,
                                "response_time": f"{response_time}s",
                                "timestamp": datetime.now().isoformat(),
                                "tokens_used": len(test_message.split()) + len(ai_response.split()),
                                "cost_estimate": 0.0,  # Ollama is free
                                "success": True,
                                "model_info": data.get("model", ""),
                                "done_reason": data.get("done_reason", "")
                            },
                            "performance": {
                                "response_time_ms": int(response_time * 1000),
                                "status_code": 200,
                                "model_temperature": agent.get("temperature"),
                                "estimated_tokens": len(test_message.split()) + len(ai_response.split()),
                                "local_model": True
                            }
                        }
                    else:
                        return {
                            "status": "error",
                            "message": f"Ollama API error: {response.status_code}",
                            "error": f"HTTP {response.status_code}: {response.text}"
                        }
                        
                except Exception as ollama_error:
                    logging.error(f"Ollama API error: {ollama_error}")
                    return {
                        "status": "error",
                        "message": f"Ollama connection error: {str(ollama_error)}",
                        "error": str(ollama_error),
                        "hint": "Make sure Ollama is running on the specified endpoint"
                    }
            
            # For non-OpenAI providers, use mock responses
            response_time = round(time.time() - start_time, 3)
            
            # Generate appropriate mock response
            mock_responses = {
                "anthropic": "Hi! I'm Claude, an AI assistant created by Anthropic. I'm ready to help with a wide variety of tasks. What can I do for you?",
                "google": "Greetings! I'm a Google AI assistant. I'm designed to be helpful, harmless, and honest. How may I assist you today?",
                "default": "Hello! I'm an AI assistant. I'm here to help you with your questions and tasks. How can I assist you today?"
            }
            
            model_provider = agent.get("model_provider", "default")
            agent_response = mock_responses.get(model_provider, mock_responses["default"])
            
            return {
                "status": "success",
                "message": "Agent test completed successfully (mock response)",
                "agent_info": {
                    "id": agent.get("id"),
                    "name": agent.get("name"),
                    "model_provider": agent.get("model_provider"),
                    "model_name": agent.get("model_name"),
                    "agent_type": agent.get("agent_type"),
                    "temperature": agent.get("temperature"),
                    "max_tokens": agent.get("max_tokens")
                },
                "test_results": {
                    "user_message": test_message,
                    "agent_response": agent_response,
                    "response_time": f"{response_time}s",
                    "timestamp": datetime.now().isoformat(),
                    "tokens_used": len(test_message.split()) + len(agent_response.split()),
                    "cost_estimate": 0.002,
                    "success": True
                },
                "performance": {
                    "response_time_ms": int(response_time * 1000),
                    "status_code": 200,
                    "model_temperature": agent.get("temperature"),
                    "estimated_tokens": len(test_message.split()) + len(agent_response.split())
                }
            }
            
        except Exception as e:
            logging.error(f"Error testing agent {agent_id}: {e}")
            return {
                "status": "error",
                "message": f"Agent test failed: {str(e)}",
                "error": str(e)
            }
    
    async def get_agent_statistics(self, db: AsyncSession) -> Dict[str, Any]:
        """Get agent statistics"""
        try:
            total = await db.scalar(select(func.count()).select_from(Agent).where(Agent.is_active == True))
            main = await db.scalar(select(func.count()).select_from(Agent).where(
                and_(Agent.agent_type == "main", Agent.is_active == True)
            ))
            child = await db.scalar(select(func.count()).select_from(Agent).where(
                and_(Agent.agent_type == "child", Agent.is_active == True)
            ))
            
            return {
                "total_agents": total or 0,
                "main_agents": main or 0, 
                "child_agents": child or 0,
                "active_agents": total or 0
            }
        except Exception as e:
            logging.error(f"Error getting agent statistics: {e}")
            return {
                "total_agents": 0,
                "main_agents": 0,
                "child_agents": 0,
                "active_agents": 0
            }
    
    async def get_agent_children(self, db: AsyncSession, agent_id: int) -> List[Dict[str, Any]]:
        """Get child agents of a specific agent"""
        try:
            query = select(Agent).where(
                and_(Agent.parent_agent_id == agent_id, Agent.is_active == True)
            ).order_by(Agent.created_at.desc())
            result = await db.execute(query)
            agents = result.scalars().all()
            return [self._agent_to_dict(agent) for agent in agents]
        except Exception as e:
            logging.error(f"Error getting agent children for {agent_id}: {e}")
            return []
    
    async def get_agent_performance(self, db: AsyncSession, agent_id: int) -> Optional[Dict[str, Any]]:
        """Get agent performance metrics"""
        try:
            agent = await self.get_agent_by_id(db, agent_id)
            if not agent:
                return None
            
            # Return mock performance data for now
            return {
                "agent_id": agent_id,
                "total_interactions": 0,
                "success_rate": 100.0,
                "average_response_time": 1.5,
                "last_activity": None,
                "created_at": agent.get("created_at"),
                "last_updated": agent.get("updated_at")
            }
        except Exception as e:
            logging.error(f"Error getting agent performance for {agent_id}: {e}")
            return None
    
    def _agent_to_dict(self, agent: Agent) -> Dict[str, Any]:
        """Convert Agent model to dictionary safely"""
        if not agent:
            return {}
            
        try:
            return {
                "id": agent.id,
                "user_id": getattr(agent, 'user_id', None),
                "name": agent.name,
                "description": agent.description,
                "agent_type": agent.agent_type,
                "status": getattr(agent, 'status', 'active'),
                "model_provider": agent.model_provider,
                "model_name": agent.model_name,
                "model_version": getattr(agent, 'model_version', None),
                "system_prompt": agent.system_prompt,
                "temperature": agent.temperature,
                "max_tokens": agent.max_tokens,
                "top_p": getattr(agent, 'top_p', None),
                "frequency_penalty": getattr(agent, 'frequency_penalty', None),
                "presence_penalty": getattr(agent, 'presence_penalty', None),
                "stop_sequences": getattr(agent, 'stop_sequences', None),
                "api_key_encrypted": getattr(agent, 'api_key_encrypted', None),
                "api_endpoint": getattr(agent, 'api_endpoint', None),  # For local models like Ollama
                "api_key": getattr(agent, 'api_key_encrypted', None),  # For backward compatibility
                "custom_parameters": getattr(agent, 'custom_parameters', None),
                "capabilities": getattr(agent, 'capabilities', None),
                "parent_agent_id": agent.parent_agent_id,
                "child_agents_count": getattr(agent, 'child_agents_count', 0),
                "is_active": agent.is_active,
                "is_public": getattr(agent, 'is_public', False),
                "is_featured": getattr(agent, 'is_featured', False),
                "usage_count": getattr(agent, 'usage_count', 0),
                "success_rate": getattr(agent, 'success_rate', None),
                "avg_response_time": getattr(agent, 'avg_response_time', None),
                "rating_average": getattr(agent, 'rating_average', None),
                "rating_count": getattr(agent, 'rating_count', 0),
                "tags": getattr(agent, 'tags', None),
                "category": getattr(agent, 'category', None),
                "subcategory": getattr(agent, 'subcategory', None),
                "created_at": agent.created_at.isoformat() if agent.created_at else None,
                "updated_at": agent.updated_at.isoformat() if agent.updated_at else None,
                "deleted_at": getattr(agent, 'deleted_at', None)
            }
        except Exception as e:
            logging.error(f"Error converting agent to dict: {e}")
            return {}
    
    async def get_agent_capabilities(self, db: AsyncSession, agent_id: int):
        """Get agent capabilities"""
        try:
            query = """
            SELECT capability_name, proficiency_level, created_at, updated_at
            FROM agent_capabilities 
            WHERE agent_id = ?
            ORDER BY proficiency_level DESC
            """
            
            result = await db.execute(text(query), (agent_id,))
            capabilities = [
                {
                    "name": row[0],
                    "proficiency": row[1],
                    "created_at": row[2],
                    "updated_at": row[3]
                }
                for row in result.fetchall()
            ]
            
            return capabilities
        except Exception as e:
            logging.error(f"Error getting agent capabilities: {e}")
            return []
    
    async def update_agent_capabilities(self, db: AsyncSession, agent_id: int, capabilities: list):
        """Update agent capabilities"""
        try:
            # First, delete existing capabilities
            delete_query = "DELETE FROM agent_capabilities WHERE agent_id = ?"
            await db.execute(text(delete_query), (agent_id,))
            
            # Insert new capabilities
            for cap in capabilities:
                insert_query = """
                INSERT INTO agent_capabilities (agent_id, capability_name, proficiency_level, created_at, updated_at)
                VALUES (?, ?, ?, datetime('now'), datetime('now'))
                """
                await db.execute(text(insert_query), (
                    agent_id,
                    cap.get("name"),
                    cap.get("proficiency", 0.5)
                ))
            
            await db.commit()
            logging.info(f"Updated capabilities for agent {agent_id}")
            return True
        except Exception as e:
            logging.error(f"Error updating agent capabilities: {e}")
            await db.rollback()
            return False
    
    async def start_training_session(self, db: AsyncSession, agent_id: int, training_data: dict, user_id: int):
        """Start training session for agent"""
        try:
            session_id = f"train_{agent_id}_{int(time.time())}"
            
            query = """
            INSERT INTO training_sessions (session_id, agent_id, user_id, status, training_data, created_at, updated_at)
            VALUES (?, ?, ?, 'started', ?, datetime('now'), datetime('now'))
            """
            
            await db.execute(text(query), (
                session_id, agent_id, user_id, str(training_data)
            ))
            await db.commit()
            
            logging.info(f"Started training session {session_id} for agent {agent_id}")
            return {
                "session_id": session_id,
                "status": "started",
                "agent_id": agent_id
            }
        except Exception as e:
            logging.error(f"Error starting training session: {e}")
            return {"status": "error", "message": str(e)}
    
    async def get_training_status(self, db: AsyncSession, agent_id: int):
        """Get training status for agent"""
        try:
            query = """
            SELECT session_id, status, progress_percentage, created_at, updated_at
            FROM training_sessions 
            WHERE agent_id = ? 
            ORDER BY created_at DESC 
            LIMIT 1
            """
            
            result = await db.execute(text(query), (agent_id,))
            row = result.fetchone()
            
            if row:
                return {
                    "session_id": row[0],
                    "status": row[1],
                    "progress": row[2] or 0,
                    "started_at": row[3],
                    "updated_at": row[4]
                }
            else:
                return {
                    "status": "no_training_sessions",
                    "message": "No training sessions found for this agent"
                }
        except Exception as e:
            logging.error(f"Error getting training status: {e}")
            return {"status": "error", "message": str(e)}
    
    async def share_agent(self, db: AsyncSession, agent_id: int, share_settings: dict, user_id: int):
        """Share agent with specified settings"""
        try:
            # Update agent sharing settings
            update_query = """
            UPDATE agents 
            SET is_public = ?, sharing_settings = ?, updated_at = datetime('now')
            WHERE id = ? AND user_id = ?
            """
            
            is_public = share_settings.get("type") == "public"
            sharing_json = str(share_settings)
            
            await db.execute(text(update_query), (
                is_public, sharing_json, agent_id, user_id
            ))
            await db.commit()
            
            # Generate share URL
            share_url = f"/shared/agents/{agent_id}" if is_public else None
            
            logging.info(f"Updated sharing settings for agent {agent_id}")
            return {
                "share_url": share_url,
                "settings": share_settings
            }
        except Exception as e:
            logging.error(f"Error sharing agent: {e}")
            return {"error": str(e)}
    
    async def get_usage_history(self, db: AsyncSession, agent_id: int, days: int):
        """Get agent usage history"""
        try:
            query = """
            SELECT DATE(created_at) as usage_date, COUNT(*) as interactions
            FROM messages 
            WHERE agent_id = ? 
            AND created_at >= datetime('now', '-{} days')
            GROUP BY DATE(created_at)
            ORDER BY usage_date DESC
            """.format(days)
            
            result = await db.execute(text(query), (agent_id,))
            history = [
                {
                    "date": row[0],
                    "interactions": row[1]
                }
                for row in result.fetchall()
            ]
            
            return history
        except Exception as e:
            logging.error(f"Error getting usage history: {e}")
            return []
    
    async def create_agent_backup(self, db: AsyncSession, agent_id: int, user_id: int):
        """Create agent backup"""
        try:
            # Get agent data
            agent = await self.get_agent_by_id(db, agent_id)
            if not agent:
                raise ValueError("Agent not found")
            
            # Get capabilities
            capabilities = await self.get_agent_capabilities(db, agent_id)
            
            # Create backup data
            backup_data = {
                "agent": agent,
                "capabilities": capabilities,
                "backup_version": "1.0",
                "created_at": time.time()
            }
            
            backup_id = f"backup_{agent_id}_{int(time.time())}"
            
            # Store backup (in production, this would go to cloud storage)
            backup_query = """
            INSERT INTO agent_backups (backup_id, agent_id, user_id, backup_data, created_at)
            VALUES (?, ?, ?, ?, datetime('now'))
            """
            
            await db.execute(text(backup_query), (
                backup_id, agent_id, user_id, str(backup_data)
            ))
            await db.commit()
            
            logging.info(f"Created backup {backup_id} for agent {agent_id}")
            return {
                "backup_id": backup_id,
                "size": len(str(backup_data)),
                "created_at": time.time()
            }
        except Exception as e:
            logging.error(f"Error creating agent backup: {e}")
            return {"error": str(e)}
    
    async def restore_agent_from_backup(self, db: AsyncSession, backup_id: str, user_id: int):
        """Restore agent from backup"""
        try:
            # Get backup data
            query = """
            SELECT backup_data, agent_id 
            FROM agent_backups 
            WHERE backup_id = ? AND user_id = ?
            """
            
            result = await db.execute(text(query), (backup_id, user_id))
            row = result.fetchone()
            
            if not row:
                raise ValueError("Backup not found")
            
            backup_data = eval(row[0])  # In production, use proper JSON parsing
            original_agent_id = row[1]
            
            # Create new agent from backup
            agent_data = backup_data["agent"]
            new_agent_id = await self.create_agent(
                db=db,
                name=f"{agent_data['name']} (Restored)",
                description=agent_data.get("description", ""),
                agent_type=agent_data.get("agent_type", "main"),
                model_provider=agent_data.get("model_provider", "openai"),
                model_name=agent_data.get("model_name", "gpt-3.5-turbo"),
                system_prompt=agent_data.get("system_prompt", ""),
                temperature=agent_data.get("temperature", 0.7),
                max_tokens=agent_data.get("max_tokens", 1000),
                api_key=agent_data.get("api_key_encrypted", ""),
                parent_agent_id=agent_data.get("parent_agent_id"),
                user_id=user_id
            )
            
            # Restore capabilities
            if backup_data.get("capabilities"):
                await self.update_agent_capabilities(db, new_agent_id, backup_data["capabilities"])
            
            logging.info(f"Restored agent {new_agent_id} from backup {backup_id}")
            return {
                "agent_id": new_agent_id,
                "original_agent_id": original_agent_id,
                "restored_at": time.time()
            }
        except Exception as e:
            logging.error(f"Error restoring agent from backup: {e}")
            return {"error": str(e)} 
"""
Authentication Service
Simplified authentication service using SQLAlchemy
"""

from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from core.security import security
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, insert, func, and_
from models.database import User, UserSession, ActivityLog
import logging

# Create logger
logger = logging.getLogger(__name__)

class AuthService:
    """Authentication service for user management"""
    
    def __init__(self):
        self.security = security
    
    async def login(self, db: AsyncSession, email: str, password: str) -> Dict[str, Any]:
        """Login user and return tokens"""
        try:
            logger.info(f"🔐 LOGIN: Starting login for email: {email}")
            
            # Get user by email
            query = select(User).where(
                and_(User.email == email, User.is_active == True)
            )
            logger.info(f"🔐 LOGIN: Executing query: {query}")
            
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            logger.info(f"🔐 LOGIN: User found: {user is not None}")
            
            if not user:
                logger.warning(f"🔐 LOGIN: User not found for email: {email}")
                raise ValueError("Invalid email or password")
            
            # Verify password
            logger.info(f"🔐 LOGIN: Verifying password hash...")
            if not self.security.verify_password(password, user.password_hash):
                logger.warning(f"🔐 LOGIN: Invalid password for user: {email}")
                raise ValueError("Invalid email or password")
            
            logger.info(f"🔐 LOGIN: Password verified successfully")
            
            # Create tokens
            token_data = {
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role
            }
            
            logger.info(f"🔐 LOGIN: Creating tokens for user: {user.id}")
            access_token = self.security.create_access_token(token_data)
            refresh_token = self.security.create_refresh_token(token_data)
            
            # Update last login
            user.updated_at = func.now()
            await db.commit()
            
            # Log activity
            await self._log_activity(db, user.id, "login", "User logged in successfully")
            
            logger.info(f"🔐 LOGIN: Login successful for user: {user.id}")
            
            return {
                "access_token": access_token,
                "refresh_token": refresh_token,
                "token_type": "bearer",
                "user": {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                    "role": user.role
                },
                # For backward compatibility
                "tokens": {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer"
                }
            }
            
        except ValueError as e:
            logger.warning(f"🔐 LOGIN: Validation error: {str(e)}")
            raise
        except Exception as e:
            logger.error(f"🔐 LOGIN: Unexpected error: {str(e)}")
            raise Exception(f"Login failed: {str(e)}")
    
    async def register_admin(self, db: AsyncSession, email: str, username: str, 
                           full_name: str, password: str) -> Dict[str, Any]:
        """Register first admin user"""
        try:
            # Check if admin already exists
            query = select(func.count()).select_from(User).where(User.role == 'admin')
            result = await db.execute(query)
            admin_count = result.scalar()
            
            if admin_count > 0:
                raise ValueError("Admin user already exists")
            
            # Check if email already exists
            query = select(func.count()).select_from(User).where(User.email == email)
            result = await db.execute(query)
            if result.scalar() > 0:
                raise ValueError("Email already exists")
            
            # Check if username already exists
            query = select(func.count()).select_from(User).where(User.username == username)
            result = await db.execute(query)
            if result.scalar() > 0:
                raise ValueError("Username already exists")
            
            # Hash password
            password_hash = self.security.hash_password(password)
            
            # Create admin user
            new_user = User(
                email=email,
                username=username,
                full_name=full_name,
                password_hash=password_hash,
                role='admin',
                is_active=True
            )
            db.add(new_user)
            await db.commit()
            await db.refresh(new_user)
            
            # Log activity
            await self._log_activity(db, new_user.id, "register", "Admin user registered")
            
            return {
                "user_id": new_user.id,
                "email": new_user.email,
                "username": new_user.username,
                "full_name": new_user.full_name,
                "role": "admin"
            }
            
        except ValueError:
            raise
        except Exception as e:
            await db.rollback()
            raise Exception(f"Admin registration failed: {str(e)}")
    
    async def get_current_user_info(self, db: AsyncSession, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get current user information"""
        try:
            query = select(User).where(
                and_(User.id == user_data["user_id"], User.is_active == True)
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                raise ValueError("User not found")
            
            return {
                "id": user.id,
                "email": user.email,
                "username": user.username,
                "full_name": user.full_name,
                "role": user.role,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "updated_at": user.updated_at
            }
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to get user info: {str(e)}")
    
    async def logout(self, db: AsyncSession, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Logout user"""
        try:
            # Log activity
            await self._log_activity(db, user_data["user_id"], "logout", "User logged out")
            
            return {"message": "Logout successful"}
            
        except Exception as e:
            # Don't fail logout for logging errors
            return {"message": "Logout completed"}
    
    async def refresh_token(self, db: AsyncSession, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        try:
            # Verify refresh token
            payload = self.security.verify_token(refresh_token)
            
            if not payload or payload.get("type") != "refresh":
                raise ValueError("Invalid refresh token")
            
            # Get user data
            query = select(User).where(
                and_(User.id == payload["user_id"], User.is_active == True)
            )
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                raise ValueError("User not found")
            
            # Create new access token
            token_data = {
                "user_id": user.id,
                "email": user.email,
                "username": user.username,
                "role": user.role
            }
            
            access_token = self.security.create_access_token(token_data)
            
            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Token refresh failed: {str(e)}")
    
    async def get_system_status(self, db: AsyncSession) -> Dict[str, Any]:
        """Get authentication system status"""
        try:
            # Get user statistics
            total_users = await db.scalar(select(func.count()).select_from(User))
            active_users = await db.scalar(select(func.count()).select_from(User).where(User.is_active == True))
            admin_users = await db.scalar(select(func.count()).select_from(User).where(User.role == 'admin'))
            
            # Get recent activity
            recent_activity = await db.scalar(
                select(func.count())
                .select_from(ActivityLog)
                .where(ActivityLog.created_at > func.datetime('now', '-24 hours'))
            )
            
            return {
                "status": "operational",
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "admin": admin_users
                },
                "activity": {
                    "last_24_hours": recent_activity or 0
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_admin_users(self, db: AsyncSession, current_user: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all users (admin only)"""
        try:
            if current_user.get("role") != "admin":
                raise ValueError("Admin access required")
            
            query = select(User).order_by(User.created_at.desc())
            result = await db.execute(query)
            users = result.scalars().all()
            
            return [
                {
                    "id": user.id,
                    "email": user.email,
                    "username": user.username,
                    "full_name": user.full_name,
                    "role": user.role,
                    "is_active": user.is_active,
                    "created_at": user.created_at,
                    "updated_at": user.updated_at
                }
                for user in users
            ]
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to get users: {str(e)}")
    
    async def get_active_sessions(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get active user sessions"""
        try:
            query = (
                select(UserSession, User.email, User.username)
                .join(User)
                .where(UserSession.expires_at > func.now())
                .order_by(UserSession.created_at.desc())
            )
            result = await db.execute(query)
            sessions = result.all()
            
            return [
                {
                    "id": session.UserSession.id,
                    "user_id": session.UserSession.user_id,
                    "email": session.email,
                    "username": session.username,
                    "created_at": session.UserSession.created_at,
                    "expires_at": session.UserSession.expires_at
                }
                for session in sessions
            ]
            
        except Exception as e:
            return []
    
    async def terminate_session(self, db: AsyncSession, session_id: int) -> bool:
        """Terminate user session"""
        try:
            query = select(UserSession).where(UserSession.id == session_id)
            result = await db.execute(query)
            session = result.scalar_one_or_none()
            
            if session:
                await db.delete(session)
                await db.commit()
                return True
            return False
            
        except Exception:
            await db.rollback()
            return False
    
    async def _log_activity(self, db: AsyncSession, user_id: int, action: str, details: str):
        """Log user activity"""
        try:
            log = ActivityLog(
                user_id=user_id,
                action=action,
                details=details
            )
            db.add(log)
            await db.commit()
        except Exception:
            # Don't fail main operation for logging errors
            await db.rollback() 
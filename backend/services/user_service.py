"""
User Service
Simplified user management service using SQLAlchemy
"""

from typing import Dict, Any, Optional, List
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_, func, desc
from models import User
from models import UserSession
from fastapi import HTTPException
import logging

class UserService:
    """User management service"""
    
    async def get_all_users(self, db: AsyncSession) -> List[Dict[str, Any]]:
        """Get all users"""
        query = select(User).order_by(desc(User.created_at))
        result = await db.execute(query)
        users = result.scalars().all()
        return [self._user_to_dict(user) for user in users]
    
    async def get_user_by_id(self, db: AsyncSession, user_id: int) -> Optional[Dict[str, Any]]:
        """Get specific user by ID"""
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        return self._user_to_dict(user) if user else None
    
    async def get_user_by_email(self, db: AsyncSession, email: str) -> Optional[Dict[str, Any]]:
        """Get specific user by email"""
        query = select(User).where(User.email == email)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        return self._user_to_dict(user) if user else None
    
    async def update_user(self, db: AsyncSession, user_id: int, updates: Dict[str, Any]) -> bool:
        """Update existing user"""
        try:
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                return False
                
            for key, value in updates.items():
                if hasattr(user, key):
                    setattr(user, key, value)
                    
            await db.commit()
            return True
            
        except Exception:
            await db.rollback()
            return False
    
    async def delete_user(self, db: AsyncSession, user_id: int) -> bool:
        """Delete user (soft delete)"""
        try:
            query = update(User).where(User.id == user_id).values(
                is_active=False,
                deleted_at=func.now()
            )
            result = await db.execute(query)
            await db.commit()
            return result.rowcount > 0
        except Exception:
            await db.rollback()
            return False
    
    async def get_user_statistics(self, db: AsyncSession) -> Dict[str, Any]:
        """Get user statistics"""
        total = await db.scalar(select(func.count()).select_from(User))
        active = await db.scalar(select(func.count()).select_from(User).where(User.is_active == True))
        
        return {
            "total_users": total,
            "active_users": active,
            "inactive_users": total - active
        }

    async def get_user_profile(self, db: AsyncSession, user_id: int) -> Optional[Dict[str, Any]]:
        """Get current user profile"""
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        return self._user_to_dict(user, include_timestamps=True) if user else None

    async def update_user_profile(self, db: AsyncSession, user_id: int, updates: Dict[str, Any]) -> bool:
        """Update current user profile (full_name, bio, etc.)"""
        try:
            allowed = {k: v for k, v in updates.items() if k in ["full_name", "bio"]}
            if not allowed:
                return False
                
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                return False
                
            for key, value in allowed.items():
                setattr(user, key, value)
                
            user.updated_at = func.now()
            await db.commit()
            return True
            
        except Exception:
            await db.rollback()
            return False

    async def get_user_settings(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Get user settings"""
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user or not user.preferences:
            # Return defaults if no settings found
            return {"theme": "light", "notifications_enabled": True, "language": "en"}
            
        return user.preferences.get("settings", {})

    async def update_user_settings(self, db: AsyncSession, user_id: int, settings: Dict[str, Any]) -> bool:
        """Update user settings"""
        try:
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                return False
                
            if not user.preferences:
                user.preferences = {}
                
            user.preferences["settings"] = settings
            await db.commit()
            return True
            
        except Exception:
            await db.rollback()
            return False

    async def get_user_preferences(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Get user preferences"""
        query = select(User).where(User.id == user_id)
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        
        if not user or not user.preferences:
            # Return defaults if no preferences found
            return {"sidebar_collapsed": False, "show_tips": True}
            
        return user.preferences.get("ui", {})

    async def update_user_preferences(self, db: AsyncSession, user_id: int, preferences: Dict[str, Any]) -> bool:
        """Update user preferences"""
        try:
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                return False
                
            if not user.preferences:
                user.preferences = {}
                
            user.preferences["ui"] = preferences
            await db.commit()
            return True
            
        except Exception:
            await db.rollback()
            return False

    async def get_user_statistics_by_id(self, db: AsyncSession, user_id: int) -> Dict[str, Any]:
        """Get statistics for a specific user"""
        # Get login count from sessions
        login_count = await db.scalar(
            select(func.count())
            .select_from(UserSession)
            .where(UserSession.user_id == user_id)
        )
        
        # Get last login time
        last_login = await db.scalar(
            select(func.max(UserSession.created_at))
            .select_from(UserSession)
            .where(UserSession.user_id == user_id)
        )
        
        return {
            "total_logins": login_count or 0,
            "last_login": last_login.isoformat() if last_login else None
        }

    async def update_user_by_admin(self, db: AsyncSession, user_id: int, updates: Dict[str, Any]) -> bool:
        """Admin: update user info"""
        try:
            allowed = {k: v for k, v in updates.items() if k in ["full_name", "role", "is_active"]}
            if not allowed:
                return False
                
            query = select(User).where(User.id == user_id)
            result = await db.execute(query)
            user = result.scalar_one_or_none()
            
            if not user:
                return False
                
            for key, value in allowed.items():
                setattr(user, key, value)
                
            user.updated_at = func.now()
            await db.commit()
            return True
            
        except Exception:
            await db.rollback()
            return False
    
    def _user_to_dict(self, user: User, include_timestamps: bool = False) -> Optional[Dict[str, Any]]:
        """Convert User model to dictionary"""
        if not user:
            return None
            
        result = {
            "id": user.id,
            "email": user.email,
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "is_active": user.is_active,
            "is_verified": user.is_verified,
            "email_verified": user.email_verified,
            "phone_verified": user.phone_verified,
            "two_factor_enabled": user.two_factor_enabled,
            "preferences": user.preferences
        }
        
        if include_timestamps:
            result.update({
                "created_at": user.created_at.isoformat() if user.created_at else None,
                "updated_at": user.updated_at.isoformat() if user.updated_at else None,
                "last_login": user.last_login.isoformat() if user.last_login else None
            })
            
        return result 
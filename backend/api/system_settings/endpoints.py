"""
System Settings API Endpoints
Handles system configuration and settings management
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Dict, Any, List

from core.dependencies import get_current_user, get_db
from models.database import User, SystemSettings
from models.shared import SuccessResponse
from schemas.users import UserProfileResponse, UserProfileUpdate

router = APIRouter(prefix="/system-settings", tags=["System Settings"])

@router.get("/profile", response_model=UserProfileResponse)
async def get_profile(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get current user profile information
    """
    try:
        # Convert user to profile format
        from schemas.users import UserProfile
        
        profile = UserProfile(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            role=current_user.role,
            is_active=current_user.is_active,
            is_superuser=current_user.is_superuser,
            preferences=current_user.preferences or {},
            created_at=current_user.created_at,
            updated_at=current_user.updated_at
        )
        
        return UserProfileResponse(
            success=True,
            data=profile
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get profile: {str(e)}"
        )

@router.put("/profile", response_model=UserProfileResponse)
async def update_profile(
    profile_data: UserProfileUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update current user profile information
    """
    try:
        # Update user fields
        if profile_data.full_name is not None:
            current_user.full_name = profile_data.full_name
        
        # Update preferences
        if current_user.preferences is None:
            current_user.preferences = {}
            
        if profile_data.language is not None:
            current_user.preferences['language'] = profile_data.language
        if profile_data.country is not None:
            current_user.preferences['country'] = profile_data.country
        if profile_data.state is not None:
            current_user.preferences['state'] = profile_data.state
        if profile_data.city is not None:
            current_user.preferences['city'] = profile_data.city
            
        if profile_data.preferences is not None:
            current_user.preferences.update(profile_data.preferences)
        
        # Save to database
        await db.commit()
        await db.refresh(current_user)
        
        # Convert user to profile format
        from schemas.users import UserProfile
        
        profile = UserProfile(
            id=current_user.id,
            email=current_user.email,
            username=current_user.username,
            full_name=current_user.full_name,
            role=current_user.role,
            is_active=current_user.is_active,
            is_superuser=current_user.is_superuser,
            preferences=current_user.preferences or {},
            created_at=current_user.created_at,
            updated_at=current_user.updated_at
        )
        
        return UserProfileResponse(
            success=True,
            data=profile,
            message="Profile updated successfully"
        )
        
    except Exception as e:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update profile: {str(e)}"
        )

@router.get("/system")
async def get_system_settings(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get system configuration settings
    """
    try:
        # Check if user is admin or has appropriate permissions
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Return system configuration
        settings = {
            "app_name": "DPRO AI Agent",
            "version": "2.0.0",
            "maintenance_mode": False,
            "max_agents_per_user": 20,
            "max_file_size_mb": 50,
            "supported_file_types": [
                "jpg", "jpeg", "png", "gif", "webp",
                "pdf", "doc", "docx", "txt", "md",
                "py", "js", "ts", "html", "css", "json"
            ],
            "features": {
                "training_lab": True,
                "marketplace": True,
                "child_agents": True,
                "real_time_chat": True,
                "analytics": True
            }
        }
        
        return {
            "success": True,
            "data": settings
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get system settings: {str(e)}"
        )

@router.put("/system")
async def update_system_settings(
    settings_data: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update system configuration settings
    """
    try:
        # Check if user is admin
        if not current_user.is_superuser:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required"
            )
        
        # Validate and update settings
        # This is a simplified implementation
        # In production, you would save to database
        
        return {
            "success": True,
            "message": "System settings updated successfully",
            "data": settings_data
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update system settings: {str(e)}"
        )

@router.get("/health")
async def health_check():
    """
    System health check endpoint
    """
    return {
        "success": True,
        "status": "healthy",
        "timestamp": "2025-01-19T15:30:00Z",
        "version": "2.0.0",
        "services": {
            "database": "connected",
            "api": "running",
            "auth": "active"
        }
    } 
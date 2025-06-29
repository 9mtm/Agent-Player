"""
Users API Endpoints
All user management related routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from models.shared import SuccessResponse, UserUpdate, UserResponse
from core.dependencies import get_current_user, get_current_admin
from services.user_service import UserService
from config.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession

# Initialize router and service
router = APIRouter(tags=["Users"])
user_service = UserService()

@router.get("/profile", response_model=SuccessResponse)
async def get_user_profile(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user profile"""
    try:
        profile = await user_service.get_user_profile(db, current_user["user_id"])
        if not profile:
            raise HTTPException(status_code=404, detail="User profile not found")
        
        return SuccessResponse(
            message="Profile retrieved successfully",
            data=profile
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/profile", response_model=SuccessResponse)
async def update_user_profile(
    request: UserUpdate,
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update current user profile"""
    try:
        success = await user_service.update_user_profile(
            db,
            current_user["user_id"], 
            request.dict(exclude_unset=True)
        )
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="Profile updated successfully",
            data={"user_id": current_user["user_id"]}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/settings", response_model=SuccessResponse)
async def get_user_settings(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user settings"""
    try:
        settings = await user_service.get_user_settings(db, current_user["user_id"])
        return SuccessResponse(
            message="Settings retrieved successfully",
            data=settings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings", response_model=SuccessResponse)
async def update_user_settings(
    settings: Dict[str, Any],
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user settings"""
    try:
        success = await user_service.update_user_settings(db, current_user["user_id"], settings)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="Settings updated successfully",
            data=settings
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/preferences", response_model=SuccessResponse)
async def get_user_preferences(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user preferences"""
    try:
        preferences = await user_service.get_user_preferences(db, current_user["user_id"])
        return SuccessResponse(
            message="Preferences retrieved successfully",
            data=preferences
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/preferences", response_model=SuccessResponse)
async def update_user_preferences(
    preferences: Dict[str, Any],
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update user preferences"""
    try:
        success = await user_service.update_user_preferences(db, current_user["user_id"], preferences)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="Preferences updated successfully",
            data=preferences
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/activity", response_model=SuccessResponse)
async def get_user_activity(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user activity log"""
    try:
        activity = await user_service.get_user_activity(db, current_user["user_id"])
        return SuccessResponse(
            message=f"Found {len(activity)} activity records",
            data={"activity": activity, "total": len(activity)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=SuccessResponse)
async def get_user_statistics(
    current_user: Dict = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get user statistics"""
    try:
        stats = await user_service.get_user_statistics_by_id(db, current_user["user_id"])
        return SuccessResponse(
            message="Statistics retrieved successfully",
            data=stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Removed duplicate notifications endpoint - use /api/notifications/ instead

# Admin endpoints
@router.get("/admin/all", response_model=SuccessResponse)
async def get_all_users(
    current_user: Dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        users = await user_service.get_all_users(db)
        return SuccessResponse(
            message=f"Found {len(users)} users",
            data={"users": users, "total": len(users)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/statistics/overview", response_model=SuccessResponse)
async def get_users_overview(
    current_user: Dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get users overview statistics (admin only)"""
    try:
        overview = await user_service.get_users_overview(db)
        return SuccessResponse(
            message="Users overview retrieved",
            data=overview
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/{user_id}", response_model=SuccessResponse)
async def get_user_by_id(
    user_id: int, 
    current_user: Dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get user by ID (admin only)"""
    try:
        user = await user_service.get_user_by_id(db, user_id)
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="User found",
            data=user
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/admin/{user_id}", response_model=SuccessResponse)
async def update_user_by_admin(
    user_id: int,
    request: UserUpdate,
    current_user: Dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Update user by admin"""
    try:
        success = await user_service.update_user_by_admin(
            db,
            user_id, 
            request.dict(exclude_unset=True)
        )
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="User updated successfully",
            data={"user_id": user_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/admin/{user_id}", response_model=SuccessResponse)
async def deactivate_user(
    user_id: int,
    current_user: Dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Deactivate user (admin only)"""
    try:
        # Prevent admin from deactivating themselves
        if user_id == current_user["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        
        success = await user_service.deactivate_user(db, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="User deactivated successfully",
            data={"user_id": user_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/admin/{user_id}/activate", response_model=SuccessResponse)
async def activate_user(
    user_id: int,
    current_user: Dict = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Activate user (admin only)"""
    try:
        success = await user_service.activate_user(db, user_id)
        if not success:
            raise HTTPException(status_code=404, detail="User not found")
        
        return SuccessResponse(
            message="User activated successfully",
            data={"user_id": user_id}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) 
"""
Users API Endpoints
All user management related routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any, List
from models.shared import SuccessResponse, UserUpdate, UserResponse
from core.dependencies import get_current_user, get_current_admin
from services.user_service import UserService

# Initialize router and service
router = APIRouter(prefix="/users", tags=["Users"])
user_service = UserService()

@router.get("/profile", response_model=SuccessResponse)
async def get_user_profile(current_user: Dict = Depends(get_current_user)):
    """Get current user profile"""
    try:
        profile = user_service.get_user_profile(current_user["user_id"])
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
    current_user: Dict = Depends(get_current_user)
):
    """Update current user profile"""
    try:
        success = user_service.update_user_profile(
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
async def get_user_settings(current_user: Dict = Depends(get_current_user)):
    """Get user settings"""
    try:
        settings = user_service.get_user_settings(current_user["user_id"])
        return SuccessResponse(
            message="Settings retrieved successfully",
            data=settings
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/settings", response_model=SuccessResponse)
async def update_user_settings(
    settings: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Update user settings"""
    try:
        success = user_service.update_user_settings(current_user["user_id"], settings)
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
async def get_user_preferences(current_user: Dict = Depends(get_current_user)):
    """Get user preferences"""
    try:
        preferences = user_service.get_user_preferences(current_user["user_id"])
        return SuccessResponse(
            message="Preferences retrieved successfully",
            data=preferences
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/preferences", response_model=SuccessResponse)
async def update_user_preferences(
    preferences: Dict[str, Any],
    current_user: Dict = Depends(get_current_user)
):
    """Update user preferences"""
    try:
        success = user_service.update_user_preferences(current_user["user_id"], preferences)
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
async def get_user_activity(current_user: Dict = Depends(get_current_user)):
    """Get user activity log"""
    try:
        activity = user_service.get_user_activity(current_user["user_id"])
        return SuccessResponse(
            message=f"Found {len(activity)} activity records",
            data={"activity": activity, "total": len(activity)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/statistics", response_model=SuccessResponse)
async def get_user_statistics(current_user: Dict = Depends(get_current_user)):
    """Get user statistics"""
    try:
        stats = user_service.get_user_statistics(current_user["user_id"])
        return SuccessResponse(
            message="Statistics retrieved successfully",
            data=stats
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/notifications", response_model=SuccessResponse)
async def get_user_notifications(current_user: Dict = Depends(get_current_user)):
    """Get user notifications (mock)"""
    try:
        notifications = [
            {"id": 1, "title": "Welcome!", "body": "Thanks for joining.", "read": False, "created_at": "2025-06-24T04:00:00Z"},
            {"id": 2, "title": "Profile Updated", "body": "Your profile was updated.", "read": True, "created_at": "2025-06-23T12:00:00Z"}
        ]
        return SuccessResponse(
            message="Notifications retrieved successfully",
            data={"notifications": notifications, "total": len(notifications)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Admin endpoints
@router.get("/admin/all", response_model=SuccessResponse)
async def get_all_users(current_user: Dict = Depends(get_current_admin)):
    """Get all users (admin only)"""
    try:
        users = user_service.get_all_users()
        return SuccessResponse(
            message=f"Found {len(users)} users",
            data={"users": users, "total": len(users)}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/statistics/overview", response_model=SuccessResponse)
async def get_users_overview(current_user: Dict = Depends(get_current_admin)):
    """Get users overview statistics (admin only)"""
    try:
        overview = user_service.get_users_overview()
        return SuccessResponse(
            message="Users overview retrieved",
            data=overview
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/admin/{user_id}", response_model=SuccessResponse)
async def get_user_by_id(user_id: int, current_user: Dict = Depends(get_current_admin)):
    """Get user by ID (admin only)"""
    try:
        user = user_service.get_user_by_id(user_id)
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
    current_user: Dict = Depends(get_current_admin)
):
    """Update user by admin"""
    try:
        success = user_service.update_user_by_admin(
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
    current_user: Dict = Depends(get_current_admin)
):
    """Deactivate user (admin only)"""
    try:
        # Prevent admin from deactivating themselves
        if user_id == current_user["user_id"]:
            raise HTTPException(status_code=400, detail="Cannot deactivate your own account")
        
        success = user_service.deactivate_user(user_id)
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
    current_user: Dict = Depends(get_current_admin)
):
    """Activate user (admin only)"""
    try:
        success = user_service.activate_user(user_id)
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
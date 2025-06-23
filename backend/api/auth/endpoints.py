"""
Authentication API Endpoints
All authentication related routes
"""

from fastapi import APIRouter, Depends, HTTPException, status
from typing import Dict, Any
from models.shared import LoginRequest, RegisterRequest, TokenRefreshRequest, SuccessResponse
from models.shared import UserResponse, SystemStatus
from core.dependencies import get_current_user, get_current_admin
from services.auth_service import AuthService

# Initialize router and service
router = APIRouter(prefix="/auth", tags=["Authentication"])
auth_service = AuthService()

@router.post("/login", response_model=SuccessResponse)
async def login(request: LoginRequest):
    """User login endpoint"""
    try:
        result = await auth_service.login(request.email, request.password)
        return SuccessResponse(
            message="Login successful",
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Login failed")

@router.post("/register/admin", response_model=SuccessResponse)
async def register_admin(request: RegisterRequest):
    """Register first admin user"""
    try:
        result = await auth_service.register_admin(
            request.email, 
            request.username, 
            request.full_name, 
            request.password
        )
        return SuccessResponse(
            message="Admin registered successfully",
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Registration failed")

@router.get("/me", response_model=SuccessResponse)
async def get_current_user_info(current_user: Dict = Depends(get_current_user)):
    """Get current user information"""
    try:
        user_info = await auth_service.get_current_user_info(current_user)
        return SuccessResponse(
            message="User information retrieved",
            data=user_info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user info")

@router.post("/logout", response_model=SuccessResponse)
async def logout(current_user: Dict = Depends(get_current_user)):
    """User logout"""
    try:
        result = await auth_service.logout(current_user)
        return SuccessResponse(
            message="Logout successful",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Logout failed")

@router.post("/refresh", response_model=SuccessResponse)
async def refresh_token(request: TokenRefreshRequest):
    """Refresh access token"""
    try:
        result = await auth_service.refresh_token(request.refresh_token)
        return SuccessResponse(
            message="Token refreshed successfully",
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Token refresh failed")

@router.get("/system/status", response_model=SuccessResponse)
async def get_system_status():
    """Get authentication system status"""
    try:
        status = auth_service.get_system_status()
        return SuccessResponse(
            message="System status retrieved",
            data=status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get system status")

@router.get("/users", response_model=SuccessResponse)
async def get_users(current_user: Dict = Depends(get_current_admin)):
    """Get all users (admin only)"""
    try:
        users = await auth_service.get_admin_users(current_user)
        return SuccessResponse(
            message=f"Found {len(users)} users",
            data={"users": users}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get users")

@router.get("/sessions", response_model=SuccessResponse)
async def get_active_sessions(current_user: Dict = Depends(get_current_admin)):
    """Get active user sessions (admin only)"""
    try:
        sessions = auth_service.get_active_sessions()
        return SuccessResponse(
            message=f"Found {len(sessions)} active sessions",
            data={"sessions": sessions}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.delete("/sessions/{session_id}", response_model=SuccessResponse)
async def terminate_session(session_id: int, current_user: Dict = Depends(get_current_admin)):
    """Terminate user session (admin only)"""
    try:
        result = auth_service.terminate_session(session_id)
        if result:
            return SuccessResponse(
                message="Session terminated successfully",
                data={"session_id": session_id}
            )
        else:
            raise HTTPException(status_code=404, detail="Session not found")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to terminate session") 
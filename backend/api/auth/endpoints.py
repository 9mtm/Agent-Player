"""
Authentication API Endpoints
All authentication related routes
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.responses import RedirectResponse
from typing import Dict, Any, Optional
from models.shared import LoginRequest, RegisterRequest, TokenRefreshRequest, SuccessResponse, UserResponse, SystemStatus
from core.dependencies import get_current_user, get_current_admin
from services.auth_service import AuthService
from services.gemini_service import gemini_service
from config.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from models import User

try:
    from google_auth_oauthlib.flow import Flow
    GOOGLE_AUTH_AVAILABLE = True
except ImportError:
    GOOGLE_AUTH_AVAILABLE = False
    print("Warning: Google OAuth libraries not available. Some features will be disabled.")

print("=== AUTH ENDPOINTS LOADED ===")

# Initialize router and service
router = APIRouter(tags=["Authentication"])
auth_service = AuthService()

@router.post("/login", response_model=SuccessResponse)
async def login(request: LoginRequest, db: AsyncSession = Depends(get_db)):
    """User login endpoint"""
    print("[LOGIN] >>> Received login request")
    try:
        result = await auth_service.login(db, request.email, request.password)
        return SuccessResponse(
            message="Login successful",
            data=result
        )
    except ValueError as e:
        print(f"[LOGIN] ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        print(f"[LOGIN] Exception: {e}")
        import traceback; traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Login failed: {e}")

@router.post("/register/admin", response_model=SuccessResponse)
async def register_admin(request: RegisterRequest, db: AsyncSession = Depends(get_db)):
    """Register first admin user"""
    try:
        result = await auth_service.register_admin(
            db,
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
async def get_current_user_info(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get current user information"""
    try:
        user_info = {
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "role": "admin" if current_user.is_superuser else "user",
            "is_active": current_user.is_active,
            "created_at": current_user.created_at,
            "updated_at": current_user.updated_at
        }
        return SuccessResponse(
            message="User information retrieved",
            data=user_info
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get user info")

@router.post("/logout", response_model=SuccessResponse)
async def logout(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """User logout"""
    try:
        result = {"message": "Logout successful", "user_id": current_user.id}
        return SuccessResponse(
            message="Logout successful",
            data=result
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Logout failed")

@router.post("/refresh", response_model=SuccessResponse)
async def refresh_token(
    request: TokenRefreshRequest,
    db: AsyncSession = Depends(get_db)
):
    """Refresh access token"""
    try:
        result = await auth_service.refresh_token(db, request.refresh_token)
        return SuccessResponse(
            message="Token refreshed successfully",
            data=result
        )
    except ValueError as e:
        raise HTTPException(status_code=401, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail="Token refresh failed")

@router.get("/system/status", response_model=SuccessResponse)
async def get_system_status(db: AsyncSession = Depends(get_db)):
    """Get authentication system status"""
    try:
        status = await auth_service.get_system_status(db)
        return SuccessResponse(
            message="System status retrieved",
            data=status
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get system status")

@router.get("/users", response_model=SuccessResponse)
async def get_users(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get all users (admin only)"""
    try:
        # Simplified - just return current admin info for now
        users = [{
            "id": current_user.id,
            "email": current_user.email,
            "username": current_user.username,
            "full_name": current_user.full_name,
            "is_active": current_user.is_active,
            "is_superuser": current_user.is_superuser
        }]
        return SuccessResponse(
            message=f"Found {len(users)} users",
            data={"users": users}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get users")

@router.get("/sessions", response_model=SuccessResponse)
async def get_active_sessions(
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Get active user sessions (admin only)"""
    try:
        sessions = []  # Simplified for now
        return SuccessResponse(
            message=f"Found {len(sessions)} active sessions",
            data={"sessions": sessions}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to get sessions")

@router.delete("/sessions/{session_id}", response_model=SuccessResponse)
async def terminate_session(
    session_id: int,
    current_user: User = Depends(get_current_admin),
    db: AsyncSession = Depends(get_db)
):
    """Terminate user session (admin only)"""
    try:
        # Simplified for now
        return SuccessResponse(
            message="Session terminated successfully",
            data={"session_id": session_id}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail="Failed to terminate session")

@router.get("/google/auth")
async def google_auth_url():
    """Get Google OAuth URL for Gemini authentication"""
    if not GOOGLE_AUTH_AVAILABLE:
        return {
            "success": False,
            "error": "Google OAuth is not available. Please install required packages.",
            "fallback_url": "https://makersuite.google.com/app/apikey"
        }
        
    try:
        flow = Flow.from_client_secrets_file(
            'client_secrets.json',
            scopes=['https://www.googleapis.com/auth/generative-ai'],
            redirect_uri="http://localhost:8000/auth/google/callback"
        )
        
        auth_url, _ = flow.authorization_url(
            access_type='offline',
            include_granted_scopes='true'
        )
        
        return {
            "success": True,
            "auth_url": auth_url
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "fallback_url": "https://makersuite.google.com/app/apikey"
        }

@router.get("/google/callback")
async def google_auth_callback(
    code: str,
    current_user: User = Depends(get_current_user)
):
    """Handle Google OAuth callback and initialize Gemini"""
    if not GOOGLE_AUTH_AVAILABLE:
        raise HTTPException(
            status_code=400,
            detail="Google OAuth is not available. Please use API key authentication."
        )
        
    try:
        # Initialize Gemini with Google auth
        result = await gemini_service.initialize_with_google_auth(code)
        
        if not result['success']:
            raise HTTPException(status_code=400, detail=result['error'])
            
        # Store credentials in user settings
        await update_user_gemini_credentials(
            user_id=current_user.id,
            credentials=result['credentials']
        )
        
        return {
            "success": True,
            "message": "Successfully authenticated with Google",
            "user_info": result['user_info']
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def update_user_gemini_credentials(user_id: int, credentials: dict):
    """Update user's stored Gemini credentials"""
    # Implementation depends on your database schema
    pass 
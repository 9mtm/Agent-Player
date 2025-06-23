"""
FastAPI Dependencies
Common dependencies for authentication and validation
"""

from fastapi import Depends, HTTPException, status, Header
from typing import Dict, Any, Optional
from core.security import security
from config.database import db

async def get_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    """Get current authenticated user from JWT token"""
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Extract token from "Bearer <token>"
        scheme, token = authorization.split()
        if scheme.lower() != "bearer":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    user_data = security.get_user_from_token(token)
    if not user_data:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user exists and is active
    query = "SELECT * FROM users WHERE id = ? AND is_active = 1"
    users = db.execute_query(query, (user_data["user_id"],))
    
    if not users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    return user_data

async def get_current_admin(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
    """Ensure current user is admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_optional_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    """Get current user if token is provided (optional authentication)"""
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization)
    except HTTPException:
        return None 
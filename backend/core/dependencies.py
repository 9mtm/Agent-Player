"""
FastAPI Dependencies
Common dependencies for authentication and validation
"""

from fastapi import Depends, HTTPException, status, Header
from typing import Dict, Any, Optional
from core.security import security
from config.database import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from models.user import User

async def get_current_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """Get current authenticated user from JWT token"""
    print(f"🔐 AUTH DEBUG: Starting authentication check")
    print(f"🔐 AUTH DEBUG: Authorization header: {authorization[:50] if authorization else 'None'}...")
    
    if not authorization:
        print(f"🔐 AUTH DEBUG: No authorization header provided")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Extract token from "Bearer <token>"
        print(f"🔐 AUTH DEBUG: Parsing authorization header...")
        scheme, token = authorization.split()
        print(f"🔐 AUTH DEBUG: Scheme: {scheme}, Token: {token[:30]}...")
        
        if scheme.lower() != "bearer":
            print(f"🔐 AUTH DEBUG: Invalid scheme: {scheme}")
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication scheme",
                headers={"WWW-Authenticate": "Bearer"},
            )
    except ValueError as e:
        print(f"🔐 AUTH DEBUG: Error parsing header: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authorization header format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify token
    print(f"🔐 AUTH DEBUG: Verifying JWT token...")
    try:
        user_data = security.get_user_from_token(token)
        print(f"🔐 AUTH DEBUG: Token verification result: {user_data}")
    except Exception as e:
        print(f"🔐 AUTH DEBUG: Token verification error: {e}")
        user_data = None
        
    if not user_data:
        print(f"🔐 AUTH DEBUG: Token verification failed")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user exists and is active
    print(f"🔐 AUTH DEBUG: Checking user in database...")
    print(f"🔐 AUTH DEBUG: Looking for user_id: {user_data.get('user_id')}")
    
    try:
        query = select(User).where(
            User.id == user_data["user_id"],
            User.is_active == True
        )
        result = await db.execute(query)
        user = result.scalar_one_or_none()
        print(f"🔐 AUTH DEBUG: Database query result: {user}")
    except Exception as e:
        print(f"🔐 AUTH DEBUG: Database query error: {e}")
        user = None
    
    if not user:
        print(f"🔐 AUTH DEBUG: User not found or inactive in database")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    
    print(f"🔐 AUTH DEBUG: Authentication successful for user: {user_data.get('email')}")
    return user_data

async def get_current_admin(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Ensure current user is admin"""
    if current_user.get("role") != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user

async def get_optional_user(
    authorization: Optional[str] = Header(None),
    db: AsyncSession = Depends(get_db)
) -> Optional[Dict[str, Any]]:
    """Get current user if token is provided (optional authentication)"""
    if not authorization:
        return None
    
    try:
        return await get_current_user(authorization=authorization, db=db)
    except HTTPException:
        return None 
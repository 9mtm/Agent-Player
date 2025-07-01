"""
User Schemas
Pydantic models for user profile operations
"""

from pydantic import BaseModel, Field, EmailStr
from typing import Optional, Dict, Any
from datetime import datetime

class UserProfileUpdate(BaseModel):
    """Schema for updating user profile"""
    full_name: Optional[str] = Field(None, max_length=200)
    language: Optional[str] = Field(None, max_length=10)
    country: Optional[str] = Field(None, max_length=5)
    state: Optional[str] = Field(None, max_length=10)
    city: Optional[str] = Field(None, max_length=100)
    preferences: Optional[Dict[str, Any]] = None

class UserProfile(BaseModel):
    """User profile response model"""
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    language: Optional[str] = None
    country: Optional[str] = None
    state: Optional[str] = None
    city: Optional[str] = None
    role: str
    is_active: bool
    is_superuser: bool
    preferences: Optional[Dict[str, Any]] = None
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class UserProfileResponse(BaseModel):
    """Response wrapper for user profile"""
    success: bool = True
    data: UserProfile
    message: Optional[str] = None 
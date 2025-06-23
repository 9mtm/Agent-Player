from pydantic import BaseModel, EmailStr
from typing import Optional, Any, Dict

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RegisterRequest(BaseModel):
    email: EmailStr
    username: str
    full_name: Optional[str] = None
    password: str

class TokenRefreshRequest(BaseModel):
    refresh_token: str

class SuccessResponse(BaseModel):
    message: str
    data: Optional[Any] = None

class UserResponse(BaseModel):
    id: int
    email: str
    username: str
    full_name: Optional[str] = None
    role: str
    is_active: bool
    created_at: Optional[str] = None

class SystemStatus(BaseModel):
    status: str
    users_count: int
    active_sessions: int
    last_activity: Optional[str] = None 
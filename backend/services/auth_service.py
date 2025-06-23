"""
Authentication Service
Simplified authentication service using new architecture
"""

from typing import Dict, Any, Optional, List
from datetime import datetime
from core.security import security
from config.database import db

class AuthService:
    """Authentication service for user management"""
    
    def __init__(self):
        self.security = security
        self.db = db
    
    async def login(self, email: str, password: str) -> Dict[str, Any]:
        """Login user and return tokens"""
        try:
            # Get user by email
            query = "SELECT * FROM users WHERE email = ? AND is_active = 1"
            users = self.db.execute_query(query, (email,))
            
            if not users:
                raise ValueError("Invalid email or password")
            
            user = users[0]
            
            # Verify password
            if not self.security.verify_password(password, user["password_hash"]):
                raise ValueError("Invalid email or password")
            
            # Create tokens
            token_data = {
                "user_id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "role": user["role"]
            }
            
            access_token = self.security.create_access_token(token_data)
            refresh_token = self.security.create_refresh_token(token_data)
            
            # Update last login
            self.db.execute_command(
                "UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = ?",
                (user["id"],)
            )
            
            # Log activity
            self._log_activity(user["id"], "login", "User logged in successfully")
            
            return {
                "user": {
                    "id": user["id"],
                    "email": user["email"],
                    "username": user["username"],
                    "full_name": user["full_name"],
                    "role": user["role"]
                },
                "tokens": {
                    "access_token": access_token,
                    "refresh_token": refresh_token,
                    "token_type": "bearer"
                }
            }
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Login failed: {str(e)}")
    
    async def register_admin(self, email: str, username: str, 
                           full_name: str, password: str) -> Dict[str, Any]:
        """Register first admin user"""
        try:
            # Check if admin already exists
            query = "SELECT COUNT(*) as count FROM users WHERE role = 'admin'"
            result = self.db.execute_query(query)
            
            if result[0]["count"] > 0:
                raise ValueError("Admin user already exists")
            
            # Check if email already exists
            query = "SELECT COUNT(*) as count FROM users WHERE email = ?"
            result = self.db.execute_query(query, (email,))
            
            if result[0]["count"] > 0:
                raise ValueError("Email already exists")
            
            # Check if username already exists
            query = "SELECT COUNT(*) as count FROM users WHERE username = ?"
            result = self.db.execute_query(query, (username,))
            
            if result[0]["count"] > 0:
                raise ValueError("Username already exists")
            
            # Hash password
            password_hash = self.security.hash_password(password)
            
            # Create admin user
            query = """
            INSERT INTO users (email, username, full_name, password_hash, role, is_active)
            VALUES (?, ?, ?, ?, 'admin', 1)
            """
            user_id = self.db.execute_command(query, (email, username, full_name, password_hash))
            
            # Log activity
            self._log_activity(user_id, "register", "Admin user registered")
            
            return {
                "user_id": user_id,
                "email": email,
                "username": username,
                "full_name": full_name,
                "role": "admin"
            }
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Admin registration failed: {str(e)}")
    
    async def get_current_user_info(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Get current user information"""
        try:
            query = "SELECT * FROM users WHERE id = ? AND is_active = 1"
            users = self.db.execute_query(query, (user_data["user_id"],))
            
            if not users:
                raise ValueError("User not found")
            
            user = users[0]
            
            return {
                "id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "full_name": user["full_name"],
                "role": user["role"],
                "is_active": bool(user["is_active"]),
                "created_at": user["created_at"],
                "updated_at": user["updated_at"]
            }
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to get user info: {str(e)}")
    
    async def logout(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Logout user"""
        try:
            # Log activity
            self._log_activity(user_data["user_id"], "logout", "User logged out")
            
            return {"message": "Logout successful"}
            
        except Exception as e:
            # Don't fail logout for logging errors
            return {"message": "Logout completed"}
    
    async def refresh_token(self, refresh_token: str) -> Dict[str, Any]:
        """Refresh access token"""
        try:
            # Verify refresh token
            payload = self.security.verify_token(refresh_token)
            
            if not payload or payload.get("type") != "refresh":
                raise ValueError("Invalid refresh token")
            
            # Get user data
            user_id = payload.get("user_id")
            query = "SELECT * FROM users WHERE id = ? AND is_active = 1"
            users = self.db.execute_query(query, (user_id,))
            
            if not users:
                raise ValueError("User not found")
            
            user = users[0]
            
            # Create new access token
            token_data = {
                "user_id": user["id"],
                "email": user["email"],
                "username": user["username"],
                "role": user["role"]
            }
            
            access_token = self.security.create_access_token(token_data)
            
            return {
                "access_token": access_token,
                "token_type": "bearer"
            }
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Token refresh failed: {str(e)}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get authentication system status"""
        try:
            # Get user statistics
            total_users = len(self.db.execute_query("SELECT id FROM users"))
            active_users = len(self.db.execute_query("SELECT id FROM users WHERE is_active = 1"))
            admin_users = len(self.db.execute_query("SELECT id FROM users WHERE role = 'admin'"))
            
            # Get recent activity
            recent_activity = self.db.execute_query(
                "SELECT COUNT(*) as count FROM activity_logs WHERE created_at > datetime('now', '-24 hours')"
            )
            
            return {
                "status": "operational",
                "users": {
                    "total": total_users,
                    "active": active_users,
                    "admin": admin_users
                },
                "activity": {
                    "last_24_hours": recent_activity[0]["count"] if recent_activity else 0
                },
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    async def get_admin_users(self, current_user: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Get all users (admin only)"""
        try:
            if current_user.get("role") != "admin":
                raise ValueError("Admin access required")
            
            query = """
            SELECT id, email, username, full_name, role, is_active, 
                   created_at, updated_at
            FROM users 
            ORDER BY created_at DESC
            """
            users = self.db.execute_query(query)
            
            return users
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to get users: {str(e)}")
    
    def get_active_sessions(self) -> List[Dict[str, Any]]:
        """Get active user sessions"""
        try:
            query = """
            SELECT s.*, u.email, u.username 
            FROM user_sessions s
            JOIN users u ON s.user_id = u.id
            WHERE s.expires_at > datetime('now')
            ORDER BY s.created_at DESC
            """
            return self.db.execute_query(query)
            
        except Exception as e:
            return []
    
    def terminate_session(self, session_id: int) -> bool:
        """Terminate user session"""
        try:
            query = "DELETE FROM user_sessions WHERE id = ?"
            result = self.db.execute_command(query, (session_id,))
            return result > 0
            
        except Exception:
            return False
    
    def _log_activity(self, user_id: int, action: str, details: str):
        """Log user activity"""
        try:
            query = """
            INSERT INTO activity_logs (user_id, action, details)
            VALUES (?, ?, ?)
            """
            self.db.execute_command(query, (user_id, action, details))
        except Exception:
            # Don't fail main operation for logging errors
            pass 
"""
Application Settings
Global configuration for DPRO AI Agent
"""

import os
from typing import List, Dict, Any

class Settings:
    # Application Info
    APP_NAME = "Dpro Agent Player"
    VERSION = "2.0.0"
    DESCRIPTION = "Ultimate AI Agent Player - Advanced Agent Management System"
    
    # Server Configuration
    HOST = "0.0.0.0"
    PORT = 8000
    DEBUG = True
    RELOAD = True
    
    # CORS Settings
    CORS_ORIGINS: List[str] = ["*"]
    CORS_ALLOW_CREDENTIALS = True
    CORS_ALLOW_METHODS = ["*"]
    CORS_ALLOW_HEADERS = ["*"]
    
    # Database
    DATABASE_URL = "sqlite:///data/database.db"
    DATABASE_ECHO = True
    
    # Security
    SECRET_KEY = "dpro-ai-agent-secret-key-2024"
    ACCESS_TOKEN_EXPIRE_MINUTES = 30
    REFRESH_TOKEN_EXPIRE_DAYS = 7
    ALGORITHM = "HS256"
    
    # OpenAI Configuration
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    OPENAI_MODEL = "gpt-3.5-turbo"
    OPENAI_TEMPERATURE = 0.7
    OPENAI_MAX_TOKENS = 1000
    
    # Anthropic Configuration
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    ANTHROPIC_MODEL = "claude-3-sonnet-20240229"
    
    # File Upload
    MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
    ALLOWED_FILE_TYPES = [".txt", ".pdf", ".doc", ".docx"]
    UPLOAD_DIRECTORY = "./files"
    
    # Logging
    LOG_LEVEL = "INFO"
    LOG_FORMAT = "%(asctime)s - %(name)s - %(levelname)s - %(message)s"
    LOG_DIRECTORY = "./logs"
    
    # Cache
    CACHE_TTL = 300  # 5 minutes
    
    # Rate Limiting
    RATE_LIMIT_REQUESTS = 100
    RATE_LIMIT_PERIOD = 60  # seconds

# Global settings instance
settings = Settings()

# Helper functions
def get_database_url() -> str:
    """Get database URL"""
    return settings.DATABASE_URL

def is_debug() -> bool:
    """Check if debug mode is enabled"""
    return settings.DEBUG

def get_cors_settings() -> Dict[str, Any]:
    """Get CORS configuration"""
    return {
        "allow_origins": settings.CORS_ORIGINS,
        "allow_credentials": settings.CORS_ALLOW_CREDENTIALS,
        "allow_methods": settings.CORS_ALLOW_METHODS,
        "allow_headers": settings.CORS_ALLOW_HEADERS,
    } 
"""
Database Configuration
SQLAlchemy database setup and connection management
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config.settings import settings

import logging
import sqlite3
from models.database import Base

# Create logger
logger = logging.getLogger(__name__)

# Create database URL
SQLALCHEMY_DATABASE_URL = settings.DATABASE_URL

# Create async database URL
ASYNC_DATABASE_URL = (
    SQLALCHEMY_DATABASE_URL.replace("sqlite:///", "sqlite+aiosqlite:///")
    if SQLALCHEMY_DATABASE_URL.startswith("sqlite")
    else SQLALCHEMY_DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")
)

# Determine if using SQLite
is_sqlite = SQLALCHEMY_DATABASE_URL.startswith("sqlite")

# Create engine for initialization and migrations
sync_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    # SQLite-specific settings
    connect_args={"check_same_thread": False} if is_sqlite else {},
    # Enable foreign key support for SQLite
    pool_pre_ping=True,
    # Enable SQLite debugging
    echo=True
)

# Enable foreign key support for SQLite
if is_sqlite:
    def _fk_pragma_on_connect(dbapi_con, con_record):
        dbapi_con.execute('pragma foreign_keys=ON')
        # Enable SQLite debugging
        dbapi_con.execute('pragma synchronous=OFF')
        dbapi_con.execute('pragma journal_mode=MEMORY')

    event.listen(sync_engine, 'connect', _fk_pragma_on_connect)

# Create async engine for FastAPI
async_engine = create_async_engine(
    ASYNC_DATABASE_URL,
    connect_args={"check_same_thread": False} if is_sqlite else {},
    pool_pre_ping=True,
    echo=True
)

# Create session factories
AsyncSessionLocal = sessionmaker(
    async_engine, class_=AsyncSession, expire_on_commit=False
)

def init_db():
    """Initialize database with all models"""
    try:
        # Create all tables
        Base.metadata.create_all(bind=sync_engine)
        logger.info("Database initialized successfully")
    except Exception as e:
        logger.error(f"Database initialization error: {e}")
        raise

async def get_db():
    """Dependency for getting async database session"""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

# Initialize database on startup
init_db() 
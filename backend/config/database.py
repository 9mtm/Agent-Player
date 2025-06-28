"""
Database Configuration
SQLAlchemy database setup and connection management
"""

from sqlalchemy import create_engine, event
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from config.settings import settings
from sqlalchemy.engine.url import make_url

import logging
import sqlite3
from models.base import Base

# Import all models to register them with Base metadata
import models

import os
from typing import Generator

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

def get_database_path() -> str:
    """Get the absolute path to the database file from DATABASE_URL"""
    url = make_url(SQLALCHEMY_DATABASE_URL)
    if url.drivername.startswith("sqlite"):
        db_path = url.database
        if not os.path.isabs(db_path):
            db_path = os.path.abspath(db_path)
        os.makedirs(os.path.dirname(db_path), exist_ok=True)
        return db_path
    raise RuntimeError("Only SQLite is supported for get_database_path")

def get_db_connection() -> sqlite3.Connection:
    """Get database connection with proper configuration"""
    db_path = get_database_path()
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON")
    return conn

def get_db() -> Generator[sqlite3.Connection, None, None]:
    """Database dependency for FastAPI"""
    conn = get_db_connection()
    try:
        yield conn
    finally:
        conn.close()

def init_database():
    """Initialize database with required tables"""
    db_path = get_database_path()
    print(f"Database initialized at: {db_path}")
    
    # Check if database exists and has tables
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users'
    """)
    
    if cursor.fetchone() is None:
        print("Database is empty. Please run setup_database_final.py to create tables and test user.")
    else:
        print("Database tables exist and ready to use.")
    
    conn.close()

# Database configuration
DATABASE_CONFIG = {
    "path": SQLALCHEMY_DATABASE_URL,
    "dir": os.path.dirname(SQLALCHEMY_DATABASE_URL),
    "url": SQLALCHEMY_DATABASE_URL,
    "echo": False,  # Set to True for SQL logging
    "check_same_thread": False
}

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
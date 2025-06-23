"""
Database Configuration
SQLite database setup and connection management
"""

import sqlite3
from typing import Dict, List, Any, Optional
import logging
from config.settings import settings

class DatabaseConfig:
    def __init__(self):
        self.db_path = settings.DATABASE_URL.replace("sqlite:///./", "")
        self.logger = logging.getLogger(__name__)
    
    def get_connection(self) -> sqlite3.Connection:
        """Get database connection"""
        try:
            conn = sqlite3.connect(self.db_path)
            conn.row_factory = sqlite3.Row  # Enable dict-like access
            return conn
        except Exception as e:
            self.logger.error(f"Database connection error: {e}")
            raise
    
    def execute_query(self, query: str, params: tuple = ()) -> List[Dict[str, Any]]:
        """Execute SELECT query and return results"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(query, params)
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            self.logger.error(f"Query execution error: {e}")
            raise
    
    def execute_command(self, command: str, params: tuple = ()) -> int:
        """Execute INSERT/UPDATE/DELETE command"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.execute(command, params)
                conn.commit()
                return cursor.lastrowid if cursor.lastrowid else cursor.rowcount
        except Exception as e:
            self.logger.error(f"Command execution error: {e}")
            raise
    
    def execute_many(self, command: str, params_list: List[tuple]) -> int:
        """Execute multiple commands"""
        try:
            with self.get_connection() as conn:
                cursor = conn.cursor()
                cursor.executemany(command, params_list)
                conn.commit()
                return cursor.rowcount
        except Exception as e:
            self.logger.error(f"Batch execution error: {e}")
            raise
    
    def check_table_exists(self, table_name: str) -> bool:
        """Check if table exists"""
        query = """
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
        """
        result = self.execute_query(query, (table_name,))
        return len(result) > 0
    
    def get_table_info(self, table_name: str) -> List[Dict[str, Any]]:
        """Get table structure information"""
        query = f"PRAGMA table_info({table_name})"
        return self.execute_query(query)
    
    def initialize_database(self):
        """Initialize database with required tables"""
        tables = [
            # Users table
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                username TEXT UNIQUE NOT NULL,
                full_name TEXT NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """,
            
            # Agents table
            """
            CREATE TABLE IF NOT EXISTS agents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                description TEXT,
                agent_type TEXT DEFAULT 'main',
                model_provider TEXT DEFAULT 'openai',
                model_name TEXT DEFAULT 'gpt-3.5-turbo',
                system_prompt TEXT,
                temperature REAL DEFAULT 0.7,
                max_tokens INTEGER DEFAULT 1000,
                api_key TEXT,
                parent_agent_id INTEGER,
                user_id INTEGER NOT NULL,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (parent_agent_id) REFERENCES agents(id),
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """,
            
            # Conversations table
            """
            CREATE TABLE IF NOT EXISTS conversations (
                id TEXT PRIMARY KEY,
                title TEXT NOT NULL,
                user_id INTEGER NOT NULL,
                agent_id INTEGER,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id),
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
            """,
            
            # Messages table
            """
            CREATE TABLE IF NOT EXISTS messages (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                conversation_id TEXT NOT NULL,
                content TEXT NOT NULL,
                sender_type TEXT NOT NULL,
                agent_id INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (conversation_id) REFERENCES conversations(id),
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
            """,
            
            # User sessions table
            """
            CREATE TABLE IF NOT EXISTS user_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                session_token TEXT NOT NULL,
                refresh_token TEXT,
                expires_at TIMESTAMP NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """,
            
            # Activity logs table
            """
            CREATE TABLE IF NOT EXISTS activity_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                action TEXT NOT NULL,
                details TEXT,
                ip_address TEXT,
                user_agent TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )
            """
        ]
        
        try:
            with self.get_connection() as conn:
                for table_sql in tables:
                    conn.execute(table_sql)
                conn.commit()
            self.logger.info("Database initialized successfully")
        except Exception as e:
            self.logger.error(f"Database initialization error: {e}")
            raise

# Global database instance
db = DatabaseConfig() 
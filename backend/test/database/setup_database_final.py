#!/usr/bin/env python3
"""
Final Database Setup Script
Creates database in data directory ONLY
Adds test user for API testing
"""

import sqlite3
import os
import hashlib
from datetime import datetime

def hash_password(password: str) -> str:
    """Hash password using SHA-256"""
    return hashlib.sha256(password.encode()).hexdigest()

def setup_database():
    """Setup database with all required tables and test user"""
    
    # Fixed database path - ONLY in data directory (relative to backend)
    db_path = os.path.join("backend", "data", "database.db")
    
    # Ensure data directory exists
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    
    # Remove existing database to start fresh
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"Removed existing database: {db_path}")
    
    print(f"Creating database at: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Create all required tables
    create_tables(cursor)
    
    # Create test user
    create_test_user(cursor)
    
    # Commit and close
    conn.commit()
    conn.close()
    
    print("✅ Database setup completed successfully!")
    print(f"📍 Database location: {os.path.abspath(db_path)}")
    print("👤 Admin user created:")
    print("   Email: me@alarade.at")
    print("   Password: admin123456")
    print("   Type: superuser")
    
    return db_path

def create_tables(cursor):
    """Create all required database tables"""
    
    # Users table - matching SQLAlchemy model
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            is_active BOOLEAN DEFAULT 1,
            is_superuser BOOLEAN DEFAULT 0,
            gemini_auth JSON,
            gemini_api_key VARCHAR(255),
            gemini_auth_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # User profiles table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            user_id INTEGER PRIMARY KEY,
            first_name VARCHAR(100),
            last_name VARCHAR(100),
            avatar_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    
    # Agents table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(200) NOT NULL,
            description TEXT,
            user_id INTEGER NOT NULL,
            agent_type VARCHAR(50) DEFAULT 'conversational',
            model_provider VARCHAR(50) DEFAULT 'openai',
            model_name VARCHAR(100) DEFAULT 'gpt-3.5-turbo',
            system_prompt TEXT,
            temperature DECIMAL(3,2) DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 2048,
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    
    # Conversations table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            agent_id INTEGER,
            title VARCHAR(300),
            status VARCHAR(20) DEFAULT 'active',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
            FOREIGN KEY (agent_id) REFERENCES agents (id) ON DELETE SET NULL
        )
    """)
    
    # Messages table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            content TEXT NOT NULL,
            sender_type VARCHAR(20) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations (id) ON DELETE CASCADE
        )
    """)
    
    # User sessions table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
        )
    """)
    
    print("✅ All tables created successfully")

def create_test_user(cursor):
    """Create admin user for API testing"""
    
    # Admin user credentials (as specified in rules)
    email = "me@alarade.at"
    username = "admin"
    full_name = "Admin User"
    password = "admin123456"
    password_hash = hash_password(password)
    
    # Insert admin user (using is_superuser instead of role)
    cursor.execute("""
        INSERT INTO users (email, username, password_hash, full_name, is_active, is_superuser)
        VALUES (?, ?, ?, ?, 1, 1)
    """, (email, username, password_hash, full_name))
    
    user_id = cursor.lastrowid
    
    # Create user profile
    cursor.execute("""
        INSERT INTO user_profiles (user_id, first_name, last_name)
        VALUES (?, 'Admin', 'User')
    """, (user_id,))
    
    # Create test agent
    cursor.execute("""
        INSERT INTO agents (name, description, user_id, system_prompt)
        VALUES (?, ?, ?, ?)
    """, (
        "Admin Test Agent",
        "Administrator agent for API testing and system management",
        user_id,
        "You are an administrative AI assistant with full system access."
    ))
    
    print("✅ Admin user created successfully")

if __name__ == "__main__":
    setup_database() 
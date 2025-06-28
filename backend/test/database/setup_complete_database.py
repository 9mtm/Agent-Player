#!/usr/bin/env python3
"""
Complete Database Setup Script
Creates all tables with correct schema and sample data
"""

import sqlite3
import hashlib
import os
from datetime import datetime

def create_complete_database():
    """Create complete database with all tables and sample data"""
    
    # Database path
    db_path = "backend/data/database.db"
    
    # Create data directory if it doesn't exist
    os.makedirs("data", exist_ok=True)
    
    # Remove old database if exists
    if os.path.exists(db_path):
        os.remove(db_path)
        print(f"🗑️ Removed old database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print(f"🔧 Creating complete database: {db_path}")
    
    # 1. Create users table
    print("📝 Creating users table...")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            full_name VARCHAR(255),
            is_active BOOLEAN DEFAULT 1,
            is_superuser BOOLEAN DEFAULT 0,
            gemini_auth BOOLEAN DEFAULT 0,
            gemini_api_key TEXT,
            gemini_auth_type VARCHAR(50),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    # 2. Create agents table
    print("📝 Creating agents table...")
    cursor.execute("""
        CREATE TABLE agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name VARCHAR(100) NOT NULL,
            description TEXT,
            agent_type VARCHAR(50) NOT NULL DEFAULT 'main',
            model_provider VARCHAR(50) NOT NULL,
            model_name VARCHAR(100) NOT NULL,
            system_prompt TEXT,
            temperature FLOAT DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 4000,
            api_key VARCHAR(255),
            parent_agent_id INTEGER,
            user_id INTEGER,
            is_active BOOLEAN DEFAULT 1,
            is_local_model BOOLEAN DEFAULT 0,
            local_config JSON,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (parent_agent_id) REFERENCES agents(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # 3. Create activity_logs table
    print("📝 Creating activity_logs table...")
    cursor.execute("""
        CREATE TABLE activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action VARCHAR(100) NOT NULL,
            details TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    """)
    
    # 4. Create conversations table
    print("📝 Creating conversations table...")
    cursor.execute("""
        CREATE TABLE conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            agent_id INTEGER,
            title VARCHAR(300),
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
    """)
    
    # 5. Create messages table
    print("📝 Creating messages table...")
    cursor.execute("""
        CREATE TABLE messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            sender_type VARCHAR(50) NOT NULL,
            content TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (conversation_id) REFERENCES conversations(id)
        )
    """)
    
    # Commit table creation
    conn.commit()
    print("✅ All tables created successfully!")
    
    # Insert admin user
    print("👤 Creating admin user...")
    password = "admin123456"
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    cursor.execute("""
        INSERT INTO users (email, username, password_hash, full_name, is_active, is_superuser)
        VALUES (?, ?, ?, ?, ?, ?)
    """, ("me@alarade.at", "admin", password_hash, "Admin User", 1, 1))
    
    # Insert sample agents
    print("🤖 Creating sample agents...")
    
    # Main agent 1
    cursor.execute("""
        INSERT INTO agents (name, description, agent_type, model_provider, model_name, 
                          system_prompt, temperature, max_tokens, user_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "Customer Service Assistant", 
        "Helpful customer service agent",
        "main",
        "openai",
        "gpt-4",
        "You are a helpful customer service assistant.",
        0.7,
        4000,
        1,
        1
    ))
    
    # Main agent 2
    cursor.execute("""
        INSERT INTO agents (name, description, agent_type, model_provider, model_name, 
                          system_prompt, temperature, max_tokens, user_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "Technical Support Agent", 
        "Technical support specialist",
        "main",
        "anthropic",
        "claude-3",
        "You are a technical support specialist.",
        0.5,
        3000,
        1,
        1
    ))
    
    # Child agent
    cursor.execute("""
        INSERT INTO agents (name, description, agent_type, model_provider, model_name, 
                          system_prompt, temperature, max_tokens, parent_agent_id, user_id, is_active)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        "Product Support Specialist", 
        "Specialized product support",
        "child",
        "openai",
        "gpt-3.5-turbo",
        "You specialize in product support questions.",
        0.6,
        2000,
        1,  # parent_agent_id
        1,  # user_id
        1
    ))
    
    # Commit all data
    conn.commit()
    
    # Verify data
    print("\n📊 Database verification:")
    
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"  Users: {user_count}")
    
    cursor.execute("SELECT COUNT(*) FROM agents")
    agent_count = cursor.fetchone()[0]
    print(f"  Agents: {agent_count}")
    
    cursor.execute("SELECT COUNT(*) FROM agents WHERE agent_type = 'main'")
    main_agents = cursor.fetchone()[0]
    print(f"  Main agents: {main_agents}")
    
    cursor.execute("SELECT COUNT(*) FROM agents WHERE agent_type = 'child'")
    child_agents = cursor.fetchone()[0]
    print(f"  Child agents: {child_agents}")
    
    # Show sample data
    print("\n👤 Admin user:")
    cursor.execute("SELECT id, email, username, is_superuser FROM users WHERE is_superuser = 1")
    admin = cursor.fetchone()
    print(f"  ID: {admin[0]}, Email: {admin[1]}, Username: {admin[2]}, Admin: {admin[3]}")
    
    print("\n🤖 Sample agents:")
    cursor.execute("SELECT id, name, agent_type, model_provider FROM agents LIMIT 5")
    agents = cursor.fetchall()
    for agent in agents:
        print(f"  ID: {agent[0]}, Name: {agent[1]}, Type: {agent[2]}, Provider: {agent[3]}")
    
    conn.close()
    print(f"\n✅ Complete database setup finished: {db_path}")
    print("🔑 Admin credentials: me@alarade.at / admin123456")

if __name__ == "__main__":
    create_complete_database() 
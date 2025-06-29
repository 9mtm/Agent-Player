"""
Database check script
Shows all users and their details
"""

import sqlite3
import os

# Database path
db_path = "dpro_agent.db"

# Check if database file exists
if os.path.exists(db_path):
    print(f"Database file exists: {db_path}")
else:
    print(f"Database file does not exist: {db_path}")
    # Create the directory if it doesn't exist
    os.makedirs("backend/data", exist_ok=True)

# Initialize database
try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    
    # Check tables
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = cursor.fetchall()
    
    print(f"\nExisting tables: {[table[0] for table in tables]}")
    
    # Drop and recreate users table with all columns
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("""
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        is_verified BOOLEAN DEFAULT 0,
        email_verified BOOLEAN DEFAULT 0,
        phone_verified BOOLEAN DEFAULT 0,
        two_factor_enabled BOOLEAN DEFAULT 0,
        last_login TIMESTAMP,
        preferences JSON,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Create admin user
    cursor.execute("""
    INSERT INTO users (
        email, username, full_name, password_hash, role, is_active,
        is_verified, email_verified, phone_verified, two_factor_enabled
    ) VALUES (
        'me@alarade.at', 'admin', 'Admin User',
        '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKrNYbceGPIZjCS',
        'admin', 1, 1, 1, 0, 0
    )
    """)
    
    # Create other essential tables
    cursor.execute("""
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
    """)
    
    cursor.execute("""
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
    """)
    
    conn.commit()
    print("Database tables created successfully!")
    
    # Print all users for debugging
    print("\n=== Users in Database ===")
    cursor.execute("SELECT * FROM users")
    users = cursor.fetchall()
    if users:
        for user in users:
            print(f"\nUser Details:")
            print(f"ID: {user['id']}")
            print(f"Email: {user['email']}")
            print(f"Username: {user['username']}")
            print(f"Full Name: {user['full_name']}")
            print(f"Role: {user['role']}")
            print(f"Is Active: {user['is_active']}")
            print(f"Is Verified: {user['is_verified']}")
            print(f"Email Verified: {user['email_verified']}")
            print(f"Created At: {user['created_at']}")
            print("-" * 50)
    else:
        print("No users found in database!")
    
    # Get total count
    user_count = cursor.execute("SELECT COUNT(*) FROM users").fetchone()[0]
    print(f"\nTotal Users: {user_count}")
    
    conn.close()
    print("\n✅ Database check completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
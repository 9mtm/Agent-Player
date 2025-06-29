import sqlite3
import os

# Database path
db_path = "backend/data/database.db"

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
    
    # Create users table if not exists
    cursor.execute("""
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
    
    # Check if admin user exists
    cursor.execute("SELECT * FROM users WHERE role = 'admin'")
    admin = cursor.fetchone()
    
    if admin:
        print(f"Admin user exists: {admin['email']}")
    else:
        print("No admin user found")
    
    conn.close()
    print("Database check completed!")
    
except Exception as e:
    print(f"Database error: {e}") 
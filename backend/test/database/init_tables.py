"""
Initialize database tables using direct SQL
"""

import sqlite3
import os
import bcrypt
from datetime import datetime

# Database path
db_path = "data/database.db"

# Create the directory if it doesn't exist
os.makedirs("data", exist_ok=True)

# Delete existing database if it exists
if os.path.exists(db_path):
    os.remove(db_path)
    print("✅ Removed old database")

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

try:
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Create users table
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email VARCHAR(255) UNIQUE NOT NULL,
            username VARCHAR(100) UNIQUE NOT NULL,
            full_name VARCHAR(200),
            password_hash VARCHAR(255) NOT NULL,
            role VARCHAR(50) NOT NULL DEFAULT 'user',
            is_active BOOLEAN NOT NULL DEFAULT 1,
            last_activity DATETIME,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
    """)
    print("✅ Created users table")
    
    # Create activity_logs table
    cursor.execute("""
        CREATE TABLE activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            action VARCHAR(100) NOT NULL,
            details VARCHAR(1000),
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    """)
    print("✅ Created activity_logs table")
    
    # Create sessions table
    cursor.execute("""
        CREATE TABLE sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            session_token VARCHAR(255) UNIQUE NOT NULL,
            refresh_token VARCHAR(255) UNIQUE,
            device_info JSON,
            ip_address VARCHAR(50),
            user_agent VARCHAR(500),
            is_active BOOLEAN NOT NULL DEFAULT 1,
            last_activity DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            expires_at DATETIME NOT NULL,
            created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        );
    """)
    print("✅ Created sessions table")
    
    # Create admin user
    now = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
    cursor.execute("""
        INSERT INTO users (
            email, username, full_name, password_hash, role, 
            is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);
    """, (
        "me@alarade.at",
        "admin",
        "Admin User",
        hash_password_bcrypt("admin123456"),
        "admin",
        True,
        now,
        now
    ))
    
    # Commit changes
    conn.commit()
    print("✅ Created admin user")
    print("Email: me@alarade.at")
    print("Password: admin123456")
    
    # Verify the user was created
    cursor.execute("SELECT * FROM users WHERE email = ?", ("me@alarade.at",))
    user = cursor.fetchone()
    if user:
        print("\nVerifying user:")
        print(f"ID: {user[0]}")
        print(f"Email: {user[1]}")
        print(f"Role: {user[5]}")
    
    # Verify table schema
    print("\nTable Schema:")
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    for col in columns:
        print(f"Column: {col[1]} ({col[2]})")
    
    conn.close()
    print("\n✅ Database initialization completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
import sqlite3
import bcrypt
import os
from datetime import datetime

# Correct database path according to settings
db_path = "dpro_agent.db"

# Create the directory if it doesn't exist
os.makedirs("data", exist_ok=True)

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt (same as in security.py)"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

try:
    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    print(f"Working with database: {db_path}")
    
    # Create users table with all columns
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        full_name TEXT NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active INTEGER DEFAULT 1,
        is_verified INTEGER DEFAULT 0,
        email_verified INTEGER DEFAULT 0,
        phone_verified INTEGER DEFAULT 0,
        two_factor_enabled INTEGER DEFAULT 0,
        last_login TIMESTAMP,
        preferences TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Add test user if not exists
    cursor.execute("SELECT * FROM users WHERE email = ?", ("me@alarade.at",))
    user = cursor.fetchone()
    
    if not user:
        # Create test user
        hashed_password = hash_password_bcrypt("admin123456")
        cursor.execute("""
        INSERT INTO users (email, username, full_name, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        """, ("me@alarade.at", "admin", "Admin User", hashed_password, "admin", 1))
        print("Created test user: me@alarade.at / admin123456")
    else:
        print("Test user already exists")
    
    # Commit changes
    conn.commit()
    print("Database updated successfully")
    
except Exception as e:
    print(f"Error: {e}")
finally:
    conn.close() 
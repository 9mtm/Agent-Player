"""
Fix database issues
"""

import sqlite3
import os
import bcrypt
from datetime import datetime

# Database path
db_path = "data/database.db"

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
    
    # Check users table schema
    print("\nChecking users table schema...")
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    column_names = [col[1] for col in columns]
    
    # Check if role column exists
    if 'role' not in column_names:
        print("Adding missing role column...")
        cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(50) NOT NULL DEFAULT 'user';")
        print("✅ Added role column")
    
    # Check if admin user exists
    cursor.execute("SELECT * FROM users WHERE email = ?", ("me@alarade.at",))
    admin = cursor.fetchone()
    
    if not admin:
        print("\nCreating admin user...")
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
        print("✅ Created admin user")
    else:
        print("\nAdmin user already exists")
        print(f"ID: {admin[0]}")
        print(f"Email: {admin[1]}")
        print(f"Role: {admin[5] if len(admin) > 5 else 'unknown'}")
    
    # Commit changes
    conn.commit()
    
    # Show current schema
    print("\nCurrent users table schema:")
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    for col in columns:
        print(f"Column: {col[1]} ({col[2]})")
    
    conn.close()
    print("\n✅ Database check completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
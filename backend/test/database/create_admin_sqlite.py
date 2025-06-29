"""
Create admin user script using sqlite3
"""

import os
import sqlite3
from datetime import datetime

# Ensure data directory exists
os.makedirs("data", exist_ok=True)

# Database path
db_path = "data/database.db"

try:
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Enable foreign key support
    cursor.execute("PRAGMA foreign_keys = ON;")
    
    # Create users table if not exists
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email VARCHAR(255) UNIQUE NOT NULL,
        username VARCHAR(100) UNIQUE NOT NULL,
        full_name VARCHAR(255),
        password_hash VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'user',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
    """)
    
    # Check if admin exists
    cursor.execute("SELECT * FROM users WHERE email = ?", ("me@alarade.at",))
    admin = cursor.fetchone()
    
    if not admin:
        # Create admin user with bcrypt hashed password
        cursor.execute("""
        INSERT INTO users (
            email, username, full_name, password_hash, role, 
            is_active, created_at, updated_at
        ) VALUES (
            ?, ?, ?, ?, ?,
            1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
        """, (
            "me@alarade.at",
            "admin",
            "Admin User",
            "$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewKyBAQ/fzL0tpam",
            "admin"
        ))
        print("✅ Admin user created successfully!")
        print("Email: me@alarade.at")
        print("Password: admin123456")
    else:
        print("✅ Admin user already exists!")
    
    # Print all users
    print("\nAll users in database:")
    cursor.execute("SELECT id, email, role FROM users")
    users = cursor.fetchall()
    for user in users:
        print(f"ID: {user[0]}, Email: {user[1]}, Role: {user[2]}")
    
    # Commit changes and close
    conn.commit()
    conn.close()
    print("\n✅ Database setup completed!")
    
except Exception as e:
    print(f"❌ Error: {str(e)}") 
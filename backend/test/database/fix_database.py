"""
Database fix script
Adds missing columns to the users table
"""

import sqlite3
import os

# Database path
db_path = "data/database.db"

try:
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Add missing role column if it doesn't exist
    cursor.execute("""
        ALTER TABLE users 
        ADD COLUMN role VARCHAR(50) DEFAULT 'user'
    """)
    
    # Update admin user's role
    cursor.execute("""
        UPDATE users 
        SET role = 'admin' 
        WHERE email = 'me@alarade.at'
    """)
    
    # Commit changes
    conn.commit()
    
    print("✅ Database schema fixed!")
    print("Added role column to users table")
    print("Updated admin user role")
    
    # Verify the changes
    cursor.execute("PRAGMA table_info(users);")
    columns = cursor.fetchall()
    
    print("\nCurrent users table schema:")
    for col in columns:
        print(f"Column: {col[1]}, Type: {col[2]}, Default: {col[4]}")
    
    conn.close()
    
except sqlite3.OperationalError as e:
    if "duplicate column name" in str(e):
        print("✅ Role column already exists")
    else:
        print(f"❌ Database error: {e}")
except Exception as e:
    print(f"❌ Unexpected error: {e}") 
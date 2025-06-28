#!/usr/bin/env python3
"""
Check Database Users Script
Verifies users exist in database
"""

import sqlite3
import os
import hashlib

def check_database():
    """Check database content"""
    
    db_path = os.path.join("backend", "data", "database.db")
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found at: {db_path}")
        return
    
    print(f"📍 Checking database: {db_path}")
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("""
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name='users'
    """)
    
    if cursor.fetchone() is None:
        print("❌ Users table doesn't exist")
        conn.close()
        return
    
    # Get all users
    cursor.execute("SELECT id, email, username, role, is_active FROM users")
    users = cursor.fetchall()
    
    print(f"👥 Found {len(users)} users:")
    for user in users:
        print(f"  ID: {user[0]}, Email: {user[1]}, Username: {user[2]}, Role: {user[3]}, Active: {user[4]}")
    
    # Check specific admin user
    cursor.execute("SELECT * FROM users WHERE email = ?", ("me@alarade.at",))
    admin_user = cursor.fetchone()
    
    if admin_user:
        print(f"✅ Admin user found: {admin_user[1]}")
        
        # Test password hash
        test_password = "admin123456"
        test_hash = hashlib.sha256(test_password.encode()).hexdigest()
        stored_hash = admin_user[3]  # password_hash column
        
        print(f"🔐 Password hash match: {test_hash == stored_hash}")
        print(f"   Expected: {test_hash}")
        print(f"   Stored:   {stored_hash}")
        
    else:
        print("❌ Admin user not found")
    
    # Check agents
    cursor.execute("SELECT COUNT(*) FROM agents")
    agent_count = cursor.fetchone()[0]
    print(f"🤖 Found {agent_count} agents")
    
    conn.close()

if __name__ == "__main__":
    check_database() 
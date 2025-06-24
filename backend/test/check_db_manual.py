import sqlite3
import sys

try:
    # Connect to database
    conn = sqlite3.connect('backend/data/database.db')
    cursor = conn.cursor()
    
    # Check if users table exists
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='users'")
    table_exists = cursor.fetchone()
    
    if table_exists:
        print(f"✅ Users table exists")
        
        # Get all users
        cursor.execute("SELECT id, email, username, is_active, role FROM users")
        users = cursor.fetchall()
        
        print(f"📊 Found {len(users)} users:")
        for user in users:
            user_id, email, username, is_active, role = user
            status = "✅ Active" if is_active else "❌ Inactive"
            print(f"   ID: {user_id}, Email: {email}, Username: {username}, Status: {status}, Role: {role}")
            
        # Check specifically for admin user
        cursor.execute("SELECT * FROM users WHERE email = ?", ("me@alarade.at",))
        admin_user = cursor.fetchone()
        
        if admin_user:
            print(f"✅ Admin user found: {admin_user}")
        else:
            print(f"❌ Admin user 'me@alarade.at' not found!")
            
    else:
        print(f"❌ Users table does not exist!")
        
    conn.close()
    
except Exception as e:
    print(f"🔥 Database error: {e}")

print("🏁 Database check complete") 
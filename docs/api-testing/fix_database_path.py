import sqlite3
import bcrypt
import os

# Correct database path according to settings
db_path = "data/database.db"

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
    
    # Create activity_logs table  
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
    print("✅ Tables created successfully!")
    
    # Check if admin user exists
    cursor.execute("SELECT * FROM users WHERE email = 'me@alarade.at'")
    existing_user = cursor.fetchone()
    
    if existing_user:
        print("🔄 Admin user exists, updating password...")
        # Update password
        password_hash = hash_password_bcrypt("admin123456")
        cursor.execute("""
        UPDATE users 
        SET password_hash = ?, updated_at = CURRENT_TIMESTAMP
        WHERE email = 'me@alarade.at'
        """, (password_hash,))
    else:
        print("➕ Creating new admin user...")
        # Create admin user
        password_hash = hash_password_bcrypt("admin123456")
        cursor.execute("""
        INSERT INTO users (email, username, full_name, password_hash, role, is_active)
        VALUES (?, ?, ?, ?, ?, ?)
        """, ("me@alarade.at", "admin", "Admin User", password_hash, "admin", 1))
    
    conn.commit()
    
    # Verify admin user
    cursor.execute("SELECT * FROM users WHERE email = 'me@alarade.at'")
    admin = cursor.fetchone()
    
    if admin:
        print(f"✅ Admin user ready!")
        print(f"   ID: {admin['id']}")
        print(f"   Email: {admin['email']}")
        print(f"   Username: {admin['username']}")
        print(f"   Role: {admin['role']}")
        print(f"   Active: {bool(admin['is_active'])}")
        print(f"   Password hash: {admin['password_hash'][:30]}...")
    
    conn.close()
    print("✅ Database setup completed!")
    
except Exception as e:
    print(f"❌ Error: {e}") 
"""
Create Complete Database for DPRO AI Agent
إنشاء قاعدة البيانات الكاملة مع جميع الجداول المطلوبة
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta
import hashlib
import uuid

def create_complete_database():
    """إنشاء قاعدة البيانات الكاملة"""
    
    # إعداد مسار قاعدة البيانات
    db_path = "data/agents.db"
    backup_path = "data/agents_backup.db"
    
    # محاولة نسخ احتياطية إذا كان الملف موجود
    if os.path.exists(db_path):
        try:
            os.remove(db_path)
            print("✅ تم حذف قاعدة البيانات القديمة")
        except PermissionError:
            print("⚠️ الملف محجوز، سأنشئ ملف جديد...")
            db_path = "data/agents_new.db"
    
    # إنشاء مجلد البيانات
    os.makedirs("data", exist_ok=True)
    
    # الاتصال بقاعدة البيانات
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    print("🗃️ إنشاء جداول قاعدة البيانات...")
    
    # 1. User Management Tables
    print("\n👥 إنشاء جداول إدارة المستخدمين...")
    
    # Users table
    cursor.execute('''
    CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        username TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        full_name TEXT,
        is_active BOOLEAN DEFAULT 1,
        is_superuser BOOLEAN DEFAULT 0,
        role TEXT DEFAULT 'user',
        preferences TEXT DEFAULT '{}',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    ''')
    print("  ✅ جدول users")
    
    # User Profiles table  
    cursor.execute('''
    CREATE TABLE user_profiles (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER UNIQUE NOT NULL,
        first_name TEXT,
        last_name TEXT,
        bio TEXT,
        avatar_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول user_profiles")
    
    # User Sessions table
    cursor.execute('''
    CREATE TABLE user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP NOT NULL,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول user_sessions")
    
    # Activity Logs table
    cursor.execute('''
    CREATE TABLE activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        action TEXT NOT NULL,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول activity_logs")
    
    # 2. AI Agents Tables
    print("\n🤖 إنشاء جداول وكلاء الذكاء الاصطناعي...")
    
    cursor.execute('''
    CREATE TABLE agents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        agent_type TEXT NOT NULL,
        model_provider TEXT NOT NULL,
        model_name TEXT NOT NULL,
        system_prompt TEXT,
        temperature REAL,
        max_tokens INTEGER,
        user_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول agents")
    
    # 3. Chat System Tables
    print("\n💬 إنشاء جداول نظام الدردشة...")
    
    cursor.execute('''
    CREATE TABLE conversations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        agent_id INTEGER,
        title TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (agent_id) REFERENCES agents (id)
    )
    ''')
    print("  ✅ جدول conversations")
    
    cursor.execute('''
    CREATE TABLE messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        conversation_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        sender TEXT NOT NULL,
        message_type TEXT DEFAULT 'text',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (conversation_id) REFERENCES conversations (id)
    )
    ''')
    print("  ✅ جدول messages")
    
    # 4. Task Management Tables
    print("\n✅ إنشاء جداول إدارة المهام...")
    
    cursor.execute('''
    CREATE TABLE tasks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        status TEXT DEFAULT 'pending',
        priority TEXT DEFAULT 'medium',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول tasks")
    
    # 5. Licensing System Tables
    print("\n🔑 إنشاء جداول نظام التراخيص...")
    
    cursor.execute('''
    CREATE TABLE licenses (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_key TEXT UNIQUE NOT NULL,
        license_type TEXT NOT NULL,
        user_id INTEGER,
        is_active BOOLEAN DEFAULT 1,
        expires_at TIMESTAMP,
        max_activations INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول licenses")
    
    cursor.execute('''
    CREATE TABLE license_activations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        license_id INTEGER NOT NULL,
        hardware_fingerprint TEXT NOT NULL,
        device_name TEXT,
        activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_active BOOLEAN DEFAULT 1,
        FOREIGN KEY (license_id) REFERENCES licenses (id)
    )
    ''')
    print("  ✅ جدول license_activations")
    
    # 6. Training Lab Tables
    print("\n🎓 إنشاء جداول مختبر التدريب...")
    
    cursor.execute('''
    CREATE TABLE training_workspaces (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        user_id INTEGER NOT NULL,
        agent_id INTEGER,
        workspace_data TEXT DEFAULT '{}',
        is_active BOOLEAN DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (agent_id) REFERENCES agents (id)
    )
    ''')
    print("  ✅ جدول training_workspaces")
    
    cursor.execute('''
    CREATE TABLE training_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        workspace_id INTEGER NOT NULL,
        session_name TEXT,
        session_data TEXT DEFAULT '{}',
        status TEXT DEFAULT 'pending',
        started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        completed_at TIMESTAMP,
        FOREIGN KEY (workspace_id) REFERENCES training_workspaces (id)
    )
    ''')
    print("  ✅ جدول training_sessions")
    
    # 7. Marketplace Tables  
    print("\n🛒 إنشاء جداول السوق...")
    
    cursor.execute('''
    CREATE TABLE marketplace_items (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        category TEXT,
        price REAL DEFAULT 0.0,
        seller_id INTEGER NOT NULL,
        item_data TEXT DEFAULT '{}',
        is_public BOOLEAN DEFAULT 1,
        downloads_count INTEGER DEFAULT 0,
        rating REAL DEFAULT 0.0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (seller_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول marketplace_items")
    
    cursor.execute('''
    CREATE TABLE marketplace_purchases (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        item_id INTEGER NOT NULL,
        buyer_id INTEGER NOT NULL,
        purchase_price REAL,
        purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (item_id) REFERENCES marketplace_items (id),
        FOREIGN KEY (buyer_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول marketplace_purchases")
    
    # 8. Notifications Tables
    print("\n🔔 إنشاء جداول الإشعارات...")
    
    cursor.execute('''
    CREATE TABLE notifications (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        title TEXT NOT NULL,
        message TEXT,
        notification_type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    ''')
    print("  ✅ جدول notifications")
    
    # إنشاء المستخدم الإداري
    print("\n👑 إنشاء المستخدم الإداري...")
    
    # Hash the password
    password = "admin123456"
    password_hash = hashlib.sha256(password.encode()).hexdigest()
    
    cursor.execute('''
    INSERT INTO users (email, username, password_hash, full_name, role, is_superuser)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        "me@alarade.at",
        "admin", 
        password_hash,
        "System Administrator",
        "admin",
        1
    ))
    
    admin_id = cursor.lastrowid
    
    # إنشاء ملف شخصي للإداري
    cursor.execute('''
    INSERT INTO user_profiles (user_id, first_name, last_name, bio)
    VALUES (?, ?, ?, ?)
    ''', (
        admin_id,
        "System",
        "Administrator", 
        "System administrator account"
    ))
    
    print(f"  ✅ تم إنشاء المستخدم الإداري (ID: {admin_id})")
    
    # إضافة بيانات تجريبية
    print("\n📊 إضافة بيانات تجريبية...")
    
    # إضافة agent تجريبي
    cursor.execute('''
    INSERT INTO agents (name, description, agent_type, model_provider, model_name, user_id)
    VALUES (?, ?, ?, ?, ?, ?)
    ''', (
        "Test Agent",
        "Agent for testing purposes",
        "conversational",
        "openai",
        "gpt-3.5-turbo",
        admin_id
    ))
    
    # إضافة إشعار ترحيبي
    cursor.execute('''
    INSERT INTO notifications (user_id, title, message, notification_type)
    VALUES (?, ?, ?, ?)
    ''', (
        admin_id,
        "مرحباً بك في DPRO AI Agent",
        "تم إنشاء حسابك بنجاح. يمكنك الآن البدء في استخدام النظام.",
        "welcome"
    ))
    
    # حفظ التغييرات
    conn.commit()
    conn.close()
    
    print("\n" + "=" * 60)
    print("🎉 تم إنشاء قاعدة البيانات بنجاح!")
    print("=" * 60)
    print("📧 البريد الإلكتروني: me@alarade.at")
    print("🔑 كلمة المرور: admin123456")
    print("👑 الدور: admin")
    print("=" * 60)

if __name__ == "__main__":
    create_complete_database() 
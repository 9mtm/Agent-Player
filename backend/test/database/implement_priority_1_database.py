"""
DPRO AI Agent - Priority 1 Database Implementation
Implements critical missing tables and columns for immediate API functionality
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta

def implement_priority_1_database():
    """Implement Priority 1 database changes for User API functionality"""
    
    db_path = "data/agents.db"
    
    if not os.path.exists(db_path):
        print("❌ Database not found. Please run create_tables.py first.")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔧 Implementing Priority 1 Database Changes...")
        print("=" * 60)
        
        # 1. Add missing columns to users table
        print("\n📝 Step 1: Enhancing users table...")
        
        # Check existing columns
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [col[1] for col in cursor.fetchall()]
        
        # Add preferences column if missing
        if 'preferences' not in existing_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN preferences TEXT")
            print("  ✅ Added 'preferences' column to users table")
        else:
            print("  ✓ 'preferences' column already exists")
            
        # Add learning_style column if missing
        if 'learning_style' not in existing_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN learning_style TEXT")
            print("  ✅ Added 'learning_style' column to users table")
        else:
            print("  ✓ 'learning_style' column already exists")
            
        # Add preferred_language column if missing  
        if 'preferred_language' not in existing_columns:
            cursor.execute("ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en'")
            print("  ✅ Added 'preferred_language' column to users table")
        else:
            print("  ✓ 'preferred_language' column already exists")
        
        # 2. Create user_preferences table
        print("\n📝 Step 2: Creating user_preferences table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_preferences (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                theme TEXT DEFAULT 'light',
                notifications_enabled BOOLEAN DEFAULT 1,
                language TEXT DEFAULT 'en',
                timezone TEXT DEFAULT 'UTC',
                email_notifications BOOLEAN DEFAULT 1,
                push_notifications BOOLEAN DEFAULT 0,
                auto_save BOOLEAN DEFAULT 1,
                display_density TEXT DEFAULT 'comfortable',
                sidebar_collapsed BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("  ✅ Created user_preferences table")
        
        # 3. Create licensing_info table
        print("\n📝 Step 3: Creating licensing_info table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS licensing_info (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                license_key TEXT UNIQUE NOT NULL,
                license_type TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                features_enabled TEXT, -- JSON string
                expires_at TIMESTAMP,
                hardware_fingerprint TEXT,
                activation_count INTEGER DEFAULT 0,
                max_activations INTEGER DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("  ✅ Created licensing_info table")
        
        # 4. Create user_statistics table
        print("\n📝 Step 4: Creating user_statistics table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS user_statistics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                total_agents_created INTEGER DEFAULT 0,
                total_conversations INTEGER DEFAULT 0,
                total_messages_sent INTEGER DEFAULT 0,
                total_training_time INTEGER DEFAULT 0, -- minutes
                completed_courses INTEGER DEFAULT 0,
                current_streak INTEGER DEFAULT 0,
                longest_streak INTEGER DEFAULT 0,
                last_activity TIMESTAMP,
                join_date TIMESTAMP,
                total_logins INTEGER DEFAULT 0,
                average_session_time INTEGER DEFAULT 0, -- minutes
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("  ✅ Created user_statistics table")
        
        # 5. Create notifications table
        print("\n📝 Step 5: Creating notifications table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                notification_type TEXT DEFAULT 'info', -- info, success, warning, error
                category TEXT DEFAULT 'general', -- general, training, agent, system
                is_read BOOLEAN DEFAULT 0,
                is_sent BOOLEAN DEFAULT 0,
                priority INTEGER DEFAULT 1, -- 1=low, 2=medium, 3=high, 4=urgent
                action_url TEXT,
                action_label TEXT,
                metadata TEXT, -- JSON string
                expires_at TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                read_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """)
        print("  ✅ Created notifications table")
        
        # 6. Initialize default data for existing users
        print("\n📝 Step 6: Initializing data for existing users...")
        
        # Get all existing users
        cursor.execute("SELECT id, email, created_at FROM users")
        users = cursor.fetchall()
        
        for user_id, email, created_at in users:
            # Initialize default preferences
            cursor.execute("""
                INSERT OR IGNORE INTO user_preferences (user_id, theme, language, timezone)
                VALUES (?, 'light', 'en', 'UTC')
            """, (user_id,))
            
            # Initialize user statistics
            cursor.execute("""
                INSERT OR IGNORE INTO user_statistics (
                    user_id, join_date, last_activity, total_logins
                ) VALUES (?, ?, ?, 1)
            """, (user_id, created_at, datetime.now().isoformat()))
            
            # Add default preferences to users table if empty
            cursor.execute("SELECT preferences FROM users WHERE id = ?", (user_id,))
            prefs = cursor.fetchone()[0]
            if not prefs:
                default_prefs = json.dumps({
                    "theme": "light",
                    "language": "en",
                    "notifications": True,
                    "auto_save": True,
                    "tutorial_completed": False
                })
                cursor.execute("""
                    UPDATE users SET preferences = ?, learning_style = 'visual', 
                    preferred_language = 'en' WHERE id = ?
                """, (default_prefs, user_id))
        
        print(f"  ✅ Initialized data for {len(users)} existing users")
        
        # 7. Create essential indexes for performance
        print("\n📝 Step 7: Creating performance indexes...")
        
        indexes = [
            "CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_licensing_user ON licensing_info(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_licensing_status ON licensing_info(status)",
            "CREATE INDEX IF NOT EXISTS idx_user_stats_user ON user_statistics(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_unread ON notifications(user_id, is_read)",
            "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        ]
        
        for index_sql in indexes:
            cursor.execute(index_sql)
        
        print("  ✅ Created performance indexes")
        
        # 8. Create a sample admin license for testing
        print("\n📝 Step 8: Creating sample license for admin user...")
        
        cursor.execute("SELECT id FROM users WHERE email = 'me@alarade.at'")
        admin_user = cursor.fetchone()
        
        if admin_user:
            admin_id = admin_user[0]
            sample_features = json.dumps([
                "training_lab",
                "unlimited_agents", 
                "marketplace_access",
                "advanced_analytics",
                "priority_support"
            ])
            
            cursor.execute("""
                INSERT OR IGNORE INTO licensing_info (
                    user_id, license_key, license_type, status, features_enabled,
                    expires_at, max_activations
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                admin_id, 
                "DPRO-ADMIN-2025-DEMO", 
                "premium", 
                "active", 
                sample_features,
                (datetime.now() + timedelta(days=365)).isoformat(),
                5
            ))
            print("  ✅ Created sample premium license for admin user")
        
        # Commit all changes
        conn.commit()
        
        # 9. Verify implementation
        print("\n📝 Step 9: Verifying implementation...")
        
        # Check all tables exist
        cursor.execute("""
            SELECT name FROM sqlite_master 
            WHERE type='table' AND name IN ('user_preferences', 'licensing_info', 'user_statistics', 'notifications')
        """)
        created_tables = [row[0] for row in cursor.fetchall()]
        
        expected_tables = ['user_preferences', 'licensing_info', 'user_statistics', 'notifications']
        missing_tables = set(expected_tables) - set(created_tables)
        
        if missing_tables:
            print(f"  ❌ Missing tables: {missing_tables}")
            return False
        else:
            print("  ✅ All required tables created successfully")
        
        # Check user preferences data
        cursor.execute("SELECT COUNT(*) FROM user_preferences")
        prefs_count = cursor.fetchone()[0]
        print(f"  ✅ User preferences initialized for {prefs_count} users")
        
        # Check licensing data
        cursor.execute("SELECT COUNT(*) FROM licensing_info")
        license_count = cursor.fetchone()[0]
        print(f"  ✅ Licensing records: {license_count}")
        
        print("\n🎉 Priority 1 Database Implementation Complete!")
        print("=" * 60)
        print("✅ Enhanced users table with new columns")
        print("✅ Created user_preferences table")
        print("✅ Created licensing_info table") 
        print("✅ Created user_statistics table")
        print("✅ Created notifications table")
        print("✅ Added performance indexes")
        print("✅ Initialized data for existing users")
        print("✅ Created sample license for testing")
        
        return True
        
    except Exception as e:
        print(f"❌ Error implementing database changes: {e}")
        conn.rollback()
        return False
        
    finally:
        conn.close()

if __name__ == "__main__":
    success = implement_priority_1_database()
    if success:
        print("\n🚀 Ready to test enhanced User API endpoints!")
        print("   Run: python backend/test/test_users_api.py")
    else:
        print("\n💥 Implementation failed. Check error messages above.") 
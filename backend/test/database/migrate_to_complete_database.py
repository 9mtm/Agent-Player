"""
DPRO AI Agent - Database Migration Script
Adds complete system tables to existing working database
Preserves existing data and schema compatibility
"""

import sqlite3
import os
import json
from datetime import datetime, timedelta

def migrate_to_complete_database():
    """Migrate existing database to complete DPRO AI Agent system"""
    
    db_path = "data/database.db"
    backup_path = "data/database_migration_backup.db"
    
    print("🔄 DPRO AI Agent - Database Migration to Complete System")
    print("=" * 70)
    print(f"📍 Database Location: {os.path.abspath(db_path)}")
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return False
    
    # Create backup
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"✅ Backup created: {backup_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")
        
        print("\n🔍 Checking Current Database Structure...")
        
        # Get existing tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        existing_tables = [row[0] for row in cursor.fetchall()]
        print(f"   Current tables: {len(existing_tables)}")
        
        print("\n🗃️ Adding Missing Tables...")
        
        # Add missing tables one by one
        add_missing_tables(cursor, existing_tables)
        
        print("\n📊 Creating Performance Indexes...")
        create_indexes(cursor)
        
        print("\n📝 Adding Sample Data...")
        add_sample_data(cursor)
        
        conn.commit()
        
        # Verify migration
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        final_tables = [row[0] for row in cursor.fetchall()]
        
        print("\n✅ Migration Verification:")
        print(f"   Tables before: {len(existing_tables)}")
        print(f"   Tables after: {len(final_tables)}")
        print(f"   Tables added: {len(final_tables) - len(existing_tables)}")
        
        print("\n🎉 DATABASE MIGRATION SUCCESSFUL!")
        print("=" * 70)
        print(f"📍 Database Location: {os.path.abspath(db_path)}")
        print(f"📊 Total Tables: {len(final_tables)}")
        print(f"💾 Backup Available: {backup_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Migration error: {e}")
        
        # Restore backup
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, db_path)
            print(f"✅ Database restored from backup")
        
        return False
        
    finally:
        conn.close()

def add_missing_tables(cursor, existing_tables):
    """Add all missing tables for complete system"""
    
    # Define all tables we need
    missing_tables = []
    
    # 1. User Management Tables
    if "user_profiles" not in existing_tables:
        missing_tables.append(("user_profiles", """
            CREATE TABLE user_profiles (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                first_name TEXT,
                last_name TEXT,
                display_name TEXT,
                bio TEXT,
                avatar_url TEXT,
                company TEXT,
                job_title TEXT,
                website_url TEXT,
                location TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    if "user_preferences" not in existing_tables:
        missing_tables.append(("user_preferences", """
            CREATE TABLE user_preferences (
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
                dashboard_layout TEXT,
                quick_actions TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    # 2. Training System Tables
    if "training_courses" not in existing_tables:
        missing_tables.append(("training_courses", """
            CREATE TABLE training_courses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trainer_agent_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                subject TEXT NOT NULL,
                difficulty_level TEXT DEFAULT 'beginner',
                estimated_duration INTEGER,
                prerequisites TEXT,
                learning_outcomes TEXT,
                max_students INTEGER DEFAULT 1000,
                is_active BOOLEAN DEFAULT 1,
                is_public BOOLEAN DEFAULT 1,
                enrollment_count INTEGER DEFAULT 0,
                completion_rate REAL DEFAULT 0.0,
                rating_average REAL DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                tags TEXT,
                category TEXT,
                language TEXT DEFAULT 'en',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trainer_agent_id) REFERENCES agents(id)
            )
        """))
    
    if "course_modules" not in existing_tables:
        missing_tables.append(("course_modules", """
            CREATE TABLE course_modules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                course_id INTEGER NOT NULL,
                module_name TEXT NOT NULL,
                description TEXT,
                order_sequence INTEGER NOT NULL,
                estimated_time INTEGER,
                difficulty_score INTEGER DEFAULT 1,
                prerequisites TEXT,
                learning_objectives TEXT,
                module_content TEXT,
                is_active BOOLEAN DEFAULT 1,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE
            )
        """))
    
    if "student_enrollments" not in existing_tables:
        missing_tables.append(("student_enrollments", """
            CREATE TABLE student_enrollments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER NOT NULL,
                enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                start_date TIMESTAMP,
                completion_date TIMESTAMP,
                status TEXT DEFAULT 'enrolled',
                progress_percentage REAL DEFAULT 0.0,
                current_module_id INTEGER,
                time_spent INTEGER DEFAULT 0,
                final_grade REAL,
                is_certified BOOLEAN DEFAULT 0,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE,
                FOREIGN KEY (current_module_id) REFERENCES course_modules(id)
            )
        """))
    
    if "training_sessions" not in existing_tables:
        missing_tables.append(("training_sessions", """
            CREATE TABLE training_sessions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                course_id INTEGER,
                module_id INTEGER,
                agent_id INTEGER,
                session_name TEXT,
                session_type TEXT DEFAULT 'lesson',
                status TEXT DEFAULT 'active',
                duration_minutes INTEGER DEFAULT 0,
                progress_data TEXT,
                performance_score REAL,
                feedback_provided TEXT,
                started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                completed_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (course_id) REFERENCES training_courses(id),
                FOREIGN KEY (module_id) REFERENCES course_modules(id),
                FOREIGN KEY (agent_id) REFERENCES agents(id)
            )
        """))
    
    # 3. Marketplace Tables
    if "marketplace_items" not in existing_tables:
        missing_tables.append(("marketplace_items", """
            CREATE TABLE marketplace_items (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                seller_id INTEGER NOT NULL,
                name TEXT NOT NULL,
                description TEXT,
                item_type TEXT NOT NULL,
                category TEXT,
                subcategory TEXT,
                price REAL DEFAULT 0.0,
                currency TEXT DEFAULT 'USD',
                pricing_model TEXT DEFAULT 'one_time',
                item_data TEXT,
                preview_data TEXT,
                demo_available BOOLEAN DEFAULT 0,
                status TEXT DEFAULT 'draft',
                is_featured BOOLEAN DEFAULT 0,
                is_free BOOLEAN DEFAULT 0,
                view_count INTEGER DEFAULT 0,
                download_count INTEGER DEFAULT 0,
                purchase_count INTEGER DEFAULT 0,
                rating_average REAL DEFAULT 0.0,
                rating_count INTEGER DEFAULT 0,
                tags TEXT,
                requirements TEXT,
                compatibility TEXT,
                version TEXT DEFAULT '1.0.0',
                seo_title TEXT,
                seo_description TEXT,
                keywords TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                published_at TIMESTAMP,
                FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    if "marketplace_purchases" not in existing_tables:
        missing_tables.append(("marketplace_purchases", """
            CREATE TABLE marketplace_purchases (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                buyer_id INTEGER NOT NULL,
                item_id INTEGER NOT NULL,
                seller_id INTEGER NOT NULL,
                purchase_price REAL NOT NULL,
                currency TEXT DEFAULT 'USD',
                payment_method TEXT,
                transaction_id TEXT,
                status TEXT DEFAULT 'pending',
                license_key TEXT,
                license_type TEXT DEFAULT 'personal',
                max_installations INTEGER DEFAULT 1,
                purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                activated_at TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
                FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    if "marketplace_reviews" not in existing_tables:
        missing_tables.append(("marketplace_reviews", """
            CREATE TABLE marketplace_reviews (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_id INTEGER NOT NULL,
                reviewer_id INTEGER NOT NULL,
                purchase_id INTEGER,
                rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
                title TEXT,
                review_text TEXT,
                is_verified_purchase BOOLEAN DEFAULT 0,
                helpful_count INTEGER DEFAULT 0,
                reported_count INTEGER DEFAULT 0,
                status TEXT DEFAULT 'published',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
                FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (purchase_id) REFERENCES marketplace_purchases(id)
            )
        """))
    
    # 4. Licensing Tables
    if "user_licenses" not in existing_tables:
        missing_tables.append(("user_licenses", """
            CREATE TABLE user_licenses (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                license_key TEXT UNIQUE NOT NULL,
                license_type TEXT NOT NULL,
                status TEXT DEFAULT 'active',
                issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                activated_at TIMESTAMP,
                expires_at TIMESTAMP,
                last_validated TIMESTAMP,
                hardware_fingerprint TEXT,
                max_activations INTEGER DEFAULT 1,
                current_activations INTEGER DEFAULT 0,
                features_enabled TEXT,
                usage_limits TEXT,
                subscription_id TEXT,
                billing_cycle TEXT,
                auto_renew BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    if "license_activations" not in existing_tables:
        missing_tables.append(("license_activations", """
            CREATE TABLE license_activations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                license_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                device_name TEXT,
                device_fingerprint TEXT NOT NULL,
                hardware_info TEXT,
                ip_address TEXT,
                location_info TEXT,
                is_active BOOLEAN DEFAULT 1,
                activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                deactivated_at TIMESTAMP,
                FOREIGN KEY (license_id) REFERENCES user_licenses(id) ON DELETE CASCADE,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    # 5. System Tables
    if "system_settings" not in existing_tables:
        missing_tables.append(("system_settings", """
            CREATE TABLE system_settings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                setting_key TEXT UNIQUE NOT NULL,
                setting_value TEXT,
                setting_type TEXT DEFAULT 'string',
                category TEXT,
                description TEXT,
                is_public BOOLEAN DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
    
    if "notifications" not in existing_tables:
        missing_tables.append(("notifications", """
            CREATE TABLE notifications (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                title TEXT NOT NULL,
                message TEXT NOT NULL,
                notification_type TEXT DEFAULT 'info',
                category TEXT,
                is_read BOOLEAN DEFAULT 0,
                is_sent BOOLEAN DEFAULT 0,
                target_users TEXT,
                delivery_channels TEXT,
                scheduled_for TIMESTAMP,
                sent_at TIMESTAMP,
                action_url TEXT,
                action_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                expires_at TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    # 6. Additional Tables
    if "user_analytics" not in existing_tables:
        missing_tables.append(("user_analytics", """
            CREATE TABLE user_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_date DATE DEFAULT (date('now')),
                additional_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        """))
    
    if "system_analytics" not in existing_tables:
        missing_tables.append(("system_analytics", """
            CREATE TABLE system_analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                metric_name TEXT NOT NULL,
                metric_value REAL NOT NULL,
                metric_category TEXT,
                metric_date DATE DEFAULT (date('now')),
                additional_data TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """))
    
    # Execute table creation
    for table_name, table_sql in missing_tables:
        try:
            cursor.execute(table_sql)
            print(f"  ✅ {table_name}")
        except Exception as e:
            print(f"  ❌ {table_name}: {e}")

def create_indexes(cursor):
    """Create performance indexes"""
    indexes = [
        "CREATE INDEX IF NOT EXISTS idx_user_profiles_user ON user_profiles(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_preferences_user ON user_preferences(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_training_courses_active ON training_courses(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_student_enrollments_user ON student_enrollments(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_student_enrollments_course ON student_enrollments(course_id)",
        "CREATE INDEX IF NOT EXISTS idx_marketplace_items_seller ON marketplace_items(seller_id)",
        "CREATE INDEX IF NOT EXISTS idx_marketplace_items_status ON marketplace_items(status)",
        "CREATE INDEX IF NOT EXISTS idx_user_licenses_user ON user_licenses(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_licenses_key ON user_licenses(license_key)",
        "CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(metric_date)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)",
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    print("  ✅ Performance indexes created")

def add_sample_data(cursor):
    """Add sample data for new tables"""
    
    # Get admin user ID
    cursor.execute("SELECT id FROM users WHERE email = 'me@alarade.at'")
    admin_user = cursor.fetchone()
    
    if admin_user:
        admin_id = admin_user[0]
        
        # Add user profile if it doesn't exist
        cursor.execute("SELECT id FROM user_profiles WHERE user_id = ?", (admin_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO user_profiles (
                    user_id, first_name, last_name, display_name, bio, company, job_title
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                admin_id, "System", "Administrator", "Admin",
                "DPRO AI Agent System Administrator",
                "DPRO", "System Administrator"
            ))
        
        # Add user preferences if it doesn't exist
        cursor.execute("SELECT id FROM user_preferences WHERE user_id = ?", (admin_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO user_preferences (user_id, theme, language, timezone)
                VALUES (?, 'light', 'en', 'UTC')
            """, (admin_id,))
        
        # Add sample license if it doesn't exist
        cursor.execute("SELECT id FROM user_licenses WHERE user_id = ?", (admin_id,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO user_licenses (
                    user_id, license_key, license_type, status, expires_at,
                    features_enabled, usage_limits
                ) VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                admin_id, "ADMIN-FULL-ACCESS-2024", "enterprise", "active",
                datetime.now() + timedelta(days=365),
                json.dumps(["all_features", "unlimited_agents", "premium_models"]),
                json.dumps({"max_agents": -1, "max_conversations": -1})
            ))
        
        # Add system settings if they don't exist
        system_settings = [
            ("site_name", "DPRO AI Agent Platform", "string", "general", "Platform name"),
            ("max_agents_per_user", "50", "integer", "limits", "Maximum agents per user"),
            ("default_model_provider", "openai", "string", "ai", "Default AI model provider"),
            ("maintenance_mode", "false", "boolean", "system", "Maintenance mode status"),
            ("analytics_enabled", "true", "boolean", "features", "Analytics feature enabled"),
        ]
        
        for key, value, setting_type, category, description in system_settings:
            cursor.execute("SELECT id FROM system_settings WHERE setting_key = ?", (key,))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO system_settings (
                        setting_key, setting_value, setting_type, category, description
                    ) VALUES (?, ?, ?, ?, ?)
                """, (key, value, setting_type, category, description))
    
    print("  ✅ Sample data added")

if __name__ == "__main__":
    print("🔄 Starting Database Migration to Complete System...")
    success = migrate_to_complete_database()
    
    if success:
        print("\n🎉 DATABASE MIGRATION COMPLETED SUCCESSFULLY!")
        print("🔧 Ready to restart backend server")
        print("📝 Run: python main.py")
    else:
        print("\n💥 DATABASE MIGRATION FAILED!")
        print("📝 Check error messages above") 
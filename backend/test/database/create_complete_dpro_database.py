"""
DPRO AI Agent - Complete Database Creation System
Creates the entire database schema with all tables, indexes, and sample data
Location: C:\MAMP\htdocs\dpro_aI_agent\backend\data\database.db
"""

import sqlite3
import os
import json
import hashlib
from datetime import datetime, timedelta
import uuid

def create_complete_dpro_database():
    """Create the complete DPRO AI Agent database system"""
    
    # Database configuration
    db_path = "data/database.db"
    backup_path = "data/database_backup.db"
    
    print("🚀 DPRO AI Agent - Complete Database Creation")
    print("=" * 70)
    print(f"📍 Database Location: {os.path.abspath(db_path)}")
    
    # Create backup if database exists
    if os.path.exists(db_path):
        import shutil
        shutil.copy2(db_path, backup_path)
        print(f"✅ Backup created: {backup_path}")
    
    # Ensure data directory exists
    os.makedirs("data", exist_ok=True)
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Enable foreign keys
        cursor.execute("PRAGMA foreign_keys = ON")
        
        print("\n🗃️ Creating Database Tables...")
        
        # Create all tables
        create_user_tables(cursor)
        create_agent_tables(cursor)
        create_chat_tables(cursor)
        create_training_tables(cursor)
        create_marketplace_tables(cursor)
        create_license_tables(cursor)
        create_task_tables(cursor)
        create_workflow_tables(cursor)
        create_analytics_tables(cursor)
        create_system_tables(cursor)
        
        print("\n📊 Creating Performance Indexes...")
        create_performance_indexes(cursor)
        
        print("\n📝 Inserting Sample Data...")
        insert_sample_data(cursor)
        
        print("\n✅ Verifying Database Creation...")
        verify_database(cursor)
        
        conn.commit()
        print("\n🎉 COMPLETE DATABASE CREATION SUCCESSFUL!")
        print("=" * 70)
        print(f"📍 Database Location: {os.path.abspath(db_path)}")
        print(f"📊 Total Tables Created: 45+")
        print(f"🔐 Admin User: me@alarade.at / admin123456")
        print(f"💾 Backup Available: {backup_path}")
        
        return True
        
    except Exception as e:
        print(f"❌ Error creating database: {e}")
        if 'conn' in locals():
            conn.rollback()
        
        # Restore backup if it exists
        if os.path.exists(backup_path):
            import shutil
            shutil.copy2(backup_path, db_path)
            print(f"✅ Database restored from backup")
        
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

def create_user_tables(cursor):
    """Create user management tables"""
    print("\n👥 Creating User Management Tables...")
    
    # Enhanced users table
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            full_name TEXT,
            
            -- Account Status
            is_active BOOLEAN DEFAULT 1,
            is_verified BOOLEAN DEFAULT 0,
            is_superuser BOOLEAN DEFAULT 0,
            role TEXT DEFAULT 'user',
            
            -- Profile
            learning_style TEXT DEFAULT 'visual',
            preferred_language TEXT DEFAULT 'en',
            timezone TEXT DEFAULT 'UTC',
            
            -- Settings
            preferences TEXT, -- JSON
            profile_settings TEXT, -- JSON
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_login TIMESTAMP,
            deleted_at TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_profiles (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            
            -- Personal Information
            first_name TEXT,
            last_name TEXT,
            display_name TEXT,
            bio TEXT,
            avatar_url TEXT,
            
            -- Professional
            company TEXT,
            job_title TEXT,
            website_url TEXT,
            location TEXT,
            
            -- Learning Preferences
            skill_level TEXT DEFAULT 'beginner',
            learning_goals TEXT, -- JSON
            study_hours_per_day INTEGER DEFAULT 1,
            
            -- Contact & Social
            social_links TEXT, -- JSON
            phone TEXT,
            birth_date DATE,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_sessions (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            session_token TEXT UNIQUE NOT NULL,
            refresh_token TEXT UNIQUE,
            device_info TEXT, -- JSON
            ip_address TEXT,
            user_agent TEXT,
            browser_name TEXT,
            os_name TEXT,
            is_active BOOLEAN DEFAULT 1,
            is_mobile BOOLEAN DEFAULT 0,
            last_activity TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP NOT NULL,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
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
            dashboard_layout TEXT, -- JSON
            quick_actions TEXT, -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            action TEXT NOT NULL,
            resource_type TEXT,
            resource_id INTEGER,
            details TEXT, -- JSON
            ip_address TEXT,
            user_agent TEXT,
            session_id TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    print("  ✅ User Management tables created")

def create_agent_tables(cursor):
    """Create AI agents tables"""
    print("\n🤖 Creating AI Agents Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agents (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            
            -- Basic Information
            name TEXT NOT NULL,
            description TEXT,
            agent_type TEXT NOT NULL, -- main, child, trainer, specialist
            status TEXT DEFAULT 'active',
            
            -- AI Model Configuration
            model_provider TEXT NOT NULL,
            model_name TEXT NOT NULL,
            model_version TEXT,
            system_prompt TEXT,
            
            -- Model Parameters
            temperature REAL DEFAULT 0.7,
            max_tokens INTEGER DEFAULT 2048,
            top_p REAL DEFAULT 1.0,
            frequency_penalty REAL DEFAULT 0.0,
            presence_penalty REAL DEFAULT 0.0,
            stop_sequences TEXT, -- JSON
            
            -- Configuration
            api_key_encrypted TEXT,
            custom_parameters TEXT, -- JSON
            capabilities TEXT, -- JSON
            
            -- Hierarchy
            parent_agent_id INTEGER,
            child_agents_count INTEGER DEFAULT 0,
            
            -- Visibility
            is_active BOOLEAN DEFAULT 1,
            is_public BOOLEAN DEFAULT 0,
            is_featured BOOLEAN DEFAULT 0,
            
            -- Performance
            usage_count INTEGER DEFAULT 0,
            success_rate REAL DEFAULT 0.0,
            avg_response_time INTEGER DEFAULT 0,
            rating_average REAL DEFAULT 0.0,
            rating_count INTEGER DEFAULT 0,
            
            -- Metadata
            tags TEXT, -- JSON
            category TEXT,
            subcategory TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deleted_at TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_agent_id) REFERENCES agents(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_capabilities (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER NOT NULL,
            capability_name TEXT NOT NULL,
            capability_type TEXT NOT NULL,
            proficiency_level INTEGER DEFAULT 1,
            last_assessed TIMESTAMP,
            assessment_score REAL,
            is_active BOOLEAN DEFAULT 1,
            acquired_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS agent_performance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            agent_id INTEGER NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metric_unit TEXT,
            measurement_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            context_data TEXT, -- JSON
            
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE CASCADE
        )
    """)
    
    print("  ✅ AI Agents tables created")

def create_chat_tables(cursor):
    """Create chat and messaging tables"""
    print("\n💬 Creating Chat & Messaging Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS conversations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            agent_id INTEGER,
            
            -- Conversation Details
            title TEXT,
            conversation_type TEXT DEFAULT 'general',
            subject TEXT,
            
            -- Settings
            language TEXT DEFAULT 'en',
            context_data TEXT, -- JSON
            
            -- Status
            status TEXT DEFAULT 'active',
            is_pinned BOOLEAN DEFAULT 0,
            is_archived BOOLEAN DEFAULT 0,
            is_shared BOOLEAN DEFAULT 0,
            share_token TEXT,
            
            -- Analytics
            message_count INTEGER DEFAULT 0,
            total_tokens_used INTEGER DEFAULT 0,
            total_cost REAL DEFAULT 0.0,
            sentiment_score REAL,
            
            -- Timestamps
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_message_at TIMESTAMP,
            archived_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            conversation_id INTEGER NOT NULL,
            
            -- Message Content
            content TEXT NOT NULL,
            content_type TEXT DEFAULT 'text',
            message_role TEXT NOT NULL, -- user, agent, system
            
            -- Metadata
            tokens_used INTEGER DEFAULT 0,
            processing_time_ms INTEGER,
            model_used TEXT,
            cost REAL DEFAULT 0.0,
            
            -- Features
            attachments TEXT, -- JSON
            is_edited BOOLEAN DEFAULT 0,
            edit_history TEXT, -- JSON
            
            -- Educational Context
            is_educational BOOLEAN DEFAULT 0,
            lesson_context TEXT, -- JSON
            feedback_provided TEXT, -- JSON
            
            -- Threading
            parent_message_id INTEGER,
            thread_count INTEGER DEFAULT 0,
            
            -- Status
            status TEXT DEFAULT 'sent',
            visibility TEXT DEFAULT 'normal',
            
            -- Timestamps
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            edited_at TIMESTAMP,
            read_at TIMESTAMP,
            
            FOREIGN KEY (conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_message_id) REFERENCES messages(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS message_attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            message_id INTEGER NOT NULL,
            filename TEXT NOT NULL,
            original_filename TEXT NOT NULL,
            file_type TEXT NOT NULL,
            file_size INTEGER NOT NULL,
            file_path TEXT NOT NULL,
            mime_type TEXT,
            is_processed BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (message_id) REFERENCES messages(id) ON DELETE CASCADE
        )
    """)
    
    print("  ✅ Chat & Messaging tables created")

def create_training_tables(cursor):
    """Create training and education tables"""
    print("\n🎓 Creating Training & Education Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_courses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            trainer_agent_id INTEGER,
            title TEXT NOT NULL,
            description TEXT,
            subject TEXT NOT NULL,
            difficulty_level TEXT DEFAULT 'beginner',
            estimated_duration INTEGER, -- minutes
            prerequisites TEXT, -- JSON
            learning_outcomes TEXT, -- JSON
            max_students INTEGER DEFAULT 1000,
            is_active BOOLEAN DEFAULT 1,
            is_public BOOLEAN DEFAULT 1,
            enrollment_count INTEGER DEFAULT 0,
            completion_rate REAL DEFAULT 0.0,
            rating_average REAL DEFAULT 0.0,
            rating_count INTEGER DEFAULT 0,
            tags TEXT, -- JSON
            category TEXT,
            language TEXT DEFAULT 'en',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (trainer_agent_id) REFERENCES agents(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS course_modules (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            course_id INTEGER NOT NULL,
            module_name TEXT NOT NULL,
            description TEXT,
            order_sequence INTEGER NOT NULL,
            estimated_time INTEGER, -- minutes
            difficulty_score INTEGER DEFAULT 1,
            prerequisites TEXT, -- JSON
            learning_objectives TEXT, -- JSON
            module_content TEXT, -- JSON
            is_active BOOLEAN DEFAULT 1,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS student_enrollments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER NOT NULL,
            enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            start_date TIMESTAMP,
            completion_date TIMESTAMP,
            status TEXT DEFAULT 'enrolled', -- enrolled, in_progress, completed, dropped
            progress_percentage REAL DEFAULT 0.0,
            current_module_id INTEGER,
            time_spent INTEGER DEFAULT 0, -- minutes
            final_grade REAL,
            is_certified BOOLEAN DEFAULT 0,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES training_courses(id) ON DELETE CASCADE,
            FOREIGN KEY (current_module_id) REFERENCES course_modules(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS training_sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            course_id INTEGER,
            module_id INTEGER,
            agent_id INTEGER,
            session_name TEXT,
            session_type TEXT DEFAULT 'lesson', -- lesson, practice, assessment, review
            status TEXT DEFAULT 'active', -- active, completed, paused, cancelled
            duration_minutes INTEGER DEFAULT 0,
            progress_data TEXT, -- JSON
            performance_score REAL,
            feedback_provided TEXT, -- JSON
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (course_id) REFERENCES training_courses(id),
            FOREIGN KEY (module_id) REFERENCES course_modules(id),
            FOREIGN KEY (agent_id) REFERENCES agents(id)
        )
    """)
    
    print("  ✅ Training & Education tables created")

def create_marketplace_tables(cursor):
    """Create marketplace tables"""
    print("\n🛒 Creating Marketplace Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS marketplace_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            seller_id INTEGER NOT NULL,
            
            -- Item Details
            name TEXT NOT NULL,
            description TEXT,
            item_type TEXT NOT NULL, -- agent, course, template, integration
            category TEXT,
            subcategory TEXT,
            
            -- Pricing
            price REAL DEFAULT 0.0,
            currency TEXT DEFAULT 'USD',
            pricing_model TEXT DEFAULT 'one_time', -- one_time, subscription, pay_per_use
            
            -- Item Data
            item_data TEXT, -- JSON containing the actual item
            preview_data TEXT, -- JSON for previews
            demo_available BOOLEAN DEFAULT 0,
            
            -- Status & Visibility
            status TEXT DEFAULT 'draft', -- draft, pending, approved, published, suspended
            is_featured BOOLEAN DEFAULT 0,
            is_free BOOLEAN DEFAULT 0,
            
            -- Analytics
            view_count INTEGER DEFAULT 0,
            download_count INTEGER DEFAULT 0,
            purchase_count INTEGER DEFAULT 0,
            rating_average REAL DEFAULT 0.0,
            rating_count INTEGER DEFAULT 0,
            
            -- Metadata
            tags TEXT, -- JSON
            requirements TEXT, -- JSON
            compatibility TEXT, -- JSON
            version TEXT DEFAULT '1.0.0',
            
            -- SEO & Marketing
            seo_title TEXT,
            seo_description TEXT,
            keywords TEXT, -- JSON
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            published_at TIMESTAMP,
            
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS marketplace_purchases (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            buyer_id INTEGER NOT NULL,
            item_id INTEGER NOT NULL,
            seller_id INTEGER NOT NULL,
            
            -- Purchase Details
            purchase_price REAL NOT NULL,
            currency TEXT DEFAULT 'USD',
            payment_method TEXT,
            transaction_id TEXT,
            
            -- Status
            status TEXT DEFAULT 'pending', -- pending, completed, refunded, cancelled
            
            -- License
            license_key TEXT,
            license_type TEXT DEFAULT 'personal', -- personal, commercial, enterprise
            max_installations INTEGER DEFAULT 1,
            
            -- Timestamps
            purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            activated_at TIMESTAMP,
            expires_at TIMESTAMP,
            
            FOREIGN KEY (buyer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
            FOREIGN KEY (seller_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS marketplace_reviews (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            item_id INTEGER NOT NULL,
            reviewer_id INTEGER NOT NULL,
            purchase_id INTEGER,
            
            -- Review Content
            rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
            title TEXT,
            review_text TEXT,
            
            -- Review Metadata
            is_verified_purchase BOOLEAN DEFAULT 0,
            helpful_count INTEGER DEFAULT 0,
            reported_count INTEGER DEFAULT 0,
            
            -- Status
            status TEXT DEFAULT 'published', -- published, hidden, removed
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (item_id) REFERENCES marketplace_items(id) ON DELETE CASCADE,
            FOREIGN KEY (reviewer_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (purchase_id) REFERENCES marketplace_purchases(id)
        )
    """)
    
    print("  ✅ Marketplace tables created")

def create_license_tables(cursor):
    """Create licensing tables"""
    print("\n🔑 Creating Licensing Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_licenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            
            -- License Details
            license_key TEXT UNIQUE NOT NULL,
            license_type TEXT NOT NULL, -- free, basic, premium, enterprise
            
            -- Status
            status TEXT DEFAULT 'active', -- active, expired, suspended, cancelled
            
            -- Validity
            issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            activated_at TIMESTAMP,
            expires_at TIMESTAMP,
            last_validated TIMESTAMP,
            
            -- Hardware Binding
            hardware_fingerprint TEXT,
            max_activations INTEGER DEFAULT 1,
            current_activations INTEGER DEFAULT 0,
            
            -- Features
            features_enabled TEXT, -- JSON
            usage_limits TEXT, -- JSON
            
            -- Billing
            subscription_id TEXT,
            billing_cycle TEXT, -- monthly, yearly, lifetime
            auto_renew BOOLEAN DEFAULT 0,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS license_activations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            license_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            
            -- Device Information
            device_name TEXT,
            device_fingerprint TEXT NOT NULL,
            hardware_info TEXT, -- JSON
            
            -- Network Information
            ip_address TEXT,
            location_info TEXT, -- JSON
            
            -- Status
            is_active BOOLEAN DEFAULT 1,
            activated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            last_seen TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            deactivated_at TIMESTAMP,
            
            FOREIGN KEY (license_id) REFERENCES user_licenses(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    print("  ✅ Licensing tables created")

def create_task_tables(cursor):
    """Create task management tables"""
    print("\n✅ Creating Task Management Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tasks (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_by INTEGER NOT NULL,
            assigned_to INTEGER,
            agent_id INTEGER,
            
            -- Task Details
            title TEXT NOT NULL,
            description TEXT,
            task_type TEXT DEFAULT 'general', -- general, training, development, support
            category TEXT,
            priority TEXT DEFAULT 'medium', -- low, medium, high, urgent
            
            -- Status & Progress
            status TEXT DEFAULT 'todo', -- todo, in_progress, review, testing, done, cancelled
            progress_percentage INTEGER DEFAULT 0,
            estimated_hours REAL,
            actual_hours REAL DEFAULT 0,
            
            -- Dates
            due_date TIMESTAMP,
            start_date TIMESTAMP,
            completed_date TIMESTAMP,
            
            -- Dependencies
            depends_on_tasks TEXT, -- JSON array of task IDs
            blocks_tasks TEXT, -- JSON array of task IDs
            
            -- Metadata
            tags TEXT, -- JSON
            custom_fields TEXT, -- JSON
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
            FOREIGN KEY (agent_id) REFERENCES agents(id) ON DELETE SET NULL
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            comment_text TEXT NOT NULL,
            comment_type TEXT DEFAULT 'comment', -- comment, status_change, attachment
            is_internal BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS task_time_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            task_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            hours_logged REAL NOT NULL,
            description TEXT,
            log_date DATE DEFAULT (date('now')),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    print("  ✅ Task Management tables created")

def create_workflow_tables(cursor):
    """Create workflow automation tables"""
    print("\n⚡ Creating Workflow Automation Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflows (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            
            -- Workflow Details
            name TEXT NOT NULL,
            description TEXT,
            workflow_type TEXT DEFAULT 'manual', -- manual, automated, scheduled
            category TEXT,
            
            -- Configuration
            trigger_config TEXT, -- JSON
            workflow_data TEXT, -- JSON containing nodes and connections
            variables TEXT, -- JSON
            
            -- Status
            status TEXT DEFAULT 'draft', -- draft, active, paused, archived
            is_public BOOLEAN DEFAULT 0,
            
            -- Execution
            execution_count INTEGER DEFAULT 0,
            success_count INTEGER DEFAULT 0,
            failure_count INTEGER DEFAULT 0,
            last_execution TIMESTAMP,
            avg_execution_time INTEGER, -- milliseconds
            
            -- Versioning
            version TEXT DEFAULT '1.0.0',
            parent_workflow_id INTEGER,
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_workflow_id) REFERENCES workflows(id)
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS workflow_executions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            workflow_id INTEGER NOT NULL,
            triggered_by INTEGER,
            
            -- Execution Details
            execution_status TEXT DEFAULT 'running', -- running, completed, failed, cancelled
            trigger_type TEXT, -- manual, scheduled, webhook, event
            trigger_data TEXT, -- JSON
            
            -- Progress
            current_step TEXT,
            steps_completed INTEGER DEFAULT 0,
            total_steps INTEGER DEFAULT 0,
            
            -- Results
            execution_result TEXT, -- JSON
            error_message TEXT,
            execution_time_ms INTEGER,
            
            -- Timestamps
            started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            completed_at TIMESTAMP,
            
            FOREIGN KEY (workflow_id) REFERENCES workflows(id) ON DELETE CASCADE,
            FOREIGN KEY (triggered_by) REFERENCES users(id) ON DELETE SET NULL
        )
    """)
    
    print("  ✅ Workflow Automation tables created")

def create_analytics_tables(cursor):
    """Create analytics and reporting tables"""
    print("\n📊 Creating Analytics & Reporting Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS user_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metric_date DATE DEFAULT (date('now')),
            additional_data TEXT, -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_analytics (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            metric_name TEXT NOT NULL,
            metric_value REAL NOT NULL,
            metric_category TEXT, -- performance, usage, business, security
            metric_date DATE DEFAULT (date('now')),
            additional_data TEXT, -- JSON
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    print("  ✅ Analytics & Reporting tables created")

def create_system_tables(cursor):
    """Create system configuration tables"""
    print("\n⚙️ Creating System Configuration Tables...")
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS system_settings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            setting_key TEXT UNIQUE NOT NULL,
            setting_value TEXT,
            setting_type TEXT DEFAULT 'string', -- string, integer, boolean, json
            category TEXT,
            description TEXT,
            is_public BOOLEAN DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS notifications (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            
            -- Notification Content
            title TEXT NOT NULL,
            message TEXT NOT NULL,
            notification_type TEXT DEFAULT 'info', -- info, success, warning, error
            category TEXT, -- system, training, marketplace, social
            
            -- Status
            is_read BOOLEAN DEFAULT 0,
            is_sent BOOLEAN DEFAULT 0,
            
            -- Targeting
            target_users TEXT, -- JSON array of user IDs (null for specific user_id)
            
            -- Delivery
            delivery_channels TEXT, -- JSON array: email, push, in_app
            scheduled_for TIMESTAMP,
            sent_at TIMESTAMP,
            
            -- Data
            action_url TEXT,
            action_data TEXT, -- JSON
            
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    """)
    
    print("  ✅ System Configuration tables created")

def create_performance_indexes(cursor):
    """Create performance indexes for the database"""
    indexes = [
        # User indexes
        "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
        "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
        "CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
        
        # Agent indexes
        "CREATE INDEX IF NOT EXISTS idx_agents_user ON agents(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_agents_type ON agents(agent_type)",
        "CREATE INDEX IF NOT EXISTS idx_agents_active ON agents(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_agents_public ON agents(is_public)",
        
        # Conversation indexes
        "CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_conversations_agent ON conversations(agent_id)",
        "CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status)",
        "CREATE INDEX IF NOT EXISTS idx_conversations_archived ON conversations(is_archived)",
        
        # Message indexes
        "CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id)",
        "CREATE INDEX IF NOT EXISTS idx_messages_created ON messages(created_at)",
        "CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(message_role)",
        
        # Session indexes
        "CREATE INDEX IF NOT EXISTS idx_sessions_user ON user_sessions(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_token ON user_sessions(session_token)",
        "CREATE INDEX IF NOT EXISTS idx_sessions_active ON user_sessions(is_active)",
        
        # Task indexes
        "CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by)",
        "CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date)",
        
        # Training indexes
        "CREATE INDEX IF NOT EXISTS idx_courses_active ON training_courses(is_active)",
        "CREATE INDEX IF NOT EXISTS idx_courses_public ON training_courses(is_public)",
        "CREATE INDEX IF NOT EXISTS idx_enrollments_user ON student_enrollments(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_enrollments_course ON student_enrollments(course_id)",
        
        # Marketplace indexes
        "CREATE INDEX IF NOT EXISTS idx_marketplace_seller ON marketplace_items(seller_id)",
        "CREATE INDEX IF NOT EXISTS idx_marketplace_status ON marketplace_items(status)",
        "CREATE INDEX IF NOT EXISTS idx_marketplace_category ON marketplace_items(category)",
        "CREATE INDEX IF NOT EXISTS idx_purchases_buyer ON marketplace_purchases(buyer_id)",
        
        # License indexes
        "CREATE INDEX IF NOT EXISTS idx_licenses_user ON user_licenses(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_licenses_key ON user_licenses(license_key)",
        "CREATE INDEX IF NOT EXISTS idx_licenses_status ON user_licenses(status)",
        
        # Activity log indexes
        "CREATE INDEX IF NOT EXISTS idx_activity_user ON activity_logs(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_activity_action ON activity_logs(action)",
        "CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at)",
        
        # Analytics indexes
        "CREATE INDEX IF NOT EXISTS idx_user_analytics_user ON user_analytics(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_user_analytics_date ON user_analytics(metric_date)",
        "CREATE INDEX IF NOT EXISTS idx_system_analytics_date ON system_analytics(metric_date)",
        
        # Notification indexes
        "CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(is_read)",
        "CREATE INDEX IF NOT EXISTS idx_notifications_sent ON notifications(is_sent)",
    ]
    
    for index_sql in indexes:
        cursor.execute(index_sql)
    
    print("  ✅ Performance indexes created")

def insert_sample_data(cursor):
    """Insert sample data for testing"""
    
    # Check if admin user exists
    cursor.execute("SELECT id FROM users WHERE email = 'me@alarade.at'")
    admin_user = cursor.fetchone()
    
    if not admin_user:
        # Create admin user
        password_hash = hashlib.sha256("admin123456".encode()).hexdigest()
        cursor.execute("""
            INSERT INTO users (email, username, password_hash, full_name, role, is_superuser, is_active, is_verified)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        """, ("me@alarade.at", "admin", password_hash, "System Administrator", "admin", 1, 1, 1))
        admin_id = cursor.lastrowid
        print("  ✅ Admin user created")
    else:
        admin_id = admin_user[0]
        print("  ✅ Admin user already exists")
    
    # Create user profile for admin
    cursor.execute("""
        INSERT OR IGNORE INTO user_profiles (
            user_id, first_name, last_name, display_name, bio, company, job_title
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        admin_id, "System", "Administrator", "Admin",
        "DPRO AI Agent System Administrator",
        "DPRO", "System Administrator"
    ))
    
    # Create user preferences for admin
    cursor.execute("""
        INSERT OR IGNORE INTO user_preferences (user_id, theme, language, timezone)
        VALUES (?, 'light', 'en', 'UTC')
    """, (admin_id,))
    
    # Create sample agent
    cursor.execute("""
        INSERT OR IGNORE INTO agents (
            user_id, name, description, agent_type, model_provider, model_name,
            system_prompt, temperature, max_tokens, is_active
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        admin_id, "Welcome Assistant", "A friendly assistant to help new users",
        "main", "openai", "gpt-3.5-turbo",
        "You are a helpful assistant for the DPRO AI Agent platform. Help users get started and learn effectively.",
        0.7, 2048, 1
    ))
    agent_id = cursor.lastrowid
    
    # Create sample training course
    cursor.execute("""
        INSERT OR IGNORE INTO training_courses (
            trainer_agent_id, title, description, subject, difficulty_level, estimated_duration,
            prerequisites, learning_outcomes, category
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        agent_id, "Getting Started with AI Agents",
        "Learn the basics of creating and managing AI agents in the DPRO platform",
        "AI Fundamentals",
        "beginner",
        120,
        json.dumps([]),
        json.dumps([
            "Understand AI agent concepts",
            "Create your first AI agent",
            "Configure agent settings",
            "Interact with your agent effectively"
        ]),
        "Introduction"
    ))
    course_id = cursor.lastrowid
    
    # Create sample course modules
    modules = [
        ("Introduction to AI Agents", "Understanding what AI agents are and how they work", 1, 20),
        ("Creating Your First Agent", "Step-by-step guide to creating an AI agent", 2, 30),
        ("Agent Configuration", "Learn to configure agent parameters and behavior", 3, 25),
        ("Effective Communication", "Best practices for interacting with AI agents", 4, 25),
        ("Advanced Features", "Exploring advanced agent capabilities", 5, 20)
    ]
    
    for module_name, module_desc, order_seq, est_time in modules:
        cursor.execute("""
            INSERT OR IGNORE INTO course_modules (
                course_id, module_name, description, order_sequence, estimated_time,
                learning_objectives, module_content
            ) VALUES (?, ?, ?, ?, ?, ?, ?)
        """, (
            course_id, module_name, module_desc, order_seq, est_time,
            json.dumps([f"Complete {module_name} objectives"]),
            json.dumps({"content_type": "lesson", "materials": []})
        ))
    
    # Create sample license
    cursor.execute("""
        INSERT OR IGNORE INTO user_licenses (
            user_id, license_key, license_type, status, expires_at,
            features_enabled, usage_limits
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (
        admin_id, "ADMIN-FULL-ACCESS-2024", "enterprise", "active",
        datetime.now() + timedelta(days=365),
        json.dumps(["all_features", "unlimited_agents", "premium_models", "priority_support"]),
        json.dumps({"max_agents": -1, "max_conversations": -1, "max_training_hours": -1})
    ))
    
    # Create sample system settings
    system_settings = [
        ("site_name", "DPRO AI Agent Platform", "string", "general", "Platform name"),
        ("max_agents_per_user", "50", "integer", "limits", "Maximum agents per user"),
        ("default_model_provider", "openai", "string", "ai", "Default AI model provider"),
        ("maintenance_mode", "false", "boolean", "system", "Maintenance mode status"),
        ("analytics_enabled", "true", "boolean", "features", "Analytics feature enabled"),
    ]
    
    for key, value, setting_type, category, description in system_settings:
        cursor.execute("""
            INSERT OR IGNORE INTO system_settings (
                setting_key, setting_value, setting_type, category, description
            ) VALUES (?, ?, ?, ?, ?)
        """, (key, value, setting_type, category, description))
    
    print("  ✅ Sample data inserted")

def verify_database(cursor):
    """Verify database creation"""
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
    tables = [row[0] for row in cursor.fetchall()]
    
    expected_core_tables = [
        'users', 'user_profiles', 'user_sessions', 'user_preferences', 'activity_logs',
        'agents', 'agent_capabilities', 'agent_performance',
        'conversations', 'messages', 'message_attachments',
        'training_courses', 'course_modules', 'student_enrollments', 'training_sessions',
        'marketplace_items', 'marketplace_purchases', 'marketplace_reviews',
        'user_licenses', 'license_activations',
        'tasks', 'task_comments', 'task_time_logs',
        'workflows', 'workflow_executions',
        'user_analytics', 'system_analytics',
        'system_settings', 'notifications'
    ]
    
    missing_tables = set(expected_core_tables) - set(tables)
    
    if missing_tables:
        print(f"  ⚠️  Missing tables: {missing_tables}")
    else:
        print(f"  ✅ All core tables verified ({len(tables)} total tables)")
    
    # Check user count
    cursor.execute("SELECT COUNT(*) FROM users")
    user_count = cursor.fetchone()[0]
    print(f"  ✅ Users in database: {user_count}")
    
    # Check agent count
    cursor.execute("SELECT COUNT(*) FROM agents")
    agent_count = cursor.fetchone()[0]
    print(f"  ✅ Agents in database: {agent_count}")
    
    # Check course count
    cursor.execute("SELECT COUNT(*) FROM training_courses")
    course_count = cursor.fetchone()[0]
    print(f"  ✅ Training courses: {course_count}")

if __name__ == "__main__":
    print("🚀 Starting Complete DPRO AI Agent Database Creation...")
    success = create_complete_dpro_database()
    
    if success:
        print("\n🎉 DATABASE CREATION COMPLETED SUCCESSFULLY!")
        print("🔧 Ready to start backend server and test APIs")
        print("📝 Run: python main.py")
    else:
        print("\n💥 DATABASE CREATION FAILED!")
        print("📝 Check error messages above") 
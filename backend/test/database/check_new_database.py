"""
Check the complete DPRO AI Agent database structure
"""
import sqlite3
import os

def check_database():
    db_path = "data/database.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return
    
    print("🔍 Checking Complete DPRO AI Agent Database")
    print("=" * 70)
    print(f"📍 Database Location: {os.path.abspath(db_path)}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Get all tables
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
        tables = cursor.fetchall()
        
        print(f"\n📊 Total Tables Created: {len(tables)}")
        print("=" * 70)
        
        # Group tables by category
        table_categories = {
            "👥 User Management": ["users", "user_profiles", "user_sessions", "user_preferences", "activity_logs"],
            "🤖 AI Agents": ["agents", "agent_capabilities", "agent_performance"],
            "💬 Chat & Messaging": ["conversations", "messages", "message_attachments"],
            "🎓 Training & Education": ["training_courses", "course_modules", "student_enrollments", "training_sessions"],
            "🛒 Marketplace": ["marketplace_items", "marketplace_purchases", "marketplace_reviews"],
            "🔑 Licensing": ["user_licenses", "license_activations"],
            "✅ Task Management": ["tasks", "task_comments", "task_time_logs"],
            "⚡ Workflows": ["workflows", "workflow_executions"],
            "📊 Analytics": ["user_analytics", "system_analytics"],
            "⚙️ System": ["system_settings", "notifications"]
        }
        
        all_table_names = [table[0] for table in tables]
        
        for category, expected_tables in table_categories.items():
            print(f"\n{category}:")
            found_tables = [t for t in expected_tables if t in all_table_names]
            missing_tables = [t for t in expected_tables if t not in all_table_names]
            
            for table in found_tables:
                print(f"  ✅ {table}")
            for table in missing_tables:
                print(f"  ❌ {table}")
        
        # Check for any extra tables
        categorized_tables = []
        for tables_list in table_categories.values():
            categorized_tables.extend(tables_list)
        
        extra_tables = [t for t in all_table_names if t not in categorized_tables and not t.startswith('sqlite_')]
        
        if extra_tables:
            print("\n🔧 Additional Tables:")
            for table in extra_tables:
                print(f"  📋 {table}")
        
        # Check data
        print("\n📝 Data Verification:")
        print("=" * 70)
        
        # Check users
        cursor.execute("SELECT COUNT(*) FROM users")
        user_count = cursor.fetchone()[0]
        print(f"👥 Users: {user_count}")
        
        if user_count > 0:
            cursor.execute("SELECT email, role FROM users LIMIT 1")
            user_data = cursor.fetchone()
            print(f"   Admin User: {user_data[0]} ({user_data[1]})")
        
        # Check agents
        cursor.execute("SELECT COUNT(*) FROM agents")
        agent_count = cursor.fetchone()[0]
        print(f"🤖 Agents: {agent_count}")
        
        # Check training courses
        cursor.execute("SELECT COUNT(*) FROM training_courses")
        course_count = cursor.fetchone()[0]
        print(f"🎓 Training Courses: {course_count}")
        
        # Check licenses
        cursor.execute("SELECT COUNT(*) FROM user_licenses")
        license_count = cursor.fetchone()[0]
        print(f"🔑 User Licenses: {license_count}")
        
        # Check system settings
        cursor.execute("SELECT COUNT(*) FROM system_settings")
        settings_count = cursor.fetchone()[0]
        print(f"⚙️ System Settings: {settings_count}")
        
        print("\n🎉 Database Check Complete!")
        print("✅ Ready for backend server testing")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ Error checking database: {e}")

if __name__ == "__main__":
    check_database() 
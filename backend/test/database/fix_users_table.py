"""
Fix Users Table Schema
Add missing columns to match SQLAlchemy model expectations
"""
import sqlite3
import os

def fix_users_table():
    db_path = "data/database.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return False
    
    # Create backup
    backup_path = "data/database_users_fix_backup.db"
    import shutil
    shutil.copy2(db_path, backup_path)
    print(f"✅ Backup created: {backup_path}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        print("🔧 Adding missing columns to users table...")
        
        # Check current columns first
        cursor.execute("PRAGMA table_info(users)")
        existing_columns = [col[1] for col in cursor.fetchall()]
        print(f"   Current columns: {len(existing_columns)}")
        
        # Add missing columns one by one
        columns_to_add = [
            ("is_superuser", "BOOLEAN DEFAULT 0"),
            ("gemini_auth", "BOOLEAN DEFAULT 0"),
            ("gemini_api_key", "TEXT"),
            ("gemini_auth_type", "TEXT DEFAULT 'disabled'"),
            ("preferences", "TEXT DEFAULT '{}'")
        ]
        
        added_count = 0
        for column_name, column_definition in columns_to_add:
            if column_name not in existing_columns:
                try:
                    cursor.execute(f"ALTER TABLE users ADD COLUMN {column_name} {column_definition}")
                    print(f"   ✅ Added: {column_name}")
                    added_count += 1
                except Exception as e:
                    print(f"   ❌ Failed to add {column_name}: {e}")
            else:
                print(f"   ⏭️  Skipped: {column_name} (already exists)")
        
        # Commit changes
        conn.commit()
        
        # Verify changes
        cursor.execute("PRAGMA table_info(users)")
        final_columns = cursor.fetchall()
        
        print(f"\n📊 Results:")
        print(f"   Columns before: {len(existing_columns)}")
        print(f"   Columns after: {len(final_columns)}")
        print(f"   Columns added: {added_count}")
        
        print(f"\n✅ Final users table structure:")
        for col in final_columns:
            print(f"     {col[1]} ({col[2]}) - {'NULL' if col[3] == 0 else 'NOT NULL'}")
        
        conn.close()
        
        print(f"\n🎉 Users table fixed successfully!")
        print(f"💾 Backup available: {backup_path}")
        return True
        
    except Exception as e:
        print(f"❌ Error fixing users table: {e}")
        
        # Restore backup if something went wrong
        if os.path.exists(backup_path):
            shutil.copy2(backup_path, db_path)
            print(f"✅ Database restored from backup")
        
        return False

if __name__ == "__main__":
    print("🔧 Fixing Users Table Schema...")
    success = fix_users_table()
    
    if success:
        print("\n🎉 USERS TABLE FIXED SUCCESSFULLY!")
        print("🔄 Now restart the backend server")
        print("📝 Run: python main.py")
    else:
        print("\n💥 USERS TABLE FIX FAILED!")
        print("📝 Check error messages above") 
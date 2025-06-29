"""
Simple Database Schema Checker
Check current database structure and identify mismatches with SQLAlchemy models
"""
import sqlite3
import os

def check_database_schema():
    db_path = "data/database.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database not found: {db_path}")
        return
    
    print("🔍 Database Schema Analysis")
    print("=" * 50)
    
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Check users table specifically (since that's causing the error)
    print("\n👤 USERS TABLE STRUCTURE:")
    cursor.execute("PRAGMA table_info(users)")
    users_columns = cursor.fetchall()
    
    actual_columns = [col[1] for col in users_columns]
    print("  Actual columns:")
    for col in users_columns:
        print(f"    {col[1]} ({col[2]}) - {'NULL' if col[3] == 0 else 'NOT NULL'}")
    
    # Expected columns based on error messages
    expected_columns = [
        'id', 'email', 'username', 'password_hash', 'full_name', 
        'is_active', 'is_superuser', 'role', 'gemini_auth', 
        'gemini_api_key', 'gemini_auth_type', 'preferences', 
        'created_at', 'updated_at'
    ]
    
    print("\n  🔍 Column Analysis:")
    missing_columns = []
    for col in expected_columns:
        if col in actual_columns:
            print(f"    ✅ {col} - EXISTS")
        else:
            print(f"    ❌ {col} - MISSING")
            missing_columns.append(col)
    
    print(f"\n📊 Summary:")
    print(f"  Total columns in database: {len(actual_columns)}")
    print(f"  Expected columns: {len(expected_columns)}")
    print(f"  Missing columns: {len(missing_columns)}")
    
    if missing_columns:
        print(f"\n🛠️  Missing columns that need to be added:")
        for col in missing_columns:
            print(f"    - {col}")
    
    # Check all tables
    print(f"\n📋 ALL TABLES IN DATABASE:")
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
    tables = cursor.fetchall()
    for i, (table,) in enumerate(tables, 1):
        print(f"  {i:2d}. {table}")
    
    print(f"\n✅ Total tables: {len(tables)}")
    
    conn.close()

if __name__ == "__main__":
    check_database_schema() 
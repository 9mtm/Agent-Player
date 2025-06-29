"""
Database schema check script
Shows the actual table schema in SQLite
"""

import sqlite3
import os

# Database path
db_path = "data/database.db"

try:
    # Check if database exists
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        exit(1)
    
    # Connect to database
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # Get list of tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("\n=== Database Schema ===")
    
    for table in tables:
        table_name = table[0]
        print(f"\nTable: {table_name}")
        print("-" * 50)
        
        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        
        for col in columns:
            col_id, name, type_, notnull, default, pk = col
            print(f"Column: {name}")
            print(f"Type: {type_}")
            print(f"Not Null: {bool(notnull)}")
            print(f"Default: {default}")
            print(f"Primary Key: {bool(pk)}")
            print("-" * 30)
    
    conn.close()
    print("\n✅ Schema check completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
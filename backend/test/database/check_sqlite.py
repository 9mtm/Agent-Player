"""
Check SQLite database directly
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
    
    # Get all tables
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    
    print("\n=== Tables in Database ===")
    for table in tables:
        table_name = table[0]
        print(f"\nTable: {table_name}")
        print("-" * 50)
        
        # Get table schema
        cursor.execute(f"PRAGMA table_info({table_name});")
        columns = cursor.fetchall()
        print("Schema:")
        for col in columns:
            print(f"- {col[1]} ({col[2]})")
        
        # Get row count
        cursor.execute(f"SELECT COUNT(*) FROM {table_name};")
        count = cursor.fetchone()[0]
        print(f"\nRow count: {count}")
        
        # Show sample data if table has rows
        if count > 0:
            cursor.execute(f"SELECT * FROM {table_name} LIMIT 1;")
            row = cursor.fetchone()
            print("\nSample row:")
            for i, col in enumerate(columns):
                print(f"- {col[1]}: {row[i]}")
    
    conn.close()
    print("\n✅ Database check completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
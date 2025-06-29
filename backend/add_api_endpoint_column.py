#!/usr/bin/env python3
"""
Add api_endpoint column to agents table
"""

import sqlite3
from pathlib import Path

def add_api_endpoint_column():
    """Add api_endpoint column to agents table"""
    db_path = Path("data/database.db")
    
    if not db_path.exists():
        print(f"❌ Database file not found: {db_path}")
        return False
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if column already exists
        cursor.execute("PRAGMA table_info(agents)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'api_endpoint' in column_names:
            print("✅ Column api_endpoint already exists!")
            return True
        
        # Add api_endpoint column
        cursor.execute("ALTER TABLE agents ADD COLUMN api_endpoint VARCHAR(500);")
        conn.commit()
        
        print("✅ Successfully added api_endpoint column to agents table")
        
        # Verify the column was added
        cursor.execute("PRAGMA table_info(agents)")
        columns = cursor.fetchall()
        column_names = [col[1] for col in columns]
        
        if 'api_endpoint' in column_names:
            print("✅ Column verified successfully!")
        else:
            print("❌ Column verification failed!")
            
        conn.close()
        return True
        
    except Exception as e:
        print(f"❌ Error adding column: {e}")
        return False

if __name__ == "__main__":
    add_api_endpoint_column() 
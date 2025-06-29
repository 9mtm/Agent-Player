"""
Compare SQLAlchemy model with actual database schema
"""

import sqlite3
from sqlalchemy import create_engine, inspect
from models.database import Base, User

def get_sqlite_schema():
    """Get schema from SQLite database"""
    conn = sqlite3.connect("data/database.db")
    cursor = conn.cursor()
    
    # Get users table schema
    cursor.execute("PRAGMA table_info(users)")
    columns = {row[1]: {
        "type": row[2],
        "notnull": bool(row[3]),
        "pk": bool(row[5])
    } for row in cursor.fetchall()}
    
    conn.close()
    return columns

def get_sqlalchemy_schema():
    """Get schema from SQLAlchemy model"""
    engine = create_engine("sqlite:///data/database.db")
    inspector = inspect(engine)
    
    # Get users table columns
    columns = {col['name']: {
        "type": str(col['type']),
        "notnull": not col['nullable'],
        "pk": col['primary_key']
    } for col in inspector.get_columns('users')}
    
    return columns

def compare_schemas():
    """Compare the two schemas"""
    sqlite_schema = get_sqlite_schema()
    sqlalchemy_schema = get_sqlalchemy_schema()
    
    print("SQLite Schema:")
    for col, details in sqlite_schema.items():
        print(f"{col}: {details}")
    
    print("\nSQLAlchemy Schema:")
    for col, details in sqlalchemy_schema.items():
        print(f"{col}: {details}")
    
    # Find differences
    sqlite_cols = set(sqlite_schema.keys())
    sqlalchemy_cols = set(sqlalchemy_schema.keys())
    
    missing_in_db = sqlalchemy_cols - sqlite_cols
    missing_in_model = sqlite_cols - sqlalchemy_cols
    
    if missing_in_db:
        print("\nColumns in model but not in database:")
        for col in missing_in_db:
            print(f"- {col}")
    
    if missing_in_model:
        print("\nColumns in database but not in model:")
        for col in missing_in_model:
            print(f"- {col}")

if __name__ == "__main__":
    compare_schemas() 
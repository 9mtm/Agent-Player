"""
Database check script
Shows all users and their details
"""

from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from models import Base
from models.user import User

# Database path
db_path = "data/database.db"

try:
    # Create database URL
    database_url = f"sqlite:///{db_path}"
    
    # Create engine
    engine = create_engine(database_url)
    
    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Get all users
    print("\n=== Users in Database ===")
    users = session.query(User).all()
    if users:
        for user in users:
            print(f"\nUser Details:")
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
            print(f"Username: {user.username}")
            print(f"Full Name: {user.full_name}")
            print(f"Role: {user.role}")
            print(f"Is Active: {user.is_active}")
            print(f"Is Verified: {user.is_verified}")
            print(f"Created At: {user.created_at}")
            print("-" * 50)
    else:
        print("No users found in database!")
    
    # Get total count
    user_count = session.query(User).count()
    print(f"\nTotal Users: {user_count}")
    
    session.close()
    print("\n✅ Database check completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
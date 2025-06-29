"""
Database initialization script
Creates tables and admin user
"""

import os
import bcrypt
from datetime import datetime
from sqlalchemy import create_engine, text, inspect
from sqlalchemy.orm import sessionmaker
from models.database import Base, User, Session, Agent, AgentType, Conversation, Message, ActivityLog

# Database path
db_path = "data/database.db"

# Create the directory if it doesn't exist
os.makedirs("data", exist_ok=True)

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

try:
    # Create database URL
    database_url = f"sqlite:///{db_path}"
    
    # Create engine
    engine = create_engine(database_url)
    
    # Get inspector
    inspector = inspect(engine)
    
    # Create tables only if they don't exist
    Base.metadata.create_all(bind=engine)
    print("✅ Database tables verified!")
    
    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Check if admin user exists
    admin = session.query(User).filter_by(email="me@alarade.at").first()
    
    if not admin:
        # Create admin user
        password_hash = hash_password_bcrypt("admin123456")
        admin = User(
            email="me@alarade.at",
            username="admin",
            full_name="Admin User",
            password_hash=password_hash,
            role="admin",
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        session.add(admin)
        session.commit()
        print("✅ Admin user created successfully!")
        print("Email: me@alarade.at")
        print("Password: admin123456")
    else:
        print("✅ Admin user already exists!")
    
    # Print all users for debugging
    print("\nAll users in database:")
    users = session.query(User).all()
    for user in users:
        print(f"ID: {user.id}, Email: {user.email}, Role: {user.role}")
    
    session.close()
    print("✅ Database initialization completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
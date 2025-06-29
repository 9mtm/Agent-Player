"""
Database recreation script
Creates a fresh database with the correct schema
"""

import os
import bcrypt
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.database import Base, User

# Database path
db_path = "data/database.db"

# Create the directory if it doesn't exist
os.makedirs("data", exist_ok=True)

# Delete existing database if it exists
if os.path.exists(db_path):
    os.remove(db_path)
    print("✅ Removed old database")

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
    
    # Create all tables
    Base.metadata.create_all(bind=engine)
    print("✅ Created database tables")
    
    # Create session
    Session = sessionmaker(bind=engine)
    session = Session()
    
    # Create admin user using SQLAlchemy ORM
    admin = User(
        email="me@alarade.at",
        username="admin",
        full_name="Admin User",
        password_hash=hash_password_bcrypt("admin123456"),
        role="admin",
        is_active=True,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow()
    )
    
    session.add(admin)
    session.commit()
    
    print("✅ Created admin user")
    print("Email: me@alarade.at")
    print("Password: admin123456")
    
    # Verify the user was created
    user = session.query(User).filter_by(email="me@alarade.at").first()
    print("\nVerifying user:")
    print(f"ID: {user.id}")
    print(f"Email: {user.email}")
    print(f"Role: {user.role}")
    
    session.close()
    print("\n✅ Database recreation completed!")
    
except Exception as e:
    print(f"❌ Database error: {e}") 
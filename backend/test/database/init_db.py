"""
Initialize database with tables and test data
"""

import sys
import os

# Add the backend directory to the Python path
backend_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(backend_dir)

from models.database import Base, User
from config.database import engine
from core.security import security
from sqlalchemy.orm import Session

def init_database():
    print("Creating database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    
    print("Creating test user...")
    with Session(engine) as session:
        # Create test user
        test_user = User(
            email="me@alarade.at",
            username="admin",
            full_name="Admin User",
            password_hash=security.hash_password("admin123456"),
            role="admin",
            is_active=True,
            is_verified=True,
            email_verified=True
        )
        
        session.add(test_user)
        session.commit()
        print("Test user created successfully")

if __name__ == "__main__":
    init_database() 
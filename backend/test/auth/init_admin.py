"""
Initialize database and create admin user
"""

import bcrypt
from datetime import datetime
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from backend.models.database import Base
from backend.models.user import User

# Database path
SQLALCHEMY_DATABASE_URL = "sqlite:///backend/data/database.db"

def hash_password_bcrypt(password: str) -> str:
    """Hash password using bcrypt"""
    password_bytes = password.encode('utf-8')
    salt = bcrypt.gensalt()
    hashed = bcrypt.hashpw(password_bytes, salt)
    return hashed.decode('utf-8')

def init_db():
    """Initialize database"""
    try:
        # Create engine
        engine = create_engine(
            SQLALCHEMY_DATABASE_URL,
            connect_args={"check_same_thread": False}
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        print("✅ Database tables created")
        
        return engine
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        return None

def create_admin(engine):
    """Create admin user"""
    try:
        # Create session
        Session = sessionmaker(bind=engine)
        session = Session()
        
        # Check if admin exists
        existing_admin = session.query(User).filter_by(email="me@alarade.at").first()
        if existing_admin:
            print("\n✅ Admin user already exists:")
            print(f"ID: {existing_admin.id}")
            print(f"Email: {existing_admin.email}")
            session.close()
            return
        
        # Create admin user
        admin = User(
            email="me@alarade.at",
            username="admin",
            full_name="Admin User",
            password_hash=hash_password_bcrypt("admin123456"),
            is_active=True,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        session.add(admin)
        session.commit()
        
        print("\n✅ Created new admin user:")
        print("Email: me@alarade.at")
        print("Password: admin123456")
        
        # Verify the user was created
        user = session.query(User).filter_by(email="me@alarade.at").first()
        if user:
            print("\nVerifying user:")
            print(f"ID: {user.id}")
            print(f"Email: {user.email}")
        
        session.close()
        print("\n✅ Admin user creation completed!")
        
    except Exception as e:
        print(f"❌ Admin user creation error: {e}")

if __name__ == "__main__":
    print("\n🚀 Initializing database and creating admin user...")
    engine = init_db()
    if engine:
        create_admin(engine) 
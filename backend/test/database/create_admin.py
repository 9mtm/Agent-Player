"""
Create admin user script
Uses security module for proper password hashing
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from datetime import datetime
from models.database import Base, User
from core.security import security
from config.database import ASYNC_DATABASE_URL

async def create_admin_user():
    try:
        # Create async engine
        engine = create_async_engine(ASYNC_DATABASE_URL)
        
        # Create tables
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        
        # Create async session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        async with async_session() as session:
            # Check if admin exists
            result = await session.execute(
                "SELECT * FROM users WHERE email = 'me@alarade.at'"
            )
            admin = result.first()
            
            if not admin:
                # Hash password using security module
                password_hash = security.hash_password("admin123456")
                
                # Create admin user
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
                await session.commit()
                print("✅ Admin user created successfully!")
                print("Email: me@alarade.at")
                print("Password: admin123456")
            else:
                print("✅ Admin user already exists!")
            
            # Print all users
            result = await session.execute("SELECT * FROM users")
            users = result.all()
            print("\nAll users in database:")
            for user in users:
                print(f"ID: {user.id}, Email: {user.email}, Role: {user.role}")
    
    except Exception as e:
        print(f"❌ Error creating admin user: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(create_admin_user()) 
"""
Setup chat tables script
Creates required tables for chat functionality
"""

import asyncio
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from models.database import Base, Conversation, Message
from config.database import ASYNC_DATABASE_URL

async def setup_chat_tables():
    try:
        # Create async engine
        engine = create_async_engine(ASYNC_DATABASE_URL)
        
        # Create tables
        async with engine.begin() as conn:
            # Create conversations and messages tables
            await conn.run_sync(Base.metadata.create_all)
        
        print("✅ Chat tables created successfully!")
        
        # Create async session
        async_session = sessionmaker(
            engine, class_=AsyncSession, expire_on_commit=False
        )
        
        # Print table info
        async with async_session() as session:
            # Check conversations table
            result = await session.execute(
                "SELECT COUNT(*) FROM conversations"
            )
            conv_count = result.scalar()
            print(f"\nConversations table exists with {conv_count} records")
            
            # Check messages table
            result = await session.execute(
                "SELECT COUNT(*) FROM messages"
            )
            msg_count = result.scalar()
            print(f"Messages table exists with {msg_count} records")
            
            print("\n✅ Chat system ready!")
            
    except Exception as e:
        print(f"❌ Error setting up chat tables: {str(e)}")
        raise

if __name__ == "__main__":
    asyncio.run(setup_chat_tables()) 
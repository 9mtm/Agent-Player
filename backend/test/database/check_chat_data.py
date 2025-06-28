"""
Chat Data Check Script
Shows all conversations and messages in database
"""

import sqlite3
import os
from datetime import datetime

def check_chat_data():
    db_path = "backend/data/database.db"
    
    if not os.path.exists(db_path):
        print(f"❌ Database file not found: {db_path}")
        return
    
    try:
        # Connect to database
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        print("🔍 CHECKING CHAT DATA:")
        print("=" * 60)
        
        # Check conversations
        cursor.execute("SELECT COUNT(*) as count FROM conversations")
        conv_count = cursor.fetchone()['count']
        print(f"📊 Total Conversations: {conv_count}")
        
        if conv_count > 0:
            cursor.execute("""
                SELECT id, title, user_id, agent_id, total_messages, created_at, updated_at 
                FROM conversations 
                ORDER BY created_at DESC 
                LIMIT 10
            """)
            conversations = cursor.fetchall()
            
            print("\n📝 Recent Conversations:")
            print("-" * 60)
            for conv in conversations:
                print(f"ID: {conv['id']}")
                print(f"Title: {conv['title']}")
                print(f"User ID: {conv['user_id']}")
                print(f"Agent ID: {conv['agent_id']}")
                print(f"Total Messages: {conv['total_messages']}")
                print(f"Created: {conv['created_at']}")
                print(f"Updated: {conv['updated_at']}")
                print("-" * 30)
        
        # Check messages
        cursor.execute("SELECT COUNT(*) as count FROM messages")
        msg_count = cursor.fetchone()['count']
        print(f"\n💬 Total Messages: {msg_count}")
        
        if msg_count > 0:
            cursor.execute("""
                SELECT id, conversation_id, sender_type, content, agent_id, created_at
                FROM messages 
                ORDER BY created_at DESC 
                LIMIT 15
            """)
            messages = cursor.fetchall()
            
            print("\n📨 Recent Messages:")
            print("-" * 60)
            for msg in messages:
                content_preview = msg['content'][:80] + "..." if len(msg['content']) > 80 else msg['content']
                print(f"ID: {msg['id']}")
                print(f"Conversation: {msg['conversation_id']}")
                print(f"Sender: {msg['sender_type']}")
                print(f"Agent ID: {msg['agent_id']}")
                print(f"Content: {content_preview}")
                print(f"Created: {msg['created_at']}")
                print("-" * 30)
        
        # Check for sessions if table exists
        try:
            cursor.execute("SELECT COUNT(*) as count FROM sessions")
            session_count = cursor.fetchone()['count']
            print(f"\n🔐 Total Sessions: {session_count}")
        except sqlite3.OperationalError:
            print("\n🔐 Sessions table does not exist")
        
        # Check agents
        try:
            cursor.execute("SELECT COUNT(*) as count FROM agents")
            agent_count = cursor.fetchone()['count']
            print(f"\n🤖 Total Agents: {agent_count}")
            
            if agent_count > 0:
                cursor.execute("""
                    SELECT id, name, model_provider, model_name, is_local_model
                    FROM agents 
                    ORDER BY created_at DESC 
                    LIMIT 5
                """)
                agents = cursor.fetchall()
                
                print("\n🤖 Recent Agents:")
                print("-" * 40)
                for agent in agents:
                    print(f"ID: {agent['id']}")
                    print(f"Name: {agent['name']}")
                    print(f"Provider: {agent['model_provider']}")
                    print(f"Model: {agent['model_name']}")
                    print(f"Local: {agent['is_local_model']}")
                    print("-" * 20)
        except sqlite3.OperationalError:
            print("\n🤖 Agents table does not exist")
        
        conn.close()
        print("\n✅ Chat data check completed!")
        
    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_chat_data() 
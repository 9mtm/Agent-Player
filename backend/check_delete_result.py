import sqlite3
import sys

def check_delete_result():
    """Check the result of delete operation in the database"""
    
    # Connect to database
    try:
        conn = sqlite3.connect('data/database.db')
        cursor = conn.cursor()
        
        print("=== CHECKING CONVERSATION DELETE RESULTS ===")
        
        # Check total conversations
        cursor.execute("SELECT COUNT(*) FROM conversations")
        total_conversations = cursor.fetchone()[0]
        print(f"Total conversations in database: {total_conversations}")
        
        # Check active conversations
        cursor.execute("SELECT COUNT(*) FROM conversations WHERE is_active = 1")
        active_conversations = cursor.fetchone()[0]
        print(f"Active conversations: {active_conversations}")
        
        # Check inactive conversations
        cursor.execute("SELECT COUNT(*) FROM conversations WHERE is_active = 0")
        inactive_conversations = cursor.fetchone()[0]
        print(f"Inactive (deleted) conversations: {inactive_conversations}")
        
        # Show some recent conversations with their status
        print("\n=== RECENT CONVERSATIONS WITH STATUS ===")
        cursor.execute("""
            SELECT id, title, is_active, updated_at 
            FROM conversations 
            ORDER BY updated_at DESC 
            LIMIT 10
        """)
        
        recent_conversations = cursor.fetchall()
        for conv in recent_conversations:
            conv_id, title, is_active, updated_at = conv
            status = "ACTIVE" if is_active else "DELETED"
            print(f"ID: {conv_id[:8]}..., Title: '{title}', Status: {status}, Updated: {updated_at}")
        
        # Specifically check the conversation we tried to delete
        test_conv_id = "7ee5675c-39db-4bc1-9620-7b435501734b"
        print(f"\n=== CHECKING SPECIFIC CONVERSATION: {test_conv_id} ===")
        cursor.execute("""
            SELECT id, title, is_active, updated_at 
            FROM conversations 
            WHERE id = ?
        """, (test_conv_id,))
        
        specific_conv = cursor.fetchone()
        if specific_conv:
            conv_id, title, is_active, updated_at = specific_conv
            status = "ACTIVE" if is_active else "DELETED"
            print(f"Found conversation: Status = {status}, Title = '{title}', Updated = {updated_at}")
        else:
            print("Conversation not found in database!")
        
        conn.close()
        
    except Exception as e:
        print(f"Error checking database: {e}")

if __name__ == "__main__":
    check_delete_result() 
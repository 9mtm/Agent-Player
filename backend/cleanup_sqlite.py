#!/usr/bin/env python3
"""
🧹 Direct SQLite Chat Cleanup
Fast database cleanup without API dependencies
"""

import sqlite3
import os
import sys
from datetime import datetime

def print_colored(text, color="white"):
    """Print colored text"""
    colors = {
        "red": "\033[91m",
        "green": "\033[92m", 
        "yellow": "\033[93m",
        "blue": "\033[94m",
        "cyan": "\033[96m",
        "white": "\033[97m",
        "reset": "\033[0m"
    }
    print(f"{colors.get(color, colors['white'])}{text}{colors['reset']}")

def cleanup_chat_database(db_path="data/database.db"):
    """Direct SQLite cleanup"""
    
    print_colored("🧹 SQLite Direct Cleanup Starting...", "yellow")
    
    # Check if database exists
    if not os.path.exists(db_path):
        print_colored(f"❌ Database file not found: {db_path}", "red")
        return False
    
    try:
        # Connect to database
        print_colored(f"📂 Database: {db_path}", "cyan")
        conn = sqlite3.connect(db_path, timeout=10.0)
        cursor = conn.cursor()
        
        # Get current counts
        print_colored("\n📊 Before cleanup:", "cyan")
        cursor.execute("SELECT COUNT(*) FROM conversations WHERE is_active = 1")
        conv_count = cursor.fetchone()[0]
        print_colored(f"   Conversations: {conv_count}", "blue")
        
        cursor.execute("SELECT COUNT(*) FROM messages WHERE is_active = 1")
        msg_count = cursor.fetchone()[0]
        print_colored(f"   Messages: {msg_count}", "blue")
        
        # Execute cleanup
        print_colored("\n🧹 Executing SQL cleanup...", "red")
        
        # Begin transaction
        cursor.execute("BEGIN TRANSACTION")
        
        # Update messages first (foreign key constraint)
        cursor.execute("""
            UPDATE messages 
            SET is_active = 0, updated_at = datetime('now') 
            WHERE is_active = 1
        """)
        messages_updated = cursor.rowcount
        
        # Update conversations
        cursor.execute("""
            UPDATE conversations 
            SET is_active = 0, updated_at = datetime('now') 
            WHERE is_active = 1
        """)
        conversations_updated = cursor.rowcount
        
        # Commit transaction
        cursor.execute("COMMIT")
        
        # Verify results
        print_colored("\n✅ CLEANUP COMPLETED!", "green")
        print_colored("📊 After cleanup:", "cyan")
        
        cursor.execute("SELECT COUNT(*) FROM conversations WHERE is_active = 1")
        active_conv = cursor.fetchone()[0]
        print_colored(f"   Active Conversations: {active_conv}", "blue")
        
        cursor.execute("SELECT COUNT(*) FROM messages WHERE is_active = 1")
        active_msg = cursor.fetchone()[0]
        print_colored(f"   Active Messages: {active_msg}", "blue")
        
        total_cleaned = conversations_updated + messages_updated
        print_colored(f"\n🎉 Total items cleaned: {total_cleaned}", "green")
        print_colored(f"   📝 Conversations: {conversations_updated}", "yellow")
        print_colored(f"   💬 Messages: {messages_updated}", "yellow")
        
        return True
        
    except sqlite3.OperationalError as e:
        if "database is locked" in str(e):
            print_colored("❌ Database is locked!", "red")
            print_colored("   Please stop the backend server first:", "yellow")
            print_colored("   Ctrl+C in the terminal running 'python main.py'", "yellow")
        else:
            print_colored(f"❌ SQLite Error: {e}", "red")
        return False
        
    except Exception as e:
        print_colored(f"❌ Unexpected error: {e}", "red")
        return False
        
    finally:
        if 'conn' in locals():
            conn.close()

def main():
    """Main function"""
    print_colored("🧹 SQLite Chat Cleanup Tool", "yellow")
    print_colored("=" * 30, "yellow")
    
    # Check for confirmation
    if len(sys.argv) > 1 and sys.argv[1] == "--force":
        pass  # Skip confirmation
    else:
        print_colored("\n⚠️  This will mark all chat data as deleted!", "red")
        confirm = input("Continue? (y/N): ")
        if confirm.lower() != 'y':
            print_colored("❌ Cleanup cancelled", "yellow")
            return
    
    # Execute cleanup
    success = cleanup_chat_database()
    
    if success:
        print_colored("\n🏁 Cleanup completed successfully!", "green")
    else:
        print_colored("\n💥 Cleanup failed!", "red")
        sys.exit(1)

if __name__ == "__main__":
    main() 
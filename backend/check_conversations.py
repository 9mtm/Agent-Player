import sqlite3
import os

# Connect to database
db_path = 'data/app.db'
if not os.path.exists(db_path):
    print(f"Database not found at {db_path}")
    exit(1)

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Check conversations
print("=== CONVERSATIONS IN DATABASE ===")
cursor.execute('SELECT id, title, user_id, agent_id, is_active, created_at FROM conversations ORDER BY created_at DESC LIMIT 20')
rows = cursor.fetchall()

if not rows:
    print("No conversations found in database!")
else:
    for row in rows:
        print(f"ID: {row[0]}, Title: '{row[1]}', User: {row[2]}, Agent: {row[3]}, Active: {row[4]}, Created: {row[5]}")

print(f"\nTotal conversations: {len(rows)}")

# Also check if there are any conversation IDs that start with '61365800'
print("\n=== CHECKING FOR SPECIFIC ID ===")
cursor.execute("SELECT id, title FROM conversations WHERE id LIKE '61365800%'")
matching = cursor.fetchall()
if matching:
    print("Found matching conversations:")
    for row in matching:
        print(f"ID: {row[0]}, Title: '{row[1]}'")
else:
    print("No conversations found with ID starting with '61365800'")

conn.close() 
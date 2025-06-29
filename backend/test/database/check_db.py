import sqlite3

def check_db():
    try:
        # Connect to database
        conn = sqlite3.connect("dpro_agent.db")
        cursor = conn.cursor()
        
        # Get table schema
        cursor.execute("SELECT sql FROM sqlite_master WHERE type='table' AND name='users'")
        schema = cursor.fetchone()
        print("\nTable Schema:")
        print(schema[0])
        
        # Get all users
        cursor.execute("SELECT * FROM users")
        users = cursor.fetchall()
        
        # Get column names
        columns = [description[0] for description in cursor.description]
        print("\nColumns:", columns)
        
        print("\nUsers:")
        for user in users:
            print(dict(zip(columns, user)))
            
        conn.close()
        
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_db() 
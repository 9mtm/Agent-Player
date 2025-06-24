import sqlite3

# Path to the SQLite database
DB_PATH = "backend/data/database.db"

try:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()

    print("\n--- Agents Table ---")
    cursor.execute("SELECT * FROM agents")
    agents = cursor.fetchall()
    if not agents:
        print("No agents found in the database.")
    else:
        for agent in agents:
            print(dict(agent))

    conn.close()
except Exception as e:
    print(f"Error reading agents table: {e}") 
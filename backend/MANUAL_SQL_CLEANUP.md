# 🧹 Manual SQLite Cleanup Commands

Quick reference for direct SQLite database cleanup.

## 🚀 Quick Commands

### Option 1: Python Script (Recommended)
```bash
# Quick cleanup without confirmation
python cleanup_sqlite.py --force

# Normal cleanup with confirmation
python cleanup_sqlite.py
```

### Option 2: PowerShell with SQLite CLI
```powershell
# If you have sqlite3 installed
.\sql_cleanup.ps1

# Ultra quick version
.\quick_sql_cleanup.ps1
```

### Option 3: Batch File (Windows)
```cmd
# Double-click or run
cleanup_sql.bat
```

### Option 4: Direct SQL File
```bash
# Using SQLite CLI
sqlite3 data/database.db < cleanup_simple.sql
```

## 📋 Manual SQL Commands

### If you want to run SQL manually:

#### 1️⃣ Connect to database:
```bash
sqlite3 data/database.db
```

#### 2️⃣ Check current data:
```sql
SELECT COUNT(*) as conversations FROM conversations WHERE is_active = 1;
SELECT COUNT(*) as messages FROM messages WHERE is_active = 1;
```

#### 3️⃣ Cleanup commands:
```sql
BEGIN TRANSACTION;

-- Soft delete all messages
UPDATE messages 
SET is_active = 0, updated_at = datetime('now') 
WHERE is_active = 1;

-- Soft delete all conversations
UPDATE conversations 
SET is_active = 0, updated_at = datetime('now') 
WHERE is_active = 1;

COMMIT;
```

#### 4️⃣ Verify cleanup:
```sql
SELECT COUNT(*) as active_conversations FROM conversations WHERE is_active = 1;
SELECT COUNT(*) as active_messages FROM messages WHERE is_active = 1;
SELECT COUNT(*) as deleted_conversations FROM conversations WHERE is_active = 0;
SELECT COUNT(*) as deleted_messages FROM messages WHERE is_active = 0;
```

#### 5️⃣ Exit SQLite:
```sql
.exit
```

## 🔄 Alternative Methods

### Using Database Browser
1. Open `data/database.db` in any SQLite browser
2. Execute the UPDATE statements above
3. Commit changes

### Using Web Interface
1. Stop backend server first
2. Use any online SQLite editor
3. Upload `data/database.db`
4. Run cleanup SQL
5. Download updated database

## 🛠️ Troubleshooting

### "Database is locked" Error
```bash
# Stop the backend server first
# Ctrl+C in the terminal running python main.py

# Then run cleanup
python cleanup_sqlite.py --force
```

### "sqlite3 not found" Error
```bash
# Install SQLite (Windows with Chocolatey)
choco install sqlite

# Or use Python version instead
python cleanup_sqlite.py --force
```

### "Python not found" Error
```bash
# Install Python from python.org
# Or use direct SQL with SQLite browser
```

## ⚡ Speed Comparison

| Method | Speed | Requirements | Safety |
|--------|-------|-------------|---------|
| Python Script | ⚡⚡⚡ | Python only | ✅ |
| PowerShell+SQLite | ⚡⚡ | SQLite CLI | ✅ |
| Manual SQL | ⚡ | SQLite CLI | ⚠️ |
| API Cleanup | 🐌 | Backend running | ✅ |

## 🎯 Recommended Workflow

### For Daily Development:
```bash
# Ultra quick
.\quick_sql_cleanup.ps1
```

### For Safety:
```bash
# With confirmation
python cleanup_sqlite.py
```

### For Learning:
```bash
# Manual SQL exploration
sqlite3 data/database.db
.help
.tables
SELECT * FROM conversations LIMIT 5;
```

---

**Choose the method that works best for your setup! 🚀** 
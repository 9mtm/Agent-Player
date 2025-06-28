# 🔥 WIPE COMMANDS - Complete Database Cleanup

**⚠️ WARNING: These commands DELETE EVERYTHING PERMANENTLY!**

## ⚡ Ultra Quick Commands

### 1️⃣ Run PowerShell Script:
```bash
.\wipe.ps1
```

### 2️⃣ Manual SQL (Copy/Paste):
```sql
DELETE FROM messages;
DELETE FROM conversations;
DELETE FROM sqlite_sequence WHERE name IN ('messages', 'conversations');
VACUUM;
```

### 3️⃣ One-liner SQL File:
```bash
# Run this in SQLite
sqlite3 data/database.db < wipe.sql
```

## 🎯 What This Does:

- ❌ **DELETE FROM messages** - Removes all messages permanently
- ❌ **DELETE FROM conversations** - Removes all conversations permanently  
- 🔢 **DELETE FROM sqlite_sequence** - Resets auto-increment counters
- 🗜️ **VACUUM** - Compacts database file

## 📊 Before/After:

**Before:**
- Conversations: 526+
- Messages: 1000+
- Database size: ~200KB

**After:**
- Conversations: 0
- Messages: 0  
- Database size: ~50KB
- Fresh start! 🆕

## 🚀 Usage:

1. **Stop backend server** (if running)
2. **Choose method:**
   - PowerShell: `.\wipe.ps1`
   - Manual: Copy SQL above
   - SQL File: Run `wipe.sql`
3. **Start fresh!** 🎉

---
**This is the NUCLEAR option - use with care! 💥** 
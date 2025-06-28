# 🧹 Chat Cleanup Commands - DEVELOPMENT TOOLS

Multiple command-line tools for cleaning up chat data during development.

## 📋 Available Commands

### 1️⃣ **PowerShell Scripts**

#### Full Cleanup with Confirmation
```powershell
.\cleanup_chat.ps1
```
- ✅ Safe with confirmation prompt
- 📊 Shows detailed statistics
- ⚠️ Requires typing "YES" to confirm

#### Quick Cleanup (No Confirmation)
```powershell
.\quick_cleanup.ps1
```
- ⚡ Fast execution
- 🚨 No confirmation required
- 💨 Perfect for rapid development cycles

#### Custom Parameters
```powershell
.\cleanup_chat.ps1 -confirm -email "custom@email.com" -password "custompass" -baseUrl "http://localhost:8080"
```

### 2️⃣ **Python Script**

#### Standard Cleanup
```bash
python cleanup_chat.py
```

#### Quick Mode
```bash
python cleanup_chat.py --quick
```

#### Requirements
```bash
pip install requests
```

### 3️⃣ **Windows Batch File**

#### Double-click or run:
```cmd
cleanup.bat
```
- 🖱️ Easy GUI-style execution
- 🪟 Windows-friendly
- 🔄 Calls PowerShell under the hood

### 4️⃣ **Direct API Call (cURL)**

```bash
# Login first
TOKEN=$(curl -s -X POST -H "Content-Type: application/json" \
  -d '{"email":"me@alarade.at","password":"admin123456"}' \
  http://localhost:8000/auth/login | jq -r '.access_token')

# Execute cleanup
curl -X POST -H "Authorization: Bearer $TOKEN" \
  http://localhost:8000/chat/cleanup-all
```

## 🎯 Usage Scenarios

### Development Workflow
```bash
# Quick iteration cycle
.\quick_cleanup.ps1  # Fast cleanup
# ... test new features ...
.\quick_cleanup.ps1  # Clean again
```

### Safe Testing
```bash
# When you want confirmation
.\cleanup_chat.ps1   # Will ask for confirmation
```

### CI/CD Integration
```bash
# In automated scripts
python cleanup_chat.py --quick
```

## 🔧 Configuration

### Default Settings
- **Backend URL:** `http://localhost:8000`
- **Email:** `me@alarade.at`
- **Password:** `admin123456`

### Custom Configuration
Edit the scripts to change default values:

**PowerShell:**
```powershell
param(
    [string]$email = "your@email.com",
    [string]$password = "yourpassword",
    [string]$baseUrl = "http://localhost:8080"
)
```

**Python:**
```python
BASE_URL = "http://localhost:8080"
DEFAULT_EMAIL = "your@email.com"
DEFAULT_PASSWORD = "yourpassword"
```

## 📊 Output Examples

### Success Output
```
🧹 Chat Cleanup Tool - DEVELOPMENT ONLY
========================================
📍 Checking backend server...
✅ Backend server is running
📊 Getting current data...
📈 Current conversations: 526
🧹 Executing cleanup...
✅ CLEANUP COMPLETED!
📊 Cleanup Results:
   🗂️  Conversations deleted: 526
   💬 Messages deleted: 1,234
   📝 Total items deleted: 1,760
🎉 All chat data has been cleaned up successfully!
```

### Error Handling
```
❌ Backend server is not running on http://localhost:8000
   Please start the backend server first: python main.py
```

## ⚠️ Important Notes

1. **DEVELOPMENT ONLY** - These tools are for development use
2. **Irreversible** - Deleted data cannot be recovered
3. **Backend Required** - Backend server must be running
4. **Authentication** - Uses default development credentials

## 🚀 Quick Start

1. **Start Backend:**
   ```bash
   cd backend
   python main.py
   ```

2. **Choose Your Tool:**
   ```bash
   # For safety
   .\cleanup_chat.ps1
   
   # For speed
   .\quick_cleanup.ps1
   
   # For Python lovers
   python cleanup_chat.py --quick
   
   # For Windows users
   cleanup.bat
   ```

3. **Done!** 🎉 Your chat data is cleaned up.

## 🛠️ Troubleshooting

### Common Issues

**"Backend not running"**
```bash
cd backend
python main.py
# Wait for "Server started" message
```

**"Invalid credentials"**
- Check email/password in the script
- Ensure user exists in database

**"PowerShell execution policy"**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**"Python requests not found"**
```bash
pip install requests
```

## 🎨 Customization

### Adding New Cleanup Types
Extend the scripts to support different types of cleanup:
- User-specific cleanup
- Date-range cleanup
- Selective conversation cleanup

### Integration with Build Tools
Add to your `package.json`:
```json
{
  "scripts": {
    "cleanup": "powershell -File backend/quick_cleanup.ps1",
    "cleanup-safe": "powershell -File backend/cleanup_chat.ps1"
  }
}
```

Then use:
```bash
npm run cleanup
npm run cleanup-safe
```

---

**Happy Coding! 🚀** 
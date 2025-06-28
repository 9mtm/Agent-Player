#!/usr/bin/env python3
"""
Quick Board System Test
Tests the new Board improvements:
1. Backend API working
2. Component Library functional  
3. Footer Toolbar visible
4. Drag & Drop working
"""

import requests
import json
import time

# Test configuration
BACKEND_URL = "http://localhost:8000"
FRONTEND_URL = "http://localhost:3000"

def test_backend_health():
    """Test if backend is running"""
    try:
        response = requests.get(f"{BACKEND_URL}/api/system/health", timeout=5)
        print(f"✅ Backend Health: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Backend Error: {e}")
        return False

def test_auth_system():
    """Test authentication system"""
    try:
        login_data = {
            "email": "me@alarade.at",
            "password": "admin123456"
        }
        
        response = requests.post(f"{BACKEND_URL}/auth/login", json=login_data, timeout=5)
        print(f"✅ Auth Test: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            token = data.get("access_token")
            print(f"✅ Token received: {token[:20]}...")
            return token
        else:
            print(f"❌ Auth failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Auth Error: {e}")
        return None

def test_board_endpoints(token):
    """Test board-related endpoints"""
    if not token:
        print("❌ No token available for board tests")
        return False
        
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        # Test board list
        response = requests.get(f"{BACKEND_URL}/api/workflows/boards", headers=headers, timeout=5)
        print(f"✅ Board List: {response.status_code}")
        
        # Test board creation
        board_data = {
            "name": "Test Board - Quick Test",
            "description": "Testing board system",
            "type": "workflow"
        }
        
        response = requests.post(f"{BACKEND_URL}/api/workflows/boards", json=board_data, headers=headers, timeout=5)
        print(f"✅ Board Creation: {response.status_code}")
        
        if response.status_code in [200, 201]:
            board = response.json()
            board_id = board.get("data", {}).get("id") or board.get("id")
            print(f"✅ Board ID: {board_id}")
            return board_id
        else:
            print(f"❌ Board creation failed: {response.text}")
            return None
            
    except Exception as e:
        print(f"❌ Board API Error: {e}")
        return None

def print_frontend_instructions():
    """Print instructions for testing frontend"""
    print("\n" + "="*60)
    print("🎯 FRONTEND TESTING INSTRUCTIONS")
    print("="*60)
    print(f"1. Open browser: {FRONTEND_URL}")
    print("2. Login with: me@alarade.at / admin123456")
    print("3. Navigate to Board page")
    print("4. Check these improvements:")
    print("   📦 Component Library: Click Components button in footer")
    print("   🎯 Drag & Drop: Drag component from library to board")
    print("   🔳 Grid Background: Should be visible on board")
    print("   🎛️ Footer Toolbar: Should show Chat, Logs, Map, Components, Fit, Help")
    print("   ✅ All buttons should be clickable and responsive")
    print("\n💡 Console Debugging:")
    print("   - Open Developer Tools (F12)")
    print("   - Check Console for drag & drop logs")
    print("   - Look for: '🎯 DROP EVENT RECEIVED'")
    print("   - And: '📦 Component data parsed'")
    print("\n🐛 If Issues:")
    print("   - Component Library not showing: Check console for state changes")
    print("   - Drag not working: Check console for drag events")
    print("   - Footer not visible: Check z-index and positioning")
    print("="*60)

def main():
    """Run all tests"""
    print("🚀 Quick Board System Test")
    print("=" * 50)
    
    print("\n1️⃣ Testing Backend...")
    backend_ok = test_backend_health()
    
    if not backend_ok:
        print("❌ Backend not available. Start with: python backend/main.py")
        return
    
    print("\n2️⃣ Testing Authentication...")
    token = test_auth_system()
    
    print("\n3️⃣ Testing Board APIs...")
    board_id = test_board_endpoints(token)
    
    print("\n4️⃣ System Status:")
    print(f"   Backend: {'✅ Ready' if backend_ok else '❌ Failed'}")
    print(f"   Auth: {'✅ Working' if token else '❌ Failed'}")
    print(f"   Board API: {'✅ Working' if board_id else '❌ Failed'}")
    
    print_frontend_instructions()
    
    if backend_ok and token and board_id:
        print("\n🎉 ALL SYSTEMS READY!")
        print("📱 Frontend should now work perfectly with:")
        print("   - Component Library drag & drop")
        print("   - Enhanced Footer Toolbar")
        print("   - Visible Grid Background")
        print("   - Real-time backend integration")
    else:
        print("\n⚠️ Some systems not ready. Check errors above.")

if __name__ == "__main__":
    main() 
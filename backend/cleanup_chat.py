#!/usr/bin/env python3
"""
🧹 Chat Cleanup Tool - DEVELOPMENT ONLY
Usage: python cleanup_chat.py [--quick]
"""

import requests
import sys
import argparse
from typing import Dict, Any

# Configuration
BASE_URL = "http://localhost:8000"
DEFAULT_EMAIL = "me@alarade.at"
DEFAULT_PASSWORD = "admin123456"

def print_colored(text: str, color: str = "white"):
    """Print colored text to console"""
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

def check_backend_health() -> bool:
    """Check if backend server is running"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return response.status_code == 200
    except requests.RequestException:
        return False

def login() -> str:
    """Login and return access token"""
    login_data = {
        "email": DEFAULT_EMAIL,
        "password": DEFAULT_PASSWORD
    }
    
    response = requests.post(
        f"{BASE_URL}/auth/login",
        json=login_data,
        headers={"Content-Type": "application/json"}
    )
    response.raise_for_status()
    return response.json()["access_token"]

def get_conversation_count(token: str) -> int:
    """Get current conversation count"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.get(
        f"{BASE_URL}/chat/conversations?limit=1",
        headers=headers
    )
    response.raise_for_status()
    return response.json()["data"]["total"]

def cleanup_chat_data(token: str) -> Dict[str, Any]:
    """Execute chat cleanup"""
    headers = {"Authorization": f"Bearer {token}"}
    response = requests.post(
        f"{BASE_URL}/chat/cleanup-all",
        headers=headers
    )
    response.raise_for_status()
    return response.json()["data"]

def main():
    parser = argparse.ArgumentParser(description="🧹 Chat Cleanup Tool")
    parser.add_argument("--quick", action="store_true", help="Skip confirmation prompt")
    args = parser.parse_args()
    
    print_colored("🧹 Chat Cleanup Tool - DEVELOPMENT ONLY", "yellow")
    print_colored("=" * 40, "yellow")
    
    # Check backend
    print_colored("\n📍 Checking backend server...", "cyan")
    if not check_backend_health():
        print_colored("❌ Backend server is not running!", "red")
        print_colored("   Please start the backend server first: python main.py", "yellow")
        sys.exit(1)
    print_colored("✅ Backend server is running", "green")
    
    # Confirmation
    if not args.quick:
        print_colored("\n⚠️  WARNING: This will DELETE ALL chat conversations and messages!", "red")
        print_colored("   This action cannot be undone.", "red")
        confirm = input("\nType 'YES' to confirm cleanup: ")
        
        if confirm != "YES":
            print_colored("❌ Cleanup cancelled by user", "yellow")
            sys.exit(0)
    
    try:
        # Login
        print_colored("\n🔐 Logging in...", "cyan")
        token = login()
        print_colored("✅ Login successful", "green")
        
        # Get current count
        print_colored("\n📊 Getting current data...", "cyan")
        total_conversations = get_conversation_count(token)
        print_colored(f"📈 Current conversations: {total_conversations}", "blue")
        
        # Execute cleanup
        print_colored("\n🧹 Executing cleanup...", "red")
        result = cleanup_chat_data(token)
        
        # Display results
        print_colored("\n✅ CLEANUP COMPLETED!", "green")
        print_colored("=" * 40, "green")
        print_colored("📊 Cleanup Results:", "white")
        print_colored(f"   🗂️  Conversations deleted: {result['conversations_deleted']}", "yellow")
        print_colored(f"   💬 Messages deleted: {result['messages_deleted']}", "yellow")
        print_colored(f"   📝 Total items deleted: {result['total_deleted']}", "yellow")
        print_colored("\n🎉 All chat data has been cleaned up successfully!", "green")
        
    except requests.RequestException as e:
        print_colored(f"\n❌ ERROR: {str(e)}", "red")
        sys.exit(1)
    except Exception as e:
        print_colored(f"\n❌ UNEXPECTED ERROR: {str(e)}", "red")
        sys.exit(1)
    
    print_colored("\n🏁 Cleanup script completed.", "cyan")

if __name__ == "__main__":
    main() 
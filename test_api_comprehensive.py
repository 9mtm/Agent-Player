import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
TEST_USER_EMAIL = "me@alarade.at"
TEST_USER_PASSWORD = "admin123456"

def test_server():
    """Test basic server connection"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        print(f" Server connection: {response.status_code}")
        return response.status_code == 200
    except Exception as e:
        print(f" Server connection failed: {e}")
        return False

def main():
    print(" DPRO AI Agent - Basic API Test")
    print("=" * 50)
    
    if test_server():
        print(" Backend server is running!")
    else:
        print(" Backend server is not responding!")

if __name__ == "__main__":
    main()

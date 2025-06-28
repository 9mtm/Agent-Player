"""
Simple Board API Test
Quick test to verify Board API is working
"""

import requests

def test_board_api():
    base_url = "http://localhost:8000"
    
    print("Testing Board API...")
    
    # Test health check
    try:
        response = requests.get(f"{base_url}/workflows/health", timeout=5)
        if response.status_code == 200:
            print("✅ Workflow API health check passed")
            return True
        else:
            print(f"❌ Health check failed: {response.status_code}")
            return False
    except requests.exceptions.ConnectionError:
        print("❌ Cannot connect to server. Is it running?")
        return False
    except Exception as e:
        print(f"❌ Error: {e}")
        return False

if __name__ == "__main__":
    success = test_board_api()
    if success:
        print("🎉 Board API is working!")
    else:
        print("⚠️ Board API test failed") 
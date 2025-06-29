#!/usr/bin/env python3
"""
Test Agent Response Debug Script
"""

import requests
import json

def test_agent_response():
    """Test the agent endpoint and see the actual response structure"""
    
    print("=== Testing Agent Endpoint ===")
    
    base_url = "http://localhost:8000"
    
    # Step 1: Login
    print("\n1. Logging in...")
    login_data = {"email": "me@alarade.at", "password": "admin123456"}
    
    try:
        login_response = requests.post(f"{base_url}/auth/login", json=login_data)
        print(f"Login Status: {login_response.status_code}")
        
        if login_response.status_code != 200:
            print(f"Login Failed: {login_response.text}")
            return
            
        login_result = login_response.json()
        token = login_result.get("data", {}).get("access_token") or login_result.get("access_token")
        
        if not token:
            print(f"No token in response: {login_result}")
            return
            
        print("✅ Login successful")
        
        # Step 2: Test Agent
        print("\n2. Testing Agent...")
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        test_data = {"message": "Hello! Can you help me with a quick test?"}
        
        test_response = requests.post(f"{base_url}/agents/12/test", 
                                    headers=headers, 
                                    json=test_data)
        
        print(f"Test Status: {test_response.status_code}")
        
        if test_response.status_code == 200:
            result = test_response.json()
            print("\n3. Response Structure:")
            print(json.dumps(result, indent=2))
            
            # Check if response matches frontend expectations
            print("\n4. Response Analysis:")
            print(f"- Has 'success' field: {'success' in result}")
            print(f"- Has 'data' field: {'data' in result}")
            print(f"- Success value: {result.get('success')}")
            
            if 'data' in result and result['data']:
                data = result['data']
                print(f"- Data has 'agent_name': {'agent_name' in data}")
                print(f"- Data has 'model': {'model' in data}")
                print(f"- Data has 'user_message': {'user_message' in data}")
                print(f"- Data has 'ai_response': {'ai_response' in data}")
                print(f"- Data has 'response_time': {'response_time' in data}")
            else:
                print("- No data field found!")
                
        else:
            print(f"Test Failed: {test_response.text}")
            
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    test_agent_response() 
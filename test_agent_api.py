import requests
import json

# API Configuration
BASE_URL = "http://localhost:8000"
LOGIN_DATA = {
    "email": "me@alarade.at",
    "password": "admin123456"
}

def test_agent_api():
    print("🚀 Testing Agent API Connection...")
    
    # Step 1: Login to get token
    print("\n1. Logging in...")
    login_response = requests.post(f"{BASE_URL}/auth/login", json=LOGIN_DATA)
    
    if login_response.status_code == 200:
        login_data = login_response.json()
        token = login_data["data"]["access_token"]
        print("✅ Login successful!")
        print(f"   Token: {token[:50]}...")
    else:
        print(f"❌ Login failed: {login_response.status_code}")
        print(f"   Response: {login_response.text}")
        return
    
    # Setup headers
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Step 2: Create a test agent
    print("\n2. Creating test agent...")
    agent_data = {
        "name": "Test Main Agent",
        "description": "Test agent for verification",
        "agent_type": "main",
        "model_provider": "openai",
        "model_name": "gpt-4",
        "system_prompt": "You are a helpful assistant",
        "temperature": 0.7,
        "max_tokens": 2048,
        "api_key": "sk-test123"
    }
    
    create_response = requests.post(f"{BASE_URL}/agents", json=agent_data, headers=headers)
    
    if create_response.status_code == 200:
        create_data = create_response.json()
        agent_id = create_data["data"]["agent_id"]
        print("✅ Agent created successfully!")
        print(f"   Agent ID: {agent_id}")
    else:
        print(f"❌ Agent creation failed: {create_response.status_code}")
        print(f"   Response: {create_response.text}")
        return
    
    # Step 3: Get all agents
    print("\n3. Getting all agents...")
    agents_response = requests.get(f"{BASE_URL}/agents", headers=headers)
    
    if agents_response.status_code == 200:
        agents_data = agents_response.json()
        agents_count = len(agents_data["data"]["agents"])
        print(f"✅ Found {agents_count} agents!")
        
        for agent in agents_data["data"]["agents"]:
            print(f"   - Agent: {agent['name']} (ID: {agent['id']})")
    else:
        print(f"❌ Failed to get agents: {agents_response.status_code}")
        print(f"   Response: {agents_response.text}")
        return
    
    # Step 4: Create a child agent
    print("\n4. Creating child agent...")
    child_data = {
        "name": "Test Child Agent",
        "description": "Test child agent linked to main agent",
        "parent_agent_id": agent_id,
        "model_provider": "openai",
        "model_name": "gpt-3.5-turbo",
        "system_prompt": "You are a specialized child assistant",
        "temperature": 0.5,
        "max_tokens": 1024
    }
    
    child_response = requests.post(f"{BASE_URL}/agents/child", json=child_data, headers=headers)
    
    if child_response.status_code == 200:
        child_result = child_response.json()
        child_agent_id = child_result["data"]["agent_id"]
        print("✅ Child agent created successfully!")
        print(f"   Child Agent ID: {child_agent_id}")
    else:
        print(f"❌ Child agent creation failed: {child_response.status_code}")
        print(f"   Response: {child_response.text}")
    
    # Step 5: Get main agents
    print("\n5. Getting main agents...")
    main_agents_response = requests.get(f"{BASE_URL}/agents/main", headers=headers)
    
    if main_agents_response.status_code == 200:
        main_data = main_agents_response.json()
        main_count = len(main_data["data"]["agents"])
        print(f"✅ Found {main_count} main agents!")
    else:
        print(f"❌ Failed to get main agents: {main_agents_response.status_code}")
    
    # Step 6: Get child agents
    print("\n6. Getting child agents...")
    child_agents_response = requests.get(f"{BASE_URL}/agents/child", headers=headers)
    
    if child_agents_response.status_code == 200:
        child_data = child_agents_response.json()
        child_count = len(child_data["data"]["agents"])
        print(f"✅ Found {child_count} child agents!")
    else:
        print(f"❌ Failed to get child agents: {child_agents_response.status_code}")
    
    # Step 7: Test agent
    print("\n7. Testing main agent...")
    test_data = {
        "message": "Hello, this is a test message!"
    }
    
    test_response = requests.post(f"{BASE_URL}/agents/{agent_id}/test", json=test_data, headers=headers)
    
    if test_response.status_code == 200:
        test_result = test_response.json()
        print("✅ Agent test successful!")
        print(f"   Agent Response: {test_result['data']['ai_response'][:100]}...")
    else:
        print(f"❌ Agent test failed: {test_response.status_code}")
        print(f"   Response: {test_response.text}")
    
    print("\n🎉 Agent API testing completed!")

if __name__ == "__main__":
    test_agent_api() 
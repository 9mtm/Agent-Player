#!/usr/bin/env python3
"""
Comprehensive API Debugging Script - DPRO AI Agent
Tests all APIs and identifies issues with database connections
Created: June 2025
"""

import requests
import json
import sys
from datetime import datetime

class APIDebugger:
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.token = None
        self.headers = {}
        self.results = {
            "working_apis": [],
            "broken_apis": [],
            "missing_apis": [],
            "database_issues": [],
            "total_tests": 0,
            "passed_tests": 0
        }

    def authenticate(self):
        """Authenticate and get JWT token"""
        print("🔐 Authenticating...")
        try:
            response = requests.post(f"{self.base_url}/auth/login", json={
                "email": "me@alarade.at",
                "password": "admin123456"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data['data']['access_token']
                self.headers = {'Authorization': f'Bearer {self.token}'}
                print("✅ Authentication successful")
                return True
            else:
                print(f"❌ Authentication failed: {response.status_code}")
                print(f"Response: {response.text}")
                return False
        except Exception as e:
            print(f"❌ Authentication error: {e}")
            return False

    def test_endpoint(self, method, endpoint, data=None, expected_status=200, api_name="Unknown"):
        """Test a single endpoint"""
        self.results["total_tests"] += 1
        
        try:
            url = f"{self.base_url}{endpoint}"
            
            if method.upper() == "GET":
                response = requests.get(url, headers=self.headers)
            elif method.upper() == "POST":
                response = requests.post(url, headers=self.headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=self.headers, json=data)
            elif method.upper() == "DELETE":
                response = requests.delete(url, headers=self.headers)
            
            print(f"  {method.upper()} {endpoint} - Status: {response.status_code}")
            
            if response.status_code == expected_status:
                self.results["passed_tests"] += 1
                if api_name not in self.results["working_apis"]:
                    self.results["working_apis"].append(api_name)
                return True, response.json() if response.content else None
            else:
                print(f"    ❌ Expected {expected_status}, got {response.status_code}")
                print(f"    Error: {response.text[:200]}...")
                if api_name not in self.results["broken_apis"]:
                    self.results["broken_apis"].append(api_name)
                return False, response.text
                
        except Exception as e:
            print(f"    ❌ Exception: {e}")
            if api_name not in self.results["broken_apis"]:
                self.results["broken_apis"].append(api_name)
            return False, str(e)

    def test_agents_api(self):
        """Test Agents API comprehensively"""
        print("\n🤖 Testing Agents API...")
        
        # Test GET all agents
        success, data = self.test_endpoint("GET", "/agents", api_name="Agents")
        
        if not success:
            self.results["database_issues"].append("Agents table query issues")
            return False
        
        # Test POST create agent if GET works
        if success:
            agent_data = {
                "name": "Test Debug Agent",
                "description": "Agent created for debugging purposes",
                "agent_type": "main",
                "model_provider": "openai",
                "model_name": "gpt-3.5-turbo",
                "system_prompt": "You are a helpful debugging assistant",
                "temperature": 0.7,
                "max_tokens": 1000,
                "api_key": "test-key-for-debug"
            }
            success, data = self.test_endpoint("POST", "/agents", agent_data, 200, "Agents")
        
        return success

    def test_chat_api(self):
        """Test Chat API comprehensively"""
        print("\n💬 Testing Chat API...")
        
        # Test GET conversations
        success, data = self.test_endpoint("GET", "/chat/conversations", api_name="Chat")
        
        if not success:
            self.results["database_issues"].append("Chat/Conversations table relationship issues")
            return False
        
        return success

    def test_all_working_apis(self):
        """Test all known working APIs"""
        print("\n✅ Testing Known Working APIs...")
        
        # Authentication API
        print("\n🔐 Auth API:")
        self.test_endpoint("GET", "/auth/me", api_name="Authentication")
        
        # Users API
        print("\n👥 Users API:")
        self.test_endpoint("GET", "/users/profile", api_name="Users")
        self.test_endpoint("GET", "/users/settings", api_name="Users")
        
        # Tasks API
        print("\n✅ Tasks API:")
        self.test_endpoint("GET", "/task/tasks", api_name="Tasks")
        
        # Licensing API
        print("\n🔑 Licensing API:")
        self.test_endpoint("GET", "/license/licensing/status", api_name="Licensing")
        self.test_endpoint("GET", "/license/licensing/features", api_name="Licensing")
        
        # Training Lab API
        print("\n🎓 Training Lab API:")
        self.test_endpoint("GET", "/training/training-lab/workspaces", api_name="Training Lab")
        
        # Marketplace API
        print("\n🛒 Marketplace API:")
        self.test_endpoint("GET", "/market/marketplace/items", api_name="Marketplace")
        self.test_endpoint("GET", "/market/marketplace/categories", api_name="Marketplace")

    def identify_missing_apis(self):
        """Identify completely missing APIs"""
        print("\n🔍 Checking for Missing APIs...")
        
        # FormBuilder API - completely missing
        print("  Checking FormBuilder API...")
        success, data = self.test_endpoint("GET", "/api/formbuilder/forms", expected_status=404, api_name="FormBuilder")
        if not success:
            self.results["missing_apis"].append("FormBuilder API (Backend missing)")
            
        # Other potential missing APIs
        missing_apis = [
            "Themes Management API",
            "LLMs Configuration API", 
            "Advanced Admin Dashboard API",
            "System Configuration API"
        ]
        
        for api in missing_apis:
            self.results["missing_apis"].append(api)
            print(f"  ❓ {api} - Not implemented")

    def check_database_structure(self):
        """Check database structure and connections"""
        print("\n🗄️ Database Structure Check...")
        
        # Test system analytics to verify database connection
        success, data = self.test_endpoint("GET", "/api/system-analytics/health", expected_status=200, api_name="Database")
        
        if success:
            print("  ✅ Database connection working")
        else:
            print("  ❌ Database connection issues")
            self.results["database_issues"].append("Database connection problems")

    def generate_comprehensive_report(self):
        """Generate detailed report with action items"""
        print("\n" + "="*70)
        print("📊 COMPREHENSIVE API DEBUG REPORT - DPRO AI AGENT")
        print("="*70)
        
        # Summary statistics
        success_rate = (self.results['passed_tests']/self.results['total_tests']*100) if self.results['total_tests'] > 0 else 0
        
        print(f"\n📈 OVERALL STATUS:")
        print(f"  Total API Tests: {self.results['total_tests']}")
        print(f"  Passed Tests: {self.results['passed_tests']}")
        print(f"  Success Rate: {success_rate:.1f}%")
        print(f"  System Status: {'🟢 Good' if success_rate >= 80 else '🟡 Needs Work' if success_rate >= 60 else '🔴 Critical'}")
        
        # Working APIs
        print(f"\n✅ WORKING APIs ({len(self.results['working_apis'])}):")
        for api in sorted(set(self.results['working_apis'])):
            print(f"  ✅ {api} API")
        
        # Broken APIs
        print(f"\n❌ BROKEN APIs ({len(self.results['broken_apis'])}):")
        for api in sorted(set(self.results['broken_apis'])):
            print(f"  ❌ {api} API - Needs immediate fix")
        
        # Missing APIs
        print(f"\n❓ MISSING APIs ({len(self.results['missing_apis'])}):")
        for api in self.results['missing_apis']:
            print(f"  ❓ {api} - Needs implementation")
        
        # Database Issues
        print(f"\n🗄️ DATABASE ISSUES ({len(self.results['database_issues'])}):")
        for issue in self.results['database_issues']:
            print(f"  🗄️ {issue}")
        
        # Action plan
        print(f"\n🎯 IMMEDIATE ACTION PLAN:")
        print("  Priority 1 - Fix Broken APIs:")
        if "Agents" in self.results['broken_apis']:
            print("    1. Fix Agents API database model and service layer")
        if "Chat" in self.results['broken_apis']:
            print("    2. Fix Chat API database relationships")
        
        print("  Priority 2 - Implement Missing APIs:")
        if self.results['missing_apis']:
            print("    3. Create FormBuilder backend API")
            print("    4. Implement remaining missing APIs")
        
        # Time estimates
        broken_count = len(set(self.results['broken_apis']))
        missing_count = len(self.results['missing_apis'])
        
        print(f"\n⏰ COMPLETION ESTIMATES:")
        print(f"  🔧 Fix broken APIs: {broken_count} × 2 hours = {broken_count * 2} hours")
        print(f"  🆕 Create missing APIs: {missing_count} × 3 hours = {missing_count * 3} hours")
        print(f"  📅 Total time needed: {(broken_count * 2) + (missing_count * 3)} hours")
        print(f"  🎯 Target completion: {((broken_count * 2) + (missing_count * 3))/8:.1f} working days")
        
        # Final status
        if success_rate >= 90:
            print(f"\n🎉 STATUS: System is production ready!")
        elif success_rate >= 75:
            print(f"\n✅ STATUS: System is mostly ready, minor fixes needed")
        else:
            print(f"\n⚠️ STATUS: System needs significant work before production")

    def run_complete_diagnosis(self):
        """Run complete system diagnosis"""
        print("🚀 DPRO AI AGENT - COMPREHENSIVE API DIAGNOSIS")
        print(f"⏰ Started: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*70)
        
        # Step 1: Authenticate
        if not self.authenticate():
            print("❌ Cannot proceed without authentication. Check server status.")
            return False
        
        # Step 2: Test all working APIs
        self.test_all_working_apis()
        
        # Step 3: Test problematic APIs
        self.test_agents_api()
        self.test_chat_api()
        
        # Step 4: Check for missing APIs
        self.identify_missing_apis()
        
        # Step 5: Verify database
        self.check_database_structure()
        
        # Step 6: Generate comprehensive report
        self.generate_comprehensive_report()
        
        print(f"\n✅ Diagnosis completed: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        return True

if __name__ == "__main__":
    print("🔧 DPRO AI Agent - System Diagnostic Tool")
    print("This script will test all APIs and identify issues\n")
    
    debugger = APIDebugger()
    success = debugger.run_complete_diagnosis()
    
    if success:
        print("\n💡 Next steps: Use this report to prioritize fixes and implementations")
    else:
        print("\n❌ Diagnostic failed. Check server connection and try again.")

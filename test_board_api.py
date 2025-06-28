"""
Board API Testing Script
Comprehensive tests for all Board endpoints
"""

import asyncio
import uuid
import json
import requests
import time
from datetime import datetime
from typing import Dict, List, Optional

class BoardAPITester:
    """Complete Board API testing suite"""
    
    def __init__(self, base_url: str = "http://localhost:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.auth_token: Optional[str] = None
        self.test_board_id: Optional[str] = None
        self.test_node_ids: List[str] = []
        self.test_connection_ids: List[str] = []
        
    def log(self, message: str, status: str = "INFO"):
        """Enhanced logging with status"""
        timestamp = datetime.now().strftime("%H:%M:%S")
        status_symbols = {
            "INFO": "📝",
            "SUCCESS": "✅", 
            "ERROR": "❌",
            "WARNING": "⚠️",
            "TEST": "🧪"
        }
        symbol = status_symbols.get(status, "📝")
        print(f"[{timestamp}] {symbol} {message}")
    
    def authenticate(self) -> bool:
        """Authenticate with the API - USE EXISTING USER"""
        try:
            # Use existing test user (we know this works from our earlier test)
            user_data = {
                "email": "me@alarade.at",
                "password": "admin123456"
            }
            
            # Skip user creation, use existing user
            self.log("Using existing test user...", "TEST")
            
            # Login with existing user
            self.log("Authenticating existing user...", "TEST")
            login_response = self.session.post(
                f"{self.base_url}/auth/login",
                json=user_data
            )
            
            if login_response.status_code == 200:
                data = login_response.json()
                if data.get("success") and "data" in data and "access_token" in data["data"]:
                    self.auth_token = data["data"]["access_token"]
                    self.session.headers.update({
                        "Authorization": f"Bearer {self.auth_token}"
                    })
                    self.log("Authentication successful", "SUCCESS")
                    return True
            
            self.log(f"Authentication failed: {login_response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Authentication error: {str(e)}", "ERROR")
            return False
    
    def test_health_check(self) -> bool:
        """Test workflow API health check"""
        try:
            self.log("Testing workflow API health check...", "TEST")
            response = self.session.get(f"{self.base_url}/workflows/health")
            
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == "healthy":
                    self.log("Health check passed", "SUCCESS")
                    return True
            
            self.log(f"Health check failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Health check error: {str(e)}", "ERROR")
            return False
    
    def test_create_board(self) -> bool:
        """Test board creation"""
        try:
            self.log("Testing board creation...", "TEST")
            
            board_data = {
                "name": f"Test Board {datetime.now().strftime('%H:%M:%S')}",
                "description": "Test board created by API testing script",
                "board_type": "workflow",
                "status": "draft",
                "visibility": "private",
                "zoom_level": 1.0,
                "pan_x": 0.0,
                "pan_y": 0.0,
                "connection_type": "curved",
                "theme": "light",
                "board_data": {"test": True},
                "settings": {"auto_save": True},
                "is_executable": False,
                "agent_id": None
            }
            
            response = self.session.post(
                f"{self.base_url}/workflows/boards",
                json=board_data
            )
            
            if response.status_code == 201:
                data = response.json()
                if "id" in data:
                    self.test_board_id = data["id"]
                    self.log(f"Board created successfully: {self.test_board_id}", "SUCCESS")
                    return True
            
            self.log(f"Board creation failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Board creation error: {str(e)}", "ERROR")
            return False
    
    def test_get_board(self) -> bool:
        """Test board retrieval"""
        try:
            if not self.test_board_id:
                self.log("No board ID to test retrieval", "WARNING")
                return False
            
            self.log(f"Testing board retrieval: {self.test_board_id}", "TEST")
            
            response = self.session.get(
                f"{self.base_url}/workflows/boards/{self.test_board_id}"
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("id") == self.test_board_id:
                    self.log("Board retrieved successfully", "SUCCESS")
                    return True
            
            self.log(f"Board retrieval failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Board retrieval error: {str(e)}", "ERROR")
            return False
    
    def test_update_board(self) -> bool:
        """Test board update"""
        try:
            if not self.test_board_id:
                self.log("No board ID to test update", "WARNING")
                return False
            
            self.log(f"Testing board update: {self.test_board_id}", "TEST")
            
            update_data = {
                "name": f"Updated Test Board {datetime.now().strftime('%H:%M:%S')}",
                "description": "Updated by API testing script",
                "status": "active",
                "zoom_level": 1.5,
                "is_executable": True
            }
            
            response = self.session.put(
                f"{self.base_url}/workflows/boards/{self.test_board_id}",
                json=update_data
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("name") == update_data["name"]:
                    self.log("Board updated successfully", "SUCCESS")
                    return True
            
            self.log(f"Board update failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Board update error: {str(e)}", "ERROR")
            return False
    
    def test_create_nodes(self) -> bool:
        """Test node creation"""
        try:
            if not self.test_board_id:
                self.log("No board ID to test node creation", "WARNING")
                return False
            
            self.log("Testing node creation...", "TEST")
            
            nodes_data = [
                {
                    "node_type": "webhook",
                    "label": "Start Webhook",
                    "description": "Starting point for workflow",
                    "position_x": 100.0,
                    "position_y": 100.0,
                    "color": "#8e44ad",
                    "icon": "fas fa-play",
                    "is_start_node": True,
                    "config": {"url": "https://api.example.com/webhook"}
                },
                {
                    "node_type": "ai",
                    "label": "AI Processing",
                    "description": "AI-powered data processing",
                    "position_x": 300.0,
                    "position_y": 100.0,
                    "color": "#ff5e57",
                    "icon": "fas fa-robot",
                    "config": {"model": "gpt-4", "temperature": 0.7}
                },
                {
                    "node_type": "email",
                    "label": "Send Email",
                    "description": "Send notification email",
                    "position_x": 500.0,
                    "position_y": 100.0,
                    "color": "#43A047",
                    "icon": "fas fa-envelope",
                    "is_end_node": True,
                    "config": {"template": "notification"}
                }
            ]
            
            created_count = 0
            for node_data in nodes_data:
                response = self.session.post(
                    f"{self.base_url}/workflows/boards/{self.test_board_id}/nodes",
                    json=node_data
                )
                
                if response.status_code == 201:
                    data = response.json()
                    if "id" in data:
                        self.test_node_ids.append(data["id"])
                        created_count += 1
                        self.log(f"Created node: {data['label']} ({data['id']})", "SUCCESS")
                else:
                    self.log(f"Node creation failed: {response.text}", "ERROR")
            
            if created_count == len(nodes_data):
                self.log(f"All {created_count} nodes created successfully", "SUCCESS")
                return True
            else:
                self.log(f"Only {created_count}/{len(nodes_data)} nodes created", "WARNING")
                return False
            
        except Exception as e:
            self.log(f"Node creation error: {str(e)}", "ERROR")
            return False
    
    def test_create_connections(self) -> bool:
        """Test connection creation"""
        try:
            if len(self.test_node_ids) < 2:
                self.log("Not enough nodes to test connections", "WARNING")
                return False
            
            self.log("Testing connection creation...", "TEST")
            
            connections_data = []
            for i in range(len(self.test_node_ids) - 1):
                connection_data = {
                    "source_node_id": self.test_node_ids[i],
                    "target_node_id": self.test_node_ids[i + 1],
                    "connection_type": "data",
                    "color": "#667eea",
                    "style": "solid"
                }
                connections_data.append(connection_data)
            
            created_count = 0
            for connection_data in connections_data:
                response = self.session.post(
                    f"{self.base_url}/workflows/boards/{self.test_board_id}/connections",
                    json=connection_data
                )
                
                if response.status_code == 201:
                    data = response.json()
                    if "id" in data:
                        self.test_connection_ids.append(data["id"])
                        created_count += 1
                        self.log(f"Created connection: {data['id']}", "SUCCESS")
                else:
                    self.log(f"Connection creation failed: {response.text}", "ERROR")
            
            if created_count == len(connections_data):
                self.log(f"All {created_count} connections created successfully", "SUCCESS")
                return True
            else:
                self.log(f"Only {created_count}/{len(connections_data)} connections created", "WARNING")
                return False
            
        except Exception as e:
            self.log(f"Connection creation error: {str(e)}", "ERROR")
            return False
    
    def test_list_boards(self) -> bool:
        """Test board listing"""
        try:
            self.log("Testing board listing...", "TEST")
            
            response = self.session.get(f"{self.base_url}/workflows/boards")
            
            if response.status_code == 200:
                data = response.json()
                if "boards" in data and isinstance(data["boards"], list):
                    board_count = len(data["boards"])
                    total = data.get("total", 0)
                    self.log(f"Board listing successful: {board_count} boards, {total} total", "SUCCESS")
                    return True
            
            self.log(f"Board listing failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Board listing error: {str(e)}", "ERROR")
            return False
    
    def test_board_stats(self) -> bool:
        """Test board statistics"""
        try:
            if not self.test_board_id:
                self.log("No board ID to test stats", "WARNING")
                return False
            
            self.log(f"Testing board statistics: {self.test_board_id}", "TEST")
            
            response = self.session.get(
                f"{self.base_url}/workflows/boards/{self.test_board_id}/stats"
            )
            
            if response.status_code == 200:
                data = response.json()
                if data.get("success") and "data" in data:
                    stats = data["data"]
                    self.log(f"Board stats: {stats['node_count']} nodes, {stats['connection_count']} connections", "SUCCESS")
                    return True
            
            self.log(f"Board stats failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Board stats error: {str(e)}", "ERROR")
            return False
    
    def test_board_execution(self) -> bool:
        """Test board execution"""
        try:
            if not self.test_board_id:
                self.log("No board ID to test execution", "WARNING")
                return False
            
            self.log(f"Testing board execution: {self.test_board_id}", "TEST")
            
            execution_data = {
                "execution_type": "manual",
                "trigger_data": {"test": True, "initiated_by": "api_test"}
            }
            
            response = self.session.post(
                f"{self.base_url}/workflows/boards/{self.test_board_id}/execute",
                json=execution_data
            )
            
            if response.status_code == 201:
                data = response.json()
                if "id" in data and data.get("status"):
                    self.log(f"Board execution started: {data['id']} (status: {data['status']})", "SUCCESS")
                    return True
            
            self.log(f"Board execution failed: {response.text}", "ERROR")
            return False
            
        except Exception as e:
            self.log(f"Board execution error: {str(e)}", "ERROR")
            return False
    
    def test_cleanup(self) -> bool:
        """Clean up test data"""
        try:
            self.log("Cleaning up test data...", "TEST")
            
            # Delete connections first
            for connection_id in self.test_connection_ids:
                response = self.session.delete(
                    f"{self.base_url}/workflows/boards/{self.test_board_id}/connections/{connection_id}"
                )
                if response.status_code == 200:
                    self.log(f"Deleted connection: {connection_id}", "SUCCESS")
                else:
                    self.log(f"Failed to delete connection {connection_id}: {response.text}", "WARNING")
            
            # Delete nodes
            for node_id in self.test_node_ids:
                response = self.session.delete(
                    f"{self.base_url}/workflows/boards/{self.test_board_id}/nodes/{node_id}"
                )
                if response.status_code == 200:
                    self.log(f"Deleted node: {node_id}", "SUCCESS")
                else:
                    self.log(f"Failed to delete node {node_id}: {response.text}", "WARNING")
            
            # Delete board
            if self.test_board_id:
                response = self.session.delete(
                    f"{self.base_url}/workflows/boards/{self.test_board_id}"
                )
                if response.status_code == 200:
                    self.log(f"Deleted board: {self.test_board_id}", "SUCCESS")
                    return True
                else:
                    self.log(f"Failed to delete board: {response.text}", "WARNING")
            
            return True
            
        except Exception as e:
            self.log(f"Cleanup error: {str(e)}", "ERROR")
            return False
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run complete test suite"""
        self.log("Starting Board API Test Suite", "INFO")
        self.log("=" * 50, "INFO")
        
        test_results = {}
        
        # Authentication test
        test_results["authentication"] = self.authenticate()
        if not test_results["authentication"]:
            self.log("Authentication failed - stopping tests", "ERROR")
            return test_results
        
        # Health check test
        test_results["health_check"] = self.test_health_check()
        
        # Board CRUD tests
        test_results["create_board"] = self.test_create_board()
        test_results["get_board"] = self.test_get_board()
        test_results["update_board"] = self.test_update_board()
        test_results["list_boards"] = self.test_list_boards()
        
        # Node tests
        test_results["create_nodes"] = self.test_create_nodes()
        
        # Connection tests
        test_results["create_connections"] = self.test_create_connections()
        
        # Advanced features
        test_results["board_stats"] = self.test_board_stats()
        test_results["board_execution"] = self.test_board_execution()
        
        # Cleanup
        test_results["cleanup"] = self.test_cleanup()
        
        # Test summary
        self.log("=" * 50, "INFO")
        self.log("Test Results Summary:", "INFO")
        passed = 0
        for test_name, result in test_results.items():
            status = "PASSED" if result else "FAILED"
            symbol = "✅" if result else "❌"
            self.log(f"{symbol} {test_name}: {status}", "INFO")
            if result:
                passed += 1
        
        total_tests = len(test_results)
        self.log(f"Overall: {passed}/{total_tests} tests passed", 
                "SUCCESS" if passed == total_tests else "WARNING")
        
        return test_results

def main():
    """Main testing function"""
    print("🚀 Board API Comprehensive Testing Suite")
    print("=" * 60)
    
    tester = BoardAPITester()
    results = tester.run_all_tests()
    
    # Exit with appropriate code
    passed = sum(1 for result in results.values() if result)
    total = len(results)
    
    if passed == total:
        print("\n🎉 All tests passed! Board API is working correctly.")
        exit(0)
    else:
        print(f"\n⚠️ {total - passed} tests failed. Please check the logs above.")
        exit(1)

if __name__ == "__main__":
    main() 
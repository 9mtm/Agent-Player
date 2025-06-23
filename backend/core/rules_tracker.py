#!/usr/bin/env python3
"""
Rules Tracker - Automatically track and update API endpoints and database tables in rules files
"""

import ast
import os
import re
from pathlib import Path
from typing import List, Dict, Any
from datetime import datetime

class RulesTracker:
    def __init__(self):
        self.rules_dir = Path(".cursor/rules")
        self.api_endpoints = []
        self.database_tables = []
        # Updated to use organized structure
        self.api_rules_file = self.rules_dir / "05-api" / "rest-standards.mdc"
        self.db_rules_file = self.rules_dir / "04-database" / "schema-design.mdc"
        self.agent_specific_dir = self.rules_dir / "11-agent-player-specific"
    
    def scan_api_endpoints(self) -> List[Dict[str, Any]]:
        """Scan all API endpoint files for new routes"""
        endpoints = []
        api_dir = Path("backend/api")
        
        if not api_dir.exists():
            print(f"API directory {api_dir} does not exist")
            return endpoints
        
        for py_file in api_dir.rglob("*.py"):
            if py_file.name == "__init__.py":
                continue
                
            endpoints.extend(self._extract_endpoints_from_file(py_file))
        
        return endpoints
    
    def _extract_endpoints_from_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extract API endpoints from Python file"""
        endpoints = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find router decorators
            router_pattern = r'@router\.(get|post|put|delete|patch)\(["\']([^"\']+)["\'].*?\)'
            matches = re.finditer(router_pattern, content, re.IGNORECASE | re.MULTILINE)
            
            for match in matches:
                method = match.group(1).upper()
                path = match.group(2)
                
                # Extract function name
                func_pattern = rf'{re.escape(match.group(0))}\s*(?:.*\n)*?\s*(?:async\s+)?def\s+(\w+)'
                func_match = re.search(func_pattern, content, re.MULTILINE | re.DOTALL)
                
                if func_match:
                    func_name = func_match.group(1)
                    
                    endpoints.append({
                        "method": method,
                        "path": path,
                        "function": func_name,
                        "file": str(file_path),
                        "module": self._get_module_name(file_path),
                        "discovered_at": datetime.now().isoformat()
                    })
        
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
        
        return endpoints
    
    def _get_module_name(self, file_path: Path) -> str:
        """Get module name from file path"""
        try:
            relative_path = file_path.relative_to(Path("backend"))
            return str(relative_path).replace("/", ".").replace("\\", ".").replace(".py", "")
        except ValueError:
            return str(file_path).replace("/", ".").replace("\\", ".").replace(".py", "")
    
    def scan_database_tables(self) -> List[Dict[str, Any]]:
        """Scan database models for new tables"""
        tables = []
        
        # Check multiple possible locations for models
        possible_dirs = [
            Path("backend/models"),
            Path("backend/infrastructure/database/models"),
            Path("backend/database/models")
        ]
        
        models_dir = None
        for dir_path in possible_dirs:
            if dir_path.exists():
                models_dir = dir_path
                break
        
        if not models_dir:
            print("No models directory found")
            return tables
        
        for py_file in models_dir.rglob("*.py"):
            if py_file.name == "__init__.py":
                continue
                
            tables.extend(self._extract_tables_from_file(py_file))
        
        return tables
    
    def _extract_tables_from_file(self, file_path: Path) -> List[Dict[str, Any]]:
        """Extract database tables from SQLAlchemy models"""
        tables = []
        
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Find table definitions
            table_pattern = r'__tablename__\s*=\s*["\']([^"\']+)["\']'
            class_pattern = r'class\s+(\w+)\s*\([^)]*\):'
            
            table_matches = list(re.finditer(table_pattern, content))
            class_matches = list(re.finditer(class_pattern, content))
            
            for table_match in table_matches:
                table_name = table_match.group(1)
                
                # Find corresponding class
                class_name = None
                for class_match in reversed(class_matches):
                    if class_match.start() < table_match.start():
                        class_name = class_match.group(1)
                        break
                
                if class_name:
                    tables.append({
                        "table_name": table_name,
                        "class_name": class_name,
                        "file": str(file_path),
                        "discovered_at": datetime.now().isoformat()
                    })
        
        except Exception as e:
            print(f"Error scanning {file_path}: {e}")
        
        return tables
    
    def update_api_rules(self, new_endpoints: List[Dict[str, Any]]):
        """Update API rules file with new endpoints"""
        if not new_endpoints:
            return
        
        # Ensure rules directory exists
        self.rules_dir.mkdir(exist_ok=True)
        
        # Read current API rules
        current_content = ""
        if self.api_rules_file.exists():
            with open(self.api_rules_file, 'r', encoding='utf-8') as f:
                current_content = f.read()
        
        # Generate new endpoints section
        new_section = self._generate_api_endpoints_section(new_endpoints)
        
        # Insert or update endpoints section
        updated_content = self._insert_or_update_section(
            current_content, 
            "## DISCOVERED API ENDPOINTS", 
            new_section
        )
        
        # Write updated content
        with open(self.api_rules_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        print(f"Updated {len(new_endpoints)} API endpoints in rules")
        
        # Update current tasks
        self._update_current_tasks("API endpoints discovered", len(new_endpoints))
    
    def _generate_api_endpoints_section(self, endpoints: List[Dict[str, Any]]) -> str:
        """Generate API endpoints documentation section"""
        section = "## DISCOVERED API ENDPOINTS - AUTO-GENERATED\n\n"
        section += f"<!-- Last updated: {datetime.now().isoformat()} -->\n\n"
        
        # Group by module
        modules = {}
        for endpoint in endpoints:
            module = endpoint["module"]
            if module not in modules:
                modules[module] = []
            modules[module].append(endpoint)
        
        for module, module_endpoints in modules.items():
            section += f"### **{module.upper()} MODULE ENDPOINTS**\n"
            section += "```python\n"
            
            for ep in module_endpoints:
                section += f"# {ep['method']} {ep['path']} - {ep['function']}\n"
                section += f"@router.{ep['method'].lower()}(\"{ep['path']}\")\n"
                section += f"async def {ep['function']}():\n"
                section += f"    # MANDATORY: Validate input data\n"
                section += f"    # MANDATORY: Check user permissions\n"
                section += f"    # MANDATORY: Log operation\n"
                section += f"    # MANDATORY: Handle errors gracefully\n"
                section += f"    pass\n\n"
            
            section += "```\n\n"
        
        return section
    
    def update_database_rules(self, new_tables: List[Dict[str, Any]]):
        """Update database rules file with new tables"""
        if not new_tables:
            return
        
        # Ensure rules directory exists
        self.rules_dir.mkdir(exist_ok=True)
        
        # Read current database rules
        current_content = ""
        if self.db_rules_file.exists():
            with open(self.db_rules_file, 'r', encoding='utf-8') as f:
                current_content = f.read()
        
        # Generate new tables section
        new_section = self._generate_database_tables_section(new_tables)
        
        # Insert or update tables section
        updated_content = self._insert_or_update_section(
            current_content, 
            "## DISCOVERED DATABASE TABLES", 
            new_section
        )
        
        # Write updated content
        with open(self.db_rules_file, 'w', encoding='utf-8') as f:
            f.write(updated_content)
        
        print(f"Updated {len(new_tables)} database tables in rules")
        
        # Update current tasks  
        self._update_current_tasks("Database tables discovered", len(new_tables))
    
    def _generate_database_tables_section(self, tables: List[Dict[str, Any]]) -> str:
        """Generate database tables documentation section"""
        section = "## DISCOVERED DATABASE TABLES - AUTO-GENERATED\n\n"
        section += f"<!-- Last updated: {datetime.now().isoformat()} -->\n\n"
        
        for table in tables:
            section += f"### **{table['table_name'].upper()} TABLE**\n"
            section += f"```sql\n"
            section += f"-- Model: {table['class_name']}\n"
            section += f"-- File: {table['file']}\n"
            section += f"-- MANDATORY: Add proper indexes\n"
            section += f"-- MANDATORY: Add foreign key constraints\n"
            section += f"-- MANDATORY: Add validation rules\n"
            section += f"-- MANDATORY: Add audit logging\n"
            section += f"```\n\n"
        
        return section
    
    def _insert_or_update_section(self, content: str, section_header: str, new_section: str) -> str:
        """Insert or update a section in the content"""
        # Find existing section
        section_pattern = rf'^{re.escape(section_header)}.*?(?=^##|\Z)'
        match = re.search(section_pattern, content, re.MULTILINE | re.DOTALL)
        
        if match:
            # Replace existing section
            return content[:match.start()] + new_section + content[match.end():]
        else:
            # Append new section
            return content + "\n\n" + new_section
    
    def run_full_scan(self):
        """Run complete scan and update all rules"""
        print("Scanning for new API endpoints...")
        new_endpoints = self.scan_api_endpoints()
        
        print("Scanning for new database tables...")
        new_tables = self.scan_database_tables()
        
        if new_endpoints:
            print(f"Found {len(new_endpoints)} API endpoints")
            self.update_api_rules(new_endpoints)
        
        if new_tables:
            print(f"Found {len(new_tables)} database tables")
            self.update_database_rules(new_tables)
        
        if not new_endpoints and not new_tables:
            print("No new endpoints or tables found")
        
        print("Rules update complete!")
    
    def _update_current_tasks(self, task_description: str, count: int):
        """Update current tasks file with discovery results"""
        tasks_file = self.rules_dir / "12-tasks" / "current-tasks.mdc"
        
        if not tasks_file.exists():
            print("Warning: Current tasks file not found")
            return
        
        try:
            with open(tasks_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Add discovery log entry
            discovery_entry = f"\n### DISCOVERY LOG - {datetime.now().strftime('%Y-%m-%d %H:%M')}\n"
            discovery_entry += f"- **Task:** {task_description}\n"
            discovery_entry += f"- **Count:** {count} items\n"
            discovery_entry += f"- **Status:** Auto-updated in rules\n"
            discovery_entry += f"- **Rules Updated:** {datetime.now().isoformat()}\n\n"
            
            # Insert before the final REMEMBER section
            remember_pattern = r'(\*\*REMEMBER: Every task must update this file with progress!\*\*)'
            if re.search(remember_pattern, content):
                updated_content = re.sub(
                    remember_pattern,
                    discovery_entry + r'\1',
                    content
                )
                
                with open(tasks_file, 'w', encoding='utf-8') as f:
                    f.write(updated_content)
                    
                print(f"Updated current-tasks.mdc with {task_description}")
            
        except Exception as e:
            print(f"Error updating current tasks: {e}")

def main():
    """Main function to run the rules tracker"""
    print("Agent Player Rules Tracker")
    print("=" * 40)
    
    tracker = RulesTracker()
    tracker.run_full_scan()

if __name__ == "__main__":
    main() 
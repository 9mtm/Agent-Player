#!/usr/bin/env python3
"""
Simple test script for rules tracker
"""

import sys
import os
from pathlib import Path

# Add backend to path
sys.path.append(str(Path('backend')))

try:
    from core.rules_tracker import RulesTracker
    
    print("Agent Player Rules Tracker Test")
    print("=" * 35)
    
    tracker = RulesTracker()
    
    print("1. Scanning API endpoints...")
    endpoints = tracker.scan_api_endpoints()
    print(f"   Found {len(endpoints)} endpoints")
    
    print("2. Scanning database tables...")
    tables = tracker.scan_database_tables()
    print(f"   Found {len(tables)} tables")
    
    if endpoints:
        print("\nAPI Endpoints found:")
        for ep in endpoints[:3]:  # Show first 3
            print(f"   {ep['method']} {ep['path']} - {ep['function']}")
        if len(endpoints) > 3:
            print(f"   ... and {len(endpoints) - 3} more")
    
    if tables:
        print("\nDatabase Tables found:")
        for table in tables[:3]:  # Show first 3
            print(f"   {table['table_name']} ({table['class_name']})")
        if len(tables) > 3:
            print(f"   ... and {len(tables) - 3} more")
    
    print("\nTest completed successfully!")
    
except Exception as e:
    print(f"Error: {e}")
    import traceback
    traceback.print_exc() 
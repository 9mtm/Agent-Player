#!/usr/bin/env python3
"""
DPRO AI Agent - Run Script
Simple script to run the main application
"""

import sys
import subprocess

def main():
    """Run the main application"""
    print("Starting DPRO AI Agent Backend")
    try:
        # Run the main application using uvicorn
        subprocess.run([
            sys.executable, "-m", "uvicorn", 
            "main:app", 
            "--host", "0.0.0.0", 
            "--port", "8000", 
            "--reload"
        ], check=True)
    except KeyboardInterrupt:
        print("\nShutdown requested by user")
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main() 
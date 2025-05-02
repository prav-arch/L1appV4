#!/usr/bin/env python
"""
Script to run the Python backend for the Telecom Log Analysis Application
"""

import os
import sys
import subprocess
import pkg_resources

# Check required packages
REQUIRED_PACKAGES = [
    'flask',
    'flask-cors',
    'pymilvus',
    'python-dotenv',
    'requests'
]

def check_and_install_requirements():
    """Check if all required packages are installed and install them if necessary"""
    missing = []
    
    for package in REQUIRED_PACKAGES:
        try:
            pkg_resources.get_distribution(package)
        except pkg_resources.DistributionNotFound:
            missing.append(package)
    
    if missing:
        print(f"Installing missing packages: {', '.join(missing)}")
        subprocess.check_call([sys.executable, "-m", "pip", "install", *missing])
        print("All required packages installed successfully.")

def ensure_directory_structure():
    """Ensure Python backend directory structure exists"""
    directories = [
        'python_backend',
        'python_backend/services',
    ]
    
    for directory in directories:
        os.makedirs(directory, exist_ok=True)
    
    # Create empty __init__.py files if they don't exist
    init_files = [
        'python_backend/__init__.py',
        'python_backend/services/__init__.py',
    ]
    
    for init_file in init_files:
        if not os.path.exists(init_file):
            with open(init_file, 'w') as f:
                f.write("# This file is intentionally left empty\n")

def main():
    """Main entry point"""
    # Check and install requirements
    check_and_install_requirements()
    
    # Ensure directory structure
    ensure_directory_structure()
    
    # Set environment variables if needed
    os.environ.setdefault('FLASK_APP', 'python_backend.app')
    os.environ.setdefault('FLASK_ENV', 'development')
    
    # Run Flask application
    from python_backend.app import app
    
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)

if __name__ == '__main__':
    main()
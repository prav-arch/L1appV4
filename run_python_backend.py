#!/usr/bin/env python3
"""
Script to run the Python backend for the Telecom Log Analysis Application
"""
import os
import sys
import subprocess
import shutil
from pathlib import Path

def check_and_install_requirements():
    """Check if all required packages are installed and install them if necessary"""
    required_packages = [
        "flask",
        "flask-cors",
        "pymilvus",
        "python-dotenv",
        "requests",
        "scapy",
        "pyshark"
    ]
    
    try:
        # Check if pip is available
        subprocess.run([sys.executable, "-m", "pip", "--version"], 
                      check=True, capture_output=True)
        
        # Install required packages
        for package in required_packages:
            try:
                __import__(package.replace("-", "_"))
                print(f"✓ {package} is already installed")
            except ImportError:
                print(f"Installing {package}...")
                subprocess.run([sys.executable, "-m", "pip", "install", package],
                              check=True)
                print(f"✓ {package} installed successfully")
    except Exception as e:
        print(f"Error installing requirements: {e}")
        print("Please install the required packages manually:")
        print(" ".join(required_packages))
        return False
    
    return True

def ensure_directory_structure():
    """Ensure Python backend directory structure exists"""
    # Project directories
    project_directories = [
        "python_backend",
        "python_backend/services",
        "uploads"
    ]
    
    # External data directories (one level up from project)
    external_data_dir = Path("../data")
    data_subdirectories = [
        "models/gguf",
        "milvus-config",
        "volumes/etcd",
        "volumes/minio",
        "volumes/milvus",
        "fine_tuning"
    ]
    
    # Create project directories
    for directory in project_directories:
        Path(directory).mkdir(parents=True, exist_ok=True)
    
    # Create external data directories
    for subdir in data_subdirectories:
        (external_data_dir / subdir).mkdir(parents=True, exist_ok=True)
    
    print("✓ Project directory structure verified")
    print(f"✓ External data directory created at: {external_data_dir.resolve()}")
    return True

def main():
    """Main entry point"""
    print("=" * 70)
    print("Telecom Log Analysis Platform - Python Backend")
    print("=" * 70)
    
    # Check if Python is at least version 3.8
    if sys.version_info < (3, 8):
        print("Error: Python 3.8 or higher is required")
        sys.exit(1)
    
    # Check and install requirements
    if not check_and_install_requirements():
        sys.exit(1)
    
    # Ensure directory structure
    if not ensure_directory_structure():
        sys.exit(1)
    
    # Check if the app.py file exists
    app_path = Path("python_backend/app.py")
    if not app_path.exists():
        print("Error: python_backend/app.py not found")
        sys.exit(1)
    
    print("\nStarting Python backend...")
    
    # Set environment variables
    os.environ["FLASK_APP"] = "python_backend/app.py"
    os.environ["FLASK_ENV"] = "development"
    os.environ["FLASK_RUN_HOST"] = "0.0.0.0"
    os.environ["FLASK_RUN_PORT"] = "5001"
    
    # Set data directory environment variables
    external_data_dir = Path("../data").resolve()
    os.environ["MODELS_PATH"] = str(external_data_dir / "models")
    os.environ["MILVUS_CONFIG_PATH"] = str(external_data_dir / "milvus-config")
    os.environ["VOLUMES_PATH"] = str(external_data_dir / "volumes")
    print(f"✓ Using external data directory: {external_data_dir}")
    print(f"  - Models path: {os.environ['MODELS_PATH']}")
    print(f"  - Milvus config path: {os.environ['MILVUS_CONFIG_PATH']}")
    print(f"  - Volumes path: {os.environ['VOLUMES_PATH']}")
    
    # Start the Flask server
    try:
        subprocess.run([sys.executable, "-m", "flask", "run"], check=True)
    except KeyboardInterrupt:
        print("\nShutting down Python backend...")
    except Exception as e:
        print(f"Error starting Flask server: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
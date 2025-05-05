#!/bin/bash
# Script to run the Python backend for the telecom log analysis application

echo "Starting Python backend for telecom log analysis..."

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating Python virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install required packages if needed
echo "Checking/installing required Python packages..."
pip install flask flask-cors pymilvus python-dotenv requests scapy

# Set environment variables
export FLASK_APP=python_backend/app.py
export FLASK_ENV=development
export FLASK_RUN_HOST=0.0.0.0
export FLASK_RUN_PORT=5001

# Start the Flask server
echo "Starting Flask server on port 5001..."
python -m flask run

# Deactivate virtual environment when done
deactivate
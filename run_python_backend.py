#!/usr/bin/env python
"""
Script to run the Python backend for the Telecom Log Analysis Application
"""
import os
import logging
from python_backend.app import app

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    datefmt='%Y-%m-%d %H:%M:%S'
)

if __name__ == '__main__':
    # Get port from environment or use default
    port = int(os.environ.get('PORT', 5001))
    
    # Run the Flask app
    logging.info(f"Starting Python backend on port {port}")
    app.run(host='0.0.0.0', port=port, debug=True)
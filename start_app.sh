#!/bin/bash

# Start Python backend on port 5001
echo "Starting Python backend on port 5001..."
python run_python_backend.py &
PYTHON_PID=$!

# Start TypeScript/React frontend on port 5000
echo "Starting React frontend on port 5000..."
npm run dev &
TS_PID=$!

# Function to kill both processes
cleanup() {
    echo "Shutting down servers..."
    kill -9 $PYTHON_PID
    kill -9 $TS_PID
    exit 0
}

# Handle termination signals
trap cleanup SIGINT SIGTERM

echo "Both servers started. Press Ctrl+C to stop."
echo "React frontend: http://localhost:5000"
echo "Python backend: http://localhost:5001"

# Keep script running
wait
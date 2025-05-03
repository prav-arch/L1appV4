#!/bin/bash
# Script to start the local LLM server using llama.cpp
# Optimized for Tesla P40 GPU environment

echo "==== Starting Local LLM Server for telecom log analysis application ===="
echo "This script runs the LLM server optimized for Tesla P40 GPU (24GB VRAM)"

# Check if models are downloaded
if [ ! -f "models/gguf/llama-3.1-8b.Q5_K_M.gguf" ]; then
    echo "LLM model not found. Please run download_models.sh first."
    exit 1
fi

# Check if llama.cpp is installed
if [ ! -d "llama.cpp" ]; then
    echo "llama.cpp not found. Installing llama.cpp..."
    
    # Clone llama.cpp repository
    git clone https://github.com/ggerganov/llama.cpp.git
    
    # Install build dependencies
    sudo apt-get update
    sudo apt-get install -y build-essential cmake cuda-toolkit-11-8
    
    # Build llama.cpp with CUDA support
    cd llama.cpp
    mkdir build
    cd build
    cmake .. -DLLAMA_CUBLAS=ON
    cmake --build . --config Release
    cd ../..
    
    echo "llama.cpp installed successfully."
fi

# Run the server with Tesla P40 optimized parameters
# Using n-gpu-layers to leverage the 24GB of VRAM on the P40
echo "Starting LLM server with model: llama-3.1-8b.Q5_K_M.gguf"
echo "The server will be available at http://0.0.0.0:8080"
echo "Use Ctrl+C to stop the server"

# Run the server in the foreground
cd llama.cpp
./server \
    -m ../models/gguf/llama-3.1-8b.Q5_K_M.gguf \
    --host 0.0.0.0 \
    --port 8080 \
    --n-gpu-layers 43 \
    --n-ctx 8192 \
    --cont-batching \
    --embedding \
    --parallel 4 \
    --mlock
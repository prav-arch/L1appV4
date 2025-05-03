#!/bin/bash
# Script to start the local LLM server using llama.cpp
# Optimized for Tesla P40 GPU environment with CPU fallback

echo "==== Starting Local LLM Server for telecom log analysis application ===="

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
    sudo apt-get install -y build-essential cmake
    
    # Check if NVIDIA drivers are installed
    USE_GPU=0
    if command -v nvidia-smi &> /dev/null; then
        echo "NVIDIA GPU detected. Building with CUDA support..."
        USE_GPU=1
        # Install CUDA toolkit if not already installed
        if ! dpkg -l | grep -q cuda-toolkit; then
            sudo apt-get install -y cuda-toolkit-11-8
        fi
        
        # Build llama.cpp with CUDA support
        cd llama.cpp
        mkdir -p build
        cd build
        cmake .. -DLLAMA_CUBLAS=ON
        cmake --build . --config Release
        cd ../..
    else
        echo "No NVIDIA GPU detected. Building for CPU only..."
        cd llama.cpp
        mkdir -p build
        cd build
        cmake ..
        cmake --build . --config Release
        cd ../..
    fi
    
    echo "llama.cpp installed successfully."
fi

echo "Starting LLM server with model: llama-3.1-8b.Q5_K_M.gguf"
echo "The server will be available at http://0.0.0.0:8080"
echo "Use Ctrl+C to stop the server"

# Check if we have GPU access
if command -v nvidia-smi &> /dev/null; then
    echo "Using Tesla P40 GPU for acceleration (24GB VRAM)"
    
    # Run the server with GPU acceleration
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
else
    echo "WARNING: Running in CPU-only mode - performance will be limited"
    echo "Install NVIDIA drivers for GPU acceleration"
    
    # Run in CPU-only mode with optimized settings for CPU
    cd llama.cpp
    ./server \
        -m ../models/gguf/llama-3.1-8b.Q5_K_M.gguf \
        --host 0.0.0.0 \
        --port 8080 \
        --n-ctx 4096 \
        --cont-batching \
        --embedding \
        --parallel $(nproc) \
        --mlock
fi
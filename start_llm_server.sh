#!/bin/bash
# Simple script to start the LLM server in the background

echo "Starting LLM server..."

# Check if we have the required models directory
if [ ! -d "models" ]; then
    mkdir -p models/gguf
    echo "Created models directory. You need to download models to models/gguf/"
    echo "For example, models/gguf/mistral-7b-v0.1.Q4_K_M.gguf"
    exit 1
fi

# Check if any model file exists
if [ ! "$(ls -A models/gguf 2>/dev/null)" ]; then
    echo "No model files found in models/gguf directory."
    echo "Please download a Mistral 7B model file to models/gguf/ directory."
    echo "For example, models/gguf/mistral-7b-v0.1.Q4_K_M.gguf"
    exit 1
fi

# Find the first available model file
MODEL_FILE=$(ls models/gguf/*.gguf 2>/dev/null | head -n 1)
if [ -z "$MODEL_FILE" ]; then
    echo "No .gguf model files found in models/gguf directory."
    echo "Please download a Mistral 7B model file to models/gguf/ directory."
    exit 1
fi

echo "Using model: $MODEL_FILE"

# Directory for llama.cpp
mkdir -p llama.cpp
cd llama.cpp

# Check if llama.cpp is already cloned
if [ ! -d ".git" ]; then
    echo "Cloning llama.cpp repository..."
    git clone https://github.com/ggerganov/llama.cpp .
    
    # Build llama.cpp with CPU optimizations
    echo "Building llama.cpp with CPU optimizations..."
    mkdir -p build
    cd build
    cmake -DLLAMA_CUBLAS=OFF -DLLAMA_BLAS=ON -DLLAMA_AVX=ON -DLLAMA_AVX2=ON ..
    cmake --build . --config Release -j$(nproc)
    cd ..
else
    echo "llama.cpp already cloned, updating repository..."
    git pull
    
    # Rebuild with CPU optimizations
    echo "Rebuilding llama.cpp with CPU optimizations..."
    cd build
    cmake --build . --config Release -j$(nproc)
    cd ..
fi

# Get CPU details
CPU_CORES=$(nproc)
# Allocate half of the cores for the server
SERVER_THREADS=$((CPU_CORES / 2))
if [ $SERVER_THREADS -lt 1 ]; then
    SERVER_THREADS=1
fi

# Calculate memory limits based on system RAM
SYS_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
SYS_MEM_GB=$((SYS_MEM_KB / 1024 / 1024))
# Use 50% of system memory for context
CONTEXT_SIZE=$((SYS_MEM_GB * 512))
if [ $CONTEXT_SIZE -gt 8192 ]; then
    CONTEXT_SIZE=8192
elif [ $CONTEXT_SIZE -lt 1024 ]; then
    CONTEXT_SIZE=1024
fi

# Start the server with the found model
echo "Starting llama.cpp server with $SERVER_THREADS threads and $CONTEXT_SIZE context size..."
cd build
echo "Server will be available at http://localhost:8080"
echo "Press Ctrl+C to stop the server"

# Launch the server in foreground mode so logs are visible
./server \
    -m ../../$MODEL_FILE \
    --host 0.0.0.0 \
    --port 8080 \
    --ctx-size $CONTEXT_SIZE \
    --threads $SERVER_THREADS \
    --embedding \
    --parallel $((SERVER_THREADS / 2 > 0 ? SERVER_THREADS / 2 : 1)) \
    --cont-batching
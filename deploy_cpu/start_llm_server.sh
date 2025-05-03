#!/bin/bash
# Script to start the LLM server in CPU-only mode

echo "Starting LLM server in CPU-only mode..."

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

# Start the server
echo "Starting llama.cpp server with $SERVER_THREADS threads and $CONTEXT_SIZE context size..."
cd build
./server \
    -m ../../../models/gguf/llama-3.1-7b.Q4_K_M.gguf \
    --host 0.0.0.0 \
    --port 8080 \
    --ctx-size $CONTEXT_SIZE \
    --threads $SERVER_THREADS \
    --embedding \
    --parallel $((SERVER_THREADS / 2 > 0 ? SERVER_THREADS / 2 : 1)) \
    --cont-batching \
    --log-disable
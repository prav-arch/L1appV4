#!/bin/bash
# Script to start the local LLM server using llama.cpp
# CPU-only configuration (no GPU required)

echo "==== Starting Local LLM Server for telecom log analysis application ===="
echo "CPU-Only Configuration"

# Check if models are downloaded
if [ ! -f "models/gguf/llama-3.1-7b.Q4_K_M.gguf" ]; then
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
    
    # Build llama.cpp for CPU
    cd llama.cpp
    mkdir -p build
    cd build
    cmake .. -DLLAMA_BLAS=ON -DLLAMA_AVX=ON -DLLAMA_AVX2=ON
    cmake --build . --config Release
    cd ../..
    
    echo "llama.cpp installed successfully with CPU optimizations."
fi

# Determine CPU core count and allocate resources
CORE_COUNT=$(nproc)
THREAD_COUNT=$((CORE_COUNT - 1))
if [ "$THREAD_COUNT" -lt 1 ]; then
    THREAD_COUNT=1
fi

# Set context size based on available memory
TOTAL_MEM_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
TOTAL_MEM_GB=$((TOTAL_MEM_KB / 1024 / 1024))

# Choose context size based on available memory
if [ "$TOTAL_MEM_GB" -ge 32 ]; then
    CTX_SIZE=4096  # For systems with 32GB+ RAM
elif [ "$TOTAL_MEM_GB" -ge 16 ]; then
    CTX_SIZE=2048  # For systems with 16GB+ RAM
else
    CTX_SIZE=1024  # For systems with less RAM
fi

echo "Starting LLM server with model: llama-3.1-7b.Q4_K_M.gguf"
echo "Hardware configuration: $CORE_COUNT CPU cores, using $THREAD_COUNT threads"
echo "Memory configuration: ${TOTAL_MEM_GB}GB RAM, using context size of $CTX_SIZE"
echo "The server will be available at http://0.0.0.0:8080"
echo "Use Ctrl+C to stop the server"

# Run the server in the foreground with CPU optimizations
cd llama.cpp
./server \
    -m ../models/gguf/llama-3.1-7b.Q4_K_M.gguf \
    --host 0.0.0.0 \
    --port 8080 \
    --n-ctx $CTX_SIZE \
    --cont-batching \
    --embedding \
    --parallel $THREAD_COUNT \
    --threads $THREAD_COUNT \
    --mlock
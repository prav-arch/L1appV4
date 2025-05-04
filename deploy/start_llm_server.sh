#!/bin/bash
# Script to start the LLM server in GPU mode (optimized for Tesla P40)

echo "Starting LLM server in GPU-accelerated mode..."

# Directory for llama.cpp
mkdir -p llama.cpp
cd llama.cpp

# Check if llama.cpp is already cloned
if [ ! -d ".git" ]; then
    echo "Cloning llama.cpp repository..."
    git clone https://github.com/ggerganov/llama.cpp .
    
    # Build llama.cpp with GPU support
    echo "Building llama.cpp with CUDA support..."
    mkdir -p build
    cd build
    cmake -DLLAMA_CUBLAS=ON -DLLAMA_CUDA_F16=ON ..
    cmake --build . --config Release -j$(nproc)
    cd ..
else
    echo "llama.cpp already cloned, updating repository..."
    git pull
    
    # Rebuild with GPU support
    echo "Rebuilding llama.cpp with CUDA support..."
    cd build
    cmake -DLLAMA_CUBLAS=ON -DLLAMA_CUDA_F16=ON ..
    cmake --build . --config Release -j$(nproc)
    cd ..
fi

# Get hardware details
GPU_MEM=$(nvidia-smi --query-gpu=memory.total --format=csv,noheader,nounits | awk '{print $1}')
CPU_CORES=$(nproc)

# Calculate optimal settings for Tesla P40
# P40 has 24GB memory, but we'll be conservative
if [ -z "$GPU_MEM" ]; then
    GPU_MEM=24000  # Default if nvidia-smi fails
fi

# Calculate context size (70% of GPU memory in MB converted to tokens)
CONTEXT_SIZE=$((GPU_MEM * 7 / 10 * 128))
if [ $CONTEXT_SIZE -gt 16384 ]; then
    CONTEXT_SIZE=16384  # Cap at 16K tokens for stability
fi

# Set threads to number of CPU cores, leave some for system
SERVER_THREADS=$((CPU_CORES * 3 / 4))
if [ $SERVER_THREADS -lt 1 ]; then
    SERVER_THREADS=1
fi

# Set batch size according to GPU
BATCH_SIZE=512

# We're using the Mistral 7B model
echo "Using Mistral 7B model with llama.cpp server..."
echo "Starting llama.cpp server with CUDA acceleration, $CONTEXT_SIZE context size, and batch size $BATCH_SIZE..."
cd build
./server \
    -m ../../../models/gguf/mistral-7b-v0.1.Q5_K_M.gguf \
    --host 0.0.0.0 \
    --port 8080 \
    --ctx-size $CONTEXT_SIZE \
    --batch-size $BATCH_SIZE \
    --threads $SERVER_THREADS \
    --embedding \
    --parallel 4 \
    --cont-batching \
    --log-disable \
    --gpu-layers 100
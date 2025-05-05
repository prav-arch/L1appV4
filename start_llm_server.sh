#!/bin/bash
# Script to start the local LLM server for the telecom log analysis application

echo "====================================================="
echo "Starting LLM server for telecom log analysis platform"
echo "====================================================="

# Define default and custom paths
DEFAULT_MODELS_DIR="models"
MODELS_DIR="${MODELS_PATH:-$DEFAULT_MODELS_DIR}"

echo "Using models directory: $MODELS_DIR"

# Check if models are downloaded
if [ ! -f "$MODELS_DIR/gguf/mistral-7b-v0.1.Q4_K_M.gguf" ]; then
    echo "Models not found. Downloading now..."
    MODELS_PATH="$MODELS_DIR" ./download_models.sh
    if [ $? -ne 0 ]; then
        echo "Error downloading models. Please run MODELS_PATH=\"$MODELS_DIR\" ./download_models.sh manually."
        exit 1
    fi
fi

# Default settings
PORT=8080
MODEL_PATH="$MODELS_DIR/gguf/mistral-7b-v0.1.Q4_K_M.gguf"
CONTEXT_SIZE=4096

# Check if llama-cpp-python is installed
python3 -c "import llama_cpp" &>/dev/null
if [ $? -ne 0 ]; then
    echo "llama-cpp-python package not found. Installing now..."
    pip install llama-cpp-python
    if [ $? -ne 0 ]; then
        echo "Error installing llama-cpp-python. Please install manually with:"
        echo "pip install llama-cpp-python"
        exit 1
    fi
fi

echo "Starting LLM server on port $PORT..."
echo "Using model: $MODEL_PATH"
echo "Context size: $CONTEXT_SIZE tokens"

# Start the server
python3 -m llama_cpp.server \
    --model $MODEL_PATH \
    --host 0.0.0.0 \
    --port $PORT \
    --n_ctx $CONTEXT_SIZE \
    --n_threads $(nproc) \
    --embedding

echo "LLM server stopped."
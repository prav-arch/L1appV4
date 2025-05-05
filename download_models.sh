#!/bin/bash
# Script to download required LLM models for the telecom log analysis application

echo "====================================================="
echo "Downloading required models for telecom log analysis"
echo "====================================================="

# Define default and custom paths
DEFAULT_MODELS_DIR="models"
MODELS_DIR="${MODELS_PATH:-$DEFAULT_MODELS_DIR}"

echo "Using models directory: $MODELS_DIR"

# Create models directory
mkdir -p "$MODELS_DIR/gguf"
cd "$MODELS_DIR/gguf"

# Download Mistral 7B Q4 model (smaller, for CPU usage)
echo "Downloading Mistral 7B v0.1 model (Q4 quantized for faster CPU inference)..."
MISTRAL_Q4_URL="https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q4_K_M.gguf"
MISTRAL_Q4_FILE="mistral-7b-v0.1.Q4_K_M.gguf"

if [ -f "$MISTRAL_Q4_FILE" ]; then
    echo "Mistral Q4 model already exists, skipping download."
else
    echo "Downloading Mistral Q4 model (approx. 4GB)..."
    if command -v wget &> /dev/null; then
        wget -c "$MISTRAL_Q4_URL" -O "$MISTRAL_Q4_FILE" || curl -L "$MISTRAL_Q4_URL" -o "$MISTRAL_Q4_FILE"
    else
        curl -L "$MISTRAL_Q4_URL" -o "$MISTRAL_Q4_FILE"
    fi
    
    if [ $? -ne 0 ]; then
        echo "Error downloading Mistral Q4 model."
        echo ""
        echo "Try downloading manually with:"
        echo "wget -c $MISTRAL_Q4_URL -O $MODELS_DIR/gguf/$MISTRAL_Q4_FILE"
        echo "or"
        echo "curl -L $MISTRAL_Q4_URL -o $MODELS_DIR/gguf/$MISTRAL_Q4_FILE"
        exit 1
    fi
    echo "Mistral Q4 model downloaded successfully."
fi

# Return to root directory
cd ../../

echo "====================================================="
echo "All models have been downloaded successfully!"
echo "====================================================="
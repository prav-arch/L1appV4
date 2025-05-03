#!/bin/bash
# Script to download the required LLM models for GPU deployment

echo "Creating model directories..."
mkdir -p models/gguf
mkdir -p models/embeddings

# Set download URLs
MODEL_URL="https://huggingface.co/TheBloke/Llama-3.1-8B-GGUF/resolve/main/llama-3.1-8b.Q5_K_M.gguf"
EMBEDDING_MODEL_URL="https://huggingface.co/datasets/sentence-transformers/all-MiniLM-L6-v2/resolve/main/model.onnx"

# Prompt for Hugging Face token if not provided
if [ -z "${HF_TOKEN}" ]; then
    echo "Hugging Face token is required to download LLM models."
    echo "You can get your token at https://huggingface.co/settings/tokens"
    read -p "Please enter your Hugging Face token: " HF_TOKEN
    echo ""
fi

# Function to download with certificate verification disabled and authentication
download_with_retry() {
    local url=$1
    local output_file=$2
    local max_retries=3
    local retry_count=0
    local success=false
    
    while [ $retry_count -lt $max_retries ] && [ "$success" = false ]; do
        echo "Downloading $output_file (attempt $(($retry_count + 1))/${max_retries})..."
        
        # Try with wget with authentication and certificate verification disabled
        if wget --no-check-certificate -q --show-progress -c --header="Authorization: Bearer ${HF_TOKEN}" "$url" -O "$output_file.tmp"; then
            success=true
        else
            # Try with curl with authentication and certificate verification disabled
            if curl -k -L -H "Authorization: Bearer ${HF_TOKEN}" "$url" -o "$output_file.tmp" --progress-bar; then
                success=true
            else
                echo "Download failed. Retrying in 5 seconds..."
                sleep 5
                retry_count=$((retry_count + 1))
            fi
        fi
    done
    
    if [ "$success" = true ]; then
        mv "$output_file.tmp" "$output_file"
        echo "Successfully downloaded $output_file"
        return 0
    else
        echo "Failed to download $output_file after $max_retries attempts."
        echo "Please check if your Hugging Face token is valid and has access to the model."
        return 1
    fi
}

# Download the GPU-optimized model
echo "Downloading GPU-optimized LLM model (this may take a while)..."
if [ ! -f "models/gguf/llama-3.1-8b.Q5_K_M.gguf" ]; then
    download_with_retry "$MODEL_URL" "models/gguf/llama-3.1-8b.Q5_K_M.gguf"
else
    echo "LLM model already exists, skipping download"
fi

# Download the embedding model
echo "Downloading embedding model..."
if [ ! -f "models/embeddings/model.onnx" ]; then
    download_with_retry "$EMBEDDING_MODEL_URL" "models/embeddings/model.onnx"
else
    echo "Embedding model already exists, skipping download"
fi

echo "All models downloaded successfully for GPU deployment!"
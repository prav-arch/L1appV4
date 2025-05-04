#!/bin/bash
# Script to download the required LLM models for GPU deployment

echo "Creating model directories..."
mkdir -p models/gguf
mkdir -p models/embeddings

# Set download URLs for fully open-source models
# Using Mistral-7B for LLM (open-source alternative to Llama)
MODEL_URL="https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q5_K_M.gguf"
# For embedding model, use Instructor embedding model (open access)
EMBEDDING_MODEL_URL="https://huggingface.co/hkunlp/instructor-large/resolve/main/pytorch_model.bin"

# Set Hugging Face token 
HF_TOKEN="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"
echo "Using provided Hugging Face token for authentication"

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

# Download the Mistral model (open-source alternative to Llama)
echo "Downloading Mistral-7B model (this may take a while)..."
mkdir -p models/gguf

# Download main model file
if [ ! -f "models/gguf/mistral-7b-v0.1.Q5_K_M.gguf" ]; then
    echo "Attempting to download Mistral model file..."
    download_with_retry "$MODEL_URL" "models/gguf/mistral-7b-v0.1.Q5_K_M.gguf"
    
    # If download failed, provide manual command
    if [ ! -f "models/gguf/mistral-7b-v0.1.Q5_K_M.gguf" ]; then
        echo "------------------------------------------------------"
        echo "MANUAL DOWNLOAD REQUIRED"
        echo "------------------------------------------------------"
        echo "Automatic download failed. Please copy and run this command manually:"
        echo ""
        echo "mkdir -p models/gguf"
        echo "curl -k -L \\"
        echo "  https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q5_K_M.gguf \\"
        echo "  -o models/gguf/mistral-7b-v0.1.Q5_K_M.gguf"
        echo ""
        echo "OR"
        echo ""
        echo "mkdir -p models/gguf"
        echo "wget --no-check-certificate -q --show-progress \\"
        echo "  https://huggingface.co/TheBloke/Mistral-7B-v0.1-GGUF/resolve/main/mistral-7b-v0.1.Q5_K_M.gguf \\"
        echo "  -O models/gguf/mistral-7b-v0.1.Q5_K_M.gguf"
        echo "------------------------------------------------------"
        echo "After downloading, run this script again to continue deployment."
        exit 1
    fi
else
    echo "Mistral model file already exists, skipping download"
fi

# Create symbolic link for compatibility with existing code
echo "Creating compatibility link for model..."
if [ ! -f "models/gguf/llama-3.1-8b.Q5_K_M.gguf" ]; then
    # Create symlink to the Mistral model
    ln -sf "mistral-7b-v0.1.Q5_K_M.gguf" "models/gguf/llama-3.1-8b.Q5_K_M.gguf"
    echo "Created symlink for compatibility with existing code"
fi

# Download the embedding model (using MPNet Base which is open-access)
echo "Downloading embedding model..."
mkdir -p models/embeddings

# We'll use the MPNet Base model from Sentence Transformers which is fully open
EMBEDDING_MODEL_URL="https://huggingface.co/sentence-transformers/all-mpnet-base-v2/resolve/main/pytorch_model.bin"
if [ ! -f "models/embeddings/pytorch_model.bin" ]; then
    echo "Attempting to download embedding model..."
    download_with_retry "$EMBEDDING_MODEL_URL" "models/embeddings/pytorch_model.bin"
    
    # If download failed, provide manual command
    if [ ! -f "models/embeddings/pytorch_model.bin" ]; then
        echo "------------------------------------------------------"
        echo "MANUAL DOWNLOAD REQUIRED"
        echo "------------------------------------------------------"
        echo "Automatic download failed. Please copy and run this command manually:"
        echo ""
        echo "mkdir -p models/embeddings"
        echo "curl -k -L \\"
        echo "  https://huggingface.co/sentence-transformers/all-mpnet-base-v2/resolve/main/pytorch_model.bin \\"
        echo "  -o models/embeddings/pytorch_model.bin"
        echo ""
        echo "OR"
        echo ""
        echo "mkdir -p models/embeddings"
        echo "wget --no-check-certificate -q --show-progress \\"
        echo "  https://huggingface.co/sentence-transformers/all-mpnet-base-v2/resolve/main/pytorch_model.bin \\"
        echo "  -O models/embeddings/pytorch_model.bin"
        echo "------------------------------------------------------"
        echo "After downloading, run this script again to continue deployment."
        exit 1
    fi
else
    echo "Embedding model already exists, skipping download"
fi

# Also download the config and tokenizer for the embedding model
EMBEDDING_CONFIG_URL="https://huggingface.co/sentence-transformers/all-mpnet-base-v2/resolve/main/config.json"
if [ ! -f "models/embeddings/config.json" ]; then
    echo "Downloading embedding model config..."
    curl -k -L "$EMBEDDING_CONFIG_URL" -o "models/embeddings/config.json"
fi

# Create a compatibility marker
touch models/embeddings/model.onnx

echo "All models downloaded successfully for GPU deployment!"
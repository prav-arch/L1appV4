#!/bin/bash
# Script to download the required LLM models for GPU deployment

echo "Creating model directories..."
mkdir -p models/gguf
mkdir -p models/embeddings

# Set download URLs for Meta's official Llama model
MODEL_URL="https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/model.safetensors"
MODEL_TOKENIZER_URL="https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/tokenizer.json"
MODEL_CONFIG_URL="https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/config.json"
EMBEDDING_MODEL_URL="https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/model.onnx"

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

# Create directories for Meta model
mkdir -p models/meta/llama-3.1-8b
echo "Created directory for Meta Llama model"

# Download the official Meta Llama model
echo "Downloading Meta's Llama-3.1-8B-Instruct model (this may take a while)..."

# Download main model file
if [ ! -f "models/meta/llama-3.1-8b/model.safetensors" ]; then
    echo "Attempting to download main model file..."
    download_with_retry "$MODEL_URL" "models/meta/llama-3.1-8b/model.safetensors"
    
    # If download failed, provide manual command
    if [ ! -f "models/meta/llama-3.1-8b/model.safetensors" ]; then
        echo "------------------------------------------------------"
        echo "MANUAL DOWNLOAD REQUIRED"
        echo "------------------------------------------------------"
        echo "Automatic download failed. Please copy and run this command manually:"
        echo ""
        echo "mkdir -p models/meta/llama-3.1-8b"
        echo "curl -k -L -H \"Authorization: Bearer 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\" \\"
        echo "  https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/model.safetensors \\"
        echo "  -o models/meta/llama-3.1-8b/model.safetensors"
        echo ""
        echo "OR"
        echo ""
        echo "mkdir -p models/meta/llama-3.1-8b"
        echo "wget --no-check-certificate -q --show-progress \\"
        echo "  --header=\"Authorization: Bearer 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\" \\"
        echo "  https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/model.safetensors \\"
        echo "  -O models/meta/llama-3.1-8b/model.safetensors"
        echo "------------------------------------------------------"
        echo "After downloading, run this script again to continue deployment."
        exit 1
    fi
else
    echo "Main model file already exists, skipping download"
fi

# Download tokenizer
if [ ! -f "models/meta/llama-3.1-8b/tokenizer.json" ]; then
    echo "Downloading tokenizer file..."
    download_with_retry "$MODEL_TOKENIZER_URL" "models/meta/llama-3.1-8b/tokenizer.json"
    
    # If download failed, provide manual command
    if [ ! -f "models/meta/llama-3.1-8b/tokenizer.json" ]; then
        echo "------------------------------------------------------"
        echo "MANUAL DOWNLOAD REQUIRED"
        echo "------------------------------------------------------"
        echo "Automatic download failed. Please copy and run this command manually:"
        echo ""
        echo "mkdir -p models/meta/llama-3.1-8b"
        echo "curl -k -L -H \"Authorization: Bearer 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\" \\"
        echo "  https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/tokenizer.json \\"
        echo "  -o models/meta/llama-3.1-8b/tokenizer.json"
        echo "------------------------------------------------------"
        echo "After downloading, run this script again to continue deployment."
        exit 1
    fi
else
    echo "Tokenizer file already exists, skipping download"
fi

# Download config
if [ ! -f "models/meta/llama-3.1-8b/config.json" ]; then
    echo "Downloading config file..."
    download_with_retry "$MODEL_CONFIG_URL" "models/meta/llama-3.1-8b/config.json"
    
    # If download failed, provide manual command
    if [ ! -f "models/meta/llama-3.1-8b/config.json" ]; then
        echo "------------------------------------------------------"
        echo "MANUAL DOWNLOAD REQUIRED"
        echo "------------------------------------------------------"
        echo "Automatic download failed. Please copy and run this command manually:"
        echo ""
        echo "mkdir -p models/meta/llama-3.1-8b"
        echo "curl -k -L -H \"Authorization: Bearer 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\" \\"
        echo "  https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/resolve/main/config.json \\"
        echo "  -o models/meta/llama-3.1-8b/config.json"
        echo "------------------------------------------------------"
        echo "After downloading, run this script again to continue deployment."
        exit 1
    fi
else
    echo "Config file already exists, skipping download"
fi

# Create symbolic link for compatibility with existing code
echo "Creating compatibility link for model..."
if [ ! -f "models/gguf/llama-3.1-8b.Q5_K_M.gguf" ]; then
    # Create directory for link if it doesn't exist
    mkdir -p models/gguf
    # Create metadata file to indicate we're using Meta model
    echo "meta_model=true" > models/gguf/model_type.info
    # Create empty file as a marker
    touch models/gguf/llama-3.1-8b.Q5_K_M.gguf
    echo "Created compatibility marker for Meta model"
else
    echo "Compatibility marker already exists, skipping creation"
fi

# Download the embedding model
echo "Downloading embedding model..."
if [ ! -f "models/embeddings/model.onnx" ]; then
    echo "Attempting automatic download..."
    download_with_retry "$EMBEDDING_MODEL_URL" "models/embeddings/model.onnx"
    
    # If download failed, provide manual command
    if [ ! -f "models/embeddings/model.onnx" ]; then
        echo "------------------------------------------------------"
        echo "MANUAL DOWNLOAD REQUIRED"
        echo "------------------------------------------------------"
        echo "Automatic download failed. Please copy and run this command manually:"
        echo ""
        echo "mkdir -p models/embeddings"
        echo "curl -k -L -H \"Authorization: Bearer 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\" \\"
        echo "  https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/model.onnx \\"
        echo "  -o models/embeddings/model.onnx"
        echo ""
        echo "OR"
        echo ""
        echo "mkdir -p models/embeddings"
        echo "wget --no-check-certificate -q --show-progress \\"
        echo "  --header=\"Authorization: Bearer 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\" \\"
        echo "  https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/model.onnx \\"
        echo "  -O models/embeddings/model.onnx"
        echo "------------------------------------------------------"
        echo "After downloading, run this script again to continue deployment."
        exit 1
    fi
else
    echo "Embedding model already exists, skipping download"
fi

echo "All models downloaded successfully for GPU deployment!"
#!/bin/bash
# Script to download the necessary LLM models for the telecom log analysis application
# Optimized for Tesla P40 GPU environment

# Create directories
mkdir -p models/gguf
mkdir -p models/embeddings

echo "==== Downloading LLM models for telecom log analysis application ===="
echo "This will download models optimized for Tesla P40 GPU (24GB VRAM)"

# Download Llama-3.1-8B GGUF model for inference
# This size model will run effectively on a Tesla P40 GPU
echo "Downloading Llama-3.1-8B GGUF model..."
wget https://huggingface.co/TheBloke/Llama-3.1-8B-GGUF/resolve/main/llama-3.1-8b.Q5_K_M.gguf -O models/gguf/llama-3.1-8b.Q5_K_M.gguf

# Download embedding model - using a smaller but effective model
echo "Downloading embedding model..."
wget https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/pytorch_model.bin -O models/embeddings/pytorch_model.bin
wget https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/config.json -O models/embeddings/config.json
wget https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/special_tokens_map.json -O models/embeddings/special_tokens_map.json
wget https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer_config.json -O models/embeddings/tokenizer_config.json
wget https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/tokenizer.json -O models/embeddings/tokenizer.json
wget https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2/resolve/main/vocab.txt -O models/embeddings/vocab.txt

echo "Model download complete!"
echo "You now have the following models available:"
echo "- Llama-3.1-8B (Q5_K_M quantization) for inference"
echo "- all-MiniLM-L6-v2 for embeddings generation"
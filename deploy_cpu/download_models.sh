#!/bin/bash
# Script to download the necessary LLM models for CPU-only deployment
# Optimized for CPU environments (no GPU required)

# Create directories
mkdir -p models/gguf
mkdir -p models/embeddings

echo "==== Downloading LLM models for telecom log analysis application ===="
echo "CPU-Only Configuration"

# Download a smaller Llama-3.1 GGUF model optimized for CPUs
# We're using a 7B model with more aggressive quantization to improve CPU performance
echo "Downloading Llama-3.1-7B GGUF model (CPU-optimized)..."
wget https://huggingface.co/TheBloke/Llama-3.1-7B-GGUF/resolve/main/llama-3.1-7b.Q4_K_M.gguf -O models/gguf/llama-3.1-7b.Q4_K_M.gguf

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
echo "- Llama-3.1-7B (Q4_K_M quantization) for CPU inference"
echo "- all-MiniLM-L6-v2 for embeddings generation"
echo ""
echo "Note: These models are optimized for CPU usage but will be slower than GPU versions."
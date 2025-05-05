#!/bin/bash
# Script to clean and reset the external data directory structure

echo "====================================================="
echo "Resetting external data directory for telecom log analysis"
echo "====================================================="

# External data directory path
DATA_DIR="../data"

# Ask for confirmation
echo "WARNING: This will delete all data in $DATA_DIR"
echo "This includes:"
echo "  - All downloaded models"
echo "  - Milvus configuration"
echo "  - All vector database data"
echo "  - Fine-tuning data"
echo ""
read -p "Are you sure you want to continue? (y/N): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Operation cancelled."
    exit 0
fi

# Remove data directory
echo "Removing data directory: $DATA_DIR"
rm -rf "$DATA_DIR"

# Create the directory structure again
echo "Creating new data directory structure"
mkdir -p "$DATA_DIR/models/gguf"
mkdir -p "$DATA_DIR/milvus-config"
mkdir -p "$DATA_DIR/volumes/etcd"
mkdir -p "$DATA_DIR/volumes/minio"
mkdir -p "$DATA_DIR/volumes/milvus"
mkdir -p "$DATA_DIR/fine_tuning"

echo "====================================================="
echo "External data directory reset successfully!"
echo "====================================================="
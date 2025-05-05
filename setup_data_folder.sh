#!/bin/bash
# Script to set up the data folder structure outside the project directory

echo "====================================================="
echo "Setting up data folder structure for telecom log analysis"
echo "====================================================="

# Create data directory one level up from the project
DATA_DIR="../data"
mkdir -p "$DATA_DIR"

# Create subdirectories for different data types
mkdir -p "$DATA_DIR/models/gguf"
mkdir -p "$DATA_DIR/milvus-config"
mkdir -p "$DATA_DIR/volumes/etcd"
mkdir -p "$DATA_DIR/volumes/minio"
mkdir -p "$DATA_DIR/volumes/milvus"

echo "Data directory created at: $DATA_DIR"
echo "  - Models will be stored in: $DATA_DIR/models"
echo "  - Milvus config will be stored in: $DATA_DIR/milvus-config"
echo "  - Volumes will be stored in: $DATA_DIR/volumes"

# Create a .env file for environment variables
cat > .env << EOL
# Data directory paths
MODELS_PATH="../data/models"
MILVUS_CONFIG_PATH="../data/milvus-config"
VOLUMES_PATH="../data/volumes"
EOL

echo "Created .env file with data directory paths"
echo "====================================================="
echo "Data folder setup completed successfully!"
echo "====================================================="

# Make the script executable
chmod +x setup_milvus.sh
chmod +x download_models.sh
chmod +x start_llm_server.sh

echo "All scripts are now executable."
echo "To run the setup: "
echo "  1. First run: source .env"
echo "  2. Then run: ./download_models.sh"
echo "  3. Then run: ./setup_milvus.sh"
echo "  4. Finally run: ./start_llm_server.sh"
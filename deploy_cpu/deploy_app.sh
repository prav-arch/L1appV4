#!/bin/bash
# Script to deploy the telecom log analysis application (CPU version)

echo "Deploying telecom log analysis application (CPU mode)..."

# Create required directories
mkdir -p logs
mkdir -p data

# Install system dependencies
echo "Installing required system packages..."
sudo apt-get update
sudo apt-get install -y build-essential cmake git curl pkg-config \
    libopenblas-dev liblapack-dev python3-pip

# Create .env file with CPU configuration
echo "Creating environment configuration..."
cat > .env << EOL
# Environment Configuration
NODE_ENV=production
PORT=5000

# API Keys
PERPLEXITY_API_KEY=

# LLM Configuration
LLM_SERVER_URL=http://localhost:8080
CPU_ONLY=true

# Database Configuration
MILVUS_HOST=localhost
MILVUS_PORT=19530
EOL

# Install app dependencies
echo "Installing application dependencies..."
npm install

# Build the application
echo "Building the application..."
npm run build

echo "Application deployment (CPU-only mode) completed!"
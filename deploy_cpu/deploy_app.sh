#!/bin/bash
# Script to deploy the telecom log analysis application
# CPU-only configuration (no GPU required)

echo "==== Deploying Telecom Log Analysis Application ===="
echo "CPU-Only Configuration"

# Check for Node.js and npm
if ! command -v node &> /dev/null || ! command -v npm &> /dev/null; then
    echo "Node.js and npm are required. Installing..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Check for Python
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is required. Installing..."
    sudo apt-get update
    sudo apt-get install -y python3 python3-pip python3-venv
fi

# Create Python virtual environment
echo "Setting up Python environment..."
python3 -m venv venv
source venv/bin/activate

# Install Python requirements
echo "Installing Python dependencies..."
pip install flask flask-cors pymilvus pyshark python-dotenv requests scapy

# Install Node.js dependencies
echo "Installing Node.js dependencies..."
npm install

# Create .env file with CPU-optimized settings
echo "Setting up environment variables..."
cat > .env << 'EOL'
# Environment Configuration
NODE_ENV=production

# Server Configuration
PORT=5000
HOST=0.0.0.0

# LLM Server URL (must match the URL where llama.cpp server is running)
LLM_SERVER_URL=http://localhost:8080

# Milvus Configuration
MILVUS_HOST=localhost
MILVUS_PORT=19530
MILVUS_COLLECTION=telecom_logs

# CPU-specific optimizations
CPU_ONLY=true
BATCH_SIZE=4   # Smaller batch size for CPU processing
MAX_TOKENS=1024  # Reduced token limit for faster processing

# Add your Perplexity API key if using that service
# PERPLEXITY_API_KEY=your_api_key_here
EOL

# Build the frontend
echo "Building the frontend..."
npm run build

# Create a systemd service file for the LLM server
echo "Creating systemd service for the LLM server..."
sudo tee /etc/systemd/system/llm-server.service > /dev/null << 'EOL'
[Unit]
Description=Local LLM Server (CPU-Only)
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/app
ExecStart=/bin/bash deploy_cpu/start_llm_server.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

# Create a systemd service file for the application
echo "Creating systemd service for the application..."
sudo tee /etc/systemd/system/telecom-log-analysis.service > /dev/null << 'EOL'
[Unit]
Description=Telecom Log Analysis Application
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/path/to/app
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=CPU_ONLY=true

[Install]
WantedBy=multi-user.target
EOL

# Update the path in the service files
sudo sed -i "s|/path/to/app|$(pwd)|g" /etc/systemd/system/llm-server.service
sudo sed -i "s|/path/to/app|$(pwd)|g" /etc/systemd/system/telecom-log-analysis.service

# Create CPU-optimized configuration for the application
echo "Creating CPU-optimized application configuration..."
cat > cpu_config.json << 'EOL'
{
  "cpu_optimization": {
    "enabled": true,
    "batch_size": 4,
    "max_tokens": 1024,
    "embedding_pooling": "mean",
    "vector_dimension": 384,
    "max_concurrent_requests": 4
  },
  "memory_optimization": {
    "enabled": true,
    "max_cache_size": 100,
    "garbage_collection_interval": 300,
    "log_chunking": true,
    "max_chunk_size": 1024
  }
}
EOL

echo "Deployment setup complete!"
echo ""
echo "To start the services:"
echo "1. First start the Milvus service: cd milvus-config && docker-compose up -d"
echo "2. Start the LLM server: sudo systemctl start llm-server"
echo "3. Start the main application: sudo systemctl start telecom-log-analysis"
echo ""
echo "To enable services to start on boot:"
echo "sudo systemctl enable llm-server"
echo "sudo systemctl enable telecom-log-analysis"
echo ""
echo "To view logs:"
echo "LLM server: sudo journalctl -u llm-server -f"
echo "Main application: sudo journalctl -u telecom-log-analysis -f"
echo ""
echo "Note: This is a CPU-only deployment. Expect slower performance"
echo "especially for large log files and complex analysis tasks."
#!/bin/bash
# Flexible deployment script for the telecom log analysis application
# Starts in CPU mode but can easily transition to GPU mode when drivers are installed

echo "========================================================"
echo "Telecom Log Analysis Application - Flexible Deployment"
echo "========================================================"
echo ""

# Make all scripts executable
chmod +x deploy_cpu/*.sh
chmod +x deploy/*.sh

# Check if GPU drivers are installed
if command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA GPU drivers detected! Using GPU-accelerated deployment."
    echo "---------- GPU DRIVER INFORMATION ----------"
    nvidia-smi
    echo "-------------------------------------------"
    USE_GPU=1
else
    echo "No NVIDIA GPU drivers detected. Starting in CPU-only mode."
    echo "You can transition to GPU mode after installing drivers by running:"
    echo "  ./transition_to_gpu.sh"
    USE_GPU=0
fi

# Set deployment path based on GPU availability
if [ "$USE_GPU" -eq 1 ]; then
    DEPLOY_PATH="deploy"
else
    DEPLOY_PATH="deploy_cpu"
fi

# Step 1: Download models
echo "Step 1: Downloading LLM models..."
echo "----------------------------"
# Using hardcoded Hugging Face token
./${DEPLOY_PATH}/download_models.sh
echo ""

# Step 2: Setup Milvus
echo "Step 2: Setting up Milvus vector database..."
echo "----------------------------"
./${DEPLOY_PATH}/setup_milvus.sh
echo ""

# Step 3: Start Milvus
echo "Step 3: Starting Milvus vector database..."
echo "----------------------------"
# Check if docker-compose is installed or use docker compose as alternative
if command -v docker-compose &> /dev/null; then
    cd milvus-config && docker-compose up -d && cd ..
elif command -v docker &> /dev/null; then
    cd milvus-config && docker compose up -d && cd ..
else
    echo "ERROR: Neither docker-compose nor docker compose is available."
    echo "Please install Docker and Docker Compose before continuing."
    exit 1
fi
echo ""

# Step 4: Deploy the application
echo "Step 4: Deploying the application..."
echo "----------------------------"
./${DEPLOY_PATH}/deploy_app.sh
echo ""

# Create transition script if in CPU mode
if [ "$USE_GPU" -eq 0 ]; then
    cat > transition_to_gpu.sh << 'EOL'
#!/bin/bash
# Script to transition from CPU-only mode to GPU-accelerated mode
# Run this after installing NVIDIA GPU drivers

echo "========================================================"
echo "Transitioning to GPU-accelerated mode"
echo "========================================================"
echo ""

# Check if GPU drivers are installed
if ! command -v nvidia-smi &> /dev/null; then
    echo "ERROR: NVIDIA GPU drivers not detected!"
    echo "Please install the drivers first, then run this script again."
    exit 1
fi

echo "NVIDIA GPU drivers detected! Proceeding with transition..."

# Stop services
echo "Stopping current services..."
sudo systemctl stop telecom-log-analysis
sudo systemctl stop llm-server
cd milvus-config && docker-compose down && cd ..

# Ask for Hugging Face token
echo "The LLM models require authentication with Hugging Face."
echo "A Hugging Face token is already provided in the script for convenience."
echo "If you encounter download issues, you can manually download the models using the commands"
echo "that will be displayed if the automatic download fails."

# Download GPU-optimized model if needed
echo "Setting up GPU-optimized models..."
./deploy/download_models.sh

# Setup GPU-enabled Milvus
echo "Setting up GPU-enabled Milvus..."
./deploy/setup_milvus.sh

# Start Milvus with GPU support
echo "Starting Milvus with GPU support..."
if command -v docker-compose &> /dev/null; then
    cd milvus-config && docker-compose up -d && cd ..
elif command -v docker &> /dev/null; then
    cd milvus-config && docker compose up -d && cd ..
else
    echo "ERROR: Neither docker-compose nor docker compose is available."
    echo "Please install Docker and Docker Compose before continuing."
    exit 1
fi

# Optimize GPU
echo "Optimizing GPU performance..."
./deploy/optimize_gpu.sh

# Update service files
echo "Updating service configurations for GPU mode..."
sudo cp -f deploy/llm-server.service /etc/systemd/system/llm-server.service
sudo cp -f deploy/telecom-log-analysis.service /etc/systemd/system/telecom-log-analysis.service
sudo systemctl daemon-reload

# Start services in GPU mode
echo "Starting services in GPU-accelerated mode..."
sudo systemctl start llm-server
sudo systemctl start telecom-log-analysis

echo "========================================================"
echo "Transition to GPU-accelerated mode complete!"
echo "The application is now running with full GPU acceleration."
echo "========================================================"
EOL

    chmod +x transition_to_gpu.sh
    
    # Create the service files for CPU mode
    sudo tee /etc/systemd/system/llm-server.service > /dev/null << EOL
[Unit]
Description=Local LLM Server (CPU Mode)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/bin/bash $(pwd)/deploy_cpu/start_llm_server.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

    sudo tee /etc/systemd/system/telecom-log-analysis.service > /dev/null << EOL
[Unit]
Description=Telecom Log Analysis Application (CPU Mode)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000
Environment=CPU_ONLY=true

[Install]
WantedBy=multi-user.target
EOL

else
    # Create the service files for GPU mode
    sudo tee /etc/systemd/system/llm-server.service > /dev/null << EOL
[Unit]
Description=Local LLM Server (GPU Mode)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/bin/bash $(pwd)/deploy/start_llm_server.sh
Restart=on-failure

[Install]
WantedBy=multi-user.target
EOL

    sudo tee /etc/systemd/system/telecom-log-analysis.service > /dev/null << EOL
[Unit]
Description=Telecom Log Analysis Application (GPU Mode)
After=network.target

[Service]
Type=simple
User=$(whoami)
WorkingDirectory=$(pwd)
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production
Environment=PORT=5000

[Install]
WantedBy=multi-user.target
EOL
fi

# Start the LLM server
echo "Step 5: Starting the LLM server..."
echo "----------------------------"
sudo systemctl daemon-reload
sudo systemctl enable llm-server
sudo systemctl start llm-server
echo ""

# Start the application
echo "Step 6: Starting the application..."
echo "----------------------------"
sudo systemctl enable telecom-log-analysis
sudo systemctl start telecom-log-analysis
echo ""

echo "========================================================"
echo "Deployment complete!"
echo "The telecom log analysis application should now be running at:"
echo "http://localhost:5000"
echo ""
echo "Make sure to update the .env file with your specific configuration:"
echo "- Add your PERPLEXITY_API_KEY if you want to use that service"
echo "- Update any other configuration variables as needed"
echo ""
echo "To check status:"
echo "sudo systemctl status llm-server"
echo "sudo systemctl status telecom-log-analysis"
echo ""
echo "To view logs:"
echo "sudo journalctl -u llm-server -f"
echo "sudo journalctl -u telecom-log-analysis -f"
echo ""
if [ "$USE_GPU" -eq 0 ]; then
    echo "IMPORTANT: You are running in CPU-only mode."
    echo "Once you have installed the GPU drivers, run:"
    echo "  ./transition_to_gpu.sh"
    echo "to switch to GPU-accelerated mode for better performance."
fi
echo "========================================================"
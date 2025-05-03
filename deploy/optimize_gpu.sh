#!/bin/bash
# Script to optimize the Tesla P40 GPU for deep learning workloads

echo "==== Optimizing Tesla P40 GPU for deep learning workloads ===="

# Check if nvidia-smi is available
if ! command -v nvidia-smi &> /dev/null; then
    echo "NVIDIA drivers not found."
    echo "Driver installation is optional if they're already installed elsewhere."
    
    read -p "Do you want to install NVIDIA drivers now? (y/n): " install_drivers
    
    if [[ "$install_drivers" == "y" || "$install_drivers" == "Y" ]]; then
        echo "Installing NVIDIA drivers..."
        
        # Update package list
        sudo apt-get update
        
        # Install necessary packages
        sudo apt-get install -y build-essential dkms
        
        # Add NVIDIA repository
        sudo apt-key adv --fetch-keys http://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64/7fa2af80.pub
        echo "deb http://developer.download.nvidia.com/compute/cuda/repos/ubuntu2004/x86_64 /" | sudo tee /etc/apt/sources.list.d/cuda.list
        
        # Update package list again
        sudo apt-get update
        
        # Install NVIDIA drivers and CUDA
        sudo apt-get install -y cuda-drivers-525 cuda-toolkit-11-8
        
        echo "NVIDIA drivers installed. Please reboot the system."
        exit 0
    else
        echo "Skipping NVIDIA driver installation."
        echo "WARNING: GPU acceleration will not be available without proper drivers."
        echo "You can continue with deployment, but LLM and vector operations will run on CPU only."
        read -p "Continue without GPU acceleration? (y/n): " continue_deploy
        if [[ "$continue_deploy" != "y" && "$continue_deploy" != "Y" ]]; then
            echo "Deployment aborted. Please install NVIDIA drivers and try again."
            exit 1
        fi
    fi
else
    echo "NVIDIA drivers already installed. Proceeding with GPU optimization..."
fi

# Enable persistence mode
echo "Enabling persistence mode for GPU..."
sudo nvidia-smi -pm 1

# Set GPU clocks to maximum performance
echo "Setting GPU clocks to maximum performance..."
sudo nvidia-smi --lock-gpu-clocks=1328,1328

# Disable ECC (Error Correction Code) if it's enabled
# This can increase performance but slightly reduce reliability
ECC_STATUS=$(nvidia-smi --query-gpu=ecc.mode.current --format=csv,noheader)
if [ "$ECC_STATUS" = "enabled" ]; then
    echo "Disabling ECC for maximum performance..."
    sudo nvidia-smi --ecc-config=0
    echo "ECC disabled. You need to reboot for this change to take effect."
else
    echo "ECC is already disabled."
fi

# Set GPU compute mode to exclusive process
echo "Setting GPU compute mode to exclusive process..."
sudo nvidia-smi --compute-mode=3

# Optimize power management
echo "Setting power management to maximum performance..."
sudo nvidia-smi --power-limit=250

# Install NVIDIA Docker for containerized GPU applications
echo "Installing NVIDIA Docker for GPU container support..."
distribution=$(. /etc/os-release;echo $ID$VERSION_ID)
curl -s -L https://nvidia.github.io/nvidia-docker/gpgkey | sudo apt-key add -
curl -s -L https://nvidia.github.io/nvidia-docker/$distribution/nvidia-docker.list | sudo tee /etc/apt/sources.list.d/nvidia-docker.list
sudo apt-get update
sudo apt-get install -y nvidia-docker2
sudo systemctl restart docker

echo "GPU optimizations complete."
echo "To verify the settings, run: nvidia-smi"
echo "Note: Some settings may require a system reboot to take effect."
echo "For optimal performance with Milvus and LLM workloads, consider the following:"
echo "- If running multiple GPU workloads, use nvidia-smi to monitor memory usage"
echo "- Adjust n-gpu-layers parameter in start_llm_server.sh if needed"
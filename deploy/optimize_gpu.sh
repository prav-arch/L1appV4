#!/bin/bash
# Script to optimize settings for Tesla P40 GPU

echo "Optimizing Tesla P40 GPU performance..."

# Check if we have nvidia-smi
if ! command -v nvidia-smi &> /dev/null; then
    echo "WARNING: nvidia-smi not found, skipping GPU optimization"
    exit 0
fi

# Set Tesla P40 to maximum performance mode (persistence mode and maximum clocks)
echo "Setting Tesla P40 to maximum performance mode..."
sudo nvidia-smi -pm 1 || echo "Failed to set persistence mode, continuing anyway"
sudo nvidia-smi -ac 3615,1430 || echo "Failed to set application clocks, continuing anyway"

# Disable ECC if it's enabled (improves performance on Tesla GPUs)
ECC_STATUS=$(nvidia-smi --query-gpu=ecc.mode.current --format=csv,noheader)
if [[ "$ECC_STATUS" == *"enabled"* ]]; then
    echo "Disabling ECC for maximum performance (requires reboot to take effect)..."
    sudo nvidia-smi --ecc-config=0 || echo "Failed to disable ECC, continuing anyway"
    echo "WARNING: A system reboot is recommended for ECC changes to take effect"
fi

# Create system-level optimization script to apply on boot
echo "Creating system-level optimization script..."
sudo tee /etc/systemd/system/gpu-optimize.service > /dev/null << EOL
[Unit]
Description=NVIDIA GPU Optimization
After=multi-user.target

[Service]
Type=oneshot
ExecStart=/bin/bash -c "nvidia-smi -pm 1 && nvidia-smi -ac 3615,1430"
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOL

# Enable the service
sudo systemctl enable gpu-optimize.service || echo "Failed to enable gpu-optimize service, continuing anyway"

echo "GPU optimization complete. The optimizations will persist across system reboots."
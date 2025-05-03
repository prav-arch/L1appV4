#!/bin/bash
# Setup script for Milvus vector database (GPU version for Tesla P40)

echo "Setting up Milvus vector database (GPU-accelerated mode)..."

# Create Milvus config directory
mkdir -p milvus-config

# Create docker-compose.yml for Tesla P40 GPU mode
cat > milvus-config/docker-compose.yml << EOL
version: '3.5'

services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.5
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
      - ETCD_SNAPSHOT_COUNT=50000
    volumes:
      - ${PWD}/volumes/etcd:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd

  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2023-03-20T20-16-18Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - ${PWD}/volumes/minio:/minio_data
    command: minio server /minio_data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  standalone:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.3.2
    command: ["milvus", "run", "standalone"]
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
      KNOWHERE_GPU_MEM_POOL_SIZE: 4294967296  # 4GB GPU memory pool for Tesla P40
      KNOWHERE_USE_CUBLAS: "true"             # Enable GPU acceleration
      KNOWHERE_USE_CUDA: "true"               # Enable CUDA
    volumes:
      - ${PWD}/volumes/milvus:/var/lib/milvus
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - "etcd"
      - "minio"
    deploy:
      resources:
        reservations:
          devices:
            - driver: nvidia
              count: 1
              capabilities: [gpu]

networks:
  default:
    name: milvus
EOL

# Create directories for Milvus data
mkdir -p volumes/etcd
mkdir -p volumes/minio
mkdir -p volumes/milvus

echo "Milvus configuration files created successfully (GPU-accelerated mode for Tesla P40)"
#!/bin/bash
# Script to set up Milvus vector database for the telecom log analysis application

echo "====================================================="
echo "Setting up Milvus vector database for telecom log analysis"
echo "====================================================="

# Define default and custom paths
DEFAULT_MILVUS_CONFIG_DIR="milvus-config"
MILVUS_CONFIG_DIR="${MILVUS_CONFIG_PATH:-$DEFAULT_MILVUS_CONFIG_DIR}"
DEFAULT_VOLUMES_DIR="$MILVUS_CONFIG_DIR/volumes"
VOLUMES_DIR="${VOLUMES_PATH:-$DEFAULT_VOLUMES_DIR}"

echo "Using Milvus config directory: $MILVUS_CONFIG_DIR"
echo "Using volumes directory: $VOLUMES_DIR"

# Create milvus-config directory
mkdir -p "$MILVUS_CONFIG_DIR"
cd "$MILVUS_CONFIG_DIR"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Error: Docker is not installed. Please install Docker first."
    echo "Visit https://docs.docker.com/get-docker/ for installation instructions."
    exit 1
fi

# Check if docker-compose or docker compose is available
if command -v docker-compose &> /dev/null; then
    DOCKER_COMPOSE="docker-compose"
elif docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    echo "Error: Neither docker-compose nor docker compose plugin is available."
    echo "Please install Docker Compose first."
    echo "Visit https://docs.docker.com/compose/install/ for installation instructions."
    exit 1
fi

# Create docker-compose.yml file for Milvus
cat > docker-compose.yml << EOL
version: '3.5'

services:
  etcd:
    container_name: milvus-etcd
    image: quay.io/coreos/etcd:v3.5.0
    environment:
      - ETCD_AUTO_COMPACTION_MODE=revision
      - ETCD_AUTO_COMPACTION_RETENTION=1000
      - ETCD_QUOTA_BACKEND_BYTES=4294967296
    volumes:
      - ${VOLUMES_DIR}/etcd:/etcd
    command: etcd -advertise-client-urls=http://127.0.0.1:2379 -listen-client-urls http://0.0.0.0:2379 --data-dir /etcd

  minio:
    container_name: milvus-minio
    image: minio/minio:RELEASE.2020-12-03T00-03-10Z
    environment:
      MINIO_ACCESS_KEY: minioadmin
      MINIO_SECRET_KEY: minioadmin
    volumes:
      - ${VOLUMES_DIR}/minio:/minio_data
    command: minio server /minio_data
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3

  standalone:
    container_name: milvus-standalone
    image: milvusdb/milvus:v2.2.9
    command: ["milvus", "run", "standalone"]
    environment:
      ETCD_ENDPOINTS: etcd:2379
      MINIO_ADDRESS: minio:9000
    volumes:
      - ${VOLUMES_DIR}/milvus:/var/lib/milvus
    ports:
      - "19530:19530"
      - "9091:9091"
    depends_on:
      - "etcd"
      - "minio"

networks:
  default:
    name: milvus
EOL

# Create volumes directory structure
mkdir -p "${VOLUMES_DIR}/etcd" "${VOLUMES_DIR}/minio" "${VOLUMES_DIR}/milvus"

echo "Milvus configuration created successfully."
echo "To start Milvus, run: cd $MILVUS_CONFIG_DIR && $DOCKER_COMPOSE up -d"
echo "To stop Milvus, run: cd $MILVUS_CONFIG_DIR && $DOCKER_COMPOSE down"

# Return to the original directory
cd ..

echo "====================================================="
echo "Milvus setup completed successfully!"
echo "====================================================="
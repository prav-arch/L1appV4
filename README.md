# Telecom Log Analysis Platform

A telecom log analysis platform that provides intelligent, semantic search capabilities using advanced vector database and local language model technologies.

## Key Features

- Local LLM-powered log analysis
- Vector search with Milvus
- Detailed root cause analysis
- LLM fine-tuning on telecom-specific data
- Fallback mode when LLM is not available
- Python backend with ReactJS frontend

## Setup Instructions

The platform can run in a hybrid mode with ReactJS frontend and Python backend. The application supports storing data (models, Milvus configuration, volumes) outside the project directory.

### 1. Set Up Data Directory

By default, the application will create necessary data directories (models, Milvus config, volumes) one level up from the project directory:

```bash
./setup_data_folder.sh
```

This creates a structure like:
```
/parent_directory/
  ├── data/                 # External data directory
  │   ├── models/gguf/      # LLM models
  │   ├── milvus-config/    # Milvus configuration
  │   └── volumes/          # Data volumes
  │       ├── etcd/
  │       ├── minio/
  │       └── milvus/
  └── your_project/         # Project directory
```

### 2. Download Required Models

Download models to the external data directory:

```bash
# Using the default external path (../data/models)
./download_models.sh

# Or specify a custom path
MODELS_PATH="/path/to/models" ./download_models.sh
```

### 3. Set Up Milvus (Vector Database)

```bash
# Using the default external paths
./setup_milvus.sh
cd ../data/milvus-config && docker-compose up -d

# Or specify custom paths
MILVUS_CONFIG_PATH="/path/to/milvus-config" VOLUMES_PATH="/path/to/volumes" ./setup_milvus.sh
cd /path/to/milvus-config && docker-compose up -d
```

### 4. Start the LLM Server

The LLM server uses llama-cpp-python to run the Mistral-7B model locally:

```bash
# Using the default external path
./start_llm_server.sh

# Or specify a custom path
MODELS_PATH="/path/to/models" ./start_llm_server.sh
```

### 4. Start the Main Application

The application can be started in two ways:

**Option 1: Express Server (Current Default)**
```bash
npm run dev
```

**Option 2: Python Backend**
```bash
python run_python_backend.py
```

## Architecture

The system is composed of the following components:

1. **Frontend**: ReactJS-based SPA with Tailwind CSS and shadcn/ui components
2. **Backend**: Express.js or Flask API server
3. **LLM Server**: Local Mistral-7B model served via llama-cpp-python
4. **Vector Database**: Milvus for semantic search capabilities

## Development

For development purposes, the frontend is served by Vite's development server, and the backend is provided by Express.js or Flask, depending on your configuration.

### Adding Dependencies

**Node.js dependencies:**
```bash
npm install <package-name>
```

**Python dependencies:**
```bash
pip install <package-name>
```

## Deployment

The application can be deployed in various environments:

1. **Production with Docker**: Use the included docker-compose files
2. **CPU-Only Mode**: Use the deploy_cpu.sh script
3. **GPU Mode**: Use the deploy.sh script for environments with GPU support

### External Data Storage in Production

For production deployments, it's recommended to store data directories outside the project folder:

```bash
# Create the external data directory structure
./setup_data_folder.sh

# Download models to external data directory
./download_models.sh

# Setup Milvus with external configuration and volumes
./setup_milvus.sh

# Start services with environment variables pointing to external paths
export MODELS_PATH="../data/models"
export MILVUS_CONFIG_PATH="../data/milvus-config"
export VOLUMES_PATH="../data/volumes"

# Start Milvus
cd ../data/milvus-config && docker-compose up -d

# Start the LLM server
./start_llm_server.sh

# Start the application
npm run dev  # or python run_python_backend.py
```

This approach keeps large data files and database volumes separate from the application code, making backups, version control, and deployments cleaner.

## Important Notes

- The LLM server must be running for advanced features to work
- If the LLM server is not available, the system will fall back to basic search functionality
- For optimal performance, a GPU with at least 8GB of VRAM is recommended
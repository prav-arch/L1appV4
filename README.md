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

The platform can run in a hybrid mode with ReactJS frontend and Python backend.

### 1. Download Required Models

```bash
./download_models.sh
```

### 2. Set Up Milvus (Vector Database)

```bash
./setup_milvus.sh
cd milvus-config && docker-compose up -d
```

### 3. Start the LLM Server

The LLM server uses llama-cpp-python to run the Mistral-7B model locally:

```bash
./start_llm_server.sh
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

## Important Notes

- The LLM server must be running for advanced features to work
- If the LLM server is not available, the system will fall back to basic search functionality
- For optimal performance, a GPU with at least 8GB of VRAM is recommended
"""
Configuration utilities for the Telecom Log Analysis application
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables from .env file if it exists
load_dotenv()

# Base project directory
PROJECT_DIR = Path(__file__).parent.parent

# External data directory (one level up from project directory)
DATA_DIR = os.getenv("DATA_DIR", str(PROJECT_DIR.parent / "data"))

# Models directory
MODELS_DIR = os.getenv("MODELS_PATH", str(Path(DATA_DIR) / "models"))
MODEL_FILE = os.getenv("MODEL_FILE", str(Path(MODELS_DIR) / "gguf" / "mistral-7b-v0.1.Q4_K_M.gguf"))

# Milvus configuration
MILVUS_CONFIG_DIR = os.getenv("MILVUS_CONFIG_PATH", str(Path(DATA_DIR) / "milvus-config"))
MILVUS_HOST = os.getenv("MILVUS_HOST", "localhost")
MILVUS_PORT = os.getenv("MILVUS_PORT", "19530")

# Volumes directory
VOLUMES_DIR = os.getenv("VOLUMES_PATH", str(Path(DATA_DIR) / "volumes"))

# Fine-tuning directory
FINE_TUNING_DIR = os.getenv("FINE_TUNING_DIR", str(Path(DATA_DIR) / "fine_tuning"))

# Uploads directory (inside project)
UPLOADS_DIR = os.getenv("UPLOADS_DIR", str(PROJECT_DIR / "uploads"))

# Create necessary directories
def ensure_directories():
    """Ensure all required directories exist"""
    directories = [
        MODELS_DIR, 
        Path(MODELS_DIR) / "gguf",
        MILVUS_CONFIG_DIR,
        VOLUMES_DIR,
        Path(VOLUMES_DIR) / "etcd",
        Path(VOLUMES_DIR) / "minio",
        Path(VOLUMES_DIR) / "milvus",
        FINE_TUNING_DIR,
        UPLOADS_DIR
    ]
    
    for directory in map(Path, directories):
        directory.mkdir(parents=True, exist_ok=True)

# Create directories when module is imported
ensure_directories()
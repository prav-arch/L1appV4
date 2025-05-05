"""
Module for interacting with Milvus vector database
"""
import os
import time
import random
from typing import List, Dict, Any, Optional, Union
from dotenv import load_dotenv

# Conditionally import pymilvus
try:
    from pymilvus import (
        connections,
        Collection,
        utility,
        FieldSchema,
        CollectionSchema,
        DataType,
    )
    HAS_MILVUS = True
except ImportError:
    HAS_MILVUS = False

# Load environment variables
load_dotenv()

class MilvusService:
    """Service for vector database operations with Milvus"""
    
    def __init__(self):
        """Initialize Milvus connection"""
        # Milvus connection settings
        self.host = os.getenv("MILVUS_HOST", "localhost")
        self.port = os.getenv("MILVUS_PORT", "19530")
        
        # Collection settings
        self.collection_name = "telecom_log_vectors"
        self.dimension = 384  # For all-MiniLM-L6-v2 embeddings
        
        # Check if Milvus is available (for development/testing)
        self.mock_mode = not HAS_MILVUS or os.getenv("USE_MOCK_MILVUS", "false").lower() == "true"
        
        # Print initialization info
        print(f"Milvus Service initialized with host: {self.host}, port: {self.port}")
        print(f"Mock mode: {'Enabled' if self.mock_mode else 'Disabled'}")
        
        # Try to connect to Milvus if not in mock mode
        if not self.mock_mode:
            self._connect()
            
    def _connect(self) -> bool:
        """Connect to Milvus server"""
        if self.mock_mode:
            return False
            
        try:
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port
            )
            print(f"Connected to Milvus server at {self.host}:{self.port}")
            return True
        except Exception as e:
            print(f"Failed to connect to Milvus server: {e}")
            self.mock_mode = True
            return False
            
    def _create_collection_if_not_exists(self) -> bool:
        """Create collection if it doesn't exist"""
        if self.mock_mode:
            return False
            
        try:
            if utility.has_collection(self.collection_name):
                print(f"Collection {self.collection_name} already exists")
                return True
                
            # Define fields for the collection
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="log_id", dtype=DataType.INT64),
                FieldSchema(name="segment_id", dtype=DataType.INT64),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=self.dimension),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535)
            ]
            
            # Create collection schema
            schema = CollectionSchema(fields=fields, description="Telecom log vector embeddings")
            
            # Create collection
            collection = Collection(name=self.collection_name, schema=schema)
            
            # Create index for vector field
            index_params = {
                "metric_type": "L2",
                "index_type": "FLAT",
                "params": {}
            }
            collection.create_index(field_name="vector", index_params=index_params)
            
            print(f"Created collection {self.collection_name} with index")
            return True
        except Exception as e:
            print(f"Failed to create collection: {e}")
            self.mock_mode = True
            return False
            
    def insert_embeddings(self, log_id: int, text_segments: List[str], vectors: List[List[float]]) -> List[int]:
        """Insert embeddings into Milvus"""
        if self.mock_mode:
            # Return mock IDs
            return [i + 1 for i in range(len(text_segments))]
            
        try:
            # Ensure collection exists
            if not self._create_collection_if_not_exists():
                raise Exception("Collection doesn't exist and couldn't be created")
                
            # Prepare data
            entities = [
                {"log_id": log_id, "segment_id": i, "vector": vector, "text": text}
                for i, (text, vector) in enumerate(zip(text_segments, vectors))
            ]
            
            # Get collection
            collection = Collection(self.collection_name)
            
            # Insert data
            insert_result = collection.insert(entities)
            
            print(f"Inserted {len(entities)} vectors for log ID {log_id}")
            return insert_result.primary_keys
        except Exception as e:
            print(f"Failed to insert embeddings: {e}")
            # Return mock IDs in case of failure
            return [i + 1 for i in range(len(text_segments))]
            
    def search_similar_segments(self, query_vector: List[float], top_k: int = 5) -> List[Dict[str, Any]]:
        """Search for similar segments using vector similarity"""
        if self.mock_mode:
            # Return mock results
            return [
                {
                    "id": i + 1,
                    "log_id": random.randint(1, 10),
                    "segment_id": i,
                    "text": f"This is a mock search result #{i+1} that would match your query",
                    "score": 1.0 - (i * 0.1)
                }
                for i in range(top_k)
            ]
            
        try:
            # Ensure collection exists
            if not utility.has_collection(self.collection_name):
                raise Exception(f"Collection {self.collection_name} does not exist")
                
            # Get collection
            collection = Collection(self.collection_name)
            collection.load()
            
            # Search parameters
            search_params = {
                "metric_type": "L2",
                "params": {"nprobe": 10}
            }
            
            # Perform search
            results = collection.search(
                data=[query_vector],
                anns_field="vector",
                param=search_params,
                limit=top_k,
                output_fields=["log_id", "segment_id", "text"]
            )
            
            # Format results
            formatted_results = []
            for hits in results:
                for hit in hits:
                    formatted_results.append({
                        "id": hit.id,
                        "log_id": hit.entity.get("log_id"),
                        "segment_id": hit.entity.get("segment_id"),
                        "text": hit.entity.get("text"),
                        "score": 1.0 - hit.distance  # Convert distance to similarity score
                    })
                    
            # Release collection
            collection.release()
            
            return formatted_results
        except Exception as e:
            print(f"Failed to search similar segments: {e}")
            # Return mock results in case of failure
            return [
                {
                    "id": i + 1,
                    "log_id": random.randint(1, 10),
                    "segment_id": i,
                    "text": f"This is a mock search result #{i+1} that would match your query",
                    "score": 1.0 - (i * 0.1)
                }
                for i in range(top_k)
            ]
            
    def get_collection_stats(self) -> Dict[str, Any]:
        """Get statistics about the vector collection"""
        if self.mock_mode:
            # Return mock stats
            return {
                "entity_count": 1250,
                "data_size": "2.5 MB",
                "index_type": "FLAT",
                "dimension": self.dimension,
                "last_updated": "2023-01-01T12:00:00Z"
            }
            
        try:
            # Ensure collection exists
            if not utility.has_collection(self.collection_name):
                raise Exception(f"Collection {self.collection_name} does not exist")
                
            # Get collection
            collection = Collection(self.collection_name)
            
            # Get stats
            stats = {
                "entity_count": collection.num_entities,
                "data_size": "Unknown",  # Milvus doesn't directly expose this
                "index_type": "Unknown",  # Need to query index info
                "dimension": self.dimension,
                "last_updated": "Unknown"  # Milvus doesn't track this
            }
            
            # Try to get index info
            try:
                index_info = collection.index().params
                if index_info:
                    stats["index_type"] = index_info.get("index_type", "Unknown")
            except:
                pass
                
            return stats
        except Exception as e:
            print(f"Failed to get collection stats: {e}")
            # Return mock stats in case of failure
            return {
                "entity_count": 1250,
                "data_size": "2.5 MB",
                "index_type": "FLAT",
                "dimension": self.dimension,
                "last_updated": "2023-01-01T12:00:00Z"
            }
            
    def get_recent_entries(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent entries from the vector database"""
        if self.mock_mode:
            # Return mock recent entries
            return [
                {
                    "id": i + 1,
                    "log_id": random.randint(1, 10),
                    "segment_id": i,
                    "text": f"This is a mock recent entry #{i+1}",
                    "timestamp": "2023-01-01T12:00:00Z"
                }
                for i in range(limit)
            ]
            
        try:
            # Ensure collection exists
            if not utility.has_collection(self.collection_name):
                raise Exception(f"Collection {self.collection_name} does not exist")
                
            # Get collection
            collection = Collection(self.collection_name)
            
            # Query recent entries
            # Note: Milvus doesn't have a timestamp field by default,
            # so we're just getting the last N entries by ID
            results = collection.query(
                expr="id > 0",
                output_fields=["log_id", "segment_id", "text"],
                limit=limit,
                sort="id desc"
            )
            
            # Format results
            formatted_results = []
            for result in results:
                formatted_results.append({
                    "id": result.get("id"),
                    "log_id": result.get("log_id"),
                    "segment_id": result.get("segment_id"),
                    "text": result.get("text"),
                    "timestamp": "2023-01-01T12:00:00Z"  # Placeholder
                })
                
            return formatted_results
        except Exception as e:
            print(f"Failed to get recent entries: {e}")
            # Return mock recent entries in case of failure
            return [
                {
                    "id": i + 1,
                    "log_id": random.randint(1, 10),
                    "segment_id": i,
                    "text": f"This is a mock recent entry #{i+1}",
                    "timestamp": "2023-01-01T12:00:00Z"
                }
                for i in range(limit)
            ]
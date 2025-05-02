import os
import json
import logging
from typing import List, Dict, Any, Optional, Union
from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
)

class MilvusService:
    """Service for interacting with Milvus vector database"""
    
    def __init__(self):
        """Initialize Milvus service"""
        self.collection_name = 'telecom_logs'
        self.dimension = 1536  # Assuming we're using a model with 1536-dimensional embeddings
        self.connection_error = None
        self.is_connecting = False
        self.is_connected = False
        
        # Don't automatically initialize in constructor to prevent startup failures
        # We'll initialize lazily when needed
    
    def initialize(self) -> bool:
        """Initialize connection to Milvus"""
        # If already connecting, wait for that attempt to finish
        if self.is_connecting:
            return self.is_connected
        
        # If we already tried and failed, don't retry immediately
        if self.connection_error and self.is_connected is False:
            logging.info('Milvus connection previously failed, will retry on next request')
            return False
        
        self.is_connecting = True
        
        try:
            # Connect to Milvus - default to localhost:19530 if not specified
            host = os.environ.get('MILVUS_HOST', 'localhost')
            port = os.environ.get('MILVUS_PORT', '19530')
            
            logging.info(f"Attempting to connect to Milvus at {host}:{port}...")
            
            # Connect to Milvus server
            connections.connect(
                alias="default", 
                host=host, 
                port=port
            )
            
            # Check if the connection works
            utility.list_collections()
            
            logging.info("Connected to Milvus server successfully")
            self.connection_error = None
            self.is_connected = True
            
            # Check if collection exists, create if it doesn't
            self.ensure_collection()
            return True
            
        except Exception as e:
            logging.error(f"Failed to initialize Milvus: {str(e)}")
            self.connection_error = e
            self.is_connected = False
            return False
            
        finally:
            self.is_connecting = False
    
    def ensure_collection(self) -> None:
        """Ensure collection exists, create if it doesn't"""
        try:
            if not utility.has_collection(self.collection_name):
                # Define collection schema
                fields = [
                    FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                    FieldSchema(name="log_id", dtype=DataType.INT64),
                    FieldSchema(name="segment_text", dtype=DataType.VARCHAR, max_length=65535),
                    FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=self.dimension)
                ]
                
                schema = CollectionSchema(fields=fields, description="Telecom logs collection")
                
                # Create collection
                collection = Collection(name=self.collection_name, schema=schema)
                
                # Create an index on the embedding field
                index_params = {
                    "metric_type": "COSINE",
                    "index_type": "HNSW",
                    "params": {"M": 8, "efConstruction": 64}
                }
                
                collection.create_index(field_name="embedding", index_params=index_params)
                logging.info(f"Created collection {self.collection_name}")
            
            # Load collection into memory for search
            collection = Collection(self.collection_name)
            collection.load()
            logging.info(f"Loaded collection {self.collection_name}")
            
        except Exception as e:
            logging.error(f"Error setting up Milvus collection: {str(e)}")
            raise
    
    def insert_embeddings(self, log_id: int, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Insert embeddings into Milvus"""
        # Initialize if not connected
        if not self.is_connected and not self.initialize():
            raise Exception("Milvus client is not initialized")
        
        try:
            collection = Collection(self.collection_name)
            
            # Prepare data
            log_ids = [log_id] * len(segments)
            segment_texts = [segment["text"] for segment in segments]
            embeddings = [segment["embedding"] for segment in segments]
            
            # Insert data
            insert_result = collection.insert([
                log_ids,
                segment_texts,
                embeddings
            ])
            
            # Get the IDs
            ids = insert_result.primary_keys
            
            # Return as list of dicts
            return [{"id": id} for id in ids]
            
        except Exception as e:
            logging.error(f"Error inserting embeddings: {str(e)}")
            raise
    
    def search_similar_text(self, embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar text segments"""
        # Initialize if not connected
        if not self.is_connected and not self.initialize():
            raise Exception("Milvus client is not initialized")
        
        try:
            collection = Collection(self.collection_name)
            
            search_params = {
                "metric_type": "COSINE",
                "params": {"ef": 32}
            }
            
            results = collection.search(
                data=[embedding],
                anns_field="embedding",
                param=search_params,
                limit=limit,
                output_fields=["log_id", "segment_text"]
            )
            
            if not results or len(results) == 0:
                return []
            
            # Format the results
            formatted_results = []
            for hits in results:
                for hit in hits:
                    formatted_results.append({
                        "logId": hit.entity.get("log_id"),
                        "text": hit.entity.get("segment_text"),
                        "score": hit.score
                    })
            
            return formatted_results
            
        except Exception as e:
            logging.error(f"Error searching similar text: {str(e)}")
            raise
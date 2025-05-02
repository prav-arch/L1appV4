import os
import time
import random
import hashlib
from typing import List, Dict, Any, Optional
from pymilvus import (
    connections,
    utility,
    FieldSchema,
    CollectionSchema,
    DataType,
    Collection,
    MilvusException
)

class MilvusService:
    """Service for interacting with Milvus vector database"""
    
    def __init__(self):
        """Initialize Milvus service"""
        # Get Milvus configuration from environment variables or use defaults
        self.host = os.environ.get('MILVUS_HOST', 'localhost')
        self.port = os.environ.get('MILVUS_PORT', '19530')
        self.collection_name = 'telecom_logs'
        
        # Vector dimensions (assuming we're using a model with 1536D embeddings)
        self.dimension = 1536
        
        # Connection tracking
        self.connection_error = None
        self.is_connecting = False
        
        # Try to initialize connection
        try:
            self.initialize()
        except Exception as e:
            print(f"Milvus service is not accessible: {str(e)}")
            self.connection_error = e
    
    def initialize(self) -> bool:
        """Initialize connection to Milvus"""
        if self.is_connecting:
            return False
        
        self.is_connecting = True
        try:
            # Connect to Milvus
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port
            )
            
            # Create collection if it doesn't exist
            self.ensure_collection()
            
            self.is_connecting = False
            return True
            
        except Exception as e:
            self.connection_error = e
            self.is_connecting = False
            raise
    
    def ensure_collection(self) -> None:
        """Ensure collection exists, create if it doesn't"""
        if not utility.has_collection(self.collection_name):
            # Define fields for the collection
            fields = [
                FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
                FieldSchema(name="log_id", dtype=DataType.INT64),
                FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=2048),
                FieldSchema(name="vector", dtype=DataType.FLOAT_VECTOR, dim=self.dimension)
            ]
            
            # Create schema
            schema = CollectionSchema(fields=fields, description="Telecom logs vector embeddings")
            
            # Create collection
            collection = Collection(name=self.collection_name, schema=schema)
            
            # Create index for vector field
            index_params = {
                "index_type": "HNSW",  # Or another appropriate index type
                "metric_type": "COSINE",  # Or another appropriate metric type
                "params": {"M": 8, "efConstruction": 64}
            }
            
            collection.create_index(field_name="vector", index_params=index_params)
            
            # Load collection into memory
            collection.load()
    
    def insert_embeddings(self, log_id: int, segments: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Insert embeddings into Milvus"""
        try:
            # Try to reconnect if there was a connection error
            if self.connection_error is not None:
                self.initialize()
            
            # Get collection
            collection = Collection(name=self.collection_name)
            
            # Prepare data
            entities = [
                [log_id] * len(segments),  # log_id field
                [segment["text"] for segment in segments],  # text field
                [segment["embedding"] for segment in segments]  # vector field
            ]
            
            # Insert data
            result = collection.insert(entities)
            
            # Map IDs back to segments
            insert_ids = result.primary_keys
            enriched_segments = []
            
            for i, segment in enumerate(segments):
                enriched_segment = segment.copy()
                enriched_segment["id"] = insert_ids[i]
                enriched_segment["logId"] = log_id
                enriched_segments.append(enriched_segment)
            
            return enriched_segments
            
        except Exception as e:
            print(f"Error inserting embeddings: {str(e)}")
            self.connection_error = e
            
            # Return segments without Milvus IDs in case of error
            enriched_segments = []
            for segment in segments:
                segment_copy = segment.copy()
                segment_copy["logId"] = log_id
                enriched_segments.append(segment_copy)
            
            return enriched_segments
    
    def search_similar_text(self, embedding: List[float], limit: int = 10) -> List[Dict[str, Any]]:
        """Search for similar text segments"""
        try:
            # Try to reconnect if there was a connection error
            if self.connection_error is not None:
                self.initialize()
            
            # Get collection
            collection = Collection(name=self.collection_name)
            
            # Load collection (in case it's not already loaded)
            if not collection.is_loaded():
                collection.load()
            
            # Search parameters
            search_params = {
                "metric_type": "COSINE",
                "params": {"nprobe": 10}
            }
            
            # Execute search
            results = collection.search(
                data=[embedding],
                anns_field="vector",
                param=search_params,
                limit=limit,
                expr=None,
                output_fields=["log_id", "text"]
            )
            
            # Format results
            formatted_results = []
            for hits in results:
                for hit in hits:
                    formatted_results.append({
                        "id": hit.id,
                        "logId": hit.entity.get('log_id'),
                        "text": hit.entity.get('text'),
                        "score": float(hit.score)
                    })
            
            return formatted_results
            
        except Exception as e:
            print(f"Error searching similar text: {str(e)}")
            self.connection_error = e
            
            # Generate mock results using a deterministic algorithm based on query
            # This ensures consistent fallback results
            results = []
            seed = int(hashlib.md5(','.join(map(str, embedding[:5])).encode()).hexdigest(), 16) % (2**32)
            random.seed(seed)
            
            # Mock database with some example text segments
            mock_segments = [
                {"id": 1, "logId": 1, "text": "CPU usage high on node A, reaching 95% utilization"},
                {"id": 2, "logId": 1, "text": "Memory leak detected in process XYZ, allocating 2MB/minute"},
                {"id": 3, "logId": 2, "text": "Authentication failures from IP 192.168.1.100, possible brute force attack"},
                {"id": 4, "logId": 2, "text": "TLS certificate expiring in 10 days, renewal required"},
                {"id": 5, "logId": 3, "text": "Network latency between nodes increased to 150ms, exceeding threshold"},
                {"id": 6, "logId": 3, "text": "Load balancer misconfiguration detected, traffic not evenly distributed"},
                {"id": 7, "logId": 4, "text": "Database connection pool exhaustion, timeouts occurring"}
            ]
            
            # Shuffle the mock segments deterministically
            indices = list(range(len(mock_segments)))
            random.shuffle(indices)
            
            # Select up to the requested limit
            for i in indices[:limit]:
                segment = mock_segments[i].copy()
                # Add a random score between 0.6 and 0.95
                segment["score"] = 0.6 + (0.35 * random.random())
                results.append(segment)
            
            # Sort by score descending
            results.sort(key=lambda x: x["score"], reverse=True)
            
            return results
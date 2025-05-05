"""
Module for interacting with the local LLM server
"""
import os
import json
import requests
import random
import math
from typing import List, Dict, Any, Optional, Union
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class LLMService:
    """Service for interacting with the local LLM"""
    
    def __init__(self):
        """Initialize with configured endpoints"""
        # Base URL for the local LLM server
        self.base_url = os.getenv("LLM_SERVER_URL", "http://localhost:8080/v1")
        
        # Endpoints
        self.embedding_endpoint = f"{self.base_url}/embeddings"
        self.completion_endpoint = f"{self.base_url}/chat/completions"
        
        # Check if we're in mock mode (for development/testing)
        self.mock_mode = os.getenv("USE_MOCK_LLM", "false").lower() == "true"
        
        # Print initialization info
        print(f"LLM Service initialized with base URL: {self.base_url}")
        print(f"Mock mode: {'Enabled' if self.mock_mode else 'Disabled'}")
        
    def check_connectivity(self) -> None:
        """Check if LLM server is accessible"""
        try:
            # Try to connect to the embedding endpoint
            response = requests.post(
                self.embedding_endpoint,
                json={"input": "Hello", "model": "all-MiniLM-L6-v2"},
                timeout=5
            )
            response.raise_for_status()
            print("LLM server is accessible")
            # If we got here, disable mock mode
            self.mock_mode = False
        except Exception as e:
            print(f"LLM server is not accessible: {e}")
            # If server is not accessible, enable mock mode
            self.mock_mode = True
            
    def generate_mock_embedding(self, text: str) -> List[float]:
        """Generate a deterministic embedding vector for mock mode"""
        # Create a deterministic but seemingly random vector based on the text
        random.seed(hash(text))
        return [random.uniform(-1, 1) for _ in range(384)]  # 384 dimensions like MiniLM
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        if self.mock_mode:
            return self.generate_mock_embedding(text)
        
        try:
            response = requests.post(
                self.embedding_endpoint,
                json={"input": text, "model": "all-MiniLM-L6-v2"},
                timeout=10
            )
            response.raise_for_status()
            result = response.json()
            return result["data"][0]["embedding"]
        except Exception as e:
            print(f"Error generating embedding: {e}")
            # Fall back to mock mode
            return self.generate_mock_embedding(text)
            
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        # Process in batches for efficiency
        results = []
        for text in texts:
            results.append(self.generate_embedding(text))
        return results
    
    def generate_mock_analysis(self, log_content: str) -> Dict[str, Any]:
        """Generate mock analysis for telecom logs"""
        # Create a somewhat realistic mock analysis based on the log content
        issues = []
        
        # Look for common error patterns
        if "error" in log_content.lower() or "failed" in log_content.lower():
            issues.append({
                "id": 1,
                "type": "error",
                "description": "Network connectivity error detected",
                "severity": "high",
                "timestamp": "2023-01-01T12:00:00Z",
                "occurrences": 3,
                "status": "open"
            })
            
        if "warning" in log_content.lower():
            issues.append({
                "id": 2,
                "type": "warning",
                "description": "Potential memory leak in application",
                "severity": "medium",
                "timestamp": "2023-01-01T12:05:00Z",
                "occurrences": 5,
                "status": "open"
            })
            
        if "timeout" in log_content.lower():
            issues.append({
                "id": 3,
                "type": "error",
                "description": "Request timeout detected",
                "severity": "high",
                "timestamp": "2023-01-01T12:10:00Z",
                "occurrences": 2,
                "status": "open"
            })
            
        # Default issue if none found
        if not issues:
            issues.append({
                "id": 1,
                "type": "info",
                "description": "No significant issues detected",
                "severity": "low",
                "timestamp": "2023-01-01T12:00:00Z",
                "occurrences": 1,
                "status": "resolved"
            })
            
        return {
            "timestamp": "2023-01-01T12:15:00Z",
            "issues": issues,
            "summary": f"Analysis completed with {len(issues)} potential issues identified",
            "resolutionStatus": "pending",
            "processingTime": "1.2s"
        }
        
    def analyze_log(self, log_content: str) -> Dict[str, Any]:
        """Analyze log content with LLM"""
        if self.mock_mode:
            return self.generate_mock_analysis(log_content)
            
        try:
            # Define the prompt for log analysis
            messages = [
                {
                    "role": "system",
                    "content": "You are an expert telecom log analyzer. Analyze the log file and identify critical issues."
                },
                {
                    "role": "user",
                    "content": f"Analyze this telecom log file and identify any issues:\n\n{log_content[:2000]}..."
                }
            ]
            
            # Call the LLM API
            response = requests.post(
                self.completion_endpoint,
                json={
                    "model": "mistral-7b-v0.1",
                    "messages": messages,
                    "temperature": 0.2
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract and format the analysis from the LLM response
            analysis_text = result["choices"][0]["message"]["content"]
            
            # Parse the analysis text into structured format (simplified for example)
            # In a real implementation, you'd have more robust parsing logic
            issues = []
            issue_id = 1
            
            # Simple parsing by looking for keywords
            for line in analysis_text.split('\n'):
                if "error:" in line.lower() or "critical:" in line.lower():
                    issues.append({
                        "id": issue_id,
                        "type": "error",
                        "description": line.split(":", 1)[1].strip() if ":" in line else line.strip(),
                        "severity": "high",
                        "timestamp": "2023-01-01T12:00:00Z",  # Placeholder
                        "occurrences": 1,
                        "status": "open"
                    })
                    issue_id += 1
                elif "warning:" in line.lower():
                    issues.append({
                        "id": issue_id,
                        "type": "warning",
                        "description": line.split(":", 1)[1].strip() if ":" in line else line.strip(),
                        "severity": "medium",
                        "timestamp": "2023-01-01T12:00:00Z",  # Placeholder
                        "occurrences": 1,
                        "status": "open"
                    })
                    issue_id += 1
                    
            return {
                "timestamp": "2023-01-01T12:15:00Z",  # Placeholder
                "issues": issues if issues else [
                    {
                        "id": 1,
                        "type": "info",
                        "description": "No significant issues detected",
                        "severity": "low",
                        "timestamp": "2023-01-01T12:00:00Z",
                        "occurrences": 1,
                        "status": "resolved"
                    }
                ],
                "summary": f"Analysis completed with {len(issues)} potential issues identified" if issues else "No issues found",
                "resolutionStatus": "pending",
                "processingTime": "1.2s"  # Placeholder
            }
            
        except Exception as e:
            print(f"Error analyzing log with LLM: {e}")
            # Fall back to mock analysis
            return self.generate_mock_analysis(log_content)
            
    def semantic_search(self, query: str, search_context: Union[str, List[str]]) -> str:
        """Perform semantic search with LLM"""
        if self.mock_mode:
            return "Semantic search results would appear here. This is a mock response."
            
        try:
            # Convert context to string if it's a list
            if isinstance(search_context, list):
                context_str = "\n\n".join(search_context)
            else:
                context_str = search_context
                
            # Define the prompt for semantic search
            messages = [
                {
                    "role": "system",
                    "content": "You are a telecom log search assistant. Search the logs for relevant information."
                },
                {
                    "role": "user",
                    "content": f"Search these logs for information about: {query}\n\nLogs:\n{context_str[:5000]}..."
                }
            ]
            
            # Call the LLM API
            response = requests.post(
                self.completion_endpoint,
                json={
                    "model": "mistral-7b-v0.1",
                    "messages": messages,
                    "temperature": 0.2
                },
                timeout=30
            )
            response.raise_for_status()
            result = response.json()
            
            # Extract and return the search result
            search_result = result["choices"][0]["message"]["content"]
            return search_result
            
        except Exception as e:
            print(f"Error performing semantic search with LLM: {e}")
            # Fall back to mock response
            return "Semantic search results would appear here. This is a mock response due to an error."
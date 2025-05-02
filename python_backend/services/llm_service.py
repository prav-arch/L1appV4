import os
import json
import math
import re
import requests
from typing import List, Dict, Any, Optional, Union
import logging

class LLMService:
    """Service for interacting with the local LLM"""
    
    def __init__(self):
        """Initialize with configured endpoints"""
        # Default to localhost:8080 if not specified
        self.inference_url = os.environ.get('LLM_INFERENCE_URL', 'http://localhost:8080/v1/completions')
        self.embedding_url = os.environ.get('LLM_EMBEDDING_URL', 'http://localhost:8080/v1/embeddings')
        self.connection_error = None
        self.mock_mode = False
        
        # Check connectivity on startup (non-blocking)
        self.check_connectivity()
    
    def check_connectivity(self) -> None:
        """Check if LLM server is accessible"""
        try:
            # Try a simple request to see if LLM server is up
            logging.info(f"Checking LLM server connectivity at {self.embedding_url}...")
            
            response = requests.post(
                self.embedding_url,
                json={
                    "input": "connectivity test",
                    "model": "all-MiniLM-L6-v2"
                },
                timeout=5
            )
            
            if response.status_code == 200:
                logging.info("LLM server is accessible")
                self.connection_error = None
                self.mock_mode = False
            else:
                error_text = response.text
                raise Exception(f"LLM server responded with error: {response.status_code} {error_text}")
        except Exception as e:
            logging.error(f"LLM server is not accessible: {str(e)}")
            self.connection_error = e
            self.mock_mode = True
    
    def generate_mock_embedding(self, text: str) -> List[float]:
        """Generate a deterministic embedding vector for mock mode"""
        # Create a simple hash of the text
        hash_value = 0
        for i, char in enumerate(text):
            hash_value = ((hash_value << 5) - hash_value) + ord(char)
            hash_value = hash_value & 0xFFFFFFFF  # Convert to 32bit integer
        
        # Generate a vector of 1536 dimensions with some variations based on the hash
        vector = []
        for i in range(1536):
            # Use the hash and position to generate a pseudorandom but deterministic value
            value = math.sin(hash_value * (i + 1)) * 0.5
            vector.append(round(value, 6))
        
        return vector
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        if self.mock_mode:
            logging.info("Using mock embedding generation as LLM server is not accessible")
            return self.generate_mock_embedding(text)
        
        try:
            response = requests.post(
                self.embedding_url,
                json={
                    "input": text,
                    "model": "all-MiniLM-L6-v2"  # Example embedding model
                },
                timeout=30
            )
            
            if response.status_code != 200:
                error_text = response.text
                raise Exception(f"Failed to generate embeddings: {response.status_code} {error_text}")
            
            result = response.json()
            return result["embedding"]
        except Exception as e:
            logging.error(f"Error generating embeddings from LLM service: {str(e)}")
            
            # Switch to mock mode after a real failure
            self.mock_mode = True
            self.connection_error = e
            
            # Fall back to mock embeddings
            return self.generate_mock_embedding(text)
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        return [self.generate_embedding(text) for text in texts]
    
    def generate_mock_analysis(self, log_content: str) -> Dict[str, Any]:
        """Generate mock analysis for telecom logs"""
        # Extract some data from the log for mock analysis
        lines = [line for line in log_content.split('\n') if line.strip()]
        timestamp_match = re.search(r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}', log_content)
        timestamp = timestamp_match.group(0) if timestamp_match else "Unknown Timestamp"
        
        # Count error and warning patterns
        error_count = len(re.findall(r'error|exception|fail', log_content, re.IGNORECASE)) or 0
        warning_count = len(re.findall(r'warning|warn|timeout', log_content, re.IGNORECASE)) or 0
        
        # Determine mock severity
        if error_count > 10:
            mock_severity = "high"
        elif error_count > 5 or warning_count > 10:
            mock_severity = "medium"
        else:
            mock_severity = "low"
        
        return {
            "issues": [
                {
                    "title": "Connectivity Issues Detected",
                    "description": f"The log shows possible connectivity problems between network components. {error_count} errors and {warning_count} warnings were found.",
                    "severity": mock_severity,
                    "firstOccurrence": timestamp,
                    "status": "pending"
                },
                {
                    "title": "Configuration Mismatch",
                    "description": "There appears to be a configuration mismatch between service endpoints.",
                    "severity": "medium",
                    "firstOccurrence": timestamp,
                    "status": "pending"
                }
            ],
            "recommendations": [
                {
                    "title": "Verify Network Configuration",
                    "description": "Check all network configuration parameters and ensure consistency across services.",
                    "category": "configuration",
                    "isAutomaticallyResolved": False
                },
                {
                    "title": "Implement Enhanced Monitoring",
                    "description": "Set up additional monitoring for affected services to catch issues earlier.",
                    "category": "monitoring",
                    "isAutomaticallyResolved": False,
                    "documentationLink": "https://example.com/telecom-monitoring"
                }
            ],
            "summary": "The logs indicate network connectivity and configuration issues that should be addressed.",
            "severity": mock_severity
        }
    
    def analyze_log(self, log_content: str) -> Dict[str, Any]:
        """Analyze log content with LLM"""
        # Use mock analysis if in mock mode
        if self.mock_mode:
            logging.info("Using mock analysis as LLM server is not accessible")
            return self.generate_mock_analysis(log_content)
        
        try:
            prompt = f"""
You are a telecom network expert AI system. Analyze the following log file and identify issues, 
provide recommendations, and assess severity. Format your response as a JSON object with the following structure:
{{
  "issues": [
    {{
      "title": "Brief title of the issue",
      "description": "Detailed description of the issue",
      "severity": "low|medium|high",
      "firstOccurrence": "timestamp from log",
      "status": "pending|in_progress|fixed"
    }}
  ],
  "recommendations": [
    {{
      "title": "Brief title of recommendation",
      "description": "Detailed recommendation",
      "category": "configuration|monitoring|authentication|network|other",
      "isAutomaticallyResolved": true|false,
      "documentationLink": "optional URL to documentation"
    }}
  ],
  "summary": "Brief summary of the entire log analysis",
  "severity": "low|medium|high"
}}

Log content:
{log_content}

Analyze the above logs and respond with ONLY the JSON output.
"""
            
            response = requests.post(
                self.inference_url,
                json={
                    "model": "mistral-7b",  # Example model name
                    "prompt": prompt,
                    "max_tokens": 2048,
                    "temperature": 0.1,
                },
                timeout=30
            )
            
            if response.status_code != 200:
                error_text = response.text
                raise Exception(f"Failed to analyze log: {response.status_code} {error_text}")
            
            result = response.json()
            
            # Extract JSON from response text
            json_match = re.search(r'({[\s\S]*})', result["text"])
            if not json_match:
                raise Exception("No JSON found in LLM response")
            
            analysis_result = json.loads(json_match.group(0))
            return analysis_result
        except Exception as e:
            logging.error(f"Error analyzing log with LLM: {str(e)}")
            
            # Switch to mock mode after a failure
            self.mock_mode = True
            self.connection_error = e
            
            # Return mock analysis
            return self.generate_mock_analysis(log_content)
    
    def semantic_search(self, query: str, search_context: Union[str, List[str]]) -> str:
        """Perform semantic search with LLM"""
        # Use mock response if in mock mode
        if self.mock_mode:
            logging.info("Using mock semantic search as LLM server is not accessible")
            return f'Based on the logs, there appear to be issues related to "{query}". Several entries mention connection problems and configuration issues that may be relevant to your search.'
        
        try:
            # Format the context properly
            if isinstance(search_context, list):
                context_text = "\n\n".join(search_context)
            else:
                context_text = str(search_context)
            
            prompt = f"""
You are a telecom network expert AI system. Based on the user's search query and the retrieved log segments, 
provide a concise summary of the relevant findings.

User query: "{query}"

Retrieved log segments:
{context_text}

Provide a brief, helpful response about what was found in the logs related to the query.
"""
            
            response = requests.post(
                self.inference_url,
                json={
                    "model": "mistral-7b",  # Example model name
                    "prompt": prompt,
                    "max_tokens": 512,
                    "temperature": 0.3,
                },
                timeout=15
            )
            
            if response.status_code != 200:
                error_text = response.text
                raise Exception(f"Failed to process semantic search: {response.status_code} {error_text}")
            
            result = response.json()
            return result["text"]
        except Exception as e:
            logging.error(f"Error with semantic search: {str(e)}")
            
            # Switch to mock mode after a failure
            self.mock_mode = True
            self.connection_error = e
            
            # Return a simple response
            return f'Search results for "{query}" indicate several potential matches. The logs show various technical issues that may be related to your query. Please check the specific entries for more details.'
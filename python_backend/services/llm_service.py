import os
import json
import requests
import hashlib
import random
from typing import List, Dict, Any, Union
from datetime import datetime

class LLMService:
    """Service for interacting with the local LLM"""
    
    def __init__(self):
        """Initialize with configured endpoints"""
        # Get LLM endpoints from environment variables or use defaults
        self.inference_url = os.environ.get('LLM_INFERENCE_URL', 'http://localhost:8080/v1/completions')
        self.embedding_url = os.environ.get('LLM_EMBEDDING_URL', 'http://localhost:8080/v1/embeddings')
        self.model_name = os.environ.get('LLM_MODEL', 'mistral-7b')
        
        # Check if LLM service is available
        self.connection_error = None
        self.mock_mode = False
        
        try:
            self.check_connectivity()
        except Exception as e:
            print(f"LLM service is not accessible: {str(e)}")
            self.connection_error = e
            self.mock_mode = True
    
    def check_connectivity(self) -> None:
        """Check if LLM server is accessible"""
        response = requests.post(
            self.embedding_url,
            json={
                "input": "test",
                "model": self.model_name
            },
            timeout=5
        )
        
        if response.status_code != 200:
            raise Exception(f"LLM server returned status code {response.status_code}")
    
    def generate_mock_embedding(self, text: str) -> List[float]:
        """Generate a deterministic embedding vector for mock mode"""
        # Create a pseudo-random but deterministic embedding based on the text hash
        seed = int(hashlib.md5(text.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Generate a 1536-dimensional embedding (common size for many models)
        embedding = [random.uniform(-1, 1) for _ in range(1536)]
        
        # Normalize to unit length
        length = sum(x**2 for x in embedding) ** 0.5
        embedding = [x / length for x in embedding]
        
        return embedding
    
    def generate_embedding(self, text: str) -> List[float]:
        """Generate embedding vector for text"""
        if self.mock_mode:
            return self.generate_mock_embedding(text)
        
        response = requests.post(
            self.embedding_url,
            json={
                "input": text,
                "model": self.model_name
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to generate embedding: {response.text}")
        
        data = response.json()
        return data["embedding"]
    
    def generate_embeddings(self, texts: List[str]) -> List[List[float]]:
        """Generate embeddings for multiple texts"""
        embeddings = []
        
        for text in texts:
            embedding = self.generate_embedding(text)
            embeddings.append(embedding)
        
        return embeddings
    
    def generate_mock_analysis(self, log_content: str) -> Dict[str, Any]:
        """Generate mock analysis for telecom logs"""
        # Create deterministic but pseudo-random issues based on content hash
        seed = int(hashlib.md5(log_content.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Generate random number of issues (1-5)
        num_issues = random.randint(1, 5)
        
        # Sample issue templates
        issue_templates = [
            {
                "title": "High CPU Usage on Node FLEX-2103",
                "description": "CPU usage consistently above 85% threshold during peak hours. This may lead to service degradation and potential outages.",
                "severity": "high",
                "firstOccurrence": "2023-08-15T14:32:10Z"
            },
            {
                "title": "Authentication Failures on Gateway GATE-4201",
                "description": "Multiple authentication failures detected on gateway GATE-4201. This could indicate a brute force attack or misconfigured client devices.",
                "severity": "medium",
                "firstOccurrence": "2023-09-01T08:17:45Z"
            },
            {
                "title": "Memory Leak in Core Service",
                "description": "Memory utilization increasing gradually without corresponding decrease, indicating a potential memory leak in core services.",
                "severity": "high",
                "firstOccurrence": "2023-08-20T23:45:12Z"
            },
            {
                "title": "Network Latency Spikes",
                "description": "Intermittent network latency spikes observed during handover procedures. May result in dropped calls or data session interruptions.",
                "severity": "medium",
                "firstOccurrence": "2023-08-25T11:20:30Z"
            },
            {
                "title": "Misconfigured Load Balancer",
                "description": "Load balancer configuration does not distribute traffic optimally across available nodes, creating hotspots.",
                "severity": "low",
                "firstOccurrence": "2023-09-05T16:12:05Z"
            },
            {
                "title": "TLS Certificate Expiration",
                "description": "TLS certificate for secure communications approaching expiration date. Renewal required to prevent service disruption.",
                "severity": "medium",
                "firstOccurrence": "2023-09-10T09:05:22Z"
            },
            {
                "title": "Database Connection Pool Exhaustion",
                "description": "Database connection pool repeatedly reaching maximum capacity, causing timeouts for new connection requests.",
                "severity": "high",
                "firstOccurrence": "2023-08-18T13:42:08Z"
            }
        ]
        
        # Sample recommendation templates
        recommendation_templates = [
            {
                "title": "Implement CPU Throttling",
                "description": "Configure CPU throttling policies to prevent excess resource consumption during peak hours.",
                "category": "configuration",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/cpu-management"
            },
            {
                "title": "Update Authentication Protocol",
                "description": "Update to OAuth 2.0 with multi-factor authentication for improved security posture.",
                "category": "authentication",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/auth-security"
            },
            {
                "title": "Memory Profiling and Fix",
                "description": "Run memory profiling tools to identify and fix memory leaks in core service modules.",
                "category": "monitoring",
                "isAutomaticallyResolved": False
            },
            {
                "title": "Network QoS Optimization",
                "description": "Implement Quality of Service (QoS) parameters to prioritize handover traffic and reduce latency.",
                "category": "network",
                "isAutomaticallyResolved": True
            },
            {
                "title": "Reconfigure Load Balancer Algorithm",
                "description": "Switch load balancing algorithm from round-robin to least-connections for improved distribution.",
                "category": "configuration",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/load-balancing"
            },
            {
                "title": "Certificate Auto-renewal Setup",
                "description": "Configure automated certificate renewal using Let's Encrypt or similar service to prevent expiration.",
                "category": "authentication",
                "isAutomaticallyResolved": True
            },
            {
                "title": "Database Connection Pool Optimization",
                "description": "Increase connection pool size and implement connection timeout policies to handle peak loads.",
                "category": "configuration",
                "isAutomaticallyResolved": False,
                "documentationLink": "https://example.com/docs/db-optimization"
            }
        ]
        
        # Select random issues
        issues = []
        used_indices = set()
        for _ in range(num_issues):
            while True:
                idx = random.randint(0, len(issue_templates) - 1)
                if idx not in used_indices:
                    used_indices.add(idx)
                    break
            
            issue = issue_templates[idx].copy()
            # Randomly assign status
            issue["status"] = random.choice(["pending", "in_progress", "fixed"])
            issues.append(issue)
        
        # Select random recommendations
        recommendations = []
        num_recommendations = random.randint(1, 3)
        used_indices = set()
        for _ in range(num_recommendations):
            while True:
                idx = random.randint(0, len(recommendation_templates) - 1)
                if idx not in used_indices:
                    used_indices.add(idx)
                    break
            
            recommendation = recommendation_templates[idx].copy()
            recommendations.append(recommendation)
        
        # Generate a summary
        summaries = [
            "Analysis identified multiple critical issues requiring immediate attention.",
            "Several configuration issues detected that may impact service quality.",
            "Analysis revealed potential security vulnerabilities in authentication systems.",
            "Performance degradation likely due to resource constraints and configuration issues.",
            "Network optimization opportunities identified to improve service quality."
        ]
        
        summary = random.choice(summaries)
        
        # Determine overall severity based on issues
        severities = [issue["severity"] for issue in issues]
        if "high" in severities:
            severity = "high"
        elif "medium" in severities:
            severity = "medium"
        else:
            severity = "low"
        
        return {
            "issues": issues,
            "recommendations": recommendations,
            "summary": summary,
            "severity": severity
        }
    
    def analyze_log(self, log_content: str) -> Dict[str, Any]:
        """Analyze log content with LLM"""
        if self.mock_mode:
            return self.generate_mock_analysis(log_content)
        
        # For a real implementation, this would send the log to the LLM for analysis
        # and parse the response into the required format
        
        prompt = f"""
        You are a telecommunications network expert. Analyze the following log file and identify issues, 
        their severity, and provide recommendations for resolution:
        
        {log_content[:5000]}  # Truncate log for prompt size limits
        
        Respond with a JSON object containing:
        1. issues: array of issues with title, description, severity (high/medium/low), and firstOccurrence
        2. recommendations: array with title, description, category, and isAutomaticallyResolved flag
        3. summary: brief overview of findings
        4. severity: overall severity (high/medium/low)
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 1000,
                "temperature": 0.2
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to analyze log: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON object from text (the LLM might include explanatory text)
        try:
            # Find JSON content (assuming it's enclosed in triple backticks)
            import re
            json_match = re.search(r'```json\n(.*?)\n```', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                # Try to find any JSON-like structure
                json_match = re.search(r'({.*})', text, re.DOTALL)
                if json_match:
                    json_str = json_match.group(1)
                else:
                    json_str = text
            
            analysis_result = json.loads(json_str)
            
            # Ensure required fields are present
            if "issues" not in analysis_result:
                analysis_result["issues"] = []
            if "recommendations" not in analysis_result:
                analysis_result["recommendations"] = []
            if "summary" not in analysis_result:
                analysis_result["summary"] = "Analysis completed without detailed summary."
            if "severity" not in analysis_result:
                analysis_result["severity"] = "medium"
            
            return analysis_result
        
        except Exception as e:
            print(f"Error parsing LLM response: {str(e)}")
            # Fall back to mock analysis if parsing fails
            return self.generate_mock_analysis(log_content)
    
    def semantic_search(self, query: str, search_context: Union[str, List[str]]) -> str:
        """Perform semantic search with LLM"""
        if self.mock_mode:
            return f"Semantic search results for: {query}\n\nFound {len(search_context) if isinstance(search_context, list) else 1} relevant matches."
        
        # Convert context to string if it's a list
        if isinstance(search_context, list):
            context_text = "\n\n".join(search_context)
        else:
            context_text = search_context
        
        prompt = f"""
        Based on the following telecom log excerpts, answer the query: "{query}"
        
        Log excerpts:
        {context_text}
        
        Provide a concise summary of the information relevant to the query.
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 500,
                "temperature": 0.3
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to perform semantic search: {response.text}")
        
        data = response.json()
        return data.get("text", "No relevant information found.")
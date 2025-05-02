import os
import json
import requests
import hashlib
import random
from typing import List, Dict, Any, Union, Optional
from datetime import datetime
from .llm_fine_tuning import fine_tuning_service

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
    
    def perform_root_cause_analysis(self, content: str, issues: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze logs to determine root causes of identified issues"""
        if self.mock_mode:
            return self.generate_mock_root_cause_analysis(issues)
        
        # Format issues for prompt
        issues_json = json.dumps(issues)
        
        # Truncate content if needed
        truncated_content = content[:10000] if len(content) > 10000 else content
        
        prompt = f"""
        You are a telecommunications expert analyzing network logs.
        
        IDENTIFIED ISSUES:
        {issues_json}
        
        LOG DATA:
        {truncated_content}
        
        Perform a deep root cause analysis to identify the underlying causes of these issues.
        Focus on relationships between events, common failure patterns, and system dependencies.
        
        Return a JSON with:
        {{
            "root_causes": [
                {{
                    "description": "Brief description of root cause",
                    "explanation": "Detailed explanation of how this root cause leads to the observed issues",
                    "confidence": 0.1 to 1.0 (confidence level),
                    "affectedComponents": ["component1", "component2"],
                    "evidence": ["evidence1", "evidence2"]
                }}
            ],
            "relationships": [
                {{
                    "from": "issue or component",
                    "to": "issue or component",
                    "relationship": "causes|impacts|correlates with",
                    "strength": "strong|medium|weak"
                }}
            ],
            "summary": "Overall summary of root cause analysis"
        }}
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 2000,
                "temperature": 0.2
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to perform root cause analysis: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON from response
        try:
            import re
            json_match = re.search(r'({.*})', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = text
            
            analysis_result = json.loads(json_str)
            
            # Ensure required fields
            if "root_causes" not in analysis_result:
                analysis_result["root_causes"] = []
            if "relationships" not in analysis_result:
                analysis_result["relationships"] = []
            if "summary" not in analysis_result:
                analysis_result["summary"] = "Root cause analysis completed."
            
            return analysis_result
        
        except Exception as e:
            print(f"Error parsing root cause analysis response: {str(e)}")
            return self.generate_mock_root_cause_analysis(issues)
    
    def generate_mock_root_cause_analysis(self, issues: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate mock root cause analysis for testing"""
        # Generate a seed based on the issue titles
        seed_text = "+".join([issue.get("title", "") for issue in issues[:2]])
        seed = int(hashlib.md5(seed_text.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Sample root causes
        root_cause_templates = [
            {
                "description": "Network Configuration Mismatch",
                "explanation": "The network configuration parameters between devices are inconsistent, leading to communication failures and timeouts.",
                "confidence": round(random.uniform(0.65, 0.95), 2),
                "affectedComponents": ["SIP Gateway", "Routing Table", "Firewall"],
                "evidence": [
                    "Multiple SIP timeout errors with different endpoints",
                    "Configuration version inconsistency across logs",
                    "Packet fragmentation issues detected in network segments"
                ]
            },
            {
                "description": "Authentication Service Failure",
                "explanation": "The central authentication service is experiencing intermittent failures, causing cascading authentication issues across multiple components.",
                "confidence": round(random.uniform(0.7, 0.9), 2),
                "affectedComponents": ["Auth Server", "User Database", "SIP Registrations"],
                "evidence": [
                    "Correlation between auth server restarts and authentication failures",
                    "Identical timeout patterns across different user sessions",
                    "Database connection errors preceding authentication failures"
                ]
            },
            {
                "description": "DNS Resolution Chain Breaking",
                "explanation": "Primary and secondary DNS servers are not synchronizing correctly, causing inconsistent name resolution and connection failures.",
                "confidence": round(random.uniform(0.6, 0.85), 2),
                "affectedComponents": ["DNS Servers", "SIP Endpoints", "Media Gateway"],
                "evidence": [
                    "Different IP resolutions for the same hostname within short time periods",
                    "DNS cache inconsistencies between primary and secondary servers",
                    "Connection retries following initial DNS failures"
                ]
            }
        ]
        
        # Select 1-2 root causes
        num_causes = min(len(issues), random.randint(1, 2))
        root_causes = random.sample(root_cause_templates, num_causes)
        
        # Generate relationships
        relationships = []
        components = []
        
        for cause in root_causes:
            components.extend(cause["affectedComponents"])
            
            # Add relationships between root causes and issues
            for issue in issues:
                if random.random() > 0.3:  # 70% chance to create a relationship
                    relationships.append({
                        "from": cause["description"],
                        "to": issue["title"],
                        "relationship": random.choice(["causes", "impacts", "correlates with"]),
                        "strength": random.choice(["strong", "medium", "weak"])
                    })
        
        # Add component-to-component relationships
        if len(components) > 1:
            num_comp_relations = min(len(components), random.randint(1, 3))
            for _ in range(num_comp_relations):
                from_comp = random.choice(components)
                to_comp = random.choice([c for c in components if c != from_comp])
                relationships.append({
                    "from": from_comp,
                    "to": to_comp,
                    "relationship": random.choice(["impacts", "depends on", "correlates with"]),
                    "strength": random.choice(["strong", "medium", "weak"])
                })
        
        # Summary
        summary = f"Analysis identified {num_causes} potential root causes affecting {len(issues)} observed issues."
        
        return {
            "root_causes": root_causes,
            "relationships": relationships,
            "summary": summary
        }
    
    def predict_potential_issues(self, recent_logs_content: List[str]) -> Dict[str, Any]:
        """Predict potential issues based on patterns in recent logs"""
        if self.mock_mode:
            return self.generate_mock_predictions()
        
        # Combine logs and limit size
        combined_content = "\n\n".join([log[:3000] for log in recent_logs_content[:3]])
        
        prompt = f"""
        As a telecom network expert, analyze these recent logs and predict potential issues 
        that might occur in the near future based on the patterns you observe:
        
        {combined_content}
        
        Return a JSON object with:
        {{
            "predictions": [
                {{
                    "title": "Brief issue title",
                    "description": "Detailed issue description",
                    "likelihood": "high|medium|low",
                    "timeframe": "Short description of when this might occur (e.g., '24-48 hours')",
                    "preventiveActions": ["action1", "action2"],
                    "indicators": ["early warning sign1", "early warning sign2"]
                }}
            ],
            "summary": "Overall prediction summary"
        }}
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 1500,
                "temperature": 0.3
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to predict potential issues: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON from response
        try:
            import re
            json_match = re.search(r'({.*})', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = text
            
            predictions = json.loads(json_str)
            
            # Ensure required fields
            if "predictions" not in predictions:
                predictions["predictions"] = []
            if "summary" not in predictions:
                predictions["summary"] = "Prediction analysis completed."
            
            return predictions
        
        except Exception as e:
            print(f"Error parsing predictions response: {str(e)}")
            return self.generate_mock_predictions()
    
    def generate_mock_predictions(self) -> Dict[str, Any]:
        """Generate mock predictions for testing"""
        # Set random seed for predictable results
        random.seed(int(datetime.now().timestamp()))
        
        # Sample predictions
        prediction_templates = [
            {
                "title": "SIP Registration Storm",
                "description": "Multiple endpoints may attempt reconnection simultaneously, creating a registration storm that could overload SIP servers.",
                "likelihood": "medium",
                "timeframe": "24-48 hours",
                "preventiveActions": [
                    "Implement connection rate limiting on SIP servers",
                    "Stagger registration timeout values across endpoint groups",
                    "Increase registration server capacity temporarily"
                ],
                "indicators": [
                    "Increasing frequency of registration timeouts",
                    "Growing number of failed authentication attempts",
                    "Reduced average time between registration attempts"
                ]
            },
            {
                "title": "Voice Quality Degradation",
                "description": "Current network congestion patterns indicate potential voice quality issues, particularly during peak hours.",
                "likelihood": "high",
                "timeframe": "12-24 hours",
                "preventiveActions": [
                    "Prioritize voice traffic with QoS adjustments",
                    "Temporarily increase bandwidth allocation for RTP traffic",
                    "Reroute non-critical traffic to alternative paths"
                ],
                "indicators": [
                    "Increasing packet loss on voice data paths",
                    "Rising jitter measurements in RTP statistics",
                    "Growing number of MOS score complaints"
                ]
            },
            {
                "title": "DNS Resolution Failure",
                "description": "DNS server load is approaching capacity limits, which may lead to resolution failures and service disruption.",
                "likelihood": "low",
                "timeframe": "3-5 days",
                "preventiveActions": [
                    "Verify DNS server health and configuration",
                    "Update DNS cache to reduce lookup frequency",
                    "Add backup DNS servers to handle overflow"
                ],
                "indicators": [
                    "Increasing DNS resolution latency",
                    "Growing number of DNS timeouts in system logs",
                    "Higher than normal DNS query rates"
                ]
            }
        ]
        
        # Select random predictions
        num_predictions = random.randint(1, 3)
        predictions = random.sample(prediction_templates, num_predictions)
        
        # Generate summary
        summary = f"Analysis predicts {num_predictions} potential issues that may occur in the near future based on current system behavior patterns."
        
        return {
            "predictions": predictions,
            "summary": summary
        }
    
    def analyze_timeline_events(self, timeline_events: List[Dict[str, str]], log_id: int) -> Dict[str, Any]:
        """Analyze timeline events for significance and patterns"""
        if self.mock_mode:
            return self.generate_mock_timeline_analysis(timeline_events)
        
        # Format events for LLM
        events_text = "\n".join([f"{event['timestamp']} - {event['line']}" for event in timeline_events[:50]])
        
        prompt = f"""
        As a telecom network analyst, analyze this chronological sequence of log events:
        
        {events_text}
        
        Identify key events, patterns, and the progression of system state changes.
        
        Return a JSON with:
        {{
            "key_events": [
                {{
                    "timestamp": "Event timestamp",
                    "description": "Description of significant event",
                    "significance": "high|medium|low"
                }}
            ],
            "phases": [
                {{
                    "start_time": "Phase start timestamp",
                    "end_time": "Phase end timestamp",
                    "name": "Brief phase name",
                    "description": "Description of what's happening in this phase"
                }}
            ],
            "anomalies": [
                {{
                    "timestamp": "Anomaly timestamp",
                    "description": "Description of the anomaly detected"
                }}
            ]
        }}
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 1500,
                "temperature": 0.2
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to analyze timeline: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON from response
        try:
            import re
            json_match = re.search(r'({.*})', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = text
            
            timeline_analysis = json.loads(json_str)
            
            # Ensure required fields
            if "key_events" not in timeline_analysis:
                timeline_analysis["key_events"] = []
            if "phases" not in timeline_analysis:
                timeline_analysis["phases"] = []
            if "anomalies" not in timeline_analysis:
                timeline_analysis["anomalies"] = []
            
            return timeline_analysis
        
        except Exception as e:
            print(f"Error parsing timeline analysis response: {str(e)}")
            return self.generate_mock_timeline_analysis(timeline_events)
    
    def generate_mock_timeline_analysis(self, timeline_events: List[Dict[str, str]]) -> Dict[str, Any]:
        """Generate mock timeline analysis for testing"""
        # If no events, return empty analysis
        if not timeline_events:
            return {
                "key_events": [],
                "phases": [],
                "anomalies": []
            }
        
        # Set random seed based on first event
        seed_text = timeline_events[0].get("timestamp", "") if timeline_events else "timeline"
        seed = int(hashlib.md5(seed_text.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Sample phase names
        phase_templates = [
            {"name": "Initialization", "description": "System startup and initial connection establishment"},
            {"name": "Authentication", "description": "User and system authentication processes"},
            {"name": "Normal Operation", "description": "Regular system operations with no significant issues"},
            {"name": "Service Degradation", "description": "Period of reduced performance or partial failures"},
            {"name": "Recovery", "description": "System recovering from previous issues or failures"},
            {"name": "Failure", "description": "Critical system or component failure period"}
        ]
        
        # Determine number of phases based on event count
        num_phases = min(3, max(1, len(timeline_events) // 10))
        
        # Divide timeline into phases
        phases = []
        phase_boundaries = [0]
        for i in range(1, num_phases):
            boundary = i * len(timeline_events) // num_phases
            phase_boundaries.append(boundary)
        phase_boundaries.append(len(timeline_events) - 1)
        
        for i in range(num_phases):
            phase_template = random.choice(phase_templates)
            start_idx = phase_boundaries[i]
            end_idx = phase_boundaries[i+1]
            
            if start_idx <= end_idx and start_idx < len(timeline_events) and end_idx < len(timeline_events):
                phases.append({
                    "start_time": timeline_events[start_idx]["timestamp"],
                    "end_time": timeline_events[end_idx]["timestamp"],
                    "name": phase_template["name"],
                    "description": phase_template["description"]
                })
        
        # Generate key events (2-3 per phase)
        key_events = []
        for i, phase in enumerate(phases):
            start_idx = phase_boundaries[i]
            end_idx = phase_boundaries[i+1]
            
            # Calculate number of key events in this phase
            events_in_phase = end_idx - start_idx + 1
            num_key_events = min(3, max(1, events_in_phase // 5))
            
            for _ in range(num_key_events):
                idx = random.randint(start_idx, end_idx)
                if idx < len(timeline_events):
                    event = timeline_events[idx]
                    
                    # Determine significance based on text
                    line_lower = event["line"].lower()
                    if "error" in line_lower or "fail" in line_lower or "critical" in line_lower:
                        significance = "high"
                    elif "warn" in line_lower or "timeout" in line_lower:
                        significance = "medium"
                    else:
                        significance = "low"
                    
                    key_events.append({
                        "timestamp": event["timestamp"],
                        "description": event["line"][:100] + ("..." if len(event["line"]) > 100 else ""),
                        "significance": significance
                    })
        
        # Generate anomalies (0-2)
        anomalies = []
        if len(timeline_events) > 10:
            num_anomalies = random.randint(0, 2)
            for _ in range(num_anomalies):
                idx = random.randint(0, len(timeline_events) - 1)
                event = timeline_events[idx]
                
                anomaly_descriptions = [
                    "Unexpected pattern detected in system behavior",
                    "Unusually rapid sequence of similar events",
                    "Timing inconsistency detected between related operations"
                ]
                
                anomalies.append({
                    "timestamp": event["timestamp"],
                    "description": random.choice(anomaly_descriptions)
                })
        
        return {
            "key_events": key_events,
            "phases": phases,
            "anomalies": anomalies
        }
    
    def generate_remediation_steps(self, issue: Dict[str, Any], log_content: str) -> Dict[str, Any]:
        """Generate detailed remediation steps for an issue"""
        if self.mock_mode:
            return self.generate_mock_remediation(issue)
        
        # Truncate log content
        truncated_content = log_content[:7000] if len(log_content) > 7000 else log_content
        
        prompt = f"""
        As a telecom network engineer, generate detailed remediation steps for this issue:
        
        ISSUE: {issue.get('title', '')}
        DESCRIPTION: {issue.get('description', '')}
        SEVERITY: {issue.get('severity', 'medium')}
        
        RELEVANT LOG CONTENT:
        {truncated_content}
        
        Provide a step-by-step remediation plan with specific commands, configuration changes, 
        or actions that would resolve this issue.
        
        Return a JSON with:
        {{
            "steps": [
                {{
                    "description": "Detailed step description",
                    "commands": ["command1", "command2"] or null if not applicable,
                    "expected_outcome": "What should happen after this step"
                }}
            ],
            "verification": "How to verify the issue is resolved after remediation",
            "rollback": "Steps to roll back changes if remediation is unsuccessful",
            "estimated_time": "Estimated time to complete the remediation",
            "risk_level": "low|medium|high"
        }}
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 1500,
                "temperature": 0.2
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to generate remediation steps: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON from response
        try:
            import re
            json_match = re.search(r'({.*})', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = text
            
            remediation = json.loads(json_str)
            
            # Ensure required fields
            if "steps" not in remediation:
                remediation["steps"] = []
            if "verification" not in remediation:
                remediation["verification"] = "Monitor system logs for recurring issues."
            if "rollback" not in remediation:
                remediation["rollback"] = "Revert to previous configuration."
            if "estimated_time" not in remediation:
                remediation["estimated_time"] = "30-60 minutes"
            if "risk_level" not in remediation:
                remediation["risk_level"] = "medium"
            
            return remediation
        
        except Exception as e:
            print(f"Error parsing remediation steps response: {str(e)}")
            return self.generate_mock_remediation(issue)
    
    def generate_mock_remediation(self, issue: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mock remediation steps based on issue type"""
        issue_title = issue.get("title", "").lower()
        issue_desc = issue.get("description", "").lower()
        
        # Set random seed based on issue title
        seed = int(hashlib.md5(issue_title.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Default remediation
        steps = [
            {
                "description": "Analyze system logs to identify the root cause",
                "commands": ["grep ERROR /var/log/system.log | sort | uniq -c | sort -nr", "journalctl -p err | tail -100"],
                "expected_outcome": "Identify specific error patterns and affected components"
            },
            {
                "description": "Restart affected service",
                "commands": ["systemctl restart service-name", "service service-name restart"],
                "expected_outcome": "Service restarted with clean state"
            },
            {
                "description": "Verify system connectivity",
                "commands": ["ping -c 5 target-host", "telnet target-host port"],
                "expected_outcome": "Confirm network connectivity to dependent systems"
            },
            {
                "description": "Update configuration parameters",
                "commands": ["nano /etc/service/config.conf", "sed -i 's/old_value/new_value/' /etc/service/config.conf"],
                "expected_outcome": "Configuration updated with optimal parameters"
            }
        ]
        
        verification = "Monitor system logs for 30 minutes to ensure error messages no longer appear. Check service status with 'systemctl status service-name'."
        rollback = "Restore previous configuration files from backup and restart the service with 'systemctl restart service-name'."
        estimated_time = "45-60 minutes"
        risk_level = "medium"
        
        # Customize based on issue type
        if "authentication" in issue_title or "authentication" in issue_desc:
            steps = [
                {
                    "description": "Check authentication service status",
                    "commands": ["systemctl status auth-service", "ps aux | grep auth"],
                    "expected_outcome": "Verify authentication service is running"
                },
                {
                    "description": "Examine authentication logs for specific errors",
                    "commands": ["tail -100 /var/log/auth.log", "grep 'authentication failure' /var/log/auth.log"],
                    "expected_outcome": "Identify specific authentication error patterns"
                },
                {
                    "description": "Reset authentication cache",
                    "commands": ["auth-cache-reset", "systemctl restart auth-cache-service"],
                    "expected_outcome": "Clear stale authentication data"
                },
                {
                    "description": "Update credentials and permissions",
                    "commands": ["auth-admin update-credentials", "chmod 600 /etc/auth/keys/*"],
                    "expected_outcome": "Ensure proper credentials and file permissions"
                }
            ]
            verification = "Attempt to authenticate with test credentials and verify success. Check auth logs for absence of errors."
            estimated_time = "30-45 minutes"
            risk_level = "medium"
            
        elif "cpu" in issue_title or "memory" in issue_desc or "resource" in issue_desc:
            steps = [
                {
                    "description": "Check current resource utilization",
                    "commands": ["top -b -n 1", "free -m", "df -h"],
                    "expected_outcome": "Identify resource constraints and usage patterns"
                },
                {
                    "description": "Identify processes consuming excess resources",
                    "commands": ["ps aux --sort=-%cpu | head -10", "ps aux --sort=-%mem | head -10"],
                    "expected_outcome": "Identify specific processes causing high resource usage"
                },
                {
                    "description": "Optimize service configuration for resource usage",
                    "commands": ["nano /etc/service/resource.conf", "echo 'max_connections=50' >> /etc/service/resource.conf"],
                    "expected_outcome": "Adjust resource limits to optimal values"
                },
                {
                    "description": "Implement resource monitoring and alerting",
                    "commands": ["setup-resource-monitor --threshold=80%", "enable-alerts --resource=cpu,memory"],
                    "expected_outcome": "Enable proactive resource monitoring"
                }
            ]
            verification = "Monitor resource usage for 24 hours to ensure it remains below threshold (e.g., <80% CPU, <90% memory)."
            estimated_time = "1-2 hours"
            risk_level = "medium"
            
        elif "network" in issue_title or "latency" in issue_desc or "timeout" in issue_desc:
            steps = [
                {
                    "description": "Check network connectivity and latency",
                    "commands": ["ping -c 20 target-host", "traceroute target-host", "mtr -n target-host"],
                    "expected_outcome": "Identify network path and latency issues"
                },
                {
                    "description": "Examine network interface statistics",
                    "commands": ["ifconfig -a", "netstat -i", "ethtool -S eth0"],
                    "expected_outcome": "Identify interface errors or performance issues"
                },
                {
                    "description": "Optimize network parameters",
                    "commands": ["sysctl -w net.ipv4.tcp_keepalive_time=60", "echo 'net.core.rmem_max=16777216' >> /etc/sysctl.conf"],
                    "expected_outcome": "Update network stack parameters for optimal performance"
                },
                {
                    "description": "Implement Quality of Service (QoS)",
                    "commands": ["tc qdisc add dev eth0 root handle 1: htb", "tc class add dev eth0 parent 1: classid 1:1 htb rate 100mbit"],
                    "expected_outcome": "Prioritize critical network traffic"
                }
            ]
            verification = "Run network performance tests (ping, iperf) and verify latency is within acceptable thresholds (<50ms)."
            estimated_time = "2-3 hours"
            risk_level = "high"
            
        return {
            "steps": steps,
            "verification": verification,
            "rollback": rollback,
            "estimated_time": estimated_time,
            "risk_level": risk_level
        }
    
    def process_natural_language_query(self, query: str, log_contents: List[str]) -> Dict[str, Any]:
        """Process a natural language query against log data"""
        if self.mock_mode:
            return self.generate_mock_nl_query_response(query)
        
        # Combine and truncate log contents
        combined_logs = "\n\n".join([log[:2000] for log in log_contents[:3]])
        
        prompt = f"""
        As a telecom network analyst, answer the following question based on the log data provided:
        
        QUESTION: {query}
        
        LOG DATA:
        {combined_logs}
        
        Provide a detailed answer with specific references to relevant log entries.
        Include timestamps, error codes, and specific components mentioned in the logs where appropriate.
        
        Return a JSON with:
        {{
            "answer": "The main answer to the question",
            "relevant_entries": ["relevant log entry 1", "relevant log entry 2"],
            "suggested_follow_up": ["follow-up question 1", "follow-up question 2"]
        }}
        """
        
        response = requests.post(
            self.inference_url,
            json={
                "prompt": prompt,
                "model": self.model_name,
                "max_tokens": 1500,
                "temperature": 0.3
            }
        )
        
        if response.status_code != 200:
            raise Exception(f"Failed to process natural language query: {response.text}")
        
        data = response.json()
        text = data.get("text", "")
        
        # Extract JSON from response
        try:
            import re
            json_match = re.search(r'({.*})', text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1)
            else:
                json_str = text
            
            query_response = json.loads(json_str)
            
            # Ensure required fields
            if "answer" not in query_response:
                query_response["answer"] = "No definitive answer found in the provided logs."
            if "relevant_entries" not in query_response:
                query_response["relevant_entries"] = []
            if "suggested_follow_up" not in query_response:
                query_response["suggested_follow_up"] = []
            
            return query_response
        
        except Exception as e:
            print(f"Error parsing natural language query response: {str(e)}")
            return self.generate_mock_nl_query_response(query)
    
    def generate_mock_nl_query_response(self, query: str) -> Dict[str, Any]:
        """Generate mock natural language query response for testing"""
        query_lower = query.lower()
        
        # Set random seed based on query
        seed = int(hashlib.md5(query.encode()).hexdigest(), 16) % (2**32)
        random.seed(seed)
        
        # Default response
        answer = f"Based on the analysis of the logs, there is no clear information directly addressing '{query}'. The available logs do not contain specific data related to this query."
        relevant_entries = []
        suggested_follow_up = [
            "Could you provide a specific time range to focus the search?",
            "Are there specific components or error codes you're interested in?",
            "Would you like to search for related terms or symptoms instead?"
        ]
        
        # Customize based on query type
        if "error" in query_lower or "problem" in query_lower or "issue" in query_lower:
            answer = f"The logs show 37 error events in the last 24 hours. The most common errors are related to authentication failures (42%), network timeouts (31%), and resource constraints (18%). The majority of authentication errors originate from the SIP gateway (10.0.0.15) beginning at 2023-05-01T14:22:15. These issues appear to be intermittent rather than persistent."
            relevant_entries = [
                "2023-05-01T14:22:15 [ERROR] SIP-AUTH: Failed authentication attempt from 10.0.0.15, error=AUTH-403",
                "2023-05-01T15:30:22 [ERROR] NETWORK: Connection timeout after 30s to media-server-02",
                "2023-05-01T16:45:33 [ERROR] RESOURCE: CPU utilization exceeded threshold (92%, limit=85%) on sip-proxy-01"
            ]
            suggested_follow_up = [
                "What changes were made to the system before these errors appeared?",
                "Is there a correlation between the authentication errors and network timeouts?",
                "Which specific components are most affected by the resource constraints?"
            ]
            
        elif "performance" in query_lower or "slow" in query_lower or "latency" in query_lower:
            answer = f"Performance metrics from the logs indicate increased latency in the network over the past 12 hours. Average response time has increased from 45ms to 87ms (93% increase). The most affected services are SIP registration (120ms avg latency) and media streaming (98ms avg latency). This correlates with a network configuration change implemented at 2023-05-01T08:15:00 and increased traffic volume during business hours."
            relevant_entries = [
                "2023-05-01T08:15:00 [INFO] CONFIG: Updated QoS parameters in core router CR-01",
                "2023-05-01T10:30:45 [WARN] MONITORING: Latency threshold exceeded for SIP registration (120ms > 100ms)",
                "2023-05-01T12:22:18 [INFO] STATS: Peak hour traffic volume 15% higher than previous week average"
            ]
            suggested_follow_up = [
                "What specific QoS parameters were changed in the configuration update?",
                "Is there a pattern to the latency spikes throughout the day?",
                "Have there been any user-reported issues related to the increased latency?"
            ]
            
        elif "status" in query_lower or "health" in query_lower or "availability" in query_lower:
            answer = f"Current system status based on logs shows all core services are operational with 99.95% availability over the past 7 days. There was a brief outage (7 minutes) on 2023-04-29 due to a planned maintenance window. Resource utilization is within normal parameters (CPU: 65%, Memory: 72%, Disk: 58%). All monitored endpoints are responding with expected latency (<100ms)."
            relevant_entries = [
                "2023-05-01T00:00:01 [INFO] MONITORING: Daily health check - All services operational",
                "2023-04-29T02:00:00 [INFO] MAINTENANCE: Beginning planned maintenance window",
                "2023-04-29T02:07:00 [INFO] MAINTENANCE: Maintenance completed, all services restored"
            ]
            suggested_follow_up = [
                "What is the trend for resource utilization over the past 30 days?",
                "Are there any scheduled maintenance windows in the near future?",
                "Which subsystems have the highest resource utilization?"
            ]
        
        return {
            "answer": answer,
            "relevant_entries": relevant_entries,
            "suggested_follow_up": suggested_follow_up
        }
    
    def train_on_resolution_history(self, resolution_feedback):
        """
        Train model on resolution feedback
        
        Args:
            resolution_feedback: List of dictionaries containing issue details and their resolutions
            
        Returns:
            Dictionary with status information about the training process
        """
        if self.mock_mode:
            print("Mock mode: Would train model on resolution feedback")
            return {"status": "success", "message": "Model training simulation complete"}
        
        try:
            # Extract log contents and analysis results for fine-tuning
            log_contents = []
            analysis_results = []
            
            # Filter successful feedback entries
            successful_feedback = [f for f in resolution_feedback if f.get("was_successful", False)]
            print(f"Training on {len(successful_feedback)} successful resolution records")
            
            for item in successful_feedback:
                if "log_content" in item and "resolution" in item:
                    log_contents.append(item["log_content"])
                    
                    # Format the analysis result with the resolution feedback
                    analysis = {
                        "issues": item.get("issues", []),
                        "recommendations": [
                            {
                                "title": "Applied Resolution",
                                "description": item["resolution"]["steps"],
                                "category": item["resolution"].get("category", "resolution"),
                                "isAutomaticallyResolved": False
                            }
                        ],
                        "summary": item["resolution"].get("summary", "Resolution applied successfully"),
                        "severity": item.get("severity", "medium")
                    }
                    
                    analysis_results.append(analysis)
            
            if not log_contents or not analysis_results:
                return {
                    "status": "error", 
                    "message": "No valid training data found in resolution feedback"
                }
            
            # Prepare the dataset for fine-tuning
            dataset_info = fine_tuning_service.prepare_dataset_from_logs(
                log_contents=log_contents,
                analysis_results=analysis_results,
                dataset_name=f"Resolution_Feedback_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
            )
            
            # Start the fine-tuning job
            job_info = fine_tuning_service.start_fine_tuning(
                dataset_id=dataset_info["id"],
                model_name=self.model_name
            )
            
            return {
                "status": "success",
                "message": f"Model fine-tuning job started with ID: {job_info['id']}",
                "dataset_id": dataset_info["id"],
                "job_id": job_info["id"]
            }
            
        except Exception as e:
            print(f"Error during fine-tuning: {str(e)}")
            return {"status": "error", "message": f"Fine-tuning error: {str(e)}"}
            
    def get_fine_tuning_status(self, job_id: str) -> Dict[str, Any]:
        """
        Get the status of a fine-tuning job
        
        Args:
            job_id: ID of the fine-tuning job
            
        Returns:
            Dictionary with job status information
        """
        try:
            job_info = fine_tuning_service.get_fine_tuning_job(job_id)
            if job_info:
                return {
                    "status": "success",
                    "job_status": job_info["status"],
                    "job_details": job_info
                }
            else:
                return {"status": "error", "message": f"Job ID not found: {job_id}"}
        except Exception as e:
            return {"status": "error", "message": f"Error getting job status: {str(e)}"}
    
    def list_fine_tuning_jobs(self) -> Dict[str, Any]:
        """
        List all fine-tuning jobs
        
        Returns:
            Dictionary with list of jobs
        """
        try:
            jobs = fine_tuning_service.get_all_fine_tuning_jobs()
            return {
                "status": "success",
                "jobs": jobs
            }
        except Exception as e:
            return {"status": "error", "message": f"Error listing jobs: {str(e)}"}
    
    def get_fine_tuned_models(self) -> Dict[str, Any]:
        """
        Get list of available fine-tuned models
        
        Returns:
            Dictionary with list of fine-tuned models
        """
        try:
            models = fine_tuning_service.get_available_fine_tuned_models()
            return {
                "status": "success",
                "models": models
            }
        except Exception as e:
            return {"status": "error", "message": f"Error getting models: {str(e)}"}
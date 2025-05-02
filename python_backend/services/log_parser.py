import re
from typing import List, Dict, Any, Optional

class LogParser:
    """Parser for telecom log files"""
    
    def __init__(self):
        """Initialize with regex patterns for different log formats"""
        self.patterns = {
            # Common timestamp patterns
            'timestamp': [
                r'\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}',  # ISO format
                r'\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}',   # Standard format
                r'\w{3} \d{2} \d{2}:\d{2}:\d{2}',         # Syslog format
            ],
            # Log level patterns
            'level': [
                r'(DEBUG|INFO|WARNING|ERROR|CRITICAL|ALERT|EMERGENCY)',
                r'(TRACE|NOTICE|FATAL)',
            ],
            # Component/service patterns
            'component': [
                r'\[([^\]]+)\]',                          # [Component]
                r'(\w+)\.(\w+)',                          # Service.Component
            ],
        }
    
    def parse_log(self, content: str) -> List[Dict[str, Any]]:
        """Parse log content into segments with metadata"""
        lines = content.split('\n')
        segments = []
        
        for line in lines:
            if line.strip():
                segment = self.parse_line(line)
                segments.append(segment)
        
        return segments
    
    def parse_line(self, line: str) -> Dict[str, Any]:
        """Parse a single log line"""
        # Extract timestamp
        timestamp = None
        for pattern in self.patterns['timestamp']:
            match = re.search(pattern, line)
            if match:
                timestamp = match.group(0)
                break
        
        # Extract log level
        level = None
        for pattern in self.patterns['level']:
            match = re.search(pattern, line)
            if match:
                level = match.group(0)
                break
        
        # Extract component
        component = None
        for pattern in self.patterns['component']:
            match = re.search(pattern, line)
            if match:
                component = match.group(0)
                break
        
        # The rest is the message
        message = line
        
        return {
            'text': line,
            'timestamp': timestamp,
            'level': level,
            'component': component,
            'message': message
        }
    
    def segment_log_for_embedding(self, content: str, max_chunk_size: int = 512) -> List[str]:
        """Segment log content into reasonable chunks for embedding"""
        # First try to split by logical segments
        lines = content.split('\n')
        
        chunks = []
        current_chunk = []
        current_length = 0
        
        for line in lines:
            # Check if this line starts a new logical entry (has timestamp)
            has_timestamp = any(re.search(pattern, line) for pattern in self.patterns['timestamp'])
            
            # If we exceed max size or find a new logical entry, create a new chunk
            if (current_length + len(line) > max_chunk_size and current_length > 0) or \
               (has_timestamp and current_length > 0):
                chunks.append('\n'.join(current_chunk))
                current_chunk = []
                current_length = 0
            
            current_chunk.append(line)
            current_length += len(line)
        
        # Add the last chunk if not empty
        if current_chunk:
            chunks.append('\n'.join(current_chunk))
        
        return chunks
    
    def is_valid_telecom_log(self, content: str) -> bool:
        """Check if the content looks like a valid telecom log"""
        # Simple heuristic - check if it has timestamps and contains telecom-related keywords
        has_timestamp = any(re.search(pattern, content) for pattern in self.patterns['timestamp'])
        
        # Check for telecom keywords
        telecom_keywords = [
            'network', 'signal', 'bandwidth', 'latency', 'packet', 'interface',
            'router', 'switch', 'node', 'gateway', 'transmission', 'protocol',
            'link', 'connection', 'service', 'error', 'warning', 'fail', 'success',
            'configuration', 'antenna', 'cellular', 'BTS', 'RNC', 'MSC', 'HLR'
        ]
        
        has_keywords = any(keyword.lower() in content.lower() for keyword in telecom_keywords)
        
        # Valid if it has timestamps and telecom keywords
        return has_timestamp and has_keywords
    
    def extract_timestamps(self, content: str) -> List[Dict[str, str]]:
        """Extract timestamps from log content with their associated lines"""
        lines = content.split('\n')
        results = []
        
        for line in lines:
            for pattern in self.patterns['timestamp']:
                match = re.search(pattern, line)
                if match:
                    results.append({
                        'timestamp': match.group(0),
                        'line': line
                    })
                    break
        
        return results
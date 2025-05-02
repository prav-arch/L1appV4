import re
from typing import List, Dict, Any
from datetime import datetime

class LogParser:
    """Parser for telecom log files"""
    
    def __init__(self):
        """Initialize with regex patterns for different log formats"""
        # Pattern for standard log format with timestamp, level, component, and message
        self.standard_pattern = re.compile(
            r'(\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})?)\s+'
            r'(?:([A-Z]+)\s+)?'  # Optional log level (INFO, ERROR, etc.)
            r'(?:\[([^\]]+)\]\s+)?'  # Optional component in square brackets
            r'(.*)'  # Message
        )
        
        # Pattern for Cisco-style logs
        self.cisco_pattern = re.compile(
            r'(\w+\s+\d+\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:([A-Z0-9-]+):\s+)?'  # Facility/severity
            r'(?:%([A-Z0-9-]+)(?:-\d+)?:\s+)?'  # Message code
            r'(.*)'  # Message
        )
        
        # Pattern for Nokia/Alcatel-Lucent logs
        self.nokia_pattern = re.compile(
            r'(\d{4}/\d{2}/\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:([A-Z]+)\s+)?'  # Optional log level
            r'(?:\[(\w+(?:\-\w+)*)\]\s+)?'  # Optional module
            r'(.*)'  # Message
        )
        
        # Pattern for Huawei logs
        self.huawei_pattern = re.compile(
            r'(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:([A-Z]+)\s+)?'  # Optional severity
            r'(?:\[([^\]]+)\]\s+)?'  # Optional product/module
            r'(.*)'  # Message
        )
        
        # Pattern for Ericsson logs
        self.ericsson_pattern = re.compile(
            r'(\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}:\d{2}(?:\.\d+)?)\s+'
            r'(?:(\w+)\s+)?'  # Optional log level
            r'(?:(\w+(?:\.\w+)*)\s+)?'  # Optional component
            r'(.*)'  # Message
        )
        
        # Combined pattern to check if it's a telecom log
        self.telecom_log_pattern = re.compile(
            r'(\d{4}[-/]\d{2}[-/]\d{2}[T ]\d{2}:\d{2}:\d{2}|'
            r'\w+\s+\d+\s+\d{2}:\d{2}:\d{2})'
        )
    
    def parse_log(self, content: str) -> List[Dict[str, Any]]:
        """Parse log content into segments with metadata"""
        lines = content.splitlines()
        segments = []
        
        for line in lines:
            if not line.strip():
                continue
            
            parsed = self.parse_line(line)
            if parsed:
                segments.append(parsed)
            else:
                # If line doesn't match any pattern, add it as raw text
                segments.append({
                    "text": line,
                    "message": line
                })
        
        return segments
    
    def parse_line(self, line: str) -> Dict[str, Any]:
        """Parse a single log line"""
        # Try each pattern
        patterns = [
            self.standard_pattern,
            self.cisco_pattern,
            self.nokia_pattern,
            self.huawei_pattern,
            self.ericsson_pattern
        ]
        
        for pattern in patterns:
            match = pattern.match(line)
            if match:
                timestamp, level, component, message = match.groups()
                
                return {
                    "text": line,
                    "timestamp": timestamp,
                    "level": level,
                    "component": component,
                    "message": message
                }
        
        return None
    
    def segment_log_for_embedding(self, content: str, max_chunk_size: int = 512) -> List[str]:
        """Segment log content into reasonable chunks for embedding"""
        lines = content.splitlines()
        
        # Group lines into segments
        segments = []
        current_segment = []
        current_length = 0
        
        for line in lines:
            line_length = len(line)
            
            # If adding this line would exceed max_chunk_size, start a new segment
            if current_length + line_length > max_chunk_size and current_segment:
                segments.append("\n".join(current_segment))
                current_segment = []
                current_length = 0
            
            # Add line to current segment
            current_segment.append(line)
            current_length += line_length
        
        # Add the last segment if it's not empty
        if current_segment:
            segments.append("\n".join(current_segment))
        
        return segments
    
    def is_valid_telecom_log(self, content: str) -> bool:
        """Check if the content looks like a valid telecom log"""
        # Take a sample of the first 20 non-empty lines
        lines = [line for line in content.splitlines() if line.strip()][:20]
        
        # Count how many lines match our telecom log pattern
        matches = 0
        for line in lines:
            if self.telecom_log_pattern.search(line):
                matches += 1
        
        # If at least 50% of the lines match, consider it a valid telecom log
        return len(lines) > 0 and matches / len(lines) >= 0.5
    
    def extract_timestamps(self, content: str) -> List[Dict[str, str]]:
        """Extract timestamps from log content with their associated lines"""
        lines = content.splitlines()
        timestamps = []
        
        for line in lines:
            for pattern in [
                self.standard_pattern,
                self.cisco_pattern,
                self.nokia_pattern,
                self.huawei_pattern,
                self.ericsson_pattern
            ]:
                match = pattern.match(line)
                if match and match.group(1):  # If we have a timestamp
                    timestamps.append({
                        "timestamp": match.group(1),
                        "line": line
                    })
                    break
        
        return timestamps
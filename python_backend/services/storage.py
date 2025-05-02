from datetime import datetime
import json
from typing import List, Dict, Any, Optional, Union

class MemStorage:
    """In-memory storage for the application data"""
    
    def __init__(self):
        """Initialize storage with empty data structures"""
        self.users = {}
        self.logs_data = {}
        self.analysis_results_data = {}
        self.embeddings_data = {}
        self.activities_data = {}
        
        # Current IDs for auto-increment
        self.user_current_id = 0
        self.log_current_id = 0
        self.analysis_result_current_id = 0
        self.embedding_current_id = 0
        self.activity_current_id = 0
    
    # User methods
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        for user in self.users.values():
            if user['username'] == username:
                return user
        return None
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        self.user_current_id += 1
        user = {
            "id": self.user_current_id,
            **user_data
        }
        self.users[self.user_current_id] = user
        return user
    
    # Log methods
    def create_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new log entry"""
        self.log_current_id += 1
        now = datetime.now().isoformat()
        
        log = {
            "id": self.log_current_id,
            **log_data,
            "uploadedAt": now,
            "processingStatus": "pending"
        }
        self.logs_data[self.log_current_id] = log
        return log
    
    def get_log(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Get log by ID"""
        return self.logs_data.get(log_id)
    
    def get_all_logs(self) -> List[Dict[str, Any]]:
        """Get all logs"""
        return list(self.logs_data.values())
    
    def update_log_status(self, log_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Update log processing status"""
        log = self.logs_data.get(log_id)
        if not log:
            return None
            
        updated_log = {
            **log,
            "processingStatus": status
        }
        self.logs_data[log_id] = updated_log
        return updated_log
    
    # Analysis methods
    def create_analysis_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new analysis result"""
        self.analysis_result_current_id += 1
        now = datetime.now().isoformat()
        
        result = {
            "id": self.analysis_result_current_id,
            **result_data,
            "analysisDate": now
        }
        self.analysis_results_data[self.analysis_result_current_id] = result
        return result
    
    def get_analysis_result(self, result_id: int) -> Optional[Dict[str, Any]]:
        """Get analysis result by ID"""
        return self.analysis_results_data.get(result_id)
    
    def get_analysis_result_by_log_id(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Get analysis result by log ID"""
        for result in self.analysis_results_data.values():
            if result['logId'] == log_id:
                return result
        return None
    
    def update_resolution_status(self, result_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Update resolution status of an analysis result"""
        result = self.analysis_results_data.get(result_id)
        if not result:
            return None
            
        updated_result = {
            **result,
            "resolutionStatus": status
        }
        self.analysis_results_data[result_id] = updated_result
        return updated_result
    
    # Embedding methods
    def create_embedding(self, embedding_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new embedding entry"""
        self.embedding_current_id += 1
        
        embedding = {
            "id": self.embedding_current_id,
            **embedding_data
        }
        self.embeddings_data[self.embedding_current_id] = embedding
        return embedding
    
    def get_embeddings_by_log_id(self, log_id: int) -> List[Dict[str, Any]]:
        """Get embeddings by log ID"""
        return [
            embedding for embedding in self.embeddings_data.values()
            if embedding['logId'] == log_id
        ]
    
    # Activity methods
    def create_activity(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new activity record"""
        self.activity_current_id += 1
        now = datetime.now().isoformat()
        
        activity = {
            "id": self.activity_current_id,
            **activity_data,
            "timestamp": now
        }
        self.activities_data[self.activity_current_id] = activity
        return activity
    
    def get_recent_activities(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities"""
        activities = list(self.activities_data.values())
        activities.sort(key=lambda x: x['timestamp'], reverse=True)
        return activities[:limit]
    
    # Dashboard methods
    def get_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        # Count analyzed logs
        analyzed_logs = sum(
            1 for log in self.logs_data.values()
            if log['processingStatus'] in ['completed', 'completed_without_vectors']
        )
        
        # Count resolved issues
        issues_resolved = sum(
            1 for result in self.analysis_results_data.values()
            if result['resolutionStatus'] == 'resolved'
        )
        
        # Count pending issues
        pending_issues = sum(
            1 for result in self.analysis_results_data.values()
            if result['resolutionStatus'] in ['pending', 'in_progress']
        )
        
        # Average resolution time (simplified)
        avg_resolution_time = "2.5 days"  # Placeholder
        
        return {
            "analyzedLogs": analyzed_logs,
            "issuesResolved": issues_resolved,
            "pendingIssues": pending_issues,
            "avgResolutionTime": avg_resolution_time
        }
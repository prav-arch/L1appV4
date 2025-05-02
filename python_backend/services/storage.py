from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta

class MemStorage:
    """In-memory storage for the application data"""
    
    def __init__(self):
        """Initialize storage with empty data structures"""
        self.users = {}
        self.logs = {}
        self.analysis_results = {}
        self.embeddings = {}
        self.activities = {}
        
        # Counters for IDs
        self.user_id_counter = 1
        self.log_id_counter = 1
        self.analysis_id_counter = 1
        self.embedding_id_counter = 1
        self.activity_id_counter = 1
    
    def get_user(self, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user by ID"""
        return self.users.get(user_id)
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username"""
        for user in self.users.values():
            if user["username"] == username:
                return user
        return None
    
    def create_user(self, user_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new user"""
        user_id = self.user_id_counter
        self.user_id_counter += 1
        
        user = {
            "id": user_id,
            "createdAt": datetime.now(),
            **user_data
        }
        
        self.users[user_id] = user
        return user
    
    def create_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new log entry"""
        log_id = self.log_id_counter
        self.log_id_counter += 1
        
        log = {
            "id": log_id,
            "uploadedAt": datetime.now(),
            **log_data
        }
        
        self.logs[log_id] = log
        return log
    
    def get_log(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Get log by ID"""
        return self.logs.get(log_id)
    
    def get_all_logs(self) -> List[Dict[str, Any]]:
        """Get all logs"""
        logs = list(self.logs.values())
        logs.sort(key=lambda x: x["uploadedAt"], reverse=True)
        
        # Convert uploadedAt to ISO format string for JSON serialization
        for log in logs:
            log["uploadedAt"] = log["uploadedAt"].isoformat()
        
        return logs
    
    def update_log_status(self, log_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Update log processing status"""
        log = self.logs.get(log_id)
        if not log:
            return None
        
        log["processingStatus"] = status
        return log
    
    def create_analysis_result(self, result_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new analysis result"""
        result_id = self.analysis_id_counter
        self.analysis_id_counter += 1
        
        result = {
            "id": result_id,
            "analysisDate": datetime.now(),
            **result_data
        }
        
        self.analysis_results[result_id] = result
        return result
    
    def get_analysis_result(self, result_id: int) -> Optional[Dict[str, Any]]:
        """Get analysis result by ID"""
        result = self.analysis_results.get(result_id)
        if result:
            # Convert date to ISO format for JSON serialization
            result = result.copy()
            result["analysisDate"] = result["analysisDate"].isoformat()
        return result
    
    def get_analysis_result_by_log_id(self, log_id: int) -> Optional[Dict[str, Any]]:
        """Get analysis result by log ID"""
        for result in self.analysis_results.values():
            if result["logId"] == log_id:
                # Convert date to ISO format for JSON serialization
                result = result.copy()
                result["analysisDate"] = result["analysisDate"].isoformat()
                return result
        return None
    
    def update_resolution_status(self, result_id: int, status: str) -> Optional[Dict[str, Any]]:
        """Update resolution status of an analysis result"""
        result = self.analysis_results.get(result_id)
        if not result:
            return None
        
        result["resolutionStatus"] = status
        
        # Convert date to ISO format for JSON serialization
        result_copy = result.copy()
        result_copy["analysisDate"] = result_copy["analysisDate"].isoformat()
        
        return result_copy
    
    def create_embedding(self, embedding_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new embedding entry"""
        embedding_id = self.embedding_id_counter
        self.embedding_id_counter += 1
        
        embedding = {
            "id": embedding_id,
            "createdAt": datetime.now(),
            **embedding_data
        }
        
        self.embeddings[embedding_id] = embedding
        return embedding
    
    def get_embeddings_by_log_id(self, log_id: int) -> List[Dict[str, Any]]:
        """Get embeddings by log ID"""
        embeddings = []
        for embedding in self.embeddings.values():
            if embedding["logId"] == log_id:
                # Convert date to ISO format for JSON serialization
                embedding_copy = embedding.copy()
                embedding_copy["createdAt"] = embedding_copy["createdAt"].isoformat()
                embeddings.append(embedding_copy)
        return embeddings
    
    def create_activity(self, activity_data: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new activity record"""
        activity_id = self.activity_id_counter
        self.activity_id_counter += 1
        
        activity = {
            "id": activity_id,
            "timestamp": datetime.now(),
            **activity_data
        }
        
        self.activities[activity_id] = activity
        return activity
    
    def get_recent_activities(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get recent activities"""
        activities = list(self.activities.values())
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        # Convert timestamps to ISO format for JSON serialization
        activities_copy = []
        for activity in activities[:limit]:
            activity_copy = activity.copy()
            activity_copy["timestamp"] = activity_copy["timestamp"].isoformat()
            activities_copy.append(activity_copy)
        
        return activities_copy
    
    def get_stats(self) -> Dict[str, Any]:
        """Get dashboard statistics"""
        # Count logs that have been fully analyzed (completed or completed_without_vectors)
        analyzed_logs = sum(1 for log in self.logs.values() 
                         if log["processingStatus"] in ["completed", "completed_without_vectors"])
        
        # Count resolved and pending issues
        issues_resolved = 0
        pending_issues = 0
        
        for result in self.analysis_results.values():
            if result["resolutionStatus"] == "resolved":
                # Count all issues in resolved analysis as resolved
                issues_resolved += len(result["issues"])
            else:
                # Count individual issues based on their status
                for issue in result["issues"]:
                    if issue["status"] == "fixed":
                        issues_resolved += 1
                    else:
                        pending_issues += 1
        
        # Calculate average resolution time (mock data)
        # In a real implementation, this would compare timestamps of upload and resolution
        avg_resolution_time = "6h 24m"
        
        return {
            "analyzedLogs": analyzed_logs,
            "issuesResolved": issues_resolved,
            "pendingIssues": pending_issues,
            "avgResolutionTime": avg_resolution_time
        }
    
    def get_all_analysis_results(self) -> List[Dict[str, Any]]:
        """Get all analysis results"""
        results = []
        for result in self.analysis_results.values():
            # Convert date to ISO format for JSON serialization
            result_copy = result.copy()
            result_copy["analysisDate"] = result_copy["analysisDate"].isoformat()
            results.append(result_copy)
        return results
    
    def store_resolution_feedback(self, issue_id: int, steps: List[str], was_successful: bool, feedback: str = "") -> None:
        """Store feedback on the success of resolution steps for an issue"""
        # Initialize the feedback storage if it doesn't exist
        if not hasattr(self, 'resolution_feedback'):
            self.resolution_feedback = []
        
        feedback_entry = {
            "issue_id": issue_id,
            "steps": steps,
            "was_successful": was_successful,
            "feedback": feedback,
            "timestamp": datetime.now()
        }
        self.resolution_feedback.append(feedback_entry)
        
        # Create activity
        description = f"Feedback submitted for issue #{issue_id}: {'Successful' if was_successful else 'Unsuccessful'}"
        self.create_activity({
            "activityType": "feedback",
            "description": description,
            "status": "completed"
        })
    
    def get_resolution_feedback(self) -> List[Dict[str, Any]]:
        """Get all resolution feedback entries"""
        # Initialize the feedback storage if it doesn't exist
        if not hasattr(self, 'resolution_feedback'):
            self.resolution_feedback = []
            
        # Convert timestamps to ISO format for JSON serialization
        feedback_copy = []
        for entry in self.resolution_feedback:
            entry_copy = entry.copy()
            entry_copy["timestamp"] = entry_copy["timestamp"].isoformat()
            feedback_copy.append(entry_copy)
            
        return feedback_copy
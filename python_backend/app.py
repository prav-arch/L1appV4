"""
Main Flask application for the Telecom Log Analysis platform
"""
import os
import json
import time
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
import uuid
import logging
from pathlib import Path
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename

# Setup basic logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__, static_folder='../client/dist')
CORS(app)

# Constants
UPLOAD_FOLDER = Path('uploads')
UPLOAD_FOLDER.mkdir(exist_ok=True)
ALLOWED_EXTENSIONS = {'txt', 'log', 'pcap'}

# In-memory data stores (replace with database in production)
logs_data = []
analysis_results = []
activities = []
embeddings = []

# Basic statistics
stats = {
    "analyzedLogs": 0,
    "issuesResolved": 0,
    "pendingIssues": 0,
    "avgResolutionTime": "0h"
}

# Helper functions
def allowed_file(filename):
    """Check if file has an allowed extension"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def generate_id():
    """Generate a unique ID"""
    return len(logs_data) + 1

# API Routes
@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for the dashboard"""
    return jsonify(stats)

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get recent activities"""
    return jsonify(activities)

@app.route('/api/logs/upload', methods=['POST'])
def upload_log():
    """Upload a log file for analysis"""
    if 'file' not in request.files:
        return jsonify({"error": "No file part"}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({"error": "No selected file"}), 400
    
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        file_path = UPLOAD_FOLDER / filename
        file.save(file_path)
        
        # Read file content
        with open(file_path, 'r', encoding='utf-8', errors='ignore') as f:
            content = f.read()
        
        # Create log entry
        log_id = generate_id()
        log_entry = {
            "id": log_id,
            "filename": filename,
            "size": os.path.getsize(file_path),
            "uploadDate": datetime.now().isoformat(),
            "status": "processing",
            "type": filename.split('.')[-1],
            "content": content[:1000] + "..." if len(content) > 1000 else content  # Truncate for storage
        }
        logs_data.append(log_entry)
        
        # Add activity
        activities.append({
            "id": len(activities) + 1,
            "type": "upload",
            "description": f"Uploaded log file: {filename}",
            "timestamp": datetime.now().isoformat(),
            "user": "system"
        })
        
        # Process log asynchronously
        # In a real app, this would be a background task
        process_log_file(log_id, content)
        
        return jsonify({"id": log_id, "message": "File uploaded and processing started"}), 201
    
    return jsonify({"error": "File type not allowed"}), 400

@app.route('/api/logs/<int:log_id>', methods=['GET'])
def get_log(log_id):
    """Get a specific log"""
    for log in logs_data:
        if log["id"] == log_id:
            return jsonify(log)
    
    return jsonify({"error": "Log not found"}), 404

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get all logs"""
    return jsonify(logs_data)

@app.route('/api/logs/<int:log_id>/analysis', methods=['GET'])
def get_analysis(log_id):
    """Get analysis result for a log"""
    for result in analysis_results:
        if result["logId"] == log_id:
            return jsonify(result)
    
    return jsonify({"error": "Analysis not found"}), 404

@app.route('/api/search', methods=['POST'])
def search():
    """Semantic search in logs"""
    data = request.json
    query = data.get('query', '')
    
    if not query:
        return jsonify({"error": "Query is required"}), 400
    
    # Mock search results for now
    # In a real app, this would use vector embeddings
    search_results = []
    for log in logs_data:
        if query.lower() in log.get("content", "").lower():
            search_results.append({
                "logId": log["id"],
                "filename": log["filename"],
                "uploadDate": log["uploadDate"],
                "relevance": 0.85,  # Mock relevance score
                "snippet": log["content"][:200]
            })
    
    return jsonify(search_results)

@app.route('/api/analysis/<int:analysis_id>/status', methods=['PATCH'])
def update_status(analysis_id):
    """Update resolution status"""
    data = request.json
    new_status = data.get('status')
    
    if not new_status:
        return jsonify({"error": "Status is required"}), 400
    
    for result in analysis_results:
        if result["id"] == analysis_id:
            result["resolutionStatus"] = new_status
            
            # Update stats
            if new_status == "resolved":
                stats["issuesResolved"] += 1
                stats["pendingIssues"] = max(0, stats["pendingIssues"] - 1)
            
            # Add activity
            activities.append({
                "id": len(activities) + 1,
                "type": "status",
                "description": f"Updated status of analysis #{analysis_id} to {new_status}",
                "timestamp": datetime.now().isoformat(),
                "user": "system"
            })
            
            return jsonify(result)
    
    return jsonify({"error": "Analysis not found"}), 404

@app.route('/api/logs/<int:log_id>/root-cause-analysis', methods=['GET'])
def get_root_cause_analysis(log_id):
    """Get root cause analysis for a log"""
    # For now, return a mock root cause analysis
    # In a real app, this would use an LLM
    for log in logs_data:
        if log["id"] == log_id:
            return jsonify({
                "logId": log_id,
                "timestamp": datetime.now().isoformat(),
                "primaryCause": "Configuration issue in network device",
                "contributingFactors": [
                    "Outdated firmware version",
                    "Incompatible protocol settings",
                    "High network congestion"
                ],
                "confidenceScore": 0.85,
                "relationshipMap": {
                    "nodes": [
                        {"id": "root", "label": "Network Failure", "type": "issue"},
                        {"id": "factor1", "label": "Outdated Firmware", "type": "cause"},
                        {"id": "factor2", "label": "Protocol Mismatch", "type": "cause"},
                        {"id": "factor3", "label": "Network Congestion", "type": "symptom"}
                    ],
                    "links": [
                        {"source": "root", "target": "factor1", "value": 0.8},
                        {"source": "root", "target": "factor2", "value": 0.7},
                        {"source": "factor2", "target": "factor3", "value": 0.6}
                    ]
                }
            })
    
    return jsonify({"error": "Log not found"}), 404

# Add additional API routes as needed

# Function to process log file (simulated background task)
def process_log_file(log_id, content):
    """Process log file in background"""
    # In a real app, this would be a celery task or similar
    # For now, we'll simulate processing delay
    time.sleep(1)
    
    # Update log status
    for log in logs_data:
        if log["id"] == log_id:
            log["status"] = "analyzed"
            break
    
    # Create analysis result
    analysis_id = len(analysis_results) + 1
    
    # Simple mock analysis (in a real app, this would use an LLM)
    mock_issues = []
    if "error" in content.lower():
        mock_issues.append({
            "id": 1,
            "type": "error",
            "description": "Network connectivity error detected",
            "severity": "high",
            "timestamp": datetime.now().isoformat(),
            "occurrences": 3,
            "status": "open"
        })
    
    if "warning" in content.lower():
        mock_issues.append({
            "id": 2,
            "type": "warning",
            "description": "Potential memory leak in application",
            "severity": "medium",
            "timestamp": datetime.now().isoformat(),
            "occurrences": 5,
            "status": "open"
        })
    
    result = {
        "id": analysis_id,
        "logId": log_id,
        "timestamp": datetime.now().isoformat(),
        "issues": mock_issues,
        "summary": "Analysis completed with 2 potential issues identified",
        "resolutionStatus": "pending",
        "processingTime": "1.2s"
    }
    
    analysis_results.append(result)
    
    # Update stats
    stats["analyzedLogs"] += 1
    stats["pendingIssues"] += len(mock_issues)
    
    # Add activity
    activities.append({
        "id": len(activities) + 1,
        "type": "analysis",
        "description": f"Completed analysis of log #{log_id}",
        "timestamp": datetime.now().isoformat(),
        "user": "system"
    })
    
    # Later this could generate embeddings for vector search

# Serve React frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    """Serve React frontend"""
    if path and Path(app.static_folder + '/' + path).exists():
        return send_from_directory(app.static_folder, path)
    else:
        return send_from_directory(app.static_folder, 'index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001, debug=True)
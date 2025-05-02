import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import threading

# Import services
from services.storage import MemStorage
from services.log_parser import LogParser
from services.llm_service import LLMService
from services.milvus_service import MilvusService

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize services
storage = MemStorage()
log_parser = LogParser()
llm_service = LLMService()
milvus_service = MilvusService()

# Background processing tasks
processing_tasks = {}

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for the dashboard"""
    try:
        stats = storage.get_stats()
        return jsonify(stats)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get recent activities"""
    try:
        limit = request.args.get('limit', default=10, type=int)
        activities = storage.get_recent_activities(limit)
        return jsonify(activities)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/upload', methods=['POST'])
def upload_log():
    """Upload a log file for analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if not file.filename:
            return jsonify({"error": "No file selected"}), 400
        
        # Read file content
        content = file.read().decode('utf-8')
        
        # Validate file is a telecom log
        if not log_parser.is_valid_telecom_log(content):
            return jsonify({"error": "Invalid telecom log format"}), 400
        
        # Create log record
        log_data = {
            "filename": file.filename,
            "originalContent": content,
            "fileSize": len(content),
            "processingStatus": "pending"
        }
        
        log = storage.create_log(log_data)
        
        # Create activity record
        activity_data = {
            "logId": log["id"],
            "activityType": "upload",
            "description": f"Log '{file.filename}' uploaded",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        # Start processing in background
        threading.Thread(target=process_log_file, args=(log["id"], content)).start()
        
        return jsonify({"id": log["id"]})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>', methods=['GET'])
def get_log(log_id):
    """Get a specific log"""
    try:
        log = storage.get_log(log_id)
        if not log:
            return jsonify({"error": "Log not found"}), 404
        return jsonify(log)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get all logs"""
    try:
        logs = storage.get_all_logs()
        return jsonify(logs)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/logs/<int:log_id>/analysis', methods=['GET'])
def get_analysis(log_id):
    """Get analysis result for a log"""
    try:
        analysis = storage.get_analysis_result_by_log_id(log_id)
        if not analysis:
            return jsonify({"error": "Analysis not found"}), 404
        return jsonify(analysis)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/search', methods=['POST'])
def search():
    """Semantic search in logs"""
    try:
        data = request.json
        query = data.get('query')
        
        if not query:
            return jsonify({"error": "No query provided"}), 400
        
        # Try vector search first
        try:
            # Generate embedding for query
            query_embedding = llm_service.generate_embedding(query)
            
            # Search for similar content in vector database
            search_results = milvus_service.search_similar_text(query_embedding)
            
            # Get log details for results
            enriched_results = []
            for result in search_results:
                log = storage.get_log(result["logId"])
                enriched_results.append({
                    "logId": result["logId"],
                    "filename": log["filename"] if log else "Unknown",
                    "text": result["text"],
                    "score": result["score"],
                    "relevance": "high" if result["score"] > 0.8 else "medium" if result["score"] > 0.6 else "low"
                })
            
            summary = llm_service.semantic_search(query, [r["text"] for r in search_results])
            
            return jsonify({
                "results": enriched_results,
                "summary": summary
            })
        
        except Exception as e:
            # Fall back to basic search if vector search fails
            logs = storage.get_all_logs()
            results = []
            
            for log in logs:
                if query.lower() in log["originalContent"].lower():
                    results.append({
                        "logId": log["id"],
                        "filename": log["filename"],
                        "text": log["originalContent"][:200] + "...",
                        "score": 0.5,  # Default score for basic search
                        "relevance": "medium"
                    })
            
            return jsonify({
                "results": results[:10],  # Limit to 10 results
                "summary": f"Found {len(results)} logs containing '{query}'"
            })
    
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/analysis/<int:analysis_id>/status', methods=['PATCH'])
def update_status(analysis_id):
    """Update resolution status"""
    try:
        data = request.json
        status = data.get('status')
        
        if not status or status not in ['pending', 'in_progress', 'resolved']:
            return jsonify({"error": "Invalid status"}), 400
        
        result = storage.update_resolution_status(analysis_id, status)
        if not result:
            return jsonify({"error": "Analysis not found"}), 404
        
        # Create activity record
        activity_data = {
            "logId": result["logId"],
            "activityType": "status_change",
            "description": f"Analysis status changed to '{status}'",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
        return jsonify(result)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

def process_log_file(log_id, content):
    """Process log file in background"""
    try:
        # Update log status
        storage.update_log_status(log_id, "processing")
        
        # Create activity
        activity_data = {
            "logId": log_id,
            "activityType": "processing",
            "description": "Log processing started",
            "status": "in_progress"
        }
        activity = storage.create_activity(activity_data)
        
        # Analyze log with LLM
        analysis_result = llm_service.analyze_log(content)
        
        # Store analysis result
        result_data = {
            "logId": log_id,
            "issues": analysis_result["issues"],
            "recommendations": analysis_result["recommendations"],
            "summary": analysis_result["summary"],
            "severity": analysis_result["severity"],
            "resolutionStatus": "pending"
        }
        analysis = storage.create_analysis_result(result_data)
        
        # Segment log for embedding
        segments = log_parser.segment_log_for_embedding(content)
        
        try:
            # Generate embeddings
            embeddings = llm_service.generate_embeddings(segments)
            
            # Store embeddings in Milvus
            embedding_data = []
            for i, (segment, embedding) in enumerate(zip(segments, embeddings)):
                embedding_data.append({
                    "text": segment,
                    "embedding": embedding
                })
            
            milvus_service.insert_embeddings(log_id, embedding_data)
            
            # Update log status
            storage.update_log_status(log_id, "completed")
        except Exception as e:
            # If vector embedding fails, we still have the analysis
            print(f"Embedding generation failed: {str(e)}")
            storage.update_log_status(log_id, "completed_without_vectors")
        
        # Update activity
        activity_data = {
            "logId": log_id,
            "activityType": "analysis",
            "description": "Log analysis completed",
            "status": "completed"
        }
        storage.create_activity(activity_data)
        
    except Exception as e:
        print(f"Error processing log: {str(e)}")
        # Update log status to error
        storage.update_log_status(log_id, "error")
        
        # Update activity
        activity_data = {
            "logId": log_id,
            "activityType": "error",
            "description": f"Error processing log: {str(e)}",
            "status": "error"
        }
        storage.create_activity(activity_data)

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    app.run(host='0.0.0.0', port=port, debug=True)
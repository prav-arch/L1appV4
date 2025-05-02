import os
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from services.storage import MemStorage
from services.milvus_service import MilvusService
from services.llm_service import LLMService
from services.log_parser import LogParser

# Load environment variables
load_dotenv()

# Initialize app
app = Flask(__name__)
CORS(app)

# Initialize services
storage = MemStorage()
milvus_service = MilvusService()
llm_service = LLMService()
log_parser = LogParser()

# Maximum file size (10MB)
MAX_FILE_SIZE = 10 * 1024 * 1024

@app.route('/api/stats', methods=['GET'])
def get_stats():
    """Get statistics for the dashboard"""
    try:
        stats = storage.get_stats()
        return jsonify(stats)
    except Exception as e:
        app.logger.error(f"Error fetching stats: {str(e)}")
        return jsonify({"message": "Failed to fetch statistics"}), 500

@app.route('/api/activities', methods=['GET'])
def get_activities():
    """Get recent activities"""
    try:
        limit = int(request.args.get('limit', 10))
        activities = storage.get_recent_activities(limit)
        return jsonify(activities)
    except Exception as e:
        app.logger.error(f"Error fetching activities: {str(e)}")
        return jsonify({"message": "Failed to fetch activities"}), 500

@app.route('/api/logs/upload', methods=['POST'])
def upload_log():
    """Upload a log file for analysis"""
    try:
        if 'file' not in request.files:
            return jsonify({"message": "No file uploaded"}), 400

        file = request.files['file']
        if not file.filename:
            return jsonify({"message": "No file selected"}), 400

        # Check file extension
        allowed_extensions = ['.log', '.txt', '.xml', '.json']
        ext = os.path.splitext(file.filename)[1].lower()
        if ext not in allowed_extensions:
            return jsonify({"message": "Invalid file type. Only .log, .txt, .xml, and .json are allowed."}), 400

        # Check file size
        file_content = file.read()
        if len(file_content) > MAX_FILE_SIZE:
            return jsonify({"message": "File too large. Maximum size is 10MB."}), 400

        # Convert to string
        file_content_str = file_content.decode('utf-8')

        # Basic validation
        if not log_parser.is_valid_telecom_log(file_content_str):
            return jsonify({"message": "The uploaded file does not appear to be a valid telecom log"}), 400

        # Save log to storage
        log = storage.create_log({
            "filename": file.filename,
            "originalContent": file_content_str,
            "fileSize": len(file_content)
        })

        # Create activity record
        storage.create_activity({
            "logId": log["id"],
            "activityType": "upload",
            "description": f"Log file '{log['filename']}' was uploaded",
            "status": "pending"
        })

        # Start processing in background
        # In a production environment, you'd use Celery, RQ, or another task queue
        # For simplicity, we'll do it in-process with error handling
        process_log_file(log["id"], file_content_str)

        return jsonify({
            "id": log["id"],
            "filename": log["filename"],
            "uploadedAt": log["uploadedAt"],
            "processingStatus": log["processingStatus"]
        }), 201

    except Exception as e:
        app.logger.error(f"Error uploading log file: {str(e)}")
        return jsonify({"message": "Failed to upload log file"}), 500

@app.route('/api/logs/<int:log_id>', methods=['GET'])
def get_log(log_id):
    """Get a specific log"""
    try:
        log = storage.get_log(log_id)
        if not log:
            return jsonify({"message": "Log not found"}), 404
        return jsonify(log)
    except Exception as e:
        app.logger.error(f"Error fetching log: {str(e)}")
        return jsonify({"message": "Failed to fetch log"}), 500

@app.route('/api/logs', methods=['GET'])
def get_logs():
    """Get all logs"""
    try:
        logs = storage.get_all_logs()
        return jsonify(logs)
    except Exception as e:
        app.logger.error(f"Error fetching logs: {str(e)}")
        return jsonify({"message": "Failed to fetch logs"}), 500

@app.route('/api/logs/<int:log_id>/analysis', methods=['GET'])
def get_analysis(log_id):
    """Get analysis result for a log"""
    try:
        analysis = storage.get_analysis_result_by_log_id(log_id)
        if not analysis:
            return jsonify({"message": "Analysis not found"}), 404
        return jsonify(analysis)
    except Exception as e:
        app.logger.error(f"Error fetching analysis: {str(e)}")
        return jsonify({"message": "Failed to fetch analysis"}), 500

@app.route('/api/search', methods=['POST'])
def search():
    """Semantic search in logs"""
    try:
        data = request.json
        query = data.get('query')
        
        if not query or not isinstance(query, str):
            return jsonify({"message": "Invalid query"}), 400

        try:
            # Generate embedding for the query
            embedding = llm_service.generate_embedding(query)
            
            # Search for similar log segments
            search_results = milvus_service.search_similar_text(embedding, 10)
            
            if not search_results:
                return jsonify({
                    "results": [],
                    "summary": "No relevant logs found for your query."
                })
            
            # Get log IDs from search results
            log_ids = list(set(result["logId"] for result in search_results))
            logs = [storage.get_log(log_id) for log_id in log_ids]
            logs = [log for log in logs if log]  # Filter out None values
            
            # Combine search results with log data
            results = []
            for result in search_results:
                log = next((log for log in logs if log["id"] == result["logId"]), None)
                results.append({
                    "logId": result["logId"],
                    "filename": log["filename"] if log else "Unknown log",
                    "text": result["text"],
                    "score": result["score"],
                    "relevance": f"{round(result['score'] * 100)}%"
                })
            
            # Generate summary
            search_texts = "\n\n".join(result["text"] for result in search_results)
            summary = llm_service.semantic_search(query, search_texts)
            
            return jsonify({
                "results": results,
                "summary": summary
            })
            
        except Exception as e:
            app.logger.error(f"Error with vector search: {str(e)}")
            
            # Fallback to basic search
            logs = storage.get_all_logs()
            
            # Simple text-based search
            matching_logs = [log for log in logs if query.lower() in log["originalContent"].lower()]
            
            if not matching_logs:
                return jsonify({
                    "results": [],
                    "summary": "No relevant logs found for your query. Note: Vector search is currently unavailable."
                })
            
            # Extract context around matches
            results = []
            for log in matching_logs:
                lower_content = log["originalContent"].lower()
                query_index = lower_content.find(query.lower())
                
                start_index = max(0, query_index - 100)
                end_index = min(len(log["originalContent"]), query_index + len(query) + 100)
                text = log["originalContent"][start_index:end_index]
                
                results.append({
                    "logId": log["id"],
                    "filename": log["filename"],
                    "text": text,
                    "score": 0.5,
                    "relevance": "Keyword match"
                })
            
            return jsonify({
                "results": results,
                "summary": "Vector search is currently unavailable. Showing basic keyword search results instead."
            })
            
    except Exception as e:
        app.logger.error(f"Error performing search: {str(e)}")
        return jsonify({"message": "Failed to perform search"}), 500

@app.route('/api/analysis/<int:analysis_id>/status', methods=['PATCH'])
def update_status(analysis_id):
    """Update resolution status"""
    try:
        data = request.json
        status = data.get('status')
        
        if not status or status not in ['pending', 'in_progress', 'resolved']:
            return jsonify({"message": "Invalid status value"}), 400
        
        updated_analysis = storage.update_resolution_status(analysis_id, status)
        if not updated_analysis:
            return jsonify({"message": "Analysis not found"}), 404
        
        # Create activity record
        storage.create_activity({
            "logId": updated_analysis["logId"],
            "activityType": "status_change",
            "description": f"Analysis status changed to {status}",
            "status": status
        })
        
        return jsonify(updated_analysis)
    except Exception as e:
        app.logger.error(f"Error updating resolution status: {str(e)}")
        return jsonify({"message": "Failed to update resolution status"}), 500

def process_log_file(log_id, content):
    """Process log file in background"""
    try:
        # Update log status
        storage.update_log_status(log_id, "processing")
        
        # Create activity record
        storage.create_activity({
            "logId": log_id,
            "activityType": "processing",
            "description": "Started processing log file",
            "status": "in_progress"
        })
        
        # Parse the log
        segments = log_parser.segment_log_for_embedding(content)
        
        # Process segments for embedding
        processed_segments = []
        milvus_available = False
        
        for segment in segments:
            try:
                embedding = llm_service.generate_embedding(segment)
                processed_segments.append({
                    "text": segment,
                    "embedding": embedding,
                    "success": True
                })
            except Exception as e:
                app.logger.error(f"Error generating embedding: {str(e)}")
                processed_segments.append({
                    "text": segment,
                    "embedding": [],
                    "success": False
                })
        
        successful_segments = [s for s in processed_segments if s["success"]]
        
        # Try to store embeddings in Milvus
        if successful_segments:
            try:
                segments_for_milvus = [{"text": s["text"], "embedding": s["embedding"]} for s in successful_segments]
                milvus_ids = milvus_service.insert_embeddings(log_id, segments_for_milvus)
                
                # Store embedding references
                for i, segment in enumerate(successful_segments):
                    milvus_id = milvus_ids[i]["id"] if i < len(milvus_ids) else f"local-{i}"
                    storage.create_embedding({
                        "logId": log_id,
                        "segmentText": segment["text"],
                        "milvusId": str(milvus_id)
                    })
                
                milvus_available = True
            except Exception as e:
                app.logger.error(f"Failed to store embeddings in Milvus: {str(e)}")
                
                # Store embeddings locally anyway
                for i, segment in enumerate(successful_segments):
                    storage.create_embedding({
                        "logId": log_id,
                        "segmentText": segment["text"],
                        "milvusId": f"local-{i}"
                    })
                
                # Create activity for Milvus issue
                storage.create_activity({
                    "logId": log_id,
                    "activityType": "error",
                    "description": "Vector database (Milvus) is currently unavailable. Semantic search will be limited.",
                    "status": "in_progress"
                })
        
        # Use LLM to analyze the log
        try:
            analysis_result = llm_service.analyze_log(content)
            
            # Store analysis result
            storage.create_analysis_result({
                "logId": log_id,
                "issues": analysis_result["issues"],
                "recommendations": analysis_result["recommendations"],
                "severity": analysis_result["severity"],
                "resolutionStatus": "pending"
            })
            
            # Update log status
            final_status = "completed" if milvus_available else "completed_without_vectors"
            storage.update_log_status(log_id, final_status)
            
            # Create activity record
            desc = "Log analysis completed with vector search capability" if milvus_available else "Log analysis completed without vector search capability"
            storage.create_activity({
                "logId": log_id,
                "activityType": "analysis",
                "description": desc,
                "status": "completed"
            })
            
        except Exception as e:
            app.logger.error(f"Failed to analyze log with LLM: {str(e)}")
            
            # Update log status
            storage.update_log_status(log_id, "error")
            
            # Create activity record
            storage.create_activity({
                "logId": log_id,
                "activityType": "error",
                "description": f"Error analyzing log with LLM: {str(e)}",
                "status": "error"
            })
        
    except Exception as e:
        app.logger.error(f"Error processing log {log_id}: {str(e)}")
        
        # Update log status
        storage.update_log_status(log_id, "error")
        
        # Create activity record
        storage.create_activity({
            "logId": log_id,
            "activityType": "error",
            "description": f"Error processing log: {str(e)}",
            "status": "error"
        })

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    app.run(host='0.0.0.0', port=port, debug=True)